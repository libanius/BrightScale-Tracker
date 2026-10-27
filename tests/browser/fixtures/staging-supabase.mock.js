/* TEST-ONLY fake Supabase SDK. No network, no real credentials, no real login.
 * Replaces CDN SDK exclusively in isolated Chromium CI tests.
 */
(function(){
  'use strict';
  var PM='11111111-1111-4111-8111-111111111111';
  var SUB='22222222-2222-4222-8222-222222222222';
  var CLIENT='33333333-3333-4333-8333-333333333333';
  var project={id:'demo-project',owner_id:PM,name:'SYNTHETIC STAGING Flooring',baseline_version:1,baseline_frozen_at:window.__pilotMockDraft?null:'2026-10-27T15:00:00Z'};
  var role=window.__pilotMockRole||'client';
  var id={pm:PM,sub:SUB,client:CLIENT}[role];
  window.__pilotQueried=[];
  window.__pilotWrites=[];
  var data={
    pilot_projects:[project],
    pilot_memberships:[
      {project_id:project.id,user_id:SUB,role:'sub'},
      {project_id:project.id,user_id:CLIENT,role:'client'}
    ],
    pilot_scopes:[{id:'demo-scope',project_id:project.id,name:'SYNTHETIC Flooring'}],
    pilot_tasks:[{id:'demo-task',scope_id:'demo-scope',title:'SYNTHETIC Install LVP',weight_pct:60}],
    pilot_validations:[{task_id:'demo-task',validated_pct:40}],
    pilot_reports:[{id:'demo-report',task_id:'demo-task',author_id:SUB,status:'pending',reported_pct:65,note:'DEMO sub note',created_at:'2026-10-27'}],
    pilot_credit_events:[{task_id:'demo-task',sub_id:SUB,delta_cents:57600}],
    pilot_scope_terms:[{scope_id:'demo-scope',subcontract_cents:240000}],
    pilot_assignments:[{scope_id:'demo-scope',user_id:SUB}],
  };
  var mockCOStatus=window.__pilotMockCOStatus||'submitted';
  if(window.__pilotMockCO)Object.assign(data,{
    pilot_change_orders:[{id:'co-demo',project_id:'demo-project',title:'SYNTHETIC Bathroom Add-on',description:'Demo shower upgrade',
      status:mockCOStatus,submitted_at:'2026-10-27T10:00:00Z'}],
    pilot_co_client_terms:[{co_id:'co-demo',client_amount_cents:350000}],
    pilot_co_scopes:[{id:'co-scope-demo',co_id:'co-demo',title:'SYNTHETIC Shower'}],
    pilot_co_sub_terms:[{scope_id:'co-scope-demo',sub_id:SUB,subcontract_cents:80000}],
    pilot_co_tasks:[
      {id:'co-task-demo',scope_id:'co-scope-demo',title:'SYNTHETIC Install shower tile',weight_pct:60},
      {id:'co-task-second',scope_id:'co-scope-demo',title:'SYNTHETIC Grout',weight_pct:40}],
    pilot_co_validations:[{task_id:'co-task-demo',validated_pct:50}],
    pilot_co_reports:[{id:'co-report-demo',task_id:'co-task-demo',author_id:SUB,status:'pending',reported_pct:60,note:'PRIVATE sub CO note',created_at:'2026-10-27'}],
    pilot_co_credit_events:[{id:'co-credit-demo',co_id:'co-demo',scope_id:'co-scope-demo',task_id:'co-task-demo',
      sub_id:SUB,delta_cents:24000,validated_pct:50}],
    pilot_co_requests:[{id:'co-request-demo',project_id:'demo-project',requester_id:CLIENT,
      title:'SYNTHETIC Requested faucet',description:'Fixture upgrade request',status:'pending',created_at:'2026-10-27'}],
    pilot_co_request_events:[{id:'co-request-event',request_id:'co-request-demo',actor_id:CLIENT,
      action:'requested',detail:'Fixture requested',created_at:'2026-10-27'}]
  });
  window.__pilotRpcCalls=[];
  function filtered(table,filters){
    var items=(data[table]||[]).filter(function(item){
      return filters.every(function(f){return f.values.includes(item[f.field]);});
    });
    if(table==='pilot_memberships'&&role!=='pm')items=items.filter(function(m){return m.user_id===id;});
    if(table==='pilot_co_requests'&&role!=='pm')items=items.filter(function(r){return r.requester_id===id;});
    if(table==='pilot_co_request_events'&&role!=='pm')items=items.filter(function(e){return e.request_id==='co-request-demo'&&role==='client';});
    if(role==='client'){
      if(['pilot_reports','pilot_credit_events','pilot_scope_terms','pilot_assignments',
        'pilot_co_sub_terms','pilot_co_reports','pilot_co_credit_events','pilot_co_audit_events'].includes(table)){
        window.__pilotLeaked=true;
        return [];
      }
    }
    if(role==='sub'&&table==='pilot_co_client_terms'){window.__pilotLeaked=true;return [];}
    if((role==='sub'||role==='client')&&table==='pilot_change_orders'){
      items=items.filter(function(c){return role==='client'?c.status!=='draft':c.status==='active';});
    }
    return items;
  }
  function client(){
    return {
      auth:{
        getUser:function(){return Promise.resolve({data:{user:{id:id,email:role+'-demo@example.test'}},error:null});},
        onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}};},
        signInWithOtp:function(){return Promise.resolve({data:{},error:null});},
        signOut:function(){return Promise.resolve({error:null});}
      },
      from:function(table){
        window.__pilotQueried.push(table);
        var filters=[];
        var state={insert:null};
        var b={
          select:function(){return b;},
          eq:function(field,val){filters.push({field:field,values:[val]});return b;},
          in:function(field,values){filters.push({field:field,values:values});return b;},
          insert:function(val){state.insert=val;window.__pilotWrites.push({table:table,data:val});return b;},
          single:function(){
            if(state.insert){
              data[table].push(state.insert);
              return Promise.resolve({data:{id:'generated-id',...state.insert},error:null});
            }
            return Promise.resolve({data:filtered(table,filters)[0]||null,error:null});
          },
          then:function(resolve,reject){
            return Promise.resolve({data:filtered(table,filters),error:null}).then(resolve,reject);
          }
        };
        return b;
      },
      rpc:function(name,payload){
        window.__pilotRpcCalls.push({name:name,payload:payload});
        if(name==='pilot_co_client_decide' && data.pilot_change_orders) {
          data.pilot_change_orders[0].status=payload.p_approve?'client_approved':'declined';
          return Promise.resolve({data:{status:data.pilot_change_orders[0].status,signature_verified:false,payment_authorized:false},error:null});
        }
        if(name==='pilot_co_activate' && data.pilot_change_orders) {
          data.pilot_change_orders[0].status='active';
          return Promise.resolve({data:{status:'active',contract_original_unchanged:true,payment_authorized:false},error:null});
        }
        return Promise.resolve({data:{status:'validated',new_credit_cents:0,payment_authorized:false},error:null});
      }
    };
  }
  window.supabase={createClient:client};
})();
