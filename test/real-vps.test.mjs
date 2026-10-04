/**
 * Real VPS path through the runner protocol: a control plane hands the runner a `kind: "remote"` job with an SSH
 * target, the runner drives the server's Docker over SSH, reports services, and tears down. Needs a reachable SSH
 * host with Docker (the throwaway sshd container used in development is fine). Skipped unless RTLAB_REAL_VPS=1 with
 * RTLAB_VPS_HOST, RTLAB_VPS_PORT, RTLAB_VPS_USER, RTLAB_VPS_KEY (path) and RTLAB_VPS_BIND (an address on the server).
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { execFileSync } from "node:child_process";

const RUN = process.env.RTLAB_REAL_VPS === "1";
process.env.RTLAB_AGENT_CONFIG = path.join(mkdtempSync(path.join(os.tmpdir(), "rtlab-vps-test-")), "agent.json");
const A = await import("../src/agent.mjs");
const { startMock, until } = await import("./mock-control-plane.mjs");

test("real VPS: deploy over SSH, reach the lab, verify-server, stop, start, destroy, secrets never leave the runner", { skip: !RUN && "set RTLAB_REAL_VPS=1", timeout: 15 * 60_000 }, async () => {
  const target = { kind: "vps", label: "test server", host: process.env.RTLAB_VPS_HOST, port: Number(process.env.RTLAB_VPS_PORT || 22), username: process.env.RTLAB_VPS_USER || "root",
    auth_type: "key", private_key: readFileSync(process.env.RTLAB_VPS_KEY, "utf-8"), bind_ip: process.env.RTLAB_VPS_BIND };
  const mock = await startMock();
  const cfg = await A.enroll({ url: mock.url, code: "GOOD-CODE", name: "vps-test" });
  const agent = new A.Agent(cfg, { log: () => {}, heartbeatMs: 3000, reapMs: 600_000 });
  const done = agent.run().catch((e) => e);
  const job = async (id, type, payload, wait = 8 * 60_000, deployment_id = "dep-1") => { mock.jobs.push({ id, type, deployment_id, payload }); await until(() => mock.final(id), wait, 500); return mock.final(id); };
  const leaked = () => JSON.stringify(mock.reports).includes("PRIVATE KEY");
  let rtlabId = null;
  try {
    const v = await job("j-verify", "verify-server", { server_id: "srv-1", target }, 3 * 60_000, null);
    assert.equal(v.status, "succeeded", v.error);
    assert.equal(v.result.ok, true, v.result.error); assert.ok(v.result.docker_version, "docker version reported"); assert.ok(v.result.fingerprint, "host key reported");

    const dep = await job("j-deploy", "deploy", { kind: "remote", name: "vps", labs: ["juice-shop"], ttl_minutes: 30, options: { accept_risks: true }, target });
    assert.equal(dep.status, "succeeded", dep.error);
    const r = dep.result; rtlabId = r.rtlab_id;
    assert.match(r.rtlab_id, /^remote-/); assert.equal(r.vm_ip, target.bind_ip); assert.equal(r.status, "running");
    const page = await fetch(r.services[0].url, { signal: AbortSignal.timeout(20_000) });
    assert.equal(page.status, 200, "the lab answers at the reported address");
    assert.ok(!leaked(), "the private key never appears in any report");

    assert.equal((await job("j-stop", "stop", { rtlab_id: r.rtlab_id, target }, 3 * 60_000)).status, "succeeded");
    await assert.rejects(fetch(r.services[0].url, { signal: AbortSignal.timeout(5000) }), "stopped lab no longer answers");
    assert.equal((await job("j-start", "start", { rtlab_id: r.rtlab_id, target }, 3 * 60_000)).status, "succeeded");
    await until(async () => (await fetch(r.services[0].url, { signal: AbortSignal.timeout(5000) }).catch(() => ({ status: 0 }))).status === 200, 60_000, 2000);

    const bad = await job("j-bad", "deploy", { kind: "remote", labs: ["juice-shop"], target: { ...target, private_key: "nope" } }, 60_000, "dep-2");
    assert.equal(bad.status, "failed"); assert.match(bad.error, /private key/);
  } finally {
    if (rtlabId) assert.equal((await job("j-destroy", "destroy", { rtlab_id: rtlabId, target }, 4 * 60_000)).status, "succeeded", "cleanup");
    agent.stop(); await done; await mock.close(); await A.unenroll();
  }
  assert.ok(!leaked());
  const left = execFileSync("docker", ["ps", "-a", "--format", "{{.Names}}"]).toString().split("\n").filter((l) => /^rtlab-remote-/.test(l));
  assert.deepEqual(left, [], "no containers left on the server");
});
