/**
 * Remote engine: container labs on a server the person owns (a VPS), driven over SSH through the
 * server's Docker daemon. Same recipes and port binding as the docker engine, several labs per
 * deployment like the spinner, no VM: the labs listen on the server's address (or a chosen bind address).
 * Labs are intentionally vulnerable, so a server used this way should be disposable and firewalled.
 */
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { LABS_DIR } from "../state.mjs";
import { run, capture } from "../run.mjs";
import { buildSpec } from "./docker.mjs";
import { prepareRemote, remoteBindIp, checkRemote } from "../remote.mjs";

const projectFor = (id, lab) => `rtlab-${id}-${lab}`.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
const PROBE = `timeout 3 bash -c 'cat < /dev/null > /dev/tcp/%h/%p' 2>/dev/null && echo open || echo closed`;

// Where bind-mount sources are copied on the server. A runtime bind mount (a config file or directory the lab
// ships) is resolved by the Docker *daemon*, which here runs on the server — so the source has to exist there,
// not just on this runner. We mirror each one under this directory and point the compose file at the server path.
const MOUNT_BASE = "/opt/rtlab/mounts";
const slug = (s) => String(s).replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
const shq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";

/**
 * Collect every bind-mount source in a resolved compose spec as a get/set handle, covering both the long form
 * (`{ type: "bind", source }`, what `docker compose config` emits) and the short `"source:target[:mode]"` string.
 */
function bindRefs(spec) {
  const refs = [];
  for (const svc of Object.values(spec.services || {})) {
    const vols = svc?.volumes;
    if (!Array.isArray(vols)) continue;
    vols.forEach((v, i) => {
      if (v && typeof v === "object" && v.type === "bind" && typeof v.source === "string") {
        refs.push({ get: () => v.source, set: (x) => { v.source = x; } });
      } else if (typeof v === "string") {
        const m = v.match(/^([^:]+)(:.+)$/);
        if (m) refs.push({ get: () => m[1], set: (x) => { vols[i] = x + m[2]; } });
      }
    });
  }
  return refs;
}

/**
 * Copy a lab's local bind-mount sources onto the server and rewrite the compose file to reference the server-side
 * paths. Only sources under the lab store (LABS_DIR) that exist locally are staged — a daemon path like
 * /var/run/docker.sock is left untouched. Identical sources (e.g. one config bind-mounted twice) are copied once.
 * Returns the remote directory used, so destroy can sweep it. No-op for labs without local bind mounts.
 */
async function stageBindMounts(l, { p, remote, id, onLog }) {
  const refs = bindRefs(l.spec).filter((r) => {
    const s = r.get();
    return path.isAbsolute(s) && s.startsWith(LABS_DIR + path.sep) && existsSync(s);
  });
  if (!refs.length) return null;
  const remoteLabDir = `${MOUNT_BASE}/${slug(id)}/${slug(l.labId)}`;
  const wrapperSsh = path.join(p.dir, "ssh");
  const target = `${remote.username}@${remote.host}`;
  const map = new Map(); // local source -> remote path (dedupe)
  let n = 0;
  for (const r of refs) {
    const src = r.get();
    let remotePath = map.get(src);
    if (!remotePath) {
      const sub = `${remoteLabDir}/m${n++}`;
      const base = path.basename(src);
      remotePath = `${sub}/${base}`;
      await run("sh", ["-c",
        `tar -C ${shq(path.dirname(src))} -cf - ${shq(base)} | ` +
        `${shq(wrapperSsh)} -p ${remote.port} ${shq(target)} ${shq(`mkdir -p ${sub} && tar -C ${sub} -xf -`)}`,
      ], { env: p.env, timeout: 300_000, onLog });
      map.set(src, remotePath);
    }
    r.set(remotePath);
  }
  await writeFile(l.file, JSON.stringify(l.spec, null, 2), { encoding: "utf-8", mode: 0o600 });
  onLog?.(`staged ${map.size} bind-mount source(s) for ${l.name} onto the server`);
  return remoteLabDir;
}

