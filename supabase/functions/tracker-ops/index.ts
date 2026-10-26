import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.5";

// BrightScale Tracker — operations (called by pg_cron with the internal header).
// POST {action:"backup"}  → full JSON snapshot of schema "tracker" into the private
//                           Storage bucket tracker-backups/daily/, keeps 30 days.
// POST {action:"digest", force?} → Telegram health message. Sent when something is wrong
//                           (failed backup, app errors, failed estimate analyses) and every
//                           Monday as a weekly "all good" summary.

const dbUrl = Deno.env.get("SUPABASE_DB_URL") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string, string>;
const SERVICE_KEY = secretKeys["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BUCKET = "tracker-backups";
const KEEP_DAYS = 30;
const TABLES = ["companies", "members", "people", "projects", "units", "scopes", "tasks", "expenses", "notes",
  "documents", "share_links", "estimate_intakes", "milestones"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

const storageHeaders = () => ({ authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY });

async function backup(sql: any) {
  const run = (await sql`insert into tracker.backup_runs default values returning id`)[0];
  try {
    const snapshot: Record<string, unknown> = { schema: "tracker", created_at: new Date().toISOString(), tables: {} };
    const counts: Record<string, number> = {};
    for (const t of TABLES) {
      const rows = await sql`select * from ${sql("tracker." + t)}`;
      (snapshot.tables as Record<string, unknown>)[t] = rows;
      counts[t] = rows.length;
    }
    const body = JSON.stringify(snapshot);
    const day = new Date().toISOString().slice(0, 10);
    const path = `daily/tracker-${day}.json`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { ...storageHeaders(), "content-type": "application/json", "x-upsert": "true" },
      body,
    });
    if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 300)}`);

    // Retention: delete daily files older than KEEP_DAYS.
    const list = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { ...storageHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ prefix: "daily", limit: 1000, offset: 0 }),
    });
    const files = list.ok ? await list.json() : [];
    const cutoff = Date.now() - KEEP_DAYS * 86400000;
    const old = (files as any[]).map((f) => String(f.name || "")).filter((n) => {
      const m = n.match(/tracker-(\d{4}-\d{2}-\d{2})\.json$/);
      return m && Date.parse(m[1]) < cutoff;
    }).map((n) => `daily/${n}`);
    if (old.length) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
        method: "DELETE",
        headers: { ...storageHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ prefixes: old }),
      });
    }
    await sql`update tracker.backup_runs set status = 'ok', finished_at = now(), storage_path = ${path},
      bytes = ${body.length}, row_counts = ${sql.json(counts)}, pruned = ${old.length} where id = ${run.id}`;
    return { ok: true, path, bytes: body.length, counts, pruned: old.length };
  } catch (e) {
    const msg = (e as Error).message || String(e);
    await sql`update tracker.backup_runs set status = 'failed', finished_at = now(), error = ${msg.slice(0, 1000)} where id = ${run.id}`;
    return { ok: false, error: msg };
  }
}

async function telegram(sql: any, text: string) {
  const rows = await sql`select name, decrypted_secret from vault.decrypted_secrets where name in ('telegram_bot_token','telegram_chat_id')`;
  const cfg = Object.fromEntries(rows.map((r: any) => [r.name, r.decrypted_secret]));
  if (!cfg.telegram_bot_token || !cfg.telegram_chat_id) throw new Error("telegram_not_configured");
  const r = await fetch(`https://api.telegram.org/bot${cfg.telegram_bot_token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: cfg.telegram_chat_id, text, disable_web_page_preview: true }),
  });
  if (!r.ok) throw new Error(`telegram ${r.status}`);
}

async function digest(sql: any, force: boolean) {
  const lastBackup = (await sql`select status, started_at, bytes, error from tracker.backup_runs order by started_at desc limit 1`)[0];
  const errors = (await sql`select count(*)::int n from tracker.app_events where level = 'error' and created_at > now() - interval '24 hours'`)[0].n;
  const sampleErrors = await sql`select message from tracker.app_events where level = 'error' and created_at > now() - interval '24 hours' order by created_at desc limit 3`;
  const failedIntakes = (await sql`select count(*)::int n from tracker.estimate_intakes where status = 'failed' and created_at > now() - interval '24 hours'`)[0].n;
  const projects = (await sql`select count(*)::int n from tracker.projects where status = 'active'`)[0].n;
  const backupStale = !lastBackup || Date.now() - new Date(lastBackup.started_at).getTime() > 36 * 3600000;
  const problems: string[] = [];
  if (backupStale) problems.push("⚠️ Nenhum backup nas últimas 36h");
  else if (lastBackup.status !== "ok") problems.push(`⚠️ Último backup falhou: ${String(lastBackup.error || "").slice(0, 120)}`);
  if (errors) problems.push(`⚠️ ${errors} erro(s) no app nas últimas 24h` + (sampleErrors.length ? `\n   ex.: ${String(sampleErrors[0].message).slice(0, 140)}` : ""));
  if (failedIntakes) problems.push(`⚠️ ${failedIntakes} análise(s) de estimate falharam nas últimas 24h`);
  const isMonday = new Date().toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" }) === "Mon";
  if (!problems.length && !isMonday && !force) return { ok: true, sent: false };
  const lines = [problems.length ? "BrightScale Tracker — atenção" : "BrightScale Tracker — semana OK ✅"];
  if (problems.length) lines.push(...problems);
  lines.push(`Obras ativas: ${projects}`);
  if (lastBackup) lines.push(`Último backup: ${lastBackup.status} · ${new Date(lastBackup.started_at).toLocaleString("pt-BR", { timeZone: "America/New_York" })}` +
    (lastBackup.bytes ? ` · ${Math.round(lastBackup.bytes / 1024)} KB` : ""));
  await telegram(sql, lines.join("\n"));
  return { ok: true, sent: true, problems: problems.length };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const sql = postgres(dbUrl, { prepare: false, max: 1 });
  try {
    const internal = (req.headers.get("x-brightscale-internal") || "").trim();
    const c = (await sql`select admin_secret from private.zernio_integration_config where singleton = true limit 1`)[0];
    if (!internal || !c?.admin_secret || !safeEqual(internal, String(c.admin_secret))) return json({ ok: false, error: "unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    if (body?.action === "backup") return json(await backup(sql));
    if (body?.action === "digest") return json(await digest(sql, body?.force === true));
    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "server_error" }, 500);
  } finally {
    await sql.end();
  }
});
