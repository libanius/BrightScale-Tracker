/* BrightScale Tracker 2.0 — progress-review domain DEMO ONLY.
 * No authentication, database, payment, network, or production integrations.
 * All data and roles below are fictional. Do not use this as a security boundary.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BrightScaleProgressDemo = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var catalog = Object.freeze({
    project: Object.freeze({ id: "DEMO-001", name: "DEMO — Renovação residencial", baselineVersion: "Original 1.0" }),
    subs: Object.freeze([
      Object.freeze({ id: "sub-floor", name: "Equipe de Piso — Fictícia" }),
      Object.freeze({ id: "sub-paint", name: "Equipe de Pintura — Fictícia" })
    ]),
    scopes: Object.freeze([
      Object.freeze({ id: "floor", title: "Flooring", subId: "sub-floor", subcontractCents: 240000 }),
      Object.freeze({ id: "paint", title: "Painting", subId: "sub-paint", subcontractCents: 120000 })
    ]),
    tasks: Object.freeze([
      Object.freeze({ id: "lvp", scopeId: "floor", title: "Instalar piso LVP", weight: 0.6 }),
      Object.freeze({ id: "baseboard", scopeId: "floor", title: "Instalar baseboards", weight: 0.4 }),
      Object.freeze({ id: "walls", scopeId: "paint", title: "Pintar paredes", weight: 1 })
    ])
  });

  function fail(code) { throw new Error(code); }
  function amount(cents) { return Math.round(cents) / 100; }
  function percent(value) {
    if (typeof value === "string" && !value.trim()) fail("invalid_percent");
    var p = Number(value);
    if (!Number.isFinite(p) || p < 0 || p > 100) fail("invalid_percent");
    return Math.round(p * 100) / 100;
  }
  function taskOf(id) {
    var t = catalog.tasks.find(function (t) { return t.id === id; });
    if (!t) fail("task_not_found");
    return t;
  }
  function scopeOf(task) {
    return catalog.scopes.find(function (s) { return s.id === task.scopeId; });
  }
  function stamp(at) {
    return (typeof at === "string" && /^\d{4}-\d{2}-\d{2}T/.test(at)) ? at : new Date().toISOString();
  }
  function copy(obj) { return JSON.parse(JSON.stringify(obj)); }
  function freezeEvent(event) { return Object.freeze(event); }

  function createState() {
    return {
      approved: { lvp: 0, baseboard: 0, walls: 0 },
      reports: [],
      ledger: [],
      audit: [],
      counter: 0
    };
  }
  function getCatalog() {
    // Always return a copy so callers cannot silently rewrite the frozen baseline.
    return copy(catalog);
  }
  function recognizedTaskCents(state, taskId) {
    return state.ledger.filter(function (e) { return e.taskId === taskId; })
      .reduce(function (sum, e) { return sum + e.deltaCents; }, 0);
  }
  function targetCents(state, taskId, p) {
    var task = taskOf(taskId), scope = scopeOf(task);
    return Math.round(scope.subcontractCents * task.weight * p / 100);
  }
  function submitReport(state, input) {
    if (!input || input.kind !== "sub") fail("sub_required");
    var task = taskOf(input.taskId);
    var scope = scopeOf(task);
    if (scope.subId !== input.actorId) fail("scope_forbidden");
    var p = percent(input.percent), old = state.approved[task.id] || 0;
    if (p < old) fail("below_validated_progress");
    if (state.reports.some(function (r) { return r.taskId === task.id && r.status === "pending"; })) fail("pending_report_exists");
    var note = String(input.note || "").trim();
    if (note.length > 300) fail("note_too_long");
    var report = {
      id: "report-" + (++state.counter), taskId: task.id, subId: input.actorId,
      percent: p, note: note, at: stamp(input.at), status: "pending"
    };
    state.reports.push(report);
    state.audit.push(freezeEvent({
      type: "reported", reportId: report.id, taskId: task.id, actor: input.actorId,
      at: report.at, percent: p, note: note, baselineVersion: catalog.project.baselineVersion
    }));
    return copy(report);
  }
  function reviewReport(state, input) {
    if (!input || input.kind !== "pm") fail("pm_required");
    var report = state.reports.find(function (r) { return r.id === input.reportId; });
    if (!report) fail("report_not_found");
    if (report.status !== "pending") fail("report_already_reviewed");
    var approved = input.action === "approve";
    if (!approved && input.action !== "reject") fail("invalid_review");
    var reason = String(input.reason || "").trim();
    if (reason.length > 300) fail("note_too_long");
    var now = stamp(input.at);
    var previous = state.approved[report.taskId] || 0;
    var proposed = approved
      ? (input.percent === undefined || input.percent === null ? report.percent : percent(input.percent))
      : previous;
    if (approved && proposed < previous) fail("below_validated_progress");
    if ((!approved || proposed !== report.percent) && !reason) fail("reason_required");
    var current = recognizedTaskCents(state, report.taskId);
    var deltaCents = approved ? targetCents(state, report.taskId, proposed) - current : 0;
    if (deltaCents < 0) fail("validated_credit_is_immutable");
    report.status = approved ? "validated" : "rejected";
    report.review = { at: now, actor: "pm", percent: proposed, reason: reason, decision: input.action };
    if (approved) {
      state.approved[report.taskId] = proposed;
      // Ledger entries are append-only; nobody edits previous recognized credits.
      state.ledger.push(freezeEvent({
        reportId: report.id, taskId: report.taskId, at: now,
        approvedPercent: proposed, deltaCents: deltaCents,
        baselineVersion: catalog.project.baselineVersion
      }));
    }
    state.audit.push(freezeEvent({
      type: approved ? "validated" : "rejected", reportId: report.id,
      taskId: report.taskId, actor: "pm", at: now,
      reportedPercent: report.percent, validatedPercent: proposed,
      reason: reason, deltaCents: deltaCents,
      baselineVersion: catalog.project.baselineVersion
    }));
    return {
      status: report.status, taskId: report.taskId,
      approvedPercent: state.approved[report.taskId],
      newRecognizedCredit: amount(deltaCents),
      paymentAuthorized: false
    };
  }
  function projectFor(state, role) {
    if (!role || !["pm", "sub", "client"].includes(role.kind)) fail("invalid_role");
    var selectedScopes = role.kind === "sub"
      ? catalog.scopes.filter(function (scope) { return scope.subId === role.actorId; })
      : catalog.scopes;
    if (role.kind === "sub" && !catalog.subs.some(function (s) { return s.id === role.actorId; })) fail("sub_not_found");
    var tasks = catalog.tasks.filter(function (task) {
      return selectedScopes.some(function (scope) { return scope.id === task.scopeId; });
    }).map(function (task) {
      var progress = state.approved[task.id] || 0;
      var out = { id: task.id, scopeId: task.scopeId, title: task.title, validatedProgress: progress };
      if (role.kind !== "client") {
        out.weight = task.weight;
        out.pending = state.reports.some(function (r) { return r.taskId === task.id && r.status === "pending"; });
        out.recognizedCredit = amount(recognizedTaskCents(state, task.id));
        if (role.kind === "sub") {
          var last = state.reports.filter(function (r) { return r.taskId === task.id; }).slice(-1)[0];
          out.myLastReport = last ? { percent: last.percent, status: last.status } : null;
          out.estimatedCredit = last && last.status === "pending"
            ? amount(targetCents(state, task.id, last.percent)) : out.recognizedCredit;
        }
      }
      return out;
    });
    var view = {
      project: { id: catalog.project.id, name: catalog.project.name, baselineVersion: catalog.project.baselineVersion },
      scopes: selectedScopes.map(function (s) { return { id: s.id, title: s.title }; }),
      tasks: tasks
    };
    if (role.kind === "pm") {
      view.pendingReports = state.reports.filter(function (r) { return r.status === "pending"; }).map(copy);
      view.audit = state.audit.map(copy);
      view.totalRecognizedCredit = amount(state.ledger.reduce(function (sum, e) { return sum + e.deltaCents; }, 0));
      view.paymentAuthorized = false;
    } else if (role.kind === "sub") {
      view.myReports = state.reports.filter(function (r) { return r.subId === role.actorId; }).map(function (r) {
        return { id: r.id, taskId: r.taskId, percent: r.percent, status: r.status, note: r.note };
      });
      view.myRecognizedCredit = amount(tasks.reduce(function (sum, t) { return sum + t.recognizedCredit; }, 0) * 100);
      view.paymentAuthorized = false;
    }
    return view;
  }
  return { createState: createState, getCatalog: getCatalog, submitReport: submitReport,
    reviewReport: reviewReport, projectFor: projectFor };
});
