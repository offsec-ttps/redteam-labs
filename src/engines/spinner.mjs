/**
 * Spinner engine: ONE VM per deployment, with the chosen labs running as Docker
 * containers inside it.
 *
 *   host ── vboxnetN (10.66.N.1) ── spinner VM (10.66.N.10, Docker) ── lab containers
 *
 * Every deployment gets its own host-only /24, so two deployments cannot see each
 * other at L2, and lab ports are published only on the VM's host-only address.
 * The VM's NAT adapter provides egress for image pulls; with `noEgress` that path is
 * closed for container traffic once the labs are up.
 *
 * Reuses the docker engine's spec builder (so port rewriting/isolation stays in one
 * place) and the vagrant engine's Vagrantfile renderer.
 */

import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { has, run, capture, waitForPort } from "../run.mjs";
import { VAGRANT_HOME, reserveSpinnerNet, remove as removeRow } from "../state.mjs";
import { assertSafePath, diskInfo, resolve as resolveStorage } from "../storage.mjs";
import { renderVagrantfile } from "./vagrant.mjs";
import { buildSpec } from "./docker.mjs";

const vagrantEnv = { VAGRANT_HOME };

export const BASE_BOXES = {
  ubuntu: { box: "bento/ubuntu-22.04", baked: "rtlab/spinner-ubuntu" },
  kali: { box: "kalilinux/rolling", baked: "rtlab/spinner-kali" },
};
export const OS_CHOICES = Object.keys(BASE_BOXES);

/**
 * What a spinner deployment needs. Shared by deploy and by the pre-flight, and mirrored by the
 * web platform's own estimate (a backend test compares the two so they cannot drift).
 * Disk is an estimate of the VM's footprint on its storage: OS + Docker + lab images.
 */
export const BASE_DISK_GB = 6;
export function sizing(entries, { memoryMB, cpus } = {}) {
  const memWanted = 1024 + entries.reduce((n, e) => n + (e.resources?.memoryMB || 512), 0);
  return {
    memoryMB: Math.min(memoryMB || Math.max(2048, memWanted), 16384),
    cpus: cpus || Math.max(2, Math.min(4, entries.reduce((n, e) => n + (e.resources?.cpus || 1), 0))),
    diskGB: BASE_DISK_GB + entries.reduce((n, e) => n + (e.resources?.diskGB || 2), 0),
  };
}

