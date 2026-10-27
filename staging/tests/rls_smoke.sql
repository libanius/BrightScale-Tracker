-- Full RLS smoke run in a disposable local PostgreSQL 17 database.
-- Uses test-only JWT claim emulation. NOT equivalent to real Supabase sign-in.
-- Expected exit status: 0. psql must have ON_ERROR_STOP=1.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.pilot_projects(id,name)
  values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SYNTHETIC Flooring Pilot');
insert into public.pilot_memberships(project_id,user_id,role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','sub'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','client');
insert into public.pilot_scopes(id,project_id,name) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SYNTHETIC Flooring'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SYNTHETIC Painting');
insert into public.pilot_assignments(scope_id,user_id) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222');
insert into public.pilot_scope_terms(scope_id,subcontract_cents) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',240000),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc',120000);
insert into public.pilot_tasks(id,scope_id,title,weight_pct) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','SYNTHETIC Install LVP',60),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc','SYNTHETIC Paint Walls',100);
-- Regression: PM cannot add a task whose weight would over-allocate a scope.
do $$
begin
  begin
    insert into public.pilot_tasks(id,scope_id,title,weight_pct) values
      ('cccccccc-cccc-4ccc-8ccc-ccccccccccce',
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       'SYNTHETIC Overallocated LVP', 41);
    raise exception 'security_fail_scope_weight_over_100';
  exception when raise_exception then
    if sqlerrm <> 'scope_weight_exceeds_100' then raise; end if;
  end;
  if (select coalesce(sum(weight_pct),0)
      from public.pilot_tasks where scope_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')<>60
    then raise exception 'scope_weight_mutated_after_rejection'; end if;
end $$;
do $$
begin
 if (select count(*) from public.pilot_projects) <> 1 then raise exception 'pm_project_setup_failed'; end if;
 if (select count(*) from public.pilot_scope_terms) <> 2 then raise exception 'pm_cannot_read_terms'; end if;
end $$;
commit;

-- Sub can report ONLY his assigned scope. No recognized credit until review.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
begin
 if (select count(*) from public.pilot_tasks) <> 1 then raise exception 'sub_can_see_foreign_task'; end if;
 if (select count(*) from public.pilot_scope_terms) <> 1 then raise exception 'sub_terms_scope_invalid'; end if;
 if (select count(*) from public.pilot_memberships) <> 1 then raise exception 'sub_membership_visibility_invalid'; end if;
end $$;
insert into public.pilot_reports (id,task_id,reported_pct,note) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc',40,'Synthetic progress');
do $$
begin
 if (select count(*) from public.pilot_reports)<>1 then raise exception 'report_not_visible_to_sub'; end if;
 if (select count(*) from public.pilot_validations)<>0 then raise exception 'sub_changed_official_progress'; end if;
 if (select count(*) from public.pilot_credit_events)<>0 then raise exception 'credit_without_approval'; end if;
end $$;
do $$
begin
 begin
  insert into public.pilot_reports(id,task_id,reported_pct,note)
   values('dddddddd-dddd-4ddd-8ddd-ddddddddddde','cccccccc-cccc-4ccc-8ccc-cccccccccccd',50,'Forbidden scope');
  raise exception 'security_fail_sub_reported_other_scope';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.pilot_validations set validated_pct=100;
  raise exception 'security_fail_sub_updated_validation';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.pilot_review_report('dddddddd-dddd-4ddd-8ddd-dddddddddddd','approve',40,'');
  raise exception 'security_fail_sub_approved';
 exception when insufficient_privilege then null;
 end;
end $$;
commit;

-- Client can see the project's tasks but NOT reports, credit, terms or audit.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$
begin
 if (select count(*) from public.pilot_projects)<>1 then raise exception 'client_cannot_see_project'; end if;
 if (select count(*) from public.pilot_tasks)<>2 then raise exception 'client_tasks_visibility_failed'; end if;
 if (select count(*) from public.pilot_reports)<>0 then raise exception 'client_can_see_reports'; end if;
 if (select count(*) from public.pilot_scope_terms)<>0 then raise exception 'client_can_see_sub_terms'; end if;
 if (select count(*) from public.pilot_credit_events)<>0 then raise exception 'client_can_see_credits'; end if;
 if (select count(*) from public.pilot_audit_events)<>0 then raise exception 'client_can_see_audit'; end if;
 if (select count(*) from public.pilot_validations)<>0 then raise exception 'client_saw_unapproved'; end if;
end $$;
do $$
begin
 begin
  insert into public.pilot_reports(id,task_id,reported_pct)
   values('dddddddd-dddd-4ddd-8ddd-dddddddddddf','cccccccc-cccc-4ccc-8ccc-cccccccccccc',99);
  raise exception 'security_fail_client_reported_progress';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.pilot_review_report('dddddddd-dddd-4ddd-8ddd-dddddddddddd','approve',40,'');
  raise exception 'security_fail_client_approved';
 exception when insufficient_privilege then null;
 end;
end $$;
commit;

-- An outsider with a valid authenticated role sees NOTHING.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
do $$
begin
 if (select count(*) from public.pilot_projects)<>0 then raise exception 'outsider_can_see_project'; end if;
 if (select count(*) from public.pilot_tasks)<>0 then raise exception 'outsider_can_see_tasks'; end if;
 if (select count(*) from public.pilot_credit_events)<>0 then raise exception 'outsider_can_see_money'; end if;
 if (select count(*) from public.pilot_reports)<>0 then raise exception 'outsider_can_see_reports'; end if;
end $$;
commit;

-- PM alone finalizes; ledger contains one delta and audit has report+approval.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select public.pilot_review_report('dddddddd-dddd-4ddd-8ddd-dddddddddddd','approve',40,'') as approved;
do $$
begin
 if (select validated_pct from public.pilot_validations
     where task_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>40
     then raise exception 'official_progress_not_40'; end if;
 if (select sum(delta_cents) from public.pilot_credit_events)<>57600
     then raise exception 'credit_not_57600_cents'; end if;
 if (select count(*) from public.pilot_audit_events)<>2
     then raise exception 'audit_missing_report_or_review'; end if;
 if (select author_id from public.pilot_reports
     where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd')
     <> '22222222-2222-4222-8222-222222222222'::uuid
     then raise exception 'report_actor_not_server_generated'; end if;
end $$;
do $$
begin
 begin
  perform public.pilot_review_report('dddddddd-dddd-4ddd-8ddd-dddddddddddd','approve',80,'');
  raise exception 'duplicate_approval_accepted';
 exception when raise_exception then
  -- Only already_reviewed is valid; do not catch our own failure as success.
  if sqlerrm <> 'already_reviewed' then raise; end if;
 end;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$
begin
 if (select validated_pct from public.pilot_validations
     where task_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 40
     then raise exception 'client_does_not_see_40'; end if;
 if (select count(*) from public.pilot_credit_events)<>0 then raise exception 'client_saw_credit_after_review'; end if;
 if (select count(*) from public.pilot_reports)<>0 then raise exception 'client_saw_private_report_after_review'; end if;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
begin
 if (select sum(delta_cents) from public.pilot_credit_events)<>57600
     then raise exception 'sub_cannot_see_own_credit'; end if;
 if (select count(*) from public.pilot_audit_events)<>0
     then raise exception 'sub_can_see_pm_audit'; end if;
end $$;
commit;

-- A PM may revoke a sub's project membership. Access disappears immediately.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
delete from public.pilot_memberships where project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 and user_id='22222222-2222-4222-8222-222222222222';
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
begin
 if (select count(*) from public.pilot_tasks)<>0 then raise exception 'revoked_sub_still_sees_tasks'; end if;
 if (select count(*) from public.pilot_scope_terms)<>0 then raise exception 'revoked_sub_sees_terms'; end if;
 -- Historic credit remains visible to its recipient; not suitable for strict
 -- immediate revocation. This assertion deliberately catches such exposure.
 if (select count(*) from public.pilot_credit_events)<>0 then raise exception 'revoked_sub_sees_credit'; end if;
end $$;
commit;

-- Additional negative checks: clients cannot forge author, timestamps or policy grants.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
begin
 begin
   insert into public.pilot_reports(id,task_id,reported_pct,note,author_id)
    values('dddddddd-dddd-4ddd-8ddd-dddddddddddc','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      90,'forged','11111111-1111-4111-8111-111111111111');
   raise exception 'security_fail_sub_forged_report_author';
 exception when insufficient_privilege then null;
 end;
 begin
   insert into public.pilot_reports(id,task_id,reported_pct,note,created_at)
    values('dddddddd-dddd-4ddd-8ddd-dddddddddddb','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      90,'forged',timestamp with time zone '1990-01-01');
   raise exception 'security_fail_sub_forged_report_time';
 exception when insufficient_privilege then null;
 end;
 begin
   update public.pilot_scope_terms set subcontract_cents=0;
   raise exception 'security_fail_sub_updated_subcontract';
 exception when insufficient_privilege then null;
 end;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$
begin
 begin
   insert into public.pilot_memberships(project_id,user_id,role)
    values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','44444444-4444-4444-8444-444444444444','sub');
   raise exception 'security_fail_client_assigned_member';
 exception when insufficient_privilege then null;
 end;
 begin
   insert into public.pilot_credit_events(report_id,task_id,sub_id,delta_cents,validated_pct,baseline_version)
    values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '33333333-3333-4333-8333-333333333333',999,100,1);
   raise exception 'security_fail_client_forged_credit';
 exception when insufficient_privilege then null;
 end;
end $$;
commit;

begin;
set local role anon;
do $$
begin
 begin
   perform count(*) from public.pilot_projects;
   raise exception 'security_fail_anon_queried_projects';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;

-- No writes to production. This is a throwaway local CI database.
