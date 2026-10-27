/* Synthetic data fixture for isolated browser automation.
 * Never insert credentials, actual project data, API keys or production URLs here.
 * This file replaces tracker-cloud.js during localhost tests only.
 */
(function () {
  'use strict';
  window.__agentWrites = [];
  window.__agentShareReads = [];
  window.__agentRemoteRequests = [];

  const ownerView = {
    clientView: true,
    role: 'owner',
    updatedAt: '2026-10-26T12:00:00.000Z',
    projects: [{
      id: 'project-demo', name: 'SYNTHETIC Client Flooring',
      address: 'Fictional Test Address', client: { name: 'Demo Homeowner' },
      contractTotal: 987654, internalMargin: 'NEVER_SHOW_PRIVATE_MARGIN',
    }],
    units: [{ id: 'unit-demo', projectId: 'project-demo', unitNumber: '101',
      startDate: '2026-10-01', deadline: '2026-11-30', invoice: '' }],
    scopes: [{
      id: 'scope-floor', unitId: 'unit-demo', title: 'SYNTHETIC Floor Installation',
      order: 1, weight: 0.5, subcontractAmount: 45678, secretRate: 'NEVER_SHOW_SUB_COST',
    }, {
      id: 'scope-paint', unitId: 'unit-demo', title: 'SYNTHETIC Painting',
      order: 2, weight: 0.5, subcontractAmount: 33333,
    }],
    tasks: [{
      id: 'task-floor', scopeId: 'scope-floor',
      title: 'Install Click LVP', order: 1, progress: 40, status: 'in_progress',
    }, {
      id: 'task-paint', scopeId: 'scope-paint',
      title: 'Paint walls', order: 1, progress: 20, status: 'in_progress',
    }],
    notes: [],
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  window.TrackerCloud = {
    STORES: ['people', 'projects', 'units', 'scopes', 'tasks', 'expenses', 'notes'],
    getSession: function () { return Promise.resolve({ access_token: 'SYNTHETIC_SESSION_NOT_VALID' }); },
    requireLogin: function () { return Promise.resolve({}); },
    isMember: function () { return Promise.resolve(window.__agentAccess !== 'denied'); },
    signOut: function () { return Promise.resolve(); },
    enqueue: function (operation, store, id) {
      window.__agentWrites.push({ operation: operation, store: store, id: id });
    },
    flush: function () { return Promise.resolve(true); },
    pull: function (snapshot) { return Promise.resolve(snapshot); },
    subscribe: function () {},
    status: function () {
      return { online: navigator.onLine, pending: 0, flushing: false, lastError: null, lastPull: null };
    },
    fetchSnapshot: function () { return Promise.resolve(clone(ownerView)); },
    fetchSharedProject: function (token) {
      window.__agentShareReads.push(token);
      if (token === 'expired' || token === 'revoked') {
        return Promise.reject(new Error('link_unavailable'));
      }
      if (token === 'owner-demo') return Promise.resolve(clone(ownerView));
      if (token === 'sub-demo') {
        const subView = clone(ownerView);
        subView.role = 'sub';
        subView.scopes = subView.scopes.filter(function (scope) { return scope.id === 'scope-floor'; });
        subView.tasks = subView.tasks.filter(function (task) { return task.scopeId === 'scope-floor'; });
        return Promise.resolve(subView);
      }
      return Promise.reject(new Error('unknown_token'));
    },
    createShareLink: function () { return Promise.reject(new Error('disabled_in_sandbox')); },
    analyzeEstimate: function () { return Promise.reject(new Error('external_AI_disabled_in_sandbox')); },
    linkEstimateProject: function () { return Promise.resolve({ ok: true }); },
  };
})();
