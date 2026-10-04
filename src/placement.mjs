// Placement: where a catalog entry can run, what it needs, and which target to recommend. One rule set for every
// archetype, so the CLI, the control plane and the docs say the same thing.
//
//   runtime      docker | vm | k8s | cloud | guided
//   targets      the targets this platform can deploy it to today: vps | local | aws | azure | gcp
//   recommended  the target to offer first
//   requirements cpus / memoryMB / diskGB the target must have free (sum of the labs for a multi-lab deployment)
//   vps          { ok, needs: ["virtualization"] } what a VPS must provide beyond size
//
// The order of preference is the product rule: a single VPS whenever the lab can run there, local when it needs the
// runner's own machine (VirtualBox), the cloud only when the lab builds cloud resources or nothing smaller fits.

import { presetCatalog } from "./engines/arcloud-presets.mjs";
export const CLOUD = ["aws", "azure", "gcp"];
const DEFAULT_REQ = { docker: { cpus: 1, memoryMB: 512, diskGB: 1 }, vm: { cpus: 2, memoryMB: 2048, diskGB: 20 }, k8s: { cpus: 2, memoryMB: 4096, diskGB: 20 }, cloud: { cpus: 0, memoryMB: 0, diskGB: 1 }, guided: { cpus: 0, memoryMB: 0, diskGB: 0 } };

/** The runtime an entry needs. */
export function runtimeOf(entry) {
  const avail = !!entry?.deploy?.available;
  if (!avail) return "guided";
  if (entry.engine === "docker") return "docker";
  if (entry.engine === "attack-range" || entry.engine === "vm") return "vm";
  if (entry.engine === "k8s") return "k8s";
  if (entry.engine === "terraform") return "cloud";
  return "guided";
}

export function requirementsOf(entry) {
  const rt = runtimeOf(entry);
  const r = entry?.resources || {};
  const d = DEFAULT_REQ[rt];
  return { cpus: Number(r.cpus) || d.cpus, memoryMB: Number(r.memoryMB) || d.memoryMB, diskGB: Number(r.diskGB) || d.diskGB };
}

/** Where the entry can run today, in order of preference, plus the human reason per target. */
export function placement(entry) {
  const rt = runtimeOf(entry);
  const req = requirementsOf(entry);
  const base = { runtime: rt, requirements: req, cloudProviders: [], images: imagesOf(entry) };
  switch (rt) {
    case "docker":
      return { ...base, targets: ["vps", "local"], recommended: "vps", vps: { ok: true, needs: [] },
        note: "Container lab: runs on a VPS with Docker (recommended) or in a local VM on the runner's machine." };
    case "k8s":
      return { ...base, targets: ["vps", "local"], recommended: "vps", vps: { ok: true, needs: [] },
        note: "Kubernetes lab: a small k3d cluster is created inside Docker on the VPS (recommended) or in a local VM." };
    case "vm": {
      const cloud = entry.engine === "attack-range" ? ["aws", "azure", "gcp"] : [];   // the range's own cloud modes (AWS verified; Azure/GCP plumbing only)
      return { ...base, cloudProviders: cloud, targets: [...(cloud.length ? cloud : []), "local", "vps"],
        recommended: cloud[0] || "local", vps: { ok: true, needs: ["virtualization"] }, presets: cloud.length ? presetCatalog() : undefined,
        note: entry.engine === "attack-range"
          ? "Full environment (several VMs). Best in your own cloud account (AWS, Azure or GCP) from a preset or a custom shape; locally it needs VirtualBox; on a VPS it needs nested virtualization (KVM) and the runner installed on that server."
          : "Full VM. Locally it needs VirtualBox; on a VPS it needs nested virtualization (KVM) and the runner installed on that server." };
    }
    case "cloud": {
      const p = entry.provider && CLOUD.includes(entry.provider) ? entry.provider : "aws";
      return { ...base, cloudProviders: [p], targets: [p], recommended: p, vps: { ok: false, needs: [] }, cloudOnly: true,
        note: `Cloud lab: it builds resources in your ${p.toUpperCase()} account, so it needs your cloud credentials.` };
    }
    default:
      return { ...base, targets: [], recommended: null, vps: { ok: false, needs: [] }, note: "Guided only: follow the steps on the lab page." };
  }
}

/** Container images a docker entry pulls, when the catalog knows them (image sources); null when they come from a repo's compose file. */
export function imagesOf(entry) {
  const s = entry?.source;
  if (!s) return null;
  if (s.kind === "image" && s.image) return [s.image];
  if (s.kind === "compose" && Array.isArray(s.images)) return s.images;
  return null;
}

export const CLOUD_ONLY_MESSAGE = "This lab can only be deployed in a cloud environment due to resource requirements. Please provide your cloud credentials to proceed.";

/**
 * Does a target with these facts hold these entries? facts: { memoryMB, memoryAvailableMB, diskFreeGB, cpus, virtualization }.
 * Returns { ok, blocked, warning, cloudOnly } with sentences a student can act on.
 */
export function fitOn(entries, target, facts = {}) {
  const list = Array.isArray(entries) ? entries : [entries];
  const need = list.reduce((a, e) => { const r = requirementsOf(e); return { cpus: Math.max(a.cpus, r.cpus), memoryMB: a.memoryMB + r.memoryMB, diskGB: a.diskGB + r.diskGB }; }, { cpus: 0, memoryMB: 0, diskGB: 0 });
  const pls = list.map(placement);
  const notHere = list.filter((e, i) => !pls[i].targets.includes(target));
  if (notHere.length) {
    const p = pls[list.indexOf(notHere[0])];
    const cloudOnly = p.cloudOnly || (p.cloudProviders.length > 0 && !["local", "vps"].includes(target) === false && false);
    return { ok: false, blocked: p.cloudOnly ? `${notHere[0].name} builds cloud resources; pick its ${p.cloudProviders[0].toUpperCase()} target and connect your account.` : `${notHere[0].name} cannot run on ${target}: ${p.note}`, cloudOnly: !!p.cloudOnly, need };
  }
  if (target === "vps") {
    const needsVirt = pls.some((p) => p.vps.needs.includes("virtualization"));
    if (needsVirt && facts.virtualization != null && facts.virtualization === "none")
      return { ok: false, blocked: `${list.find((e, i) => pls[i].vps.needs.includes("virtualization")).name} needs nested virtualization (KVM) on the server, and this server has none. ${CLOUD_ONLY_MESSAGE}`, cloudOnly: true, need };
    if (facts.memoryMB == null || facts.diskFreeGB == null) return { ok: true, warning: "size unknown until the connection check runs", need };
    const gb = (mb) => Math.round(mb / 1024 * 10) / 10;
    if (need.memoryMB > facts.memoryMB || need.diskGB > facts.diskFreeGB) {
      const hasCloud = pls.some((p) => p.cloudProviders.length);
      return { ok: false, cloudOnly: hasCloud,
        blocked: `These labs need about ${gb(need.memoryMB)} GB RAM and ${need.diskGB} GB disk; the server has ${gb(facts.memoryMB)} GB RAM and ${facts.diskFreeGB} GB free. ${hasCloud ? CLOUD_ONLY_MESSAGE : "Use a larger server, or a cloud account for a bigger lab."}`, need };
    }
    if (facts.memoryAvailableMB != null && need.memoryMB > facts.memoryAvailableMB)
      return { ok: true, warning: `the server has only ${gb(facts.memoryAvailableMB)} GB free right now; it may run slowly`, need };
    return { ok: true, need };
  }
  return { ok: true, need };
}
