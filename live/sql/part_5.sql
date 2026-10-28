


create table tracker.live_workspace_details (
 project_id uuid primary key references tracker.live_projects(id),
 client_name text not null check(length(client_name) between 1 and 160),
 address text not null check(length(address) between 1 and 500),
 estimate_number text not null default '', start_date date, end_date date,
 check(end_date is null or start_date is null or end_date>=start_date)
);
create table tracker.live_workspace_client_terms (
 project_id uuid primary key references tracker.live_projects(id),
 amount_cents bigint not null check(amount_cents between 0 and 100000000000),
 payment_terms text not null default '' check(length(payment_terms)<=2000)
);
create table tracker.live_workspace_people (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null,
 name text not null check(length(name) between 1 and 160),
 contact text not null default '' check(length(contact)<=300),
 specialty text not null default '' check(length(specialty)<=160),
 user_id uuid, created_at timestamptz not null default now()
);
create table tracker.live_workspace_scope_config (
 scope_id uuid primary key references tracker.live_scopes(id),
 weight_pct numeric(5,2) not null check(weight_pct>0 and weight_pct<=100),
 person_id uuid references tracker.live_workspace_people(id),
 responsibilities text not null default '' check(length(responsibilities)<=2000),
 payment_terms text not null default '' check(length(payment_terms)<=2000)
);
create table tracker.live_workspace_task_config (
 task_id uuid primary key references tracker.live_tasks(id),
 criteria text not null check(length(criteria) between 1 and 2000),
 due_date date, depends_on uuid references tracker.live_tasks(id)
);
create table tracker.live_workspace_imports (
 project_id uuid primary key references tracker.live_projects(id),
 owner_id uuid not null, request_id uuid not null,
 approved_plan jsonb not null, created_at timestamptz not null default now(),
 unique(owner_id,request_id)
);
create table tracker.live_workspace_observations (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tracker.live_projects(id),
 task_id uuid not null references tracker.live_tasks(id), actor_id uuid not null,
 observed_pct numeric(5,2) not null check(observed_pct between 0 and 100),
 note text not null default '' check(length(note)<=1000), created_at timestamptz not null default now(),
 validated_at timestamptz
);
create table tracker.live_workspace_events (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tracker.live_projects(id),
 scope_id uuid references tracker.live_scopes(id), actor_id uuid not null,
 kind text not null check(kind in ('project_created','observation','inspection_validated','delivery','visit','inspection','delay','issue','decision','correction','restriction','milestone','payment_recorded')),
 body text not null check(length(body) between 1 and 2000),
 visibility text not null check(visibility in ('pm','client','sub')),
 corrects_id uuid references tracker.live_workspace_events(id),
 created_at timestamptz not null default now()
);
create table tracker.live_workspace_restrictions (
 event_id uuid primary key references tracker.live_workspace_events(id),
 actor_id uuid not null, reason text not null, created_at timestamptz not null default now()
);
create table tracker.live_workspace_documents (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tracker.live_projects(id),
 scope_id uuid references tracker.live_scopes(id), actor_id uuid not null,
 name text not null check(length(name) between 1 and 200),
 mime text not null check(mime in ('application/pdf','text/plain','image/jpeg','image/png','image/webp')),
 data_base64 text not null check(length(data_base64)<=7000000),
 sha256 text not null, visibility text not null check(visibility in ('pm','client','sub')),
 created_at timestamptz not null default now()
);
create table tracker.live_workspace_milestones (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tracker.live_projects(id),
 title text not null check(length(title) between 1 and 160),
 amount_cents bigint not null check(amount_cents between 0 and 100000000000),
 status text not null default 'pending' check(status in ('pending','ready_for_review','validated','signed','disputed','invoiced','paid')),
 is_deposit boolean not null default false, created_at timestamptz not null default now()
);
create table tracker.live_workspace_receipts (
 id uuid primary key default gen_random_uuid(), milestone_id uuid not null references tracker.live_workspace_milestones(id),
 actor_id uuid not null, action text not null, name text not null, reason text not null,
 snapshot jsonb not null, content_hash text not null, created_at timestamptz not null default now()
);
create table tracker.live_workspace_payments (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tracker.live_projects(id),
 actor_id uuid not null, kind text not null check(kind in ('client_receipt','sub_payment','expense')),
 scope_id uuid references tracker.live_scopes(id),
 amount_cents bigint not null check(amount_cents>0 and amount_cents<=100000000000),
 reference text not null check(length(reference) between 1 and 500), created_at timestamptz not null default now()
);


