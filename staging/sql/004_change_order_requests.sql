-- BrightScale Tracker 2.0: audited client/sub/PM Change Order REQUEST intake.
-- Only PM formalizes as an independent draft via 003 RPC; requester cannot
-- approve contract prices or mutate frozen original baseline/credit.
-- TEST DB / NEW EMPTY separate Supabase staging ONLY; never run in production.
begin;
create table public.pilot_co_requests (
 id uuid primary key default pg_catalog.gen_random_uuid(),
 project_id uuid not null references public.pilot_projects(id),
 requester_id uuid not null default auth.uid(),
 title text not null check(length(title) between 1 and 120),
 description text not null default '' check(length(description)<=500),
 status text not null default 'pending' check(status in ('pending','formalized','declined')),
 linked_co_id uuid unique references public.pilot_change_orders(id),
 response_reason text check(length(response_reason)<=300),
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.pilot_co_request_events (
 id uuid primary key default pg_catalog.gen_random_uuid(),
 request_id uuid not null references public.pilot_co_requests(id),
 actor_id uuid not null,
 action text not null check(action in ('requested','formalized','declined')),
 detail text,
 created_at timestamptz not null default now()
);
revoke all on public.pilot_co_requests,public.pilot_co_request_events
 from public,anon,authenticated;
grant select on public.pilot_co_requests,public.pilot_co_request_events to authenticated;
-- Cannot forge requester, timestamps, status, CO linkage or PM response.
grant insert(project_id,title,description) on public.pilot_co_requests to authenticated;
alter table public.pilot_co_requests enable row level security;
alter table public.pilot_co_request_events enable row level security;
create policy pilot_co_request_read on public.pilot_co_requests
 for select to authenticated
 using (pilot_priv.is_pm(project_id) or
   (requester_id=(select auth.uid()) and pilot_priv.is_member(project_id)));
create policy pilot_co_request_insert on public.pilot_co_requests
 for insert to authenticated
 with check (requester_id=(select auth.uid()) and
   (pilot_priv.is_pm(project_id) or pilot_priv.is_member(project_id)) and
   status='pending' and linked_co_id is null and reviewed_by is null and reviewed_at is null);
create policy pilot_co_request_event_read on public.pilot_co_request_events
 for select to authenticated
 using (exists(select 1 from public.pilot_co_requests r where r.id=request_id
    and (pilot_priv.is_pm(r.project_id)
      or (r.requester_id=(select auth.uid()) and pilot_priv.is_member(r.project_id)))));

create function pilot_priv.audit_co_request()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.pilot_co_request_events(request_id,actor_id,action,detail)
   values(new.id,new.requester_id,'requested','CO request submitted for PM evaluation');
 return new;
end;
$$;
revoke all on function pilot_priv.audit_co_request() from public,anon,authenticated;
create trigger pilot_co_request_audit after insert on public.pilot_co_requests
 for each row execute function pilot_priv.audit_co_request();

create function public.pilot_co_formalize_request(p_request_id uuid,p_client_cents bigint)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_request public.pilot_co_requests%rowtype;
 v_co jsonb;
begin
 select * into v_request from public.pilot_co_requests where id=p_request_id for update;
 if not found then raise exception 'co_request_not_found'; end if;
 if v_actor is null or not pilot_priv.is_pm(v_request.project_id)
   then raise exception 'pm_required' using errcode='42501'; end if;
 if v_request.status<>'pending' then raise exception 'co_request_already_handled'; end if;
 -- This RPC checks baseline freeze, price validity, PM role and writes draft
 -- plus client-terms/audit in the SAME transaction.
 v_co:=public.pilot_co_create_draft(v_request.project_id,v_request.title,
    v_request.description,p_client_cents);
 update public.pilot_co_requests set status='formalized',
    linked_co_id=(v_co->>'co_id')::uuid,reviewed_at=now(),reviewed_by=v_actor
    where id=p_request_id;
 insert into public.pilot_co_request_events(request_id,actor_id,action,detail)
   values(p_request_id,v_actor,'formalized','PM opened independently priced CO draft; not client approved');
 return pg_catalog.jsonb_build_object('request_id',p_request_id,
    'co_id',v_co->>'co_id','status','formalized',
    'payment_authorized',false,'client_approved',false);
end;
$$;
create function public.pilot_co_decline_request(p_request_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_request public.pilot_co_requests%rowtype;
 v_reason text:=pg_catalog.btrim(coalesce(p_reason,''));
begin
 select * into v_request from public.pilot_co_requests where id=p_request_id for update;
 if not found then raise exception 'co_request_not_found'; end if;
 if v_actor is null or not pilot_priv.is_pm(v_request.project_id)
   then raise exception 'pm_required' using errcode='42501'; end if;
 if v_request.status<>'pending' then raise exception 'co_request_already_handled'; end if;
 if length(v_reason)<1 or length(v_reason)>300 then raise exception 'reason_required'; end if;
 update public.pilot_co_requests set status='declined',
    reviewed_at=now(),reviewed_by=v_actor,response_reason=v_reason
    where id=p_request_id;
 insert into public.pilot_co_request_events(request_id,actor_id,action,detail)
   values(p_request_id,v_actor,'declined',v_reason);
 return pg_catalog.jsonb_build_object('status','declined','payment_authorized',false);
end;
$$;
revoke all on function public.pilot_co_formalize_request(uuid,bigint),
 public.pilot_co_decline_request(uuid,text) from public,anon;
grant execute on function public.pilot_co_formalize_request(uuid,bigint),
 public.pilot_co_decline_request(uuid,text) to authenticated;
commit;
