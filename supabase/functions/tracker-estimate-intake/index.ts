import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.5";

// BrightScale Tracker — Estimate → Smart Remodeling analysis.
// POST {action:"analyze", text, filename?, source?}  → AI reads the estimate and returns a
//   Smart Remodeling plan (scopes, tasks with acceptance criteria, materials, open questions,
//   payment milestones). The result is stored in tracker.estimate_intakes.
// POST {action:"link_project", intake_id, project_id, milestones:[...]} → stores the reviewed
//   milestones on the project created by the app and marks the intake as used.
// Auth: signed-in member (Bearer JWT) or the internal header used by other BrightScale functions.

const dbUrl = Deno.env.get("SUPABASE_DB_URL") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const AI_MODEL = "gpt-5.6-luna";
const COMPANY = "brightscale";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, x-brightscale-internal",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

async function caller(req: Request, sql: any): Promise<string | null> {
  const internal = (req.headers.get("x-brightscale-internal") || "").trim();
  if (internal) {
    const c = (await sql`select admin_secret from private.zernio_integration_config where singleton = true limit 1`)[0];
    return c?.admin_secret && safeEqual(internal, String(c.admin_secret)) ? "internal" : null;
  }
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { authorization: auth, apikey: ANON } });
  if (!r.ok) return null;
  const email = String((await r.json())?.email || "").toLowerCase();
  if (!email) return null;
  const m = await sql`select 1 from tracker.members where company_id = ${COMPANY} and lower(email) = ${email} limit 1`;
  return m.length ? email : null;
}

async function openAIKey(sql: any) {
  const env = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (env) return env;
  const rows = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'openai_api_key' limit 1`;
  return String(rows[0]?.decrypted_secret || "").trim();
}

const str = { type: "string" };
const nstr = { type: ["string", "null"] };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["project_title", "trade_summary", "client", "site_address", "estimate", "scopes", "materials", "open_questions", "milestones", "estimated_duration_days", "risks"],
  properties: {
    project_title: str,
    trade_summary: str,
    client: {
      type: "object", additionalProperties: false, required: ["name", "phone", "email", "billing_address"],
      properties: { name: nstr, phone: nstr, email: nstr, billing_address: nstr },
    },
    site_address: nstr,
    estimate: {
      type: "object", additionalProperties: false,
      required: ["number", "issued_date", "total", "status_on_document", "deposit_percent", "payment_terms_summary"],
      properties: {
        number: nstr, issued_date: nstr, total: { type: ["number", "null"] }, status_on_document: nstr,
        deposit_percent: { type: ["number", "null"] }, payment_terms_summary: nstr,
      },
    },
    scopes: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["title", "sequence", "weight_percent", "description", "tasks"],
        properties: {
          title: str, sequence: { type: "integer" }, weight_percent: { type: "integer" }, description: str,
          tasks: {
            type: "array",
            items: {
              type: "object", additionalProperties: false, required: ["title", "sequence", "acceptance_criteria"],
              properties: { title: str, sequence: { type: "integer" }, acceptance_criteria: str },
            },
          },
        },
      },
    },
    materials: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["item", "quantity", "unit", "spec", "supplied_by"],
        properties: {
          item: str, quantity: { type: ["number", "null"] }, unit: nstr, spec: nstr,
          supplied_by: { type: "string", enum: ["contractor", "owner", "unknown"] },
        },
      },
    },
    open_questions: { type: "array", items: str },
    milestones: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["title", "sequence", "percent_of_contract", "trigger", "scope_titles", "acceptance_criteria"],
        properties: {
          title: str, sequence: { type: "integer" }, percent_of_contract: { type: "number" }, trigger: str,
          scope_titles: { type: "array", items: str }, acceptance_criteria: str,
        },
      },
    },
    estimated_duration_days: { type: ["integer", "null"] },
    risks: { type: "array", items: str },
  },
};

const SYSTEM = `You are the project planner for BrightScale Remodeling (South Florida). You turn a client-approved remodeling estimate into an execution plan that follows BrightScale's Smart Remodeling method:
S Scope — work, deliverables and expectations defined from the start.
M Model — an agreed reference for materials, finishes and workmanship.
A Alignment — client goals, crew responsibilities and material availability on one plan.
R Rhythm — consistent workflow with progress reviews.
T Time — realistic schedule with clear milestones.

Rules:
- Use ONLY what the estimate says. Never invent prices, quantities, brands, colors or rooms. Missing or ambiguous information goes into open_questions (short, specific, answerable by the client or PM).
- Scopes: group the work by trade/phase in the real execution order on site (protection/prep → demo → rough-in → install → finish → cleanup/walkthrough). 2 to 7 scopes. weight_percent reflects share of effort and must sum to 100.
- Tasks: atomic, verifiable steps a crew lead can mark done. Each has acceptance_criteria a project manager can check on a walkthrough in one sentence (measurable when possible). Keep quantities and rooms from the estimate.
- Always end with a final scope that includes job-site cleanup and a final walkthrough with the client.
- Materials: list every material the estimate mentions with quantity/unit/spec when stated; supplied_by "contractor" when the estimate says the contractor procures/supplies it, "owner" when the client provides it, else "unknown".
- Milestones: payment checkpoints tied to verifiable work. Follow the payment terms written in the estimate exactly (e.g. "50% deposit before work, 50% on completion" → a deposit milestone triggered by contract signature, and a final milestone triggered by the final walkthrough). If no terms are written, propose deposit + progress + final that sum to 100 and add an open question asking the client to confirm. percent_of_contract values must sum to 100. scope_titles must match scope titles you produced (deposit milestones may have an empty list).
- estimated_duration_days: realistic working days for a small crew, or null if impossible to judge.
- risks: site or scope risks the PM should watch (e.g. subfloor condition, appliance moves), max 5.
- Write everything in clear US English for the homeowner and crew. project_title is short (e.g. "Vinyl Flooring – Lavania, Fort Lauderdale").
- Dates in YYYY-MM-DD.`;

function outputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  for (const item of data?.output ?? []) for (const part of item?.content ?? []) {
    if (typeof part?.text === "string" && part.text.trim()) return part.text.trim();
    if (typeof part?.refusal === "string" && part.refusal.trim()) throw new Error("model_refused");
  }
  return "";
}

async function analyze(key: string, text: string, filename: string) {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: AI_MODEL,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `File: ${filename || "estimate"}\n\nESTIMATE TEXT:\n${text.slice(0, 60000)}` },
      ],
      text: { format: { type: "json_schema", name: "smart_remodeling_plan", strict: true, schema: SCHEMA } },
      max_output_tokens: 8000,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${JSON.stringify(data).slice(0, 400)}`);
  const out = outputText(data);
  if (!out) throw new Error("empty_ai_output");
  return normalize(JSON.parse(out));
}

