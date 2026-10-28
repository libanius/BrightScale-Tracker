create function tracker_private.workspace_is_workspace_admin() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from tracker.members m join auth.users u on lower(u.email)=lower(m.email) where u.id=auth.uid() and u.email_confirmed_at is not null and m.role in ('admin','pm','manager')) $$;
revoke all on function tracker_private.workspace_is_workspace_admin() from public,anon;
grant execute on function tracker_private.workspace_is_workspace_admin() to authenticated;







create schema if not exists tracker;
create schema if not exists tracker_private;
grant usage on schema tracker to authenticated;

grant usage on schema tracker_private to authenticated;

create table tracker.live_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null check (length(name) between 1 and 120),
  baseline_frozen_at timestamptz, baseline_frozen_by uuid,
  baseline_version integer not null default 1 check (baseline_version > 0),
  created_at timestamptz not null default now()
);
create table tracker.live_memberships (
  project_id uuid not null references tracker.live_projects(id),
  user_id uuid not null,
  role text not null check (role in ('sub','client')),
  created_at timestamptz not null default now(),
  primary key(project_id,user_id)
);
create table tracker.live_scopes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tracker.live_projects(id),
  name text not null check(length(name) between 1 and 120),
  created_at timestamptz not null default now()
);
create table tracker.live_assignments (
  scope_id uuid primary key references tracker.live_scopes(id),
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create table tracker.live_scope_terms (
  scope_id uuid primary key references tracker.live_scopes(id),
  subcontract_cents bigint not null check(subcontract_cents >= 0 and subcontract_cents <= 100000000000),
  created_at timestamptz not null default now()
);
create table tracker.live_tasks (
  id uuid primary key default gen_random_uuid(),
  scope_id uuid not null references tracker.live_scopes(id),
  title text not null check(length(title) between 1 and 160),
  weight_pct numeric(5,2) not null check(weight_pct > 0 and weight_pct <= 100),
  created_at timestamptz not null default now()
);
create table tracker.live_reports (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tracker.live_tasks(id),
  author_id uuid not null default auth.uid(),
  reported_pct numeric(5,2) not null check(reported_pct >= 0 and reported_pct <= 100),
  note text not null default '' check(length(note) <= 300),
  status text not null default 'pending' check(status in ('pending','validated','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text check(length(review_reason) <= 300)
);
create unique index live_one_pending_per_task on tracker.live_reports(task_id) where status='pending';

create table tracker.live_validations (
  task_id uuid primary key references tracker.live_tasks(id),
  validated_pct numeric(5,2) not null check(validated_pct >= 0 and validated_pct <= 100),
  reviewed_by uuid not null,
  updated_at timestamptz not null default now()
);
create table tracker.live_credit_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references tracker.live_reports(id),
  task_id uuid not null references tracker.live_tasks(id),
  sub_id uuid not null,
  delta_cents bigint not null check(delta_cents >= 0),
  validated_pct numeric(5,2) not null,
  baseline_version integer not null,
  created_at timestamptz not null default now()
);
create table tracker.live_audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tracker.live_projects(id),
  task_id uuid references tracker.live_tasks(id),
  report_id uuid references tracker.live_reports(id),
  actor_id uuid not null,
  action text not null check(action in ('reported','validated','rejected','baseline_frozen')),
  reported_pct numeric(5,2),
  validated_pct numeric(5,2),
  reason text,
  created_at timestamptz not null default now()
);



create function tracker_private.workspace_enforce_scope_weight_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_existing numeric;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.scope_id::text, 1));
  select coalesce(sum(t.weight_pct), 0) into v_existing
    from tracker.live_tasks t where t.scope_id=new.scope_id;
  if v_existing + new.weight_pct > 100 then
    raise exception 'scope_weight_exceeds_100';
  end if;
  return new;
end;
$$;
revoke all on function tracker_private.workspace_enforce_scope_weight_limit() from public, anon, authenticated;
create trigger live_tasks_limit before insert on tracker.live_tasks
  for each row execute function tracker_private.workspace_enforce_scope_weight_limit();




create function tracker_private.workspace_is_pm(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from tracker.live_projects p
    where p.id = p_project and p.owner_id = (select auth.uid()))
$$;
create function tracker_private.workspace_is_member(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from tracker.live_memberships m
    where m.project_id=p_project and m.user_id=(select auth.uid()))
$$;
create function tracker_private.workspace_is_client(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from tracker.live_memberships m
    where m.project_id=p_project and m.user_id=(select auth.uid()) and m.role='client')
$$;
create function tracker_private.workspace_can_assign_sub(p_scope uuid, p_sub uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from tracker.live_scopes s
    join tracker.live_memberships m on m.project_id=s.project_id
    where s.id=p_scope and m.user_id=p_sub and m.role='sub'
  )
$$;
create function tracker_private.workspace_is_scope_sub(p_scope uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from tracker.live_scopes s
    join tracker.live_assignments a on a.scope_id=s.id
    join tracker.live_memberships m on m.project_id=s.project_id
      and m.user_id=a.user_id and m.role='sub'
    where s.id=p_scope and a.user_id=(select auth.uid())
  )
$$;
create function tracker_private.workspace_can_read_scope(p_scope uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from tracker.live_scopes s where s.id=p_scope and (
      tracker_private.workspace_is_pm(s.project_id) or tracker_private.workspace_is_client(s.project_id)
      or tracker_private.workspace_is_scope_sub(s.id)
    )
  )
$$;
create function tracker_private.workspace_is_pm_task(p_task uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from tracker.live_tasks t
    join tracker.live_scopes s on s.id=t.scope_id
    where t.id=p_task and tracker_private.workspace_is_pm(s.project_id))
$$;
create function tracker_private.workspace_can_read_task(p_task uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from tracker.live_tasks t where t.id=p_task
    and tracker_private.workspace_can_read_scope(t.scope_id))
$$;
create function tracker_private.workspace_is_sub_task(p_task uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from tracker.live_tasks t
    where t.id=p_task and tracker_private.workspace_is_scope_sub(t.scope_id))
$$;

