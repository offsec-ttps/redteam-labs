import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, before, after, beforeEach } from "node:test";
import { fileURLToPath } from "node:url";

// An isolated lab store, set BEFORE the modules read it.
const HOME = mkdtempSync(path.join(os.tmpdir(), "rtlab-agent-test-"));
process.env.RTLAB_HOME = HOME;
const FAKE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fake-cli.mjs");
const LOG = path.join(HOME, "cli.log");
process.env.FAKE_CLI_LOG = LOG;

const A = await import("../src/agent.mjs");
const state = await import("../src/state.mjs");
const { startMock, until } = await import("./mock-control-plane.mjs");

const HOST = {
  cpus: 8, memory: { totalMB: 16000, availableMB: 9000 }, tools: { vagrant: "V", virtualbox: "6" }, runningVms: 0,
  labStore: "/secret/lab/store",
  boxCache: { path: "/secret/boxes", freeGB: 100, totalGB: 200, device: "/dev/sda1" },
  dockerRoot: { path: "/secret/docker", freeGB: 50, device: "/dev/sda1" },
  storage: [{ id: "default", label: "Default", path: "/secret/store", isDefault: true, usable: true, freeGB: 100, totalGB: 200, device: "/dev/sda1" }],
};
const good = { name: "web", base_os: "ubuntu", labs: ["juice-shop", "dvwa"], ttl_minutes: 60, options: { no_egress: true } };

let mock;
beforeEach(async () => { if (mock) await mock.close(); mock = await startMock(); writeFileSync(LOG, ""); delete process.env.FAKE_CLI_MODE; delete process.env.FAKE_STATUS; await A.unenroll(); });
after(async () => { if (mock) await mock.close(); });

