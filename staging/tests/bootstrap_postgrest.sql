-- For disposable GitHub Actions PostgreSQL 17 only; NEVER Supabase real.
-- The password and JWT secret in CI are synthetic and NEVER valid outside the runner.
create role pilot_authenticator login noinherit password 'SYNTHETIC_CI_ONLY_PASS_2026';
grant anon, authenticated to pilot_authenticator;
grant usage on schema public to pilot_authenticator;

