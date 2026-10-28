-- Minimal local Postgres shim for AUTH behavior in CI only.
-- Do not execute against a real Supabase project.
create role anon nologin;
create role authenticated nologin;
grant usage on schema public to authenticated, anon;
create schema auth;
create function auth.uid() returns uuid
language sql stable
as $$ select coalesce(
  nullif(current_setting('request.jwt.claim.sub', true), ''),
  nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')
)::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

-- Synthetic auth catalog for electronic-consent tests only. Never run in Supabase.
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
insert into auth.users values('33333333-3333-4333-8333-333333333333','synthetic-client@example.test',now());