const VM_HOST_OCTET = 10;
export const vmIpFor = (net) => `10.66.${net}.${VM_HOST_OCTET}`;
export const hostIpFor = (net) => `10.66.${net}.1`;
const projectFor = (id, labId) => `rtlab-${id}-${labId}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

export async function preflight() {
  if (!(await has("vagrant"))) throw new Error("`vagrant` not found — install Vagrant, then retry.");
  if (!(await has("VBoxManage"))) throw new Error("`VBoxManage` not found — install VirtualBox, then retry.");
}

/** Use the pre-baked box (Docker already installed) when one exists locally. */
async function pickBox(os) {
  const b = BASE_BOXES[os];
  if (!b) throw new Error(`Unknown base OS "${os}" — choose one of: ${OS_CHOICES.join(", ")}`);
  const boxes = (await capture("vagrant", ["box", "list"], 15_000, { env: vagrantEnv })) || "";
  const baked = boxes.split("\n").some((l) => l.startsWith(`${b.baked} `));
  return { box: baked ? b.baked : b.box, baked };
}

/** Provisioning script: Docker, an `operator` login, optional Kali tool bundle. */
export function renderProvision({ os, operatorPassword, kaliTools }) {
  const docker = os === "kali"
    ? "apt-get install -y docker.io docker-compose"
    : "curl -fsSL https://get.docker.com | sh";
  if (kaliTools && !/^kali-tools-[a-z0-9-]+$/.test(kaliTools)) throw new Error(`invalid Kali tool bundle "${kaliTools}"`);
  return [
    "set -eu",
    "export DEBIAN_FRONTEND=noninteractive",
    "if ! command -v docker >/dev/null 2>&1; then",
    "  apt-get update -y",
    `  ${docker}`,
    "fi",
    "systemctl enable --now docker",
    "id operator >/dev/null 2>&1 || useradd -m -N -s /bin/bash -G sudo,docker operator",   // -N: the distro already has an `operator` group
    `echo 'operator:${operatorPassword}' | chpasswd`,
    "sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config",
    "systemctl restart ssh || systemctl restart sshd || true",
    ...(kaliTools ? [`apt-get install -y ${kaliTools}`] : []),
  ].join("\n");
}

const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
const ssh = (dir, cmd, timeout = 300_000, onLog) =>
  run("vagrant", ["ssh", "-c", cmd], { cwd: dir, timeout, env: vagrantEnv, onLog });

/**
 * entries: catalog entries (docker engine, deployable). Returns a plain result.
 * opts: { id, os, cpus?, memoryMB?, noEgress, dryRun, kaliTools?, onLog }
 */
export async function deploy(entries, opts) {
  const { id, os = "ubuntu", noEgress = false, dryRun = false, kaliTools, onLog, labEnv = null } = opts;
  if (!entries.length) throw new Error("pick at least one lab");
  for (const e of entries) {
    if (e.engine !== "docker" || !e.deploy?.available) throw new Error(`"${e.id}" cannot run inside a spinner VM (needs an auto-deployable container lab).`);
  }
  if (!dryRun) await preflight();

  const { memoryMB, cpus, diskGB } = sizing(entries, { memoryMB: opts.memoryMB, cpus: opts.cpus });
  const storage = opts.storage || resolveStorage("default");
  const dir = assertSafePath(path.join(storage.path, "labs", id));
  const vmFolder = assertSafePath(path.join(storage.path, "vms"));
  const vmName = id;
  const operatorPassword = randomBytes(12).toString("base64url");
  if (!dryRun && !opts.allowLowResources) {
    const free = (await diskInfo(storage.path)).freeGB;
    const need = diskGB + 2;                                   // 2 GB headroom for logs/swap
    if (free !== null && free < need) {
      throw new Error(`storage "${storage.id}" has ${free} GB free but this deployment needs about ${need} GB. `
        + `Pick another storage (rtlab storage list) or pass --allow-low-resources to try anyway.`);
    }
  }

  // Dry runs never reserve anything: use net 1 purely to render the plan.
  const net = dryRun ? 1 : await reserveSpinnerNet(id);
  const vmIp = vmIpFor(net);
  const { box, baked } = dryRun ? { box: BASE_BOXES[os]?.box, baked: false } : await pickBox(os);
  const provision = renderProvision({ os, operatorPassword, kaliTools });

  const extraLines = [
    `  config.vm.synced_folder ${JSON.stringify(dir)}, ${JSON.stringify(dir)}`,
    '  config.vm.provision "shell", inline: <<~SCRIPT',
    ...provision.split("\n").map((l) => `    ${l}`),
    "  SCRIPT",
  ];
  // The box is imported into VirtualBox's *global* default machine folder, which other tools
  // may point anywhere. Move the (still powered-off) VM onto the chosen storage before first
  // boot, so the disk - which grows as Docker images are pulled - never depends on that setting.
  const providerLines = [`vb.customize ["movevm", :id, "--type", "basic", "--folder", ${JSON.stringify(vmFolder)}]`];
  const vf = renderVagrantfile({
    box, hostname: `spinner-${net}`, vmName, cpus, memoryMB, privateIp: vmIp, extraLines, providerLines,
  }).replace(operatorPassword, "<generated>");   // never echo the secret in a dry-run plan

  if (dryRun) {
    return { dryRun: true, dir, vmName, os, box, privateIp: vmIp, cpus, memoryMB, diskGB, vagrantfile: vf,
      storage: { id: storage.id, label: storage.label }, labs: entries.map((e) => e.id), noEgress };
  }

  try {
    await mkdir(dir, { recursive: true });
    // `movevm` needs its destination to exist. `storage add` creates it for extra locations, but the
    // built-in default location (and any location whose folder was cleaned up) may not have one.
    await mkdir(vmFolder, { recursive: true });
    await writeFile(path.join(dir, "Vagrantfile"),
      renderVagrantfile({ box, hostname: `spinner-${net}`, vmName, cpus, memoryMB, privateIp: vmIp, extraLines, providerLines }),
      { encoding: "utf-8", mode: 0o600 });   // holds the operator password

    onLog?.(`vagrant up — ${baked ? "baked" : "stock"} ${os} box "${box}"${baked ? "" : " (first use downloads several GB; run `rtlab spinner bake` to speed this up)"}…`);
    await run("vagrant", ["up", "--provider", "virtualbox"], { cwd: dir, timeout: 3_600_000, env: vagrantEnv, onLog });

    // The VM now lives on its storage. Vagrant re-runs pre-boot customizations on EVERY boot, and
    // VirtualBox refuses to move a VM onto its own files - so stop/start would fail. Drop the move.
    await writeFile(path.join(dir, "Vagrantfile"),
      renderVagrantfile({ box, hostname: `spinner-${net}`, vmName, cpus, memoryMB, privateIp: vmIp, extraLines }),
      { encoding: "utf-8", mode: 0o600 });

    // Ports are allocated against a fresh VM, so the host's port scan is irrelevant.
    const used = new Set();
    const alloc = async (_ip, wanted) => { let p = wanted; while (used.has(p)) p++; used.add(p); return p; };

    const labs = [];
    for (const entry of entries) {
      const labDir = path.join(dir, entry.id);
      await mkdir(labDir, { recursive: true });
      const { spec, cwd, exposed } = await buildSpec(entry, { dir: labDir, bindIp: vmIp, noEgress: false, onLog, alloc, env: labEnv?.[entry.id] || null });
      const file = path.join(labDir, "rtlab-compose.yml");
      await writeFile(file, JSON.stringify(spec, null, 2), { encoding: "utf-8", mode: 0o600 });   // may hold an API key
      const project = projectFor(id, entry.id);
      onLog?.(`starting ${entry.name} inside the VM…`);
      await ssh(dir, `cd ${q(cwd)} && sudo docker compose -f ${q(file)} -p ${q(project)} up -d`, 1_800_000, onLog);
      labs.push({
        labId: entry.id, name: entry.name, file, project, cwd,
        services: exposed.map((e) => ({ ...e, url: `${entry.services?.[0]?.protocol === "https" ? "https" : "http"}://${vmIp}:${e.port}` })),
        defaultCreds: entry.defaultCreds || null,
      });
    }

    if (noEgress) {
      onLog?.("closing container egress (images are already pulled)…");
      await ssh(dir, 'IF=$(ip route show default | awk \'{print $5; exit}\'); sudo iptables -I DOCKER-USER -o "$IF" -j DROP', 60_000, onLog);
    }

    const services = labs.flatMap((l) => l.services.map((s) => ({ ...s, lab: l.labId })));
    let ready = true;
    if (services[0]) ready = await waitForPort(vmIp, services[0].port, { timeout: 120_000, interval: 3000, onLog });
    return {
      dir, vmName, os, privateIp: vmIp, spinnerNet: net, cpus, memoryMB, diskGB, noEgress,
      storageId: storage.id, vmDir: path.join(vmFolder, vmName),
      labs, services, ready, status: ready ? "running" : "starting",
      access: { host: vmIp, ssh: `ssh operator@${vmIp}`, username: "operator", password: operatorPassword },
    };
  } catch (e) {
    await destroy({ dir, vmName, spinnerNet: net, vmDir: path.join(vmFolder, vmName) }, { onLog }).catch(() => {});
    await removeRow(id).catch(() => {});
    throw e;
  }
}

