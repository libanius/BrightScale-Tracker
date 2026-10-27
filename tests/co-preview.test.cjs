'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Model=require('../co-preview.js');

test('demo always starts with synthetic unapproved draft and no payout',()=>{
 const s=Model.initial();
 assert.equal(s.status,'draft');
 assert.equal(s.creditCents,0);
 assert.equal(s.paymentAuthorized,false);
 assert.deepEqual(Model.allowed(s,'pm'),['submit']);
 assert.deepEqual(Model.allowed(s,'sub'),[]);
});

test('CO demo runs PM submit → client approve → PM activate → sub report → PM validate only',()=>{
 let s=Model.initial();
 s=Model.apply(s,'pm','submit');
 assert.equal(s.status,'submitted');
 assert.throws(()=>Model.apply(s,'pm','activate'),/not_permitted/);
 s=Model.apply(s,'client','approve');
 assert.equal(s.status,'client_approved');
 s=Model.apply(s,'pm','activate');
 assert.equal(s.status,'active');
 assert.deepEqual(Model.allowed(s,'sub'),['report']);
 s=Model.apply(s,'sub','report');
 assert.equal(s.creditCents,0,'reported progress cannot credit before PM validation');
 assert.equal(s.validatedPercent,0);
 s=Model.apply(s,'pm','validate');
 assert.equal(s.creditCents,24000,'fictitious $800 sub price × 60% weight × 50%');
 assert.equal(s.validatedPercent,50);
 assert.equal(s.paymentAuthorized,false);
 assert.equal(s.history.length,6);
 assert.deepEqual(Model.allowed(s,'pm'),[]);
});

test('client rejection ends simulated CO without activation or payment',()=>{
 let s=Model.apply(Model.initial(),'pm','submit');
 s=Model.apply(s,'client','decline');
 assert.equal(s.status,'declined');
 assert.deepEqual(Model.allowed(s,'pm'),[]);
 assert.throws(()=>Model.apply(s,'pm','activate'),/not_permitted/);
 assert.equal(s.paymentAuthorized,false);
});

test('role projections prevent client from receiving sub price or recognized credit',()=>{
 const s=Model.initial();
 const v=Model.view(s,'client');
 assert.ok(!('subcontractCents' in v));
 assert.ok(!('creditCents' in v));
 assert.ok(!('reportedPercent' in v));
 assert.equal(v.clientAmountCents,350000);
});

test('role projections prevent subcontractor from receiving customer price',()=>{
 let s=Model.initial();
 s=Model.apply(s,'pm','submit');
 s=Model.apply(s,'client','approve');
 s=Model.apply(s,'pm','activate');
 s=Model.apply(s,'sub','report');
 s=Model.apply(s,'pm','validate');
 const v=Model.view(s,'sub');
 assert.ok(!('clientAmountCents' in v));
 assert.equal(v.subcontractCents,80000);
 assert.equal(v.creditCents,24000);
 assert.deepEqual(v.actions,[]);
});

test('demo states and history are in memory, no mutation to original state',()=>{
 const original=Model.initial();
 const next=Model.apply(original,'pm','submit');
 assert.equal(original.status,'draft');
 assert.equal(original.history.length,1);
 assert.equal(next.history.length,2);
 const v=Model.view(next,'pm');
 v.history.push({actor:'client',action:'forged'});
 assert.equal(next.history.length,2);
 assert.equal(original.paymentAuthorized,false);
});

test('preview link available only on localhost and Cloudflare preview hosts',()=>{
 assert.equal(Model.pilotLink({hostname:'tracker.brightscalegroup.com',origin:'https://tracker.brightscalegroup.com',pathname:'/index.html'}),null);
 assert.equal(Model.pilotLink({hostname:'brightscalegroup.com',origin:'https://brightscalegroup.com',pathname:'/index.html'}),null);
 assert.equal(Model.pilotLink({hostname:'fake.pages.dev.evil.com',origin:'https://fake.pages.dev.evil.com',pathname:'/index.html'}),null);
 assert.equal(Model.pilotLink({hostname:'localhost',origin:'http://localhost:8000',pathname:'/index.html'}),'http://localhost:8000/staging/pilot.html');
 assert.equal(Model.pilotLink({hostname:'qa.example.pages.dev',origin:'https://qa.example.pages.dev',pathname:'/index.html'}),'https://qa.example.pages.dev/staging/pilot.html');
 assert.equal(Model.pilotLink({hostname:'test.workers.dev',origin:'https://test.workers.dev',pathname:'/index.html'}),'https://test.workers.dev/staging/pilot.html');
});

test('integration HTML does not import pilot database or call destructive operations',()=>{
 const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(index,/id:'changeOrders'/);
 assert.match(index,/renderChangeOrders\(main\)/);
 assert.match(index,/<script src="co-preview.js"><\/script>/);
 const match=index.match(/<script>\s*'use strict';([\s\S]*?)<\/script>\s*<\/body>/);
 assert.ok(match);
 assert.doesNotThrow(()=>new vm.Script("'use strict';"+match[1]));
 const segment=index.split('function renderChangeOrders(main) {')[1].split('CONTRACT / ESTIMATE IMPORT')[0];
 for(const dangerous of ['dbPut(','dbDel(','TrackerCloud.','supabase.','fetch(','localStorage.setItem','sessionStorage.setItem'])
  assert.equal(segment.includes(dangerous),false,'The isolated CO UI used '+dangerous);
 assert.match(segment,/SIMULAÇÃO LOCAL/);
 assert.match(segment,/window\.open\(pilotUrl/);
});


test('standalone CO demo has no legacy app bootstrap, storage, auth or cloud scripts',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../co-demo.html'),'utf8');
 assert.match(html,/Conheça o novo fluxo de COs/);
 assert.match(html,/AMBIENTE 100% FICTÍCIO/);
 const scriptImports=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(scriptImports,['./co-preview.js']);
 assert.doesNotMatch(html,/src="(?:tracker-cloud|staging\/pilot-ui|sw|supabase)/i);
 assert.doesNotMatch(html,/\b(?:indexedDB|localStorage|sessionStorage|caches)\s*\./i);
 assert.doesNotMatch(html,/\b(?:fetch|XMLHttpRequest)\s*\(/);
 assert.doesNotMatch(html,/navigator\.serviceWorker|window\.TrackerCloud/);
 const blocks=[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)]
   .map(match=>match[1]).filter(x=>x.trim());
 assert.equal(blocks.length,1);
 assert.doesNotThrow(()=>new vm.Script(blocks[0]));
});
