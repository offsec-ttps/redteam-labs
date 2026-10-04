// `rtlab reap` must never drop the record of a server lab it cannot tear down (no SSH credentials at hand):
// the control plane sends the destroy with the credentials later, and the record is what ties the id to the server.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const HOME = mkdtempSync(path.join(os.tmpdir(), "rtlab-reap-test-"));
const CLI = path.resolve("bin/rtlab.mjs");

test("reap leaves a server lab without credentials for the control plane", () => {
  const row = { id: "remote-abc123", name: "OWASP Juice Shop", engine: "remote", status: "running", createdAt: new Date(Date.now() - 7200e3).toISOString(),
    expiresAt: new Date(Date.now() - 3600e3).toISOString(), dir: path.join(HOME, "labs", "remote-abc123"), labs: [],
    remote: { spec: "root@203.0.113.5:22", keyFile: path.join(HOME, "missing-key") } };
  writeFileSync(path.join(HOME, "state.json"), JSON.stringify([row]));
  const out = JSON.parse(execFileSync("node", [CLI, "reap", "--json"], { env: { ...process.env, RTLAB_HOME: HOME }, encoding: "utf-8" }));
  assert.equal(out.reaped, 0);
  assert.deepEqual(out.skipped, ["remote-abc123"]);
  const left = JSON.parse(readFileSync(path.join(HOME, "state.json"), "utf-8"));
  assert.equal(left.length, 1, "the record must survive so a later destroy can find the server");
});
