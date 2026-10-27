-- For disposable GitHub Actions PostgreSQL 17 only; NEVER Supabase real.
-- The password and JWT secret in CI are synthetic and NEVER valid outside the runner.
create role pilot_authenticator login noinherit password 'SYNTHETIC_CI_ONLY_PASS_2026';
grant anon, authenticated to pilot_authenticator;
grant usage on schema public to pilot_authenticator;

-- CI-only debug RPC: synthetic identities only, never part of staging migration.
create function public.pilot_ci_auth_probe(p_project uuid) returns jsonb
language sql stable security invoker set search_path = ''
as $$
 select pg_catalog.jsonb_build_object(
  'uid', auth.uid(),
  'role', current_user,
  'owner', (select p.owner_id from public.pilot_projects p where p.id=p_project),
  'is_pm', pilot_priv.is_pm(p_project),
  'legacy', current_setting('request.jwt.claim.sub',true),
  'json', current_setting('request.jwt.claims',true)
 )
$$;
revoke all on function public.pilot_ci_auth_probe(uuid) from public,anon;
grant execute on function public.pilot_ci_auth_probe(uuid) to authenticated;
