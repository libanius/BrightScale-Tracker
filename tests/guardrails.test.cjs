'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const inline = scripts.find((item) => !/\bsrc\s*=/.test(item[1]));
assert.ok(inline, 'index.html must contain an inline application script');
const app = inline[2];

// Test the actual functions shipped in index.html, not copied business logic.
function fn(name, globals = {}) {
  const match = app.match(new RegExp('^function ' + name + '\\([^\\n]*\\) \\{[\\s\\S]*?^\\}', 'm'));
  assert.ok(match, 'Missing function: ' + name);
  return vm.runInNewContext('(' + match[0] + ')', globals, { filename: 'index.html' });
}

test('inline application JavaScript parses', () => {
  assert.doesNotThrow(() => new vm.Script(app, { filename: 'index.html' }));
});

test('editing a task preserves acceptance criteria, metadata and the original object', () => {
  const preserve = fn('preserveTaskOnSave');
  const before = {
    id: 'task-1', title: 'Install LVP', progress: 20,
    acceptanceCriteria: 'No hollow spots', futureFlag: 'retained', createdAt: 'yesterday',
  };
  const saved = preserve(before, { title: 'Install flooring', progress: 65 });
  assert.equal(saved.acceptanceCriteria, 'No hollow spots');
  assert.equal(saved.futureFlag, 'retained');
  assert.equal(saved.title, 'Install flooring');
  assert.equal(saved.progress, 65);
  assert.equal(before.progress, 20);
  assert.notStrictEqual(saved, before);
});

test('both task editing flows invoke the metadata-preserving helper', () => {
  const occurrences = app.match(/dbPut\('tasks', preserveTaskOnSave\(task, \{/g) || [];
  assert.equal(occurrences.length, 2);
});

test('both task editing interfaces retain acceptance criteria on save', async () => {
  for (const name of ['openTaskEdit', 'openTaskForm']) {
    const saved = [];
    const buttons = [];
    const fake = () => ({ style: {}, appendChild() {}, parentNode: { style: {} } });
    const globals = {
      preserveTaskOnSave: fn('preserveTaskOnSave'),
      showModal: (callback) => callback(fake(), () => {}),
      div: fake,
      mkLbl: fake,
      el: fake,
      btn: (_className, title, onclick) => {
        const button = { style: {}, title, onclick };
        buttons.push(button);
        return button;
      },
      dbPut: (store, record) => {
        saved.push({ store, record });
        return Promise.resolve();
      },
      markModalSaving() {},
      setScopeOpen() {},
      reloadAndPublishDashboard: () => Promise.resolve(),
      toast() {},
      setTimeout() {},
    };
    const task = {
      id: 'task-1', scopeId: 'scope-1', title: 'Flooring',
      order: 1, progress: 25, deadline: '2026-11-01', status: 'in_progress',
      acceptanceCriteria: 'Flat and finished', extraMetadata: 'safe', createdAt: 'yesterday',
    };
    if (name === 'openTaskForm') fn(name, globals)('scope-1', task);
    else fn(name, globals)(task);
    const save = buttons.find((item) => item.title === 'Salvar');
    assert.ok(save, 'Expected save button in ' + name);
    save.onclick();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(saved.length, 1, name);
    assert.equal(saved[0].store, 'tasks', name);
    assert.equal(saved[0].record.acceptanceCriteria, 'Flat and finished', name);
    assert.equal(saved[0].record.extraMetadata, 'safe', name);
  }
});

test('existing-project estimates are blocked before any local writes', async () => {
  const guard = fn('assertEstimateCreatesNewProject');
  assert.throws(() => guard('existing-project'), /Change Order aprovado/);
  assert.doesNotThrow(() => guard(''));

  let writes = 0;
  const importer = fn('importContractToProject', {
    assertEstimateCreatesNewProject: guard,
    Promise,
    dbPut: () => { writes++; return Promise.resolve(); },
    S: { projects: [{ id: 'existing-project', contractTotal: 10000 }] },
    uid: () => 'new-id',
    today: () => '2026-10-26',
    window: {},
  });
  const file = { name: 'estimate.txt', type: 'text/plain', size: 24 };
  const data = { projectName: 'Sample', total: 2500, scopes: [] };
  await assert.rejects(importer(file, 'Sample estimate text', data, 'existing-project'), /Change Order aprovado/);
  assert.equal(writes, 0, 'Must not write project, document or tasks before rejecting');
});

test('new project import creates its own contract and preserves task acceptance criteria', async () => {
  const guard = fn('assertEstimateCreatesNewProject');
  const writes = [];
  let next = 0;
  const importer = fn('importContractToProject', {
    assertEstimateCreatesNewProject: guard,
    Promise,
    dbPut: (store, record) => { writes.push({ store, record }); return Promise.resolve(); },
    S: { projects: [{ id: 'existing', contractTotal: 10000 }] },
    uid: () => 'id-' + (++next),
    today: () => '2026-10-26',
    window: {},
  });
  const file = { name: 'sample.txt', type: 'text/plain', size: 20 };
  const data = {
    projectName: 'New flooring project', clientName: 'Demo client', address: 'Demo location',
    total: 2500, summary: 'Sample scope', unitNumber: 'Main',
    scopes: [{ title: 'Floor', order: 1, weight: 1,
      tasks: [{ title: 'Install', order: 1, acceptanceCriteria: 'Installed correctly' }] }],
  };
  const id = await importer(file, 'Demo sample text', data, '');
  const projectWrite = writes.find((w) => w.store === 'projects');
  assert.ok(projectWrite);
  assert.equal(projectWrite.record.id, id);
  assert.equal(projectWrite.record.contractTotal, 2500);
  assert.notEqual(id, 'existing');
  assert.equal(writes.filter((w) => w.store === 'tasks').length, 1);
  assert.equal(writes.find((w) => w.store === 'tasks').record.acceptanceCriteria, 'Installed correctly');
});

test('existing contract choice is visibly disabled in the review', () => {
  assert.match(app, /option\.disabled = true;/);
  assert.match(app, /Change Order necessário/);
});
