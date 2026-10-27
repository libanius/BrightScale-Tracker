'use strict';
// Isolated HTTP integration: real HS256 bearer JWTs + PostgREST 14 + PG17 RLS.
// NOT Supabase Auth, NOT production; all UUIDs/data are synthetic in CI.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const ORIGIN = process.env.PILOT_API_URL || 'http://127.0.0.1:3000';
const SECRET = 'SYNTHETIC_CI_ONLY_POSTGREST_JWT_SIGNING_KEY_2026';
const IDs = {
  pm: '11111111-1111-4111-8111-111111111111',
  sub: '22222222-2222-4222-8222-222222222222',
  client: '33333333-3333-4333-8333-333333333333',
  outsider: '44444444-4444-4444-8444-444444444444',
};
const fmt = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
function token(sub) {
  const now = Math.floor(Date.now()/1000);
  const signing = fmt({typ:'JWT',alg:'HS256'}) + '.' + fmt({sub,role:'authenticated',aud:'authenticated',iat:now,exp:now+1200});
  const signature = crypto.createHmac('sha256',SECRET).update(signing).digest('base64url');
  return signing + '.' + signature;
}
function auth(id) {
  return {Authorization:'Bearer '+token(id)};
}
async function req(method, path, id, body, expected=[200]) {
  const headers = {'Content-Type':'application/json','Prefer':'return=representation'};
  if(id)Object.assign(headers,auth(id));
  const response = await fetch(ORIGIN + '/' + path,{
    method,headers,body:body===undefined?undefined:JSON.stringify(body)
  });
  const text = await response.text();
  let data;
  try { data=text ? JSON.parse(text) : null; } catch (_) { data=text; }
  assert.ok(expected.includes(response.status),
    method+' '+path+' for '+(id||'anonymous')+' => HTTP '+response.status+' expected '+expected.join(',')+
    ' body '+JSON.stringify(data).slice(0,500));
  return {status:response.status,data};
}
function one({data}) {
  assert.ok(Array.isArray(data)&&data.length===1,'Expected exactly one inserted row: '+JSON.stringify(data));
  return data[0];
}
(async function run(){
  // No-token or counterfeit-token requests cannot read private project data.
  await req('GET','pilot_projects',null,undefined,[401,403]);
  const forged=token(IDs.pm).slice(0,-6)+'AAAAAA';
  const bad=await fetch(ORIGIN+'/pilot_projects',{headers:{Authorization:'Bearer '+forged}});
  assert.equal(bad.status,401,'Tampered JWT must be rejected at API boundary');

  // Test a PM can create a new synthetic project as their own JWT subject.
  const project=one(await req('POST','pilot_projects',IDs.pm,{name:'SYNTHETIC JWT API Flooring'},[201]));
  assert.equal(project.owner_id,IDs.pm);
  const pid=project.id;
  one(await req('POST','pilot_memberships',IDs.pm,{project_id:pid,user_id:IDs.sub,role:'sub'},[201]));
  one(await req('POST','pilot_memberships',IDs.pm,{project_id:pid,user_id:IDs.client,role:'client'},[201]));
  const scope=one(await req('POST','pilot_scopes',IDs.pm,{project_id:pid,name:'SYNTHETIC JWT Flooring'},[201]));
  one(await req('POST','pilot_scope_terms',IDs.pm,{scope_id:scope.id,subcontract_cents:240000},[201]));
  one(await req('POST','pilot_assignments',IDs.pm,{scope_id:scope.id,user_id:IDs.sub},[201]));
  const task=one(await req('POST','pilot_tasks',IDs.pm,{scope_id:scope.id,title:'Synthetic JWT Install LVP',weight_pct:60},[201]));

  // Reports cannot be submitted until PM explicitly freezes the baseline.
  await req('POST','pilot_reports',IDs.sub,
    {task_id:task.id,reported_pct:30,note:'before PM freeze'},[401,403]);
  await req('POST','rpc/pilot_freeze_baseline',IDs.sub,
    {p_project_id:pid},[401,403]);
  await req('POST','rpc/pilot_freeze_baseline',IDs.pm,
    {p_project_id:pid},[400,409]); // weights total 60%, baseline incomplete
  const baseboard=one(await req('POST','pilot_tasks',IDs.pm,
    {scope_id:scope.id,title:'SYNTHETIC Baseboard',weight_pct:40},[201]));
  assert.equal(baseboard.weight_pct,40);
  const freeze=await req('POST','rpc/pilot_freeze_baseline',IDs.pm,
    {p_project_id:pid});
  assert.equal(freeze.data.status,'frozen');
  assert.equal(freeze.data.payment_authorized,false);
  const meta=await req('GET','pilot_projects?id=eq.'+pid+'&select=baseline_frozen_at',IDs.pm);
  assert.ok(meta.data[0].baseline_frozen_at);
  await req('POST','pilot_tasks',IDs.pm,
    {scope_id:scope.id,title:'SYNTHETIC late scope mutation',weight_pct:1},[400,403,409]);
  await req('POST','rpc/pilot_freeze_baseline',IDs.pm,
    {p_project_id:pid},[400,409]);

  // A foreign caller cannot list private projects or write reports.
  const outsider=await req('GET','pilot_projects?select=id&name=eq.SYNTHETIC%20JWT%20API%20Flooring',IDs.outsider);
  assert.deepEqual(outsider.data,[]);
  const failedClientReport=await req('POST','pilot_reports',IDs.client,
    {task_id:task.id,reported_pct:100},[401,403]);
  assert.ok(failedClientReport.data);

  // Before PM approval the client sees task but NO pending report or credits.
  const clientProjects=await req('GET','pilot_projects?select=id',IDs.client);
  assert.ok(clientProjects.data.some(x=>x.id===pid));
  const clientTerms=await req('GET','pilot_scope_terms?select=scope_id,subcontract_cents',IDs.client);
  const clientCredits=await req('GET','pilot_credit_events?select=delta_cents',IDs.client);
  assert.deepEqual(clientTerms.data,[]); assert.deepEqual(clientCredits.data,[]);

  // Sub logs report; PM has authority to approve, not sub or client.
  const report=one(await req('POST','pilot_reports',IDs.sub,
    {task_id:task.id,reported_pct:40,note:'SYNTHETIC JWT sub progress'},[201]));
  assert.equal(report.author_id,IDs.sub);
  assert.equal(report.status,'pending');
  const denied=await req('POST','rpc/pilot_review_report',IDs.sub,
    {p_report_id:report.id,p_action:'approve',p_approved_pct:40,p_reason:''},[401,403]);
  assert.ok(denied.data);
  const before=await req('GET','pilot_validations?task_id=eq.'+task.id,IDs.client);
  assert.deepEqual(before.data,[]);
  const clientReports=await req('GET','pilot_reports?task_id=eq.'+task.id,IDs.client);
  assert.deepEqual(clientReports.data,[]);

  // PM approval is one server transaction, credit recognized != payment.
  const accepted=await req('POST','rpc/pilot_review_report',IDs.pm,
    {p_report_id:report.id,p_action:'approve',p_approved_pct:40,p_reason:''});
  assert.equal(accepted.data.status,'validated');
  assert.equal(accepted.data.new_credit_cents,57600);
  assert.equal(accepted.data.payment_authorized,false);
  const validated=await req('GET','pilot_validations?task_id=eq.'+task.id,IDs.client);
  assert.equal(Number(validated.data[0].validated_pct),40);
  const stillPrivate=await req('GET','pilot_reports?task_id=eq.'+task.id,IDs.client);
  assert.deepEqual(stillPrivate.data,[]);
  const subCredit=await req('GET','pilot_credit_events?task_id=eq.'+task.id,IDs.sub);
  assert.equal(subCredit.data[0].delta_cents,57600);
  const clientCredit=await req('GET','pilot_credit_events?task_id=eq.'+task.id,IDs.client);
  assert.deepEqual(clientCredit.data,[]);
  await req('POST','rpc/pilot_review_report',IDs.pm,
    {p_report_id:report.id,p_action:'approve',p_approved_pct:80,p_reason:''},[400,409]);

  // An approved CO is NEVER merged with the original contract's baseline,
  // reports, recognized credit ledger or subcontractor/client prices.
  await req('POST','rpc/pilot_co_create_draft',IDs.sub,
    {p_project_id:pid,p_title:'SYNTHETIC Bathroom Addon',p_description:'Demo only',p_client_cents:350000},[401,403]);
  const drafted=await req('POST','rpc/pilot_co_create_draft',IDs.pm,
    {p_project_id:pid,p_title:'SYNTHETIC Bathroom Addon',p_description:'Demo only',p_client_cents:350000});
  const co=drafted.data.co_id;
  assert.equal(drafted.data.status,'draft');
  const clientDraft=await req('GET','pilot_change_orders?id=eq.'+co,IDs.client);
  assert.deepEqual(clientDraft.data,[]); // never expose unfinished offers
  const subDraft=await req('GET','pilot_change_orders?id=eq.'+co,IDs.sub);
  assert.deepEqual(subDraft.data,[]);
  await req('POST','rpc/pilot_co_submit',IDs.pm,{p_co_id:co},[400,409]);
  await req('POST','rpc/pilot_co_add_scope',IDs.client,{
    p_co_id:co,p_title:'SYNTHETIC shower',p_sub_id:IDs.sub,p_sub_cents:80000
  },[401,403]);
  const coScope=await req('POST','rpc/pilot_co_add_scope',IDs.pm,{
    p_co_id:co,p_title:'SYNTHETIC shower',p_sub_id:IDs.sub,p_sub_cents:80000
  });
  const coScopeId=coScope.data.scope_id;
  const taskA=await req('POST','rpc/pilot_co_add_task',IDs.pm,
    {p_scope_id:coScopeId,p_title:'SYNTHETIC tile demo',p_weight_pct:60});
  const coTask=taskA.data.task_id;
  await req('POST','rpc/pilot_co_add_task',IDs.pm,
    {p_scope_id:coScopeId,p_title:'Overallocated',p_weight_pct:41},[400,409]);
  await req('POST','rpc/pilot_co_submit',IDs.pm,{p_co_id:co},[400,409]);
  await req('POST','rpc/pilot_co_add_task',IDs.pm,
    {p_scope_id:coScopeId,p_title:'SYNTHETIC install tile',p_weight_pct:40});
  const submitted=await req('POST','rpc/pilot_co_submit',IDs.pm,{p_co_id:co});
  assert.equal(submitted.data.status,'submitted');
  await req('POST','rpc/pilot_co_add_task',IDs.pm,
    {p_scope_id:coScopeId,p_title:'Edit after client offer',p_weight_pct:1},[400,409]);
  const clientOffer=await req('GET','pilot_co_client_terms?co_id=eq.'+co,IDs.client);
  assert.equal(clientOffer.data[0].client_amount_cents,350000);
  const subOffer=await req('GET','pilot_co_client_terms?co_id=eq.'+co,IDs.sub);
  assert.deepEqual(subOffer.data,[]);
  const clientSubPrice=await req('GET','pilot_co_sub_terms?scope_id=eq.'+coScopeId,IDs.client);
  assert.deepEqual(clientSubPrice.data,[]);
  const clientCoCredit=await req('GET','pilot_co_credit_events?co_id=eq.'+co,IDs.client);
  assert.deepEqual(clientCoCredit.data,[]);
  await req('POST','pilot_co_reports',IDs.sub,
    {task_id:coTask,reported_pct:50,note:'CO before activation'},[401,403]);
  await req('POST','rpc/pilot_co_activate',IDs.pm,{p_co_id:co},[400,409]);
  await req('POST','rpc/pilot_co_client_decide',IDs.sub,
    {p_co_id:co,p_approve:true,p_reason:''},[401,403]);
  const clientApproved=await req('POST','rpc/pilot_co_client_decide',IDs.client,
    {p_co_id:co,p_approve:true,p_reason:''});
  assert.equal(clientApproved.data.status,'client_approved');
  assert.equal(clientApproved.data.signature_verified,false);
  await req('POST','rpc/pilot_co_activate',IDs.client,{p_co_id:co},[401,403]);
  const activated=await req('POST','rpc/pilot_co_activate',IDs.pm,{p_co_id:co});
  assert.equal(activated.data.status,'active');
  assert.equal(activated.data.contract_original_unchanged,true);
  const coReport=one(await req('POST','pilot_co_reports',IDs.sub,
    {task_id:coTask,reported_pct:50,note:'SYNTHETIC CO tile at 50%'},[201]));
  assert.equal(coReport.author_id,IDs.sub);
  assert.equal(coReport.status,'pending');
  await req('POST','rpc/pilot_co_review_report',IDs.sub,
    {p_report_id:coReport.id,p_action:'approve',p_approved_pct:50,p_reason:''},[401,403]);
  const coCreditReview=await req('POST','rpc/pilot_co_review_report',IDs.pm,
    {p_report_id:coReport.id,p_action:'approve',p_approved_pct:50,p_reason:''});
  assert.equal(coCreditReview.data.new_credit_cents,24000);
  assert.equal(coCreditReview.data.payment_authorized,false);
  const coCredits=await req('GET','pilot_co_credit_events?co_id=eq.'+co,IDs.sub);
  assert.equal(coCredits.data.length,1);
  assert.equal(coCredits.data[0].delta_cents,24000);
  const clientCoCredits=await req('GET','pilot_co_credit_events?co_id=eq.'+co,IDs.client);
  assert.deepEqual(clientCoCredits.data,[]);
  const originalStill=await req('GET','pilot_credit_events?task_id=eq.'+task.id,IDs.pm);
  assert.equal(originalStill.data.length,1);
  assert.equal(originalStill.data[0].delta_cents,57600);
  const originalTerms=await req('GET','pilot_scope_terms?scope_id=eq.'+scope.id,IDs.pm);
  assert.equal(originalTerms.data[0].subcontract_cents,240000);
  const coAudit=await req('GET','pilot_co_audit_events?co_id=eq.'+co,IDs.pm);
  assert.ok(coAudit.data.length>=7);
  const clientAudit=await req('GET','pilot_co_audit_events?co_id=eq.'+co,IDs.client);
  assert.deepEqual(clientAudit.data,[]);

  // Client can refuse another proposed CO, with reason, but never rewrite
  // submitted prices or cause an automatic activation/payment.
  const declinedDraft=await req('POST','rpc/pilot_co_create_draft',IDs.pm,
    {p_project_id:pid,p_title:'SYNTHETIC Declined Add-on',
     p_description:'Counterproposal fixture',p_client_cents:120000});
  const deniedCo=declinedDraft.data.co_id;
  const deniedScope=await req('POST','rpc/pilot_co_add_scope',IDs.pm,
    {p_co_id:deniedCo,p_title:'SYNTHETIC Declined Shower',
      p_sub_id:IDs.sub,p_sub_cents:35000});
  await req('POST','rpc/pilot_co_add_task',IDs.pm,
    {p_scope_id:deniedScope.data.scope_id,p_title:'Tile repair',p_weight_pct:100});
  await req('POST','rpc/pilot_co_submit',IDs.pm,{p_co_id:deniedCo});
  await req('PATCH','pilot_co_client_terms?co_id=eq.'+deniedCo,IDs.client,
    {client_amount_cents:1},[401,403,405]);
  const declined=await req('POST','rpc/pilot_co_client_decide',IDs.client,
    {p_co_id:deniedCo,p_approve:false,p_reason:'Need revised amount'});
  assert.equal(declined.data.status,'declined');
  await req('POST','rpc/pilot_co_activate',IDs.pm,{p_co_id:deniedCo},[400,409]);
  await req('POST','rpc/pilot_co_client_decide',IDs.client,
    {p_co_id:deniedCo,p_approve:true,p_reason:''},[400,409]);
  const declinedSub=await req('GET','pilot_change_orders?id=eq.'+deniedCo,IDs.sub);
  assert.deepEqual(declinedSub.data,[]);
  // No CO decision may alter the original already recognized ledger.
  const afterDeclineOriginal=await req('GET','pilot_credit_events?task_id=eq.'+task.id,IDs.pm);
  assert.equal(afterDeclineOriginal.data[0].delta_cents,57600);

  // Revoking access invalidates RLS immediately without deleting audit rows.
  await req('DELETE','pilot_memberships?project_id=eq.'+pid+'&user_id=eq.'+IDs.sub,IDs.pm,undefined,[204,200]);
  const revoked=await req('GET','pilot_tasks?id=eq.'+task.id,IDs.sub);
  assert.deepEqual(revoked.data,[]);
  const revokedCredit=await req('GET','pilot_credit_events?task_id=eq.'+task.id,IDs.sub);
  assert.deepEqual(revokedCredit.data,[]);
  const revokedCo=await req('GET','pilot_co_credit_events?co_id=eq.'+co,IDs.sub);
  assert.deepEqual(revokedCo.data,[]);
  console.log('PASS: real HTTP bearer-JWT signatures, RLS isolation, PM-only RPC, credit, visibility and revocation.');
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
