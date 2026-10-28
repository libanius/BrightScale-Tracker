const test = require("node:test"),
  assert = require("node:assert/strict");
const core = () => import("../workspace/core.js");
test("money is exact cents; rejects ambiguous numbers and invalid percentages", async () => {
  const { cents, percent } = await core();
  assert.equal(cents("1250.09"), 125009);
  for (const v of ["1,250.00", "-1", "1.001", "Infinity"])
    assert.throws(() => cents(v));
  for (const v of ["", NaN, 101, -1]) assert.throws(() => percent(v));
  assert.equal(percent("38"), 38);
});
test("validated weighted progress is derived; reported percentages never count", async () => {
  const { progress } = await core();
  const s = {
    scopes: [{ id: "a" }, { id: "b" }],
    tasks: [
      { id: "t", scope_id: "a", weight_pct: 50 },
      { id: "u", scope_id: "a", weight_pct: 50 },
      { id: "v", scope_id: "b", weight_pct: 100 },
    ],
    validations: [
      { task_id: "t", validated_pct: 100 },
      { task_id: "u", validated_pct: 50 },
    ],
    reports: [{ task_id: "v", reported_pct: 100 }],
  };
  assert.equal(
    progress(s, [
      { scope_id: "a", weight_pct: 40 },
      { scope_id: "b", weight_pct: 60 },
    ]).total,
    30,
  );
  assert.equal(progress(s, []).total, null);
});
test("plan rejects missing criteria, invalid weights, dates and overbilling", async () => {
  const { blankPlan, validatePlan } = await core();
  const p = blankPlan();
  Object.assign(p, {
    name: "SYNTHETIC",
    client_name: "SYNTHETIC",
    address: "SYNTHETIC",
  });
  p.scopes[0].name = "SYNTHETIC";
  p.scopes[0].tasks[0].title = "SYNTHETIC";
  assert.throws(() => validatePlan(p), /critério/);
  p.scopes[0].tasks[0].criteria = "SYNTHETIC verified";
  validatePlan(p);
  p.scopes[0].weight_pct = 90;
  assert.throws(() => validatePlan(p), /100/);
  p.scopes[0].weight_pct = 100;
  p.milestones = [{ title: "Final", amount_cents: 1 }];
  assert.throws(() => validatePlan(p), /excedem/);
});
test("legacy estimate plan maps explicit scope weights and suggests reviewable task weights", async () => {
  const { fromAI } = await core();
  const p = fromAI({
    project_title: "SYNTHETIC",
    estimate: { total: 123.45 },
    scopes: [
      {
        title: "Work",
        weight_percent: 100,
        tasks: [
          { title: "A", acceptance_criteria: "A" },
          { title: "B", acceptance_criteria: "B" },
          { title: "C", acceptance_criteria: "C" },
        ],
      },
    ],
    milestones: [{ title: "Final", percent_of_contract: 100 }],
  });
  assert.equal(p.scopes[0].weight_pct, 100);
  assert.equal(
    p.scopes[0].tasks.reduce((a, t) => a + t.weight_pct, 0),
    100,
  );
  assert.equal(p.milestones[0].amount_cents, 12345);
});
test("environment rejects production, secret and non-anon JWT keys", async () => {
  const { checkConfig } = await core();
  const key = "sb_publishable_SYNTHETIC_ONLY_01234567890123";
  assert.equal(
    checkConfig("https://synthetic.supabase.co", key, "localhost"),
    "https://synthetic.supabase.co",
  );
  assert.throws(() =>
    checkConfig("https://hyvoatfozlpsevsbkxxm.supabase.co", key, "localhost"),
  );
  assert.throws(() =>
    checkConfig(
      "https://synthetic.supabase.co",
      "sb_secret_NOT_ALLOWED",
      "localhost",
    ),
  );
  assert.throws(() =>
    checkConfig(
      "https://synthetic.supabase.co",
      key,
      "tracker.brightscalegroup.com",
    ),
  );
  const jwt =
    "eyJ." +
    Buffer.from(JSON.stringify({ role: "service_role" })).toString(
      "base64url",
    ) +
    ".sig";
  assert.throws(() =>
    checkConfig("https://synthetic.supabase.co", jwt, "localhost"),
  );
});

test("document context preserves unknowns and only explicit work dates", async () => {
  const { smartContext, fromAI } = await core();
  assert.deepEqual(
    smartContext({ smart_context: { scope: "Floor", constraints: null } }),
    { scope: "Floor", standard: "", constraints: "", rhythm: "", time: "" },
  );
  assert.equal(
    fromAI({ client: { email: "client@example.test" } }).client_email,
    "client@example.test",
  );
  const p = fromAI({
    estimate: { issued_date: "2026-10-28" },
    schedule: { start_date: "2026-11-02", end_date: null },
  });
  assert.equal(p.start_date, "2026-11-02");
  assert.equal(p.end_date, "");
  assert.equal(
    fromAI({ estimate: { issued_date: "2026-10-28" } }).start_date,
    "",
  );
});

test("milestone percentages allocate exact cents, preserve partial schedules and reject overbilling", async () => {
  const { milestoneAmounts, fromAI, validatePlan, blankPlan } = await core();
  assert.deepEqual(milestoneAmounts(10001, [50, 50]), [5001, 5000]);
  assert.deepEqual(milestoneAmounts(5, [50, 50]), [3, 2]);
  assert.deepEqual(milestoneAmounts(10001, [25, 25]), [2501, 2500]);
  for (let total = 1; total < 200; total++)
    for (const weights of [
      [50, 50],
      [30, 30, 40],
      [33.33, 33.33, 33.34],
    ])
      assert.equal(
        milestoneAmounts(total, weights).reduce((a, b) => a + b, 0),
        total,
      );
  assert.deepEqual(milestoneAmounts(10000, [60, 60]), [6000, 6000]);
  assert.throws(() => milestoneAmounts(100, [-1, 101]));
  const p = fromAI({
    estimate: { total: 100.01 },
    milestones: [
      { title: "Deposit", percent_of_contract: 50 },
      { title: "Final", percent_of_contract: 50 },
    ],
  });
  assert.equal(
    p.milestones.reduce((a, b) => a + b.amount_cents, 0),
    10001,
  );
});
