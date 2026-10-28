export function createAPI(client) {
  const base = window.PilotGateway.create(client);
  const check = (r) => {
    if (r.error) throw Error(r.error.message);
    return r.data;
  };
  async function rows(table, field, id, columns = "*") {
    return check(await client.from(table).select(columns).eq(field, id)) || [];
  }
  return {
    ...base,
    command: async (project, action, data) =>
      check(
        await client.rpc("pilot_workspace_command", {
          p_project: project,
          p_action: action,
          p_data: data,
        }),
      ),
    people: () =>
      rows("pilot_workspace_people", "owner_id", client._workspaceUser),
    async workspace(project, user) {
      const s = await base.snapshot(project, user);
      const ids = s.scopes.map((x) => x.id);
      const tasks = s.tasks.map((x) => x.id);
      const many = async (table, field, values, columns = "*") =>
        values.length
          ? check(await client.from(table).select(columns).in(field, values)) ||
            []
          : [];
      const [details, weights, criteria, events, documents] = await Promise.all(
        [
          rows("pilot_workspace_details", "project_id", project.id),
          many("pilot_workspace_weights", "scope_id", ids),
          many("pilot_workspace_task_config", "task_id", tasks),
          rows("pilot_workspace_events", "project_id", project.id),
          rows(
            "pilot_workspace_documents",
            "project_id",
            project.id,
            "id,project_id,scope_id,name,mime,sha256,visibility,created_at",
          ),
        ],
      );
      const w = {
        ...s,
        details: details[0],
        weights,
        criteria,
        events,
        documents,
      };
      if (s.role !== "sub") {
        w.clientTerms = (
          await rows("pilot_workspace_client_terms", "project_id", project.id)
        )[0];
        w.milestones = await rows(
          "pilot_workspace_milestones",
          "project_id",
          project.id,
        );
        w.signatures = await rows(
          "pilot_workspace_signatures",
          "project_id",
          project.id,
        );
        w.emailStatus = await rows(
          "pilot_workspace_email_outbox",
          "project_id",
          project.id,
          "id,project_id,signature_id,status,sent_at,created_at",
        );
        w.receipts = await many(
          "pilot_workspace_receipts",
          "milestone_id",
          w.milestones.map((m) => m.id),
        );
      }
      if (s.role !== "client") {
        w.gates = await many("pilot_workspace_gates", "scope_id", ids);
        w.scopeConfig = await many(
          "pilot_workspace_scope_config",
          "scope_id",
          ids,
        );
        w.payments = await rows(
          "pilot_workspace_payments",
          "project_id",
          project.id,
        );
      }
      if (s.role === "pm")
        w.observations = await rows(
          "pilot_workspace_observations",
          "project_id",
          project.id,
        );
      return w;
    },
    async download(id) {
      return check(
        await client
          .from("pilot_workspace_documents")
          .select("name,mime,data_base64,sha256")
          .eq("id", id)
          .single(),
      );
    },
    async dispatchReceipts(project_id) {
      return check(
        await client.functions.invoke("tracker-workspace-receipts", {
          body: { project_id },
        }),
      );
    },
    async analyze(text, questions) {
      return check(
        await client.functions.invoke("tracker-workspace-plan", {
          body: { text, questions },
        }),
      );
    },
  };
}
