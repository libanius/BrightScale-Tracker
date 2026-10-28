-- BrightScale Tracker 2.0 | staging pilot: original baseline approval.
-- Apply ONLY AFTER 001_progress_rls.sql in a disposable PG17 test database
-- or a BRAND-NEW, EMPTY, separately authorized Supabase staging project.
-- NEVER apply to production or the shared brightscale-scanner project.
begin;

alter table public.pilot_projects
  add column baseline_frozen_at timestamptz,
  add column baseline_frozen_by uuid;

-- Audits of this scope are immutable for authenticated clients.
alter table public.pilot_audit_events
  drop constraint pilot_audit_events_action_check;
alter table public.pilot_audit_events
  add constraint pilot_audit_events_action_check
  check (action in ('reported','validated','rejected','baseline_frozen'));

-- A baseline write must serialize with the freeze operation. Even concurrent
-- requests cannot sneak tasks, scopes or terms in after the PM has frozen it.
create function pilot_priv.assert_baseline_open(p_project uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_frozen timestamptz;
begin
  select baseline_frozen_at into v_frozen
    from public.pilot_projects where id=p_project for update;
  if not found then raise exception 'baseline_project_not_found'; end if;
  if v_frozen is not null then raise exception 'baseline_already_frozen' using errcode='23514'; end if;
end;
$$;
revoke all on function pilot_priv.assert_baseline_open(uuid) from public,anon,authenticated;

create function pilot_priv.reject_frozen_baseline_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_project uuid;
begin
  if TG_TABLE_NAME='pilot_scopes' then
    v_project := new.project_id;
  elsif TG_TABLE_NAME in ('pilot_scope_terms','pilot_tasks') then
    select s.project_id into v_project from public.pilot_scopes s
    where s.id=case when TG_TABLE_NAME='pilot_tasks' then new.scope_id else new.scope_id end;
  else
    raise exception 'baseline_unexpected_table';
  end if;
  perform pilot_priv.assert_baseline_open(v_project);
  return new;
end;
$$;
revoke all on function pilot_priv.reject_frozen_baseline_insert() from public,anon,authenticated;
create trigger pilot_protect_scope_baseline
  before insert on public.pilot_scopes
  for each row execute function pilot_priv.reject_frozen_baseline_insert();
create trigger pilot_protect_terms_baseline
  before insert on public.pilot_scope_terms
  for each row execute function pilot_priv.reject_frozen_baseline_insert();
create trigger pilot_protect_task_baseline
  before insert on public.pilot_tasks
  for each row execute function pilot_priv.reject_frozen_baseline_insert();

-- Keep the task-weight guard of 001_progress_rls.sql in force. The PM may freeze
-- only a complete, internally consistent scope catalog; every scope's tasks
-- total exactly 100%, and terms must be configured.
create function public.pilot_freeze_baseline(p_project_id uuid)
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
    into v_owner,v_frozen_at from public.pilot_projects
    where id=p_project_id for update;
  if not found then raise exception 'baseline_project_not_found'; end if;
  if v_owner<>v_actor then raise exception 'pm_required' using errcode='42501'; end if;
  if v_frozen_at is not null then raise exception 'baseline_already_frozen'; end if;

  select count(*) into v_scope_count from public.pilot_scopes where project_id=p_project_id;
  if v_scope_count=0 then raise exception 'baseline_requires_scopes'; end if;
  select count(*) into v_invalid_count
  from public.pilot_scopes s
  left join public.pilot_scope_terms st on st.scope_id=s.id
  where s.project_id=p_project_id and (
    st.scope_id is null
    or coalesce((select sum(t.weight_pct) from public.pilot_tasks t where t.scope_id=s.id),0)<>100
  );
  if v_invalid_count<>0 then raise exception 'baseline_incomplete_scope_weights_or_terms'; end if;

  update public.pilot_projects
    set baseline_frozen_at=now(),baseline_frozen_by=v_actor
    where id=p_project_id;
  insert into public.pilot_audit_events(project_id,actor_id,action,reason)
    values(p_project_id,v_actor,'baseline_frozen','PM confirmed original baseline and task weights');
  return pg_catalog.jsonb_build_object(
    'status','frozen','project_id',p_project_id,
    'baseline_version',1,'scope_count',v_scope_count,
    'payment_authorized',false);
end;
$$;
revoke all on function public.pilot_freeze_baseline(uuid) from public,anon;
grant execute on function public.pilot_freeze_baseline(uuid) to authenticated;

create function pilot_priv.is_frozen_task(p_task uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.pilot_tasks t
    join public.pilot_scopes s on s.id=t.scope_id
    join public.pilot_projects p on p.id=s.project_id
    where t.id=p_task and p.baseline_frozen_at is not null)
$$;
revoke all on function pilot_priv.is_frozen_task(uuid) from public,anon;
grant execute on function pilot_priv.is_frozen_task(uuid) to authenticated;

-- No progress may be reported against a draft baseline, even if task IDs and
-- sub assignments already exist. As before, the PM alone reviews reports.
drop policy pilot_reports_create on public.pilot_reports;
create policy pilot_reports_create on public.pilot_reports for insert to authenticated
  with check (
    author_id=(select auth.uid()) and status='pending'
    and reviewed_at is null and reviewed_by is null and review_reason is null
    and pilot_priv.is_sub_task(task_id)
    and pilot_priv.is_frozen_task(task_id)
    and reported_pct >= coalesce(
      (select v.validated_pct from public.pilot_validations v where v.task_id=pilot_reports.task_id),0
    )
  );

commit;