/** TCP ports with a listener on the server (any address), so new labs never collide with what already runs there. */
async function remoteUsedPorts(remote, id) {
  const p = await prepareRemote(remote, `${id}-ports`);
  try {
    const out = await capture(path.join(p.dir, "ssh"), ["-p", String(remote.port), `${remote.username}@${remote.host}`,
      "(ss -ltnH 2>/dev/null || netstat -ltn 2>/dev/null) | awk '{print $4}'"], 30_000, { env: p.env });
    return (out || "").split("\n").map((l) => Number(l.trim().split(":").pop())).filter((n) => Number.isInteger(n) && n > 0);
  } finally { await p.cleanup(); }
}

/** Compare what the labs declare they need with what the server has. */
export function fit(entries, info) {
  const memNeed = entries.reduce((a, e) => a + (e.resources?.memoryMB || 512), 0);
  const diskNeed = entries.reduce((a, e) => a + (e.resources?.diskGB || 1), 0);
  const names = entries.map((e) => e.name).join(", ");
  if (info.memoryMB && memNeed > info.memoryMB) {
    return { blocked: `${names} need${entries.length > 1 ? "" : "s"} about ${Math.ceil(memNeed / 1024)} GB RAM; this server has ${Math.round(info.memoryMB / 1024)} GB. Use a larger server or a cloud account for this lab.` };
  }
  if (info.diskFreeGB != null && diskNeed > info.diskFreeGB) {
    return { blocked: `${names} need${entries.length > 1 ? "" : "s"} about ${diskNeed} GB of disk; this server has ${info.diskFreeGB} GB free. Free space or use a larger server.` };
  }
  if (info.memoryAvailableMB && memNeed > info.memoryAvailableMB) {
    return { warning: `${names} need${entries.length > 1 ? "" : "s"} about ${Math.ceil(memNeed / 1024)} GB RAM and the server has ${Math.round(info.memoryAvailableMB / 1024)} GB free right now; it may run slowly.` };
  }
  return {};
}

async function remotePortOpen(p, remote, host, port) {
  const out = await capture(path.join(p.dir, "ssh"), ["-p", String(remote.port), `${remote.username}@${remote.host}`, PROBE.replace("%h", host).replace("%p", String(port))], 20_000, { env: p.env });
  return (out || "").includes("open");
}

export async function deploy(entries, opts) {
  const { id, remote, noEgress = false, dryRun = false, onLog, labEnv = null, installDocker = false } = opts;
  // "Block outbound internet" on the local engine puts the lab on an internal Docker network, which also stops its
  // ports from being published. On a server the labs are reached through the VPN address, so that mode would make
  // them unreachable; the private VPN plus the firewall already keep them off the internet. Not applied here.
  if (noEgress) onLog?.("outbound blocking is not applied on a server: the labs stay published on the private address only");
  const bindIp = await remoteBindIp(remote);
  const dir = path.join(LABS_DIR, id);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  // Ports already listening on the server are skipped, like the local engine does with the host's ports.
  const used = new Set(dryRun ? [] : await remoteUsedPorts(remote, id).catch(() => []));
  const alloc = async (_ip, wanted) => { let p = wanted; while (used.has(p)) p++; used.add(p); return p; };
  const labs = [];
  for (const entry of entries) {
    const labDir = path.join(dir, entry.id);
    await mkdir(labDir, { recursive: true });
    const { spec, cwd, exposed } = await buildSpec(entry, { dir: labDir, bindIp, noEgress: false, onLog, alloc, env: labEnv?.[entry.id] || null });
    const file = path.join(labDir, "rtlab-compose.yml");
    await writeFile(file, JSON.stringify(spec, null, 2), { encoding: "utf-8", mode: 0o600 });
    labs.push({ labId: entry.id, name: entry.name, file, project: projectFor(id, entry.id), cwd, spec,
      services: exposed.map((e) => ({ ...e, url: `${entry.services?.[0]?.protocol === "https" ? "https" : "http"}://${bindIp}:${e.port}` })),
      defaultCreds: entry.defaultCreds || null });
  }
  if (dryRun) { await rm(dir, { recursive: true, force: true }).catch(() => {}); return { dryRun: true, dir, bindIp, labs, services: labs.flatMap((l) => l.services.map((s) => ({ lab: l.labId, ...s }))) }; }

  onLog?.(`checking ${remote.username}@${remote.host}:${remote.port} over SSH…`);
  const info = await checkRemote(remote, { onLog, installDocker, id });
  onLog?.(`server: ${info.os}; Docker ${info.dockerVersion}${info.memoryMB ? `; ${info.cpus} vCPU, ${Math.round(info.memoryMB / 1024)} GB RAM, ${info.diskFreeGB} GB free` : ""}`);
  // Size check: a server that cannot hold the labs is refused with the numbers, instead of failing half-way.
  const need = fit(entries, info);
  if (need.blocked) throw new Error(need.blocked);
  if (need.warning) onLog?.(need.warning);
  const p = await prepareRemote(remote, id);
  try {
    // Runtime bind mounts resolve on the server's daemon, so copy their sources there and repoint the compose file
    // before starting — otherwise Docker would create empty dirs in place of the lab's config and it would not serve.
    for (const l of labs) await stageBindMounts(l, { p, remote, id, onLog });
    for (const l of labs) {
      onLog?.(`starting ${l.name} on the server (project ${l.project})…`);
      await run("docker", ["compose", "-f", l.file, "-p", l.project, "up", "-d"], { cwd: l.cwd, timeout: 1_800_000, env: p.env, onLog });
    }
    const first = labs[0]?.services[0];
    let ready = true;
    if (first) {
      const until = Date.now() + 180_000;
      while (Date.now() < until && !(ready = await remotePortOpen(p, remote, bindIp, first.port))) await new Promise((r) => setTimeout(r, 5000));
    }
    return { dir, bindIp, labs, remote: { host: remote.host, port: remote.port, username: remote.username, label: remote.label, bindIp },
      services: labs.flatMap((l) => l.services.map((s) => ({ lab: l.labId, ...s }))), ready, status: ready ? "running" : "starting",
      fingerprint: info.fingerprint };
  } catch (e) {
    for (const l of labs) await run("docker", ["compose", "-f", l.file, "-p", l.project, "down", "-v"], { cwd: l.cwd, timeout: 600_000, env: p.env }).catch(() => {});
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw e;
  } finally { await p.cleanup(); }
}

