'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Gateway = require('../staging/pilot-gateway.js');

function mockSupabase(rows={}) {
  const calls=[];
  return {
    calls,
    from(table) {
      const opts={table,mode:'select',filter:[]};
      calls.push({type:'table',table});
      const builder={
        select(columns) { opts.columns=columns; return builder; },
        insert(data) { opts.mode='insert'; opts.data=data; return builder; },
        in(field,values){opts.filter.push({field,values});return builder;},
        eq(field,value){opts.filter.push({field,values:[value]});return builder;},
        single(){return Promise.resolve({data:{id:'synthetic-id',...opts.data},error:null});},
        then(resolve,reject){
          let values=rows[table]||[];
          for(const f of opts.filter)values=values.filter(item=>f.values.includes(item[f.field]));
          return Promise.resolve({data:values,error:null}).then(resolve,reject);
        }
      };
      return builder;
    },
    rpc(name,payload){calls.push({type:'rpc',name,payload});return Promise.resolve({data:name==='pilot_freeze_baseline'?{status:'frozen',scope_count:1,payment_authorized:false}:{status:'validated',new_credit_cents:57600,payment_authorized:false},error:null});}
  };
}

const pm='11111111-1111-4111-8111-111111111111';
const sub='22222222-2222-4222-8222-222222222222';
const client='33333333-3333-4333-8333-333333333333';
const project={id:'project-1',name:'DEMO Flooring',owner_id:pm,baseline_version:1};
const mockData={
  pilot_memberships:[
    {project_id:'project-1',user_id:sub,role:'sub'},
    {project_id:'project-1',user_id:client,role:'client'},
  ],
  pilot_scopes:[{id:'scope-1',project_id:'project-1',name:'Flooring'}],
  pilot_tasks:[{id:'task-1',scope_id:'scope-1',title:'Lay LVP',weight_pct:60}],
  pilot_validations:[{task_id:'task-1',validated_pct:40}],
  pilot_reports:[{id:'report-1',task_id:'task-1',status:'pending',author_id:sub,reported_pct:60}],
  pilot_credit_events:[{id:'credit-1',task_id:'task-1',sub_id:sub,delta_cents:57600}],
  pilot_scope_terms:[{scope_id:'scope-1',subcontract_cents:240000}],
  pilot_assignments:[{scope_id:'scope-1',user_id:sub}],
};

test('client portal does not even REQUEST financial, report or team assignments',async()=>{
 const sb=mockSupabase(mockData), api=Gateway.create(sb);
 const snapshot=await api.snapshot(project,{id:client});
 assert.equal(snapshot.role,'client');
 assert.deepEqual(Object.keys(snapshot).sort(),['project','role','scopes','tasks','validations']);
 const names=sb.calls.filter(x=>x.table).map(x=>x.table);
 for(const forbidden of ['pilot_reports','pilot_credit_events','pilot_scope_terms','pilot_assignments','pilot_audit_events'])
   assert.equal(names.includes(forbidden),false,'Client queried '+forbidden);
 assert.equal(snapshot.validations[0].validated_pct,40);
});

test('sub projection never loads PM-only membership list or private audit',async()=>{
 const sb=mockSupabase(mockData), api=Gateway.create(sb);
 const snapshot=await api.snapshot(project,{id:sub});
 assert.equal(snapshot.role,'sub');
 assert.ok(!('members' in snapshot));
 assert.ok(!sb.calls.some(x=>x.table==='pilot_audit_events'));
 assert.equal(snapshot.credits[0].delta_cents,57600);
});

test('PM loads review and credit data separately without auto-authorizing payment',async()=>{
 const sb=mockSupabase(mockData),api=Gateway.create(sb);
 const snapshot=await api.snapshot(project,{id:pm});
 assert.equal(snapshot.role,'pm');
 assert.equal(snapshot.reports.length,1);
 assert.equal(snapshot.credits.length,1);
 assert.equal(snapshot.members.length,2);
 assert.ok(!('payment_authorized' in snapshot));
});

test('report payload has no author, review status or client-supplied timestamp',async()=>{
 const sb=mockSupabase(mockData),api=Gateway.create(sb);
 const note=await api.report('task-1','49','SYNTHETIC progress');
 assert.deepEqual(Object.keys(note).sort(),['id','note','reported_pct','task_id']);
 assert.equal(note.reported_pct,49);
 for(const x of ['author_id','status','reviewed_by','created_at','validated_pct'])
   assert.equal(x in note,false,'Client might forge '+x);
});

test('only server RPC approves, gateway sends no role or payment authorization parameter',async()=>{
 const sb=mockSupabase(mockData),api=Gateway.create(sb);
 const review=await api.review('report-1','approve',40,'validated on site');
 assert.equal(review.new_credit_cents,57600);
 const call=sb.calls.find(x=>x.type==='rpc');
 assert.equal(call.name,'pilot_review_report');
 assert.deepEqual(Object.keys(call.payload).sort(),['p_action','p_approved_pct','p_reason','p_report_id']);
 assert.ok(!('role' in call.payload));
 assert.ok(!('approved_payout' in call.payload));
});

test('reject invalid role, malformed uuid, percent, zero weight and negative money',async()=>{
 const sb=mockSupabase(mockData),api=Gateway.create(sb);
 assert.throws(()=>api.inviteTestMember('project-1',sub,'pm'),/invalid_member_role/);
 assert.throws(()=>api.assignSub('scope-1','anything'),/invalid_user_uuid/);
 assert.throws(()=>api.report('task-1',101,''),/percent/);
 assert.throws(()=>api.createTask('scope-1','Bad task',0),/weight_must_be_positive/);
 assert.throws(()=>api.createScope('project-1','Bad price',-1),/invalid_scope_cents/);
 await assert.rejects(api.review('report-1','pay',40,''),/invalid_review_action/);
});

test('baseline freeze calls server RPC without passing a client-selected role',async()=>{
 const sb=mockSupabase(mockData),api=Gateway.create(sb);
 const result=await api.freezeBaseline(project.id);
 assert.equal(result.status,'frozen');
 assert.equal(result.payment_authorized,false);
 const call=sb.calls.find(x=>x.type==='rpc');
 assert.equal(call.name,'pilot_freeze_baseline');
 assert.deepEqual(call.payload,{p_project_id:project.id});
});

test('staging browser files parse and have no embedded role-secret credentials',()=>{
 for(const file of ['pilot-ui.js','pilot-gateway.js']){
  const source=fs.readFileSync(path.join(__dirname,'../staging',file),'utf8');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:file}));
 }
 const html=fs.readFileSync(path.join(__dirname,'../staging/pilot.html'),'utf8');
 assert.match(html,/TEST ENVIRONMENT/);
 assert.match(html,/noindex/);
 assert.doesNotMatch(html,/service_role\s*[:=]\s*['"][A-Za-z0-9._-]{30}/);
});
