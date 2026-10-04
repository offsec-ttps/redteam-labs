import test from "node:test";
import assert from "node:assert/strict";
import { placement, fitOn, runtimeOf, CLOUD_ONLY_MESSAGE } from "../src/placement.mjs";
import { findEntry } from "../src/catalog/index.mjs";

test("placement per archetype", () => {
  const juice = findEntry("juice-shop"), ar = findEntry("splunk-attack-range"), aws = findEntry("awsgoat"), ms3 = findEntry("metasploitable3-ub1404"), kg = findEntry("kubernetes-goat");
  assert.equal(runtimeOf(juice), "docker"); assert.equal(placement(juice).recommended, "vps"); assert.deepEqual(placement(juice).images, ["bkimminich/juice-shop"]);
  assert.equal(runtimeOf(ar), "vm"); assert.deepEqual(placement(ar).targets, ["aws", "azure", "gcp", "local", "vps"]); assert.equal(placement(ar).presets.length, 20); assert.equal(placement(ar).recommended, "aws");
  assert.equal(runtimeOf(aws), "cloud"); assert.deepEqual(placement(aws).targets, ["aws"]); assert.equal(placement(aws).cloudOnly, true);
  assert.equal(runtimeOf(ms3), "vm"); assert.equal(placement(ms3).recommended, "local"); assert.deepEqual(placement(ms3).vps.needs, ["virtualization"]);
  assert.equal(runtimeOf(kg), "guided");   // until the k3d runtime lands
});

test("fit on a VPS uses the measured size and says when only the cloud will do", () => {
  const juice = findEntry("juice-shop"), ar = findEntry("splunk-attack-range");
  const small = { cpus: 1, memoryMB: 1971, memoryAvailableMB: 1271, diskFreeGB: 27, virtualization: "none" };
  assert.equal(fitOn([juice], "vps", small).ok, true);
  const two = fitOn([juice, juice, juice], "vps", small);
  assert.equal(two.ok, false); assert.match(two.blocked, /need about 3 GB RAM/); assert.equal(two.cloudOnly, false);
  const big = fitOn([ar], "vps", small);
  assert.equal(big.ok, false); assert.equal(big.cloudOnly, true); assert.match(big.blocked, /nested virtualization/); assert.match(big.blocked, new RegExp(CLOUD_ONLY_MESSAGE.slice(0, 30)));
  const kvmSmall = fitOn([ar], "vps", { ...small, virtualization: "kvm" });
  assert.equal(kvmSmall.ok, false); assert.match(kvmSmall.blocked, /8 GB RAM/); assert.equal(kvmSmall.cloudOnly, true);
  assert.equal(fitOn([ar], "vps", { cpus: 8, memoryMB: 16384, memoryAvailableMB: 15000, diskFreeGB: 200, virtualization: "kvm" }).ok, true);
  assert.equal(fitOn([juice], "vps", {}).warning, "size unknown until the connection check runs");
  const low = fitOn([juice], "vps", { ...small, memoryAvailableMB: 900 });
  assert.equal(low.ok, true); assert.match(low.warning, /only 0.9 GB free right now/);
  const awsOnVps = fitOn([findEntry("awsgoat")], "vps", small);
  assert.equal(awsOnVps.ok, false); assert.equal(awsOnVps.cloudOnly, true);
});
