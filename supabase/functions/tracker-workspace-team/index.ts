import postgres from "npm:postgres@3.4.5";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
const url = Deno.env.get("SUPABASE_URL") || "",
  key = Deno.env.get("SUPABASE_ANON_KEY") || "";
const admin =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default ||
  "";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL") || "", {
  prepare: false,
  max: 1,
});
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  let allowed = false;
  try {
    const host = new URL(origin).hostname;
    allowed =
      host === "tracker.brightscalegroup.com" ||
      host.endsWith("-brightscale-tracker.brightscalegroup.workers.dev");
  } catch {}
  const headers = {
    "content-type": "application/json",
    "cache-control": "no-store",
    "access-control-allow-origin": allowed ? origin : "null",
    "access-control-allow-headers":
      "authorization,apikey,content-type,x-client-info",
    "access-control-allow-methods": "POST,OPTIONS",
    vary: "Origin",
  };
  const reply = (v: unknown, status = 200) =>
    new Response(JSON.stringify(v), { status, headers });
  if (!allowed) return reply({ error: "origin_not_allowed" }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  try {
    const authorization = req.headers.get("authorization") || "";
    const r = await fetch(url + "/auth/v1/user", {
      headers: { authorization, apikey: key },
    });
    if (!r.ok) return reply({ error: "authentication_required" }, 401);
    const actor = await r.json();
    if (
      !(
        await sql`select 1 from tracker.members where lower(email)=${String(actor.email || "@").toLowerCase()} and role in ('admin','pm','manager')`
      ).length
    )
      return reply({ error: "pm_required" }, 403);
    const body = await req.json(),
      email = String(body.email || "")
        .trim()
        .toLowerCase(),
      name = String(body.name || "").trim();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !name ||
      name.length > 160
    )
      return reply({ error: "invalid_contact" }, 400);
    let userId = (
      await sql`select id from auth.users where lower(email)=${email} limit 1`
    )[0]?.id;
    let invitation = false;
    if (!userId) {
      const service = createClient(url, admin, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const result = await service.auth.admin.inviteUserByEmail(email, {
        redirectTo: origin + "/workspace/",
        data: { display_name: name },
      });
      if (result.error) return reply({ error: "invitation_failed" }, 502);
      userId = result.data.user.id;
      invitation = true;
    }
    let personId = null;
    if (body.kind !== "client") {
      const saved = await fetch(url + "/rest/v1/rpc/live_workspace_command", {
        method: "POST",
        headers: {
          authorization,
          apikey: key,
          "Content-Profile": "tracker",
          "Accept-Profile": "tracker",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          p_project: null,
          p_action: "person",
          p_data: {
            name,
            contact: String(body.contact || email).slice(0, 300),
            specialty: String(body.specialty || "").slice(0, 160),
            user_id: userId,
          },
        }),
      });
      if (!saved.ok)
        return reply({ error: "account_linked_person_save_failed" }, 502);
      personId = (await saved.json()).id;
    }
    return reply({
      user_id: userId,
      person_id: personId,
      invitation_sent: invitation,
    });
  } catch {
    return reply({ error: "team_setup_failed" }, 502);
  }
});
