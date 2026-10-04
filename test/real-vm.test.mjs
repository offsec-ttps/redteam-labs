/**
 * REAL integration test: drives the agent through the runner protocol against a mock control plane and a REAL
 * VirtualBox VM (deploy, lab reachable, SSH login, stop, start, destroy). Needs Vagrant + VirtualBox, a cached base
 * box, about 1.5 GB of free RAM and 4-5 minutes. Skipped unless RTLAB_REAL_VM=1.
 *
 *   RTLAB_REAL_VM=1 npm test
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const RUN = process.env.RTLAB_REAL_VM === "1";
const CONFIG = path.join(mkdtempSync(path.join(os.tmpdir(), "rtlab-real-")), "agent.json");
process.env.RTLAB_AGENT_CONFIG = CONFIG;                 // never touch a real enrollment

const A = await import("../src/agent.mjs");
const { startMock, until } = await import("./mock-control-plane.mjs");

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf-8", timeout: 60_000, ...opts });
const hasSshpass = (() => { try { sh("sshpass", ["-V"]); return true; } catch { return false; } })();
const vmRunning = (name) => sh("VBoxManage", ["list", "runningvms"]).includes(`"${name}"`);

test("real VM: deploy, reach the lab, log in, stop, start, destroy, all through the protocol", { skip: !RUN && "set RTLAB_REAL_VM=1", timeout: 20 * 60_000 }, async () => {
  const mock = await startMock();
  const cfg = await A.enroll({ url: mock.url, code: "GOOD-CODE", name: "real-test" });
  const agent = new A.Agent(cfg, { log: () => {}, heartbeatMs: 3000, reapMs: 600_000 });
  const done = agent.run().catch((e) => e);
  const job = async (id, type, payload, wait = 10 * 60_000) => { mock.jobs.push({ id, type, deployment_id: "dep-1", payload }); await until(() => mock.final(id), wait, 500); return mock.final(id); };

  try {
    const dep = await job("j-deploy", "deploy", { name: "real", base_os: "ubuntu", labs: ["juice-shop"], ttl_minutes: 30, options: { memory_mb: 1024, cpus: 1, accept_risks: true } });
    assert.equal(dep.status, "succeeded", dep.error);
    const r = dep.result;
    assert.match(r.vm_ip, /^10\.66\.\d+\.10$/);
    assert.match(r.subnet, /^10\.66\.\d+\.0\/24$/);
    assert.match(r.rtlab_id, /^spinner-/);
    assert.ok(mock.reports.flatMap((x) => x.events || []).some((e) => /vagrant|VM|Juice/i.test(e.message)), "live events were streamed");

    const url = r.services[0].url;
    const page = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    assert.equal(page.status, 200, "the lab answers at the reported address");
    assert.ok((await page.text()).includes("OWASP Juice Shop"));

    if (hasSshpass) {                                           // the credentials we report really log in
      const who = sh("sshpass", ["-p", r.credentials.vm.password, "ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", "-o", "LogLevel=ERROR", `${r.credentials.vm.username}@${r.credentials.vm.host}`, "whoami"]).trim();
      assert.equal(who, r.credentials.vm.username);
    }

    await until(() => mock.heartbeats.some((h) => h.deployments.some((d) => d.rtlab_id === r.rtlab_id && d.status === "running")), 30_000, 500);   // the host reports it as running

    const vmName = r.rtlab_id;
    assert.equal((await job("j-stop", "stop", { rtlab_id: r.rtlab_id }, 3 * 60_000)).status, "succeeded");
    assert.equal(vmRunning(vmName), false, "stopped");
    assert.equal((await job("j-start", "start", { rtlab_id: r.rtlab_id }, 5 * 60_000)).status, "succeeded");
    assert.equal(vmRunning(vmName), true, "started again");
    assert.equal((await fetch(url, { signal: AbortSignal.timeout(30_000) })).status, 200);
  } finally {
    const ids = mock.heartbeats.at(-1)?.deployments?.map((d) => d.rtlab_id) ?? [];
    for (const id of ids.filter((x) => x && mock.reports.some((rep) => rep.result?.rtlab_id === x))) {
      const d = await job(`j-destroy-${id}`, "destroy", { rtlab_id: id }, 4 * 60_000).catch((e) => ({ status: e.message }));
      assert.equal(d.status, "succeeded", "cleanup");
    }
    agent.stop(); await done; await mock.close(); await A.unenroll();
  }
  const left = sh("VBoxManage", ["list", "vms"]).split("\n").filter((l) => /spinner-/.test(l));
  assert.deepEqual(left, [], "no VM left behind");
});