async function each(dep, remote, verb, onLog, extra = []) {
  const p = await prepareRemote(remote, dep.id);
  try {
    for (const l of dep.labs || []) {
      if (!existsSync(l.file)) continue;
      await run("docker", ["compose", "-f", l.file, "-p", l.project, verb, ...extra], { cwd: l.cwd, timeout: 600_000, env: p.env, onLog })
        .catch((e) => { if (verb !== "down") throw e; onLog?.(`down warning: ${e.message}`); });
    }
  } finally { await p.cleanup(); }
}
export async function start(dep, { onLog, remote } = {}) { await each(dep, remote, "start", onLog); }
export async function stop(dep, { onLog, remote } = {}) { await each(dep, remote, "stop", onLog); }
/** Images the deployment's compose files reference (read locally; the files are JSON). */
export async function imagesOf(dep) {
  const out = new Set();
  for (const l of dep.labs || []) {
    try { for (const svc of Object.values(JSON.parse(await readFile(l.file, "utf-8")).services || {})) if (svc.image) out.add(svc.image); } catch { /* file gone */ }
  }
  return [...out];
}

/**
 * Tear the lab down on the server. With `purge`, also remove the images it pulled (only those no other container still
 * uses: Docker refuses the rest, which is reported, not forced). Returns what was removed so the control plane can show it.
 */
export async function destroy(dep, { onLog, remote, purge = false } = {}) {
  const removed = { images: [], imagesKept: [] };
  if (remote) {
    const images = purge ? await imagesOf(dep) : [];
    await each(dep, remote, "down", onLog, ["-v"]);
    // Compose files can be gone (an older runner, a cleaned temp dir): sweep by project label so nothing is left behind.
    await destroyOrphan(dep.id, { remote, onLog });
    if (images.length) {
      const p = await prepareRemote(remote, dep.id);
      try {
        for (const img of images) {
          const ok = await run("docker", ["image", "rm", img], { timeout: 120_000, env: p.env }).then(() => true).catch(() => false);
          (ok ? removed.images : removed.imagesKept).push(img);
          onLog?.(ok ? `removed image ${img}` : `kept image ${img} (still used by another container)`);
        }
      } finally { await p.cleanup(); }
    }
  } else onLog?.("no SSH credentials given: removing the local record only; the containers stay on the server");
  if (dep.dir) await rm(dep.dir, { recursive: true, force: true }).catch(() => {});
  return removed;
}

