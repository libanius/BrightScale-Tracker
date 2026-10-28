const test = require("node:test"),
  assert = require("node:assert/strict");

// Execute the actual Edge handler, including its environment setup and CORS.
// Transport is synthetic: these tests cannot send mail or query production.
function receiptHandler(fetcher, env = {}) {
  const vm = require("node:vm");
  const code = require("esbuild").buildSync({
    entryPoints: ["supabase/functions/tracker-workspace-receipts/index.ts"],
    bundle: true, platform: "neutral", format: "iife", write: false,
  }).outputFiles[0].text;
  let handler;
  const values = {
    SUPABASE_URL: "https://synthetic.supabase.test",
    SUPABASE_ANON_KEY: "SYNTHETIC-PUBLIC",
    SUPABASE_SERVICE_ROLE_KEY: "SYNTHETIC-SERVER",
    RESEND_API_KEY: "SYNTHETIC-MAIL", ...env,
  };
  vm.runInNewContext(code, {
    URL, Response, AbortSignal, fetch: fetcher,
    Deno: { env: { get: (key) => values[key] }, serve: (fn) => { handler = fn; } },
  });
  return handler;
}
const projectId = "11111111-1111-4111-8111-111111111111";
const appOrigin = "https://tracker.brightscalegroup.com";
function dispatchRequest(origin = appOrigin) {
  return new Request("https://synthetic.supabase.test/functions/v1/tracker-workspace-receipts", {
    method: "POST", headers: { origin, authorization: "Bearer SYNTHETIC-USER", "content-type": "application/json" },
    body: JSON.stringify({ project_id: projectId }),
  });
}
test("receipt handler accepts Tracker preflight and rejects unrelated origins without network", async () => {
  const handler = receiptHandler(() => { throw Error("Unexpected network"); });
  for (const origin of [appOrigin, "https://feat-tracker-delivery-brightscale-tracker.brightscalegroup.workers.dev"]) {
    const response = await handler(new Request("https://synthetic.test", { method: "OPTIONS", headers: { origin } }));
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
  }
  for (const origin of ["https://unrelated.test", "https://tracker.brightscalegroup.com.evil.test", "null"]) {
    assert.equal((await handler(dispatchRequest(origin))).status, 403);
  }
});
test("receipt handler reports missing provider configuration without dispatch", async () => {
  const handler = receiptHandler(() => { throw Error("Unexpected network"); }, { RESEND_API_KEY: "" });
  const response = await handler(dispatchRequest());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "receipt_service_not_configured");
});
test("receipt handler rejects invalid identity and non-owner before privileged queue access", async () => {
  for (const authenticated of [false, true]) {
    const requests = [];
    const handler = receiptHandler(async (url, options) => {
      requests.push(url);
      assert.equal(options.headers.authorization, "Bearer SYNTHETIC-USER");
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: "SYNTHETIC-USER" }, { status: authenticated ? 200 : 401 });
      assert(url.includes("/live_projects?"));
      return Response.json([{ owner_id: "SYNTHETIC-OTHER-PM" }]);
    });
    assert.equal((await handler(dispatchRequest())).status, authenticated ? 403 : 401);
    assert.equal(requests.length, authenticated ? 2 : 1);
  }
});
test("receipt handler dispatches only server queue recipient and records provider acceptance", async () => {
  let sent = 0, marked = 0;
  const handler = receiptHandler(async (url, options) => {
    if (url.endsWith("/auth/v1/user")) return Response.json({ id: "SYNTHETIC-PM" });
    if (url.includes("/live_projects?")) return Response.json([{ owner_id: "SYNTHETIC-PM" }]);
    if (url === "https://api.resend.com/emails") {
      sent++;
      assert.deepEqual(JSON.parse(options.body).to, ["synthetic-signer@example.test"]);
      return Response.json({ id: "SYNTHETIC-PROVIDER-ID" });
    }
    assert.equal(options.headers.apikey, "SYNTHETIC-SERVER");
    if (options.method === "PATCH") {
      marked++;
      assert.equal(JSON.parse(options.body).provider_id, "SYNTHETIC-PROVIDER-ID");
      return new Response(null, { status: 204 });
    }
    if (url.includes("/live_workspace_email_outbox?")) return Response.json([{
      id: "SYNTHETIC-JOB", signature_id: "SYNTHETIC-SIGNATURE", recipient: "synthetic-signer@example.test", created_at: new Date().toISOString(),
    }]);
    assert(url.includes("/live_workspace_signatures?"));
    return Response.json([{ id: "SYNTHETIC-SIGNATURE", content_hash: "SYNTHETIC-HASH", snapshot: {} }]);
  });
  const response = await handler(dispatchRequest());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).provider_accepted, 1);
  assert.equal(sent, 1);
  assert.equal(marked, 1);
});
test("receipt uses verified recipient, immutable snapshot and deterministic idempotency key", async () => {
  const { sendReceipt } = await import(
    "../supabase/functions/tracker-workspace-receipts/send.mjs"
  );
  const requests = [];
  const options = {
    signature: {
      id: "SYNTHETIC-SIGNATURE",
      content_hash: "SYNTHETIC-HASH",
      signer_name: "SYNTHETIC Client",
      created_at: "2026-10-28T12:00:00Z",
      consent_text: "SYNTHETIC consent",
      snapshot: { title: "SYNTHETIC work", client_amount_cents: 12345 },
    },
    recipient: "synthetic-client@example.test",
    from: "synthetic-sender@example.test",
    apiKey: "SYNTHETIC_NOT_A_REAL_KEY",
    fetcher: async (url, request) => {
      requests.push({ url, request });
      return { ok: true, json: async () => ({ id: "SYNTHETIC-provider-id" }) };
    },
  };
  for (let i = 0; i < 2; i++) await sendReceipt(options);
  assert.equal(requests[0].url, "https://api.resend.com/emails");
  assert.equal(
    requests[0].request.headers["Idempotency-Key"],
    requests[1].request.headers["Idempotency-Key"],
  );
  const body = JSON.parse(requests[0].request.body);
  assert.deepEqual(body.to, ["synthetic-client@example.test"]);
  assert(body.text.includes("SYNTHETIC-HASH"));
  assert(!body.text.includes("subcontract"));
  assert(!("html" in body));
});
test("provider failures never count as sent", async () => {
  const { sendReceipt } = await import(
    "../supabase/functions/tracker-workspace-receipts/send.mjs"
  );
  await assert.rejects(
    () =>
      sendReceipt({
        signature: { id: "test", content_hash: "test" },
        recipient: "synthetic@example.test",
        from: "synthetic@example.test",
        apiKey: "SYNTHETIC",
        fetcher: async () => ({ ok: false, status: 429 }),
      }),
    /provider_429/,
  );
});
