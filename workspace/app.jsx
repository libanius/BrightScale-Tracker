import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { motion, useReducedMotion } from "motion/react";
import * as pdfjs from "pdfjs-dist";
import {
  blankPlan,
  cents,
  money,
  percent,
  validatePlan,
  progress,
  fromAI,
  smartContext,
  checkConfig,
  requestUUID,
} from "./core.js";
import { createAPI } from "./api.js";
pdfjs.GlobalWorkerOptions.workerSrc = "./build/pdf.worker.min.mjs";
const $ = (id) => document.getElementById(id);
function Field({ label, value, onChange, type = "text", ...props }) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}
function Area({ label, value, onChange, ...props }) {
  return (
    <label>
      {label}
      <textarea
        aria-label={label}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}
function Button({ children, onClick, secondary = false, disabled = false }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={secondary ? "secondary" : "primary"}
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Salvando…" : children}
    </button>
  );
}
function Card({ title, children }) {
  return (
    <section className="card">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
const displayTime = (v) =>
  new Date(v).toLocaleString("pt-BR", { timeZone: "America/New_York" });
const ERRORS = {
  phase_gate_or_dependency_pending:
    "Libere a fase e conclua a dependência antes de validar este trabalho.",
  project_closed: "Este projeto já está encerrado.",
  unfinished_work: "Ainda há tarefas sem conclusão validada pelo PM.",
  unsettled_milestones: "Ainda há marcos de cobrança ou aceites pendentes.",
  legal_safety_readiness_required:
    "Confirme os requisitos legais, a segurança e a prontidão da fase.",
  baseline_not_frozen: "Aprove a baseline antes de registrar execução.",
  decreasing_progress_requires_correction_review:
    "Uma redução exige revisão de correção; os créditos anteriores serão preservados.",
  record_matching_receipt_first:
    "Registre primeiro um recebimento com o valor e a referência deste marco.",
  criteria_and_reason_required:
    "Confirme os critérios de aceite e informe a justificativa.",
  pm_required: "Esta ação exige a conta do PM.",
  client_required: "Esta ação exige a conta do cliente.",
  scope_weights_must_total_100: "Os pesos dos escopos precisam somar 100%.",
  task_weights_must_total_100:
    "Os pesos das tarefas precisam somar 100% em cada escopo.",
  already_reviewed: "Este relatório já foi revisado. Atualize a tela.",
  workspace_payment_reference: "Já existe um registro com esta referência.",
};
const LIVE = window.BRIGHTSCALE_WORKSPACE_CONFIG;
function App() {
  const identity = useRef(null),
    epoch = useRef(0),
    subscription = useRef(null);
  const reduce = useReducedMotion();
  const [page, setPage] = useState("overview"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(false),
    [client, setClient] = useState(null),
    [api, setApi] = useState(null),
    [user, setUser] = useState(null),
    [projects, setProjects] = useState([]),
    [selected, setSelected] = useState(null),
    [snap, setSnap] = useState(null),
    [people, setPeople] = useState([]),
    [loading, setLoading] = useState(false);
  const [url, setURL] = useState(LIVE?.url || ""),
    [key, setKey] = useState(LIVE?.key || ""),
    [email, setEmail] = useState(""),
    [otp, setOTP] = useState(""),
    [sent, setSent] = useState(false);
  const tell = (s, bad = false) => {
    setNotice(String(s));
    setError(bad);
  };
  const run = async (fn) => {
    try {
      await fn();
    } catch (e) {
      tell(ERRORS[e.message] || e.message, true);
    }
  };
  async function load(a = api, u = user, pid = selected) {
    if (!a || !u) return;
    const token = ++epoch.current;
    setLoading(true);
    try {
      const list = await a.listProjects();
      const p = list.find((p) => p.id === pid);
      const [snapshot, directory] = await Promise.all([
        p ? a.workspace(p, u) : null,
        a.people(),
      ]);
      if (token !== epoch.current || identity.current !== u.id) return;
      setProjects(list);
      setSnap(snapshot);
      setPeople(directory);
    } finally {
      if (token === epoch.current) setLoading(false);
    }
  }
  async function connect() {
    const origin = checkConfig(
      url,
      key,
      location.hostname,
      LIVE?.live === true,
    );
    if (!window.supabase)
      throw Error("SDK indisponível. Verifique sua conexão.");
    subscription.current?.unsubscribe();
    epoch.current++;
    identity.current = null;
    setSnap(null);
    setProjects([]);
    setPeople([]);
    const c = window.supabase.createClient(origin, key, {
      db: { schema: LIVE?.live ? "tracker" : "public" },
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        ...(LIVE?.live ? { storageKey: "bs-tracker-auth" } : {}),
      },
    });
    c._workspaceLive = LIVE?.live === true;
    setClient(c);
    const a = createAPI(c);
    setApi(a);
    subscription.current = c.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      identity.current = u?.id || null;
      epoch.current++;
      c._workspaceUser = u?.id;
      setUser(u);
      if (u) {
        if (_event === "SIGNED_IN") setPage("overview");
        queueMicrotask(() => run(() => load(a, u)));
      } else {
        setProjects([]);
        setSnap(null);
        setPeople([]);
        setSelected(null);
        setLoading(false);
      }
    }).data.subscription;
    const r = await c.auth.getUser();
    if (r.data?.user) {
      identity.current = r.data.user.id;
      c._workspaceUser = r.data.user.id;
      setUser(r.data.user);
      await load(a, r.data.user);
    }
    if (!r.data?.user) setPage("setup");
    tell("Conectado. Entre com seu e-mail autorizado para continuar.");
  }
  useEffect(() => {
    if (LIVE?.live) run(connect);
    return () => subscription.current?.unsubscribe();
  }, []);
  async function openProject(p) {
    const token = ++epoch.current;
    setSelected(p.id);
    setPage("project");
    setLoading(true);
    setSnap(null);
    try {
      const result = await api.workspace(p, user);
      if (token === epoch.current && identity.current === user.id)
        setSnap(result);
    } finally {
      if (token === epoch.current) setLoading(false);
    }
  }
  async function command(action, data) {
    await api.command(selected, action, data);
    await load();
    tell("Registro salvo.");
  }
  const active = snap ? progress(snap, snap.weights) : null;
  const canManage =
    !user || !projects.length || projects.some((p) => p.owner_id === user.id);
  return (
    <div className="layout">
      <aside>
        <div className="brand">
          <span className="brand-mark">
            <img src="./mark.svg" width="32" height="32" alt="" />
          </span>
          <strong>
            BrightScale<small>SMART REMODELING</small>
          </strong>
        </div>
        <p className="caption">WORKSPACE</p>
        <nav>
          {[
            ["overview", "Visão geral"],
            ["new", "Novo projeto"],
            ["team", "Subcontractors"],
            ["setup", "Conexão"],
          ]
            .filter(([id]) => canManage || !["new", "team"].includes(id))
            .map(([id, title]) => (
              <button
                key={id}
                className={page === id ? "active" : ""}
                onClick={() => setPage(id)}
              >
                {title}
              </button>
            ))}
        </nav>
        <div className="aside-bottom">
          {user ? (
            <>
              <p>Sessão autenticada</p>
              <small>Identificador da conta</small>
              <code>{user.id}</code>
              <Button
                secondary
                onClick={() =>
                  run(async () => {
                    await client.auth.signOut();
                    tell("Sessão encerrada.");
                  })
                }
              >
                Sair
              </Button>
            </>
          ) : (
            <p>Comece importando um estimate.</p>
          )}
          <small>Live · Smart Remodeling</small>
        </div>
      </aside>
      <div className="shell">
        <header>
          <span>
            BrightScale /{" "}
            {page === "project"
              ? snap?.project.name || "Projeto"
              : {
                  overview: "Visão geral",
                  new: "Novo projeto",
                  team: "Equipe",
                  setup: "Conexão",
                }[page]}
          </span>
          <span className="badge">Conectado ao Supabase</span>
        </header>
        <main>
          <p
            role="status"
            aria-live="polite"
            className={"notice " + (error ? "error" : "")}
            hidden={!notice}
          >
            {notice}
          </p>
          {loading && <p role="status">Carregando dados…</p>}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {page === "setup" && (
              <>
                <p className="eyebrow">ACESSO</p>
                <h1>
                  {LIVE?.live
                    ? "Entre no seu Tracker."
                    : "Conecte seu ambiente."}
                </h1>
                <p className="subheading">
                  {LIVE?.live
                    ? "O ambiente BrightScale já está conectado. Entre com seu e-mail autorizado."
                    : "Configure o ambiente de testes para continuar."}
                </p>
                {!LIVE?.live && (
                  <Card title="Configuração">
                    <Field
                      label="URL do Supabase de testes"
                      value={url}
                      onChange={setURL}
                      type="url"
                    />
                    <Field
                      label="Chave publishable / anon"
                      value={key}
                      onChange={setKey}
                    />
                    <Button onClick={() => run(connect)}>Conectar</Button>
                  </Card>
                )}
                {client && !user && (
                  <Card title="Entrar">
                    <Field
                      label="Seu e-mail"
                      value={email}
                      onChange={setEmail}
                      type="email"
                    />
                    {!sent ? (
                      <Button
                        onClick={() =>
                          run(async () => {
                            const r = await client.auth.signInWithOtp({
                              email,
                              options: {
                                shouldCreateUser: false,
                                emailRedirectTo:
                                  location.origin + location.pathname,
                              },
                            });
                            if (r.error) throw r.error;
                            setSent(true);
                            tell(
                              "Digite nesta tela o código recebido no seu e-mail.",
                            );
                          })
                        }
                      >
                        Solicitar acesso
                      </Button>
                    ) : (
                      <>
                        <Field
                          label="Código recebido"
                          value={otp}
                          onChange={setOTP}
                        />
                        <Button
                          onClick={() =>
                            run(async () => {
                              const r = await client.auth.verifyOtp({
                                email,
                                token: otp,
                                type: "email",
                              });
                              if (r.error) throw r.error;
                            })
                          }
                        >
                          Verificar código
                        </Button>
                      </>
                    )}
                  </Card>
                )}
              </>
            )}
            {page === "overview" && (
              <>
                <p className="eyebrow">SMART REMODELING</p>
                <div className="title-row">
                  <div>
                    <h1>Suas obras, com clareza.</h1>
                    <p className="subheading">
                      Escopo definido, progresso validado e decisões
                      registradas.
                    </p>
                  </div>
                  <Button onClick={() => setPage("new")}>
                    ＋ Novo projeto
                  </Button>
                </div>
                <div className="metrics">
                  <Card title="Projetos">
                    <strong className="big">{projects.length}</strong>
                    <small>Acessíveis à sua conta</small>
                  </Card>
                  <Card title="Progresso">
                    <strong className="big">
                      {active?.total == null
                        ? "—"
                        : active.total.toFixed(1) + "%"}
                    </strong>
                    <small>Validado pelo PM · obra selecionada</small>
                  </Card>
                  <Card title="Revisões pendentes">
                    <strong className="big">
                      {snap?.reports?.filter((r) => r.status === "pending")
                        .length ?? "—"}
                    </strong>
                    <small>Relatórios da obra selecionada</small>
                  </Card>
                </div>
                <Card title="Projetos ativos">
                  {projects.length ? (
                    projects.map((p) => (
                      <button
                        key={p.id}
                        className="project-row"
                        onClick={() => run(() => openProject(p))}
                      >
                        <span>
                          <b>{p.name}</b>
                          <small>
                            {p.baseline_frozen_at
                              ? "Baseline aprovada"
                              : "Plano em rascunho"}
                          </small>
                        </span>
                        <span>Ver projeto →</span>
                      </button>
                    ))
                  ) : (
                    <p>
                      {user
                        ? "Nenhum projeto cadastrado."
                        : "Importe e revise seu plano. Conecte o ambiente para salvar e acompanhar a execução."}
                    </p>
                  )}
                </Card>
                {user && (
                  <Button secondary onClick={() => run(() => load())}>
                    Atualizar projetos
                  </Button>
                )}
              </>
            )}
            {
              <div hidden={page !== "new" || !canManage}>
                <NewProject
                  key={user?.id || "guest"}
                  api={api}
                  user={user}
                  people={people}
                  tell={tell}
                  run={run}
                  onCreated={async (id) => {
                    setSelected(id);
                    await load(api, user, id);
                    setPage("project");
                  }}
                />
              </div>
            }
            {page === "team" && canManage && (
              <>
                <p className="eyebrow">EQUIPE</p>
                <h1>Profissionais e acordos.</h1>
                <p className="subheading">
                  O cadastro é reutilizável. Escopo, valores e responsabilidades
                  são definidos por obra.
                </p>
                <Team
                  api={api}
                  people={people}
                  run={run}
                  tell={tell}
                  reload={() => load()}
                />
              </>
            )}
            {page === "project" && snap && (
              <>
                <p className="eyebrow">PROJETO · {snap.role.toUpperCase()}</p>
                <h1>{snap.project.name}</h1>
                <div className="hero">
                  <div>
                    <span className="badge">
                      Baseline V{snap.project.baseline_version} ·{" "}
                      {snap.project.baseline_frozen_at
                        ? "aprovada"
                        : "rascunho"}
                    </span>
                    <h2>{snap.details?.client_name || "Cliente"}</h2>
                    <p>{snap.details?.address}</p>
                    <p>
                      {snap.details?.start_date || "Início a definir"} →{" "}
                      {snap.details?.end_date || "Término a definir"}
                    </p>
                  </div>
                  <div>
                    <strong>
                      {active.total == null
                        ? "—"
                        : active.total.toFixed(1) + "%"}
                    </strong>
                    <p>Progresso validado pelo PM</p>
                  </div>
                </div>
                {snap.role === "pm" && !snap.project.baseline_frozen_at && (
                  <Card title="Conferência final">
                    <p>
                      Aprovar preserva o escopo, pesos e valores originais.
                      Adicionais seguem como Change Orders separados.
                    </p>
                    <Button
                      onClick={() =>
                        run(async () => {
                          if (
                            !confirm("Confirmar a baseline original revisada?")
                          )
                            return;
                          await api.freezeBaseline(selected);
                          await load();
                          tell("Baseline aprovada.");
                        })
                      }
                    >
                      Aprovar e congelar baseline
                    </Button>
                  </Card>
                )}
                {snap.role === "pm" && (
                  <div className="actions">
                    <Button
                      secondary
                      disabled={!!snap.details?.closed_at}
                      onClick={() =>
                        run(async () => {
                          const reason = prompt(
                            "Registre a vistoria final e o motivo do encerramento:",
                          );
                          if (reason) await command("close", { reason });
                        })
                      }
                    >
                      {snap.details?.closed_at
                        ? "Projeto encerrado"
                        : "Encerrar projeto após conferência final"}
                    </Button>
                  </div>
                )}
                <div className="columns">
                  <div>
                    <Card title="Execução por escopo">
                      {active.scopes.map((s) => (
                        <Scope
                          key={s.id}
                          scope={s}
                          snap={snap}
                          api={api}
                          command={command}
                          run={run}
                          reload={() => load()}
                        />
                      ))}
                    </Card>
                    <EventPanel snap={snap} command={command} run={run} />
                    <Documents
                      snap={snap}
                      api={api}
                      command={command}
                      run={run}
                    />
                  </div>
                  <div>
                    <Financial snap={snap} command={command} run={run} />
                    <Milestones
                      snap={snap}
                      command={command}
                      api={api}
                      run={run}
                      reload={() => load()}
                    />
                    <ChangeOrders
                      command={command}
                      snap={snap}
                      api={api}
                      run={run}
                      reload={() => load()}
                    />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
function Team({ api, people, run, tell, reload }) {
  const [accessEmail, AccessEmail] = useState("");
  const [name, N] = useState(""),
    [contact, C] = useState(""),
    [specialty, S] = useState(""),
    [uid, U] = useState("");
  return (
    <>
      <Card title="Cadastrar subcontractor">
        <Field label="Nome / empresa" value={name} onChange={N} />
        <Field label="Contato" value={contact} onChange={C} />
        <Field label="Especialidade" value={specialty} onChange={S} />
        <Field
          label={
            LIVE?.live
              ? "E-mail de acesso do profissional"
              : "ID da conta autenticada (opcional)"
          }
          value={LIVE?.live ? accessEmail : uid}
          onChange={LIVE?.live ? AccessEmail : U}
        />
        <p className="hint">
          {LIVE?.live
            ? "Ao confirmar, vinculamos a conta existente ou enviamos um convite ao e-mail informado. O acesso à obra depende da sua atribuição do escopo."
            : "Sem conta vinculada, o profissional fica cadastrado sem acesso ao portal."}
        </p>
        <Button
          disabled={!api}
          onClick={() =>
            run(async () => {
              if (LIVE?.live)
                await api.inviteAccount({
                  name,
                  email: accessEmail,
                  contact,
                  specialty,
                });
              else
                await api.command(null, "person", {
                  name,
                  contact,
                  specialty,
                  user_id: uid,
                });
              N("");
              C("");
              S("");
              U("");
              AccessEmail("");
              await reload();
              tell("Profissional cadastrado.");
            })
          }
        >
          {LIVE?.live
            ? "Salvar e vincular/convidar profissional"
            : "Salvar profissional"}
        </Button>
      </Card>
      <Card title="Diretório">
        {people.map((p) => (
          <div className="list-item" key={p.id}>
            <b>{p.name}</b>
            <p>
              {p.specialty} · {p.contact}
            </p>
            <small>{p.user_id ? "Conta vinculada" : "Acesso pendente"}</small>
          </div>
        ))}
        {!people.length && <p>Nenhum profissional cadastrado.</p>}
      </Card>
    </>
  );
}
function NewProject({ api, user, people, tell, run, onCreated }) {
  const [step, Step] = useState(0),
    [plan, Plan] = useState(blankPlan),
    [file, File] = useState(null),
    [text, Text] = useState(""),
    [questions, Q] = useState({
      scope: "",
      standard: "",
      constraints: "",
      rhythm: "",
      time: "",
    }),
    [reviewed, R] = useState(false),
    [requestID] = useState(() => requestUUID()),
    [processing, Processing] = useState(""),
    [analyzed, Analyzed] = useState(false);
  const set = (key, v) => {
      Plan((p) => ({ ...p, [key]: v }));
      R(false);
    },
    scope = (i, key, v) => {
      Plan((p) => ({
        ...p,
        scopes: p.scopes.map((s, j) => (j === i ? { ...s, [key]: v } : s)),
      }));
      R(false);
    },
    task = (i, j, key, v) => {
      scope(
        i,
        "tasks",
        plan.scopes[i].tasks.map((t, k) => (k === j ? { ...t, [key]: v } : t)),
      );
    };
  async function upload(f) {
    if (!f) return;
    if (f.size > 5000000) throw Error("Limite de 5 MB por documento.");
    if (
      !["application/pdf", "text/plain", "application/json"].includes(f.type) &&
      !f.name.match(/\.(pdf|txt|json)$/i)
    )
      throw Error("Use PDF, TXT ou JSON de plano.");
    File(f);
    Analyzed(false);
    Processing("Lendo documento…");
    try {
      let extracted = "";
      if (f.name.endsWith(".json")) {
        const p = JSON.parse(await f.text());
        const imported = p.project_title ? fromAI(p) : p;
        if (
          !Array.isArray(imported.scopes) ||
          imported.scopes.some((s) => !Array.isArray(s.tasks))
        )
          throw Error("JSON de plano inválido.");
        Plan({ ...blankPlan(), ...imported });
        Text("Plano JSON importado para revisão.");
        Q(smartContext(p));
        Analyzed(true);
        R(false);
        Step(1);
        return;
      }
      if (
        f.type === "application/pdf" ||
        f.name.toLowerCase().endsWith(".pdf")
      ) {
        const pdf = await pdfjs.getDocument({
          data: await f.arrayBuffer(),
          isEvalSupported: false,
        }).promise;
        try {
          let result = "";
          if (pdf.numPages > 100) throw Error("Limite de 100 páginas.");
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const c = await page.getTextContent();
            result += c.items.map((x) => x.str).join(" ") + "\n";
          }
          extracted = result;
          Text(result);
          if (!result.trim())
            tell(
              "PDF sem texto. Preencha manualmente ou envie uma versão com texto selecionável.",
            );
        } finally {
          await pdf.destroy();
        }
      } else {
        extracted = await f.text();
        Text(extracted);
      }
      R(false);
      if (extracted.trim()) await analyzeDocument(extracted, {});
    } finally {
      Processing("");
    }
  }
  async function analyzeDocument(source = text, context = questions) {
    if (!api || !user)
      throw Error(
        "Entre com sua conta para preencher automaticamente. O texto extraído continua disponível.",
      );
    Processing(
      "Analisando documento e preenchendo o rascunho com IA… Pode levar até um minuto.",
    );
    try {
      const result = await api.analyze(source, context);
      Plan(fromAI(result.plan));
      const extracted = smartContext(result.plan);
      Q(
        Object.fromEntries(
          Object.keys(extracted).map((k) => [
            k,
            context[k]?.trim() || extracted[k],
          ]),
        ),
      );
      R(false);
      Analyzed(true);
      Step(1);
      tell(
        "Documento analisado. Revise os dados preenchidos e confirme apenas o que falta.",
      );
    } finally {
      Processing("");
    }
  }
  async function save() {
    validatePlan(plan);
    if (!reviewed) throw Error("Confirme a revisão do plano.");
    if (!api || !user)
      throw Error("Conecte o ambiente e entre antes de salvar.");
    const result = await api.command(null, "create", {
      ...plan,
      request_id: requestID,
      reviewed: true,
    });
    if (file && !file.name.endsWith(".json")) {
      try {
        await api.command(result.project_id, "document", {
          name: file.name,
          mime: file.type || "text/plain",
          data_base64: await base64(file),
          visibility: "pm",
        });
      } catch (e) {
        tell("Projeto salvo. Anexo pendente: " + e.message, true);
        await onCreated(result.project_id);
        return;
      }
    }
    tell("Projeto criado em rascunho. Confira e aprove a baseline.");
    await onCreated(result.project_id);
  }
  return (
    <>
      <p className="eyebrow">NOVO PROJETO</p>
      <h1>Do estimate ao plano.</h1>
      {processing && (
        <p role="status" aria-live="polite" className="notice">
          {processing}
        </p>
      )}
      <fieldset
        disabled={!!processing}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        aria-busy={!!processing}
      >
        <div className="steps">
          {[
            "Documento",
            "Contexto SMART",
            "Projeto",
            "Escopo e equipe",
            "Revisão",
          ].map((t, i) => (
            <button
              key={t}
              className={step === i ? "active" : ""}
              onClick={() => Step(i)}
            >
              {i + 1}. {t}
            </button>
          ))}
        </div>
        {step === 0 && (
          <Card title="Importar documento">
            <label>
              Estimate aprovado / plano
              <input
                type="file"
                accept=".pdf,.txt,.json"
                onChange={(e) => run(() => upload(e.target.files[0]))}
              />
            </label>
            <p className="hint">
              Ao selecionar um PDF ou TXT, o texto será analisado pela IA para
              preencher o rascunho. Revise antes de salvar; nada é aprovado
              automaticamente.
            </p>
            <Area
              label="Texto extraído · confira antes de analisar"
              value={text}
              onChange={Text}
            />
            <Button
              disabled={!api || !text.trim()}
              onClick={() => run(() => analyzeDocument())}
            >
              Analisar e preencher automaticamente
            </Button>
            <Button secondary onClick={() => Step(1)}>
              Continuar manualmente
            </Button>
          </Card>
        )}
        {step === 1 && (
          <Card title="Revise o contexto extraído">
            <p className="hint">
              {analyzed
                ? "Rascunho preenchido a partir do documento. Confira os campos; em branco significa informação não encontrada."
                : "Envie o documento ou use Analisar e preencher automaticamente. Você também pode complementar manualmente."}
            </p>
            {plan.open_questions?.length > 0 && (
              <div className="notice">
                <strong>Pendências para confirmar</strong>
                <ul>
                  {plan.open_questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
            {[
              ["scope", "Scope · limites e exclusões do serviço"],
              ["standard", "Model · padrão e acabamento esperado"],
              [
                "constraints",
                "Alignment · acesso, materiais, licenças e restrições críticas",
              ],
              ["rhythm", "Rhythm · horários e comunicação"],
              ["time", "Time · datas e dependências"],
            ].map(([k, t]) => (
              <Area
                key={k}
                label={t}
                value={questions[k]}
                onChange={(v) => {
                  Q({ ...questions, [k]: v });
                  R(false);
                }}
              />
            ))}
            <p className="hint">
              Pendências críticas precisam ser esclarecidas antes da liberação
              da fase. A IA não confirma licença, segurança ou aprovação
              contratual.
            </p>
            <div className="actions">
              <Button
                disabled={!api || !text.trim()}
                onClick={() =>
                  run(async () => {
                    await analyzeDocument();
                  })
                }
              >
                {analyzed
                  ? "Atualizar sugestão com complementos"
                  : "Analisar e preencher automaticamente"}
              </Button>
              <Button secondary onClick={() => Step(2)}>
                {analyzed
                  ? "Continuar com os dados preenchidos"
                  : "Preencher manualmente"}
              </Button>
            </div>
          </Card>
        )}
        {step === 2 && (
          <Card title="Dados da obra">
            <Field
              label="Nome do projeto"
              value={plan.name}
              onChange={(v) => set("name", v)}
            />
            <Field
              label="Cliente"
              value={plan.client_name}
              onChange={(v) => set("client_name", v)}
            />
            <Field
              label="Endereço"
              value={plan.address}
              onChange={(v) => set("address", v)}
            />
            <div className="form-grid">
              <Field
                label="Número do estimate"
                value={plan.estimate_number}
                onChange={(v) => set("estimate_number", v)}
              />
              <Money
                label="Valor do contrato (USD)"
                value={plan.amount_cents}
                onChange={(v) => set("amount_cents", v)}
              />
              <Field
                label="Início previsto"
                type="date"
                value={plan.start_date}
                onChange={(v) => set("start_date", v)}
              />
              <Field
                label="Término previsto"
                type="date"
                value={plan.end_date}
                onChange={(v) => set("end_date", v)}
              />
            </div>
            {LIVE?.live && (
              <>
                <Field
                  label="E-mail de acesso do cliente"
                  value={plan.client_email || ""}
                  onChange={(v) => set("client_email", v)}
                />
                <Button
                  secondary
                  onClick={() =>
                    run(async () => {
                      const r = await api.inviteAccount({
                        kind: "client",
                        name: plan.client_name,
                        email: plan.client_email,
                      });
                      set("client_user_id", r.user_id);
                      tell(
                        r.invitation_sent
                          ? "Convite de acesso enviado ao cliente."
                          : "Conta existente do cliente vinculada.",
                      );
                    })
                  }
                >
                  Vincular ou convidar cliente
                </Button>
              </>
            )}
            <Field
              label="ID da conta do cliente (opcional)"
              value={plan.client_user_id}
              onChange={(v) => set("client_user_id", v)}
            />
            <Area
              label="Condições de cobrança do cliente"
              value={plan.payment_terms}
              onChange={(v) => set("payment_terms", v)}
            />
            <Button onClick={() => Step(3)}>Revisar escopo e equipe</Button>
          </Card>
        )}
        {step === 3 && (
          <>
            <p className="hint">
              Pesos dos escopos:{" "}
              {plan.scopes.reduce((a, s) => a + Number(s.weight_pct || 0), 0)}%
              / 100%. Tarefas também devem somar 100% dentro de cada escopo.
            </p>
            {plan.scopes.map((s, i) => (
              <Card key={i} title={"Escopo " + (i + 1)}>
                <Field
                  label="Nome do escopo"
                  value={s.name}
                  onChange={(v) => scope(i, "name", v)}
                />
                <div className="form-grid">
                  <Field
                    label="Peso na obra (%)"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={s.weight_pct}
                    onChange={(v) => scope(i, "weight_pct", Number(v))}
                  />
                  <Money
                    label="Subcontrato (USD)"
                    value={s.subcontract_cents}
                    onChange={(v) => scope(i, "subcontract_cents", v)}
                  />
                </div>
                <Select
                  label="Subcontractor"
                  value={s.person_id}
                  onChange={(v) => scope(i, "person_id", v)}
                  options={[
                    ["", "A definir"],
                    ...people.map((p) => [p.id, p.name]),
                  ]}
                />
                <Area
                  label="Materiais e responsabilidades do sub"
                  value={s.responsibilities}
                  onChange={(v) => scope(i, "responsibilities", v)}
                />
                <Area
                  label="Condições de pagamento do sub"
                  value={s.payment_terms}
                  onChange={(v) => scope(i, "payment_terms", v)}
                />
                {s.tasks.map((t, j) => (
                  <div className="task-editor" key={j}>
                    <Field
                      label={"Tarefa " + (j + 1)}
                      value={t.title}
                      onChange={(v) => task(i, j, "title", v)}
                    />
                    <Area
                      label="Critérios de aceite"
                      value={t.criteria}
                      onChange={(v) => task(i, j, "criteria", v)}
                    />
                    <div className="form-grid">
                      <Field
                        label="Peso dentro do escopo (%)"
                        type="number"
                        step="0.01"
                        value={t.weight_pct}
                        onChange={(v) => task(i, j, "weight_pct", Number(v))}
                      />
                      <Field
                        label="Prazo da tarefa"
                        type="date"
                        value={t.due_date}
                        onChange={(v) => task(i, j, "due_date", v)}
                      />
                      <Select
                        label="Dependência desta tarefa"
                        value={t.depends_on_index ?? -1}
                        onChange={(v) =>
                          task(i, j, "depends_on_index", Number(v))
                        }
                        options={[
                          [-1, "Sem dependência"],
                          ...s.tasks
                            .slice(0, j)
                            .map((x, k) => [k, x.title || "Tarefa " + (k + 1)]),
                        ]}
                      />
                    </div>
                    <Button
                      secondary
                      disabled={s.tasks.length === 1}
                      onClick={() =>
                        scope(
                          i,
                          "tasks",
                          s.tasks.filter((_, k) => k !== j),
                        )
                      }
                    >
                      Remover tarefa do rascunho
                    </Button>
                  </div>
                ))}
                <div className="actions">
                  <Button
                    secondary
                    onClick={() =>
                      scope(i, "tasks", [
                        ...s.tasks,
                        {
                          title: "",
                          criteria: "",
                          weight_pct: 0,
                          due_date: "",
                        },
                      ])
                    }
                  >
                    ＋ Tarefa
                  </Button>
                  <Button
                    secondary
                    disabled={plan.scopes.length === 1}
                    onClick={() =>
                      set(
                        "scopes",
                        plan.scopes.filter((_, j) => j !== i),
                      )
                    }
                  >
                    Remover escopo do rascunho
                  </Button>
                </div>
              </Card>
            ))}
            <Button
              secondary
              onClick={() =>
                set("scopes", [...plan.scopes, blankPlan().scopes[0]])
              }
            >
              ＋ Escopo
            </Button>
            <Button
              onClick={() =>
                run(() => {
                  validatePlan(plan);
                  Step(4);
                })
              }
            >
              Conferir plano
            </Button>
          </>
        )}
        {step === 4 && (
          <>
            <Card title="Resumo antes de criar">
              {(plan.open_questions || []).length > 0 && (
                <div className="notice">
                  <b>Pontos a esclarecer</b>
                  {plan.open_questions.map((q, i) => (
                    <p key={i}>{q}</p>
                  ))}
                </div>
              )}
              <h3>{plan.name || "Projeto sem nome"}</h3>
              <p>
                {plan.client_name} · {plan.address}
              </p>
              <div className="money-grid">
                <div>
                  <small>Contrato cliente</small>
                  <b>{money(plan.amount_cents)}</b>
                </div>
                <div>
                  <small>Subcontratos previstos</small>
                  <b>
                    {money(
                      plan.scopes.reduce((a, s) => a + s.subcontract_cents, 0),
                    )}
                  </b>
                </div>
              </div>
              {plan.scopes.map((s, i) => (
                <p key={i}>
                  {s.name || "Escopo sem nome"} · peso {s.weight_pct}% ·{" "}
                  {s.tasks.length} tarefas
                </p>
              ))}
              <p>
                O projeto será criado em rascunho. Aprovar a baseline é uma ação
                separada.
              </p>
            </Card>
            <Card title="Marcos de cobrança">
              {plan.milestones.map((m, i) => (
                <div className="task-editor" key={i}>
                  <Field
                    label="Entrega / marco"
                    value={m.title}
                    onChange={(v) =>
                      set(
                        "milestones",
                        plan.milestones.map((x, j) =>
                          j === i ? { ...x, title: v } : x,
                        ),
                      )
                    }
                  />
                  <Money
                    label="Valor (USD)"
                    value={m.amount_cents}
                    onChange={(v) =>
                      set(
                        "milestones",
                        plan.milestones.map((x, j) =>
                          j === i ? { ...x, amount_cents: v } : x,
                        ),
                      )
                    }
                  />
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={!!m.is_deposit}
                      onChange={(e) =>
                        set(
                          "milestones",
                          plan.milestones.map((x, j) =>
                            j === i
                              ? { ...x, is_deposit: e.target.checked }
                              : x,
                          ),
                        )
                      }
                    />
                    Sinal / depósito
                  </label>
                  <Button
                    secondary
                    onClick={() =>
                      set(
                        "milestones",
                        plan.milestones.filter((_, j) => j !== i),
                      )
                    }
                  >
                    Remover marco do rascunho
                  </Button>
                </div>
              ))}
              <Button
                secondary
                onClick={() =>
                  set("milestones", [
                    ...plan.milestones,
                    { title: "", amount_cents: 0, is_deposit: false },
                  ])
                }
              >
                ＋ Marco
              </Button>
            </Card>
            <Card title="Confirmação do PM">
              <label className="check">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => R(e.target.checked)}
                />
                Revisei dados, escopos, pesos, valores e critérios. Pendências
                de acesso serão tratadas antes do uso externo.
              </label>
              <div className="actions">
                <Button
                  disabled={!api || !user || !reviewed}
                  onClick={() => run(save)}
                >
                  Criar projeto em rascunho
                </Button>
                <Button
                  secondary
                  onClick={() => downloadJSON(plan, "plano-rascunho.json")}
                >
                  Exportar rascunho
                </Button>
              </div>
              {!user && (
                <p className="hint">
                  Conecte e autentique sua conta para salvar o projeto. Exporte
                  o rascunho antes de sair desta tela.
                </p>
              )}
            </Card>
          </>
        )}
        {step < 4 && (
          <div className="actions">
            <Button
              secondary
              onClick={() => downloadJSON(plan, "plano-rascunho.json")}
            >
              Exportar rascunho
            </Button>
          </div>
        )}
      </fieldset>
    </>
  );
}
function Money({ label, value, onChange }) {
  const [text, T] = useState((Number(value || 0) / 100).toFixed(2));
  return (
    <Field
      label={label}
      value={text}
      inputMode="decimal"
      onChange={(v) => {
        T(v);
        try {
          onChange(cents(v));
        } catch {
          onChange(null);
        }
      }}
    />
  );
}
async function base64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 32768)
    s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(s);
}
function downloadJSON(obj, name) {
  download(
    new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }),
    name,
  );
}
function download(blob, name) {
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function Scope({ scope: s, snap, api, command, run, reload }) {
  const [checked, Check] = useState(false),
    [reason, Reason] = useState("");
  const gate = snap.gates?.find((g) => g.scope_id === s.id);
  const tasks = snap.tasks.filter((t) => t.scope_id === s.id),
    weight = snap.weights.find((w) => w.scope_id === s.id);
  return (
    <details className="scope">
      <summary>
        <span>
          <b>{s.name}</b>
          <small>
            Peso na obra: {weight?.weight_pct ?? "não configurado"}%
          </small>
        </span>
        <strong>{s.percent.toFixed(1)}%</strong>
      </summary>
      <progress max="100" value={s.percent} />
      {snap.role !== "client" && (
        <p className="hint">
          {gate ? "Fase liberada pelo PM" : "Liberação da fase pendente"}
        </p>
      )}
      {snap.role === "pm" && !gate && (
        <div className="review">
          <label className="check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => Check(e.target.checked)}
            />
            Verifiquei requisitos legais/licenças/inspeções aplicáveis,
            segurança e prontidão desta fase.
          </label>
          <Area
            label="Registro de liberação da fase"
            value={reason}
            onChange={Reason}
          />
          <Button
            disabled={
              !checked || !reason.trim() || !snap.project.baseline_frozen_at
            }
            onClick={() =>
              run(() =>
                command("release_scope", {
                  scope_id: s.id,
                  reason,
                  legal_confirmed: checked,
                  safety_confirmed: checked,
                  readiness_confirmed: checked,
                }),
              )
            }
          >
            Liberar fase
          </Button>
        </div>
      )}
      {tasks.map((t) => (
        <Task
          key={t.id}
          task={t}
          snap={snap}
          api={api}
          command={command}
          run={run}
          reload={reload}
        />
      ))}
    </details>
  );
}
function Task({ task: t, snap, api, command, run, reload }) {
  const [pct, P] = useState("0"),
    [note, N] = useState(""),
    [reason, R] = useState(""),
    [criteria, C] = useState(false);
  const v = snap.validations.find((v) => v.task_id === t.id);
  const reports = snap.reports?.filter((r) => r.task_id === t.id) || [];
  const obs = snap.observations?.filter((o) => o.task_id === t.id) || [];
  return (
    <div className="task">
      <h3>{t.title}</h3>
      <p className="hint">
        Peso no escopo: {t.weight_pct}% · Validado: {v?.validated_pct || 0}%
      </p>
      <p>
        {snap.criteria.find((c) => c.task_id === t.id)?.criteria ||
          "Critério pendente de configuração"}
      </p>
      {snap.criteria.find((c) => c.task_id === t.id)?.depends_on && (
        <p className="hint">
          Depende da conclusão validada de:{" "}
          {snap.tasks.find(
            (x) =>
              x.id === snap.criteria.find((c) => c.task_id === t.id).depends_on,
          )?.title || "tarefa anterior"}
        </p>
      )}
      {snap.role !== "client" && (
        <>
          <Field
            label={
              snap.role === "pm"
                ? "Percentual observado na vistoria"
                : "Percentual informado"
            }
            type="number"
            min="0"
            max="100"
            step="1"
            value={pct}
            onChange={P}
          />
          <input
            aria-label="Ajustar percentual"
            type="range"
            min="0"
            max="100"
            value={pct}
            onChange={(e) => P(e.target.value)}
          />
          <Area label="Observação" value={note} onChange={N} />
          <Button
            disabled={
              !snap.project.baseline_frozen_at || !!snap.details?.closed_at
            }
            onClick={() =>
              run(async () => {
                const p = percent(pct);
                if (snap.role === "pm")
                  await command("observe", { task_id: t.id, percent: p, note });
                else {
                  await api.report(t.id, p, note);
                  await reload();
                }
              })
            }
          >
            {snap.role === "pm"
              ? "Registrar progresso da vistoria"
              : "Enviar relatório ao PM"}
          </Button>
        </>
      )}
      {snap.role === "pm" && (
        <>
          <Area
            label="Justificativa da validação / ajuste"
            value={reason}
            onChange={R}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={criteria}
              onChange={(e) => C(e.target.checked)}
            />
            Conferi os critérios de aceite e as evidências.
          </label>
          {obs.map((o) => (
            <div className="review" key={o.id}>
              <p>
                Vistoria: {o.observed_pct}% · {displayTime(o.created_at)}
              </p>
              <p>{o.note}</p>
              {o.validated_at ? (
                <small>Validada pelo PM</small>
              ) : (
                <Button
                  disabled={!criteria || !reason.trim()}
                  onClick={() =>
                    run(() =>
                      command("validate_observation", {
                        id: o.id,
                        reason,
                        criteria_confirmed: criteria,
                      }),
                    )
                  }
                >
                  Validar vistoria · sem gerar crédito
                </Button>
              )}
            </div>
          ))}
          {reports.map((r) => (
            <div className="review" key={r.id}>
              <p>
                Sub informou {r.reported_pct}% · {r.status}
              </p>
              <p>{r.note}</p>
              {r.status === "pending" && (
                <div className="actions">
                  <Button
                    disabled={!criteria || !reason.trim()}
                    onClick={() =>
                      run(async () => {
                        await api.review(r.id, "approve", percent(pct), reason);
                        await reload();
                      })
                    }
                  >
                    Validar sub em {pct}% e reconhecer crédito
                  </Button>
                  <Button
                    secondary
                    disabled={!reason.trim()}
                    onClick={() =>
                      run(async () => {
                        await api.review(r.id, "reject", null, reason);
                        await reload();
                      })
                    }
                  >
                    Solicitar correção
                  </Button>
                </div>
              )}
            </div>
          ))}
        </>
      )}
      {snap.role === "sub" &&
        reports.map((r) => (
          <p key={r.id}>
            Informado: {r.reported_pct}% · {r.status} · {r.review_reason || ""}
          </p>
        ))}
    </div>
  );
}
function EventPanel({ snap, command, run }) {
  const [k, K] = useState("visit"),
    [body, B] = useState(""),
    [visibility, V] = useState("pm"),
    [scope, S] = useState(""),
    [corrects, C] = useState("");
  return (
    <Card title="Eventos e decisões">
      {snap.role === "pm" && (
        <>
          <Select
            label="Tipo"
            value={k}
            onChange={K}
            options={[
              "visit",
              "delivery",
              "inspection",
              "delay",
              "issue",
              "decision",
              "correction",
            ].map((v, i) => [
              v,
              [
                "Visita",
                "Entrega",
                "Inspeção",
                "Atraso",
                "Problema",
                "Decisão",
                "Correção",
              ][i],
            ])}
          />
          <Select
            label="Visibilidade"
            value={visibility}
            onChange={V}
            options={[
              ["pm", "Somente PM"],
              ["client", "Publicar ao cliente"],
              ["sub", "Sub do escopo"],
            ]}
          />
          <Select
            label="Escopo"
            value={scope}
            onChange={S}
            options={[
              ["", "Obra geral"],
              ...snap.scopes.map((s) => [s.id, s.name]),
            ]}
          />
          {k === "correction" && (
            <Select
              label="Evento corrigido"
              value={corrects}
              onChange={C}
              options={[
                ["", "Selecione"],
                ...snap.events.map((e) => [e.id, e.body.slice(0, 70)]),
              ]}
            />
          )}
          <Area label="Descrição e motivo" value={body} onChange={B} />
          <Button
            onClick={() =>
              run(async () => {
                if (visibility === "sub" && !scope)
                  throw Error("Selecione o escopo do sub.");
                await command("event", {
                  kind: k,
                  body,
                  visibility,
                  scope_id: scope,
                  corrects_id: k === "correction" ? corrects : "",
                });
                B("");
              })
            }
          >
            Registrar evento
          </Button>
        </>
      )}
      {[...snap.events]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((e) => (
          <div className="time-entry" key={e.id}>
            <b>{e.kind}</b>
            <p>{e.body}</p>
            <small>
              {displayTime(e.created_at)} · {e.visibility}
            </small>
            {e.corrects_id && (
              <small>Vinculado ao registro {e.corrects_id}</small>
            )}
            {snap.role === "pm" && !["restriction"].includes(e.kind) && (
              <Button
                secondary
                onClick={() =>
                  run(async () => {
                    const reason = prompt(
                      "Motivo para restringir este registro:",
                    );
                    if (reason) await command("restrict", { id: e.id, reason });
                  })
                }
              >
                Restringir visualização
              </Button>
            )}
          </div>
        ))}
    </Card>
  );
}
function Documents({ snap, api, command, run }) {
  const [f, F] = useState(null),
    [v, V] = useState("pm"),
    [sid, S] = useState("");
  return (
    <Card title="Documentos e evidências">
      {snap.role !== "client" && (
        <>
          <label>
            Arquivo (até 5 MB)
            <input
              type="file"
              accept=".pdf,.txt,.jpg,.jpeg,.png,.webp"
              onChange={(e) => F(e.target.files[0])}
            />
          </label>
          <Select
            label="Escopo do anexo"
            value={sid}
            onChange={S}
            options={[
              ["", "Obra geral"],
              ...snap.scopes.map((s) => [s.id, s.name]),
            ]}
          />
          {snap.role === "pm" && (
            <Select
              label="Visibilidade do anexo"
              value={v}
              onChange={V}
              options={[
                ["pm", "Somente PM"],
                ["client", "Cliente"],
                ["sub", "Sub do escopo"],
              ]}
            />
          )}
          <Button
            disabled={!f}
            onClick={() =>
              run(async () => {
                if (f.size > 5000000) throw Error("Limite de 5 MB.");
                await command("document", {
                  name: f.name,
                  mime: f.type || "text/plain",
                  data_base64: await base64(f),
                  visibility: snap.role === "sub" ? "sub" : v,
                  scope_id: sid,
                });
                F(null);
              })
            }
          >
            Anexar
          </Button>
        </>
      )}
      {snap.documents.map((d) => (
        <div key={d.id} className="list-item">
          <b>{d.name}</b>
          <small>
            {d.visibility} · {new Date(d.created_at).toLocaleDateString()}
          </small>
          <Button
            secondary
            onClick={() =>
              run(async () => {
                const doc = await api.download(d.id);
                download(
                  new Blob(
                    [
                      Uint8Array.from(atob(doc.data_base64), (c) =>
                        c.charCodeAt(0),
                      ),
                    ],
                    { type: doc.mime },
                  ),
                  doc.name,
                );
              })
            }
          >
            Baixar documento
          </Button>
        </div>
      ))}
    </Card>
  );
}
function Financial({ snap, command, run }) {
  const [k, K] = useState("expense"),
    [amount, A] = useState(0),
    [ref, R] = useState(""),
    [sid, S] = useState("");
  const credits =
    snap.credits?.reduce((a, e) => a + Number(e.delta_cents), 0) || 0;
  return (
    <Card title="Valores e registros">
      {snap.role !== "sub" && (
        <p>
          Contrato cliente <b>{money(snap.clientTerms?.amount_cents)}</b>
        </p>
      )}
      {snap.role !== "client" && (
        <>
          <p>
            Subcontratos{" "}
            <b>
              {money(
                snap.terms?.reduce(
                  (a, t) => a + Number(t.subcontract_cents),
                  0,
                ),
              )}
            </b>
          </p>
          <p>
            Crédito reconhecido <b>{money(credits)}</b>
          </p>
          <small>Crédito não é pagamento.</small>
          {snap.payments.map((p) => (
            <div className="list-item" key={p.id}>
              {p.kind}: {money(p.amount_cents)}
              <small>{p.reference}</small>
            </div>
          ))}
        </>
      )}
      {snap.role === "pm" && (
        <>
          <h3>Registrar movimentação realizada</h3>
          <Select
            label="Tipo de registro"
            value={k}
            onChange={K}
            options={[
              ["expense", "Despesa"],
              ["client_receipt", "Recebimento do cliente"],
              ["sub_payment", "Pagamento ao sub"],
            ]}
          />
          <Select
            label="Escopo financeiro"
            value={sid}
            onChange={S}
            options={[
              ["", "Obra geral"],
              ...snap.scopes.map((s) => [s.id, s.name]),
            ]}
          />
          <Money label="Valor realizado (USD)" value={amount} onChange={A} />
          <Field label="Referência / comprovante" value={ref} onChange={R} />
          <Button
            onClick={() =>
              run(() =>
                command("payment", {
                  kind: k,
                  scope_id: sid,
                  amount_cents: amount,
                  reference: ref,
                }),
              )
            }
          >
            Registrar · sem transferir dinheiro
          </Button>
        </>
      )}
    </Card>
  );
}
function Milestones({ snap, command, api, run, reload }) {
  const [name, N] = useState(""),
    [reason, R] = useState(""),
    [consent, C] = useState(false);
  if (snap.role === "sub") return null;
  return (
    <Card title="Entregas e cobranças">
      <Field label="Nome para aceite" value={name} onChange={N} />
      <Area label="Motivo / referência da ação" value={reason} onChange={R} />
      {snap.role === "client" && (
        <label className="check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => C(e.target.checked)}
          />
          Li esta versão, concordo em assinar eletronicamente e confirmo minha
          decisão.
        </label>
      )}
      {snap.milestones.map((m) => (
        <div key={m.id} className="list-item">
          <h3>{m.title}</h3>
          <p>
            {money(m.amount_cents)} · {m.status}
          </p>
          {snap.role === "pm" && (
            <div className="actions">
              {m.status === "pending" && (
                <Button
                  onClick={() =>
                    run(() =>
                      command("milestone", {
                        id: m.id,
                        status: m.is_deposit ? "invoiced" : "ready_for_review",
                        reason,
                      }),
                    )
                  }
                >
                  {m.is_deposit
                    ? "Registrar faturamento do sinal"
                    : "Enviar para revisão"}
                </Button>
              )}
              {m.status === "ready_for_review" && (
                <Button
                  onClick={() =>
                    run(() =>
                      command("milestone", {
                        id: m.id,
                        status: "validated",
                        reason,
                      }),
                    )
                  }
                >
                  Validar entrega para cliente
                </Button>
              )}
              {m.status === "signed" && (
                <Button
                  onClick={() =>
                    run(() =>
                      command("milestone", {
                        id: m.id,
                        status: "invoiced",
                        reason,
                      }),
                    )
                  }
                >
                  Registrar faturamento
                </Button>
              )}
              {m.status === "invoiced" && (
                <Button
                  onClick={() =>
                    run(() =>
                      command("milestone", {
                        id: m.id,
                        status: "paid",
                        reason,
                      }),
                    )
                  }
                >
                  Vincular recebimento registrado
                </Button>
              )}
            </div>
          )}
          {snap.role === "client" && m.status === "validated" && (
            <div className="actions">
              <Button
                disabled={!consent || !name.trim()}
                onClick={() =>
                  run(() =>
                    command("milestone_decision", {
                      id: m.id,
                      decision: "signed",
                      name,
                      reason,
                      consent,
                    }),
                  )
                }
              >
                Aprovar entrega
              </Button>
              <Button
                secondary
                disabled={!consent || !name.trim() || !reason.trim()}
                onClick={() =>
                  run(() =>
                    command("milestone_decision", {
                      id: m.id,
                      decision: "disputed",
                      name,
                      reason,
                      consent,
                    }),
                  )
                }
              >
                Informar problema
              </Button>
            </div>
          )}
        </div>
      ))}
      {!snap.milestones.length && <p>Nenhum marco cadastrado.</p>}
      {snap.emailStatus?.length > 0 && (
        <p className="hint">
          Cópias:{" "}
          {snap.emailStatus.filter((e) => e.status === "pending").length}{" "}
          pendentes ·{" "}
          {snap.emailStatus.filter((e) => e.status === "sent").length} aceitas
          pelo provedor de e-mail.
        </p>
      )}
      {snap.signatures?.length > 0 && (
        <Button
          secondary
          onClick={() =>
            downloadJSON(snap.signatures, "assinaturas-eletronicas.json")
          }
        >
          Baixar cópias das assinaturas
        </Button>
      )}
      {snap.role === "pm" &&
        LIVE?.receiptEmail !== false &&
        snap.emailStatus?.some((e) => e.status === "pending") && (
          <Button
            secondary
            onClick={() =>
              run(async () => {
                const r = await api.dispatchReceipts(snap.project.id);
                await reload();
                if (r.pending_or_failed)
                  throw Error(
                    "O envio de algumas cópias está pendente. Confira a configuração do remetente e tente novamente dentro da janela de envio.",
                  );
                if (r.manual_review)
                  throw Error(
                    "Há cópias que exigem conferência manual antes de novo envio.",
                  );
              })
            }
          >
            Enviar cópias de aceite pendentes por e-mail
          </Button>
        )}
      {snap.receipts?.length > 0 && (
        <Button
          secondary
          onClick={() =>
            downloadJSON(snap.receipts, "registros-de-aceite.json")
          }
        >
          Baixar registros de aceite
        </Button>
      )}
      {LIVE?.receiptEmail === false && (
        <p className="hint">
          A cópia por e-mail está indisponível. Você pode baixar os registros e
          assinaturas nesta tela.
        </p>
      )}
      <p className="hint">
        Aceites eletrônicos preservam identidade, versão e hash. O status de
        envio da cópia é registrado separadamente da aprovação.
      </p>
    </Card>
  );
}
function ChangeOrders({ snap, api, command, run, reload }) {
  const [title, T] = useState(""),
    [description, D] = useState(""),
    [price, Price] = useState(0),
    [sub, Sub] = useState(""),
    [subPrice, SP] = useState(0),
    [scopeName, SN] = useState(""),
    [taskTitle, TT] = useState(""),
    [weight, W] = useState("100"),
    [pct, P] = useState("0"),
    [note, N] = useState(""),
    [reason, R] = useState(""),
    [confirmed, C] = useState(false);
  const [signer, Signer] = useState("");
  const co = snap.changeOrders;
  const act = (fn) =>
    run(async () => {
      await fn();
      await reload();
    });
  return (
    <Card title="Change Orders">
      {snap.role === "client" && (
        <Field
          label="Nome para assinatura do adicional"
          value={signer}
          onChange={Signer}
        />
      )}
      <p>Adicionais preservam o contrato, progresso e créditos originais.</p>
      <Field label="Solicitação de adicional" value={title} onChange={T} />
      <Area label="Descrição da solicitação" value={description} onChange={D} />
      <Button
        onClick={() =>
          act(() => api.requestChangeOrder(snap.project.id, title, description))
        }
      >
        Registrar solicitação
      </Button>
      {snap.role === "pm" && (
        <>
          <Money
            label="Valor proposto ao cliente (USD)"
            value={price}
            onChange={Price}
          />
          <Button
            onClick={() =>
              act(() =>
                api.createChangeOrder(
                  snap.project.id,
                  title,
                  description,
                  price,
                ),
              )
            }
          >
            Preparar proposta separada
          </Button>
        </>
      )}
      {co.requests.map((r) => (
        <div key={r.id} className="list-item">
          <b>{r.title}</b>
          <p>
            {r.description} · {r.status}
          </p>
          {snap.role === "pm" && r.status === "pending" && (
            <div className="actions">
              <Button
                onClick={() =>
                  act(() => api.formalizeChangeOrderRequest(r.id, price))
                }
              >
                Formalizar com valor proposto
              </Button>
              <Button
                secondary
                onClick={() =>
                  act(async () => {
                    const why = prompt("Motivo da recusa:");
                    if (why) await api.declineChangeOrderRequest(r.id, why);
                  })
                }
              >
                Recusar solicitação
              </Button>
            </div>
          )}
        </div>
      ))}
      <Area
        label="Justificativa / observação do adicional"
        value={reason}
        onChange={R}
      />
      <label className="check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => C(e.target.checked)}
        />
        {snap.role === "client"
          ? "Li escopo e valor desta versão e concordo em assiná-la eletronicamente."
          : "Conferi os critérios e as evidências desta ação."}
      </label>
      {co.orders.map((o) => {
        const scopes = co.scopes.filter((s) => s.co_id === o.id);
        return (
          <details key={o.id} className="scope">
            <summary>
              <b>{o.title}</b>
              <span className="badge">{o.status}</span>
            </summary>
            <p>{o.description}</p>
            {snap.role !== "sub" && (
              <p>
                Valor cliente:{" "}
                <b>
                  {money(
                    co.clientTerms.find((t) => t.co_id === o.id)
                      ?.client_amount_cents,
                  )}
                </b>
              </p>
            )}
            {snap.role === "pm" && o.status === "draft" && (
              <div className="review">
                <Field
                  label={"Escopo do adicional " + o.title}
                  value={scopeName}
                  onChange={SN}
                />
                <Select
                  label={"Sub do adicional " + o.title}
                  value={sub}
                  onChange={Sub}
                  options={[
                    ["", "Selecione uma conta atribuída"],
                    ...(snap.members || [])
                      .filter((m) => m.role === "sub")
                      .map((m) => [m.user_id, m.user_id]),
                  ]}
                />
                <Money
                  label={"Subcontrato do adicional " + o.title + " (USD)"}
                  value={subPrice}
                  onChange={SP}
                />
                <Button
                  onClick={() =>
                    act(() =>
                      api.addChangeOrderScope(o.id, scopeName, sub, subPrice),
                    )
                  }
                >
                  Adicionar escopo ao adicional
                </Button>
                <Button
                  disabled={!confirmed}
                  onClick={() => act(() => api.submitChangeOrder(o.id))}
                >
                  Enviar proposta ao cliente
                </Button>
              </div>
            )}
            {snap.role === "client" && o.status === "submitted" && (
              <div className="actions">
                <Button
                  disabled={!confirmed || !signer.trim()}
                  onClick={() =>
                    act(() =>
                      command("sign_co", {
                        id: o.id,
                        name: signer,
                        consent: confirmed,
                      }),
                    )
                  }
                >
                  Assinar proposta do adicional
                </Button>
                <Button
                  secondary
                  disabled={!confirmed || !reason.trim()}
                  onClick={() =>
                    act(() => api.decideChangeOrder(o.id, false, reason))
                  }
                >
                  Recusar proposta do adicional
                </Button>
              </div>
            )}
            {snap.role === "pm" && o.status === "client_approved" && (
              <Button
                disabled={!confirmed}
                onClick={() => act(() => api.activateChangeOrder(o.id))}
              >
                Ativar adicional aprovado
              </Button>
            )}
            {scopes.map((s) => {
              const terms = co.subTerms?.find((t) => t.scope_id === s.id),
                tasks = co.tasks.filter((t) => t.scope_id === s.id);
              return (
                <div key={s.id} className="task">
                  <h3>{s.title}</h3>
                  {snap.role !== "client" && (
                    <p>
                      Subcontrato: {money(terms?.subcontract_cents)} · Crédito:{" "}
                      {money(
                        co.credits
                          ?.filter((c) => c.scope_id === s.id)
                          .reduce((a, c) => a + Number(c.delta_cents), 0),
                      )}
                    </p>
                  )}
                  {snap.role === "pm" && o.status === "draft" && (
                    <>
                      <Field
                        label={"Tarefa do adicional " + s.title}
                        value={taskTitle}
                        onChange={TT}
                      />
                      <Field
                        label={"Peso da tarefa do adicional " + s.title}
                        type="number"
                        value={weight}
                        onChange={W}
                      />
                      <Button
                        onClick={() =>
                          act(() =>
                            api.addChangeOrderTask(
                              s.id,
                              taskTitle,
                              percent(weight),
                            ),
                          )
                        }
                      >
                        Adicionar tarefa ao adicional
                      </Button>
                    </>
                  )}
                  {tasks.map((t) => (
                    <div className="task" key={t.id}>
                      <b>{t.title}</b>
                      <p>
                        Peso {t.weight_pct}% · Validado{" "}
                        {co.validations.find((v) => v.task_id === t.id)
                          ?.validated_pct || 0}
                        %
                      </p>
                      {snap.role === "sub" && o.status === "active" && (
                        <>
                          <Field
                            label={"Progresso do adicional " + t.title}
                            type="number"
                            value={pct}
                            onChange={P}
                          />
                          <Area
                            label={"Relatório do adicional " + t.title}
                            value={note}
                            onChange={N}
                          />
                          <Button
                            onClick={() =>
                              act(() =>
                                api.reportChangeOrder(t.id, percent(pct), note),
                              )
                            }
                          >
                            Informar progresso do adicional
                          </Button>
                        </>
                      )}
                      {snap.role === "pm" &&
                        co.reports
                          ?.filter(
                            (r) => r.task_id === t.id && r.status === "pending",
                          )
                          .map((r) => (
                            <div key={r.id} className="review">
                              <p>
                                Informado: {r.reported_pct}% · {r.note}
                              </p>
                              <Field
                                label={
                                  "Percentual validado do adicional " + t.title
                                }
                                type="number"
                                value={pct}
                                onChange={P}
                              />
                              <Button
                                disabled={!confirmed || !reason.trim()}
                                onClick={() =>
                                  act(() =>
                                    api.reviewChangeOrderReport(
                                      r.id,
                                      "approve",
                                      percent(pct),
                                      reason,
                                    ),
                                  )
                                }
                              >
                                Validar adicional e crédito separado
                              </Button>
                              <Button
                                secondary
                                disabled={!reason.trim()}
                                onClick={() =>
                                  act(() =>
                                    api.reviewChangeOrderReport(
                                      r.id,
                                      "reject",
                                      null,
                                      reason,
                                    ),
                                  )
                                }
                              >
                                Solicitar correção do adicional
                              </Button>
                            </div>
                          ))}
                    </div>
                  ))}
                </div>
              );
            })}
            <p className="hint">
              Aceite desta proposta no piloto não substitui a assinatura formal
              e a cópia por e-mail exigidas para liberação externa.
            </p>
          </details>
        );
      })}
      {!co.orders.length && <p>Nenhum adicional formalizado.</p>}
    </Card>
  );
}

createRoot(document.getElementById("root")).render(<App />);
