/* BrightScale Tracker 2.0 — staging ONLY UI.
 * No access to production Tracker, no client-side role selector, no payments.
 * Project ownership, task visibility and approvals are enforced by Postgres RLS.
 */
(function(){
  'use strict';
  var main=document.getElementById('app');
  var message=document.getElementById('message');
  var STORAGE='brightscale-pilot-config';
  var s={client:null,api:null,user:null,projects:[],selectedId:null,snapshot:null,refreshId:0};
  var productionRefs=['hyvoatfozlpsevsbkxxm','wihfneccjwmtxzvivfzf']; // Both active projects are NOT staging
  function dom(tag,attrs){
    var n=document.createElement(tag);
    attrs=attrs||{};
    Object.keys(attrs).forEach(function(k){
      if(k==='text')n.textContent=String(attrs[k]);
      else if(k==='className')n.className=attrs[k];
      else if(k==='onClick')n.addEventListener('click',attrs[k]);
      else if(k==='onChange')n.addEventListener('change',attrs[k]);
      else if(k==='onSubmit')n.addEventListener('submit',attrs[k]);
      else n[k]=attrs[k];
    });
    for(var i=2;i<arguments.length;i++){
      var child=arguments[i];
      if(Array.isArray(child))child.forEach(function(c){if(c)n.appendChild(c);});
      else if(child)n.appendChild(child);
    }
    return n;
  }
  function card(){return dom('section',{className:'card'},Array.from(arguments));}
  function nodeText(t,kind){return dom(kind||'p',{text:t});}
  function small(t){return dom('p',{text:t,className:'muted'});}
  function title(t){return dom('h2',{text:t});}
  function row(){return dom('div',{className:'row'},Array.from(arguments));}
  function actions(){return dom('div',{className:'actions'},Array.from(arguments));}
  function button(label,fn,klass){
    var b=dom('button',{type:'button',text:label,className:klass||'secondary'});
    b.addEventListener('click',async function(){
      b.disabled=true;
      try{await fn();}catch(e){notify(e.message||e,true);}
      finally{b.disabled=false;}
    });
    return b;
  }
  function notify(txt,isError){
    message.textContent=String(txt||'');
    message.className=isError?'issue':'success';
  }
  function field(f){
    var lab=dom('label',{text:f.label});
    var inp=f.options?dom('select'):(f.multiline?dom('textarea'):dom('input',{type:f.type||'text'}));
    inp.name=f.key; inp.required=f.required!==false;
    if(f.placeholder)inp.placeholder=f.placeholder;
    if(f.min!==undefined)inp.min=f.min;
    if(f.max!==undefined)inp.max=f.max;
    if(f.step!==undefined)inp.step=f.step;
    if(f.value!==undefined)inp.value=f.value;
    if(f.options)(f.options).forEach(function(o){
      inp.appendChild(dom('option',{value:o.value,text:o.label}));
    });
    lab.appendChild(inp);return lab;
  }
  function form(heading,fields,send,label){
    var f=dom('form');
    f.appendChild(dom('h3',{text:heading}));
    fields.forEach(function(x){f.appendChild(field(x));});
    var submit=dom('button',{type:'submit',className:'primary',text:label||'Salvar'});
    f.appendChild(actions(submit));
    f.addEventListener('submit',async function(e){
      e.preventDefault();submit.disabled=true;
      try{
        var values=Object.fromEntries(new FormData(f).entries());
        await send(values);
        notify('Registro salvo no ambiente STAGING.',false);
        await refresh();
      }catch(err){notify(err.message||err,true);}
      finally{submit.disabled=false;}
    });
    return f;
  }
  function configOK(url,key){
    var parsed;
    try{parsed=new URL(url);}catch(e){throw Error('URL de projeto Supabase inválida');}
    if(parsed.protocol!=='https:'||!/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname)||parsed.pathname!=='/'||parsed.search||parsed.hash)
      throw Error('Informe a URL exata de um projeto Supabase STAGING https://...supabase.co');
    var ref=parsed.hostname.split('.')[0].toLowerCase();
    if(productionRefs.includes(ref))throw Error('Bloqueado: este é um projeto Supabase ativo de produção.');
    if(!key||key.length<30)throw Error('Informe a publishable/anon key do projeto STAGING; nunca service_role.');
    if(key.includes('service_role'))throw Error('Não use service_role ou secret keys no navegador.');
    return parsed.origin;
  }
  function getConfig(){try{return JSON.parse(localStorage.getItem(STORAGE)||'null');}catch(e){return null;}}
  function renderSetup(){
    main.replaceChildren(card(
      title('1 · Conectar ao Supabase STAGING'),
      small('Use exclusivamente um projeto Supabase novo, sem dados reais. URL e publishable key são públicas; não inserir service_role. A configuração fica armazenada somente neste navegador.'),
      form('Configuração do ambiente',[
        {key:'url',label:'URL Supabase STAGING',placeholder:'https://seu-staging.supabase.co',type:'url'},
        {key:'key',label:'Publishable / anon key do staging',placeholder:'sb_publishable_...'},
        {key:'confirm',label:'Digite STAGING para confirmar que o banco é novo e isolado',placeholder:'STAGING'}
      ],async function(v){
        if(v.confirm!=='STAGING')throw Error('Digite STAGING para confirmar o isolamento.');
        var url=configOK(v.url.trim(),v.key.trim());
        localStorage.setItem(STORAGE,JSON.stringify({url:url,key:v.key.trim()}));
        await connect();
      },'Conectar ao ambiente de testes')
    ));
  }
  // Fail closed on every non-preview host. A production deployment must
  // never serve a functional pilot login, even if this file is copied there.
  function approvedPreviewHost(){
    var host=String(location.hostname||'').toLowerCase();
    return host==='localhost'||host==='127.0.0.1'||
      (host.endsWith('.pages.dev')&&host.length>'.pages.dev'.length)||
      (host.endsWith('.workers.dev')&&host.length>'.workers.dev'.length);
  }
  async function connect(){
    if(!approvedPreviewHost()){
      s.client=null;s.api=null;s.user=null;
      main.replaceChildren(card(title('Portal de staging bloqueado nesta origem'),
        small('O piloto só funciona em localhost ou preview isolado do Cloudflare. Não conectamos Supabase, mesmo com dados de configuração armazenados.')));
      notify('STAGING BLOQUEADO — esta origem não é um ambiente de teste autorizado.',true);
      return;
    }
    var cfg=getConfig();
    if(!cfg){renderSetup();return;}
    try{
      configOK(cfg.url,cfg.key);
      if(!window.supabase||typeof window.supabase.createClient!=='function')throw Error('SDK Supabase não disponível; verifique conexão.');
      var client=window.supabase.createClient(cfg.url,cfg.key,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
      s.client=client;s.api=window.PilotGateway.create(client);
      client.auth.onAuthStateChange(function(_event,session){
        s.user=session?.user||null;
        Promise.resolve().then(function(){return refresh();}).catch(function(err){notify(err.message||err,true);});
      });
      var r=await client.auth.getUser();
      if(r.error && r.error.message && !/session missing/i.test(r.error.message))throw Error(r.error.message);
      s.user=r.data?.user||null;
      await refresh();
    }catch(err){
      s.client=null;s.api=null;s.user=null;
      localStorage.removeItem(STORAGE);
      renderSetup();notify(err.message||err,true);
    }
  }
  async function refresh(){
    var id=++s.refreshId;
    if(!s.client){renderSetup();return;}
    if(!s.user){renderLogin();return;}
    var projects=await s.api.listProjects();
    if(id!==s.refreshId)return;
    s.projects=projects;
    if(s.selectedId && !projects.some(function(p){return p.id===s.selectedId;}))s.selectedId=null;
    if(!s.selectedId && projects.length)s.selectedId=projects[0].id;
    s.snapshot=null;
    if(s.selectedId) s.snapshot=await s.api.snapshot(projects.find(function(p){return p.id===s.selectedId;}),s.user);
    if(id!==s.refreshId)return;
    renderWorkspace();
  }
  function renderLogin(){
    var cfg=getConfig();
    main.replaceChildren(card(
      title('2 · Entrar com e-mail de teste'),
      small('Ambiente: '+cfg.url+' — use somente contas fictícias criadas para o staging. O login será validado pelo Supabase Auth, não por botões de papéis.'),
      form('Receber link de login',[
        {key:'email',label:'E-mail de usuário de teste',type:'email',placeholder:'teste-pm@example.com'}
      ],async function(v){
        var r=await s.client.auth.signInWithOtp({
          email:v.email.trim(),
          options:{emailRedirectTo:location.origin+location.pathname}
        });
        if(r.error)throw Error(r.error.message||r.error);
        notify('Verifique o e-mail de teste e abra o link neste navegador.',false);
      },'Enviar link de login'),
      button('Trocar projeto de staging',function(){
        localStorage.removeItem(STORAGE);s.client=null;s.api=null;s.user=null;renderSetup();
      })
    ));
  }
  function taskCard(task,v,scope){
    var validation=v.validations.find(function(x){return x.task_id===task.id;});
    var validated=Number(validation?.validated_pct||0);
    var t=card(row(dom('h3',{text:task.title}),dom('strong',{text:validated+'%'})),
      small('Escopo: '+scope.name+' · peso '+task.weight_pct+'% · progresso VALIDADO'),
      dom('progress',{value:validated,max:100}));
    if(v.role==='client')return t;
    var myCredits=v.credits.filter(function(c){return c.task_id===task.id;})
      .reduce(function(sum,c){return sum+Number(c.delta_cents);},0);
    t.appendChild(small('Crédito reconhecido: '+window.PilotGateway.money(myCredits)+' (não é pagamento)'));
    if(v.role==='sub'){
      if(!v.project.baseline_frozen_at){
        t.appendChild(small('Aguardando aprovação da baseline original pelo PM. Ainda não é permitido informar progresso.'));
        return t;
      }
      var pending=v.reports.some(function(r){return r.task_id===task.id&&r.status==='pending';});
      if(pending)t.appendChild(dom('span',{text:'Relatório pendente de validação do PM',className:'pill wait'}));
      else t.appendChild(form('Informar progresso',[
        {key:'pct',label:'Percentual executado',type:'number',min:validated,max:100,step:'0.01',value:validated},
        {key:'note',label:'Observação (opcional)',multiline:true,required:false,placeholder:'Registro de obra'}
      ],async function(x){await s.api.report(task.id,x.pct,x.note);},'Enviar para validação'));
    }
    return t;
  }
  function renderPM(v,projectArea){
    projectArea.appendChild(title('Administração PM · dados fictícios'));
    if(!v.project.baseline_frozen_at){
      var complete=v.scopes.length>0 && v.scopes.every(function(scope){
        var w=v.tasks.filter(function(t){return t.scope_id===scope.id;})
          .reduce(function(sum,t){return sum+Number(t.weight_pct);},0);
        var term=v.terms.find(function(t){return t.scope_id===scope.id;});
        return Boolean(term)&&Math.abs(w-100)<0.001;
      });
      projectArea.appendChild(card(
        dom('h3',{text:'Aprovação da baseline original'}),
        small('Revise escopos, valores do subcontrato e pesos (100% por escopo). Após aprovação, o servidor impedirá novos escopos, tarefas e termos originais. Change Orders serão tratados separadamente.'),
        small(complete?'Todos os escopos têm termos e pesos de 100%.':'Complete valores e pesos de todos os escopos antes da aprovação.'),
        ...(complete?[button('Aprovar e congelar baseline',async function(){
          if(!window.confirm('Congelar baseline ORIGINAL? Escopos, pesos e termos não poderão ser modificados silenciosamente.'))return;
          var result=await s.api.freezeBaseline(v.project.id);
          if(result.status!=='frozen')throw Error('baseline_freeze_failed');
          notify('Baseline original congelada e auditada pelo PM.',false);
          await refresh();
        },'primary')]:[])
      ));
    }else{
      projectArea.appendChild(card(dom('h3',{text:'Baseline original congelada'}),
        small('Aprovada em '+v.project.baseline_frozen_at+'. Novos escopos e adicionais exigem um Change Order separado.')));
    }
    projectArea.appendChild(card(form('Adicionar membro de teste',[
      {key:'user',label:'UUID do usuário autenticado de teste',placeholder:'00000000-0000-4000-8000-000000000000'},
      {key:'role',label:'Permissão',options:[{value:'sub',label:'Subcontratado'},{value:'client',label:'Cliente'}]}
    ],function(x){return s.api.inviteTestMember(v.project.id,x.user,x.role);},'Adicionar membro')));
    if(!v.project.baseline_frozen_at)projectArea.appendChild(card(form('Criar escopo de teste',[
      {key:'name',label:'Nome do escopo',placeholder:'Flooring'},
      {key:'amount',label:'Subcontrato fictício em USD',type:'number',min:0,step:'0.01',value:'1200'}
    ],async function(x){
      var amount=Number(x.amount);
      if(!Number.isFinite(amount)||amount<0)throw Error('invalid_subcontract_amount');
      await s.api.createScope(v.project.id,x.name,Math.round(amount*100));
    },'Criar escopo e termos')));
    var subs=v.members.filter(function(m){return m.role==='sub';});
    for(const scope of v.scopes){
      var terms=v.terms.find(function(t){return t.scope_id===scope.id;});
      var assigned=v.assignments.find(function(a){return a.scope_id===scope.id;});
      var weight=v.tasks.filter(function(t){return t.scope_id===scope.id;}).reduce(function(n,t){return n+Number(t.weight_pct);},0);
      var scopePanel=card(dom('h3',{text:'Escopo: '+scope.name}),small(
        'Valor do sub: '+window.PilotGateway.money(terms?.subcontract_cents)+' · pesos: '+weight+'% de 100%'
      ));
      if(!assigned && subs.length)scopePanel.appendChild(form('Atribuir equipe de teste',[
        {key:'sub',label:'Sub contratado',options:subs.map(function(m){return {value:m.user_id,label:m.user_id};})}
      ],function(x){return s.api.assignSub(scope.id,x.sub);},'Atribuir sub (somente uma vez)'));
      else if(assigned)scopePanel.appendChild(small('Equipe atribuída (UUID): '+assigned.user_id));
      if(!v.project.baseline_frozen_at && weight<100)scopePanel.appendChild(form('Adicionar tarefa à baseline de teste',[
        {key:'title',label:'Tarefa',placeholder:'Install LVP'},
        {key:'weight',label:'Peso da tarefa (%)',type:'number',min:0.01,max:100-weight,step:'0.01',value:String(Math.min(100-weight,50))}
      ],function(x){return s.api.createTask(scope.id,x.title,x.weight);},'Adicionar tarefa'));
      projectArea.appendChild(scopePanel);
    }
    projectArea.appendChild(title('Relatórios aguardando validação'));
    var pending=v.reports.filter(function(r){return r.status==='pending';});
    if(!pending.length)projectArea.appendChild(card(small('Nenhum relatório pendente.')));
    for(const report of pending){
      var task=v.tasks.find(function(t){return t.id===report.task_id;});
      if(!task)continue;
      projectArea.appendChild(card(
        dom('h3',{text:task.title+' · reportado '+report.reported_pct+'%'}),
        small('Autor da informação: '+report.author_id+' · '+report.created_at),
        report.note?small('Observação: '+report.note):small('Sem observação.'),
        form('Decisão exclusiva do PM',[
          {key:'pct',label:'Percentual a validar',type:'number',min:0,max:100,step:'0.01',value:report.reported_pct},
          {key:'reason',label:'Justificativa (obrigatória ao reduzir/ajustar ou rejeitar)',multiline:true,required:false}
        ],function(x){return s.api.review(report.id,'approve',x.pct,x.reason);},'Validar e reconhecer crédito'),
        actions(button('Rejeitar relatório',async function(){
          // Browser-native prompt intentionally used to avoid accidental rejection without reason.
          var why=window.prompt('Justificativa obrigatória para rejeitar o relatório:');
          if(why===null)return;
          if(!why.trim())throw Error('Informe justificativa.');
          await s.api.review(report.id,'reject',null,why);
          notify('Relatório rejeitado, sem crédito reconhecido.',false);
          await refresh();
        },'danger'))
      ));
    }
  }
  function centsFromUsd(value){
    var n=Number(value);
    if(!Number.isFinite(n)||n<0||n>1000000000||
        Math.abs(Math.round(n*100)-n*100)>0.00001)
      throw Error('Informe valor positivo com até duas casas decimais.');
    return Math.round(n*100);
  }
  function changeOrderSection(v){
    var co=v.changeOrders||{orders:[],scopes:[],tasks:[],validations:[]};
    var root=dom('section');
    root.appendChild(title('Change Orders · contrato adicional separado'));
    root.appendChild(small('A baseline ORIGINAL e seus créditos continuam independentes. Aprovação no portal piloto não constitui assinatura eletrônica verificada. Nenhuma ação aqui executa pagamento.'));
    root.appendChild(card(form('Solicitar um Change Order (cliente, sub ou PM)',[
      {key:'title',label:'Assunto da solicitação',placeholder:'Pedido de alteração de escopo'},
      {key:'description',label:'Descrição do pedido',multiline:true,required:false,
        placeholder:'O que mudou, por que é necessário e fotos/evidências disponíveis'}
    ],function(x){return s.api.requestChangeOrder(v.project.id,x.title,x.description);},
    'Enviar solicitação ao PM')));
    var requests=co.requests||[];
    if(requests.length){
      root.appendChild(dom('h3',{text:'Solicitações de alteração'}));
      for(const req of requests){
        var rc=card(row(dom('strong',{text:req.title}),
            dom('span',{text:req.status,className:'pill'+(req.status==='pending'?' wait':'') })),
          small(req.description||'Sem detalhes.'),
          small('Solicitante: '+(req.requester_id===s.user.id?'você':req.requester_id)),
          req.status==='formalized'?small('PM abriu uma proposta separada. Ainda não significa aprovação do cliente.'):null,
          req.status==='declined'?small('Resposta do PM: '+(req.response_reason||'Sem justificativa')):null);
        if(v.role==='pm'&&req.status==='pending'&&v.project.baseline_frozen_at){
          rc.appendChild(actions(
            button('Transformar em CO rascunho',async function(){
              var amount=window.prompt('Preço proposto ao cliente (USD). Somente o PM define os termos:', '0.00');
              if(amount===null)return;
              await s.api.formalizeChangeOrderRequest(req.id,centsFromUsd(amount));
              await refresh();
            },'primary'),
            button('Recusar solicitação (registrar motivo)',async function(){
              var reason=window.prompt('Por que o pedido não será formalizado?');
              if(reason===null)return;
              await s.api.declineChangeOrderRequest(req.id,reason);
              await refresh();
            },'danger')
          ));
        }
        root.appendChild(rc);
      }
    }
    if(v.role==='pm'&&v.project.baseline_frozen_at){
      root.appendChild(card(form('Novo Change Order (rascunho PM)',[
        {key:'title',label:'Título do adicional',placeholder:'SYNTHETIC Banheiro'},
        {key:'description',label:'Descrição do escopo novo',multiline:true,required:false},
        {key:'clientAmount',label:'Preço do adicional ao cliente (USD)',type:'number',
          min:0,step:'0.01',value:'3500'}
      ],function(x){
        return s.api.createChangeOrder(v.project.id,x.title,x.description,
          centsFromUsd(x.clientAmount));
      },'Criar CO separado')));
    }
    if(!co.orders.length){
      root.appendChild(card(small('Nenhum Change Order visível para este perfil. Rascunhos são privados do PM.')));
      return root;
    }
    for(const order of co.orders){
      var price=(co.clientTerms||[]).find(function(x){return x.co_id===order.id;});
      var scopes=co.scopes.filter(function(x){return x.co_id===order.id;});
      var c=card(row(dom('h3',{text:order.title}),dom('span',
        {text:order.status,className:'pill'+(order.status==='draft'?' wait':'')})),
        small(order.description||'Sem descrição.'));
      if(price && v.role!=='sub')
        c.appendChild(small('Valor adicional para cliente: '+window.PilotGateway.money(price.client_amount_cents)));
      if(v.role==='pm'){
        var credit=(co.credits||[]).filter(function(x){return x.co_id===order.id;})
          .reduce(function(sum,x){return sum+Number(x.delta_cents);},0);
        c.appendChild(small('Crédito de sub reconhecido NESTE CO: '+
          window.PilotGateway.money(credit)+' · não é pagamento.'));
      }
      if(v.role==='client'){
        c.appendChild(small('Progresso exibido somente após validação do PM. Preços internos do sub não são compartilhados.'));
        if(order.status==='submitted') {
          c.appendChild(actions(
            button('Aprovar adicional (sem assinatura verificada)',async function(){
              if(!window.confirm('Confirmar aprovação do adicional de '+window.PilotGateway.money(price?.client_amount_cents)+'? Este piloto registra uma decisão no portal, não uma assinatura digital validada.'))return;
              await s.api.decideChangeOrder(order.id,true,'');
              await refresh();
            },'primary'),
            button('Solicitar correção / recusar',async function(){
              var reason=window.prompt('Motivo da recusa ou pedido de ajuste:');
              if(reason===null)return;
              if(!reason.trim())throw Error('Descreva o motivo.');
              await s.api.decideChangeOrder(order.id,false,reason);
              await refresh();
            },'danger')
          ));
        }
      }
      if(v.role==='pm'&&order.status==='draft'){
        var subMembers=(v.members||[]).filter(function(m){return m.role==='sub';});
        if(subMembers.length)c.appendChild(form('Adicionar escopo ao CO (sem afetar original)',[
          {key:'title',label:'Escopo adicional',placeholder:'SYNTHETIC Shower'},
          {key:'sub',label:'Subcontratado para o adicional',
            options:subMembers.map(function(x){return {value:x.user_id,label:x.user_id};})},
          {key:'subCents',label:'Valor do sub para este escopo (USD)',
            type:'number',step:'0.01',min:0,value:'800'}
        ],function(x){return s.api.addChangeOrderScope(order.id,x.title,x.sub,centsFromUsd(x.subCents));},
        'Adicionar escopo do CO'));
        else c.appendChild(small('Cadastre ao menos um sub de teste antes de adicionar escopo.'));
      }
      var allReady=scopes.length>0;
      for(const sc of scopes){
        var ts=co.tasks.filter(function(t){return t.scope_id===sc.id;});
        var totalWeight=ts.reduce(function(n,t){return n+Number(t.weight_pct);},0);
        if(Math.abs(totalWeight-100)>0.001)allReady=false;
        var terms=(co.subTerms||[]).find(function(x){return x.scope_id===sc.id;});
        var scPanel=dom('div',{className:'card'});
        scPanel.appendChild(dom('h3',{text:sc.title}));
        scPanel.appendChild(small('Pesos CO: '+totalWeight+'% de 100%.'));
        if(terms&&v.role!=='client')
          scPanel.appendChild(small('Valor do sub somente neste CO: '+
            window.PilotGateway.money(terms.subcontract_cents)));
        if(v.role==='pm'&&order.status==='draft'&&totalWeight<100){
          scPanel.appendChild(form('Adicionar tarefa ao Change Order',[
            {key:'title',label:'Tarefa adicional',placeholder:'Install shower tile'},
            {key:'weight',label:'Peso (%)',type:'number',step:'0.01',min:0.01,
              max:100-totalWeight,value:String(Math.min(100-totalWeight,50))}
          ],function(x){return s.api.addChangeOrderTask(sc.id,x.title,x.weight);},
          'Adicionar tarefa do CO'));
        }
        for(const task of ts){
          var validation=co.validations.find(function(x){return x.task_id===task.id;});
          var pct=Number(validation?.validated_pct||0);
          var t=card(row(dom('h3',{text:task.title}),dom('strong',{text:pct+'%'})),
            small('Peso: '+task.weight_pct+'% · progresso validado do ADICIONAL'),
            dom('progress',{value:pct,max:100}));
          if(v.role==='sub'){
            var credits=(co.credits||[]).filter(function(x){return x.task_id===task.id;})
              .reduce(function(n,x){return n+Number(x.delta_cents);},0);
            t.appendChild(small('Crédito reconhecido neste adicional: '+
              window.PilotGateway.money(credits)+' (não é pagamento).'));
            var pending=(co.reports||[]).some(function(x){return x.task_id===task.id&&x.status==='pending';});
            if(pending)t.appendChild(small('Relatório adicional pendente de validação PM.'));
            else if(order.status==='active')t.appendChild(form('Informar progresso do adicional',[
              {key:'pct',label:'Percentual executado (%)',type:'number',min:pct,max:100,step:'0.01',value:pct},
              {key:'note',label:'Observação (opcional)',multiline:true,required:false}
            ],function(x){return s.api.reportChangeOrder(task.id,x.pct,x.note);},'Enviar relatório do CO'));
          }
          if(v.role==='pm'){
            for(const report of (co.reports||[]).filter(function(x){
              return x.task_id===task.id&&x.status==='pending';
            })){
              t.appendChild(small('Informado '+report.reported_pct+'% pelo sub · '+(report.note||'Sem nota')));
              t.appendChild(form('PM valida progresso deste CO',[
                {key:'pct',label:'Percentual validado (%)',type:'number',min:pct,max:100,step:'0.01',value:report.reported_pct},
                {key:'reason',label:'Justificativa se diferente do relato',multiline:true,required:false}
              ],function(x){return s.api.reviewChangeOrderReport(report.id,'approve',x.pct,x.reason);},
              'Validar e reconhecer crédito deste CO'));
              t.appendChild(actions(button('Rejeitar relato do CO',async function(){
                var reason=window.prompt('Justificativa obrigatória:');
                if(reason===null)return;
                if(!reason.trim())throw Error('Informe justificativa.');
                await s.api.reviewChangeOrderReport(report.id,'reject',null,reason);
                await refresh();
              },'danger')));
            }
          }
          scPanel.appendChild(t);
        }
        c.appendChild(scPanel);
      }
      if(v.role==='pm'&&order.status==='draft'){
        c.appendChild(small(allReady?'Todos os escopos estão completos.':'Complete 100% de pesos em cada escopo antes de enviar ao cliente.'));
        if(allReady)c.appendChild(actions(button('Enviar CO para aprovação do cliente',async function(){
          if(!window.confirm('Enviar condições adicionais para decisão do cliente? O rascunho ficará bloqueado para edições.'))return;
          await s.api.submitChangeOrder(order.id);
          await refresh();
        },'primary')));
      }
      if(v.role==='pm'&&order.status==='client_approved'){
        c.appendChild(actions(button('Ativar CO aprovado (PM)',async function(){
          if(!window.confirm('Publicar ativação operacional do Change Order aprovado pelo cliente?'))return;
          await s.api.activateChangeOrder(order.id);
          await refresh();
        },'primary')));
      }
      if(v.role==='pm'&&order.status==='declined')
        c.appendChild(small('Recusado: '+(order.decision_reason||'Sem justificativa')+
          '. Crie novo rascunho se o escopo precisar ser renegociado.'));
      root.appendChild(c);
    }
    return root;
  }

  function renderWorkspace(){
    var cfg=getConfig();var who=s.user;var el=card(
      row(title('Sessão de testes autenticada'),button('Sair',async function(){
        var r=await s.client.auth.signOut();
        if(r.error)throw Error(r.error.message);
        s.user=null;s.selectedId=null;await refresh();
      })),
      small('E-mail de teste: '+(who.email||'')+' · UUID: '+who.id),
      small('Servidor STAGING: '+cfg.url)
    );
    var app=[el];
    if(!s.projects.length){
      el.appendChild(small('Nenhum projeto visível para este usuário. Entre como PM para criar um ou solicite ao PM inclusão por UUID.'));
    }else{
      var choose=dom('select',{name:'project'});
      s.projects.forEach(function(p){choose.appendChild(dom('option',{text:p.name,value:p.id}));});
      choose.value=s.selectedId;
      choose.addEventListener('change',async function(e){
        s.selectedId=e.target.value;
        try{await refresh();}catch(err){notify(err.message||err,true);}
      });
      app.push(card(dom('h3',{text:'Projeto de teste'}),choose));
    }
    if(!s.projects.length||s.projects.every(function(p){return p.owner_id===who.id;})){
      app.push(card(form('Novo projeto fictício (PM)',[
        {key:'name',label:'Nome do projeto de teste',placeholder:'SYNTHETIC Flooring Pilot'}
      ],async function(x){var p=await s.api.createProject(x.name);s.selectedId=p.id;},'Criar projeto de teste')));
    }
    if(s.snapshot){
      var v=s.snapshot;
      var panel=card(dom('div',{className:'eyebrow',text:v.role.toUpperCase()+' · BASELINE '+v.project.baseline_version}),title(v.project.name));
      panel.appendChild(dom('span',{text:v.project.baseline_frozen_at?'Baseline CONGELADA':'Baseline RASCUNHO',className:'pill '+(v.project.baseline_frozen_at?'':'wait')}));
      if(v.role==='client')panel.appendChild(small('Apenas progresso VALIDADO. Sem custos de subs, créditos ou relatórios pendentes.'));
      else if(v.role==='sub')panel.appendChild(small('Relatórios enviados precisam ser validados pelo PM. Crédito não é pagamento.'));
      else panel.appendChild(small('Você valida ou rejeita relatórios. O portal não executa pagamentos.'));
      app.push(panel);
      app.push(changeOrderSection(v));
      var taskSection=dom('section');
      taskSection.appendChild(title('Tarefas e progresso'));
      var list=dom('div',{className:'grid'});
      for(const task of v.tasks){
        var scope=v.scopes.find(function(x){return x.id===task.scope_id;});
        if(scope)list.appendChild(taskCard(task,v,scope));
      }
      if(!v.tasks.length)list.appendChild(card(small('Nenhuma tarefa atribuída e visível.')));
      taskSection.appendChild(list);app.push(taskSection);
      if(v.role==='pm'){
        var sum=v.credits.reduce(function(n,c){return n+Number(c.delta_cents);},0);
        app.push(card(title('Crédito reconhecido (nunca é pagamento)'),dom('strong',{text:window.PilotGateway.money(sum)})));
        var pm=dom('section');renderPM(v,pm);app.push(pm);
      }
    }
    main.replaceChildren(...app);
  }
  connect().catch(function(err){notify(err.message||err,true);});
})();
