const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const db = new PGlite();
  try {
    await db.exec(
      fs.readFileSync("staging/tests/bootstrap_local_pg.sql", "utf8"),
    );
    await db.exec(
      `create schema tracker;create schema tracker_private;create table tracker.members(email text,role text);insert into tracker.members values('synthetic-pm@example.test','admin');insert into auth.users values('11111111-1111-4111-8111-111111111111','synthetic-pm@example.test',now());create table public.unrelated_service(id int);insert into public.unrelated_service values(7);create function tracker_private.existing_helper() returns int language sql as 'select 7';revoke all on function tracker_private.existing_helper() from public,authenticated;`,
    );
    await db.exec(fs.readFileSync("live/sql/workspace.sql", "utf8"));
    const count = (
      await db.query(
        "select count(*)::int n from pg_tables where schemaname='tracker' and tablename like 'live_%'",
      )
    ).rows[0].n;
    assert.equal(count, 40);
    assert.equal(
      (await db.query("select * from public.unrelated_service")).rows[0].id,
      7,
    );
    assert.equal(
      (
        await db.query(
          "select has_function_privilege('authenticated','tracker_private.existing_helper()','execute') as allowed",
        )
      ).rows[0].allowed,
      false,
    );
    await db.exec(
      "set role authenticated;select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false)",
    );
    await assert.rejects(
      () =>
        db.query(
          "select tracker.live_workspace_command(null,'person','{\"name\":\"not PM\"}')",
        ),
      /pm_required/,
    );
    await assert.rejects(
      () =>
        db.query(
          "insert into tracker.live_projects(name) values('unauthorized')",
        ),
      /row-level security/,
    );
    await db.exec(
      "select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false)",
    );
    const r = await db.query(
      "select tracker.live_workspace_command(null,'person','{\"name\":\"SYNTHETIC team\"}') result",
    );
    assert(r.rows[0].result.id);
    console.log(
      "Live namespace PASS: 40 RLS tables; unrelated table and existing function grants preserved; PM-only setup enforced.",
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
