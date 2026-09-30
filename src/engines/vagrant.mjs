/**
 * Vagrant / VirtualBox engine for VM labs.
 *
 * Ports the pattern from DetectOps' src/lib/os-images/deploy.ts: generate a
 * Vagrantfile, then drive `vagrant up | halt | destroy -f`. The VM is attached to
 * a host-only private network so it is reachable from this host and other lab VMs
 * but not from the wider network.
 *
 * Box pulls are multi-GB, so `--dry-run` renders the Vagrantfile and plan without
 * downloading anything — that is the fast way to validate this path.
 */

import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { has, run, capture } from "../run.mjs";
import { LABS_DIR } from "../state.mjs";

export async function preflight() {
  if (!(await has("vagrant"))) throw new Error("`vagrant` not found — install Vagrant, then retry.");
  if (!(await has("VBoxManage"))) throw new Error("`VBoxManage` not found — install VirtualBox, then retry.");
}

/** Derive a host-only VM address from the chosen bind address's /24. */
export function vmAddressFor(bindIp, offset = 50) {
  if (!bindIp || bindIp.startsWith("127.")) return null;   // loopback can't host a VM net
  const parts = bindIp.split(".");
  if (parts.length !== 4) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}.${offset}`;
}

export function renderVagrantfile({ box, hostname, vmName, cpus, memoryMB, privateIp }) {
  const lines = [
    'Vagrant.configure("2") do |config|',
    `  config.vm.box = "${box}"`,
    `  config.vm.hostname = "${hostname}"`,
  ];
  if (privateIp) lines.push(`  config.vm.network "private_network", ip: "${privateIp}"`);
  lines.push(
    '  config.vm.provider "virtualbox" do |vb|',
    `    vb.name = "${vmName}"`,
    `    vb.cpus = ${cpus}`,
    `    vb.memory = ${memoryMB}`,
    "    vb.gui = false",
    "  end",
    "end",
    "",
  );
  return lines.join("\n");
}

export async function deploy(entry, opts) {
  const { id, bindIp, dryRun = false, onLog } = opts;
  const src = entry.source || {};
  if (src.kind !== "vagrant" || !src.box || src.box.startsWith("(")) {
    throw new Error(`"${entry.name}" has no single-box Vagrant source — see \`rtlab info ${entry.id}\` for its guided setup.`);
  }
  if (!dryRun) await preflight();

  const dir = path.join(LABS_DIR, id);
  const vmName = `${id}`;
  const privateIp = vmAddressFor(bindIp);
  const vf = renderVagrantfile({
    box: src.box,
    hostname: entry.id.replace(/[^a-z0-9-]/gi, "-").slice(0, 32),
    vmName,
    cpus: entry.resources.cpus,
    memoryMB: entry.resources.memoryMB,
    privateIp,
  });

  const services = (entry.services || []).map((s) => ({
    name: s.name, port: s.port, container: s.port, protocol: s.protocol || "tcp",
    url: privateIp ? `${s.protocol === "http" ? "http" : "tcp"}://${privateIp}:${s.port}` : "",
  }));

  if (dryRun) return { dryRun: true, dir, vmName, privateIp, vagrantfile: vf, services };

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "Vagrantfile"), vf, "utf-8");

  onLog?.(`vagrant up — box "${src.box}" downloads on first use (multi-GB)…`);
  await run("vagrant", ["up", "--provider", "virtualbox"], { cwd: dir, timeout: 3_600_000, onLog });
  return { dir, vmName, privateIp, services, ready: true, status: "running" };
}

export async function start(dep, { onLog } = {}) {
  await run("vagrant", ["up", "--provider", "virtualbox"], { cwd: dep.dir, timeout: 1_800_000, onLog });
}
export async function stop(dep, { onLog } = {}) {
  await run("vagrant", ["halt"], { cwd: dep.dir, timeout: 600_000, onLog });
}
export async function destroy(dep, { onLog } = {}) {
  if (dep.dir && existsSync(path.join(dep.dir, "Vagrantfile"))) {
    await run("vagrant", ["destroy", "-f"], { cwd: dep.dir, timeout: 900_000, onLog })
      .catch((e) => onLog?.(`destroy warning: ${e.message}`));
  }
  if (dep.dir) await rm(dep.dir, { recursive: true, force: true }).catch(() => {});
}
export async function logs(dep) {
  return { cmd: "vagrant", args: ["ssh", "-c", "sudo journalctl -n 200 --no-pager"], cwd: dep.dir };
}

/** Power state straight from VirtualBox — never trusted from our own state file. */
export async function status(dep) {
  const out = await capture("VBoxManage", ["list", "runningvms"], 8000);
  const running = out ? out.includes(`"${dep.vmName}"`) : false;
  return { status: running ? "running" : "stopped", containers: [] };
}
