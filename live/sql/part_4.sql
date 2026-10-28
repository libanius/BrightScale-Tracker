




create table tracker.live_co_requests (
 id uuid primary key default pg_catalog.gen_random_uuid(),
 project_id uuid not null references tracker.live_projects(id),
 requester_id uuid not null default auth.uid(),
 title text not null check(length(title) between 1 and 120),
 description text not null default '' check(length(description)<=500),
 status text not null default 'pending' check(status in ('pending','formalized','declined')),
 linked_co_id uuid unique references tracker.live_change_orders(id),
 response_reason text check(length(response_reason)<=300),
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create table tracker.live_co_request_events (
 id uuid primary key default pg_catalog.gen_random_uuid(),
 request_id uuid not null references tracker.live_co_requests(id),
 actor_id uuid not null,
 action text not null check(action in ('requested','formalized','declined')),
 detail text,
 created_at timestamptz not null default now()
);
revoke all on tracker.live_co_requests,tracker.live_co_request_events
 from public,anon,authenticated;
grant select on tracker.live_co_requests,tracker.live_co_request_events to authenticated;

grant insert(project_id,title,description) on tracker.live_co_requests to authenticated;
alter table tracker.live_co_requests enable row level security;
alter table tracker.live_co_request_events enable row level security;
create policy live_co_request_read on tracker.live_co_requests
 for select to authenticated
 using (tracker_private.workspace_is_pm(project_id) or
   (requester_id=(select auth.uid()) and tracker_private.workspace_is_member(project_id)));
create policy live_co_request_insert on tracker.live_co_requests
 for insert to authenticated
 with check (requester_id=(select auth.uid()) and
   (tracker_private.workspace_is_pm(project_id) or tracker_private.workspace_is_member(project_id)) and
   status='pending' and linked_co_id is null and reviewed_by is null and reviewed_at is null);
create policy live_co_request_event_read on tracker.live_co_request_events
 for select to authenticated
 using (exists(select 1 from tracker.live_co_requests r where r.id=request_id
    and (tracker_private.workspace_is_pm(r.project_id)
      or (r.requester_id=(select auth.uid()) and tracker_private.workspace_is_member(r.project_id)))));

create function tracker_private.workspace_audit_co_request()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into tracker.live_co_request_events(request_id,actor_id,action,detail)
   values(new.id,new.requester_id,'requested','CO request submitted for PM evaluation');
 return new;
end;
$$;
revoke all on function tracker_private.workspace_audit_co_request() from public,anon,authenticated;
create trigger live_co_request_audit after insert on tracker.live_co_requests
 for each row execute function tracker_private.workspace_audit_co_request();

create function tracker.live_co_formalize_request(p_request_id uuid,p_client_cents bigint)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_request tracker.live_co_requests%rowtype;
 v_co jsonb;
begin
 select * into v_request from tracker.live_co_requests where id=p_request_id for update;
 if not found then raise exception 'co_request_not_found'; end if;
 if v_actor is null or not tracker_private.workspace_is_pm(v_request.project_id)
   then raise exception 'pm_required' using errcode='42501'; end if;
 if v_request.status<>'pending' then raise exception 'co_request_already_handled'; end if;
 -- This RPC checks baseline freeze, price validity, PM role and writes draft
 -- plus client-terms/audit in the SAME transaction.
 v_co:=tracker.live_co_create_draft(v_request.project_id,v_request.title,
    v_request.description,p_client_cents);
 update tracker.live_co_requests set status='formalized',
    linked_co_id=(v_co->>'co_id')::uuid,reviewed_at=now(),reviewed_by=v_actor
    where id=p_request_id;
 insert into tracker.live_co_request_events(request_id,actor_id,action,detail)
   values(p_request_id,v_actor,'formalized','PM opened independently priced CO draft; not client approved');
 return pg_catalog.jsonb_build_object('request_id',p_request_id,
    'co_id',v_co->>'co_id','status','formalized',
    'payment_authorized',false,'client_approved',false);
end;
$$;
create function tracker.live_co_decline_request(p_request_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_request tracker.live_co_requests%rowtype;
 v_reason text:=pg_catalog.btrim(coalesce(p_reason,''));
begin
 select * into v_request from tracker.live_co_requests where id=p_request_id for update;
 if not found then raise exception 'co_request_not_found'; end if;
 if v_actor is null or not tracker_private.workspace_is_pm(v_request.project_id)
   then raise exception 'pm_required' using errcode='42501'; end if;
 if v_request.status<>'pending' then raise exception 'co_request_already_handled'; end if;
 if length(v_reason)<1 or length(v_reason)>300 then raise exception 'reason_required'; end if;
 update tracker.live_co_requests set status='declined',
    reviewed_at=now(),reviewed_by=v_actor,response_reason=v_reason
    where id=p_request_id;
 insert into tracker.live_co_request_events(request_id,actor_id,action,detail)
   values(p_request_id,v_actor,'declined',v_reason);
 return pg_catalog.jsonb_build_object('status','declined','payment_authorized',false);
end;
$$;
revoke all on function tracker.live_co_formalize_request(uuid,bigint),
 tracker.live_co_decline_request(uuid,text) from public,anon;
grant execute on function tracker.live_co_formalize_request(uuid,bigint),
 tracker.live_co_decline_request(uuid,text) to authenticated;
