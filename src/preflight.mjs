/**
 * Host pre-flight: everything a person needs to know before deploying, gathered in one place.
 * Read-only. The web platform's worker publishes this so the wizard can show real numbers.
 */

import { readFileSync } from "node:fs";
import os from "node:os";
import { has, capture } from "./run.mjs";
import { VAGRANT_HOME, RT_HOME } from "./state.mjs";
import { locations, diskInfo } from "./storage.mjs";
import { BASE_BOXES } from "./engines/spinner.mjs";

function memInfo() {
  try {
    const t = readFileSync("/proc/meminfo", "utf-8");
    const kb = (k) => Number(t.match(new RegExp(`^${k}:\\s+(\\d+)`, "m"))?.[1] || 0);
    return { totalMB: Math.round(kb("MemTotal") / 1024), availableMB: Math.round(kb("MemAvailable") / 1024) };
  } catch {
    return { totalMB: Math.round(os.totalmem() / 1048576), availableMB: Math.round(os.freemem() / 1048576) };
  }
}

export async function hostPreflight() {
  const [vagrant, vbox, docker, git, terraform, awsCli, azCli, gcloudCli] = await Promise.all([
    capture("vagrant", ["--version"]), capture("VBoxManage", ["--version"]),
    capture("docker", ["--version"]), capture("git", ["--version"]),
    capture("terraform", ["version"]), capture("aws", ["--version"]), capture("az", ["version", "-o", "tsv"]), capture("gcloud", ["--version"]),
  ]);
  const running = vbox ? (await capture("VBoxManage", ["list", "runningvms"], 8000))?.split("\n").filter(Boolean).length ?? 0 : null;

  const boxList = (await capture("vagrant", ["box", "list"], 15_000, { env: { VAGRANT_HOME } })) || "";
  const boxes = {};
  for (const [name, b] of Object.entries(BASE_BOXES)) {
    boxes[name] = {
      stockCached: boxList.split("\n").some((l) => l.startsWith(`${b.box} `)),
      baked: boxList.split("\n").some((l) => l.startsWith(`${b.baked} `)),
    };
  }

  const storage = [];
  for (const l of locations()) {
    const d = await diskInfo(l.path);
    storage.push({ id: l.id, label: l.label, path: l.path, isDefault: l.isDefault, usable: l.usable, reason: l.reason || null, ...d });
  }

  const dockerRoot = docker ? await capture("docker", ["info", "--format", "{{.DockerRootDir}}"], 8000) : null;
  return {
    at: new Date().toISOString(),
    cpus: os.cpus().length,
    memory: memInfo(),
    tools: { vagrant: vagrant?.split("\n")[0] || null, virtualbox: vbox || null, docker: docker?.split("\n")[0] || null,
      git: git?.split("\n")[0] || null, dockerCompose: await has("docker", ["compose", "version"]),
      // cloud labs are planned with Terraform; the provider CLIs confirm which account a key belongs to
      terraform: terraform?.split("\n")[0] || null, aws: awsCli?.split("\n")[0]?.split(" ")[0] || null,
      az: azCli ? "az" : null, gcloud: gcloudCli?.split("\n")[0] || null },
    runningVms: running,
    boxes,
    boxCache: { path: VAGRANT_HOME, ...(await diskInfo(VAGRANT_HOME)) },
    dockerRoot: dockerRoot ? { path: dockerRoot, ...(await diskInfo(dockerRoot)) } : null,
    storage,
    labStore: RT_HOME,
  };
}
