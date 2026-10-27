-- Minimal local Postgres shim for AUTH behavior in CI only.
-- Do not execute against a real Supabase project.
create role anon nologin;
create role authenticated nologin;
grant usage on schema public to authenticated, anon;
create schema auth;
create function auth.uid() returns uuid
language sql stable
as $ select coalesce(
  nullif(current_setting('request.jwt.claim.sub', true), ''),
  nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')
)::uuid $;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
