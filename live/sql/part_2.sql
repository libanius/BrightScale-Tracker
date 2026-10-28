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

