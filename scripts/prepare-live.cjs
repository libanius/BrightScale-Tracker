/* Fresh live_* objects in Tracker schemas. No DROP, DELETE, existing grants or data edits. */
const fs = require("node:fs");
let parts = [
  "001_progress_rls.sql",
  "002_baseline_freeze.sql",
  "003_change_orders.sql",
  "004_change_order_requests.sql",
  "005_workspace.sql",
].map((f) =>
  fs
    .readFileSync("staging/sql/" + f, "utf8")
    .replace(/^--.*$/gm, "")
    .replace(/^begin;\s*$/gm, "")
    .replace(/^commit;\s*$/gm, ""),
);
// Materialize final definitions directly, rather than replacing policies/constraints.
const freezeFn = parts[1].slice(
  parts[1].indexOf("create function pilot_priv.is_frozen_task"),
  parts[1].indexOf("drop policy pilot_reports_create"),
);
const finalReport = parts[1].slice(
  parts[1].indexOf("create policy pilot_reports_create"),
);
parts[0] = parts[0]
  .replace(
    "  baseline_version integer",
    "  baseline_frozen_at timestamptz, baseline_frozen_by uuid,\n  baseline_version integer",
  )
  .replace(
    "('reported','validated','rejected')",
    "('reported','validated','rejected','baseline_frozen')",
  );
parts[0] = parts[0].replace(
  /create policy pilot_reports_create[\s\S]*?\n  \);/,
  finalReport,
);
parts[0] = parts[0].replace(
  "revoke all on all functions in schema pilot_priv",
  () => freezeFn + "\nrevoke all on all functions in schema pilot_priv",
);
parts[1] = parts[1].slice(
  parts[1].indexOf("create function pilot_priv.assert_baseline_open"),
  parts[1].indexOf("create function pilot_priv.is_frozen_task"),
);
parts[4] = parts[4]
  .replace(/create policy workspace_document_read[^\n]+\n/, "")
  .replace(/drop policy workspace_document_read[^\n]+\n/, "");
const admin = `create function tracker_private.workspace_is_workspace_admin() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from tracker.members m join auth.users u on lower(u.email)=lower(m.email) where u.id=auth.uid() and u.email_confirmed_at is not null and m.role in ('admin','pm','manager')) $$;
revoke all on function tracker_private.workspace_is_workspace_admin() from public,anon;
grant execute on function tracker_private.workspace_is_workspace_admin() to authenticated;\n`;
for (let i = 0; i < parts.length; i++) {
  let s = parts[i]
    .replaceAll("public.pilot_", "tracker.live_")
    .replace(
      /pilot_priv\.([a-z_]+)/g,
      (_, n) => "tracker_private.workspace_" + n,
    );
  s = s
    .replaceAll(
      "create schema if not exists pilot_priv;",
      "create schema if not exists tracker;\ncreate schema if not exists tracker_private;\ngrant usage on schema tracker to authenticated;",
    )
    .replace(
      "revoke all on schema pilot_priv from public, anon, authenticated;",
      "",
    )
    .replace(
      "grant usage on schema pilot_priv to authenticated;",
      "grant usage on schema tracker_private to authenticated;",
    );
  s = s.replace(
    "revoke all on all functions in schema pilot_priv from public, anon, authenticated;\ngrant execute on all functions in schema pilot_priv to authenticated;",
    `do $g$ declare f record;begin for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='tracker_private' and p.proname like 'workspace_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to authenticated',f.sig);end loop;end $g$;`,
  );
  s = s
    .replace(
      "if p_action='person' then",
      "if p_action in ('person','create') and not tracker_private.workspace_is_workspace_admin() then raise exception 'pm_required'; end if;\n if p_action='person' then",
    )
    .replace(
      "with check (owner_id=(select auth.uid()));",
      "with check (owner_id=(select auth.uid()) and tracker_private.workspace_is_workspace_admin());",
    );
  s = s.replace(/\bpilot_(?=[a-z])/g, "live_");
  if (i === 0) s = admin + s;
  if (/\bdrop\s|public\.pilot_|pilot_priv\./i.test(s))
    throw Error("Unsafe/incomplete namespace");
  parts[i] = s;
  fs.writeFileSync("live/sql/part_" + (i + 1) + ".sql", s);
}
fs.writeFileSync("live/sql/workspace.sql", parts.join("\n"));