create function tracker_private.workspace_is_frozen_task(p_task uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from tracker.live_tasks t
    join tracker.live_scopes s on s.id=t.scope_id
    join tracker.live_projects p on p.id=s.project_id
    where t.id=p_task and p.baseline_frozen_at is not null)
$$;
revoke all on function tracker_private.workspace_is_frozen_task(uuid) from public,anon;
grant execute on function tracker_private.workspace_is_frozen_task(uuid) to authenticated;




do $g$ declare f record;begin for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='tracker_private' and p.proname like 'workspace_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to authenticated',f.sig);end loop;end $g$;


revoke all on tracker.live_projects,tracker.live_memberships,tracker.live_scopes,
  tracker.live_assignments,tracker.live_scope_terms,tracker.live_tasks,
  tracker.live_reports,tracker.live_validations,tracker.live_credit_events,
  tracker.live_audit_events from public,anon,authenticated;



grant select on tracker.live_projects,tracker.live_memberships,tracker.live_scopes,
  tracker.live_assignments,tracker.live_scope_terms,tracker.live_tasks,
  tracker.live_reports,tracker.live_validations,tracker.live_credit_events,
  tracker.live_audit_events to authenticated;
grant insert(id,name) on tracker.live_projects to authenticated;
grant insert(project_id,user_id,role) on tracker.live_memberships to authenticated;
grant delete on tracker.live_memberships to authenticated;
grant insert(id,project_id,name) on tracker.live_scopes to authenticated;
grant insert(scope_id,user_id) on tracker.live_assignments to authenticated;
grant delete on tracker.live_assignments to authenticated;
grant insert(scope_id,subcontract_cents) on tracker.live_scope_terms to authenticated;
grant insert(id,scope_id,title,weight_pct) on tracker.live_tasks to authenticated;
grant insert(id,task_id,reported_pct,note) on tracker.live_reports to authenticated;

alter table tracker.live_projects enable row level security;
alter table tracker.live_memberships enable row level security;
alter table tracker.live_scopes enable row level security;
alter table tracker.live_assignments enable row level security;
alter table tracker.live_scope_terms enable row level security;
alter table tracker.live_tasks enable row level security;
alter table tracker.live_reports enable row level security;
alter table tracker.live_validations enable row level security;
alter table tracker.live_credit_events enable row level security;
alter table tracker.live_audit_events enable row level security;

create policy live_projects_read on tracker.live_projects for select to authenticated
  using (owner_id=(select auth.uid()) or (select tracker_private.workspace_is_member(id)));
create policy live_projects_create on tracker.live_projects for insert to authenticated
  with check (owner_id=(select auth.uid()) and tracker_private.workspace_is_workspace_admin());
create policy live_memberships_read on tracker.live_memberships for select to authenticated
  using (user_id=(select auth.uid()) or tracker_private.workspace_is_pm(project_id));
create policy live_memberships_create on tracker.live_memberships for insert to authenticated
  with check (tracker_private.workspace_is_pm(project_id));
create policy live_memberships_revoke on tracker.live_memberships for delete to authenticated
  using (tracker_private.workspace_is_pm(project_id));

create policy live_scopes_read on tracker.live_scopes for select to authenticated
  using (tracker_private.workspace_is_pm(project_id) or tracker_private.workspace_can_read_scope(id));
create policy live_scopes_create on tracker.live_scopes for insert to authenticated
  with check (tracker_private.workspace_is_pm(project_id));
create policy live_assignments_read on tracker.live_assignments for select to authenticated
  using (
    (user_id=(select auth.uid()) and tracker_private.workspace_is_scope_sub(scope_id))
    or tracker_private.workspace_can_read_scope(scope_id) and
      exists(select 1 from tracker.live_scopes s where s.id=scope_id and tracker_private.workspace_is_pm(s.project_id))
  );
create policy live_assignments_create on tracker.live_assignments for insert to authenticated
  with check (tracker_private.workspace_can_assign_sub(scope_id,user_id) and
    exists(select 1 from tracker.live_scopes s where s.id=scope_id and tracker_private.workspace_is_pm(s.project_id)));
create policy live_assignments_revoke on tracker.live_assignments for delete to authenticated
  using (exists(select 1 from tracker.live_scopes s where s.id=scope_id and tracker_private.workspace_is_pm(s.project_id)));

create policy live_terms_read on tracker.live_scope_terms for select to authenticated
  using (
    tracker_private.workspace_is_scope_sub(scope_id) or
    exists(select 1 from tracker.live_scopes s where s.id=scope_id and tracker_private.workspace_is_pm(s.project_id))
  );
create policy live_terms_create on tracker.live_scope_terms for insert to authenticated
  with check (exists(select 1 from tracker.live_scopes s where s.id=scope_id and tracker_private.workspace_is_pm(s.project_id)));
create policy live_tasks_read on tracker.live_tasks for select to authenticated
  using (tracker_private.workspace_can_read_scope(scope_id));
create policy live_tasks_create on tracker.live_tasks for insert to authenticated
  with check (exists(select 1 from tracker.live_scopes s where s.id=scope_id and tracker_private.workspace_is_pm(s.project_id)));

create policy live_reports_read on tracker.live_reports for select to authenticated
  using ((author_id=(select auth.uid()) and tracker_private.workspace_is_sub_task(task_id)) or tracker_private.workspace_is_pm_task(task_id));
create policy live_reports_create on tracker.live_reports for insert to authenticated
  with check (
    author_id=(select auth.uid()) and status='pending'
    and reviewed_at is null and reviewed_by is null and review_reason is null
    and tracker_private.workspace_is_sub_task(task_id)
    and tracker_private.workspace_is_frozen_task(task_id)
    and reported_pct >= coalesce(
      (select v.validated_pct from tracker.live_validations v where v.task_id=live_reports.task_id),0
    )
  );


create policy live_validations_read on tracker.live_validations for select to authenticated
  using (tracker_private.workspace_can_read_task(task_id));
create policy live_credit_read on tracker.live_credit_events for select to authenticated
  using ((sub_id=(select auth.uid()) and tracker_private.workspace_is_sub_task(task_id)) or tracker_private.workspace_is_pm_task(task_id));
create policy live_audit_read on tracker.live_audit_events for select to authenticated
  using (tracker_private.workspace_is_pm(project_id));


