-- BrightScale Tracker 2.0, incremental isolated pilot Change Orders.
-- PRECONDITIONS: 001_progress_rls.sql then 002_baseline_freeze.sql
-- RUN ONLY in disposable PG test environment / brand new EMPTY Supabase STAGING.
-- Never apply on BrightScale production, any shared schema, or another app.
-- No legally binding e-signature, payment, or production contract mutation.
begin;

create table public.pilot_change_orders (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  project_id uuid not null references public.pilot_projects(id),
  title text not null check(length(title) between 1 and 120),
  description text not null default '' check(length(description)<=500),
  status text not null default 'draft'
    check(status in ('draft','submitted','client_approved','declined','active')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid,
  decision_reason text,
  activated_at timestamptz,
  activated_by uuid
);
create table public.pilot_co_client_terms (
  co_id uuid primary key references public.pilot_change_orders(id),
  client_amount_cents bigint not null check(client_amount_cents >= 0 and client_amount_cents <= 100000000000)
);
create table public.pilot_co_scopes (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  co_id uuid not null references public.pilot_change_orders(id),
  title text not null check(length(title) between 1 and 120),
  created_at timestamptz not null default now()
);
create table public.pilot_co_sub_terms (
  scope_id uuid primary key references public.pilot_co_scopes(id),
  sub_id uuid not null,
  subcontract_cents bigint not null check(subcontract_cents >= 0 and subcontract_cents <= 100000000000)
);
create table public.pilot_co_tasks (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  scope_id uuid not null references public.pilot_co_scopes(id),
  title text not null check(length(title) between 1 and 160),
  weight_pct numeric(5,2) not null check(weight_pct>0 and weight_pct<=100)
);
create table public.pilot_co_reports (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  task_id uuid not null references public.pilot_co_tasks(id),
  author_id uuid not null default auth.uid(),
  reported_pct numeric(5,2) not null check(reported_pct>=0 and reported_pct<=100),
  note text not null default '' check(length(note)<=300),
  status text not null default 'pending' check(status in ('pending','validated','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text check(length(review_reason)<=300)
);
create unique index pilot_co_one_pending_per_task on public.pilot_co_reports(task_id) where status='pending';
create table public.pilot_co_validations (
  task_id uuid primary key references public.pilot_co_tasks(id),
  validated_pct numeric(5,2) not null check(validated_pct>=0 and validated_pct<=100),
  reviewed_by uuid not null,
  updated_at timestamptz not null default now()
);
create table public.pilot_co_credit_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  report_id uuid not null unique references public.pilot_co_reports(id),
  task_id uuid not null references public.pilot_co_tasks(id),
  scope_id uuid not null references public.pilot_co_scopes(id),
  co_id uuid not null references public.pilot_change_orders(id),
  sub_id uuid not null,
  delta_cents bigint not null check(delta_cents>=0),
  validated_pct numeric(5,2) not null,
  created_at timestamptz not null default now()
);
create table public.pilot_co_audit_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  co_id uuid not null references public.pilot_change_orders(id),
  actor_id uuid not null,
  action text not null check(action in (
    'created','scope_added','task_added','submitted','client_approved',
    'declined','activated','reported','validated','rejected')),
  task_id uuid references public.pilot_co_tasks(id),
  report_id uuid references public.pilot_co_reports(id),
  detail text,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER helpers are internal to the unexposed pilot_priv schema,
-- and authorize from the live authenticated JWT subject and membership tables.
create function pilot_priv.co_is_pm(p_co uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.pilot_change_orders c
   join public.pilot_projects p on p.id=c.project_id
   where c.id=p_co and p.owner_id=(select auth.uid()))
$$;
create function pilot_priv.co_is_client(p_co uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.pilot_change_orders c
   join public.pilot_memberships m on m.project_id=c.project_id
   where c.id=p_co and c.status in ('submitted','client_approved','declined','active')
     and m.role='client' and m.user_id=(select auth.uid()))
$$;
create function pilot_priv.co_is_sub_scope(p_scope uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.pilot_co_scopes s
   join public.pilot_change_orders c on c.id=s.co_id
   join public.pilot_co_sub_terms st on st.scope_id=s.id
   join public.pilot_memberships m on m.project_id=c.project_id
   where s.id=p_scope and c.status='active'
     and m.role='sub' and m.user_id=(select auth.uid())
     and st.sub_id=m.user_id)
$$;
create function pilot_priv.co_can_read_scope(p_scope uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.pilot_co_scopes s where s.id=p_scope
   and (pilot_priv.co_is_pm(s.co_id) or pilot_priv.co_is_client(s.co_id)
        or pilot_priv.co_is_sub_scope(s.id)))
$$;
create function pilot_priv.co_is_pm_task(p_task uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.pilot_co_tasks t
   join public.pilot_co_scopes s on s.id=t.scope_id
   where t.id=p_task and pilot_priv.co_is_pm(s.co_id))
$$;
create function pilot_priv.co_is_sub_task(p_task uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.pilot_co_tasks t where t.id=p_task
   and pilot_priv.co_is_sub_scope(t.scope_id))
$$;
create function pilot_priv.co_can_read_task(p_task uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.pilot_co_tasks t where t.id=p_task
   and pilot_priv.co_can_read_scope(t.scope_id))
$$;
revoke all on function pilot_priv.co_is_pm(uuid),pilot_priv.co_is_client(uuid),
  pilot_priv.co_is_sub_scope(uuid),pilot_priv.co_can_read_scope(uuid),
  pilot_priv.co_is_pm_task(uuid),pilot_priv.co_is_sub_task(uuid),
  pilot_priv.co_can_read_task(uuid) from public,anon;
grant execute on function pilot_priv.co_is_pm(uuid),pilot_priv.co_is_client(uuid),
  pilot_priv.co_is_sub_scope(uuid),pilot_priv.co_can_read_scope(uuid),
  pilot_priv.co_is_pm_task(uuid),pilot_priv.co_is_sub_task(uuid),
  pilot_priv.co_can_read_task(uuid) to authenticated;

revoke all on public.pilot_change_orders,public.pilot_co_client_terms,
 public.pilot_co_scopes,public.pilot_co_sub_terms,public.pilot_co_tasks,
 public.pilot_co_reports,public.pilot_co_validations,public.pilot_co_credit_events,
 public.pilot_co_audit_events from public,anon,authenticated;
grant select on public.pilot_change_orders,public.pilot_co_client_terms,
 public.pilot_co_scopes,public.pilot_co_sub_terms,public.pilot_co_tasks,
 public.pilot_co_reports,public.pilot_co_validations,public.pilot_co_credit_events,
 public.pilot_co_audit_events to authenticated;
grant insert(id,task_id,reported_pct,note) on public.pilot_co_reports to authenticated;

alter table public.pilot_change_orders enable row level security;
alter table public.pilot_co_client_terms enable row level security;
alter table public.pilot_co_scopes enable row level security;
alter table public.pilot_co_sub_terms enable row level security;
alter table public.pilot_co_tasks enable row level security;
alter table public.pilot_co_reports enable row level security;
alter table public.pilot_co_validations enable row level security;
alter table public.pilot_co_credit_events enable row level security;
alter table public.pilot_co_audit_events enable row level security;

create policy pilot_co_read on public.pilot_change_orders for select to authenticated
 using (pilot_priv.co_is_pm(id) or pilot_priv.co_is_client(id)
   or (status='active' and exists(
     select 1 from public.pilot_co_scopes s where s.co_id=id
       and pilot_priv.co_is_sub_scope(s.id))));
create policy pilot_co_client_terms_read on public.pilot_co_client_terms for select to authenticated
 using (pilot_priv.co_is_pm(co_id) or pilot_priv.co_is_client(co_id));
create policy pilot_co_scopes_read on public.pilot_co_scopes for select to authenticated
 using (pilot_priv.co_is_pm(co_id) or pilot_priv.co_is_client(co_id)
   or pilot_priv.co_is_sub_scope(id));
create policy pilot_co_sub_terms_read on public.pilot_co_sub_terms for select to authenticated
 using (pilot_priv.co_is_sub_scope(scope_id)
   or exists(select 1 from public.pilot_co_scopes s where s.id=scope_id
      and pilot_priv.co_is_pm(s.co_id)));
create policy pilot_co_tasks_read on public.pilot_co_tasks for select to authenticated
 using (pilot_priv.co_can_read_scope(scope_id));
create policy pilot_co_reports_read on public.pilot_co_reports for select to authenticated
 using ((author_id=(select auth.uid()) and pilot_priv.co_is_sub_task(task_id))
   or pilot_priv.co_is_pm_task(task_id));
create policy pilot_co_validations_read on public.pilot_co_validations for select to authenticated
 using (pilot_priv.co_can_read_task(task_id));
create policy pilot_co_credits_read on public.pilot_co_credit_events for select to authenticated
 using ((sub_id=(select auth.uid()) and pilot_priv.co_is_sub_scope(scope_id))
   or pilot_priv.co_is_pm(co_id));
create policy pilot_co_audit_read on public.pilot_co_audit_events for select to authenticated
 using (pilot_priv.co_is_pm(co_id));
create policy pilot_co_report_insert on public.pilot_co_reports for insert to authenticated
 with check (author_id=(select auth.uid()) and status='pending'
   and reviewed_at is null and reviewed_by is null and review_reason is null
   and pilot_priv.co_is_sub_task(task_id)
   and reported_pct >= coalesce(
     (select v.validated_pct from public.pilot_co_validations v where v.task_id=pilot_co_reports.task_id),0));

-- No client-facing table has any direct UPDATE/DELETE privileges.
-- The next four RPCs handle the entire formal CO state machine server-side.
create function public.pilot_co_create_draft(
 p_project_id uuid, p_title text, p_description text, p_client_cents bigint
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_co uuid;
begin
 if v_actor is null or not pilot_priv.is_pm(p_project_id) then
   raise exception 'pm_required' using errcode='42501'; end if;
 if not exists(select 1 from public.pilot_projects p
     where p.id=p_project_id and p.baseline_frozen_at is not null)
   then raise exception 'original_baseline_must_be_frozen'; end if;
 if p_title is null or length(pg_catalog.btrim(p_title)) not between 1 and 120
     or p_description is null or length(p_description)>500
     or p_client_cents is null or p_client_cents<0 or p_client_cents>100000000000
   then raise exception 'invalid_change_order_terms'; end if;
 insert into public.pilot_change_orders(project_id,title,description,created_by)
   values(p_project_id,pg_catalog.btrim(p_title),p_description,v_actor) returning id into v_co;
 insert into public.pilot_co_client_terms(co_id,client_amount_cents)
   values(v_co,p_client_cents);
 insert into public.pilot_co_audit_events(co_id,actor_id,action,detail)
   values(v_co,v_actor,'created','PM created independent draft; no client approval');
 return pg_catalog.jsonb_build_object('co_id',v_co,'status','draft','payment_authorized',false);
end;
$$;

create function public.pilot_co_add_scope(
 p_co_id uuid,p_title text,p_sub_id uuid,p_sub_cents bigint
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_co public.pilot_change_orders%rowtype;v_scope uuid;
begin
 select * into v_co from public.pilot_change_orders where id=p_co_id for update;
 if not found then raise exception 'change_order_not_found'; end if;
 if v_actor is null or not pilot_priv.co_is_pm(p_co_id) then
   raise exception 'pm_required' using errcode='42501'; end if;
 if v_co.status<>'draft' then raise exception 'change_order_locked'; end if;
 if p_title is null or length(pg_catalog.btrim(p_title)) not between 1 and 120
    or p_sub_cents is null or p_sub_cents<0 or p_sub_cents>100000000000
    or not exists(select 1 from public.pilot_memberships m
      where m.project_id=v_co.project_id and m.user_id=p_sub_id and m.role='sub')
   then raise exception 'invalid_scope_or_subcontract'; end if;
 insert into public.pilot_co_scopes(co_id,title)
   values(p_co_id,pg_catalog.btrim(p_title)) returning id into v_scope;
 insert into public.pilot_co_sub_terms(scope_id,sub_id,subcontract_cents)
   values(v_scope,p_sub_id,p_sub_cents);
 insert into public.pilot_co_audit_events(co_id,actor_id,action,detail)
   values(p_co_id,v_actor,'scope_added','PM added separately priced subcontract scope');
 return pg_catalog.jsonb_build_object('scope_id',v_scope,'status','draft');
end;
$$;

create function public.pilot_co_add_task(
 p_scope_id uuid,p_title text,p_weight_pct numeric
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_co public.pilot_change_orders%rowtype;
        v_task uuid; v_total numeric;
begin
 select c.* into v_co from public.pilot_change_orders c
   join public.pilot_co_scopes s on s.co_id=c.id
   where s.id=p_scope_id for update of c;
 if not found then raise exception 'change_order_scope_not_found'; end if;
 if v_actor is null or not pilot_priv.co_is_pm(v_co.id) then
   raise exception 'pm_required' using errcode='42501'; end if;
 if v_co.status<>'draft' then raise exception 'change_order_locked'; end if;
 if p_title is null or length(pg_catalog.btrim(p_title)) not between 1 and 160
   or p_weight_pct is null or p_weight_pct<=0 or p_weight_pct>100
   or p_weight_pct <> round(p_weight_pct,2)
   then raise exception 'invalid_co_task'; end if;
 select coalesce(sum(weight_pct),0) into v_total
   from public.pilot_co_tasks where scope_id=p_scope_id;
 if v_total+p_weight_pct>100 then raise exception 'co_scope_weight_exceeds_100'; end if;
 insert into public.pilot_co_tasks(scope_id,title,weight_pct)
   values(p_scope_id,pg_catalog.btrim(p_title),p_weight_pct) returning id into v_task;
 insert into public.pilot_co_audit_events(co_id,actor_id,action,detail)
   values(v_co.id,v_actor,'task_added','PM added weighted CO task');
 return pg_catalog.jsonb_build_object('task_id',v_task,'weight_pct',p_weight_pct);
end;
$$;

create function public.pilot_co_submit(p_co_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_co public.pilot_change_orders%rowtype;
        v_count integer;v_incomplete integer;
begin
 select * into v_co from public.pilot_change_orders where id=p_co_id for update;
 if not found then raise exception 'change_order_not_found'; end if;
 if v_actor is null or not pilot_priv.co_is_pm(p_co_id) then
   raise exception 'pm_required' using errcode='42501'; end if;
 if v_co.status<>'draft' then raise exception 'change_order_locked'; end if;
 select count(*) into v_count from public.pilot_co_scopes where co_id=p_co_id;
 if v_count=0 then raise exception 'co_requires_scope'; end if;
 select count(*) into v_incomplete from public.pilot_co_scopes s
   left join public.pilot_co_sub_terms st on st.scope_id=s.id
   where s.co_id=p_co_id and (st.scope_id is null
      or coalesce((select sum(t.weight_pct)
          from public.pilot_co_tasks t where t.scope_id=s.id),0)<>100);
 if v_incomplete<>0 then raise exception 'co_incomplete_weights_or_terms'; end if;
 update public.pilot_change_orders set status='submitted',submitted_at=now() where id=p_co_id;
 insert into public.pilot_co_audit_events(co_id,actor_id,action,detail)
   values(p_co_id,v_actor,'submitted','PM submitted immutable draft for client approval');
 return pg_catalog.jsonb_build_object('co_id',p_co_id,'status','submitted',
   'client_approved',false,'payment_authorized',false);
end;
$$;

create function public.pilot_co_client_decide(
 p_co_id uuid,p_approve boolean,p_reason text default ''
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_co public.pilot_change_orders%rowtype;
        v_reason text:=pg_catalog.btrim(coalesce(p_reason,''));
begin
 select * into v_co from public.pilot_change_orders where id=p_co_id for update;
 if not found then raise exception 'change_order_not_found'; end if;
 if v_actor is null or not exists(select 1 from public.pilot_memberships m
   where m.project_id=v_co.project_id and m.role='client' and m.user_id=v_actor)
   then raise exception 'client_required' using errcode='42501'; end if;
 if v_co.status<>'submitted' then raise exception 'change_order_not_submitted'; end if;
 if p_approve is null or length(v_reason)>300 or (not p_approve and v_reason='')
   then raise exception 'invalid_client_decision'; end if;
 update public.pilot_change_orders
   set status=case when p_approve then 'client_approved' else 'declined' end,
       decided_at=now(),decided_by=v_actor,decision_reason=nullif(v_reason,'')
   where id=p_co_id;
 insert into public.pilot_co_audit_events(co_id,actor_id,action,detail)
   values(p_co_id,v_actor,case when p_approve then 'client_approved' else 'declined' end,
     'Client portal approval event; not a verified electronic signature');
 return pg_catalog.jsonb_build_object('co_id',p_co_id,
    'status',case when p_approve then 'client_approved' else 'declined' end,
    'signature_verified',false,'payment_authorized',false);
end;
$$;

create function public.pilot_co_activate(p_co_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_co public.pilot_change_orders%rowtype;
begin
 select * into v_co from public.pilot_change_orders where id=p_co_id for update;
 if not found then raise exception 'change_order_not_found'; end if;
 if v_actor is null or not pilot_priv.co_is_pm(p_co_id) then
   raise exception 'pm_required' using errcode='42501'; end if;
 if v_co.status<>'client_approved' then raise exception 'client_approval_required'; end if;
 update public.pilot_change_orders set status='active',activated_at=now(),
   activated_by=v_actor where id=p_co_id;
 insert into public.pilot_co_audit_events(co_id,actor_id,action,detail)
   values(p_co_id,v_actor,'activated','PM activated separately approved Change Order');
 return pg_catalog.jsonb_build_object('co_id',p_co_id,'status','active',
   'contract_original_unchanged',true,'payment_authorized',false);
end;
$$;

-- Server-only append-only audit when the assigned sub reports CO progress.
create function pilot_priv.co_audit_report()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_co uuid;
begin
 select s.co_id into v_co from public.pilot_co_tasks t
   join public.pilot_co_scopes s on s.id=t.scope_id where t.id=new.task_id;
 insert into public.pilot_co_audit_events(co_id,actor_id,action,task_id,report_id,detail)
   values(v_co,new.author_id,'reported',new.task_id,new.id,'Sub progress pending PM review');
 return new;
end;
$$;
revoke all on function pilot_priv.co_audit_report() from public,anon,authenticated;
create trigger pilot_co_report_audit
  after insert on public.pilot_co_reports
  for each row execute function pilot_priv.co_audit_report();

create function public.pilot_co_review_report(
 p_report_id uuid,p_action text,p_approved_pct numeric default null,p_reason text default ''
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_report public.pilot_co_reports%rowtype;
 v_co uuid;v_scope uuid;v_sub uuid;v_price bigint;v_weight numeric;
 v_previous numeric:=0;v_approved numeric;v_total bigint:=0;
 v_scope_total bigint:=0;v_target bigint;v_delta bigint;
 v_reason text:=pg_catalog.btrim(coalesce(p_reason,''));
begin
 if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_action is null or p_action not in ('approve','reject') or length(v_reason)>300
  then raise exception 'invalid_review'; end if;
 select * into v_report from public.pilot_co_reports where id=p_report_id for update;
 if not found then raise exception 'co_report_not_found'; end if;
 if v_report.status<>'pending' then raise exception 'already_reviewed'; end if;
 select s.co_id,s.id,st.sub_id,st.subcontract_cents,t.weight_pct
 into v_co,v_scope,v_sub,v_price,v_weight
 from public.pilot_co_tasks t
 join public.pilot_co_scopes s on s.id=t.scope_id
 join public.pilot_co_sub_terms st on st.scope_id=s.id
 where t.id=v_report.task_id;
 if v_co is null then raise exception 'co_scope_missing'; end if;
 if not pilot_priv.co_is_pm(v_co) then raise exception 'pm_required' using errcode='42501'; end if;
 if not exists(select 1 from public.pilot_change_orders where id=v_co and status='active')
   then raise exception 'co_not_active'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_scope::text,4));
 select validated_pct into v_previous from public.pilot_co_validations where task_id=v_report.task_id for update;
 v_previous:=coalesce(v_previous,0);
 if p_action='reject' then
   if v_reason='' then raise exception 'reason_required'; end if;
   update public.pilot_co_reports set status='rejected',reviewed_at=now(),
      reviewed_by=v_actor,review_reason=v_reason where id=p_report_id;
   insert into public.pilot_co_audit_events(co_id,actor_id,action,task_id,report_id,detail)
     values(v_co,v_actor,'rejected',v_report.task_id,p_report_id,v_reason);
   return pg_catalog.jsonb_build_object('status','rejected','new_credit_cents',0,'payment_authorized',false);
 end if;
 v_approved:=coalesce(p_approved_pct,v_report.reported_pct);
 if v_approved<0 or v_approved>100 or v_approved<v_previous
     or v_approved<>round(v_approved,2)
   then raise exception 'invalid_or_decreasing_validation'; end if;
 if v_approved<>v_report.reported_pct and v_reason=''
   then raise exception 'reason_required'; end if;
 select coalesce(sum(delta_cents),0)::bigint into v_total
   from public.pilot_co_credit_events where task_id=v_report.task_id;
 v_target:=round(v_price*v_weight/100*v_approved/100)::bigint;
 v_delta:=v_target-v_total;
 if v_delta<0 then raise exception 'co_credit_immutable_conflict'; end if;
 select coalesce(sum(delta_cents),0)::bigint into v_scope_total
   from public.pilot_co_credit_events where scope_id=v_scope;
 if v_scope_total+v_delta>v_price then raise exception 'co_credit_exceeds_subcontract'; end if;
 insert into public.pilot_co_validations(task_id,validated_pct,reviewed_by)
   values(v_report.task_id,v_approved,v_actor)
   on conflict(task_id) do update set validated_pct=excluded.validated_pct,
     reviewed_by=excluded.reviewed_by,updated_at=now();
 update public.pilot_co_reports set status='validated',reviewed_at=now(),
   reviewed_by=v_actor,review_reason=nullif(v_reason,'') where id=p_report_id;
 insert into public.pilot_co_credit_events(report_id,task_id,scope_id,co_id,sub_id,
   delta_cents,validated_pct)
   values(p_report_id,v_report.task_id,v_scope,v_co,v_sub,v_delta,v_approved);
 insert into public.pilot_co_audit_events(co_id,actor_id,action,task_id,report_id,detail)
   values(v_co,v_actor,'validated',v_report.task_id,p_report_id,'PM validated CO progress (not payment)');
 return pg_catalog.jsonb_build_object('status','validated','new_credit_cents',v_delta,
   'validated_percent',v_approved,'payment_authorized',false);
end;
$$;

revoke all on function public.pilot_co_create_draft(uuid,text,text,bigint),
  public.pilot_co_add_scope(uuid,text,uuid,bigint),
  public.pilot_co_add_task(uuid,text,numeric),
  public.pilot_co_submit(uuid),
  public.pilot_co_client_decide(uuid,boolean,text),
  public.pilot_co_activate(uuid),
  public.pilot_co_review_report(uuid,text,numeric,text) from public,anon;
grant execute on function public.pilot_co_create_draft(uuid,text,text,bigint),
  public.pilot_co_add_scope(uuid,text,uuid,bigint),
  public.pilot_co_add_task(uuid,text,numeric),
  public.pilot_co_submit(uuid),
  public.pilot_co_client_decide(uuid,boolean,text),
  public.pilot_co_activate(uuid),
  public.pilot_co_review_report(uuid,text,numeric,text) to authenticated;
commit;
