import assert from "node:assert/strict";
import { test } from "node:test";
import { setupScript, addPeerScript, removePeerScript, DEFAULTS } from "../src/remote-vpn.mjs";

test("vpn setup script: firewall admits only SSH and the VPN, Docker drops public ingress, labs bind to the VPN address", () => {
  const s = setupScript({ sshPort: 2222 });
  assert.ok(s.includes("ufw default deny incoming") && s.includes("ufw allow 2222/tcp") && s.includes(`ufw allow ${DEFAULTS.port}/udp`) && s.includes("ufw allow in on wg0"));
  assert.ok(s.includes("DOCKER-USER -i $PUBIF -m conntrack --ctstate NEW -j DROP"));
  assert.ok(s.includes(`Address = ${DEFAULTS.address}/24`) && s.includes("wg genkey") && !s.includes("PrivateKey = -----"));
  assert.ok(s.includes("peers/*.peer"), "re-running keeps existing peers");
});

test("vpn peers: names are restricted, the client gets AllowedIPs for the lab network and a keepalive, the server keeps only the public key", () => {
  const a = addPeerScript({ name: "alice-1" });
  assert.ok(a.includes("AllowedIPs = 10.8.0.0/24") && a.includes("PersistentKeepalive = 25") && a.includes("Endpoint = %s:51820"));
  assert.ok(a.includes("PublicKey = %s\\nPresharedKey = %s\\nAllowedIPs = 10.8.0.%s/32") && !a.includes("PrivateKey = $priv\n"), "only pub/psk are written to the server's peer file");
  assert.ok(a.includes("already exists"));
  for (const bad of ["Alice", "a b", "../x", "", "x".repeat(40)]) assert.throws(() => addPeerScript({ name: bad }), /peer name/);
  assert.throws(() => removePeerScript({ name: "../etc" }), /peer name/);
  assert.ok(removePeerScript({ name: "alice-1" }).includes("rm -f /etc/wireguard/peers/alice-1.peer"));
});

test("vpn scripts: values that reach the shell are allow-listed (no injection through endpoint, address, network or port)", () => {
  for (const endpoint of ['1.2.3.4"; id #', "$(id)", "a b", "x`id`"]) assert.throws(() => addPeerScript({ name: "ok", endpoint }), /endpoint/);
  assert.ok(addPeerScript({ name: "ok", endpoint: "vpn.example.net:51820" }).includes('"vpn.example.net:51820"'));
  assert.throws(() => setupScript({ address: "10.8.0.1; rm -rf /" }), /address/);
  assert.throws(() => setupScript({ network: "10.8.0.0/24 || true" }), /network/);
  assert.throws(() => setupScript({ port: "51820; reboot" }), /port/);
  assert.throws(() => setupScript({ iface: "wg0 && id" }), /interface/);
});

test("remote deploy: labs that cannot fit the server are refused with the numbers", async () => {
  const { fit } = await import("../src/engines/remote.mjs");
  const small = { cpus: 1, memoryMB: 1971, memoryAvailableMB: 1200, diskFreeGB: 28 };
  assert.ok(!fit([{ name: "Juice Shop", resources: { memoryMB: 1024, diskGB: 2 } }], small).blocked);
  assert.match(fit([{ name: "crAPI", resources: { memoryMB: 4096, diskGB: 6 } }], small).blocked, /needs about 4 GB RAM; this server has 2 GB/);
  assert.match(fit([{ name: "A", resources: { memoryMB: 512, diskGB: 20 } }, { name: "B", resources: { memoryMB: 512, diskGB: 20 } }], small).blocked, /40 GB of disk; this server has 28 GB free/);
  assert.match(fit([{ name: "WebGoat", resources: { memoryMB: 1536, diskGB: 2 } }], small).warning, /may run slowly/);
  assert.deepEqual(fit([{ name: "x", resources: { memoryMB: 99999 } }], {}), {}, "no size known: no verdict");
});

test("reset script reverts only what the markers say rtlab installed, and refuses Docker removal next to foreign containers", async () => {
  const { resetScript, resetPlan } = await import("../src/remote-vpn.mjs");
  const keep = resetScript({ sshPort: 2222 });
  assert.match(keep, /if \[ -e \/etc\/rtlab\/vpn.installed \]/);
  assert.match(keep, /ufw allow 2222\/tcp/);
  assert.match(keep, /KEPT docker \(not asked/);
  assert.doesNotMatch(keep, /apt-get purge -y -qq docker-ce/);
  const full = resetScript({ removeDocker: true });
  assert.match(full, /grep -v '\^rtlab-'/);
  assert.match(full, /apt-get purge -y -qq docker-ce/);
  assert.throws(() => resetScript({ iface: "wg0; rm -rf /" }), /interface name/);
  assert.deepEqual(resetPlan({}, {}), []);
  assert.deepEqual(resetPlan({ vpn: "x", docker: "y" }, {}).map((p) => [p.what, !!p.kept]), [["vpn", false], ["docker", true]]);
  assert.deepEqual(resetPlan({ vpn: "x", docker: "y" }, { removeDocker: true }).map((p) => [p.what, !!p.kept]), [["vpn", false], ["docker", false]]);
});
