/* Real PostgreSQL in WASM. Synthetic identities; not Supabase Auth or HTTP. */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const PM = "11111111-1111-4111-8111-111111111111",
  SUB = "22222222-2222-4222-8222-222222222222",
  CLIENT = "33333333-3333-4333-8333-333333333333",
  OUT = "44444444-4444-4444-8444-444444444444";
(async () => {
  const db = new PGlite();
  let checks = 0;
  async function actor(id) {
    await db.exec(
      `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`,
    );
  }
  async function q(sql, args = []) {
    return (await db.query(sql, args)).rows;
  }
  async function cmd(pid, action, data) {
    return (
      await q(
        "select public.pilot_workspace_command($1,$2,$3::jsonb) as result",
        [pid, action, JSON.stringify(data)],
      )
    )[0].result;
  }
  async function deny(fn, pattern) {
    await assert.rejects(fn, pattern);
    checks++;
  }
  try {
    await db.exec(
      fs.readFileSync("staging/tests/bootstrap_local_pg.sql", "utf8"),
    );
    for (const file of [
      "001_progress_rls.sql",
      "002_baseline_freeze.sql",
      "003_change_orders.sql",
      "004_change_order_requests.sql",
      "005_workspace.sql",
    ]) {
      await db.exec(fs.readFileSync("staging/sql/" + file, "utf8"));
      console.log("Applied", file);
    }
    await db.exec(fs.readFileSync("staging/tests/rls_smoke.sql", "utf8"));
    console.log("Inherited SQL/RLS smoke PASS");
    await actor(PM);
    const person = (
      await cmd(null, "person", { name: "SYNTHETIC Team", user_id: SUB })
    ).id;
    const plan = {
      request_id: "55555555-5555-4555-8555-555555555555",
      reviewed: true,
      name: "SYNTHETIC Workspace",
      client_name: "SYNTHETIC Client",
      address: "SYNTHETIC Site",
      amount_cents: 1000000,
      client_user_id: CLIENT,
      scopes: [
        {
          name: "Floor",
          weight_pct: 100,
          person_id: person,
          subcontract_cents: 200000,
          tasks: [
            {
              title: "Install",
              criteria: "Level and complete",
              weight_pct: 100,
            },
          ],
        },
      ],
      milestones: [{ title: "Final", amount_cents: 1000000 }],
    };
    await deny(
      () =>
        cmd(null, "create", {
          ...plan,
          scopes: [{ ...plan.scopes[0], weight_pct: 90 }],
        }),
      /scope_weights/,
    );
    const pid = (await cmd(null, "create", plan)).project_id;
    assert(pid);
    checks++;
    assert.equal((await cmd(null, "create", plan)).project_id, pid);
    checks++;
    const sid = (
      await q("select id from pilot_scopes where project_id=$1", [pid])
    )[0].id;
    const tid = (
      await q("select id from pilot_tasks where scope_id=$1", [sid])
    )[0].id;
    const mid = (
      await q("select id from pilot_workspace_milestones where project_id=$1", [
        pid,
      ])
    )[0].id;
    await deny(
      () => cmd(pid, "observe", { task_id: tid, percent: 45 }),
      /baseline_not_frozen/,
    );
    await q("select pilot_freeze_baseline($1)", [pid]);
    await deny(
      () => cmd(pid, "release_scope", { scope_id: sid, reason: "Not checked" }),
      /legal_safety/,
    );
    await cmd(pid, "release_scope", {
      scope_id: sid,
      reason: "SYNTHETIC checks confirmed",
      legal_confirmed: true,
      safety_confirmed: true,
      readiness_confirmed: true,
    });
    await deny(
      () =>
        q(
          "insert into pilot_tasks(scope_id,title,weight_pct) values($1,$2,1)",
          [sid, "forbidden"],
        ),
      /baseline_already_frozen/,
    );
    const obs = (
      await cmd(pid, "observe", {
        task_id: tid,
        percent: 45,
        note: "SYNTHETIC observed",
      })
    ).id;
    await deny(
      () => cmd(pid, "validate_observation", { id: obs, reason: "reviewed" }),
      /criteria/,
    );
    await cmd(pid, "validate_observation", {
      id: obs,
      reason: "Acceptance checked",
      criteria_confirmed: true,
    });
    assert.equal(
      Number(
        (
          await q(
            "select validated_pct from pilot_validations where task_id=$1",
            [tid],
          )
        )[0].validated_pct,
      ),
      45,
    );
    checks++;
    assert.equal(
      (await q("select * from pilot_credit_events where task_id=$1", [tid]))
        .length,
      0,
    );
    checks++;
    await deny(
      () =>
        cmd(pid, "validate_observation", {
          id: obs,
          reason: "retry",
          criteria_confirmed: true,
        }),
      /not_pending/,
    );
    const event = (
      await cmd(pid, "event", {
        kind: "delay",
        body: "SYNTHETIC shared event",
        visibility: "client",
      })
    ).id;
    await cmd(pid, "event", {
      kind: "correction",
      body: "SYNTHETIC correction",
      visibility: "client",
      corrects_id: event,
    });
    await cmd(pid, "document", {
      name: "synthetic.txt",
      mime: "text/plain",
      data_base64: Buffer.from("SYNTHETIC private estimate").toString("base64"),
      visibility: "pm",
    });
    const sharedDoc = (
      await cmd(pid, "document", {
        name: "synthetic-shared.txt",
        mime: "text/plain",
        data_base64: Buffer.from("SYNTHETIC published evidence").toString(
          "base64",
        ),
        visibility: "client",
      })
    ).id;
    await actor(CLIENT);
    assert.equal(
      (
        await q("select id from pilot_workspace_documents where id=$1", [
          sharedDoc,
        ])
      ).length,
      1,
    );
    checks++;
    await actor(PM);
    await cmd(pid, "restrict_document", {
      id: sharedDoc,
      reason: "SYNTHETIC correction needed",
    });
    await actor(CLIENT);
    assert.equal(
      (
        await q("select id from pilot_workspace_documents where id=$1", [
          sharedDoc,
        ])
      ).length,
      0,
    );
    checks++;
    await actor(PM);
    await actor(SUB);
    assert.equal(
      (
        await q(
          "select * from pilot_workspace_client_terms where project_id=$1",
          [pid],
        )
      ).length,
      0,
    );
    checks++;
    assert.equal(
      (
        await q(
          "select * from pilot_workspace_milestones where project_id=$1",
          [pid],
        )
      ).length,
      0,
    );
    checks++;
    await deny(
      () => cmd(pid, "observe", { task_id: tid, percent: 100 }),
      /pm_required/,
    );
    await deny(
      () =>
        cmd(pid, "milestone_decision", {
          id: mid,
          decision: "signed",
          name: "Sub",
          consent: true,
        }),
      /client_required/,
    );
    await actor(CLIENT);
    assert.equal(
      (
        await q(
          "select * from pilot_workspace_scope_config where scope_id=$1",
          [sid],
        )
      ).length,
      0,
    );
    checks++;
    assert.equal(
      (
        await q("select * from pilot_workspace_documents where project_id=$1", [
          pid,
        ])
      ).length,
      0,
    );
    checks++;
    assert.equal(
      (
        await q("select * from pilot_workspace_weights where scope_id=$1", [
          sid,
        ])
      ).length,
      1,
    );
    checks++;
    assert.equal(
      (await q("select * from pilot_workspace_events where id=$1", [event]))
        .length,
      1,
    );
    checks++;
    await deny(
      () =>
        cmd(pid, "milestone_decision", {
          id: mid,
          decision: "signed",
          name: "Client",
          consent: true,
        }),
      /not_ready/,
    );
    await actor(PM);
    await cmd(pid, "restrict", { id: event, reason: "Incorrect information" });
    await cmd(pid, "milestone", {
      id: mid,
      status: "ready_for_review",
      reason: "Evidence ready",
    });
    await cmd(pid, "milestone", {
      id: mid,
      status: "validated",
      reason: "Criteria checked",
    });
    await deny(
      () =>
        cmd(pid, "milestone", {
          id: mid,
          status: "paid",
          reason: "no payment",
        }),
      /invalid_milestone_transition/,
    );
    await actor(CLIENT);
    assert.equal(
      (await q("select * from pilot_workspace_events where id=$1", [event]))
        .length,
      0,
    );
    checks++;
    await cmd(pid, "milestone_decision", {
      id: mid,
      decision: "signed",
      name: "SYNTHETIC Client",
      consent: true,
    });
    assert.equal(
      (
        await q(
          "select * from pilot_workspace_signatures where project_id=$1",
          [pid],
        )
      ).length,
      1,
    );
    checks++;
    assert.equal(
      (
        await q(
          "select status from pilot_workspace_email_outbox where project_id=$1",
          [pid],
        )
      )[0].status,
      "pending",
    );
    checks++;
    await deny(
      () =>
        q(
          "select recipient from pilot_workspace_email_outbox where project_id=$1",
          [pid],
        ),
      /permission denied/,
    );
    const receipts = await q(
      "select * from pilot_workspace_receipts where milestone_id=$1",
      [mid],
    );
    assert.equal(receipts.length, 3);
    assert.equal(receipts[2].content_hash.length, 64);
    checks++;
    await actor(OUT);
    assert.equal(
      (await q("select * from pilot_projects where id=$1", [pid])).length,
      0,
    );
    checks++;
    await deny(
      () =>
        cmd(pid, "event", {
          kind: "decision",
          body: "spoof",
          visibility: "client",
        }),
      /access_denied/,
    );
    await actor(PM);
    await cmd(pid, "milestone", {
      id: mid,
      status: "invoiced",
      reason: "SYNTHETIC Invoice 1",
    });
    await deny(
      () =>
        cmd(pid, "milestone", {
          id: mid,
          status: "paid",
          reason: "SYNTHETIC Receipt 1",
        }),
      /matching_receipt/,
    );
    await cmd(pid, "payment", {
      kind: "client_receipt",
      amount_cents: 1000000,
      reference: "SYNTHETIC Receipt 1",
    });
    await cmd(pid, "milestone", {
      id: mid,
      status: "paid",
      reason: "SYNTHETIC Receipt 1",
    });
    assert.equal(
      (
        await q("select status from pilot_workspace_milestones where id=$1", [
          mid,
        ])
      )[0].status,
      "paid",
    );
    checks++;
    // Full independent CO signature -> PM activation -> sub -> validation path.
    const coid = (
      await q(
        "select pilot_co_create_draft($1,'SYNTHETIC Add-on','SYNTHETIC terms',350000) as x",
        [pid],
      )
    )[0].x.co_id;
    const cosid = (
      await q(
        "select pilot_co_add_scope($1,'SYNTHETIC Added Scope',$2,80000) as x",
        [coid, SUB],
      )
    )[0].x.scope_id;
    const cotid = (
      await q("select pilot_co_add_task($1,'SYNTHETIC Added Task',100) as x", [
        cosid,
      ])
    )[0].x.task_id;
    await q("select pilot_co_submit($1)", [coid]);
    await actor(CLIENT);
    await deny(
      () =>
        cmd(pid, "sign_co", {
          id: coid,
          name: "SYNTHETIC Client",
          consent: false,
        }),
      /consent/,
    );
    await cmd(pid, "sign_co", {
      id: coid,
      name: "SYNTHETIC Client",
      consent: true,
    });
    const signedCO = (
      await q(
        "select snapshot from pilot_workspace_signatures where subject='change_order' and subject_id=$1",
        [coid],
      )
    )[0].snapshot;
    assert.equal(signedCO.client_amount_cents, 350000);
    assert(!JSON.stringify(signedCO).includes("subcontract"));
    checks++;
    await actor(PM);
    await q("select pilot_co_activate($1)", [coid]);
    await actor(SUB);
    const corid = (
      await q(
        "insert into pilot_co_reports(task_id,reported_pct,note) values($1,100,$2) returning id",
        [cotid, "SYNTHETIC done"],
      )
    )[0].id;
    await actor(PM);
    await q(
      "select pilot_co_review_report($1,'approve',100,'SYNTHETIC checked')",
      [corid],
    );
    assert.equal(
      Number(
        (
          await q(
            "select sum(delta_cents) as total from pilot_co_credit_events where co_id=$1",
            [coid],
          )
        )[0].total,
      ),
      80000,
    );
    checks++;
    await deny(() => cmd(pid, "close", { reason: "Final" }), /unfinished_work/);
    const finalObs = (await cmd(pid, "observe", { task_id: tid, percent: 100 }))
      .id;
    await cmd(pid, "validate_observation", {
      id: finalObs,
      reason: "Final criteria checked",
      criteria_confirmed: true,
    });
    await cmd(pid, "close", { reason: "Final handover recorded" });
    await deny(
      () =>
        cmd(pid, "event", { kind: "visit", body: "late", visibility: "pm" }),
      /project_closed/,
    );
    const count = await q(
      "select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'pilot_%' and c.relkind='r' and c.relrowsecurity",
    );
    assert.equal(count[0].n, 40);
    checks++;
    console.log(
      `Workspace SQL/RLS: ${checks} checks PASS; no external data or Auth used.`,
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