const PROJECT_LABEL = "com.docker.compose.project";
const lines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);

/**
 * Remove every container, network and volume on the server that belongs to this deployment, found by Compose
 * project label (`rtlab-<id>-<lab>`), without needing the local record or compose files. Idempotent; used when a
 * control plane asks to destroy a lab whose local record was lost, and as the final sweep of a normal destroy.
 */
export async function destroyOrphan(id, { remote, onLog } = {}) {
  if (!remote) throw new Error("SSH credentials are needed to clean up a server lab");
  const prefix = projectFor(id, "");
  const p = await prepareRemote(remote, id);
  const removed = { containers: 0, networks: 0, volumes: 0, projects: [] };
  try {
    const all = lines(await capture("docker", ["ps", "-a", "--format", `{{.Label "${PROJECT_LABEL}"}}`], 60_000, { env: p.env }));
    const nets = lines(await capture("docker", ["network", "ls", "--format", `{{.Label "${PROJECT_LABEL}"}}`], 60_000, { env: p.env }));
    const vols = lines(await capture("docker", ["volume", "ls", "--format", `{{.Label "${PROJECT_LABEL}"}}`], 60_000, { env: p.env }));
    const projects = [...new Set([...all, ...nets, ...vols])].filter((x) => x.startsWith(prefix));
    for (const project of projects) {
      const filter = `label=${PROJECT_LABEL}=${project}`;
      const c = lines(await capture("docker", ["ps", "-aq", "--filter", filter], 60_000, { env: p.env }));
      if (c.length) { await run("docker", ["rm", "-f", "-v", ...c], { timeout: 300_000, env: p.env }); removed.containers += c.length; }
      const n = lines(await capture("docker", ["network", "ls", "-q", "--filter", filter], 60_000, { env: p.env }));
      for (const x of n) await run("docker", ["network", "rm", x], { timeout: 60_000, env: p.env }).then(() => removed.networks++).catch(() => {});
      const v = lines(await capture("docker", ["volume", "ls", "-q", "--filter", filter], 60_000, { env: p.env }));
      for (const x of v) await run("docker", ["volume", "rm", "-f", x], { timeout: 60_000, env: p.env }).then(() => removed.volumes++).catch(() => {});
      removed.projects.push(project);
      onLog?.(`removed project ${project} from the server (${c.length} container(s))`);
    }
    if (!projects.length) onLog?.(`nothing left on the server for ${id}`);
    // Remove any bind-mount sources we staged for this deployment (fixed, sanitized path — safe to rm -rf).
    await run(path.join(p.dir, "ssh"), ["-p", String(remote.port), `${remote.username}@${remote.host}`,
      `rm -rf ${MOUNT_BASE}/${slug(id)}`], { env: p.env, timeout: 60_000 }).catch(() => {});
  } finally { await p.cleanup(); }
  return removed;
}
export async function logs(dep, { remote } = {}) {
  const first = dep.labs?.[0];
  if (!first || !remote) return { cmd: "echo", args: ["no SSH credentials given: run with --remote/--ssh-key"], cwd: dep.dir };
  const p = await prepareRemote(remote, dep.id);                 // leaked on purpose for a foreground `logs -f`; removed on exit by the OS temp policy
  return { cmd: "docker", args: ["compose", "-f", first.file, "-p", first.project, "logs", "--tail", "200"], cwd: first.cwd, env: p.env, cleanup: p.cleanup };
}
export async function status(dep, { remote } = {}) {
  if (!remote) return { status: dep.status || "unknown", containers: [] };
  const p = await prepareRemote(remote, dep.id);
  try {
    let running = 0, total = 0;
    for (const l of dep.labs || []) {
      const json = await capture("docker", ["compose", "-f", l.file, "-p", l.project, "ps", "-a", "--format", "json"], 30_000, { env: p.env });
      const rows = (json || "").trim().split("\n").map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
      const flat = rows.length === 1 && Array.isArray(rows[0]) ? rows[0] : rows;
      total += flat.length; running += flat.filter((c) => /running|up/i.test(c.State || c.Status || "")).length;
    }
    return { status: total === 0 ? "stopped" : running === total ? "running" : running > 0 ? "partial" : "stopped", containers: [] };
  } finally { await p.cleanup(); }
}
