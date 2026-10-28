-- Abandoned initial scaffold, unused by the live_* workspace.
-- No data removal or changes to live_*, public or private objects.
do $secure$
declare
  table_name text;
begin
  foreach table_name in array array[
    'pilot_projects','pilot_scopes','pilot_scope_terms','pilot_tasks',
    'pilot_reports','pilot_validations','pilot_credit_events',
    'pilot_audit_events','pilot_memberships','pilot_assignments'
  ] loop
    if to_regclass(format('tracker.%I', table_name)) is not null then
      execute format('alter table tracker.%I enable row level security', table_name);
      execute format('revoke all on table tracker.%I from public, anon, authenticated', table_name);
    end if;
  end loop;
end
$secure$;
