import test from "node:test";
import assert from "node:assert/strict";
import { vboxNamesFor, looksLikeOurs } from "../src/orphans.mjs";
import { unitFile } from "../src/service.mjs";

test("orphan matching uses rtlab's exact naming only", () => {
  const vms = ["spinner-ab12cd", "splunk-attack-range-znvmyp-splunk", "splunk-attack-range-znvmyp-win-0", "splunk-attack-range-znvmyp-kali", "ubuntu-dev", "spinner-ab12cd-backup", "metasploitable3-x9y8z7"];
  assert.deepEqual(vboxNamesFor("spinner-ab12cd", vms), ["spinner-ab12cd"]);
  assert.deepEqual(vboxNamesFor("splunk-attack-range-znvmyp", vms), ["splunk-attack-range-znvmyp-splunk", "splunk-attack-range-znvmyp-win-0", "splunk-attack-range-znvmyp-kali"]);
  assert.deepEqual(vboxNamesFor("splunk-attack-range-zzzzzz", vms), []);
  assert.equal(looksLikeOurs("ubuntu-dev", "vm"), false);
  // Another project's VMs on the same machine: a 6-char token is not enough, the prefix must be one rtlab generates.
  assert.equal(looksLikeOurs("lab-ob36ng-splunk-server", "vm"), false);
  assert.equal(looksLikeOurs("lab-y0zof7-splunk-server", "vm"), false);
  assert.equal(looksLikeOurs("lab-ob36ng", "vm"), false);
  assert.equal(looksLikeOurs("metasploitable3-ub1404-abc123", "vm"), true);
  assert.equal(looksLikeOurs("rtlab-lab-ob36ng", "project"), false);
  assert.equal(looksLikeOurs("spinner-ab12cd", "vm"), true);
  assert.equal(looksLikeOurs("splunk-attack-range-znvmyp-win-1", "vm"), true);
  assert.equal(looksLikeOurs("rtlab-remote-db1h5p-juice-shop", "project"), true);
  assert.equal(looksLikeOurs("rtlab-juice-shop-ab12cd", "project"), true);
  assert.equal(looksLikeOurs("myapp", "project"), false);
});

test("systemd unit restarts the runner and waits for the network", () => {
  const u = unitFile({ node: "/usr/bin/node", cli: "/opt/rtlab/bin/rtlab.mjs", home: "/home/lab" });
  assert.match(u, /ExecStart=\/usr\/bin\/node \/opt\/rtlab\/bin\/rtlab.mjs agent run/);
  assert.match(u, /Restart=always/);
  assert.match(u, /After=network-online.target/);
  assert.match(u, /WantedBy=default.target/);
});
