import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderConfig, normalizeCloudOptions, RANGE_NETWORKS, VPN } from "../src/engines/arcloud.mjs";
import { setupScript, addPeerScript } from "../src/remote-vpn.mjs";
import { mapCloudApplyResult } from "../src/agent.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SHIM = path.join(here, "..", "src", "engines", "arcloud-shim.py");

test("a cloud range is never provisioned open to the internet: the whitelist is the runner's /32, and it is required", () => {
  const n = normalizeCloudOptions({ provider: "aws", windows: 1 });
  const cfg = renderConfig({ name: "rtabc", keyName: "rtlab-abc", privateKeyPath: "/k", password: "p", n, whitelist: "45.127.46.224" });
  assert.ok(cfg.includes('ip_whitelist: "45.127.46.224/32"'));
  assert.ok(!cfg.includes("0.0.0.0/0"));
  assert.throws(() => renderConfig({ name: "r", keyName: "k", privateKeyPath: "/k", password: "p", n }), /whitelist/);
  assert.throws(() => renderConfig({ name: "r", keyName: "k", privateKeyPath: "/k", password: "p", n, whitelist: "0.0.0.0/0" }), /whitelist/);
});

test("the gateway flavour of the VPN script forwards to the lab networks behind NAT and leaves the firewall to the security group", () => {
  const s = setupScript({ routes: RANGE_NETWORKS, firewall: false });
  assert.ok(s.includes("ip_forward=1") && s.includes("-s 10.8.0.0/24 -o $PUBIF -j MASQUERADE") && s.includes("FORWARD -i wg0 -j ACCEPT"));
  assert.ok(!s.includes("ufw "), "no ufw on the Splunk server: it would fight Splunk's own ports and the forwarders");
  assert.ok(s.includes("10.0.0.0/16"));
  const vps = setupScript();
  assert.ok(vps.includes("ufw default deny incoming") && !vps.includes("MASQUERADE"), "the VPS flavour is unchanged");
  assert.throws(() => setupScript({ routes: ["10.0.0.0/16; id"] }), /route/);
  assert.throws(() => setupScript({ routes: new Array(9).fill("10.0.0.0/16") }), /up to 8/);
});

test("a cloud peer routes the VPN network and the range's VPC through the tunnel", () => {
  const a = addPeerScript({ name: "jack-1", routes: RANGE_NETWORKS, endpoint: "34.203.80.175:51820" });
  assert.ok(a.includes("AllowedIPs = 10.8.0.0/24, 10.0.0.0/16"));
  assert.ok(a.includes('"34.203.80.175:51820"'));
  assert.equal(VPN.routes, RANGE_NETWORKS);
  assert.throws(() => addPeerScript({ name: "x", routes: ["bad"] }), /route/);
});

test("the apply/vpn result carries the gateway facts and private addresses, never the client private keys", () => {
  const r = mapCloudApplyResult({
    id: "splunk-attack-range-ab12cd", status: "running",
    services: [{ name: "splunk-web", port: 8000, url: "http://10.0.1.12:8000" }],
    instances: [{ name: "ar-splunk-x", state: "running", public_ip: "34.1.1.1", private_ip: "10.0.1.12", type: "t3.2xlarge" }],
    vpn: { gateway: "34.1.1.1", endpoint: "34.1.1.1:51820", server_public_key: "PUB=", address: "10.8.0.1", network: "10.8.0.0/24", port: 51820, routes: ["10.0.0.0/16"], runner_ip: "45.1.1.1", enabled_at: "2026-10-04T13:00:00Z" },
    vpnOnly: true,
    access: { splunk: { url: "http://10.0.1.12:8000", username: "admin", password: "pw" }, windows: [] },
  });
  assert.equal(r.vpn_only, true);
  assert.deepEqual(r.vpn.routes, ["10.0.0.0/16"]);
  assert.equal(r.vpn.endpoint, "34.1.1.1:51820");
  assert.equal(r.instances[0].private_ip, "10.0.1.12");
  assert.ok(JSON.stringify(r).includes("10.0.1.12:8000"));
  const noVpn = mapCloudApplyResult({ id: "splunk-attack-range-ab12cd", status: "running", services: [], access: { password: "pw", splunk: null, windows: [] }, instances: [{ name: "ar-splunk-x", public_ip: "34.1.1.1" }], vpn: null, vpnOnly: false, vpnError: "ssh failed" });
  assert.equal(noVpn.vpn_only, false); assert.equal(noVpn.vpn, undefined); assert.equal(noVpn.vpn_error, "ssh failed");
  assert.deepEqual(noVpn.services, [], "a range without its gateway publishes no endpoint at all");
  assert.ok(noVpn.credentials.labs[0].default_credentials == null, "no address-bearing logins without the VPN");
});

test("security-group lockdown plan: every internet-open rule goes, only the VPN port stays open, the runner keeps provisioning ports", () => {
  const py = `
import json, sys
sys.argv = ["shim"]
import importlib.util
spec = importlib.util.spec_from_file_location("shim", ${JSON.stringify(SHIM)}); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
perms = [
  {"IpProtocol": "tcp", "FromPort": 3389, "ToPort": 3389, "IpRanges": [{"CidrIp": "0.0.0.0/0"}]},
  {"IpProtocol": "tcp", "FromPort": 8000, "ToPort": 8000, "IpRanges": [{"CidrIp": "0.0.0.0/0"}]},
  {"IpProtocol": "tcp", "FromPort": 22, "ToPort": 22, "IpRanges": [{"CidrIp": "0.0.0.0/0"}, {"CidrIp": "45.1.1.1/32"}]},
  {"IpProtocol": "-1", "IpRanges": [{"CidrIp": "10.0.0.0/16"}]},
  {"IpProtocol": "udp", "FromPort": 51820, "ToPort": 51820, "IpRanges": [{"CidrIp": "0.0.0.0/0"}]},
]
rev, auth = m.lockdown_plan(perms, "45.1.1.1", 51820)
print(json.dumps({"rev": rev, "auth": auth, "pub": m.public_ports(perms)}))
`;
  const p = spawnSync("python3", ["-c", py], { encoding: "utf-8" });
  assert.equal(p.status, 0, p.stderr);
  const { rev, auth, pub } = JSON.parse(p.stdout);
  assert.deepEqual(rev.map((r) => `${r.IpProtocol}/${r.FromPort}`).sort(), ["tcp/22", "tcp/3389", "tcp/8000"]);
  assert.ok(rev.every((r) => r.IpRanges[0].CidrIp === "0.0.0.0/0") && !rev.some((r) => r.IpProtocol === "-1"), "VPC-internal rules stay");
  assert.ok(!auth.some((a) => a.IpProtocol === "udp"), "the VPN port is already open: idempotent");
  assert.ok(!auth.some((a) => a.FromPort === 22), "the runner's SSH rule already exists");
  assert.deepEqual(auth.map((a) => a.FromPort).sort(), [5985, 5986, 8089]);
  assert.ok(auth.every((a) => a.IpRanges[0].CidrIp === "45.1.1.1/32"));
  assert.equal(pub.length, 4);
});