const logged = () => readFileSync(LOG, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
async function enrolledAgent(opts = {}) {
  const cfg = await A.enroll({ url: mock.url, code: "GOOD-CODE", name: "test-runner", hostFacts: async () => HOST });
  return new A.Agent(cfg, { hostFacts: async () => HOST, cli: FAKE, log: () => {}, heartbeatMs: 60_000, reapMs: 60_000, ...opts });
}
async function runUntilDone(agent, jobId) {
  const p = agent.run().catch((e) => e);
  try { await until(() => mock.final(jobId)); } finally { agent.stop(); }
  return p;
}

test("control plane URLs: https only (http allowed for localhost); both API layouts", () => {
  // an app's own domain -> /api/public/runner ; Supabase -> /functions/v1
  assert.equal(A.normalizeControlUrl("https://my-app.lovable.app"), "https://my-app.lovable.app/api/public/runner");
  assert.equal(A.normalizeControlUrl("https://my-app.lovable.app/api/public/runner/"), "https://my-app.lovable.app/api/public/runner");
  assert.equal(A.normalizeControlUrl("https://abc.supabase.co"), "https://abc.supabase.co/functions/v1");
  assert.equal(A.normalizeControlUrl("https://abc.supabase.co/functions/v1/"), "https://abc.supabase.co/functions/v1");
  assert.equal(A.normalizeControlUrl("http://127.0.0.1:5000"), "http://127.0.0.1:5000/api/public/runner");
  assert.equal(A.normalizeControlUrl("http://127.0.0.1:5000/functions/v1"), "http://127.0.0.1:5000/functions/v1");
  assert.throws(() => A.normalizeControlUrl("http://evil.example"), /https/);
  assert.throws(() => A.normalizeControlUrl("not a url"), /valid URL/);
  assert.throws(() => A.normalizeControlUrl("ftp://abc.supabase.co"), /https/);
});

test("the agent works against either API layout", async () => {
  for (const [suffix, layout] of [["", "app"], ["/functions/v1", "supabase"]]) {
    const m = await startMock();
    try {
      await A.unenroll();
      const cfg = await A.enroll({ url: m.url + suffix, code: "GOOD-CODE", hostFacts: async () => HOST });
      const agent = new A.Agent(cfg, { hostFacts: async () => HOST, cli: FAKE, log: () => {}, heartbeatMs: 60_000, reapMs: 60_000 });
      m.jobs.push({ id: "lay-1", type: "deploy", deployment_id: "d", payload: good });
      const p = agent.run().catch((e) => e);
      await until(() => m.final("lay-1"));
      agent.stop(); await p;
      assert.deepEqual([...m.layouts], [layout]);
      assert.equal(m.final("lay-1").status, "succeeded");
    } finally { await m.close(); }
  }
});

test("hostile deploy payloads are rejected before anything runs", () => {
  const bad = (patch, re) => assert.throws(() => A.validateDeploy({ ...good, ...patch }), re);
  assert.doesNotThrow(() => A.validateDeploy(good));
  bad({ labs: ["juice-shop;touch /tmp/pwned"] }, /unknown lab/);
  bad({ labs: ["$(reboot)"] }, /unknown lab/);
  bad({ labs: ["JUICE-SHOP"] }, /unknown lab/);                     // no case-folding tricks
  bad({ labs: ["nope"] }, /unknown lab/);
  bad({ labs: ["goad"] }, /cannot be deployed/);                    // catalogued but not a container lab
  bad({ labs: [] }, /1 to 5/);
  bad({ labs: ["dvwa", "dvwa"] }, /distinct/);
  bad({ labs: ["dvwa", "juice-shop", "webgoat", "crapi", "a", "b"] }, /1 to 5/);
  bad({ base_os: "windows" }, /base_os/);
  bad({ base_os: "ubuntu; id" }, /base_os/);
  bad({ ttl_minutes: 1 }, /ttl_minutes/);
  bad({ ttl_minutes: 99999 }, /ttl_minutes/);
  bad({ ttl_minutes: "60" }, /ttl_minutes/);
  bad({ options: { memory_mb: 10 ** 9 } }, /memory_mb/);
  bad({ options: { cpus: 0 } }, /cpus/);
  bad({ options: { kali_tools: "kali-tools-top10" } }, /kali_tools/);                      // needs a kali base
  bad({ base_os: "kali", options: { kali_tools: "kali-tools-top10 && curl evil" } }, /kali_tools/);
  bad({ options: { storage_id: "/etc" } }, /storage/);
  bad({ options: { storage_id: "../../etc" } }, /storage/);
  bad({ options: { storage_id: "not-configured" } }, /unknown storage/);
  assert.throws(() => A.validateDeploy(null), /payload/);
  assert.throws(() => A.validateDeploy("rm -rf /"), /base_os|payload/);
});

test("deploy arguments are built as an array with only known flags", () => {
  const n = A.validateDeploy({ ...good, options: { no_egress: true, accept_risks: true, cpus: 2, memory_mb: 2048 } });
  const args = A.deployArgs(n);
  assert.deepEqual(args.slice(0, 4), ["spinner", "deploy", "--os", "ubuntu"]);
  assert.ok(args.includes("--no-egress") && args.includes("--allow-low-resources"));
  assert.equal(args[args.indexOf("--labs") + 1], "juice-shop,dvwa");
  assert.equal(args[args.indexOf("--ttl") + 1], "60m");
  assert.equal(args[args.indexOf("--storage") + 1], "default");
  assert.ok(args.every((a) => typeof a === "string"));
});

test("lifecycle jobs need a well-formed id that exists on this machine", async () => {
  await assert.rejects(() => A.validateLifecycle("stop", { rtlab_id: "x; rm -rf /" }), /not a valid/);
  await assert.rejects(() => A.validateLifecycle("stop", { rtlab_id: "../../etc/passwd" }), /not a valid/);
  await assert.rejects(() => A.validateLifecycle("stop", { rtlab_id: "spinner-zzzzzz" }), /no deployment/);
  // A destroy may target a lab whose local record is gone (the CLI sweeps by exact name / server label); start and stop may not.
  const target = { host: "203.0.113.5", port: 22, username: "root", auth: { kind: "key", privateKey: "k" } };
  assert.deepEqual(await A.validateLifecycle("destroy", { rtlab_id: "remote-zzzzzz", target }), ["destroy", "remote-zzzzzz", "--yes"]);
  assert.deepEqual(await A.validateLifecycle("destroy", { rtlab_id: "spinner-zzzzzz" }), ["destroy", "spinner-zzzzzz", "--yes"]);
  assert.deepEqual(await A.validateLifecycle("destroy", { rtlab_id: "remote-zzzzzz", target, purge: true }), ["destroy", "remote-zzzzzz", "--yes", "--purge"]);
  assert.deepEqual(await A.validateLifecycle("destroy", { rtlab_id: "remote-zzzzzz", target, purge: "yes" }), ["destroy", "remote-zzzzzz", "--yes"]);
  await assert.rejects(() => A.validateLifecycle("stop", { rtlab_id: "remote-zzzzzz", target }), /no deployment/);
  await assert.rejects(() => A.validateLifecycle("start", { rtlab_id: "spinner-zzzzzz" }), /no deployment/);
  await state.add({ id: "spinner-abc123", engine: "spinner", status: "running" });
  assert.deepEqual(await A.validateLifecycle("destroy", { rtlab_id: "spinner-abc123" }), ["destroy", "spinner-abc123", "--yes"]);
});

test("host facts never carry filesystem paths", () => {
  const out = A.stripPaths(HOST);
  const text = JSON.stringify(out);
  assert.ok(!text.includes("/secret") && !text.includes("/dev/sda1"), text);
  assert.equal(out.storage[0].id, "default");
  assert.equal(out.storage[0].freeGB, 100);
  assert.ok(JSON.stringify(HOST).includes("/secret/store"), "the input is not mutated");
});

test("secrets are redacted from log lines", () => {
  assert.ok(!A.redact("echo 'operator:SuperSecretPw99' | chpasswd").includes("SuperSecretPw99"));
  assert.ok(!A.redact('password: "SuperSecretPw99"').includes("SuperSecretPw99"));
  assert.equal(A.redact("starting juice-shop"), "starting juice-shop");
  assert.equal(A.redact("provision: net user Administrator RtQsecretsecret7!"), "provision: net user Administrator ***");
  assert.ok(!A.redact("vagrant ssh -p 2222 --password hunter2x!").includes("hunter2x"));
});

test("enrollment stores the runner key owner-only, and a bad code stores nothing", async () => {
  await assert.rejects(() => A.enroll({ url: mock.url, code: "WRONG", hostFacts: async () => HOST }), /Invalid or expired/);
  assert.equal(await A.loadConfig(), null);
  const cfg = await A.enroll({ url: mock.url, code: "GOOD-CODE", name: "laptop", hostFacts: async () => HOST });
  assert.equal(cfg.runnerKey, "rtr_testkey");
  assert.ok(existsSync(A.CONFIG_PATH()));
  assert.equal((statSync(A.CONFIG_PATH()).mode & 0o777).toString(8), "600");
  assert.equal(mock.enrolled.name, "laptop");
  assert.ok(!JSON.stringify(mock.enrolled).includes("/secret"), "enrollment sends no paths");
  await assert.rejects(() => A.enroll({ url: "http://evil.example", code: "GOOD-CODE", hostFacts: async () => HOST }), /https/);
});

test("a deploy job runs end to end: validated, executed, reported with credentials only in the result", async () => {
  const agent = await enrolledAgent();
  mock.jobs.push({ id: "job-1", type: "deploy", deployment_id: "dep-1", payload: good });
  await runUntilDone(agent, "job-1");

  const hb = mock.heartbeats[0];                                             // host facts went out, without paths
  assert.equal(hb.host.cpus, 8);
  assert.ok(!JSON.stringify(hb).includes("/secret"));
  assert.ok(Array.isArray(hb.deployments));

  const cli = logged().find((a) => a[0] === "spinner");
  assert.ok(cli.includes("--yes") && cli.includes("--json") && cli.includes("--events"));
  assert.equal(cli[cli.indexOf("--labs") + 1], "juice-shop,dvwa");

  const fin = mock.final("job-1");
  assert.equal(fin.status, "succeeded");
  assert.equal(fin.result.rtlab_id, "spinner-abc123");
  assert.equal(fin.result.vm_ip, "10.66.7.10");
  assert.equal(fin.result.subnet, "10.66.7.0/24");
  assert.equal(fin.result.services[0].url, "http://10.66.7.10:3000");
  assert.equal(fin.result.credentials.vm.username, "operator");
  assert.equal(fin.result.credentials.vm.password, "SuperSecretPw99");

  const events = mock.reports.flatMap((r) => r.events || []);
  assert.ok(events.some((e) => /booting/.test(e.message)));
  assert.ok(!JSON.stringify(events).includes("SuperSecretPw99"), "the password never appears in logs");
});

test("a failing deploy is reported as failed with the reason", async () => {
  process.env.FAKE_CLI_MODE = "fail";
  const agent = await enrolledAgent();
  mock.jobs.push({ id: "job-2", type: "deploy", deployment_id: "dep-2", payload: good });
  await runUntilDone(agent, "job-2");
  const fin = mock.final("job-2");
  assert.equal(fin.status, "failed");
  assert.match(fin.error, /not enough memory/);
  assert.equal(fin.result, undefined);
});

test("malicious or unknown jobs are refused without running the CLI", async () => {
  const agent = await enrolledAgent();
  mock.jobs.push({ id: "evil-1", type: "deploy", deployment_id: "d", payload: { ...good, labs: ["dvwa;touch /tmp/pwned"] } });
  mock.jobs.push({ id: "evil-2", type: "exec", deployment_id: "d", payload: { cmd: "rm -rf /" } });
  mock.jobs.push({ id: "evil-3", type: "stop", deployment_id: "d", payload: { rtlab_id: "spinner-nothere" } });
  const p = agent.run().catch((e) => e);
  await until(() => ["evil-1", "evil-2", "evil-3"].every((id) => mock.final(id)));
  agent.stop(); await p;
  for (const id of ["evil-1", "evil-2", "evil-3"]) assert.equal(mock.final(id).status, "failed", id);
  assert.match(mock.final("evil-1").error, /unknown lab/);
  assert.match(mock.final("evil-2").error, /unsupported job type/);
  assert.equal(logged().filter((a) => a[0] !== "status").length, 0, "nothing was executed");
});

test("stop, start and destroy jobs run against an existing deployment", async () => {
  await state.add({ id: "spinner-abc123", engine: "spinner", status: "running" });
  const agent = await enrolledAgent();
  mock.jobs.push({ id: "j-stop", type: "stop", deployment_id: "d", payload: { rtlab_id: "spinner-abc123" } });
  mock.jobs.push({ id: "j-destroy", type: "destroy", deployment_id: "d", payload: { rtlab_id: "spinner-abc123" } });
  const p = agent.run().catch((e) => e);
  await until(() => mock.final("j-stop") && mock.final("j-destroy"));
  agent.stop(); await p;
  assert.equal(mock.final("j-stop").status, "succeeded");
  assert.equal(mock.final("j-destroy").result.rtlab_id, "spinner-abc123");
  const ran = logged().filter((a) => a[0] !== "status").map((a) => a.slice(0, 3).join(" "));
  assert.deepEqual(ran, ["stop spinner-abc123 --yes", "destroy spinner-abc123 --yes"]);
});

test("VPN peers on a cloud range run through `rtlab cloud vpn-peer <id> <name>`: no target block, the config only in the result", async () => {
  const agent = await enrolledAgent();
  mock.jobs.push({ id: "j-peer", type: "vpn-peer", deployment_id: "d", payload: { rtlab_id: "splunk-attack-range-ab12cd", name: "jack-1" } });
  mock.jobs.push({ id: "j-bad", type: "vpn-peer", deployment_id: "d", payload: { rtlab_id: "splunk-attack-range-ab12cd", name: "Jack; id" } });
  mock.jobs.push({ id: "j-rm", type: "vpn-remove-peer", deployment_id: "d", payload: { rtlab_id: "splunk-attack-range-ab12cd", name: "jack-1" } });
  const p = agent.run().catch((e) => e);
  await until(() => mock.final("j-peer") && mock.final("j-bad") && mock.final("j-rm"));
  agent.stop(); await p;
  const fin = mock.final("j-peer");
  assert.equal(fin.status, "succeeded");
  assert.equal(fin.result.ok, true); assert.equal(fin.result.name, "jack-1"); assert.equal(fin.result.address, "10.8.0.2");
  assert.ok(fin.result.credentials.vpn_config.includes("AllowedIPs = 10.8.0.0/24, 10.0.0.0/16"));
  assert.ok(!JSON.stringify(mock.reports.flatMap((r) => r.events || [])).includes("PEERPRIVATEKEY"), "the private key never appears in events");
  assert.equal(mock.final("j-bad").status, "failed"); assert.match(mock.final("j-bad").error, /peer name/);
  assert.deepEqual(mock.final("j-rm").result, { ok: true, name: "jack-1" });
  const ran = logged().filter((a) => a[0] === "cloud").map((a) => a.slice(0, 4).join(" "));
  assert.deepEqual(ran, ["cloud vpn-peer splunk-attack-range-ab12cd jack-1", "cloud vpn-remove-peer splunk-attack-range-ab12cd jack-1"]);
});

test("heartbeats report what really exists so timer-destroyed labs disappear from the website", async () => {
  process.env.FAKE_STATUS = JSON.stringify([{ id: "spinner-abc123", status: "running" }, { id: "spinner-def456", status: "stopped" }]);
  const agent = await enrolledAgent();
  const p = agent.run().catch((e) => e);
  await until(() => mock.heartbeats.length >= 1);
  agent.stop(); await p;
  assert.deepEqual(mock.heartbeats[0].deployments, [{ rtlab_id: "spinner-abc123", status: "running" }, { rtlab_id: "spinner-def456", status: "stopped" }]);
});

test("a revoked runner key stops the agent with a clear error instead of looping", async () => {
  mock.rejectPoll = true;
  const agent = await enrolledAgent();
  const err = await agent.run().catch((e) => e);
  assert.ok(err instanceof A.AuthError, String(err));
  assert.ok(mock.polls <= 2);
});

test("stopping an idle agent returns promptly", async () => {
  const agent = await enrolledAgent();
  const p = agent.run();
  await until(() => mock.polls >= 1);
  const t = Date.now();
  agent.stop();
  await p;
  assert.ok(Date.now() - t < 1500, "run() must not hang after stop()");
});


test("heartbeat statuses are limited to what the control plane understands", async () => {
  assert.deepEqual(A.mapStatuses([
    { id: "spinner-aaa111", status: "running" }, { id: "spinner-bbb222", status: "stopped" },
    { id: "spinner-ccc333", status: "starting" }, { id: "spinner-ddd444", status: "partial" },
    { id: "spinner-eee555", status: "unknown" }, { id: "tf-1", status: "planned" }, { status: "running" }, null,
  ]), [{ rtlab_id: "spinner-aaa111", status: "running" }, { rtlab_id: "spinner-bbb222", status: "stopped" }]);
  assert.deepEqual(A.mapStatuses(null), []);
  // and end to end: a host with a half-started lab must not get the heartbeat rejected (the mock is strict)
  process.env.FAKE_STATUS = JSON.stringify([{ id: "spinner-abc123", status: "running" }, { id: "spinner-def456", status: "starting" }]);
  const agent = await enrolledAgent();
  const p = agent.run().catch((e) => e);
  try { await until(() => mock.heartbeats.length >= 1); } finally { agent.stop(); await p; }
  assert.deepEqual(mock.heartbeats[0].deployments, [{ rtlab_id: "spinner-abc123", status: "running" }]);
});

test("results never contain explicit nulls (the control plane rejects them)", () => {
  const r = A.mapDeployResult({ id: "spinner-abc123", status: "running", privateIp: "10.66.1.10", spinnerNet: undefined, services: [], labs: [], access: { host: "10.66.1.10", ssh: "x", username: "operator", password: "p" } });
  assert.ok(!("subnet" in r), "a missing subnet is omitted, not sent as null");
  assert.deepEqual(A.compact({ a: null, b: undefined, c: { d: null, e: 1 }, f: [{ g: null, h: 2 }] }), { c: { e: 1 }, f: [{ h: 2 }] });
});

test("the final report is retried through server errors, because it holds the only copy of the credentials", async () => {
  mock.failReports = 3;                                             // three 503s, then it works
  const agent = await enrolledAgent();
  agent.reportRetryMs = 60_000;
  mock.jobs.push({ id: "retry-1", type: "deploy", deployment_id: "d", payload: good });
  const p = agent.run().catch((e) => e);
  try { await until(() => mock.final("retry-1"), 30_000); } finally { agent.stop(); await p; }
  const fin = mock.final("retry-1");
  assert.equal(fin.status, "succeeded");
  assert.equal(fin.result.credentials.vm.password, "SuperSecretPw99");
});

test("a client error on the final report is final (no endless retrying)", async () => {
  const agent = await enrolledAgent();
  mock.jobs.push({ id: "gone-1", type: "deploy", deployment_id: "d", payload: good });
  mock.conflictJobs.add("gone-1");                                   // the control plane will answer 409
  const p = agent.run().catch((e) => e);
  try {
    await until(() => logged().some((a) => a[0] === "spinner"));
    await new Promise((r) => setTimeout(r, 600));
  } finally { agent.stop(); await p; }
  assert.equal(mock.final("gone-1"), undefined);
  assert.equal(mock.reports.filter((r) => r.job_id === "gone-1" && r.status !== "running").length, 0, "a 409 is not retried");
});


test("whole-lab deploys (Attack Range) are validated, run through `rtlab deploy`, and reported with their logins", async () => {
  const bad = (payload, re) => assert.throws(() => A.validateLabDeploy(payload), re);
  bad({ kind: "lab", lab: "juice-shop" }, /whole-lab/);                       // a container lab is not a whole-lab environment
  bad({ kind: "lab", lab: "goad" }, /whole-lab/);                              // catalogued but not deployable
  bad({ kind: "lab", lab: "splunk-attack-range; id" }, /unknown lab/);
  bad({ kind: "lab", lab: "splunk-attack-range", options: { windows: 99 } }, /windows/);
  bad({ kind: "lab", lab: "splunk-attack-range", options: { splunkMemoryMB: 512 } }, /splunkMemoryMB/);
  const n = A.validateLabDeploy({ kind: "lab", lab: "splunk-attack-range", ttl_minutes: 480, options: { windows: 2, createDomain: true, kali: true } });
  assert.deepEqual(A.labDeployArgs(n), ["deploy", "splunk-attack-range", "--ttl", "480m", "--yes", "--windows", "2", "--linux", "0", "--kali", "--domain"]);

  const agent = await enrolledAgent();
  mock.jobs.push({ id: "ar-1", type: "deploy", deployment_id: "d", payload: { kind: "lab", lab: "splunk-attack-range", ttl_minutes: 480, options: { windows: 1, createDomain: true } } });
  await runUntilDone(agent, "ar-1");
  const fin = mock.final("ar-1");
  assert.equal(fin.status, "succeeded");
  assert.equal(fin.result.rtlab_id, "splunk-attack-range-ab12cd");
  assert.equal(fin.result.vm_ip, "10.0.1.1");
  assert.ok(fin.result.services.some((s) => s.url === "http://10.0.1.1:8000"));
  assert.equal(fin.result.credentials.vm.password, "RtQsecretsecret7!");
  assert.match(fin.result.credentials.labs[0].default_credentials.splunk_web, /admin/);
  assert.ok(!JSON.stringify(mock.reports.flatMap((r) => r.events || [])).includes("RtQsecretsecret7!"), "the password never appears in logs");
  const cli = logged().find((a) => a[0] === "deploy");
  assert.deepEqual(cli.slice(0, 2), ["deploy", "splunk-attack-range"]);
  assert.ok(cli.includes("--domain") && cli.includes("--yes"));
});

test("lifecycle ids accept whole-lab deployments too", async () => {
  await state.add({ id: "splunk-attack-range-ab12cd", engine: "attack-range", status: "running" });
  assert.deepEqual(await A.validateLifecycle("stop", { rtlab_id: "splunk-attack-range-ab12cd" }), ["stop", "splunk-attack-range-ab12cd", "--yes"]);
  await assert.rejects(() => A.validateLifecycle("stop", { rtlab_id: "../x-ab12cd" }), /not a valid/);
});

test("cloud jobs: only known credential fields become env, secrets are masked, and the result is a plan", () => {
  const creds = { access_key_id: "AKIAIOSFODNN7EXAMPLE", secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", region: "eu-west-1" };
  const env = A.cloudEnv("aws", creds);
  assert.deepEqual(Object.keys(env).sort(), ["AWS_ACCESS_KEY_ID", "AWS_DEFAULT_REGION", "AWS_REGION", "AWS_SECRET_ACCESS_KEY"]);
  assert.throws(() => A.cloudEnv("aws", { ...creds, profile: "x" }), /unexpected credential field/);
  assert.throws(() => A.cloudEnv("aws", { access_key_id: "AKIA" }), /secret_access_key.*required/);
  assert.throws(() => A.cloudEnv("oracle", creds), /unsupported cloud provider/);
  assert.throws(() => A.cloudEnv("azure", { client_id: "a", client_secret: "b", tenant_id: "t" }), /subscription_id.*required/);
  const mask = A.maskValues(env);
  assert.equal(mask(`terraform plan AWS_SECRET_ACCESS_KEY=${creds.secret_access_key} ok`), "terraform plan AWS_SECRET_ACCESS_KEY=*** ok");
  assert.ok(!A.redact(`Error: ${creds.secret_access_key} for AKIAIOSFODNN7EXAMPLE`).includes("AKIAIOSFODNN7EXAMPLE"));
  const r = A.mapCloudResult({ id: "awsgoat-ab12cd", planned: true, identity: "account 1 · arn", plan: { add: 345, change: 0, destroy: 0 },
    applyCmd: "cd /x && terraform apply rtlab.tfplan", destroyCmd: "cd /x && terraform destroy", tfDir: "/x", name: "AWSGoat" }, "awsgoat");
  assert.equal(r.status, "planned"); assert.equal(r.plan.add, 345); assert.ok(r.plan.apply_cmd.includes("terraform apply"));
  assert.deepEqual(r.services, []); assert.ok(!r.credentials.labs[0].default_credentials);
  assert.ok(!JSON.stringify(r).includes("EXAMPLEKEY"));
});

test("cloud jobs: the lab must be a catalogued Terraform lab of the right provider", () => {
  assert.throws(() => A.validateCloudDeploy({ kind: "cloud", lab: "juice-shop", credentials: {} }), /not a cloud lab/);
  assert.throws(() => A.validateCloudDeploy({ kind: "cloud", lab: "awsgoat", provider: "azure", credentials: {} }), /is a aws lab/);
  const n = A.validateCloudDeploy({ kind: "cloud", lab: "awsgoat", credentials: { access_key_id: "AKIAIOSFODNN7EXAMPLE", secret_access_key: "x".repeat(40) } });
  assert.equal(n.provider, "aws"); assert.deepEqual(A.cloudDeployArgs(n), ["deploy", "awsgoat", "--yes"]);
});

test("spinner jobs: per-lab options are validated against the catalog and secret values are masked", () => {
  const payload = { base_os: "ubuntu", labs: ["damn-vulnerable-llm-agent"], ttl_minutes: 60,
    options: { lab_env: { "damn-vulnerable-llm-agent": { LLM_BACKEND: "openrouter", OPENROUTER_API_KEY: "sk-or-v1-SECRETSECRET" } } } };
  const n = A.validateDeploy(payload);
  const args = A.deployArgs(n);
  assert.ok(args.includes("--lab-env") && args.includes("damn-vulnerable-llm-agent:LLM_BACKEND=openrouter"));
  assert.ok(args.some((a) => a.startsWith("damn-vulnerable-llm-agent:OPENROUTER_API_KEY=")));
  assert.deepEqual(A.labEnvSecrets(n), ["sk-or-v1-SECRETSECRET"]);
  assert.throws(() => A.validateDeploy({ ...payload, options: { lab_env: { "damn-vulnerable-llm-agent": { FOO: "1" } } } }), /does not take an option/);
  assert.throws(() => A.validateDeploy({ ...payload, options: { lab_env: { "juice-shop": { X: "1" } } } }), /not being deployed/);
  assert.throws(() => A.validateDeploy({ ...payload, options: { lab_env: { "damn-vulnerable-llm-agent": { LLM_BACKEND: "groq" } } } }), /must be one of/);
});

test("remote (VPS) jobs: target validated, key kept off argv, result mapped like a spinner, verify-server shape", async () => {
  const key = "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\n-----END OPENSSH PRIVATE KEY-----";
  const n = A.validateRemoteDeploy({ kind: "remote", labs: ["juice-shop", "dvwa"], ttl_minutes: 90, options: { no_egress: true },
    target: { kind: "vps", host: "203.0.113.9", port: 2222, username: "deploy", label: "Hostinger VPS", private_key: key, bind_ip: "203.0.113.9" } });
  assert.equal(n.remote.port, 2222); assert.equal(n.remote.auth.kind, "key"); assert.equal(n.remote.bindIp, "203.0.113.9");
  assert.deepEqual(A.remoteDeployArgs(n), ["remote", "deploy", "--labs", "juice-shop,dvwa", "--ttl", "90m", "--yes", "--no-egress"]);
  await A.withRemoteCli(n.remote, async (args, env) => {
    assert.ok(args.includes("--ssh-key") && !args.join(" ").includes("PRIVATE KEY"), "the key is a file path, never argv");
    assert.ok(!("RTLAB_SSH_PASSWORD" in env));
    const file = args[args.indexOf("--ssh-key") + 1];
    assert.equal((await import("node:fs")).statSync(file).mode & 0o777, 0o600);
  });
  const pw = A.validateRemoteDeploy({ kind: "remote", labs: ["juice-shop"], target: { kind: "vps", host: "vps.example.net", username: "root", password: "hunter22!" } });
  await A.withRemoteCli(pw.remote, async (args, env) => { assert.ok(args.includes("--ssh-password-env")); assert.equal(env.RTLAB_SSH_PASSWORD, "hunter22!"); assert.ok(!args.join(" ").includes("hunter22")); });
  assert.throws(() => A.validateRemoteDeploy({ kind: "remote", labs: ["juice-shop"], target: { kind: "vps", host: "bad host", username: "root", password: "x".repeat(10) } }), /host/);
  assert.throws(() => A.validateRemoteDeploy({ kind: "remote", labs: ["juice-shop"], target: { kind: "vps", host: "1.2.3.4", username: "Root!", password: "x".repeat(10) } }), /username/);
  assert.throws(() => A.validateRemoteDeploy({ kind: "remote", labs: ["juice-shop"], target: { kind: "vps", host: "1.2.3.4", username: "root", private_key: "not a key" } }), /private key/);
  assert.throws(() => A.validateTarget({ kind: "local" }), /VPS target/);
  const r = A.mapRemoteResult({ id: "remote-ab12cd", status: "running", bindIp: "203.0.113.9", services: [{ lab: "juice-shop", name: "juice-shop", port: 3000, url: "http://203.0.113.9:3000" }],
    labs: [{ labId: "juice-shop", name: "OWASP Juice Shop", defaultCreds: null, services: [{ name: "juice-shop", port: 3000, url: "http://203.0.113.9:3000" }] }] });
  assert.equal(r.status, "running"); assert.equal(r.vm_ip, "203.0.113.9"); assert.equal(r.services[0].url, "http://203.0.113.9:3000");
  assert.ok(!JSON.stringify(r).includes("PRIVATE"));
});

test("verify-cloud jobs: bad credential shapes are reported as ok:false without running anything", () => {
  assert.throws(() => A.cloudEnv("aws", { access_key_id: "AKIAIOSFODNN7EXAMPLE" }), /secret_access_key.*required/);
  const env = A.cloudEnv("gcp", { credentials_json: JSON.stringify({ type: "service_account", project_id: "p1" }), project: "p1" });
  assert.deepEqual(Object.keys(env).sort(), ["GOOGLE_CREDENTIALS", "GOOGLE_PROJECT"]);
});

test("Attack Range goes through the cloud job path with validated range options; cloud-apply and cloud destroy are explicit", async () => {
  const creds = { access_key_id: "AKIAEXAMPLEEXAMPLE", secret_access_key: "x".repeat(40) };
  const n = A.validateCloudDeploy({ kind: "cloud", lab: "splunk-attack-range", provider: "aws", credentials: creds, options: { region: "us-east-1", windows: 2, kali: true } });
  assert.equal(n.range.windows, 2); assert.equal(n.range.kali, true); assert.equal(n.range.region, "us-east-1");
  assert.deepEqual(A.cloudDeployArgs(n), ["deploy", "splunk-attack-range", "--yes", "--provider", "aws", "--region", "us-east-1", "--windows", "2", "--linux", "0", "--kali"]);
  const az = { client_id: "c", client_secret: "s", tenant_id: "t", subscription_id: "sub" };
  const p = A.validateCloudDeploy({ lab: "splunk-attack-range", provider: "azure", credentials: az, options: { preset: "splunk_ad_azure" } });
  assert.equal(p.range.createDomain, true); assert.equal(p.range.windows, 2); assert.equal(p.range.location, "West Europe");
  assert.deepEqual(A.cloudDeployArgs(p), ["deploy", "splunk-attack-range", "--yes", "--provider", "azure", "--location", "West Europe", "--preset", "splunk_ad_azure", "--windows", "2", "--linux", "0", "--domain"]);
  assert.throws(() => A.validateCloudDeploy({ lab: "splunk-attack-range", provider: "azure", credentials: az, options: { zeek: true } }), /Zeek is not available/);
  assert.throws(() => A.validateCloudDeploy({ lab: "splunk-attack-range", provider: "aws", credentials: creds, options: { preset: "nope; rm" } }), /preset id/);
  assert.throws(() => A.validateCloudDeploy({ lab: "splunk-attack-range", provider: "aws", credentials: creds, options: { region: "us-east-1; rm -rf /" } }), /region/);
  assert.throws(() => A.validateCloudDeploy({ lab: "splunk-attack-range", provider: "aws", credentials: creds, options: { windows: 9 } }), /windows/);
  const a = A.validateCloudApply({ rtlab_id: "splunk-attack-range-abc123", provider: "aws", credentials: creds });
  assert.equal(a.id, "splunk-attack-range-abc123"); assert.equal(a.env.AWS_ACCESS_KEY_ID, creds.access_key_id);
  assert.throws(() => A.validateCloudApply({ rtlab_id: "../x", provider: "aws", credentials: creds }), /not a valid/);
  const r = A.mapCloudApplyResult({ id: "x-abc123", status: "running", services: [{ name: "splunk-web", port: 8000, url: "http://1.2.3.4:8000" }], access: { splunk: { url: "http://1.2.3.4:8000", username: "admin", password: "Pw" }, windows: [{ host: "5.6.7.8", port: 3389, username: "Administrator", password: "Pw", hostname: "ar-win-0" }] } });
  assert.equal(r.status, "running"); assert.match(r.credentials.labs[0].default_credentials.splunk_web, /password Pw/); assert.match(r.credentials.labs[0].default_credentials["ar-win-0_rdp"], /5.6.7.8:3389/);
});