export async function start(dep, { onLog } = {}) {
  await run("vagrant", ["up", "--provider", "virtualbox"], { cwd: dep.dir, timeout: 1_800_000, env: vagrantEnv, onLog });
}
export async function stop(dep, { onLog } = {}) {
  await run("vagrant", ["halt"], { cwd: dep.dir, timeout: 600_000, env: vagrantEnv, onLog });
}

/** Remove the per-deployment host-only interface once nothing else uses it. */
async function dropHostOnlyIf(net) {
  const out = await capture("VBoxManage", ["list", "hostonlyifs"], 10_000);
  if (!out) return;
  for (const block of out.split(/\n\s*\n/)) {
    if (new RegExp(`^IPAddress:\\s+${hostIpFor(net).replace(/\./g, "\\.")}\\s*$`, "m").test(block)) {
      const name = block.match(/^Name:\s+(\S+)/m)?.[1];
      if (name) await capture("VBoxManage", ["hostonlyif", "remove", name], 15_000);   // fails harmlessly if in use
    }
  }
}

export async function destroy(dep, { onLog } = {}) {
  if (dep.dir && existsSync(path.join(dep.dir, "Vagrantfile"))) {
    await run("vagrant", ["destroy", "-f"], { cwd: dep.dir, timeout: 900_000, env: vagrantEnv, onLog })
      .catch((e) => onLog?.(`destroy warning: ${e.message}`));
  }
  if (dep.dir) await rm(dep.dir, { recursive: true, force: true }).catch(() => {});
  // vagrant destroy normally deletes the VM's files; sweep a leftover folder, but only one that
  // is exactly <something>/vms/<this vm's name> so a bad state row can never delete anything else.
  if (dep.vmDir && path.basename(dep.vmDir) === dep.vmName && path.basename(path.dirname(dep.vmDir)) === "vms") {
    await rm(dep.vmDir, { recursive: true, force: true }).catch(() => {});
  }
  if (dep.spinnerNet) await dropHostOnlyIf(dep.spinnerNet).catch(() => {});
}
export async function logs(dep) {
  const first = dep.labs?.[0];
  const cmd = first
    ? `sudo docker compose -f ${q(first.file)} -p ${q(first.project)} logs --tail 200`
    : "sudo journalctl -n 200 --no-pager";
  return { cmd: "vagrant", args: ["ssh", "-c", cmd], cwd: dep.dir };
}

