/* BrightScale Tracker 2.0 — SAFE, IN-MEMORY Change Order walkthrough.
 * This file contains ONLY fictional numbers and no network, storage, auth or DB.
 * A role selector is a DEMO VIEW, not authentication or permission enforcement.
 * Real authorization, financial isolation and audit remain in PR #5 PostgreSQL RLS.
 */
(function(root,factory){
  'use strict';
  var model=factory();
  if(typeof module==='object' && module.exports)module.exports=model;
  else root.BrightScaleCODemo=model;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var ROLES=['pm','client','sub'];
  var AMOUNT_CLIENT=350000;
  var AMOUNT_SUB=80000;
  var DEMO_PROGRESS=50;
  var TASK_WEIGHT=60;
  function snapshotObject(state){
    return {
      status:state.status,
      reportedPercent:state.reportedPercent,
      validatedPercent:state.validatedPercent,
      creditCents:state.creditCents,
      paymentAuthorized:false,
      history:state.history.map(function(h){return {action:h.action,actor:h.actor};})
    };
  }
  function initial(){
    return {
      status:'draft',
      reportedPercent:null,
      validatedPercent:0,
      creditCents:0,
      paymentAuthorized:false,
      history:[{action:'created_draft',actor:'pm'}]
    };
  }
  function allowed(state,role){
    if(!state || !ROLES.includes(role))return [];
    var actions=[];
    if(state.status==='draft' && role==='pm')actions.push('submit');
    if(state.status==='submitted' && role==='client')actions.push('approve','decline');
    if(state.status==='client_approved' && role==='pm')actions.push('activate');
    if(state.status==='active' && state.reportedPercent===null && role==='sub')actions.push('report');
    if(state.status==='active' && state.reportedPercent!==null && state.validatedPercent===0 && role==='pm')actions.push('validate');
    return actions;
  }
  function apply(state,role,action){
    if(!allowed(state,role).includes(action))throw Error('demo_action_not_permitted');
    var next=snapshotObject(state);
    if(action==='submit') next.status='submitted';
    if(action==='approve') next.status='client_approved';
    if(action==='decline') next.status='declined';
    if(action==='activate') next.status='active';
    if(action==='report')next.reportedPercent=DEMO_PROGRESS;
    if(action==='validate'){
      next.validatedPercent=DEMO_PROGRESS;
      next.creditCents=Math.round(AMOUNT_SUB*TASK_WEIGHT/100*DEMO_PROGRESS/100);
    }
    next.history.push({action:action,actor:role});
    return next;
  }
  function view(state,role){
    if(!state || !ROLES.includes(role))throw Error('invalid_demo_role');
    var out={
      synthetic:true,
      title:'SYNTHETIC Bathroom Upgrade',
      scope:'SYNTHETIC Shower Tile',
      task:'SYNTHETIC Install Shower Tile',
      status:state.status,
      validatedPercent:state.validatedPercent,
      paymentAuthorized:false,
      history:state.history.map(function(h){return {actor:h.actor,action:h.action};}),
      actions:allowed(state,role)
    };
    if(role==='pm'){
      out.clientAmountCents=AMOUNT_CLIENT;
      out.subcontractCents=AMOUNT_SUB;
      out.creditCents=state.creditCents;
      out.reportedPercent=state.reportedPercent;
    }
    if(role==='client')out.clientAmountCents=AMOUNT_CLIENT;
    if(role==='sub'){
      out.subcontractCents=AMOUNT_SUB;
      out.creditCents=state.creditCents;
      out.reportedPercent=state.reportedPercent;
    }
    return out;
  }
  function previewHost(hostname){
    var h=String(hostname||'').toLowerCase();
    return h==='localhost'||h==='127.0.0.1'||
      (h.endsWith('.pages.dev') && h.length>'.pages.dev'.length)||
      (h.endsWith('.workers.dev') && h.length>'.workers.dev'.length);
  }
  function pilotLink(locationObject){
    if(!locationObject||!previewHost(locationObject.hostname))return null;
    var path=String(locationObject.pathname||'/');
    var root=path.slice(0,path.lastIndexOf('/')+1);
    if(root==='')root='/';
    return String(locationObject.origin)+root+'staging/pilot.html';
  }
  return Object.freeze({
    initial:initial,allowed:allowed,apply:apply,view:view,
    previewHost:previewHost,pilotLink:pilotLink
  });
});
