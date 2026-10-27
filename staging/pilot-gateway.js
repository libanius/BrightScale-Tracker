/* BrightScale Tracker 2.0 — authenticated STAGING pilot API.
 * Requires a separate, empty Supabase project with 001_progress_rls.sql applied.
 * Authorization ALWAYS comes from PostgreSQL RLS, never the role shown in UI.
 * Intentionally does not support any payment / contract / existing Tracker data.
 */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.PilotGateway=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function check(result){
    if(!result) throw Error('no_server_response');
    if(result.error) throw Error(result.error.message||String(result.error));
    return result.data;
  }
  function money(cents){
    return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents||0)/100);
  }
  function percent(p){
    if(p===''||p===null||p===undefined||!Number.isFinite(Number(p))||Number(p)<0||Number(p)>100){
      throw Error('percent_must_be_0_to_100');
    }
    return Number(p);
  }
  function uuid(value){
    if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))throw Error('invalid_user_uuid');
    return value;
  }

  function create(supabase){
    if(!supabase||typeof supabase.from!=='function'||typeof supabase.rpc!=='function')throw Error('invalid_supabase_client');
    async function list(table,columns,field,ids){
      if(Array.isArray(ids)&&!ids.length) return [];
      var query=supabase.from(table).select(columns);
      if(Array.isArray(ids))query=query.in(field,ids);
      else if(field!==undefined)query=query.eq(field,ids);
      return check(await query)||[];
    }
    async function insert(table,payload){
      return check(await supabase.from(table).insert(payload).select('*').single());
    }
    async function allProjects(){
      return list('pilot_projects','id,name,owner_id,baseline_version,baseline_frozen_at,baseline_frozen_by,created_at');
    }
    async function snapshot(project,user){
      if(!project||!user||!user.id)throw Error('authentication_required');
      var role=project.owner_id===user.id?'pm':null;
      if(!role){
        var own=await list('pilot_memberships','user_id,role,project_id','project_id',project.id);
        role=own.find(function(m){return m.user_id===user.id;})?.role||null;
      }
      if(!['pm','sub','client'].includes(role))throw Error('not_a_project_member');
      var scopes=await list('pilot_scopes','id,project_id,name','project_id',project.id);
      var scopeIds=scopes.map(function(s){return s.id;});
      var tasks=await list('pilot_tasks','id,scope_id,title,weight_pct', 'scope_id',scopeIds);
      var taskIds=tasks.map(function(t){return t.id;});
      var validations=await list('pilot_validations','task_id,validated_pct,updated_at','task_id',taskIds);
      var result={role:role,project:project,scopes:scopes,tasks:tasks,validations:validations};
      if(role==='client')return result; // DO NOT EVEN QUERY financial tables or pending reports
      result.reports=await list('pilot_reports','id,task_id,author_id,reported_pct,note,status,created_at,reviewed_at,review_reason','task_id',taskIds);
      result.credits=await list('pilot_credit_events','id,task_id,sub_id,delta_cents,validated_pct,created_at','task_id',taskIds);
      result.terms=await list('pilot_scope_terms','scope_id,subcontract_cents','scope_id',scopeIds);
      result.assignments=await list('pilot_assignments','scope_id,user_id','scope_id',scopeIds);
      if(role==='pm')result.members=await list('pilot_memberships','project_id,user_id,role','project_id',project.id);
      return result;
    }
    return {
      listProjects:allProjects,
      snapshot:snapshot,
      freezeBaseline:async function(projectId){
        if(!projectId)throw Error('project_id_required');
        return check(await supabase.rpc('pilot_freeze_baseline',{p_project_id:projectId}));
      },
      createProject:function(name){
        name=String(name||'').trim();
        if(name.length<1||name.length>120)throw Error('project_name_length');
        return insert('pilot_projects',{name:name});
      },
      inviteTestMember:function(projectId,userId,role){
        if(!['client','sub'].includes(role))throw Error('invalid_member_role');
        return insert('pilot_memberships',{project_id:projectId,user_id:uuid(userId),role:role});
      },
      createScope:function(projectId,name,amountCents){
        name=String(name||'').trim();
        if(!name||name.length>120)throw Error('invalid_scope_name');
        if(!Number.isSafeInteger(amountCents)||amountCents<0)throw Error('invalid_scope_cents');
        return insert('pilot_scopes',{project_id:projectId,name:name}).then(async function(scope){
          // No automatic rollback across requests: report partially configured scope clearly.
          try {
            await insert('pilot_scope_terms',{scope_id:scope.id,subcontract_cents:amountCents});
          }catch(e){throw Error('scope_created_but_terms_failed: '+e.message);}
          return scope;
        });
      },
      createTask:function(scopeId,title,weightPct){
        title=String(title||'').trim();
        if(!title||title.length>160)throw Error('invalid_task_name');
        var weight=percent(weightPct);
        if(weight<=0)throw Error('weight_must_be_positive');
        return insert('pilot_tasks',{scope_id:scopeId,title:title,weight_pct:weight});
      },
      assignSub:function(scopeId,subId){
        return insert('pilot_assignments',{scope_id:scopeId,user_id:uuid(subId)});
      },
      report:function(taskId,p,note){
        note=String(note||'').trim();
        if(note.length>300)throw Error('note_too_long');
        return insert('pilot_reports',{task_id:taskId,reported_pct:percent(p),note:note});
      },
      review:async function(reportId,action,p,reason){
        if(!['approve','reject'].includes(action))throw Error('invalid_review_action');
        var parameters={
          p_report_id:reportId,p_action:action,
          p_approved_pct:action==='approve'?percent(p):null,
          p_reason:String(reason||'').trim()
        };
        return check(await supabase.rpc('pilot_review_report',parameters));
      }
    };
  }
  return {create:create,uuid:uuid,percent:percent,money:money};
});
