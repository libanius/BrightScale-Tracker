/* TEST-ONLY fake Supabase SDK. No network, no real credentials, no real login.
 * Replaces CDN SDK exclusively in isolated Chromium CI tests.
 */
(function(){
  'use strict';
  var PM='11111111-1111-4111-8111-111111111111';
  var SUB='22222222-2222-4222-8222-222222222222';
  var CLIENT='33333333-3333-4333-8333-333333333333';
  var project={id:'demo-project',owner_id:PM,name:'SYNTHETIC STAGING Flooring',baseline_version:1};
  var role=window.__pilotMockRole||'client';
  var id={pm:PM,sub:SUB,client:CLIENT}[role];
  window.__pilotQueried=[];
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
  function filtered(table,filters){
    var items=(data[table]||[]).filter(function(item){
      return filters.every(function(f){return f.values.includes(item[f.field]);});
    });
    if(table==='pilot_memberships'&&role!=='pm')items=items.filter(function(m){return m.user_id===id;});
    if(role==='client'){
      if(['pilot_reports','pilot_credit_events','pilot_scope_terms','pilot_assignments'].includes(table)){
        window.__pilotLeaked=true;
        return [];
      }
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
          insert:function(val){state.insert=val;return b;},
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
      rpc:function(){return Promise.resolve({data:{status:'validated',new_credit_cents:0,payment_authorized:false},error:null});}
    };
  }
  window.supabase={createClient:client};
})();
