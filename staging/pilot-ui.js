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
  async function connect(){
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
    projectArea.appendChild(card(form('Adicionar membro de teste',[
      {key:'user',label:'UUID do usuário autenticado de teste',placeholder:'00000000-0000-4000-8000-000000000000'},
      {key:'role',label:'Permissão',options:[{value:'sub',label:'Subcontratado'},{value:'client',label:'Cliente'}]}
    ],function(x){return s.api.inviteTestMember(v.project.id,x.user,x.role);},'Adicionar membro')));
    projectArea.appendChild(card(form('Criar escopo de teste',[
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
      if(weight<100)scopePanel.appendChild(form('Adicionar tarefa à baseline de teste',[
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
      if(v.role==='client')panel.appendChild(small('Apenas progresso VALIDADO. Sem custos de subs, créditos ou relatórios pendentes.'));
      else if(v.role==='sub')panel.appendChild(small('Relatórios enviados precisam ser validados pelo PM. Crédito não é pagamento.'));
      else panel.appendChild(small('Você valida ou rejeita relatórios. O portal não executa pagamentos.'));
      app.push(panel);
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
