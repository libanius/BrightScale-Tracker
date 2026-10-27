'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../prototype/progress-review.js');

function report(state, percent, overrides) {
  return engine.submitReport(state, {
    kind: 'sub', actorId: 'sub-floor', taskId: 'lvp', percent, note: 'Demo progress',
    at: '2026-10-27T12:00:00Z', ...overrides,
  });
}
function approve(state, id, overrides) {
  return engine.reviewReport(state, {
    kind: 'pm', action: 'approve', reportId: id,
    at: '2026-10-27T12:05:00Z', ...overrides,
  });
}
function view(state, kind, actorId) { return engine.projectFor(state, {kind, actorId}); }

test('sub report is pending until PM validates and does not change official progress or credit', () => {
  const state = engine.createState();
  const r = report(state, 40);
  assert.equal(r.status, 'pending');
  assert.equal(view(state, 'pm').tasks.find(t => t.id === 'lvp').validatedProgress, 0);
  assert.equal(view(state, 'pm').totalRecognizedCredit, 0);
  assert.equal(view(state, 'client').tasks.find(t => t.id === 'lvp').validatedProgress, 0);
  assert.equal(view(state, 'sub', 'sub-floor').tasks.find(t => t.id === 'lvp').estimatedCredit, 576);
  assert.equal(state.ledger.length, 0);
  assert.equal(state.audit[0].type, 'reported');
});

test('only a PM review officially recognizes correctly weighted subcontract credit', () => {
  const state = engine.createState(), r = report(state, 40);
  assert.throws(() => engine.reviewReport(state, {kind:'sub',reportId:r.id,action:'approve'}), /pm_required/);
  const outcome = approve(state, r.id);
  assert.equal(outcome.status, 'validated');
  assert.equal(outcome.approvedPercent, 40);
  assert.equal(outcome.newRecognizedCredit, 576);
  assert.equal(outcome.paymentAuthorized, false);
  assert.equal(view(state, 'pm').totalRecognizedCredit, 576);
  assert.equal(view(state, 'client').tasks.find(t => t.id === 'lvp').validatedProgress, 40);
  assert.equal(state.ledger[0].deltaCents, 57600);
});

test('subsequent validation records only credit delta, preserving historical entries', () => {
  const state = engine.createState();
  approve(state, report(state, 40).id);
  const original = {...state.ledger[0]};
  const next = approve(state, report(state, 60).id);
  assert.equal(next.newRecognizedCredit, 288); // $2,400 × 60% task weight × (60%−40%)
  assert.equal(view(state, 'pm').totalRecognizedCredit, 864);
  assert.deepEqual(state.ledger[0], original);
  assert.equal(state.ledger.length, 2);
  assert.ok(Object.isFrozen(state.ledger[0]));
  assert.throws(() => { state.ledger[0].deltaCents = 0; }, TypeError);
  assert.equal(state.ledger[0].baselineVersion, 'Original 1.0');
});

test('rejection requires a reason, creates no credit and permits a new submission', () => {
  const state = engine.createState();
  const r = report(state, 65);
  assert.throws(() => engine.reviewReport(state, {kind:'pm',reportId:r.id,action:'reject'}), /reason_required/);
  const outcome = engine.reviewReport(state, {
    kind:'pm',reportId:r.id,action:'reject',reason:'Quality check pending',
  });
  assert.equal(outcome.newRecognizedCredit, 0);
  assert.equal(view(state, 'client').tasks.find(t => t.id === 'lvp').validatedProgress, 0);
  assert.equal(view(state, 'pm').pendingReports.length, 0);
  assert.equal(report(state, 50).status, 'pending');
});

test('PM must explain adjustments and cannot retroactively reduce validated credit', () => {
  const state = engine.createState();
  const r = report(state, 60);
  assert.throws(() => approve(state, r.id, {percent:55}), /reason_required/);
  const outcome = approve(state, r.id, {percent:55,reason:'55% confirmed on inspection'});
  assert.equal(outcome.approvedPercent, 55);
  assert.equal(outcome.newRecognizedCredit, 792);
  const next = report(state, 80);
  assert.throws(() => approve(state, next.id, {percent:54,reason:'reversal'}), /below_validated_progress/);
  assert.equal(state.reports[1].status, 'pending');
  assert.equal(state.ledger.length, 1);
});

test('sub scope restricts reports and read projection; client has no internal financial info', () => {
  const state = engine.createState();
  assert.throws(() => engine.submitReport(state, {
    kind:'sub',actorId:'sub-paint',taskId:'lvp',percent:50,
  }), /scope_forbidden/);
  assert.deepEqual(view(state, 'sub', 'sub-paint').tasks.map(t=>t.id), ['walls']);
  assert.deepEqual(view(state, 'sub', 'sub-floor').tasks.map(t=>t.id), ['lvp','baseboard']);
  report(state, 60);
  const client = view(state, 'client');
  assert.equal(JSON.stringify(client).includes('credit'), false);
  assert.equal(JSON.stringify(client).includes('Credit'), false);
  assert.equal(JSON.stringify(client).includes('pending'), false);
  assert.equal(JSON.stringify(client).includes('report'), false);
  assert.equal(JSON.stringify(client).includes('subcontract'), false);
  assert.ok(!('audit' in client));
  assert.ok(!('paymentAuthorized' in client));
  assert.equal(client.tasks.find(t=>t.id==='lvp').validatedProgress, 0);
});

test('duplicate and lower-than-validated reports rejected; invalid percentages rejected', () => {
  const state = engine.createState();
  const r = report(state, 45);
  assert.throws(() => report(state, 50), /pending_report_exists/);
  approve(state,r.id);
  assert.throws(() => report(state, 40), /below_validated_progress/);
  for(const value of [-1, 101, Infinity, '']) {
    assert.throws(() => report(state,value), /invalid_percent/);
  }
  assert.equal(view(state,'pm').totalRecognizedCredit,648);
});

test('cannot approve twice or forge PM action under sub role', () => {
  const state = engine.createState(), r = report(state, 35);
  approve(state,r.id);
  assert.throws(() => approve(state,r.id), /report_already_reviewed/);
  assert.throws(() => engine.projectFor(state,{kind:'sub',actorId:'other'}),/sub_not_found/);
  assert.throws(() => engine.submitReport(state,{kind:'pm',actorId:'sub-floor',taskId:'lvp',percent:50}),/sub_required/);
});

test('immutable baseline catalog cannot be altered through returned copies', () => {
  const first = engine.getCatalog();
  first.scopes[0].subcontractCents = 99999999;
  first.project.baselineVersion = 'forged';
  first.tasks[0].weight = 0;
  const second = engine.getCatalog();
  assert.equal(second.scopes[0].subcontractCents, 240000);
  assert.equal(second.project.baselineVersion, 'Original 1.0');
  assert.equal(second.tasks[0].weight, 0.6);
});

test('no financial payment execution exists in the demo engine', () => {
  const names = Object.keys(engine).sort();
  assert.deepEqual(names, [
    'createState','getCatalog','projectFor','reviewReport','submitReport',
  ]);
  assert.equal(view(engine.createState(),'pm').paymentAuthorized,false);
  assert.equal(view(engine.createState(),'sub','sub-floor').paymentAuthorized,false);
});