/** Power state straight from VirtualBox — never trusted from our own state file. */
export async function status(dep) {
  const out = await capture("VBoxManage", ["list", "runningvms"], 8000);
  const running = out ? out.includes(`"${dep.vmName}"`) : false;
  return { status: running ? "running" : "stopped", containers: [] };
}

/** Build a reusable base box with Docker preinstalled (`rtlab spinner bake`). */
export async function bake(os, { onLog } = {}) {
  await preflight();
  const b = BASE_BOXES[os];
  if (!b) throw new Error(`Unknown base OS "${os}" — choose one of: ${OS_CHOICES.join(", ")}`);
  const dir = path.join(resolveStorage("default").path, "labs", `_bake-${os}`);
  await mkdir(dir, { recursive: true });
  const provision = renderProvision({ os, operatorPassword: randomBytes(12).toString("base64url") });
  const vf = renderVagrantfile({
    box: b.box, hostname: `bake-${os}`, vmName: `rtlab-bake-${os}`, cpus: 2, memoryMB: 2048, privateIp: null,
    extraLines: ['  config.vm.provision "shell", inline: <<~SCRIPT', ...provision.split("\n").map((l) => `    ${l}`), "  SCRIPT"],
  });
  await writeFile(path.join(dir, "Vagrantfile"), vf, { encoding: "utf-8", mode: 0o600 });
  try {
    await run("vagrant", ["up", "--provider", "virtualbox"], { cwd: dir, timeout: 3_600_000, env: vagrantEnv, onLog });
    const pkg = path.join(dir, "package.box");
    await run("vagrant", ["package", "--output", pkg], { cwd: dir, timeout: 1_800_000, env: vagrantEnv, onLog });
    await run("vagrant", ["box", "add", "--force", "--name", b.baked, pkg], { cwd: dir, timeout: 1_800_000, env: vagrantEnv, onLog });
  } finally {
    await run("vagrant", ["destroy", "-f"], { cwd: dir, timeout: 600_000, env: vagrantEnv, onLog }).catch(() => {});
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  return { baked: b.baked };
}