create function tracker_private.workspace_audit_sub_report()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_project uuid;
begin
  select s.project_id into v_project from tracker.live_tasks t
    join tracker.live_scopes s on s.id=t.scope_id where t.id=new.task_id;
  insert into tracker.live_audit_events(project_id,task_id,report_id,actor_id,action,reported_pct)
    values(v_project,new.task_id,new.id,new.author_id,'reported',new.reported_pct);
  return new;
end;
$$;
revoke all on function tracker_private.workspace_audit_sub_report() from public,anon,authenticated;
create trigger live_report_audit after insert on tracker.live_reports
  for each row execute function tracker_private.workspace_audit_sub_report();



create function tracker.live_review_report(
  p_report_id uuid, p_action text, p_approved_pct numeric default null, p_reason text default ''
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_report tracker.live_reports%rowtype;
  v_project uuid;
  v_scope uuid;
  v_task_weight numeric;
  v_contract bigint;
  v_baseline integer;
  v_previous numeric := 0;
  v_approved numeric;
  v_current bigint := 0;
  v_scope_current bigint := 0;
  v_target bigint := 0;
  v_delta bigint := 0;
  v_reason text := pg_catalog.btrim(coalesce(p_reason,''));
begin
  if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_action not in ('approve','reject') or p_action is null then raise exception 'invalid_action'; end if;
  if length(v_reason)>300 then raise exception 'reason_too_long'; end if;

  select * into v_report from tracker.live_reports where id=p_report_id for update;
  if not found then raise exception 'report_not_found'; end if;
  if v_report.status <> 'pending' then raise exception 'already_reviewed'; end if;
  select s.project_id, t.scope_id,t.weight_pct,p.baseline_version
    into v_project,v_scope,v_task_weight,v_baseline
    from tracker.live_tasks t
    join tracker.live_scopes s on s.id=t.scope_id
    join tracker.live_projects p on p.id=s.project_id
    where t.id=v_report.task_id;
  if not tracker_private.workspace_is_pm(v_project) then raise exception 'pm_required' using errcode='42501'; end if;
  -- Different tasks in the SAME scope may be reviewed at the same time.
  -- Lock the scope before checking its aggregate recognized credit. A per-task
  -- lock alone would allow concurrent approvals to exceed the subcontract.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_scope::text,2));
  select validated_pct into v_previous from tracker.live_validations where task_id=v_report.task_id for update;
  v_previous := coalesce(v_previous,0);

  if p_action='reject' then
    if v_reason='' then raise exception 'reason_required'; end if;
    update tracker.live_reports set status='rejected', reviewed_at=now(),
      reviewed_by=v_actor, review_reason=v_reason where id=p_report_id;
    insert into tracker.live_audit_events(project_id,task_id,report_id,actor_id,action,reported_pct,validated_pct,reason)
      values(v_project,v_report.task_id,p_report_id,v_actor,'rejected',v_report.reported_pct,v_previous,v_reason);
    return pg_catalog.jsonb_build_object('status','rejected','validated_percent',v_previous,'new_credit_cents',0,'payment_authorized',false);
  end if;

  v_approved := coalesce(p_approved_pct,v_report.reported_pct);
  if v_approved < v_previous or v_approved > 100 or v_approved < 0 then
    raise exception 'invalid_or_decreasing_validation';
  end if;
  if v_approved <> v_report.reported_pct and v_reason='' then raise exception 'reason_required'; end if;

  select subcontract_cents into v_contract from tracker.live_scope_terms where scope_id=v_scope;
  if not found then raise exception 'scope_terms_missing'; end if;
  select coalesce(sum(delta_cents),0)::bigint into v_current from tracker.live_credit_events
    where task_id=v_report.task_id;
  v_target := round(v_contract * v_task_weight / 100 * v_approved / 100)::bigint;
  v_delta := v_target-v_current;
  if v_delta < 0 then raise exception 'immutable_credit_conflict'; end if;
  -- No sum of per-task rounding may exceed the original scope subcontract.
  -- This is a defensive money cap, NOT a payment authorization.
  select coalesce(sum(e.delta_cents), 0)::bigint into v_scope_current
    from tracker.live_credit_events e
    join tracker.live_tasks t on t.id=e.task_id
    where t.scope_id=v_scope;
  if v_scope_current + v_delta > v_contract then
    raise exception 'scope_credit_exceeds_subcontract';
  end if;

  insert into tracker.live_validations(task_id,validated_pct,reviewed_by)
    values(v_report.task_id,v_approved,v_actor)
    on conflict(task_id) do update set validated_pct=excluded.validated_pct,
      reviewed_by=excluded.reviewed_by, updated_at=now();

  update tracker.live_reports set status='validated', reviewed_at=now(),
    reviewed_by=v_actor, review_reason=nullif(v_reason,'') where id=p_report_id;

  insert into tracker.live_credit_events(report_id,task_id,sub_id,delta_cents,validated_pct,baseline_version)
    values(p_report_id,v_report.task_id,v_report.author_id,v_delta,v_approved,v_baseline);
  insert into tracker.live_audit_events(project_id,task_id,report_id,actor_id,action,reported_pct,validated_pct,reason)
    values(v_project,v_report.task_id,p_report_id,v_actor,'validated',v_report.reported_pct,v_approved,nullif(v_reason,''));

  return pg_catalog.jsonb_build_object('status','validated','validated_percent',v_approved,
    'new_credit_cents',v_delta,'payment_authorized',false);
end;
$$;

revoke all on function tracker.live_review_report(uuid,text,numeric,text) from public, anon;
grant execute on function tracker.live_review_report(uuid,text,numeric,text) to authenticated;




