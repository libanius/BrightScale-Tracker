/* BrightScale Tracker — cloud layer (Supabase, schema "tracker").
 * Replaces the old GitHub JSON sync. The phone keeps an IndexedDB copy for speed/offline;
 * every local write is queued in an outbox and pushed to Supabase, and the app pulls the
 * server state on start, on focus and on realtime changes.
 * Requires the supabase-js UMD bundle (window.supabase) to be loaded first.
 */
(function (global) {
  'use strict';

  var CFG = {
    url: 'https://hyvoatfozlpsevsbkxxm.supabase.co',
    key: 'sb_publishable__O44GfW3qU7SLQqfIx6Bgg_a-RtZ5JN',
    schema: 'tracker',
    companyId: 'brightscale',
    outboxKey: 'bs_cloud_outbox_v1',
    lastPullKey: 'bs_cloud_last_pull'
  };
  CFG.shareFn = CFG.url + '/functions/v1/tracker-share';

  var STORES = ['people', 'projects', 'units', 'scopes', 'tasks', 'expenses', 'notes'];
  var DEPENDENCY_ORDER = STORES.slice(); // parents first

  var client = global.supabase.createClient(CFG.url, CFG.key, {
    db: { schema: CFG.schema },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'bs-tracker-auth' }
  });

  // Old GitHub credentials are no longer used: remove them from the device.
  try {
    ['brightscale_gh_token', 'gh_token', 'gh_user', 'gh_repo'].forEach(function (k) { localStorage.removeItem(k); });
  } catch (e) {}

  /* ── helpers ───────────────────────────────────────── */
  function nz(v) { return (v === '' || v === undefined) ? null : v; }
  function num(v, d) { var n = Number(v); return isFinite(n) && v !== null && v !== '' ? n : (d === undefined ? null : d); }
  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function dateOnly(v) { v = nz(v); return v ? String(v).slice(0, 10) : null; }

  /* ── app <-> database mapping ─────────────────────── */
  var MAP = {
    people: {
      toDb: function (p) {
        return { id: p.id, company_id: CFG.companyId, name: p.name || 'Sem nome', company: nz(p.company), email: nz(p.email),
          phone: nz(p.phone), active: p.active !== false, created_at: nz(p.createdAt) || undefined };
      },
      toApp: function (r) {
        return { id: r.id, name: r.name, company: str(r.company), email: str(r.email), phone: str(r.phone), active: r.active !== false,
          createdAt: r.created_at, updatedAt: r.updated_at };
      }
    },
    projects: {
      toDb: function (p) {
        var c = p.client || {};
        return { id: p.id, company_id: CFG.companyId, name: p.name || 'Projeto', address: nz(p.address), client_name: nz(c.name),
          client_contact: nz(c.contact), client_email: nz(c.email || p.clientEmail), contract_total: num(p.contractTotal),
          contract_summary: nz(p.contractSummary), estimate_number: nz(p.estimateNumber), client_phone: nz(c.phone),
          created_at: nz(p.createdAt) || undefined };
      },
      toApp: function (r, local) {
        return { id: r.id, name: r.name, address: str(r.address),
          client: { name: str(r.client_name), contact: str(r.client_contact), email: str(r.client_email), phone: str(r.client_phone) },
          estimateNumber: str(r.estimate_number),
          contractTotal: num(r.contract_total, 0), contractSummary: str(r.contract_summary),
          documentId: local ? (local.documentId || '') : '', documentIds: local ? (local.documentIds || []) : [],
          createdAt: r.created_at, updatedAt: r.updated_at };
      }
    },
    units: {
      toDb: function (u) {
        return { id: u.id, project_id: u.projectId, unit_number: nz(u.unitNumber), bd_ba: nz(u.bdBa), invoice: nz(u.invoice),
          start_date: dateOnly(u.startDate), deadline: dateOnly(u.deadline), supervisors: u.supervisors || {},
          created_at: nz(u.createdAt) || undefined };
      },
      toApp: function (r, local) {
        return { id: r.id, projectId: r.project_id, unitNumber: str(r.unit_number), bdBa: str(r.bd_ba), invoice: str(r.invoice),
          startDate: str(r.start_date), deadline: str(r.deadline),
          supervisors: r.supervisors || { demo: '', painter: '', tile: '', assembler: '' },
          documentId: local ? (local.documentId || '') : '',
          createdAt: r.created_at, updatedAt: r.updated_at };
      }
    },
    scopes: {
      toDb: function (s) {
        return { id: s.id, unit_id: s.unitId, title: s.title || 'Scope', sort_order: num(s.order, 0), weight: num(s.weight, 0),
          person_id: nz(s.personId), subcontract_amount: num(s.subcontractAmount, 0), subcontract_paid: num(s.subcontractPaid, 0),
          description: nz(s.description), created_at: nz(s.createdAt) || undefined };
      },
      toApp: function (r) {
        return { id: r.id, unitId: r.unit_id, title: r.title, order: num(r.sort_order, 0), weight: num(r.weight, 0),
          personId: str(r.person_id), subcontractorName: '', subcontractAmount: num(r.subcontract_amount, 0),
          subcontractPaid: num(r.subcontract_paid, 0), description: str(r.description),
          createdAt: r.created_at, updatedAt: r.updated_at };
      }
    },
    tasks: {
      toDb: function (t) {
        var p = Math.max(0, Math.min(100, num(t.progress, 0)));
        var st = ['pending', 'in_progress', 'completed'].indexOf(t.status) >= 0 ? t.status
          : (p === 0 ? 'pending' : p === 100 ? 'completed' : 'in_progress');
        return { id: t.id, scope_id: t.scopeId, title: t.title || 'Task', sort_order: num(t.order, 0), progress: p,
          deadline: dateOnly(t.deadline), status: st, acceptance_criteria: nz(t.acceptanceCriteria),
          created_at: nz(t.createdAt) || undefined };
      },
      toApp: function (r) {
        return { id: r.id, scopeId: r.scope_id, title: r.title, order: num(r.sort_order, 0), progress: num(r.progress, 0),
          deadline: str(r.deadline), status: r.status, acceptanceCriteria: str(r.acceptance_criteria),
          createdAt: r.created_at, updatedAt: r.updated_at };
      }
    },
    expenses: {
      toDb: function (e) {
        return { id: e.id, project_id: e.projectId, scope_id: nz(e.scopeId), type: e.type === 'labor' ? 'labor' : 'material',
          description: nz(e.description), worker_name: nz(e.workerName), note: nz(e.note), hourly_rate: num(e.hourlyRate),
          hours: num(e.hours), amount: num(e.amount, 0), date: dateOnly(e.date), created_at: nz(e.createdAt) || undefined };
      },
      toApp: function (r) {
        var out = { id: r.id, projectId: r.project_id, type: r.type, description: str(r.description), amount: num(r.amount, 0),
          date: str(r.date), scopeId: str(r.scope_id), note: str(r.note), createdAt: r.created_at, updatedAt: r.updated_at };
        if (r.type === 'labor') {
          out.workerName = str(r.worker_name); out.hourlyRate = num(r.hourly_rate, 0); out.hours = num(r.hours, 0);
        }
        return out;
      }
    },
    notes: {
      toDb: function (n) {
        return { id: n.id, project_id: n.projectId, scope_id: nz(n.scopeId), type: n.type || 'general', text: n.text || '',
          date: dateOnly(n.date), internal_only: n.internalOnly !== false, created_at: nz(n.createdAt) || undefined };
      },
      toApp: function (r) {
        return { id: r.id, projectId: r.project_id, scopeId: str(r.scope_id), type: r.type, text: r.text, date: str(r.date),
          internalOnly: r.internal_only !== false, createdAt: r.created_at, updatedAt: r.updated_at };
      }
    }
  };

  /* ── outbox ─────────────────────────────────────────── */
  function readOutbox() {
    try { return JSON.parse(localStorage.getItem(CFG.outboxKey) || '[]'); } catch (e) { return []; }
  }
  function writeOutbox(list) {
    try { localStorage.setItem(CFG.outboxKey, JSON.stringify(list)); } catch (e) {}
    emit();
  }
  function enqueue(op, store, id, obj) {
    if (STORES.indexOf(store) < 0 || !id) return;
    var list = readOutbox().filter(function (x) { return !(x.store === store && x.id === id); });
    list.push({ op: op, store: store, id: id, obj: op === 'upsert' ? obj : null, ts: Date.now(), tries: 0 });
    writeOutbox(list);
    scheduleFlush();
  }

  var listeners = [];
  var state = { flushing: false, lastError: '', online: navigator.onLine, lastPull: localStorage.getItem(CFG.lastPullKey) || '' };
  function emit() {
    var info = status();
    listeners.forEach(function (fn) { try { fn(info); } catch (e) {} });
  }
  function status() {
    return { pending: readOutbox().length, flushing: state.flushing, lastError: state.lastError,
      online: navigator.onLine, lastPull: state.lastPull };
  }

  var flushTimer = null;
  function scheduleFlush(delay) {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(function () { flush(); }, delay === undefined ? 400 : delay);
  }

  function flush() {
    if (state.flushing) { state.again = true; return Promise.resolve(false); }
    var list = readOutbox();
    if (!list.length) return Promise.resolve(true);
    if (!navigator.onLine) return Promise.resolve(false);
    state.flushing = true; emit();

    var upserts = list.filter(function (x) { return x.op === 'upsert'; })
      .sort(function (a, b) { return DEPENDENCY_ORDER.indexOf(a.store) - DEPENDENCY_ORDER.indexOf(b.store) || a.ts - b.ts; });
    var deletes = list.filter(function (x) { return x.op === 'delete'; })
      .sort(function (a, b) { return DEPENDENCY_ORDER.indexOf(b.store) - DEPENDENCY_ORDER.indexOf(a.store); });
    var ordered = upserts.concat(deletes);
    var done = {};
    var failed = [];

    return ordered.reduce(function (chain, item) {
      return chain.then(function () {
        var q = item.op === 'upsert'
          ? client.from(item.store).upsert(MAP[item.store].toDb(item.obj), { onConflict: 'id' })
          : client.from(item.store).delete().eq('id', item.id);
        return q.then(function (res) {
          if (res.error) throw res.error;
          done[item.store + ':' + item.id + ':' + item.ts] = true;
        }).catch(function (err) {
          item.tries = (item.tries || 0) + 1;
          item.lastError = err && (err.message || err.code) || 'erro';
          failed.push(item);
          console.warn('[cloud] ' + item.op + ' ' + item.store + ' falhou:', err);
        });
      });
    }, Promise.resolve()).then(function () {
      // Keep failed items (and anything enqueued meanwhile); drop items that keep failing.
      var current = readOutbox().filter(function (x) { return !done[x.store + ':' + x.id + ':' + x.ts]; });
      var dropped = [];
      current = current.map(function (x) {
        var f = failed.filter(function (y) { return y.store === x.store && y.id === x.id && y.ts === x.ts; })[0];
        return f ? f : x;
      }).filter(function (x) {
        if ((x.tries || 0) >= 6) { dropped.push(x); return false; }
        return true;
      });
      writeOutbox(current);
      state.lastError = failed.length ? (failed[0].lastError || 'Falha ao sincronizar') : '';
      if (dropped.length) {
        console.error('[cloud] descartados após várias tentativas:', dropped);
        reportEvent('error', 'Sync dropped ' + dropped.length + ' change(s): ' + (dropped[0].lastError || ''),
          { items: dropped.map(function (d) { return d.op + ' ' + d.store + ' ' + d.id; }).slice(0, 10) });
      }
      state.flushing = false; emit();
      if (state.again) { state.again = false; scheduleFlush(50); }
      else if (current.length) scheduleFlush(Math.min(60000, 3000 * Math.pow(2, Math.min(4, current[0].tries || 0))));
      return !failed.length;
    });
  }

  /* ── pull ───────────────────────────────────────────── */
  function fetchAll(table) {
    var size = 1000, from = 0, rows = [];
    function page() {
      return client.from(table).select('*').range(from, from + size - 1).then(function (res) {
        if (res.error) throw res.error;
        rows = rows.concat(res.data || []);
        if ((res.data || []).length === size) { from += size; return page(); }
        return rows;
      });
    }
    return page();
  }

  /** Returns { store: [appRecords] } of the server state, keeping local-only fields and
   *  keeping local records that still have unsent changes. */
  function pull(localSnapshot) {
    var firstSync = !state.lastPull;
    return Promise.all(STORES.map(fetchAll)).then(function (results) {
      if (firstSync && localSnapshot) {
        // First time this device talks to the cloud: keep anything here that is newer than
        // (or missing from) the server, so nothing typed on the phone is lost in the switch.
        STORES.forEach(function (store, i) {
          var serverById = {};
          results[i].forEach(function (row) { serverById[row.id] = row; });
          (localSnapshot[store] || []).forEach(function (rec) {
            if (!rec || !rec.id) return;
            var row = serverById[rec.id];
            var localTime = Date.parse(rec.updatedAt || rec.createdAt || 0) || 0;
            var serverTime = row ? (Date.parse(row.updated_at) || 0) : -1;
            if (!row || localTime > serverTime + 1000) {
              var list = readOutbox().filter(function (x) { return !(x.store === store && x.id === rec.id); });
              list.push({ op: 'upsert', store: store, id: rec.id, obj: rec, ts: Date.now(), tries: 0 });
              writeOutbox(list);
            }
          });
        });
        scheduleFlush(100);
      }
      var pending = {};
      readOutbox().forEach(function (x) { pending[x.store + ':' + x.id] = x; });
      var out = {};
      STORES.forEach(function (store, i) {
        var localById = {};
        ((localSnapshot && localSnapshot[store]) || []).forEach(function (r) { localById[r.id] = r; });
        var serverRows = results[i];
        var merged = [];
        var seen = {};
        serverRows.forEach(function (row) {
          seen[row.id] = true;
          var p = pending[store + ':' + row.id];
          if (p && p.op === 'delete') return;               // deleted here, not yet sent
          if (p && p.op === 'upsert') { merged.push(p.obj); return; } // local change wins until sent
          merged.push(MAP[store].toApp(row, localById[row.id]));
        });
        Object.keys(pending).forEach(function (k) {         // created here, not yet sent
          var p = pending[k];
          if (p.store === store && p.op === 'upsert' && !seen[p.id]) merged.push(p.obj);
        });
        out[store] = merged;
      });
      state.lastPull = new Date().toISOString();
      try { localStorage.setItem(CFG.lastPullKey, state.lastPull); } catch (e) {}
      emit();
      return out;
    });
  }

  /** Read-only snapshot of the server in app shape (used by the team dashboard). */
  function fetchSnapshot() {
    return Promise.all(STORES.map(fetchAll)).then(function (results) {
      var out = {}, latest = '';
      STORES.forEach(function (store, i) {
        out[store] = results[i].map(function (row) {
          if (row.updated_at && row.updated_at > latest) latest = row.updated_at;
          return MAP[store].toApp(row);
        });
      });
      out.updatedAt = latest || new Date().toISOString();
      return out;
    });
  }

  /* ── realtime ───────────────────────────────────────── */
  var channel = null;
  function subscribe(onChange) {
    if (channel) return;
    var timer = null;
    channel = client.channel('tracker-live');
    STORES.forEach(function (table) {
      channel.on('postgres_changes', { event: '*', schema: CFG.schema, table: table }, function () {
        clearTimeout(timer);
        timer = setTimeout(onChange, 800);
      });
    });
    channel.subscribe();
  }

  /* ── auth ───────────────────────────────────────────── */
  function getSession() {
    return client.auth.getSession().then(function (r) { return r.data && r.data.session; });
  }
  function isMember() {
    return client.from('companies').select('id').eq('id', CFG.companyId).maybeSingle().then(function (r) {
      return !r.error && !!r.data;
    });
  }
  function sendLoginEmail(email) {
    var redirect = global.location.origin + global.location.pathname;
    return client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect, shouldCreateUser: true } })
      .then(function (r) { if (r.error) throw r.error; return true; });
  }
  function verifyCode(email, code) {
    return client.auth.verifyOtp({ email: email, token: code, type: 'email' })
      .then(function (r) { if (r.error) throw r.error; return r.data.session; });
  }
  function signOut() { return client.auth.signOut(); }

  /** Shows a full-screen sign-in card inside `container` and resolves with the session. */
  function requireLogin(container, opts) {
    opts = opts || {};
    return getSession().then(function (session) {
      if (session) return session;
      return new Promise(function (resolve) {
        client.auth.onAuthStateChange(function (event, s) { if (s) resolve(s); });
        var lastEmail = '';
        try { lastEmail = localStorage.getItem('bs_login_email') || ''; } catch (e) {}
        container.innerHTML =
          '<div style="max-width:380px;margin:12vh auto 0;padding:24px;background:var(--sf,#13131a);border:1px solid var(--bd,#2a2a38);border-radius:16px;font-family:inherit;color:var(--tx,#f0f0f8)">' +
          '<div style="font-size:11px;font-weight:700;letter-spacing:1.2px;color:var(--ac,#00e5a0);text-transform:uppercase;margin-bottom:8px">BrightScale Tracker</div>' +
          '<div style="font-size:20px;font-weight:700;margin-bottom:6px">' + (opts.title || 'Entrar') + '</div>' +
          '<div style="font-size:13px;color:var(--mu,#6b6b8a);line-height:1.6;margin-bottom:16px">Digite seu e-mail. Enviamos um link de acesso (e um código de 6 dígitos, se aparecer no e-mail).</div>' +
          '<input id="bsLoginEmail" type="email" autocomplete="email" placeholder="voce@empresa.com" value="' + lastEmail.replace(/"/g, '') + '" style="width:100%;padding:13px 14px;border-radius:10px;border:1px solid var(--bd,#2a2a38);background:var(--sf2,#1c1c27);color:inherit;font-size:15px;margin-bottom:10px"/>' +
          '<button id="bsLoginSend" style="width:100%;padding:13px;border:none;border-radius:10px;background:var(--ac,#00e5a0);color:#0a0a0f;font-weight:700;font-size:14px;cursor:pointer">Enviar link de acesso</button>' +
          '<div id="bsLoginCodeBox" style="display:none;margin-top:16px">' +
          '<input id="bsLoginCode" inputmode="numeric" maxlength="10" placeholder="Código do e-mail" style="width:100%;padding:13px 14px;border-radius:10px;border:1px solid var(--bd,#2a2a38);background:var(--sf2,#1c1c27);color:inherit;font-size:15px;margin-bottom:10px;letter-spacing:4px;text-align:center"/>' +
          '<button id="bsLoginVerify" style="width:100%;padding:13px;border:1px solid var(--bd,#2a2a38);border-radius:10px;background:var(--sf2,#1c1c27);color:inherit;font-weight:700;font-size:14px;cursor:pointer">Entrar com código</button>' +
          '</div>' +
          '<div id="bsLoginMsg" style="font-size:12px;color:var(--mu,#6b6b8a);margin-top:12px;line-height:1.6"></div></div>';
        var emailEl = container.querySelector('#bsLoginEmail');
        var msg = container.querySelector('#bsLoginMsg');
        container.querySelector('#bsLoginSend').onclick = function () {
          var email = (emailEl.value || '').trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Informe um e-mail válido.'; return; }
          try { localStorage.setItem('bs_login_email', email); } catch (e) {}
          msg.textContent = 'Enviando...';
          sendLoginEmail(email).then(function () {
            msg.innerHTML = 'Pronto! Abra o e-mail <b>' + email + '</b> neste aparelho e toque no link.';
            container.querySelector('#bsLoginCodeBox').style.display = '';
          }).catch(function (err) { msg.textContent = 'Não foi possível enviar: ' + (err.message || err); });
        };
        container.querySelector('#bsLoginVerify').onclick = function () {
          var email = (emailEl.value || '').trim().toLowerCase();
          var code = (container.querySelector('#bsLoginCode').value || '').trim();
          msg.textContent = 'Verificando...';
          verifyCode(email, code).then(resolve).catch(function (err) { msg.textContent = 'Código inválido: ' + (err.message || err); });
        };
      });
    });
  }

  /* ── share links ────────────────────────────────────── */
  function createShareLink(projectId, role, label) {
    return getSession().then(function (session) {
      if (!session) throw new Error('Faça login primeiro');
      return fetch(CFG.shareFn, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + session.access_token, apikey: CFG.key },
        body: JSON.stringify({ action: 'create', project_id: projectId, role: role || 'owner', label: label || null })
      }).then(function (r) { return r.json().then(function (d) { if (!r.ok || !d.ok) throw new Error(d.error || ('HTTP ' + r.status)); return d; }); });
    });
  }
  function fetchSharedProject(token) {
    return fetch(CFG.shareFn + '?t=' + encodeURIComponent(token), { headers: { apikey: CFG.key } })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || !d.ok) throw new Error(d.error || ('HTTP ' + r.status)); return d.data; }); });
  }

  /* ── estimate pipeline ──────────────────────────────── */
  var intakeFn = CFG.url + '/functions/v1/tracker-estimate-intake';
  function callIntake(payload) {
    return getSession().then(function (session) {
      if (!session) throw new Error('Faça login primeiro');
      return fetch(intakeFn, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + session.access_token, apikey: CFG.key },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().then(function (d) { if (!r.ok || !d.ok) throw new Error(d.error || ('HTTP ' + r.status)); return d; }); });
    });
  }
  function analyzeEstimate(text, filename) { return callIntake({ action: 'analyze', text: text, filename: filename, source: 'upload' }); }
  function linkEstimateProject(intakeId, projectId, milestones) {
    return callIntake({ action: 'link_project', intake_id: intakeId, project_id: projectId, milestones: milestones });
  }

  /* ── error reporting (tracker.app_events) ───────────── */
  var reported = 0, lastMsg = '';
  function reportEvent(level, message, context) {
    try {
      message = String(message || '').slice(0, 1500);
      if (!message || reported >= 20 || message === lastMsg) return; // cap per page load, skip repeats
      reported++; lastMsg = message;
      getSession().then(function (session) {
        if (!session || !navigator.onLine) return;
        client.from('app_events').insert({ level: level || 'error', source: 'app', message: message,
          context: context || {}, url: global.location.pathname }).then(function () {}, function () {});
      });
    } catch (e) {}
  }
  global.addEventListener('error', function (e) {
    reportEvent('error', e.message || 'error', { file: e.filename, line: e.lineno, col: e.colno,
      stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 1500) : '' });
  });
  global.addEventListener('unhandledrejection', function (e) {
    var r = e.reason || {};
    reportEvent('error', 'Unhandled: ' + (r.message || String(r)), { stack: r.stack ? String(r.stack).slice(0, 1500) : '' });
  });

  global.addEventListener('online', function () { emit(); scheduleFlush(100); });
  global.addEventListener('offline', emit);

  global.TrackerCloud = {
    config: CFG,
    client: client,
    STORES: STORES,
    MAP: MAP,
    enqueue: enqueue,
    flush: flush,
    pull: pull,
    fetchSnapshot: fetchSnapshot,
    subscribe: subscribe,
    status: status,
    onStatus: function (fn) { listeners.push(fn); },
    getSession: getSession,
    isMember: isMember,
    requireLogin: requireLogin,
    signOut: signOut,
    createShareLink: createShareLink,
    fetchSharedProject: fetchSharedProject,
    analyzeEstimate: analyzeEstimate,
    linkEstimateProject: linkEstimateProject,
    reportEvent: reportEvent
  };
})(window);
