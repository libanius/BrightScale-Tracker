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



