/* Shared input/projection rules. Authorization remains in PostgreSQL RLS. */
export function cents(value) {
  const s = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw Error("Use um valor como 1250.50, sem separador de milhar.");
  const [whole, dec = ""] = s.split(".");
  const n = Number(whole) * 100 + Number(dec.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n > 100000000000)
    throw Error("Valor fora do limite.");
  return n;
}
export function percent(v) {
  const n = Number(v);
  if (String(v).trim() === "" || !Number.isFinite(n) || n < 0 || n > 100)
    throw Error("Informe um percentual de 0 a 100.");
  return n;
}
export const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n || 0) / 100,
  );
export function validatePlan(p) {
  if (!p.name?.trim() || !p.client_name?.trim() || !p.address?.trim())
    throw Error("Preencha projeto, cliente e endereço.");
  if (!Number.isSafeInteger(p.amount_cents) || p.amount_cents < 0)
    throw Error("Confira o contrato.");
  if (p.end_date && p.start_date && p.end_date < p.start_date)
    throw Error("Término anterior ao início.");
  if (
    !p.scopes?.length ||
    Math.abs(p.scopes.reduce((a, s) => a + percent(s.weight_pct), 0) - 100) >
      0.001
  )
    throw Error("Os pesos dos escopos devem somar 100%.");
  for (const s of p.scopes) {
    if (
      !s.name?.trim() ||
      !s.weight_pct ||
      !Number.isSafeInteger(s.subcontract_cents) ||
      s.subcontract_cents < 0
    )
      throw Error("Confira nome, peso e valor de cada escopo.");
    if (
      !s.tasks?.length ||
      Math.abs(s.tasks.reduce((a, t) => a + percent(t.weight_pct), 0) - 100) >
        0.001
    )
      throw Error("As tarefas de cada escopo devem somar 100%.");
    if (
      s.tasks.some(
        (t) => !t.title?.trim() || !t.criteria?.trim() || !t.weight_pct,
      )
    )
      throw Error("Cada tarefa precisa de nome, peso e critério de aceite.");
  }
  if (
    (p.milestones || []).some(
      (m) =>
        !m.title?.trim() ||
        !Number.isSafeInteger(m.amount_cents) ||
        m.amount_cents < 0,
    )
  )
    throw Error("Confira os marcos de cobrança.");
  if (
    (p.milestones || []).reduce((a, m) => a + m.amount_cents, 0) >
    p.amount_cents
  )
    throw Error("Marcos excedem o contrato.");
  return p;
}
export function progress(snapshot, weights) {
  const map = new Map(
    (snapshot.validations || []).map((v) => [
      v.task_id,
      Number(v.validated_pct),
    ]),
  );
  const scopes = snapshot.scopes.map((s) => ({
    ...s,
    percent: snapshot.tasks
      .filter((t) => t.scope_id === s.id)
      .reduce(
        (sum, t) => sum + (Number(t.weight_pct) * (map.get(t.id) || 0)) / 100,
        0,
      ),
  }));
  const configured =
    scopes.length > 0 &&
    scopes.every((s) => weights.some((w) => w.scope_id === s.id)) &&
    Math.abs(weights.reduce((a, w) => a + Number(w.weight_pct), 0) - 100) <
      0.001;
  return {
    scopes,
    total: configured
      ? scopes.reduce(
          (a, s) =>
            a +
            (s.percent *
              Number(weights.find((w) => w.scope_id === s.id).weight_pct)) /
              100,
          0,
        )
      : null,
  };
}
export function blankPlan() {
  return {
    name: "",
    client_name: "",
    address: "",
    estimate_number: "",
    amount_cents: 0,
    payment_terms: "",
    start_date: "",
    end_date: "",
    client_user_id: "",
    scopes: [
      {
        name: "",
        weight_pct: 100,
        subcontract_cents: 0,
        person_id: "",
        responsibilities: "",
        payment_terms: "",
        tasks: [{ title: "", criteria: "", weight_pct: 100, due_date: "" }],
      },
    ],
    milestones: [],
  };
}
export function fromAI(raw) {
  const p = blankPlan();
  p.open_questions = raw.open_questions || [];
  p.risks = raw.risks || [];
  p.materials = raw.materials || [];
  p.name = raw.project_title || "";
  p.client_name = raw.client?.name || "";
  p.address = raw.site_address || "";
  p.estimate_number = raw.estimate?.number || "";
  if (raw.estimate?.total != null)
    p.amount_cents = cents(String(raw.estimate.total));
  p.payment_terms = raw.estimate?.payment_terms_summary || "";
  p.scopes = (raw.scopes || []).map((s) => ({
    name: s.name || s.title || "",
    weight_pct: Number(s.weight_pct ?? s.weight_percent ?? 0),
    subcontract_cents: 0,
    person_id: "",
    responsibilities: "",
    payment_terms: "",
    tasks: (s.tasks || []).map((t, i, all) => ({
      title: t.title || "",
      criteria: Array.isArray(t.acceptance_criteria)
        ? t.acceptance_criteria.join("\n")
        : t.acceptance_criteria || "",
      weight_pct:
        t.weight_pct != null
          ? Number(t.weight_pct)
          : i === all.length - 1
            ? 100 - (Math.floor(10000 / all.length) / 100) * (all.length - 1)
            : Math.floor(10000 / all.length) / 100,
      due_date: "",
    })),
  }));
  p.milestones = (raw.milestones || []).map((m) => ({
    title: m.title || "",
    amount_cents: Math.round(
      (p.amount_cents * Number(m.percent_of_contract || 0)) / 100,
    ),
    is_deposit: /deposit|sinal/i.test(m.title || ""),
  }));
  return p;
}
export function checkConfig(url, key, host, live = false) {
  const authorizedLive =
    live === true &&
    new URL(url).hostname === "hyvoatfozlpsevsbkxxm.supabase.co" &&
    ([
      "tracker.brightscalegroup.com",
      "localhost",
      "127.0.0.1",
      "terminal.local",
    ].includes(host) ||
      host.endsWith("-brightscale-tracker.brightscalegroup.workers.dev"));
  if (
    !authorizedLive &&
    !["localhost", "127.0.0.1", "terminal.local"].includes(host) &&
    !host.endsWith("-brightscale-tracker.brightscalegroup.workers.dev")
  )
    throw Error(
      "Ambiente de implementação disponível apenas em localhost ou preview do Tracker.",
    );
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    !/^[-a-z0-9]+\.supabase\.co$/.test(u.hostname) ||
    u.pathname !== "/" ||
    u.search ||
    u.hash
  )
    throw Error("Informe a URL exata do Supabase de testes.");
  if (
    !authorizedLive &&
    ["hyvoatfozlpsevsbkxxm", "wihfneccjwmtxzvivfzf"].some(
      (ref) => u.hostname === ref + ".supabase.co",
    )
  )
    throw Error(
      "Este banco pertence a um serviço existente. Use o ambiente separado.",
    );
  if (key.startsWith("sb_secret_"))
    throw Error("Chave secreta proibida no navegador.");
  if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role !== "anon") throw Error("role");
    } catch {
      throw Error("Use somente uma chave publishable ou anon.");
    }
  } else if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key))
    throw Error("Chave publishable inválida.");
  return u.origin;
}

export function requestUUID() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return (
    h.slice(0, 8) +
    "-" +
    h.slice(8, 12) +
    "-" +
    h.slice(12, 16) +
    "-" +
    h.slice(16, 20) +
    "-" +
    h.slice(20)
  );
}
