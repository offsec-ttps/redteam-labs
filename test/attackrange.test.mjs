import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.RTLAB_HOME = mkdtempSync(path.join(os.tmpdir(), "rtlab-ar-test-"));
const A = await import("../src/engines/attackrange.mjs");

const ports = { splunkWeb: 8000, splunkApi: 8089, winrm: [5985, 5986], rdp: [5389, 5390], linuxSsh: [2022], kaliSsh: 2030 };
const n = A.normalizeOptions({ windows: 2, linux: 1, kali: true, createDomain: true });
const vf = A.renderVagrantfile({ id: "spinner-ab12cd", bindIp: "10.0.1.1", password: "RtQabcdefghjkmn7!", n, ports });

test("every forwarded port is bound to the private address, never to all interfaces", () => {
  const fwd = vf.split("\n").filter((l) => l.includes("forwarded_port"));
  assert.equal(fwd.length, 2 + 2 * 2 + 1 + 1);                       // splunk web+api, winrm+rdp per windows, linux ssh, kali ssh
  for (const l of fwd) assert.match(l, /host_ip: "10\.0\.1\.1"/, l);
  assert.ok(!vf.replace(/0\.0\.0\.0\/0/g, "").includes("0.0.0.0"), "no 0.0.0.0 anywhere (ip_whitelist is a playbook variable, not a bind)");
});

test("no GUI windows, unique VM names per deployment, the project's hardcoded password is gone", () => {
  assert.ok(!vf.includes("gui = true") && vf.includes("gui = false"));
  assert.ok(!vf.includes("Pl3ase-k1Ll-me"));
  const names = [...vf.matchAll(/vb\.name = "([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names, ["spinner-ab12cd-splunk", "spinner-ab12cd-win-0", "spinner-ab12cd-win-1", "spinner-ab12cd-linux-0", "spinner-ab12cd-kali"]);
  assert.equal(new Set(names).size, names.length);
  const defs = [...vf.matchAll(/config\.vm\.define "([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(defs).size, 5);
});

test("the generated password reaches every place the playbooks read it, and only the first Windows host becomes the DC", () => {
  assert.ok(vf.includes('splunk_admin_password: "RtQabcdefghjkmn7!"'));
  assert.ok(vf.includes('attack_range_password: "RtQabcdefghjkmn7!"'));
  assert.ok(vf.includes('net user Administrator RtQabcdefghjkmn7!'));
  assert.ok(vf.includes('ansible_password: "RtQabcdefghjkmn7!"'));
  const wins = vf.split('config.vm.define "ar-win-').slice(1);
  assert.match(wins[0], /create_domain: "1"/);
  assert.match(wins[1], /create_domain: "0"/);
  assert.ok(vf.includes("../packer/ansible/splunk_server.yml") && vf.includes("../terraform/ansible/windows_post.yml"));
});

test("Ruby string escaping cannot be broken out of by a value", () => {
  const evil = A.renderVagrantfile({ id: 'x"; system("id"); #', bindIp: "10.0.1.1", password: 'p"w#{`id`}', n: A.normalizeOptions({}), ports });
  const names = [...evil.matchAll(/vb\.name = "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(names.length >= 2 && names.every((x) => /^[a-z0-9-]+$/.test(x)), `ids are sanitised: ${names}`);
  assert.ok(!evil.includes('system("id")'), "no raw Ruby from the id survives");
  assert.ok(evil.includes('splunk_admin_password: "p\\"w\\#{`id`}"'), "quotes and interpolation are escaped");
});

test("options are bounded and memory is summed for pre-flight", () => {
  assert.throws(() => A.normalizeOptions({ windows: 9 }), /--windows/);
  assert.throws(() => A.normalizeOptions({ splunkMemoryMB: 1024 }), /Splunk server/);
  assert.throws(() => A.normalizeOptions({ windows: "two" }), /--windows/);
  const d = A.normalizeOptions({});
  assert.deepEqual([d.windows, d.linux, d.kali, d.createDomain, d.splunkMemoryMB], [1, 0, false, false, 6144]);
  assert.equal(A.memoryFor(d), 8192);
  assert.equal(A.memoryFor(n), 6144 + 2 * 2048 + 2048 + 2048);
});

test("generated passwords satisfy Windows and Splunk complexity rules", () => {
  for (let i = 0; i < 50; i++) {
    const p = A.generatePassword();
    assert.ok(p.length >= 14 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[!#%]/.test(p), p);
    assert.ok(!/[\s"'\\$`]/.test(p), "no shell/Ruby-hostile characters");
  }
});

test("Vagrant reaches WinRM on the lab address and the allocated port, not on 127.0.0.1", () => {
  assert.equal((vf.match(/config\.winrm\.host = "10\.0\.1\.1"/g) || []).length, 2);
  assert.ok(vf.includes("config.winrm.port = 5985") && vf.includes("config.winrm.port = 5986"));
});
