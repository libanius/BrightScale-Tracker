/* Transport only. Server passes the verified recipient and immutable signature.
 * Provider acceptance is NOT proof of inbox delivery. No real sends in tests.
 */
export async function sendReceipt({
  signature,
  recipient,
  from,
  apiKey,
  fetcher = fetch,
}) {
  if (
    !signature?.id ||
    !signature.content_hash ||
    !recipient ||
    !from ||
    !apiKey
  )
    throw Error("receipt_not_configured");
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: "Bearer " + apiKey,
      "content-type": "application/json",
      "Idempotency-Key": "workspace-receipt/" + signature.id,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: "BrightScale — cópia do seu aceite eletrônico",
      text: [
        "BrightScale Remodeling",
        "Cópia do registro de aceite eletrônico.",
        "Nome: " + signature.signer_name,
        "Data (UTC): " + signature.created_at,
        "Registro: " + signature.id,
        "SHA-256: " + signature.content_hash,
        "Declaração: " + signature.consent_text,
        "",
        "Conteúdo exato aceito:",
        JSON.stringify(signature.snapshot, null, 2),
      ].join("\n"),
    }),
  });
  if (!response.ok) throw Error("receipt_provider_" + response.status);
  const data = await response.json();
  if (!data.id) throw Error("receipt_provider_missing_id");
  return { provider_id: data.id };
}