create function tracker_private.workspace_assert_baseline_open(p_project uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_frozen timestamptz;
begin
  select baseline_frozen_at into v_frozen
    from tracker.live_projects where id=p_project for update;
  if not found then raise exception 'baseline_project_not_found'; end if;
  if v_frozen is not null then raise exception 'baseline_already_frozen' using errcode='23514'; end if;
end;
$$;
revoke all on function tracker_private.workspace_assert_baseline_open(uuid) from public,anon,authenticated;

create function tracker_private.workspace_reject_frozen_baseline_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_project uuid;
begin
  if TG_TABLE_NAME='live_scopes' then
    v_project := new.project_id;
  elsif TG_TABLE_NAME in ('live_scope_terms','live_tasks') then
    select s.project_id into v_project from tracker.live_scopes s
    where s.id=case when TG_TABLE_NAME='live_tasks' then new.scope_id else new.scope_id end;
  else
    raise exception 'baseline_unexpected_table';
  end if;
  perform tracker_private.workspace_assert_baseline_open(v_project);
  return new;
end;
$$;
revoke all on function tracker_private.workspace_reject_frozen_baseline_insert() from public,anon,authenticated;
create trigger live_protect_scope_baseline
  before insert on tracker.live_scopes
  for each row execute function tracker_private.workspace_reject_frozen_baseline_insert();
create trigger live_protect_terms_baseline
  before insert on tracker.live_scope_terms
  for each row execute function tracker_private.workspace_reject_frozen_baseline_insert();
create trigger live_protect_task_baseline
  before insert on tracker.live_tasks
  for each row execute function tracker_private.workspace_reject_frozen_baseline_insert();




create function tracker.live_freeze_baseline(p_project_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_frozen_at timestamptz;
  v_scope_count integer;
  v_invalid_count integer;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select owner_id, baseline_frozen_at
    into v_owner,v_frozen_at from tracker.live_projects
    where id=p_project_id for update;
  if not found then raise exception 'baseline_project_not_found'; end if;
  if v_owner<>v_actor then raise exception 'pm_required' using errcode='42501'; end if;
  if v_frozen_at is not null then raise exception 'baseline_already_frozen'; end if;

  select count(*) into v_scope_count from tracker.live_scopes where project_id=p_project_id;
  if v_scope_count=0 then raise exception 'baseline_requires_scopes'; end if;
  select count(*) into v_invalid_count
  from tracker.live_scopes s
  left join tracker.live_scope_terms st on st.scope_id=s.id
  where s.project_id=p_project_id and (
    st.scope_id is null
    or coalesce((select sum(t.weight_pct) from tracker.live_tasks t where t.scope_id=s.id),0)<>100
  );
  if v_invalid_count<>0 then raise exception 'baseline_incomplete_scope_weights_or_terms'; end if;

  update tracker.live_projects
    set baseline_frozen_at=now(),baseline_frozen_by=v_actor
    where id=p_project_id;
  insert into tracker.live_audit_events(project_id,actor_id,action,reason)
    values(p_project_id,v_actor,'baseline_frozen','PM confirmed original baseline and task weights');
  return pg_catalog.jsonb_build_object(
    'status','frozen','project_id',p_project_id,
    'baseline_version',1,'scope_count',v_scope_count,
    'payment_authorized',false);
end;
$$;
revoke all on function tracker.live_freeze_baseline(uuid) from public,anon;
grant execute on function tracker.live_freeze_baseline(uuid) to authenticated;








create table tracker.live_change_orders (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  project_id uuid not null references tracker.live_projects(id),
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
create table tracker.live_co_client_terms (
  co_id uuid primary key references tracker.live_change_orders(id),
  client_amount_cents bigint not null check(client_amount_cents >= 0 and client_amount_cents <= 100000000000)
);
create table tracker.live_co_scopes (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  co_id uuid not null references tracker.live_change_orders(id),
  title text not null check(length(title) between 1 and 120),
  created_at timestamptz not null default now()
);
create table tracker.live_co_sub_terms (
  scope_id uuid primary key references tracker.live_co_scopes(id),
  sub_id uuid not null,
  subcontract_cents bigint not null check(subcontract_cents >= 0 and subcontract_cents <= 100000000000)
);
create table tracker.live_co_tasks (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  scope_id uuid not null references tracker.live_co_scopes(id),
  title text not null check(length(title) between 1 and 160),
  weight_pct numeric(5,2) not null check(weight_pct>0 and weight_pct<=100)
);
create table tracker.live_co_reports (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  task_id uuid not null references tracker.live_co_tasks(id),
  author_id uuid not null default auth.uid(),
  reported_pct numeric(5,2) not null check(reported_pct>=0 and reported_pct<=100),
  note text not null default '' check(length(note)<=300),
  status text not null default 'pending' check(status in ('pending','validated','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text check(length(review_reason)<=300)
);
create unique index live_co_one_pending_per_task on tracker.live_co_reports(task_id) where status='pending';
create table tracker.live_co_validations (
  task_id uuid primary key references tracker.live_co_tasks(id),
  validated_pct numeric(5,2) not null check(validated_pct>=0 and validated_pct<=100),
  reviewed_by uuid not null,
  updated_at timestamptz not null default now()
);
create table tracker.live_co_credit_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  report_id uuid not null unique references tracker.live_co_reports(id),
  task_id uuid not null references tracker.live_co_tasks(id),
  scope_id uuid not null references tracker.live_co_scopes(id),
  co_id uuid not null references tracker.live_change_orders(id),
  sub_id uuid not null,
  delta_cents bigint not null check(delta_cents>=0),
  validated_pct numeric(5,2) not null,
  created_at timestamptz not null default now()
);
create table tracker.live_co_audit_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  co_id uuid not null references tracker.live_change_orders(id),
  actor_id uuid not null,
  action text not null check(action in (
    'created','scope_added','task_added','submitted','client_approved',
    'declined','activated','reported','validated','rejected')),
  task_id uuid references tracker.live_co_tasks(id),
  report_id uuid references tracker.live_co_reports(id),
  detail text,
  created_at timestamptz not null default now()
);



create function tracker_private.workspace_co_is_pm(p_co uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from tracker.live_change_orders c
   join tracker.live_projects p on p.id=c.project_id
   where c.id=p_co and p.owner_id=(select auth.uid()))
$$;
create function tracker_private.workspace_co_is_client(p_co uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from tracker.live_change_orders c
   join tracker.live_memberships m on m.project_id=c.project_id
   where c.id=p_co and c.status in ('submitted','client_approved','declined','active')
     and m.role='client' and m.user_id=(select auth.uid()))
$$;
create function tracker_private.workspace_co_is_sub_scope(p_scope uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from tracker.live_co_scopes s
   join tracker.live_change_orders c on c.id=s.co_id
   join tracker.live_co_sub_terms st on st.scope_id=s.id
   join tracker.live_memberships m on m.project_id=c.project_id
   where s.id=p_scope and c.status='active'
     and m.role='sub' and m.user_id=(select auth.uid())
     and st.sub_id=m.user_id)
$$;
create function tracker_private.workspace_co_can_read_scope(p_scope uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from tracker.live_co_scopes s where s.id=p_scope
   and (tracker_private.workspace_co_is_pm(s.co_id) or tracker_private.workspace_co_is_client(s.co_id)
        or tracker_private.workspace_co_is_sub_scope(s.id)))
$$;
create function tracker_private.workspace_co_is_pm_task(p_task uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from tracker.live_co_tasks t
   join tracker.live_co_scopes s on s.id=t.scope_id
   where t.id=p_task and tracker_private.workspace_co_is_pm(s.co_id))
$$;
create function tracker_private.workspace_co_is_sub_task(p_task uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from tracker.live_co_tasks t where t.id=p_task
   and tracker_private.workspace_co_is_sub_scope(t.scope_id))
$$;
create function tracker_private.workspace_co_can_read_task(p_task uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from tracker.live_co_tasks t where t.id=p_task
   and tracker_private.workspace_co_can_read_scope(t.scope_id))
$$;
revoke all on function tracker_private.workspace_co_is_pm(uuid),tracker_private.workspace_co_is_client(uuid),
  tracker_private.workspace_co_is_sub_scope(uuid),tracker_private.workspace_co_can_read_scope(uuid),
  tracker_private.workspace_co_is_pm_task(uuid),tracker_private.workspace_co_is_sub_task(uuid),
  tracker_private.workspace_co_can_read_task(uuid) from public,anon;
grant execute on function tracker_private.workspace_co_is_pm(uuid),tracker_private.workspace_co_is_client(uuid),
  tracker_private.workspace_co_is_sub_scope(uuid),tracker_private.workspace_co_can_read_scope(uuid),
  tracker_private.workspace_co_is_pm_task(uuid),tracker_private.workspace_co_is_sub_task(uuid),
  tracker_private.workspace_co_can_read_task(uuid) to authenticated;

revoke all on tracker.live_change_orders,tracker.live_co_client_terms,
 tracker.live_co_scopes,tracker.live_co_sub_terms,tracker.live_co_tasks,
 tracker.live_co_reports,tracker.live_co_validations,tracker.live_co_credit_events,
 tracker.live_co_audit_events from public,anon,authenticated;
grant select on tracker.live_change_orders,tracker.live_co_client_terms,
 tracker.live_co_scopes,tracker.live_co_sub_terms,tracker.live_co_tasks,
 tracker.live_co_reports,tracker.live_co_validations,tracker.live_co_credit_events,
 tracker.live_co_audit_events to authenticated;
grant insert(id,task_id,reported_pct,note) on tracker.live_co_reports to authenticated;

alter table tracker.live_change_orders enable row level security;
alter table tracker.live_co_client_terms enable row level security;
alter table tracker.live_co_scopes enable row level security;
alter table tracker.live_co_sub_terms enable row level security;
alter table tracker.live_co_tasks enable row level security;
alter table tracker.live_co_reports enable row level security;
alter table tracker.live_co_validations enable row level security;
alter table tracker.live_co_credit_events enable row level security;
alter table tracker.live_co_audit_events enable row level security;

create policy live_co_read on tracker.live_change_orders for select to authenticated
 using (tracker_private.workspace_co_is_pm(id) or tracker_private.workspace_co_is_client(id)
   or (status='active' and exists(
     select 1 from tracker.live_co_scopes s where s.co_id=id
       and tracker_private.workspace_co_is_sub_scope(s.id))));
create policy live_co_client_terms_read on tracker.live_co_client_terms for select to authenticated
 using (tracker_private.workspace_co_is_pm(co_id) or tracker_private.workspace_co_is_client(co_id));
create policy live_co_scopes_read on tracker.live_co_scopes for select to authenticated
 using (tracker_private.workspace_co_is_pm(co_id) or tracker_private.workspace_co_is_client(co_id)
   or tracker_private.workspace_co_is_sub_scope(id));
create policy live_co_sub_terms_read on tracker.live_co_sub_terms for select to authenticated
 using (tracker_private.workspace_co_is_sub_scope(scope_id)
   or exists(select 1 from tracker.live_co_scopes s where s.id=scope_id
      and tracker_private.workspace_co_is_pm(s.co_id)));
create policy live_co_tasks_read on tracker.live_co_tasks for select to authenticated
 using (tracker_private.workspace_co_can_read_scope(scope_id));
create policy live_co_reports_read on tracker.live_co_reports for select to authenticated
 using ((author_id=(select auth.uid()) and tracker_private.workspace_co_is_sub_task(task_id))
   or tracker_private.workspace_co_is_pm_task(task_id));
create policy live_co_validations_read on tracker.live_co_validations for select to authenticated
 using (tracker_private.workspace_co_can_read_task(task_id));
create policy live_co_credits_read on tracker.live_co_credit_events for select to authenticated
 using ((sub_id=(select auth.uid()) and tracker_private.workspace_co_is_sub_scope(scope_id))
   or tracker_private.workspace_co_is_pm(co_id));
create policy live_co_audit_read on tracker.live_co_audit_events for select to authenticated
 using (tracker_private.workspace_co_is_pm(co_id));
create policy live_co_report_insert on tracker.live_co_reports for insert to authenticated
 with check (author_id=(select auth.uid()) and status='pending'
   and reviewed_at is null and reviewed_by is null and review_reason is null
   and tracker_private.workspace_co_is_sub_task(task_id)
   and reported_pct >= coalesce(
     (select v.validated_pct from tracker.live_co_validations v where v.task_id=live_co_reports.task_id),0));



create function tracker.live_co_create_draft(
 p_project_id uuid, p_title text, p_description text, p_client_cents bigint
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_co uuid;
begin
 if v_actor is null or not tracker_private.workspace_is_pm(p_project_id) then
   raise exception 'pm_required' using errcode='42501'; end if;
 if not exists(select 1 from tracker.live_projects p
     where p.id=p_project_id and p.baseline_frozen_at is not null)
   then raise exception 'original_baseline_must_be_frozen'; end if;
 if p_title is null or length(pg_catalog.btrim(p_title)) not between 1 and 120
     or p_description is null or length(p_description)>500
     or p_client_cents is null or p_client_cents<0 or p_client_cents>100000000000
   then raise exception 'invalid_change_order_terms'; end if;
 insert into tracker.live_change_orders(project_id,title,description,created_by)
   values(p_project_id,pg_catalog.btrim(p_title),p_description,v_actor) returning id into v_co;
 insert into tracker.live_co_client_terms(co_id,client_amount_cents)
   values(v_co,p_client_cents);
 insert into tracker.live_co_audit_events(co_id,actor_id,action,detail)
   values(v_co,v_actor,'created','PM created independent draft; no client approval');
 return pg_catalog.jsonb_build_object('co_id',v_co,'status','draft','payment_authorized',false);
end;
$$;

create function tracker.live_co_add_scope(
 p_co_id uuid,p_title text,p_sub_id uuid,p_sub_cents bigint
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_co tracker.live_change_orders%rowtype;v_scope uuid;
begin
 select * into v_co from tracker.live_change_orders where id=p_co_id for update;
 if not found then raise exception 'change_order_not_found'; end if;
 if v_actor is null or not tracker_private.workspace_co_is_pm(p_co_id) then
   raise exception 'pm_required' using errcode='42501'; end if;
 if v_co.status<>'draft' then raise exception 'change_order_locked'; end if;
 if p_title is null or length(pg_catalog.btrim(p_title)) not between 1 and 120
    or p_sub_cents is null or p_sub_cents<0 or p_sub_cents>100000000000
    or not exists(select 1 from tracker.live_memberships m
      where m.project_id=v_co.project_id and m.user_id=p_sub_id and m.role='sub')
   then raise exception 'invalid_scope_or_subcontract'; end if;
 insert into tracker.live_co_scopes(co_id,title)
   values(p_co_id,pg_catalog.btrim(p_title)) returning id into v_scope;
 insert into tracker.live_co_sub_terms(scope_id,sub_id,subcontract_cents)
   values(v_scope,p_sub_id,p_sub_cents);
 insert into tracker.live_co_audit_events(co_id,actor_id,action,detail)
   values(p_co_id,v_actor,'scope_added','PM added separately priced subcontract scope');
 return pg_catalog.jsonb_build_object('scope_id',v_scope,'status','draft');
end;
$$;

create function tracker.live_co_add_task(
 p_scope_id uuid,p_title text,p_weight_pct numeric
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_co tracker.live_change_orders%rowtype;
        v_task uuid; v_total numeric;
begin
 select c.* into v_co from tracker.live_change_orders c
   join tracker.live_co_scopes s on s.co_id=c.id
   where s.id=p_scope_id for update of c;
 if not found then raise exception 'change_order_scope_not_found'; end if;
 if v_actor is null or not tracker_private.workspace_co_is_pm(v_co.id) then
   raise exception 'pm_required' using errcode='42501'; end if;
 if v_co.status<>'draft' then raise exception 'change_order_locked'; end if;
 if p_title is null or length(pg_catalog.btrim(p_title)) not between 1 and 160
   or p_weight_pct is null or p_weight_pct<=0 or p_weight_pct>100
   or p_weight_pct <> round(p_weight_pct,2)
   then raise exception 'invalid_co_task'; end if;
 select coalesce(sum(weight_pct),0) into v_total
   from tracker.live_co_tasks where scope_id=p_scope_id;
 if v_total+p_weight_pct>100 then raise exception 'co_scope_weight_exceeds_100'; end if;
 insert into tracker.live_co_tasks(scope_id,title,weight_pct)
   values(p_scope_id,pg_catalog.btrim(p_title),p_weight_pct) returning id into v_task;
 insert into tracker.live_co_audit_events(co_id,actor_id,action,detail)
   values(v_co.id,v_actor,'task_added','PM added weighted CO task');
 return pg_catalog.jsonb_build_object('task_id',v_task,'weight_pct',p_weight_pct);
end;
$$;

create function tracker.live_co_submit(p_co_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_co tracker.live_change_orders%rowtype;
        v_count integer;v_incomplete integer;
begin
 select * into v_co from tracker.live_change_orders where id=p_co_id for update;
 if not found then raise exception 'change_order_not_found'; end if;
 if v_actor is null or not tracker_private.workspace_co_is_pm(p_co_id) then
   raise exception 'pm_required' using errcode='42501'; end if;
 if v_co.status<>'draft' then raise exception 'change_order_locked'; end if;
 select count(*) into v_count from tracker.live_co_scopes where co_id=p_co_id;
 if v_count=0 then raise exception 'co_requires_scope'; end if;
 select count(*) into v_incomplete from tracker.live_co_scopes s
   left join tracker.live_co_sub_terms st on st.scope_id=s.id
   where s.co_id=p_co_id and (st.scope_id is null
      or coalesce((select sum(t.weight_pct)
          from tracker.live_co_tasks t where t.scope_id=s.id),0)<>100);
 if v_incomplete<>0 then raise exception 'co_incomplete_weights_or_terms'; end if;
 update tracker.live_change_orders set status='submitted',submitted_at=now() where id=p_co_id;
 insert into tracker.live_co_audit_events(co_id,actor_id,action,detail)
   values(p_co_id,v_actor,'submitted','PM submitted immutable draft for client approval');
 return pg_catalog.jsonb_build_object('co_id',p_co_id,'status','submitted',
   'client_approved',false,'payment_authorized',false);
end;
$$;

create function tracker.live_co_client_decide(
 p_co_id uuid,p_approve boolean,p_reason text default ''
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_co tracker.live_change_orders%rowtype;
        v_reason text:=pg_catalog.btrim(coalesce(p_reason,''));
begin
 select * into v_co from tracker.live_change_orders where id=p_co_id for update;
 if not found then raise exception 'change_order_not_found'; end if;
 if v_actor is null or not exists(select 1 from tracker.live_memberships m
   where m.project_id=v_co.project_id and m.role='client' and m.user_id=v_actor)
   then raise exception 'client_required' using errcode='42501'; end if;
 if v_co.status<>'submitted' then raise exception 'change_order_not_submitted'; end if;
 if p_approve is null or length(v_reason)>300 or (not p_approve and v_reason='')
   then raise exception 'invalid_client_decision'; end if;
 update tracker.live_change_orders
   set status=case when p_approve then 'client_approved' else 'declined' end,
       decided_at=now(),decided_by=v_actor,decision_reason=nullif(v_reason,'')
   where id=p_co_id;
 insert into tracker.live_co_audit_events(co_id,actor_id,action,detail)
   values(p_co_id,v_actor,case when p_approve then 'client_approved' else 'declined' end,
     'Client portal approval event; not a verified electronic signature');
 return pg_catalog.jsonb_build_object('co_id',p_co_id,
    'status',case when p_approve then 'client_approved' else 'declined' end,
    'signature_verified',false,'payment_authorized',false);
end;
$$;

create function tracker.live_co_activate(p_co_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_co tracker.live_change_orders%rowtype;
begin
 select * into v_co from tracker.live_change_orders where id=p_co_id for update;
 if not found then raise exception 'change_order_not_found'; end if;
 if v_actor is null or not tracker_private.workspace_co_is_pm(p_co_id) then
   raise exception 'pm_required' using errcode='42501'; end if;
 if v_co.status<>'client_approved' then raise exception 'client_approval_required'; end if;
 update tracker.live_change_orders set status='active',activated_at=now(),
   activated_by=v_actor where id=p_co_id;
 insert into tracker.live_co_audit_events(co_id,actor_id,action,detail)
   values(p_co_id,v_actor,'activated','PM activated separately approved Change Order');
 return pg_catalog.jsonb_build_object('co_id',p_co_id,'status','active',
   'contract_original_unchanged',true,'payment_authorized',false);
end;
$$;


create function tracker_private.workspace_co_audit_report()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_co uuid;
begin
 select s.co_id into v_co from tracker.live_co_tasks t
   join tracker.live_co_scopes s on s.id=t.scope_id where t.id=new.task_id;
 insert into tracker.live_co_audit_events(co_id,actor_id,action,task_id,report_id,detail)
   values(v_co,new.author_id,'reported',new.task_id,new.id,'Sub progress pending PM review');
 return new;
end;
$$;
revoke all on function tracker_private.workspace_co_audit_report() from public,anon,authenticated;
create trigger live_co_report_audit
  after insert on tracker.live_co_reports
  for each row execute function tracker_private.workspace_co_audit_report();

create function tracker.live_co_review_report(
 p_report_id uuid,p_action text,p_approved_pct numeric default null,p_reason text default ''
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_report tracker.live_co_reports%rowtype;
 v_co uuid;v_scope uuid;v_sub uuid;v_price bigint;v_weight numeric;
 v_previous numeric:=0;v_approved numeric;v_total bigint:=0;
 v_scope_total bigint:=0;v_target bigint;v_delta bigint;
 v_reason text:=pg_catalog.btrim(coalesce(p_reason,''));
begin
 if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_action is null or p_action not in ('approve','reject') or length(v_reason)>300
  then raise exception 'invalid_review'; end if;
 select * into v_report from tracker.live_co_reports where id=p_report_id for update;
 if not found then raise exception 'co_report_not_found'; end if;
 if v_report.status<>'pending' then raise exception 'already_reviewed'; end if;
 select s.co_id,s.id,st.sub_id,st.subcontract_cents,t.weight_pct
 into v_co,v_scope,v_sub,v_price,v_weight
 from tracker.live_co_tasks t
 join tracker.live_co_scopes s on s.id=t.scope_id
 join tracker.live_co_sub_terms st on st.scope_id=s.id
 where t.id=v_report.task_id;
 if v_co is null then raise exception 'co_scope_missing'; end if;
 if not tracker_private.workspace_co_is_pm(v_co) then raise exception 'pm_required' using errcode='42501'; end if;
 if not exists(select 1 from tracker.live_change_orders where id=v_co and status='active')
   then raise exception 'co_not_active'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_scope::text,4));
 select validated_pct into v_previous from tracker.live_co_validations where task_id=v_report.task_id for update;
 v_previous:=coalesce(v_previous,0);
 if p_action='reject' then
   if v_reason='' then raise exception 'reason_required'; end if;
   update tracker.live_co_reports set status='rejected',reviewed_at=now(),
      reviewed_by=v_actor,review_reason=v_reason where id=p_report_id;
   insert into tracker.live_co_audit_events(co_id,actor_id,action,task_id,report_id,detail)
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
   from tracker.live_co_credit_events where task_id=v_report.task_id;
 v_target:=round(v_price*v_weight/100*v_approved/100)::bigint;
 v_delta:=v_target-v_total;
 if v_delta<0 then raise exception 'co_credit_immutable_conflict'; end if;
 select coalesce(sum(delta_cents),0)::bigint into v_scope_total
   from tracker.live_co_credit_events where scope_id=v_scope;
 if v_scope_total+v_delta>v_price then raise exception 'co_credit_exceeds_subcontract'; end if;
 insert into tracker.live_co_validations(task_id,validated_pct,reviewed_by)
   values(v_report.task_id,v_approved,v_actor)
   on conflict(task_id) do update set validated_pct=excluded.validated_pct,
     reviewed_by=excluded.reviewed_by,updated_at=now();
 update tracker.live_co_reports set status='validated',reviewed_at=now(),
   reviewed_by=v_actor,review_reason=nullif(v_reason,'') where id=p_report_id;
 insert into tracker.live_co_credit_events(report_id,task_id,scope_id,co_id,sub_id,
   delta_cents,validated_pct)
   values(p_report_id,v_report.task_id,v_scope,v_co,v_sub,v_delta,v_approved);
 insert into tracker.live_co_audit_events(co_id,actor_id,action,task_id,report_id,detail)
   values(v_co,v_actor,'validated',v_report.task_id,p_report_id,'PM validated CO progress (not payment)');
 return pg_catalog.jsonb_build_object('status','validated','new_credit_cents',v_delta,
   'validated_percent',v_approved,'payment_authorized',false);
end;
$$;

revoke all on function tracker.live_co_create_draft(uuid,text,text,bigint),
  tracker.live_co_add_scope(uuid,text,uuid,bigint),
  tracker.live_co_add_task(uuid,text,numeric),
  tracker.live_co_submit(uuid),
  tracker.live_co_client_decide(uuid,boolean,text),
  tracker.live_co_activate(uuid),
  tracker.live_co_review_report(uuid,text,numeric,text) from public,anon;
grant execute on function tracker.live_co_create_draft(uuid,text,text,bigint),
  tracker.live_co_add_scope(uuid,text,uuid,bigint),
  tracker.live_co_add_task(uuid,text,numeric),
  tracker.live_co_submit(uuid),
  tracker.live_co_client_decide(uuid,boolean,text),
  tracker.live_co_activate(uuid),
  tracker.live_co_review_report(uuid,text,numeric,text) to authenticated;






create table tracker.live_co_requests (
 id uuid primary key default pg_catalog.gen_random_uuid(),
 project_id uuid not null references tracker.live_projects(id),
 requester_id uuid not null default auth.uid(),
 title text not null check(length(title) between 1 and 120),
 description text not null default '' check(length(description)<=500),
 status text not null default 'pending' check(status in ('pending','formalized','declined')),
 linked_co_id uuid unique references tracker.live_change_orders(id),
 response_reason text check(length(response_reason)<=300),
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create table tracker.live_co_request_events (
 id uuid primary key default pg_catalog.gen_random_uuid(),
 request_id uuid not null references tracker.live_co_requests(id),
 actor_id uuid not null,
 action text not null check(action in ('requested','formalized','declined')),
 detail text,
 created_at timestamptz not null default now()
);
revoke all on tracker.live_co_requests,tracker.live_co_request_events
 from public,anon,authenticated;
grant select on tracker.live_co_requests,tracker.live_co_request_events to authenticated;

grant insert(project_id,title,description) on tracker.live_co_requests to authenticated;
alter table tracker.live_co_requests enable row level security;
alter table tracker.live_co_request_events enable row level security;
create policy live_co_request_read on tracker.live_co_requests
 for select to authenticated
 using (tracker_private.workspace_is_pm(project_id) or
   (requester_id=(select auth.uid()) and tracker_private.workspace_is_member(project_id)));
create policy live_co_request_insert on tracker.live_co_requests
 for insert to authenticated
 with check (requester_id=(select auth.uid()) and
   (tracker_private.workspace_is_pm(project_id) or tracker_private.workspace_is_member(project_id)) and
   status='pending' and linked_co_id is null and reviewed_by is null and reviewed_at is null);
create policy live_co_request_event_read on tracker.live_co_request_events
 for select to authenticated
 using (exists(select 1 from tracker.live_co_requests r where r.id=request_id
    and (tracker_private.workspace_is_pm(r.project_id)
      or (r.requester_id=(select auth.uid()) and tracker_private.workspace_is_member(r.project_id)))));

create function tracker_private.workspace_audit_co_request()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into tracker.live_co_request_events(request_id,actor_id,action,detail)
   values(new.id,new.requester_id,'requested','CO request submitted for PM evaluation');
 return new;
end;
$$;
revoke all on function tracker_private.workspace_audit_co_request() from public,anon,authenticated;
create trigger live_co_request_audit after insert on tracker.live_co_requests
 for each row execute function tracker_private.workspace_audit_co_request();

create function tracker.live_co_formalize_request(p_request_id uuid,p_client_cents bigint)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_request tracker.live_co_requests%rowtype;
 v_co jsonb;
begin
 select * into v_request from tracker.live_co_requests where id=p_request_id for update;
 if not found then raise exception 'co_request_not_found'; end if;
 if v_actor is null or not tracker_private.workspace_is_pm(v_request.project_id)
   then raise exception 'pm_required' using errcode='42501'; end if;
 if v_request.status<>'pending' then raise exception 'co_request_already_handled'; end if;
 -- This RPC checks baseline freeze, price validity, PM role and writes draft
 -- plus client-terms/audit in the SAME transaction.
 v_co:=tracker.live_co_create_draft(v_request.project_id,v_request.title,
    v_request.description,p_client_cents);
 update tracker.live_co_requests set status='formalized',
    linked_co_id=(v_co->>'co_id')::uuid,reviewed_at=now(),reviewed_by=v_actor
    where id=p_request_id;
 insert into tracker.live_co_request_events(request_id,actor_id,action,detail)
   values(p_request_id,v_actor,'formalized','PM opened independently priced CO draft; not client approved');
 return pg_catalog.jsonb_build_object('request_id',p_request_id,
    'co_id',v_co->>'co_id','status','formalized',
    'payment_authorized',false,'client_approved',false);
end;
$$;
create function tracker.live_co_decline_request(p_request_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_request tracker.live_co_requests%rowtype;
 v_reason text:=pg_catalog.btrim(coalesce(p_reason,''));
begin
 select * into v_request from tracker.live_co_requests where id=p_request_id for update;
 if not found then raise exception 'co_request_not_found'; end if;
 if v_actor is null or not tracker_private.workspace_is_pm(v_request.project_id)
   then raise exception 'pm_required' using errcode='42501'; end if;
 if v_request.status<>'pending' then raise exception 'co_request_already_handled'; end if;
 if length(v_reason)<1 or length(v_reason)>300 then raise exception 'reason_required'; end if;
 update tracker.live_co_requests set status='declined',
    reviewed_at=now(),reviewed_by=v_actor,response_reason=v_reason
    where id=p_request_id;
 insert into tracker.live_co_request_events(request_id,actor_id,action,detail)
   values(p_request_id,v_actor,'declined',v_reason);
 return pg_catalog.jsonb_build_object('status','declined','payment_authorized',false);
end;
$$;
revoke all on function tracker.live_co_formalize_request(uuid,bigint),
 tracker.live_co_decline_request(uuid,text) from public,anon;
grant execute on function tracker.live_co_formalize_request(uuid,bigint),
 tracker.live_co_decline_request(uuid,text) to authenticated;




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
