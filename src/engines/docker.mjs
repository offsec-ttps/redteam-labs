/**
 * Docker Compose engine.
 *
 * Isolation strategy (important): we do NOT ship an override file on top of an
 * upstream compose. In the Compose spec `ports` is a sequence and override files
 * APPEND to it — the original `0.0.0.0` publish would survive alongside ours,
 * silently breaking the "never bind 0.0.0.0" guarantee.
 *
 * Instead we ask Compose to resolve the upstream project for us
 * (`docker compose config --format json` — Compose does the YAML parsing, so this
 * stays dependency-free), rewrite every published port onto our private bind
 * address, and run ONLY that resolved file. Full control, no guesswork.
 */

import { mkdir, writeFile, rm, rmdir, readdir, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { has, run, capture, waitForPort } from "../run.mjs";
import { freePort } from "../net.mjs";
import { LABS_DIR } from "../state.mjs";
import { VULHUB_REPO, VULHUB_REF } from "../catalog/labs.mjs";

const RESOLVED = "rtlab-compose.yml";   // JSON content; YAML parsers accept JSON

export async function preflight() {
  if (!(await has("docker"))) throw new Error("`docker` not found — install Docker Engine, then retry.");
  if (!(await has("docker", ["compose", "version"]))) throw new Error("`docker compose` not found — install the Compose plugin, then retry.");
}

const projectFor = (id) => `rtlab-${id}`;

/** Shallow-clone a repo (idempotent). */
export async function cloneOnce(repo, dest, ref, onLog) {
  if (existsSync(dest)) return dest;
  const args = ["clone", "--depth", "1"];
  if (ref && ref !== "master" && ref !== "main") args.push("--branch", ref);
  args.push(repo, dest);
  onLog?.(`cloning ${repo}…`);
  await run("git", args, { timeout: 900_000, onLog });
  return dest;
}

/** Cached vulhub checkout shared by all service-CVE labs. */
async function vulhubRoot(onLog) {
  const dest = path.join(LABS_DIR, "_vulhub");
  await cloneOnce(VULHUB_REPO, dest, VULHUB_REF, onLog);
  return dest;
}

/** Locate the upstream compose file in a directory. */
async function findComposeFile(dir) {
  const names = ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"];
  for (const n of names) if (existsSync(path.join(dir, n))) return path.join(dir, n);
  const entries = await readdir(dir).catch(() => []);
  throw new Error(`No compose file in ${dir} (saw: ${entries.slice(0, 8).join(", ") || "empty"})`);
}

/** Ask Compose to fully resolve an upstream project to JSON. */
async function resolveUpstream(composeFile) {
  const dir = path.dirname(composeFile);
  const json = await capture("docker", ["compose", "-f", composeFile, "config", "--format", "json"], 60_000);
  if (!json) throw new Error(`\`docker compose config\` failed for ${composeFile} — the upstream project may be invalid or need env vars.`);
  try { return { spec: JSON.parse(json), cwd: dir }; }
  catch (e) { throw new Error(`Could not parse resolved compose JSON: ${e.message}`); }
}

/**
 * Rewrite every published port so it binds ONLY to bindIp, reallocating to a free
 * host port when needed. Returns the patched spec plus the resulting URL map.
 */
async function bindPorts(spec, bindIp, entry, alloc = freePort) {
  const exposed = [];
  for (const [svcName, svc] of Object.entries(spec.services || {})) {
    if (!Array.isArray(svc.ports) || svc.ports.length === 0) continue;
    const rewritten = [];
    for (const p of svc.ports) {
      // Resolved form is an object: { mode, target, published, protocol }
      const target = Number(p.target ?? p.containerPort ?? 0);
      if (!target) continue;
      const wanted = Number(p.published || target);
      const host = await alloc(bindIp, wanted);
      rewritten.push(`${bindIp}:${host}:${target}${p.protocol === "udp" ? "/udp" : ""}`);
      exposed.push({ name: svcName, port: host, container: target, protocol: p.protocol || "tcp" });
    }
    svc.ports = rewritten;
  }
  // Nothing published upstream? Fall back to the catalog's declared service port.
  if (exposed.length === 0 && entry.services?.[0]?.port) {
    const first = Object.keys(spec.services || {})[0];
    if (first) {
      const target = entry.services[0].port;
      const host = await alloc(bindIp, target);
      spec.services[first].ports = [`${bindIp}:${host}:${target}`];
      exposed.push({ name: first, port: host, container: target, protocol: "tcp" });
    }
  }
  return { spec, exposed };
}

/**
 * Deny outbound traffic for labs that don't need it.
 *
 * An `internal: true` network has no NAT/gateway, which ALSO means Docker skips
 * port publishing entirely — a published port would silently never bind. So in
 * this mode we drop `ports` and the caller reaches the lab at its container IP
 * instead. That is stricter isolation (this host only, no host port at all) and
 * real egress denial, rather than a port that quietly does not work.
 */
function applyNoEgress(spec) {
  spec.networks = spec.networks || {};
  spec.networks.rtlab_isolated = { internal: true };
  for (const svc of Object.values(spec.services || {})) {
    svc.networks = ["rtlab_isolated"];
    delete svc.ports;
  }
  return spec;
}

/**
 * When a lab starts but its port never answers, the usual cause is an app that
 * binds 127.0.0.1 *inside* the container — unreachable however the network is set
 * up. Read the container's listening sockets straight from /proc (netstat/ss are
 * rarely installed in these images) and say so, instead of just timing out.
 */
export async function diagnoseUnreachable(file, project, cwd, wantPort) {
  const ids = await capture("docker", ["compose", "-f", file, "-p", project, "ps", "-q"], 15_000);
  const first = (ids || "").split("\n").map((s) => s.trim()).filter(Boolean)[0];
  if (!first) return "no container is running — check `rtlab logs`";
  const proc = await capture("docker", ["exec", first, "cat", "/proc/net/tcp"], 10_000);
  if (!proc) return "could not inspect the container's sockets — check `rtlab logs`";
  const listening = [];
  for (const line of proc.split("\n").slice(1)) {
    const f = line.trim().split(/\s+/);
    if (f.length < 4 || f[3] !== "0A") continue;          // 0A = LISTEN
    const [hex, portHex] = f[1].split(":");
    const port = parseInt(portHex, 16);
    const loopback = hex.toUpperCase() === "0100007F";     // 127.0.0.1, little-endian
    listening.push({ port, loopback });
  }
  const target = listening.find((l) => l.port === wantPort);
  if (target?.loopback) {
    return `the app inside the container is listening on 127.0.0.1:${wantPort}, not 0.0.0.0 — `
      + `it cannot be reached from outside the container. Pass the image's bind-address env var `
      + `(e.g. --env HOST=0.0.0.0) or use a lab entry that sets it.`;
  }
  if (!target) {
    const ports = listening.map((l) => l.port).filter((p) => p > 1024).join(", ") || "none";
    return `nothing is listening on ${wantPort} inside the container (open ports: ${ports}) — the catalog port may be wrong`;
  }
  return "the port is open inside the container but unreachable from the host — check networking";
}

/** Container IP on the isolated network, for no-egress labs. */
async function containerIps(file, project, cwd) {
  const ids = await capture("docker", ["compose", "-f", file, "-p", project, "ps", "-q"], 20_000);
  if (!ids) return [];
  const out = [];
  for (const id of ids.split("\n").map((s) => s.trim()).filter(Boolean)) {
    const ip = await capture("docker", ["inspect", "-f",
      "{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}", id], 15_000);
    const name = await capture("docker", ["inspect", "-f", "{{.Name}}", id], 15_000);
    const first = (ip || "").trim().split(/\s+/).filter(Boolean)[0];
    if (first) out.push({ id, name: (name || "").replace(/^\//, ""), ip: first });
  }
  return out;
}

/** Build the compose spec for an entry, materialising sources as needed. */
export async function buildSpec(entry, { dir, bindIp, noEgress, onLog, alloc = freePort, env = null }) {
  const src = entry.source || {};
  let spec, exposed = [], cwd = dir;

  if (src.kind === "image") {
    const host = await alloc(bindIp, src.port);
    spec = {
      name: projectFor(entry.id.replace(/[^a-z0-9]/gi, "-").toLowerCase()),
      services: {
        [entry.id.replace(/[^a-z0-9]/gi, "-").toLowerCase()]: {
          image: src.image,
          ports: [`${bindIp}:${host}:${src.port}`],
          restart: "unless-stopped",
          // Some images need an env var to bind 0.0.0.0 instead of localhost.
          ...(src.env ? { environment: src.env } : {}),
        },
      },
    };
    exposed = [{ name: entry.id, port: host, container: src.port, protocol: "tcp" }];
  } else if (src.kind === "build") {
    // Upstream ships only a Dockerfile (no published image): clone it and let Compose build it where it
    // runs (on the host, or inside the spinner VM). Same port-binding guarantees as the "image" kind.
    const clone = path.join(dir, "src");
    await cloneOnce(src.repo, clone, src.ref, onLog);
    const ctx = src.subdir ? path.join(clone, src.subdir) : clone;
    // Extra files the recipe needs in the build context (an rtlab Dockerfile when upstream's does not build).
    for (const [fname, content] of Object.entries(src.files || {})) {
      if (fname.includes("/") || fname.includes("..")) throw new Error(`refusing to write "${fname}" outside the build context`);
      await writeFile(path.join(ctx, fname), content);
    }
    const host = await alloc(bindIp, src.port);
    const name = entry.id.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    spec = {
      name: projectFor(name),
      services: { [name]: {
        build: { context: ctx, ...(src.dockerfile ? { dockerfile: src.dockerfile } : {}) },
        ports: [`${bindIp}:${host}:${src.port}`], restart: "unless-stopped",
        ...(src.env ? { environment: src.env } : {}), ...(src.command ? { command: src.command } : {}),
      } },
    };
    exposed = [{ name: entry.id, port: host, container: src.port, protocol: "tcp" }];
  } else if (src.kind === "compose" || src.kind === "vulhub") {
    let projDir;
    if (src.kind === "vulhub") {
      const root = await vulhubRoot(onLog);
      const upstream = path.join(root, src.path);
      if (!existsSync(upstream)) throw new Error(`vulhub path "${src.path}" not found — the pinned revision may have moved it.`);
      // Copy the lab's own directory into the deployment: the shared checkout lives outside it, and a spinner VM
      // only sees the deployment directory. Vulhub projects are self-contained (images or a local build context).
      projDir = path.join(dir, "src");
      await cp(upstream, projDir, { recursive: true, force: true });
    } else {
      const clone = path.join(dir, "src");
      await cloneOnce(src.repo, clone, src.ref, onLog);
      projDir = src.subdir ? path.join(clone, src.subdir) : clone;
    }
    // Some projects expect a file they do not ship (an env file the README tells you to write).
    for (const [name, content] of Object.entries(src.files || {})) {
      if (name.includes("..") || path.isAbsolute(name)) throw new Error(`refusing to write "${name}" outside the project`);
      await writeFile(path.join(projDir, name), content, "utf-8");
    }
    const composeFile = src.file ? path.join(projDir, src.file) : await findComposeFile(projDir);
    if (src.file && !existsSync(composeFile)) throw new Error(`compose file "${src.file}" not found in ${projDir}`);
    const r = await resolveUpstream(composeFile);
    cwd = r.cwd;
    const bound = await bindPorts(r.spec, bindIp, entry, alloc);
    spec = bound.spec;
    exposed = bound.exposed;
  } else {
    throw new Error(`Unsupported source kind "${src.kind}" for the docker engine`);
  }

  if (noEgress) spec = applyNoEgress(spec);
  if (env && Object.keys(env).length) {
    // Deploy-time options (a model choice, an API key) reach every container of this lab as environment.
    for (const svc of Object.values(spec.services || {})) {
      const cur = Array.isArray(svc.environment) ? Object.fromEntries(svc.environment.map((e) => { const i = e.indexOf("="); return i < 0 ? [e, ""] : [e.slice(0, i), e.slice(i + 1)]; })) : (svc.environment || {});
      svc.environment = { ...cur, ...env };
    }
  }
  return { spec, cwd, exposed };
}

/** Deploy. Returns a plain result object (no CLI coupling). */
export async function deploy(entry, opts) {
  const { id, bindIp, noEgress = false, dryRun = false, onLog, labEnv = null } = opts;
  await preflight();
  const dir = path.join(LABS_DIR, id);
  // A dry run must not leave anything behind. Clone-based sources still need a
  // working directory (Compose has to parse the upstream project to resolve it),
  // so we create it, then remove it again below if the dry run wrote nothing.
  await mkdir(dir, { recursive: true });

  const { spec, cwd, exposed } = await buildSpec(entry, { dir, bindIp, noEgress, onLog, env: labEnv });
  const file = path.join(dir, RESOLVED);
  if (!dryRun) await writeFile(file, JSON.stringify(spec, null, 2), { encoding: "utf-8", mode: 0o600 });   // may hold an API key

  const project = projectFor(id);
  const services = exposed.map((e) => ({
    ...e,
    url: `${entry.services?.[0]?.protocol === "https" ? "https" : "http"}://${bindIp}:${e.port}`,
  }));

  if (dryRun) {
    // Leave the store exactly as we found it: the clone existed only to resolve the compose file.
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    return { dryRun: true, dir, file, project, bindIp, services, spec };
  }

  onLog?.(`starting containers (project ${project})…`);
  await run("docker", ["compose", "-f", file, "-p", project, "up", "-d"], { cwd, timeout: 1_800_000, onLog });

  // No-egress labs publish nothing — resolve the container IP to reach them.
  let reachable = services;
  if (noEgress) {
    const ips = await containerIps(file, project, cwd);
    onLog?.(`isolated network — reaching the lab at its container IP`);
    reachable = exposed.map((e, i) => ({
      ...e,
      port: e.container,
      host: ips[i]?.ip || ips[0]?.ip || "",
      url: ips[i]?.ip || ips[0]?.ip ? `http://${ips[i]?.ip || ips[0].ip}:${e.container}` : "",
    }));
  }

  const first = reachable[0];
  let ready = true, hint = null;
  if (first) {
    const host = first.host || bindIp;
    ready = await waitForPort(host, first.port, { timeout: 120_000, interval: 3000, onLog });
    if (!ready) hint = await diagnoseUnreachable(file, project, cwd, first.container).catch(() => null);
  }
  return { dir, file, project, bindIp, noEgress, services: reachable, ready, hint, status: ready ? "running" : "starting" };
}

export async function start(dep, { onLog } = {}) {
  await run("docker", ["compose", "-f", dep.file, "-p", dep.project, "start"], { cwd: dep.dir, timeout: 300_000, onLog });
}
export async function stop(dep, { onLog } = {}) {
  await run("docker", ["compose", "-f", dep.file, "-p", dep.project, "stop"], { cwd: dep.dir, timeout: 300_000, onLog });
}
export async function destroy(dep, { onLog } = {}) {
  if (dep.file && existsSync(dep.file)) {
    await run("docker", ["compose", "-f", dep.file, "-p", dep.project, "down", "-v"], { cwd: dep.dir, timeout: 600_000, onLog })
      .catch((e) => onLog?.(`down warning: ${e.message}`));
  }
  if (dep.dir) await rm(dep.dir, { recursive: true, force: true }).catch(() => {});
}
export async function logs(dep, { follow = false } = {}) {
  const args = ["compose", "-f", dep.file, "-p", dep.project, "logs", "--tail", "200"];
  if (follow) args.push("-f");
  return { cmd: "docker", args, cwd: dep.dir };
}

/** Live status from Compose, plus the real published bindings. */
export async function status(dep) {
  // `-a` matters: without it Compose omits stopped containers, and a stopped lab
  // would report "unknown" instead of "stopped".
  const json = await capture("docker", ["compose", "-f", dep.file, "-p", dep.project, "ps", "-a", "--format", "json"], 20_000);
  if (!json) return { status: "unknown", containers: [] };
  const rows = json.trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const flat = rows.length === 1 && Array.isArray(rows[0]) ? rows[0] : rows;
  const running = flat.filter((c) => /running|up/i.test(c.State || c.Status || "")).length;
  return {
    status: flat.length === 0 ? "stopped" : running === flat.length ? "running" : running > 0 ? "partial" : "stopped",
    containers: flat.map((c) => ({ name: c.Name || c.Service, state: c.State || c.Status, ports: c.Publishers || c.Ports })),
  };
}