// Make weights and milestone percents add up to exactly 100 and keep order stable.
function normalize(plan: any) {
  plan.scopes = (plan.scopes || []).sort((a: any, b: any) => a.sequence - b.sequence);
  const wTotal = plan.scopes.reduce((s: number, x: any) => s + Math.max(0, x.weight_percent || 0), 0);
  plan.scopes.forEach((s: any, i: number) => {
    s.weight_percent = wTotal ? Math.round((Math.max(0, s.weight_percent || 0) / wTotal) * 100) : Math.round(100 / plan.scopes.length);
    s.tasks = (s.tasks || []).sort((a: any, b: any) => a.sequence - b.sequence);
    s.sequence = i + 1;
  });
  plan.milestones = (plan.milestones || []).sort((a: any, b: any) => a.sequence - b.sequence);
  const mTotal = plan.milestones.reduce((s: number, m: any) => s + Math.max(0, m.percent_of_contract || 0), 0);
  if (mTotal && Math.abs(mTotal - 100) > 0.01) {
    plan.milestones.forEach((m: any) => { m.percent_of_contract = Math.round((m.percent_of_contract / mTotal) * 10000) / 100; });
  }
  plan.milestones.forEach((m: any, i: number) => { m.sequence = i + 1; });
  return plan;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const sql = postgres(dbUrl, { prepare: false, max: 1 });
  try {
    const who = await caller(req, sql);
    if (!who) return json({ ok: false, error: "unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "analyze");

    if (action === "analyze") {
      const text = String(body?.text || "").trim();
      const filename = String(body?.filename || "").slice(0, 200);
      const source = ["upload", "email", "simplywise", "api"].includes(body?.source) ? body.source : "upload";
      if (text.length < 40) return json({ ok: false, error: "not_enough_text" }, 400);
      const intake = (await sql`insert into tracker.estimate_intakes (company_id, source, filename, raw_text, status, created_by, ai_model)
        values (${COMPANY}, ${source}, ${filename || null}, ${text.slice(0, 200000)}, 'received', ${who}, ${AI_MODEL}) returning id`)[0];
      try {
        const plan = await analyze(await openAIKey(sql), text, filename);
        await sql`update tracker.estimate_intakes set status = 'analyzed', ai_result = ${sql.json(plan)},
          estimate_number = ${plan.estimate?.number || null}, client_name = ${plan.client?.name || null},
          total = ${plan.estimate?.total ?? null} where id = ${intake.id}`;
        return json({ ok: true, intake_id: intake.id, plan });
      } catch (e) {
        const msg = (e as Error).message || String(e);
        await sql`update tracker.estimate_intakes set status = 'failed', error = ${msg.slice(0, 1000)} where id = ${intake.id}`;
        console.error("analyze failed", msg);
        return json({ ok: false, intake_id: intake.id, error: "analysis_failed" }, 502);
      }
    }

    if (action === "link_project") {
      const intakeId = String(body?.intake_id || "");
      const projectId = String(body?.project_id || "");
      const project = (await sql`select id, contract_total from tracker.projects where id = ${projectId} and company_id = ${COMPANY}`)[0];
      if (!project) return json({ ok: false, error: "project_not_found" }, 404);
      const total = Number(project.contract_total || 0);
      const ms = Array.isArray(body?.milestones) ? body.milestones : [];
      await sql.begin(async (tx: any) => {
        await tx`delete from tracker.milestones where project_id = ${projectId} and status = 'pending'`;
        for (let i = 0; i < ms.length; i++) {
          const m = ms[i] || {};
          const pct = Math.max(0, Math.min(100, Number(m.percent_of_contract) || 0));
          const scopeIds = Array.isArray(m.scope_ids) ? m.scope_ids.map(String) : [];
          await tx`insert into tracker.milestones (project_id, title, sort_order, percent_of_contract, amount, trigger_text, scope_ids, acceptance_criteria)
            values (${projectId}, ${String(m.title || `Milestone ${i + 1}`).slice(0, 200)}, ${i + 1}, ${pct},
                    ${total ? Math.round(total * pct) / 100 : null}, ${m.trigger ? String(m.trigger).slice(0, 500) : null},
                    ${scopeIds}, ${m.acceptance_criteria ? String(m.acceptance_criteria).slice(0, 1000) : null})`;
        }
        if (intakeId) await tx`update tracker.estimate_intakes set status = 'project_created', project_id = ${projectId} where id = ${intakeId} and company_id = ${COMPANY}`;
      });
      return json({ ok: true, milestones: ms.length });
    }

    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "server_error" }, 500);
  } finally {
    await sql.end();
  }
});
