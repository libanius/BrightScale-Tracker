import { sendReceipt } from "./send.mjs";
const URL = Deno.env.get("SUPABASE_URL") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const FROM = Deno.env.get("WORKSPACE_RECEIPT_FROM") || "";
const ORIGINS = (Deno.env.get("WORKSPACE_ALLOWED_ORIGINS") || "").split(",");
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const headers = {
    "content-type": "application/json",
    "cache-control": "no-store",
    "access-control-allow-origin": ORIGINS.includes(origin) ? origin : "null",
    vary: "Origin",
    "access-control-allow-headers":
      "authorization,apikey,content-type,x-client-info",
    "access-control-allow-methods": "POST,OPTIONS",
  };
  const reply = (v: unknown, status = 200) =>
    new Response(JSON.stringify(v), { status, headers });
  if (!ORIGINS.includes(origin))
    return reply({ error: "origin_not_allowed" }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  if (
    ["hyvoatfozlpsevsbkxxm", "wihfneccjwmtxzvivfzf"].some((x) =>
      URL.includes(x),
    )
  )
    return reply({ error: "production_project_blocked" }, 403);
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer "))
    return reply({ error: "authentication_required" }, 401);
  if (!SERVICE || !RESEND || !FROM)
    return reply({ error: "receipt_service_not_configured" }, 503);
  try {
    const who = await fetch(URL + "/auth/v1/user", {
      headers: { authorization, apikey: ANON },
      signal: AbortSignal.timeout(10000),
    });
    if (!who.ok) return reply({ error: "authentication_required" }, 401);
    const identity = await who.json();
    const body = await req.json();
    const project = String(body.project_id || "");
    if (!/^[a-f0-9-]{36}$/i.test(project))
      return reply({ error: "invalid_project" }, 400);
    // Verify PM ownership with caller's actual JWT/RLS BEFORE using service credentials.
    const own = await fetch(
      URL + "/rest/v1/pilot_projects?id=eq." + project + "&select=id,owner_id",
      {
        headers: { authorization, apikey: ANON },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!own.ok) return reply({ error: "project_access_denied" }, 403);
    const projects = await own.json();
    if (!projects.some((p: any) => p.owner_id === identity.id))
      return reply({ error: "pm_required" }, 403);
    const serviceHeaders = {
      apikey: SERVICE,
      authorization: "Bearer " + SERVICE,
      "content-type": "application/json",
    };
    const pending = await fetch(
      URL +
        "/rest/v1/pilot_workspace_email_outbox?project_id=eq." +
        project +
        "&status=eq.pending&select=*&limit=10",
      { headers: serviceHeaders, signal: AbortSignal.timeout(10000) },
    );
    if (!pending.ok) return reply({ error: "receipt_queue_unavailable" }, 502);
    let accepted = 0,
      failed = 0,
      uncertain = 0;
    for (const job of await pending.json()) {
      // Provider idempotency expires after 24h. Never automatically resend old ambiguous jobs.
      if (Date.now() - Date.parse(job.created_at) > 23 * 60 * 60 * 1000) {
        uncertain++;
        continue;
      }
      const receipt = await fetch(
        URL +
          "/rest/v1/pilot_workspace_signatures?id=eq." +
          job.signature_id +
          "&project_id=eq." +
          project +
          "&select=*",
        { headers: serviceHeaders, signal: AbortSignal.timeout(10000) },
      );
      if (!receipt.ok) {
        failed++;
        continue;
      }
      const [signature] = await receipt.json();
      if (!signature) {
        failed++;
        continue;
      }
      try {
        const result = await sendReceipt({
          signature,
          recipient: job.recipient,
          from: FROM,
          apiKey: RESEND,
        });
        const marked = await fetch(
          URL +
            "/rest/v1/pilot_workspace_email_outbox?id=eq." +
            job.id +
            "&project_id=eq." +
            project,
          {
            method: "PATCH",
            headers: serviceHeaders,
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_id: result.provider_id,
            }),
          },
        );
        if (marked.ok) accepted++;
        else uncertain++;
      } catch {
        failed++;
      }
    }
    return reply({
      provider_accepted: accepted,
      pending_or_failed: failed,
      manual_review: uncertain,
      inbox_delivery_verified: false,
    });
  } catch {
    return reply({ error: "receipt_dispatch_failed" }, 502);
  }
});
