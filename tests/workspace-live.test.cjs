const test = require("node:test"),
  assert = require("node:assert/strict");
test("live connection is restricted to the authorized project and Tracker hosts", async () => {
  const { checkConfig } = await import("../workspace/core.js");
  const key = "sb_publishable_SYNTHETIC_ONLY_01234567890123";
  assert.equal(
    checkConfig(
      "https://hyvoatfozlpsevsbkxxm.supabase.co",
      key,
      "tracker.brightscalegroup.com",
      true,
    ),
    "https://hyvoatfozlpsevsbkxxm.supabase.co",
  );
  assert.throws(() =>
    checkConfig(
      "https://wihfneccjwmtxzvivfzf.supabase.co",
      key,
      "tracker.brightscalegroup.com",
      true,
    ),
  );
  assert.throws(() =>
    checkConfig(
      "https://hyvoatfozlpsevsbkxxm.supabase.co",
      key,
      "untrusted.example",
      true,
    ),
  );
});
test("live adapter translates table/RPC names without shadowing command data", async () => {
  global.window = { PilotGateway: require("../staging/pilot-gateway.js") };
  const { createAPI } = await import("../workspace/api.js");
  const calls = [];
  const client = {
    _workspaceLive: true,
    _workspaceUser: "SYNTHETIC",
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: { saved: true }, error: null };
    },
    from: (name) => {
      calls.push({ table: name });
      const q = {
        select: () => q,
        eq: async () => ({ data: [], error: null }),
      };
      return q;
    },
  };
  const api = createAPI(client);
  await api.command(null, "person", { name: "SYNTHETIC" });
  await api.people();
  assert.equal(calls[0].name, "live_workspace_command");
  assert.deepEqual(calls[0].args.p_data, { name: "SYNTHETIC" });
  assert.equal(calls[1].table, "live_workspace_people");
});
