const test = require("node:test"),
  assert = require("node:assert/strict");
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
