// Stand-in for bin/rtlab.mjs: same contract (one JSON document on stdout, NDJSON events on stderr).
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
if (process.env.FAKE_CLI_LOG) appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify(args) + "\n");
const ev = (msg, level = "info") => process.stderr.write(JSON.stringify({ t: new Date().toISOString(), level, msg }) + "\n");
const cmd = args[0];
if (cmd === "deploy") {
  if (process.env.FAKE_CLI_MODE === "fail") { ev("vagrant up exploded", "error"); console.log(JSON.stringify({ ok: false, error: "vagrant up exploded: not enough memory" })); process.exit(1); }
  ev("vagrant up: Splunk server booting"); ev("provision: net user Administrator RtQsecretsecret7!");
  console.log(JSON.stringify({ ok: true, id: `${args[1]}-ab12cd`, name: "Splunk Attack Range", engine: "attack-range", bindIp: "10.0.1.1", status: "running",
    services: [{ name: "splunk-web", port: 8000, container: 8000, url: "http://10.0.1.1:8000" }, { name: "windows-0-rdp", port: 5389, container: 3389, url: "rdp://10.0.1.1:5389" }],
    access: { splunk: { url: "http://10.0.1.1:8000", username: "admin", password: "RtQsecretsecret7!" }, windows: [{ host: "10.0.1.1", port: 5389, username: "Administrator", password: "RtQsecretsecret7!", hostname: "ar-win-0" }], note: "Hosts talk on 10.0.1.0/24" } }));
  process.exit(0);
}
if (cmd === "status") { console.log(process.env.FAKE_STATUS || "[]"); process.exit(0); }
if (cmd === "reap") { console.log(JSON.stringify({ reaped: 0 })); process.exit(0); }
if (process.env.FAKE_CLI_MODE === "fail") { ev("vagrant up exploded", "error"); console.log(JSON.stringify({ ok: false, error: "vagrant up exploded: not enough memory" })); process.exit(1); }
if (cmd === "spinner" && args[1] === "deploy") {
  ev("vagrant up: booting");
  ev("provision: echo 'operator:SuperSecretPw99' | chpasswd");          // must be redacted before it leaves the machine
  ev("starting juice-shop inside the VM");
  console.log(JSON.stringify({
    ok: true, id: "spinner-abc123", privateIp: "10.66.7.10", spinnerNet: 7, status: "running",
    services: [{ lab: "juice-shop", name: "juice-shop", port: 3000, url: "http://10.66.7.10:3000" }],
    access: { host: "10.66.7.10", ssh: "ssh operator@10.66.7.10", username: "operator", password: "SuperSecretPw99" },
    labs: [{ labId: "juice-shop", name: "OWASP Juice Shop", defaultCreds: null, services: [{ name: "juice-shop", port: 3000, url: "http://10.66.7.10:3000" }] }],
  }));
  process.exit(0);
}
if (cmd === "cloud" && args[1] === "vpn-peer") {
  // The client config holds the student's private key: it must travel only in the result's `credentials`.
  console.log(JSON.stringify({ ok: true, id: args[2], name: args[3], address: "10.8.0.2", config: "[Interface]\nPrivateKey = PEERPRIVATEKEY=\nAddress = 10.8.0.2/32\n\n[Peer]\nPublicKey = GW=\nAllowedIPs = 10.8.0.0/24, 10.0.0.0/16\nEndpoint = 34.1.1.1:51820\n" }));
  process.exit(0);
}
ev(`${cmd} ${args[1]}`);
console.log(JSON.stringify({ ok: true, id: args[1], action: cmd }));