create function tracker_private.workspace_workspace_visible(p_project uuid,p_scope uuid,p_visibility text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (tracker_private.workspace_is_pm(p_project)
 or (p_visibility='client' and tracker_private.workspace_is_client(p_project))
 or (p_visibility='sub' and p_scope is not null and tracker_private.workspace_is_scope_sub(p_scope)))
$$;
create function tracker_private.workspace_workspace_event_visible(p_event uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from tracker.live_workspace_events e where e.id=p_event
 and (tracker_private.workspace_is_pm(e.project_id) or (
 tracker_private.workspace_workspace_visible(e.project_id,e.scope_id,e.visibility)
 and not exists(select 1 from tracker.live_workspace_restrictions r where r.event_id=e.id))))
$$;
revoke all on function tracker_private.workspace_workspace_visible(uuid,uuid,text),tracker_private.workspace_workspace_event_visible(uuid) from public,anon;
grant execute on function tracker_private.workspace_workspace_visible(uuid,uuid,text),tracker_private.workspace_workspace_event_visible(uuid) to authenticated;


do $$declare t text; begin
 foreach t in array array['details','client_terms','people','scope_config','task_config','imports','observations','events','restrictions','documents','milestones','receipts','payments'] loop
 execute format('alter table tracker.live_workspace_%I enable row level security',t);
 execute format('revoke all on tracker.live_workspace_%I from public,anon,authenticated',t);
 execute format('grant select on tracker.live_workspace_%I to authenticated',t);
 end loop;
end $$;
create policy workspace_details_read on tracker.live_workspace_details for select to authenticated using(tracker_private.workspace_is_pm(project_id) or tracker_private.workspace_is_member(project_id));
create policy workspace_client_terms_read on tracker.live_workspace_client_terms for select to authenticated using(tracker_private.workspace_is_pm(project_id) or tracker_private.workspace_is_client(project_id));
create policy workspace_people_read on tracker.live_workspace_people for select to authenticated using(owner_id=(select auth.uid()));

create policy workspace_scope_read on tracker.live_workspace_scope_config for select to authenticated using(exists(select 1 from tracker.live_scopes s where s.id=scope_id and (tracker_private.workspace_is_pm(s.project_id) or tracker_private.workspace_is_scope_sub(s.id))));
create policy workspace_task_read on tracker.live_workspace_task_config for select to authenticated using(tracker_private.workspace_can_read_task(task_id));
create policy workspace_import_read on tracker.live_workspace_imports for select to authenticated using(owner_id=(select auth.uid()));
create policy workspace_observation_read on tracker.live_workspace_observations for select to authenticated using(tracker_private.workspace_is_pm(project_id));
create policy workspace_event_read on tracker.live_workspace_events for select to authenticated using(tracker_private.workspace_workspace_event_visible(id));
create policy workspace_restriction_read on tracker.live_workspace_restrictions for select to authenticated using(exists(select 1 from tracker.live_workspace_events e where e.id=event_id and tracker_private.workspace_is_pm(e.project_id)));
create policy workspace_milestone_read on tracker.live_workspace_milestones for select to authenticated using(tracker_private.workspace_is_pm(project_id) or tracker_private.workspace_is_client(project_id));
create policy workspace_receipt_read on tracker.live_workspace_receipts for select to authenticated using(exists(select 1 from tracker.live_workspace_milestones m where m.id=milestone_id and (tracker_private.workspace_is_pm(m.project_id) or tracker_private.workspace_is_client(m.project_id))));
create policy workspace_payment_read on tracker.live_workspace_payments for select to authenticated using(tracker_private.workspace_is_pm(project_id) or (kind='sub_payment' and tracker_private.workspace_is_scope_sub(scope_id)));


create table tracker.live_workspace_weights (
 scope_id uuid primary key references tracker.live_scopes(id),
 weight_pct numeric(5,2) not null check(weight_pct>0 and weight_pct<=100)
);
alter table tracker.live_workspace_weights enable row level security;
revoke all on tracker.live_workspace_weights from public,anon,authenticated;
grant select on tracker.live_workspace_weights to authenticated;
create policy workspace_weights_read on tracker.live_workspace_weights for select to authenticated using(tracker_private.workspace_can_read_scope(scope_id));


create table tracker.live_workspace_gates (
 scope_id uuid primary key references tracker.live_scopes(id),
 actor_id uuid not null, reason text not null check(length(reason) between 1 and 1000),
 legal_confirmed boolean not null check(legal_confirmed),
 safety_confirmed boolean not null check(safety_confirmed),
 readiness_confirmed boolean not null check(readiness_confirmed),
 created_at timestamptz not null default now()
);
create table tracker.live_workspace_closures (
 project_id uuid primary key references tracker.live_projects(id),
 actor_id uuid not null, reason text not null, created_at timestamptz not null default now()
);
alter table tracker.live_workspace_details add column closed_at timestamptz;
alter table tracker.live_workspace_milestones add column settlement_payment_id uuid unique references tracker.live_workspace_payments(id);
alter table tracker.live_workspace_gates enable row level security;
alter table tracker.live_workspace_closures enable row level security;
revoke all on tracker.live_workspace_gates,tracker.live_workspace_closures from public,anon,authenticated;
grant select on tracker.live_workspace_gates,tracker.live_workspace_closures to authenticated;
create policy workspace_gate_read on tracker.live_workspace_gates for select to authenticated using(exists(select 1 from tracker.live_scopes s where s.id=scope_id and (tracker_private.workspace_is_pm(s.project_id) or tracker_private.workspace_is_scope_sub(s.id))));
create policy workspace_closure_read on tracker.live_workspace_closures for select to authenticated using(tracker_private.workspace_is_pm(project_id));
create function tracker_private.workspace_workspace_task_ready(p_task uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from tracker.live_tasks t join tracker.live_scopes s on s.id=t.scope_id
 where t.id=p_task and (
 not exists(select 1 from tracker.live_workspace_details d where d.project_id=s.project_id)
 or (exists(select 1 from tracker.live_workspace_gates g where g.scope_id=t.scope_id)
 and not exists(select 1 from tracker.live_workspace_details d where d.project_id=s.project_id and d.closed_at is not null)
 and not exists(select 1 from tracker.live_workspace_task_config c where c.task_id=p_task and c.depends_on is not null
 and coalesce((select v.validated_pct from tracker.live_validations v where v.task_id=c.depends_on),0)<100))))
$$;
revoke all on function tracker_private.workspace_workspace_task_ready(uuid) from public,anon;
grant execute on function tracker_private.workspace_workspace_task_ready(uuid) to authenticated;
create function tracker_private.workspace_workspace_report_gate()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not tracker_private.workspace_workspace_task_ready(new.task_id) then raise exception 'phase_gate_or_dependency_pending'; end if;
 return new;
end $$;
revoke all on function tracker_private.workspace_workspace_report_gate() from public,anon,authenticated;
create trigger workspace_report_gate before insert on tracker.live_reports for each row execute function tracker_private.workspace_workspace_report_gate();


create table tracker.live_workspace_signatures (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tracker.live_projects(id),
 subject text not null check(subject in ('milestone','change_order')), subject_id uuid not null,
 actor_id uuid not null, signer_name text not null check(length(signer_name) between 1 and 160),
 consent_text text not null, snapshot jsonb not null, content_hash text not null,
 created_at timestamptz not null default now(), unique(subject,subject_id)
);
create table tracker.live_workspace_email_outbox (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tracker.live_projects(id),
 signature_id uuid not null unique references tracker.live_workspace_signatures(id),
 recipient text not null, status text not null default 'pending' check(status in ('pending','sent','failed')),
 sent_at timestamptz, provider_id text, created_at timestamptz not null default now()
);
alter table tracker.live_workspace_signatures enable row level security;
alter table tracker.live_workspace_email_outbox enable row level security;
revoke all on tracker.live_workspace_signatures,tracker.live_workspace_email_outbox from public,anon,authenticated;
grant select on tracker.live_workspace_signatures to authenticated;
grant select(id,project_id,signature_id,status,sent_at,created_at) on tracker.live_workspace_email_outbox to authenticated;
create policy workspace_signature_read on tracker.live_workspace_signatures for select to authenticated using(tracker_private.workspace_is_pm(project_id) or (actor_id=(select auth.uid()) and tracker_private.workspace_is_client(project_id)));
create policy workspace_outbox_read on tracker.live_workspace_email_outbox for select to authenticated using(tracker_private.workspace_is_pm(project_id) or exists(select 1 from tracker.live_workspace_signatures s where s.id=signature_id and s.actor_id=(select auth.uid()) and tracker_private.workspace_is_client(project_id)));
do $$begin
 if exists(select 1 from pg_roles where rolname='service_role') then
 grant select,update on tracker.live_workspace_email_outbox to service_role;
 grant select on tracker.live_workspace_signatures to service_role;
 end if;
end $$;
create function tracker_private.workspace_workspace_sign(p_project uuid,p_subject text,p_subject_id uuid,p_name text,p_snapshot jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid(); signature uuid; email_address text;
begin
 if a is null or not tracker_private.workspace_is_client(p_project) then raise exception 'client_required'; end if;
 -- Verified account address is resolved server-side, never accepted from browser.
 select email into email_address from auth.users where id=a and email_confirmed_at is not null;
 if email_address is null then raise exception 'verified_email_required'; end if;
 insert into tracker.live_workspace_signatures(project_id,subject,subject_id,actor_id,signer_name,consent_text,snapshot,content_hash)
 values(p_project,p_subject,p_subject_id,a,btrim(p_name),'I reviewed this exact version and agree to sign electronically.',p_snapshot,encode(sha256(convert_to(p_snapshot::text,'UTF8')),'hex')) returning id into signature;
 insert into tracker.live_workspace_email_outbox(project_id,signature_id,recipient) values(p_project,signature,email_address);
 return signature;
end $$;
revoke all on function tracker_private.workspace_workspace_sign(uuid,text,uuid,text,jsonb) from public,anon,authenticated;


create table tracker.live_workspace_document_restrictions (
 document_id uuid primary key references tracker.live_workspace_documents(id), actor_id uuid not null,
 reason text not null check(length(reason) between 1 and 1000), created_at timestamptz not null default now()
);
alter table tracker.live_workspace_document_restrictions enable row level security;
revoke all on tracker.live_workspace_document_restrictions from public,anon,authenticated;
grant select on tracker.live_workspace_document_restrictions to authenticated;
create policy workspace_document_restriction_read on tracker.live_workspace_document_restrictions for select to authenticated using(exists(select 1 from tracker.live_workspace_documents d where d.id=document_id and tracker_private.workspace_is_pm(d.project_id)));
create function tracker_private.workspace_workspace_document_visible(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from tracker.live_workspace_documents d where d.id=p_id and
 (tracker_private.workspace_is_pm(d.project_id) or (tracker_private.workspace_workspace_visible(d.project_id,d.scope_id,d.visibility)
 and not exists(select 1 from tracker.live_workspace_document_restrictions r where r.document_id=d.id))))
$$;
revoke all on function tracker_private.workspace_workspace_document_visible(uuid) from public,anon;
grant execute on function tracker_private.workspace_workspace_document_visible(uuid) to authenticated;
create policy workspace_document_read on tracker.live_workspace_documents for select to authenticated using(tracker_private.workspace_workspace_document_visible(id));


create function tracker_private.workspace_workspace_command(p_project uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 a uuid:=auth.uid(); pid uuid:=p_project; sid uuid; tid uuid; eid uuid; person uuid; sub_id uuid;
 item jsonb; task jsonb; obs tracker.live_workspace_observations%rowtype;
 m tracker.live_workspace_milestones%rowtype; pct numeric; old_pct numeric;
 snap jsonb; total numeric; req uuid; prior uuid; visibility text; bytes bytea; task_ids uuid[]; dependency uuid; payment_id uuid;
begin
 if a is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'invalid_payload'; end if;
 if p_action in ('person','create') and not tracker_private.workspace_is_workspace_admin() then raise exception 'pm_required'; end if;
 if p_action='person' then
  insert into tracker.live_workspace_people(owner_id,name,contact,specialty,user_id)
  values(a,btrim(p_data->>'name'),coalesce(p_data->>'contact',''),coalesce(p_data->>'specialty',''),nullif(p_data->>'user_id','')::uuid) returning id into eid;
  return jsonb_build_object('id',eid);
 end if;
 if p_action='create' then
  if pid is not null then raise exception 'new_project_only'; end if;
  req:=(p_data->>'request_id')::uuid;
  if req is null then raise exception 'request_id_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(a::text||req::text,10));
  select project_id into prior from tracker.live_workspace_imports where owner_id=a and request_id=req;
  if found then return jsonb_build_object('project_id',prior,'replayed',true); end if;
  if coalesce(p_data->>'reviewed','false')<>'true' then raise exception 'pm_review_required'; end if;
  if coalesce(jsonb_typeof(p_data->'scopes'),'null')<>'array' or jsonb_array_length(p_data->'scopes')=0 then raise exception 'scopes_required'; end if;
  select sum((x->>'weight_pct')::numeric) into total from jsonb_array_elements(p_data->'scopes') x;
  if total is distinct from 100 then raise exception 'scope_weights_must_total_100'; end if;
  insert into tracker.live_projects(name,owner_id) values(btrim(p_data->>'name'),a) returning id into pid;
  insert into tracker.live_workspace_details(project_id,client_name,address,estimate_number,start_date,end_date) values(pid,p_data->>'client_name',p_data->>'address',coalesce(p_data->>'estimate_number',''),nullif(p_data->>'start_date','')::date,nullif(p_data->>'end_date','')::date);
  insert into tracker.live_workspace_client_terms values(pid,(p_data->>'amount_cents')::bigint,coalesce(p_data->>'payment_terms',''));
  sub_id:=nullif(p_data->>'client_user_id','')::uuid;
  if sub_id is not null then
   if sub_id=a then raise exception 'client_cannot_be_owner'; end if;
   insert into tracker.live_memberships(project_id,user_id,role) values(pid,sub_id,'client');
  end if;
  for item in select * from jsonb_array_elements(p_data->'scopes') loop
   task_ids:=array[]::uuid[];
   person:=nullif(item->>'person_id','')::uuid; sub_id:=null;
   if person is not null then
    select user_id into sub_id from tracker.live_workspace_people where id=person and owner_id=a;
    if not found then raise exception 'person_not_owned'; end if;
    if sub_id=a or sub_id=nullif(p_data->>'client_user_id','')::uuid then raise exception 'incompatible_role'; end if;
   end if;
   insert into tracker.live_scopes(project_id,name) values(pid,item->>'name') returning id into sid;
   insert into tracker.live_scope_terms(scope_id,subcontract_cents) values(sid,(item->>'subcontract_cents')::bigint);
   insert into tracker.live_workspace_scope_config values(sid,(item->>'weight_pct')::numeric,person,coalesce(item->>'responsibilities',''),coalesce(item->>'payment_terms',''));
   insert into tracker.live_workspace_weights values(sid,(item->>'weight_pct')::numeric);
   if sub_id is not null then
    insert into tracker.live_memberships(project_id,user_id,role) values(pid,sub_id,'sub') on conflict do nothing;
    insert into tracker.live_assignments(scope_id,user_id) values(sid,sub_id);
   end if;
   if coalesce(jsonb_typeof(item->'tasks'),'null')<>'array' then raise exception 'tasks_required'; end if;
   select sum((x->>'weight_pct')::numeric) into total from jsonb_array_elements(item->'tasks') x;
   if total is distinct from 100 then raise exception 'task_weights_must_total_100'; end if;
   for task in select * from jsonb_array_elements(item->'tasks') loop
    insert into tracker.live_tasks(scope_id,title,weight_pct) values(sid,task->>'title',(task->>'weight_pct')::numeric) returning id into tid;
    dependency:=null;
    if coalesce((task->>'depends_on_index')::integer,-1)>=0 then
     dependency:=task_ids[(task->>'depends_on_index')::integer+1];
     if dependency is null then raise exception 'dependency_must_be_previous_task'; end if;
    end if;
    insert into tracker.live_workspace_task_config(task_id,criteria,due_date,depends_on) values(tid,task->>'criteria',nullif(task->>'due_date','')::date,dependency);
    task_ids:=array_append(task_ids,tid);
   end loop;
  end loop;
  for item in select * from jsonb_array_elements(coalesce(p_data->'milestones','[]'::jsonb)) loop
   insert into tracker.live_workspace_milestones(project_id,title,amount_cents,is_deposit)
   values(pid,item->>'title',(item->>'amount_cents')::bigint,coalesce((item->>'is_deposit')::boolean,false));
  end loop;
  select coalesce(sum(amount_cents),0) into total from tracker.live_workspace_milestones where project_id=pid;
  if total>(p_data->>'amount_cents')::bigint then raise exception 'milestones_exceed_contract'; end if;
  insert into tracker.live_workspace_imports values(pid,a,req,p_data,now());
  insert into tracker.live_workspace_events(project_id,actor_id,kind,body,visibility) values(pid,a,'project_created','Plano revisado pelo PM; baseline em rascunho.','pm');
  return jsonb_build_object('project_id',pid);
 end if;
 if pid is null or not (tracker_private.workspace_is_pm(pid) or tracker_private.workspace_is_member(pid)) then raise exception 'project_access_denied' using errcode='42501'; end if;
 -- Serialize all workspace operations on a project, including freeze/corrections.
 perform 1 from tracker.live_projects where id=pid for update;
 if exists(select 1 from tracker.live_workspace_details where project_id=pid and closed_at is not null) and p_action not in ('restrict','restrict_document') then raise exception 'project_closed'; end if;
 if p_action='sign_co' then
  if not tracker_private.workspace_is_client(pid) then raise exception 'client_required'; end if;
  if coalesce(p_data->>'name','')='' or coalesce(p_data->>'consent','false')<>'true' then raise exception 'name_and_consent_required'; end if;
  select jsonb_build_object('change_order',to_jsonb(c),'client_amount_cents',ct.client_amount_cents,'scopes',coalesce((select jsonb_agg(jsonb_build_object('title',s.title,'tasks',(select jsonb_agg(jsonb_build_object('title',t.title,'weight_pct',t.weight_pct) order by t.id) from tracker.live_co_tasks t where t.scope_id=s.id)) order by s.id) from tracker.live_co_scopes s where s.co_id=c.id),'[]'::jsonb)) into snap
  from tracker.live_change_orders c join tracker.live_co_client_terms ct on ct.co_id=c.id
  where c.id=(p_data->>'id')::uuid and c.project_id=pid and c.status='submitted' for update of c;
  if not found then raise exception 'change_order_not_submitted'; end if;
  eid:=tracker_private.workspace_workspace_sign(pid,'change_order',(p_data->>'id')::uuid,p_data->>'name',snap);
  perform tracker.live_co_client_decide((p_data->>'id')::uuid,true,'Electronic consent recorded with immutable snapshot');
  return jsonb_build_object('signature_id',eid,'email_status','pending','payment_authorized',false);
 end if;
 if p_action='milestone_decision' then
  if not tracker_private.workspace_is_client(pid) then raise exception 'client_required' using errcode='42501'; end if;
  select * into m from tracker.live_workspace_milestones where id=(p_data->>'id')::uuid and project_id=pid for update;
  if not found or m.status<>'validated' then raise exception 'milestone_not_ready'; end if;
  if coalesce(p_data->>'name','')='' or coalesce(p_data->>'consent','false')<>'true' then raise exception 'name_and_consent_required'; end if;
  if p_data->>'decision' not in ('signed','disputed') then raise exception 'invalid_decision'; end if;
  if p_data->>'decision'='disputed' and coalesce(p_data->>'reason','')='' then raise exception 'reason_required'; end if;
  snap:=to_jsonb(m);
  if p_data->>'decision'='signed' then perform tracker_private.workspace_workspace_sign(pid,'milestone',m.id,p_data->>'name',snap); end if;
  insert into tracker.live_workspace_receipts(milestone_id,actor_id,action,name,reason,snapshot,content_hash)
  values(m.id,a,p_data->>'decision',left(p_data->>'name',160),left(coalesce(p_data->>'reason',''),2000),snap,encode(sha256(convert_to(snap::text,'UTF8')),'hex'));
  update tracker.live_workspace_milestones set status=p_data->>'decision' where id=m.id;
  insert into tracker.live_workspace_events(project_id,actor_id,kind,body,visibility) values(pid,a,'milestone',m.title||': '||(p_data->>'decision'),'client');
  return jsonb_build_object('status',p_data->>'decision','email_sent',false);
 end if;
 if p_action='document' then
  visibility:=coalesce(p_data->>'visibility','pm'); sid:=nullif(p_data->>'scope_id','')::uuid;
  if sid is not null and not exists(select 1 from tracker.live_scopes where id=sid and project_id=pid) then raise exception 'scope_project_mismatch'; end if;
  if not tracker_private.workspace_is_pm(pid) and not (tracker_private.workspace_is_scope_sub(sid) and visibility='sub') then raise exception 'document_access_denied' using errcode='42501'; end if;
  bytes:=decode(p_data->>'data_base64','base64');
  if octet_length(bytes)>5000000 or octet_length(bytes)=0 then raise exception 'file_size_limit_5mb'; end if;
  insert into tracker.live_workspace_documents(project_id,scope_id,actor_id,name,mime,data_base64,sha256,visibility)
  values(pid,sid,a,p_data->>'name',p_data->>'mime',p_data->>'data_base64',encode(sha256(bytes),'hex'),visibility) returning id into eid;
  return jsonb_build_object('id',eid);
 end if;
 if not tracker_private.workspace_is_pm(pid) then raise exception 'pm_required' using errcode='42501'; end if;
 if p_action='release_scope' then
  sid:=(p_data->>'scope_id')::uuid;
  if not exists(select 1 from tracker.live_scopes s join tracker.live_projects p on p.id=s.project_id where s.id=sid and s.project_id=pid and p.baseline_frozen_at is not null) then raise exception 'approved_baseline_required'; end if;
  if coalesce(p_data->>'legal_confirmed','false')<>'true' or coalesce(p_data->>'safety_confirmed','false')<>'true' or coalesce(p_data->>'readiness_confirmed','false')<>'true' then raise exception 'legal_safety_readiness_required'; end if;
  insert into tracker.live_workspace_gates(scope_id,actor_id,reason,legal_confirmed,safety_confirmed,readiness_confirmed) values(sid,a,p_data->>'reason',true,true,true);
 elsif p_action='close' then
  if coalesce(p_data->>'reason','')='' then raise exception 'close_reason_required'; end if;
  if not exists(select 1 from tracker.live_projects where id=pid and baseline_frozen_at is not null) then raise exception 'approved_baseline_required'; end if;
  if exists(select 1 from tracker.live_tasks t join tracker.live_scopes s on s.id=t.scope_id left join tracker.live_validations v on v.task_id=t.id where s.project_id=pid and coalesce(v.validated_pct,0)<100) then raise exception 'unfinished_work'; end if;
  if exists(select 1 from tracker.live_workspace_milestones where project_id=pid and status<>'paid') then raise exception 'unsettled_milestones'; end if;
  if exists(select 1 from tracker.live_reports r join tracker.live_tasks t on t.id=r.task_id join tracker.live_scopes s on s.id=t.scope_id where s.project_id=pid and r.status='pending') then raise exception 'pending_field_reports'; end if;
  if exists(select 1 from tracker.live_change_orders where project_id=pid and status not in ('declined','active')) then raise exception 'review_change_orders_before_closure'; end if;
  if exists(select 1 from tracker.live_co_tasks t join tracker.live_co_scopes s on s.id=t.scope_id join tracker.live_change_orders c on c.id=s.co_id left join tracker.live_co_validations v on v.task_id=t.id where c.project_id=pid and c.status='active' and coalesce(v.validated_pct,0)<100) then raise exception 'unfinished_change_order_work'; end if;
  if exists(select 1 from tracker.live_co_requests where project_id=pid and status='pending') then raise exception 'pending_change_requests'; end if;
  insert into tracker.live_workspace_closures(project_id,actor_id,reason) values(pid,a,left(p_data->>'reason',2000));
  update tracker.live_workspace_details set closed_at=now() where project_id=pid;
 elsif p_action='observe' then
  tid:=(p_data->>'task_id')::uuid; pct:=(p_data->>'percent')::numeric;
  if not exists(select 1 from tracker.live_tasks t join tracker.live_scopes s on s.id=t.scope_id where t.id=tid and s.project_id=pid) then raise exception 'task_project_mismatch'; end if;
  if not exists(select 1 from tracker.live_projects where id=pid and baseline_frozen_at is not null) then raise exception 'baseline_not_frozen'; end if;
  insert into tracker.live_workspace_observations(project_id,task_id,actor_id,observed_pct,note) values(pid,tid,a,pct,coalesce(p_data->>'note','')) returning id into eid;
  insert into tracker.live_workspace_events(project_id,actor_id,kind,body,visibility) values(pid,a,'observation','Vistoria registrada: '||pct||'%','pm');
 elsif p_action='validate_observation' then
  select * into obs from tracker.live_workspace_observations where id=(p_data->>'id')::uuid and project_id=pid for update;
  if not found or obs.validated_at is not null then raise exception 'observation_not_pending'; end if;
  if not tracker_private.workspace_workspace_task_ready(obs.task_id) then raise exception 'phase_gate_or_dependency_pending'; end if;
  if coalesce(p_data->>'criteria_confirmed','false')<>'true' or coalesce(p_data->>'reason','')='' then raise exception 'criteria_and_reason_required'; end if;
  select scope_id into sid from tracker.live_tasks where id=obs.task_id;
  perform pg_advisory_xact_lock(hashtextextended(sid::text,2));
  select validated_pct into old_pct from tracker.live_validations where task_id=obs.task_id for update;
  if obs.observed_pct<coalesce(old_pct,0) then raise exception 'decreasing_progress_requires_correction_review'; end if;
  insert into tracker.live_validations(task_id,validated_pct,reviewed_by) values(obs.task_id,obs.observed_pct,a)
  on conflict(task_id) do update set validated_pct=excluded.validated_pct,reviewed_by=a,updated_at=now();
  update tracker.live_workspace_observations set validated_at=now() where id=obs.id;
  insert into tracker.live_workspace_events(project_id,scope_id,actor_id,kind,body,visibility)
  values(pid,sid,a,'inspection_validated','Vistoria validada: '||obs.observed_pct||'%. '||left(p_data->>'reason',1800),'client');
  -- NO credit or payment is created by a field observation/validation.
 elsif p_action='event' then
  sid:=nullif(p_data->>'scope_id','')::uuid;
  if sid is not null and not exists(select 1 from tracker.live_scopes where id=sid and project_id=pid) then raise exception 'scope_project_mismatch'; end if;
  prior:=nullif(p_data->>'corrects_id','')::uuid;
  if prior is not null and not exists(select 1 from tracker.live_workspace_events where id=prior and project_id=pid) then raise exception 'correction_project_mismatch'; end if;
  if p_data->>'kind' not in ('delivery','visit','inspection','delay','issue','decision','correction') then raise exception 'invalid_event_kind'; end if;
  if p_data->>'kind'='correction' and prior is null then raise exception 'correction_reference_required'; end if;
  insert into tracker.live_workspace_events(project_id,scope_id,actor_id,kind,body,visibility,corrects_id)
  values(pid,sid,a,p_data->>'kind',p_data->>'body',p_data->>'visibility',prior) returning id into eid;
 elsif p_action='restrict_document' then
  prior:=(p_data->>'id')::uuid;
  if not exists(select 1 from tracker.live_workspace_documents where id=prior and project_id=pid) then raise exception 'document_project_mismatch'; end if;
  insert into tracker.live_workspace_document_restrictions(document_id,actor_id,reason) values(prior,a,p_data->>'reason');
  insert into tracker.live_workspace_events(project_id,actor_id,kind,body,visibility) values(pid,a,'restriction','Visualização de documento restringida pelo PM.','pm');
 elsif p_action='restrict' then
  prior:=(p_data->>'id')::uuid;
  if coalesce(p_data->>'reason','')='' then raise exception 'reason_required'; end if;
  if not exists(select 1 from tracker.live_workspace_events where id=prior and project_id=pid) then raise exception 'event_project_mismatch'; end if;
  insert into tracker.live_workspace_restrictions(event_id,actor_id,reason) values(prior,a,left(p_data->>'reason',1000));
  insert into tracker.live_workspace_events(project_id,actor_id,kind,body,visibility,corrects_id) values(pid,a,'restriction','Acesso restringido pelo PM.','pm',prior);
 elsif p_action='milestone' then
  select * into m from tracker.live_workspace_milestones where id=(p_data->>'id')::uuid and project_id=pid for update;
  if not found then raise exception 'milestone_not_found'; end if;
  if not ((m.status='pending' and p_data->>'status'='ready_for_review') or
   (m.status='ready_for_review' and p_data->>'status'='validated') or
   (m.status='signed' and p_data->>'status'='invoiced') or
   (m.is_deposit and m.status='pending' and p_data->>'status'='invoiced') or
   (m.status='invoiced' and p_data->>'status'='paid')) then raise exception 'invalid_milestone_transition'; end if;
  if coalesce(p_data->>'reason','')='' then raise exception 'reason_required'; end if;
  if p_data->>'status'='paid' then
   select p.id into payment_id from tracker.live_workspace_payments p where p.project_id=pid and p.kind='client_receipt' and p.reference=p_data->>'reason' and p.amount_cents=m.amount_cents
    and not exists(select 1 from tracker.live_workspace_milestones other where other.settlement_payment_id=p.id) limit 1 for update;
   if payment_id is null then raise exception 'record_matching_receipt_first'; end if;
  end if;
  snap:=to_jsonb(m);
  insert into tracker.live_workspace_receipts(milestone_id,actor_id,action,name,reason,snapshot,content_hash) values(m.id,a,p_data->>'status','PM',left(p_data->>'reason',2000),snap,encode(sha256(convert_to(snap::text,'UTF8')),'hex'));
  update tracker.live_workspace_milestones set status=p_data->>'status',settlement_payment_id=coalesce(payment_id,settlement_payment_id) where id=m.id;
 elsif p_action='payment' then
  sid:=nullif(p_data->>'scope_id','')::uuid;
  if sid is not null and not exists(select 1 from tracker.live_scopes where id=sid and project_id=pid) then raise exception 'scope_project_mismatch'; end if;
  if p_data->>'kind'='sub_payment' and sid is null then raise exception 'scope_required'; end if;
  insert into tracker.live_workspace_payments(project_id,actor_id,kind,scope_id,amount_cents,reference) values(pid,a,p_data->>'kind',sid,(p_data->>'amount_cents')::bigint,p_data->>'reference') returning id into eid;
  insert into tracker.live_workspace_events(project_id,actor_id,kind,body,visibility) values(pid,a,'payment_recorded','Registro financeiro manual; nenhuma transferência executada.','pm');
 else raise exception 'unknown_workspace_action';
 end if;
 return jsonb_build_object('id',eid,'saved',true,'payment_authorized',false);
end $$;
revoke all on function tracker_private.workspace_workspace_command(uuid,text,jsonb) from public,anon;
grant execute on function tracker_private.workspace_workspace_command(uuid,text,jsonb) to authenticated;
create function tracker.live_workspace_command(p_project uuid,p_action text,p_data jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select tracker_private.workspace_workspace_command(p_project,p_action,p_data) $$;
revoke all on function tracker.live_workspace_command(uuid,text,jsonb) from public,anon;
grant execute on function tracker.live_workspace_command(uuid,text,jsonb) to authenticated;
create unique index workspace_payment_reference on tracker.live_workspace_payments(project_id,kind,reference);
create index workspace_events_project on tracker.live_workspace_events(project_id,created_at);
create index workspace_documents_project on tracker.live_workspace_documents(project_id);
create index workspace_observations_task on tracker.live_workspace_observations(task_id);
create function tracker_private.workspace_workspace_validation_gate()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not tracker_private.workspace_workspace_task_ready(new.task_id) then raise exception 'phase_gate_or_dependency_pending'; end if;
 return new;
end $$;
revoke all on function tracker_private.workspace_workspace_validation_gate() from public,anon,authenticated;
create trigger workspace_validation_gate before insert or update on tracker.live_validations for each row execute function tracker_private.workspace_workspace_validation_gate();
create function tracker_private.workspace_workspace_closed_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from tracker.live_workspace_details where project_id=new.project_id and closed_at is not null) then raise exception 'project_closed'; end if;
 if TG_TABLE_NAME='live_change_orders' and new.status='active' and exists(select 1 from tracker.live_workspace_details where project_id=new.project_id) and not exists(select 1 from tracker.live_workspace_signatures where subject='change_order' and subject_id=new.id) then raise exception 'signed_change_order_required'; end if;
 return new;
end $$;
revoke all on function tracker_private.workspace_workspace_closed_guard() from public,anon,authenticated;
create trigger workspace_closed_co before insert or update on tracker.live_change_orders for each row execute function tracker_private.workspace_workspace_closed_guard();
create trigger workspace_closed_request before insert or update on tracker.live_co_requests for each row execute function tracker_private.workspace_workspace_closed_guard();
create function tracker_private.workspace_workspace_closed_co_task_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from tracker.live_co_tasks t join tracker.live_co_scopes s on s.id=t.scope_id join tracker.live_change_orders c on c.id=s.co_id join tracker.live_workspace_details d on d.project_id=c.project_id where t.id=new.task_id and d.closed_at is not null) then raise exception 'project_closed'; end if;
 return new;
end $$;
revoke all on function tracker_private.workspace_workspace_closed_co_task_guard() from public,anon,authenticated;
create trigger workspace_closed_co_report before insert on tracker.live_co_reports for each row execute function tracker_private.workspace_workspace_closed_co_task_guard();
create trigger workspace_closed_co_validation before insert or update on tracker.live_co_validations for each row execute function tracker_private.workspace_workspace_closed_co_task_guard();
