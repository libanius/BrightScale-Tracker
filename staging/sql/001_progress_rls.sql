-- BrightScale Tracker 2.0: ISOLATED STAGING-ONLY progress RLS prototype.
-- NEVER run this against brightscale-scanner / Abre-USA / any production project.
-- This migration intentionally uses the public schema of a NEW, EMPTY Supabase
-- staging project to avoid changing the exposed-schema settings of production.
-- Prerequisite: dedicated, empty Supabase project + auth.uid() + authenticated role.
-- No external clients, payments, real projects or data imports.
begin;

create schema if not exists pilot_priv;
revoke all on schema pilot_priv from public, anon, authenticated;
grant usage on schema pilot_priv to authenticated;

create table public.pilot_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null check (length(name) between 1 and 120),
  baseline_version integer not null default 1 check (baseline_version > 0),
  created_at timestamptz not null default now()
);
create table public.pilot_memberships (
  project_id uuid not null references public.pilot_projects(id),
  user_id uuid not null,
  role text not null check (role in ('sub','client')),
  created_at timestamptz not null default now(),
  primary key(project_id,user_id)
);
create table public.pilot_scopes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pilot_projects(id),
  name text not null check(length(name) between 1 and 120),
  created_at timestamptz not null default now()
);
create table public.pilot_assignments (
  scope_id uuid primary key references public.pilot_scopes(id),
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create table public.pilot_scope_terms (
  scope_id uuid primary key references public.pilot_scopes(id),
  subcontract_cents bigint not null check(subcontract_cents >= 0 and subcontract_cents <= 100000000000),
  created_at timestamptz not null default now()
);
create table public.pilot_tasks (
  id uuid primary key default gen_random_uuid(),
  scope_id uuid not null references public.pilot_scopes(id),
  title text not null check(length(title) between 1 and 160),
  weight_pct numeric(5,2) not null check(weight_pct > 0 and weight_pct <= 100),
  created_at timestamptz not null default now()
);
create table public.pilot_reports (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.pilot_tasks(id),
  author_id uuid not null default auth.uid(),
  reported_pct numeric(5,2) not null check(reported_pct >= 0 and reported_pct <= 100),
  note text not null default '' check(length(note) <= 300),
  status text not null default 'pending' check(status in ('pending','validated','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text check(length(review_reason) <= 300)
);
create unique index pilot_one_pending_per_task on public.pilot_reports(task_id) where status='pending';

create table public.pilot_validations (
  task_id uuid primary key references public.pilot_tasks(id),
  validated_pct numeric(5,2) not null check(validated_pct >= 0 and validated_pct <= 100),
  reviewed_by uuid not null,
  updated_at timestamptz not null default now()
);
create table public.pilot_credit_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.pilot_reports(id),
  task_id uuid not null references public.pilot_tasks(id),
  sub_id uuid not null,
  delta_cents bigint not null check(delta_cents >= 0),
  validated_pct numeric(5,2) not null,
  baseline_version integer not null,
  created_at timestamptz not null default now()
);
create table public.pilot_audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pilot_projects(id),
  task_id uuid references public.pilot_tasks(id),
  report_id uuid references public.pilot_reports(id),
  actor_id uuid not null,
  action text not null check(action in ('reported','validated','rejected')),
  reported_pct numeric(5,2),
  validated_pct numeric(5,2),
  reason text,
  created_at timestamptz not null default now()
);

-- All permission helpers execute with an explicit, restricted search_path.
-- Helpers query protected tables with their function owner's privileges to avoid
-- recursive RLS policy lookups; authorization ALWAYS resolves auth.uid().
create function pilot_priv.is_pm(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.pilot_projects p
    where p.id = p_project and p.owner_id = (select auth.uid()))
$$;
create function pilot_priv.is_member(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.pilot_memberships m
    where m.project_id=p_project and m.user_id=(select auth.uid()))
$$;
create function pilot_priv.is_client(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.pilot_memberships m
    where m.project_id=p_project and m.user_id=(select auth.uid()) and m.role='client')
$$;
create function pilot_priv.can_assign_sub(p_scope uuid, p_sub uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.pilot_scopes s
    join public.pilot_memberships m on m.project_id=s.project_id
    where s.id=p_scope and m.user_id=p_sub and m.role='sub'
  )
$$;
create function pilot_priv.is_scope_sub(p_scope uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.pilot_scopes s
    join public.pilot_assignments a on a.scope_id=s.id
    join public.pilot_memberships m on m.project_id=s.project_id
      and m.user_id=a.user_id and m.role='sub'
    where s.id=p_scope and a.user_id=(select auth.uid())
  )
$$;
create function pilot_priv.can_read_scope(p_scope uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.pilot_scopes s where s.id=p_scope and (
      pilot_priv.is_pm(s.project_id) or pilot_priv.is_client(s.project_id)
      or pilot_priv.is_scope_sub(s.id)
    )
  )
$$;
create function pilot_priv.is_pm_task(p_task uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.pilot_tasks t
    join public.pilot_scopes s on s.id=t.scope_id
    where t.id=p_task and pilot_priv.is_pm(s.project_id))
$$;
create function pilot_priv.can_read_task(p_task uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.pilot_tasks t where t.id=p_task
    and pilot_priv.can_read_scope(t.scope_id))
$$;
create function pilot_priv.is_sub_task(p_task uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.pilot_tasks t
    where t.id=p_task and pilot_priv.is_scope_sub(t.scope_id))
$$;

revoke all on all functions in schema pilot_priv from public, anon, authenticated;
grant execute on all functions in schema pilot_priv to authenticated;

-- No direct write permissions to validated progress, credit ledger or audit.
revoke all on public.pilot_projects,public.pilot_memberships,public.pilot_scopes,
  public.pilot_assignments,public.pilot_scope_terms,public.pilot_tasks,
  public.pilot_reports,public.pilot_validations,public.pilot_credit_events,
  public.pilot_audit_events from public,anon,authenticated;

-- Column-level INSERT grants prevent clients forging server timestamps, ownership,
-- statuses, review actors or immutable baseline/credit metadata.
grant select on public.pilot_projects,public.pilot_memberships,public.pilot_scopes,
  public.pilot_assignments,public.pilot_scope_terms,public.pilot_tasks,
  public.pilot_reports,public.pilot_validations,public.pilot_credit_events,
  public.pilot_audit_events to authenticated;
grant insert(id,name) on public.pilot_projects to authenticated;
grant insert(project_id,user_id,role) on public.pilot_memberships to authenticated;
grant delete on public.pilot_memberships to authenticated;
grant insert(id,project_id,name) on public.pilot_scopes to authenticated;
grant insert(scope_id,user_id) on public.pilot_assignments to authenticated;
grant delete on public.pilot_assignments to authenticated;
grant insert(scope_id,subcontract_cents) on public.pilot_scope_terms to authenticated;
grant insert(id,scope_id,title,weight_pct) on public.pilot_tasks to authenticated;
grant insert(id,task_id,reported_pct,note) on public.pilot_reports to authenticated;

alter table public.pilot_projects enable row level security;
alter table public.pilot_memberships enable row level security;
alter table public.pilot_scopes enable row level security;
alter table public.pilot_assignments enable row level security;
alter table public.pilot_scope_terms enable row level security;
alter table public.pilot_tasks enable row level security;
alter table public.pilot_reports enable row level security;
alter table public.pilot_validations enable row level security;
alter table public.pilot_credit_events enable row level security;
alter table public.pilot_audit_events enable row level security;

create policy pilot_projects_read on public.pilot_projects for select to authenticated
  using (owner_id=(select auth.uid()) or (select pilot_priv.is_member(id)));
create policy pilot_projects_create on public.pilot_projects for insert to authenticated
  with check (owner_id=(select auth.uid()));
create policy pilot_memberships_read on public.pilot_memberships for select to authenticated
  using (user_id=(select auth.uid()) or pilot_priv.is_pm(project_id));
create policy pilot_memberships_create on public.pilot_memberships for insert to authenticated
  with check (pilot_priv.is_pm(project_id));
create policy pilot_memberships_revoke on public.pilot_memberships for delete to authenticated
  using (pilot_priv.is_pm(project_id));

create policy pilot_scopes_read on public.pilot_scopes for select to authenticated
  using (pilot_priv.can_read_scope(id));
create policy pilot_scopes_create on public.pilot_scopes for insert to authenticated
  with check (pilot_priv.is_pm(project_id));
create policy pilot_assignments_read on public.pilot_assignments for select to authenticated
  using (
    (user_id=(select auth.uid()) and pilot_priv.is_scope_sub(scope_id))
    or pilot_priv.can_read_scope(scope_id) and
      exists(select 1 from public.pilot_scopes s where s.id=scope_id and pilot_priv.is_pm(s.project_id))
  );
create policy pilot_assignments_create on public.pilot_assignments for insert to authenticated
  with check (pilot_priv.can_assign_sub(scope_id,user_id) and
    exists(select 1 from public.pilot_scopes s where s.id=scope_id and pilot_priv.is_pm(s.project_id)));
create policy pilot_assignments_revoke on public.pilot_assignments for delete to authenticated
  using (exists(select 1 from public.pilot_scopes s where s.id=scope_id and pilot_priv.is_pm(s.project_id)));

create policy pilot_terms_read on public.pilot_scope_terms for select to authenticated
  using (
    pilot_priv.is_scope_sub(scope_id) or
    exists(select 1 from public.pilot_scopes s where s.id=scope_id and pilot_priv.is_pm(s.project_id))
  );
create policy pilot_terms_create on public.pilot_scope_terms for insert to authenticated
  with check (exists(select 1 from public.pilot_scopes s where s.id=scope_id and pilot_priv.is_pm(s.project_id)));
create policy pilot_tasks_read on public.pilot_tasks for select to authenticated
  using (pilot_priv.can_read_scope(scope_id));
create policy pilot_tasks_create on public.pilot_tasks for insert to authenticated
  with check (exists(select 1 from public.pilot_scopes s where s.id=scope_id and pilot_priv.is_pm(s.project_id)));

create policy pilot_reports_read on public.pilot_reports for select to authenticated
  using ((author_id=(select auth.uid()) and pilot_priv.is_sub_task(task_id)) or pilot_priv.is_pm_task(task_id));
create policy pilot_reports_create on public.pilot_reports for insert to authenticated
  with check (
    author_id=(select auth.uid()) and status='pending'
    and reviewed_at is null and reviewed_by is null and review_reason is null
    and pilot_priv.is_sub_task(task_id)
    and reported_pct >= coalesce((select v.validated_pct from public.pilot_validations v where v.task_id=pilot_reports.task_id),0)
  );
create policy pilot_validations_read on public.pilot_validations for select to authenticated
  using (pilot_priv.can_read_task(task_id));
create policy pilot_credit_read on public.pilot_credit_events for select to authenticated
  using ((sub_id=(select auth.uid()) and pilot_priv.is_sub_task(task_id)) or pilot_priv.is_pm_task(task_id));
create policy pilot_audit_read on public.pilot_audit_events for select to authenticated
  using (pilot_priv.is_pm(project_id));

-- Server-side audit trail for reports; no client-provided timestamp or actor.
create function pilot_priv.audit_sub_report()
returns trigger language plpgsql security definer set search_path = ''
as $
declare v_project uuid;
begin
  select s.project_id into v_project from public.pilot_tasks t
    join public.pilot_scopes s on s.id=t.scope_id where t.id=new.task_id;
  insert into public.pilot_audit_events(project_id,task_id,report_id,actor_id,action,reported_pct)
    values(v_project,new.task_id,new.id,new.author_id,'reported',new.reported_pct);
  return new;
end;
$$;
revoke all on function pilot_priv.audit_sub_report() from public,anon,authenticated;
create trigger pilot_report_audit after insert on public.pilot_reports
  for each row execute function pilot_priv.audit_sub_report();

-- All approvals go through one atomic, audited database operation. The DB
-- verifies the actual JWT subject, not role strings supplied by a browser.
create function public.pilot_review_report(
  p_report_id uuid, p_action text, p_approved_pct numeric default null, p_reason text default ''
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_report public.pilot_reports%rowtype;
  v_project uuid;
  v_scope uuid;
  v_task_weight numeric;
  v_contract bigint;
  v_baseline integer;
  v_previous numeric := 0;
  v_approved numeric;
  v_current bigint := 0;
  v_target bigint := 0;
  v_delta bigint := 0;
  v_reason text := pg_catalog.btrim(coalesce(p_reason,''));
begin
  if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_action not in ('approve','reject') or p_action is null then raise exception 'invalid_action'; end if;
  if length(v_reason)>300 then raise exception 'reason_too_long'; end if;

  select * into v_report from public.pilot_reports where id=p_report_id for update;
  if not found then raise exception 'report_not_found'; end if;
  if v_report.status <> 'pending' then raise exception 'already_reviewed'; end if;
  select s.project_id, t.scope_id,t.weight_pct,p.baseline_version
    into v_project,v_scope,v_task_weight,v_baseline
    from public.pilot_tasks t
    join public.pilot_scopes s on s.id=t.scope_id
    join public.pilot_projects p on p.id=s.project_id
    where t.id=v_report.task_id;
  if not pilot_priv.is_pm(v_project) then raise exception 'pm_required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_report.task_id::text,0));
  select validated_pct into v_previous from public.pilot_validations where task_id=v_report.task_id for update;
  v_previous := coalesce(v_previous,0);

  if p_action='reject' then
    if v_reason='' then raise exception 'reason_required'; end if;
    update public.pilot_reports set status='rejected', reviewed_at=now(),
      reviewed_by=v_actor, review_reason=v_reason where id=p_report_id;
    insert into public.pilot_audit_events(project_id,task_id,report_id,actor_id,action,reported_pct,validated_pct,reason)
      values(v_project,v_report.task_id,p_report_id,v_actor,'rejected',v_report.reported_pct,v_previous,v_reason);
    return pg_catalog.jsonb_build_object('status','rejected','validated_percent',v_previous,'new_credit_cents',0,'payment_authorized',false);
  end if;

  v_approved := coalesce(p_approved_pct,v_report.reported_pct);
  if v_approved < v_previous or v_approved > 100 or v_approved < 0 then
    raise exception 'invalid_or_decreasing_validation';
  end if;
  if v_approved <> v_report.reported_pct and v_reason='' then raise exception 'reason_required'; end if;

  select subcontract_cents into v_contract from public.pilot_scope_terms where scope_id=v_scope;
  if not found then raise exception 'scope_terms_missing'; end if;
  select coalesce(sum(delta_cents),0)::bigint into v_current from public.pilot_credit_events
    where task_id=v_report.task_id;
  v_target := round(v_contract * v_task_weight / 100 * v_approved / 100)::bigint;
  v_delta := v_target-v_current;
  if v_delta < 0 then raise exception 'immutable_credit_conflict'; end if;

  insert into public.pilot_validations(task_id,validated_pct,reviewed_by)
    values(v_report.task_id,v_approved,v_actor)
    on conflict(task_id) do update set validated_pct=excluded.validated_pct,
      reviewed_by=excluded.reviewed_by, updated_at=now();

  update public.pilot_reports set status='validated', reviewed_at=now(),
    reviewed_by=v_actor, review_reason=nullif(v_reason,'') where id=p_report_id;

  insert into public.pilot_credit_events(report_id,task_id,sub_id,delta_cents,validated_pct,baseline_version)
    values(p_report_id,v_report.task_id,v_report.author_id,v_delta,v_approved,v_baseline);
  insert into public.pilot_audit_events(project_id,task_id,report_id,actor_id,action,reported_pct,validated_pct,reason)
    values(v_project,v_report.task_id,p_report_id,v_actor,'validated',v_report.reported_pct,v_approved,nullif(v_reason,''));

  return pg_catalog.jsonb_build_object('status','validated','validated_percent',v_approved,
    'new_credit_cents',v_delta,'payment_authorized',false);
end;
$$;

revoke all on function public.pilot_review_report(uuid,text,numeric,text) from public, anon;
grant execute on function public.pilot_review_report(uuid,text,numeric,text) to authenticated;

-- Data API may expose public; anonymous access to these entities is forbidden.
-- Never grant direct INSERT/UPDATE/DELETE on validated progress, credit or audit.
commit;
