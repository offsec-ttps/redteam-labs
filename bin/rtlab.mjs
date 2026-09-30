#!/usr/bin/env node
/**
 * rtlab — red-team lab launcher.
 *
 * Pick a vulnerable lab, and it is fetched and deployed locally (Docker Compose or
 * a Vagrant VM) onto an isolated, host-only-bound network with a TTL so it cannot
 * outlive the exercise. Zero dependencies: Node 20+ built-ins only.
 *
 * These labs are INTENTIONALLY VULNERABLE. Run them only on a lab network you are
 * authorized to use. Nothing is ever published on 0.0.0.0.
 *
 * Usage:  rtlab <command> [args] [flags]     ·     rtlab --help
 */

import path from "node:path";
import { spawn } from "node:child_process";
import {
  configureUi, isJson, die, out, table, ok, warn, info, step, plain,
  dim, bold, grn, ylw, cyn, red, statusColor, confirm, ask, vulnerableBanner,
} from "../src/ui.mjs";
import { candidateBindIps, pickBindIp, freeDiskGB, parseTtl, fmtRemaining } from "../src/net.mjs";
import { has, capture } from "../src/run.mjs";
import * as state from "../src/state.mjs";
import { allEntries, findEntry, filterEntries, searchEntries, DOMAINS, SERVICES, SERVICE_APPS } from "../src/catalog/index.mjs";
import * as dockerEngine from "../src/engines/docker.mjs";
import * as vagrantEngine from "../src/engines/vagrant.mjs";

const BOOL = new Set(["--json", "--yes", "-y", "--no-color", "--help", "-h", "--all",
  "--dry-run", "--no-egress", "--follow", "-f", "--quiet"]);

function parseArgs(list) {
  const pos = []; const flags = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.startsWith("--") || (a.startsWith("-") && a.length === 2 && !/^-\d/.test(a))) {
      const key = a.replace(/^--?/, "");
      if (BOOL.has(a)) flags[key] = true;
      else { flags[key] = list[i + 1]; i++; }
    } else pos.push(a);
  }
  return { pos, flags };
}

const { pos, flags } = parseArgs(process.argv.slice(2));
configureUi({ color: !flags["no-color"], json: flags.json, yes: flags.yes || flags.y });
const DRY = !!flags["dry-run"];
const MIN_FREE_GB = Number(process.env.RTLAB_MIN_FREE_GB || 10);

const engineFor = (entry) => (entry.engine === "vm" ? vagrantEngine : dockerEngine);
const logger = (line) => { if (!isJson() && !flags.quiet) console.log(`    ${dim(line)}`); };
const slug = (s) => String(s).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

// ── help ─────────────────────────────────────────────────────────────────────
const HELP = `
${bold("rtlab")} — red-team lab launcher ${dim("(intentionally vulnerable labs; isolated + TTL'd)")}

${bold("Catalog")}
  rtlab list [--domain <d>] [--engine docker|vm] [--json]
  rtlab search <query>
  rtlab info <lab-id>
  rtlab catalog --json            ${dim("machine-readable catalog (integration contract)")}
  rtlab services list [<app>]     ${dim("service-level CVE labs (app@CVE)")}

${bold("Lifecycle")}
  rtlab deploy <lab-id> [--bind <ip>] [--ttl 4h] [--no-egress] [--dry-run]
  rtlab services deploy <app>@<cve> [same flags]
  rtlab status [<id>]  ·  rtlab logs <id> [--follow]
  rtlab start <id>     ·  rtlab stop <id>
  rtlab destroy <id> | --all [--yes]
  rtlab reap                      ${dim("destroy TTL-expired labs (cron-friendly)")}

${bold("Other")}
  rtlab doctor                    ${dim("prerequisites, bind addresses, free disk")}
  rtlab run                       ${dim("interactive wizard")}

${bold("Flags")}  --json  --yes  --no-color  --quiet
${bold("Domains")} ${DOMAINS.join(", ")}, service-cve
`;

// ── doctor ───────────────────────────────────────────────────────────────────
async function cmdDoctor() {
  step("Prerequisites");
  const checks = [
    ["docker", ["--version"], "Docker engine (container labs)"],
    ["docker", ["compose", "version"], "Compose plugin (container labs)"],
    ["vagrant", ["--version"], "Vagrant (VM labs)"],
    ["VBoxManage", ["--version"], "VirtualBox (VM labs)"],
    ["git", ["--version"], "git (fetching lab sources)"],
  ];
  const results = [];
  for (const [cmd, args, label] of checks) {
    const v = await capture(cmd, args, 8000);
    results.push({ tool: cmd === "docker" && args[0] === "compose" ? "docker compose" : cmd, version: v ? v.split("\n")[0] : "—", need: label, okFlag: !!v });
  }
  table(results.map((r) => ({ tool: r.tool, version: r.version, purpose: r.need, ok: r.okFlag ? "yes" : "MISSING" })),
    [{ key: "tool", label: "TOOL" }, { key: "version", label: "VERSION" }, { key: "ok", label: "OK", color: (v) => (v === "yes" ? grn(v) : red(v)) }, { key: "purpose", label: "NEEDED FOR" }]);

  plain("");
  step("Bind addresses (a lab is never published on 0.0.0.0)");
  const ips = candidateBindIps();
  table(ips.map((i) => ({ address: i.address, iface: i.name, hint: i.hint })),
    [{ key: "address", label: "ADDRESS", color: grn }, { key: "iface", label: "INTERFACE" }, { key: "hint", label: "NOTE" }]);

  plain("");
  step("Storage");
  const free = await freeDiskGB(state.RT_HOME).catch(() => null);
  info(`root        ${state.RT_HOME}   ${dim(`(from ${state.RT_HOME_SOURCE})`)}`);
  info(`labs        ${state.LABS_DIR}`);
  info(`vagrant     ${state.VAGRANT_HOME}   ${dim("(box cache)")}`);
  if (free === null) warn("could not determine free disk");
  else if (free < MIN_FREE_GB) warn(`${free}GB free — below the ${MIN_FREE_GB}GB minimum; deploys will be refused`);
  else ok(`${free}GB free`);
  // Docker's image store is a daemon-level setting, so rtlab cannot relocate it.
  const dockerRoot = await capture("docker", ["info", "--format", "{{.DockerRootDir}}"], 8000);
  if (dockerRoot) {
    const dfree = await freeDiskGB(dockerRoot).catch(() => null);
    const note = dfree !== null && dfree < MIN_FREE_GB ? ylw(`${dfree}GB free — container images may not fit`) : dim(`${dfree ?? "?"}GB free`);
    info(`docker      ${dockerRoot}   ${note}`);
    if (dfree !== null && dfree < MIN_FREE_GB) {
      info(dim("  container images live here, not in the lab store — move them with the daemon's data-root setting"));
    }
  }

  out({
    tools: results, bindIps: ips, freeGB: free,
    storage: { root: state.RT_HOME, source: state.RT_HOME_SOURCE, labs: state.LABS_DIR, vagrant: state.VAGRANT_HOME, dockerRoot },
  });
}

// ── catalog ──────────────────────────────────────────────────────────────────
function cmdList() {
  const rows = filterEntries({ domain: flags.domain, engine: flags.engine })
    .map((e) => ({
      id: e.id, name: e.name, domain: e.domain, engine: e.engine,
      deploy: e.deploy.available ? "auto" : "guided",
    }));
  if (!isJson()) step(`${rows.length} lab(s)`);
  table(rows, [
    { key: "id", label: "ID", color: cyn }, { key: "name", label: "NAME" },
    { key: "domain", label: "DOMAIN" }, { key: "engine", label: "ENGINE" },
    { key: "deploy", label: "DEPLOY", color: (v) => (v === "auto" ? grn(v) : dim(v)) },
  ]);
  out(rows);
}

function cmdSearch(q) {
  if (!q) die("usage: rtlab search <query>");
  const rows = searchEntries(q).map((e) => ({ id: e.id, name: e.name, domain: e.domain, engine: e.engine }));
  if (!rows.length) die(`no lab matches "${q}" — try \`rtlab list\``);
  table(rows, [{ key: "id", label: "ID", color: cyn }, { key: "name", label: "NAME" }, { key: "domain", label: "DOMAIN" }, { key: "engine", label: "ENGINE" }]);
  out(rows);
}

function cmdInfo(id) {
  const e = findEntry(id);
  if (!e) die(`unknown lab "${id}" — try \`rtlab search ${id || ""}\``);
  if (isJson()) return out(e);
  plain("");
  plain(`  ${bold(e.name)}  ${dim(e.id)}`);
  plain(`  ${e.description}`);
  plain("");
  info(`domain     ${e.domain}          engine   ${e.engine}`);
  info(`resources  ${e.resources.cpus} vCPU · ${(e.resources.memoryMB / 1024).toFixed(1)}GB RAM · ${e.resources.diskGB}GB disk`);
  info(`ATT&CK     ${e.attack.techniques.join(", ")}${e.sigmaPath ? `   sigma: ${e.sigmaPath}` : ""}`);
  info(`isolation  egress ${e.isolation.requiresEgress ? "required" : "not needed (use --no-egress)"}`);
  if (e.repo) info(`repo       ${e.repo}`);
  if (e.docsUrl) info(`docs       ${e.docsUrl}`);
  plain("");
  if (e.deploy.available) ok(`Deployable: rtlab deploy ${e.id}`);
  else {
    warn("No automated deploy yet — guided setup:");
    (e.deploy.guidedSteps || []).forEach((s, i) => plain(`    ${dim(`${i + 1}.`)} ${s}`));
  }
  plain("");
}

function cmdServicesList(app) {
  if (app && !SERVICES[app]) die(`unknown app "${app}" — known: ${SERVICE_APPS.join(", ")}`);
  const apps = app ? [app] : SERVICE_APPS;
  const rows = [];
  for (const a of apps) {
    for (const v of SERVICES[a].variants) {
      rows.push({ id: `${a}@${v.id}`, app: SERVICES[a].label, cve: v.id, severity: v.severity, affected: v.affected, title: v.title });
    }
  }
  if (!isJson()) step(`${rows.length} service CVE lab(s)`);
  table(rows, [
    { key: "id", label: "ID", color: cyn }, { key: "affected", label: "AFFECTED" },
    { key: "severity", label: "SEV", color: (v) => (v === "critical" ? red(v) : ylw(v)) },
    { key: "title", label: "ISSUE" },
  ]);
  out(rows);
}

// ── deploy ───────────────────────────────────────────────────────────────────
async function cmdDeploy(id) {
  const entry = findEntry(id);
  if (!entry) die(`unknown lab "${id}" — try \`rtlab search ${id || ""}\``);
  if (!entry.deploy.available) {
    warn(`${entry.name} has no automated deploy yet.`);
    (entry.deploy.guidedSteps || []).forEach((s, i) => plain(`    ${dim(`${i + 1}.`)} ${s}`));
    die("nothing deployed");
  }

  let bindIp;
  try { bindIp = pickBindIp(flags.bind); } catch (e) { die(e.message); }

  const ttlMs = (() => { try { return parseTtl(flags.ttl ?? "4h"); } catch (e) { die(e.message); } })();
  const noEgress = !!flags["no-egress"] && !entry.isolation.requiresEgress;
  if (flags["no-egress"] && entry.isolation.requiresEgress) {
    warn(`${entry.name} needs outbound access — ignoring --no-egress`);
  }

  if (!DRY) {
    const free = await freeDiskGB(state.RT_HOME).catch(() => null);
    if (free !== null && free < MIN_FREE_GB) {
      die(`Only ${free}GB free (minimum ${MIN_FREE_GB}GB). Free space or set RTLAB_MIN_FREE_GB.`);
    }
  }

  await state.ensureDirs();
  const depId = `${slug(entry.id)}-${Math.random().toString(36).slice(2, 8)}`;
  const engine = engineFor(entry);

  if (!DRY) vulnerableBanner(entry.name);
  step(`${DRY ? "Planning" : "Deploying"} ${bold(entry.name)} ${dim(`(${entry.engine} · bind ${bindIp})`)}`);

  let res;
  try {
    res = await engine.deploy(entry, { id: depId, bindIp, noEgress, dryRun: DRY, onLog: logger });
  } catch (e) {
    die(`deploy failed: ${e.message}`);
  }

  if (DRY) {
    ok("Dry run — nothing was downloaded or started.");
    info(`deploy id   ${depId}`);
    info(`bind        ${bindIp}`);
    if (res.services?.length) info(`would expose ${res.services.map((s) => `${s.name}:${s.port}`).join(", ")}`);
    if (res.vagrantfile) { plain(""); plain(dim("  --- Vagrantfile ---")); res.vagrantfile.split("\n").forEach((l) => plain(`  ${dim(l)}`)); }
    if (res.spec) { plain(""); plain(dim("  --- resolved compose (ports rebound) ---")); plain(dim(JSON.stringify(res.spec, null, 2).split("\n").map((l) => `  ${l}`).join("\n"))); }
    return out({ dryRun: true, id: depId, entry: entry.id, bindIp, ...res });
  }

  const row = {
    id: depId, labId: entry.id, name: entry.name, engine: entry.engine,
    dir: res.dir, file: res.file, project: res.project, vmName: res.vmName,
    bindIp, privateIp: res.privateIp, services: res.services,
    status: res.status || "running", noEgress,
    createdAt: new Date().toISOString(),
    ttl: flags.ttl ?? "4h",
    expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null,
  };
  await state.add(row);

  if (res.ready === false) {
    warn("started, but the service port never answered.");
    if (res.hint) info(res.hint);
    else info("check `rtlab logs " + depId + "`");
  }
  else ok(`${entry.name} is up`);
  for (const s of res.services || []) if (s.url) info(`${s.name.padEnd(12)} ${s.url}`);
  info(`id ${depId}   ttl ${row.ttl}${row.expiresAt ? ` (expires ${fmtRemaining(row.expiresAt)})` : ""}`);
  if (noEgress) info("egress denied — this lab cannot reach the internet");
  out({ ok: true, ...row });
}

// ── lifecycle ────────────────────────────────────────────────────────────────
async function cmdStatus(id) {
  const rows = id ? [await state.get(id)].filter(Boolean) : await state.list();
  if (!rows.length) { if (!isJson()) info("no labs deployed"); return out([]); }
  const live = [];
  for (const r of rows) {
    const engine = r.engine === "vm" ? vagrantEngine : dockerEngine;
    const st = await engine.status(r).catch(() => ({ status: "unknown" }));
    live.push({
      id: r.id, lab: r.labId, status: st.status,
      url: (r.services || []).map((s) => s.url).filter(Boolean)[0] || (r.privateIp || ""),
      ttl: fmtRemaining(r.expiresAt),
    });
  }
  table(live, [
    { key: "id", label: "ID", color: cyn }, { key: "lab", label: "LAB" },
    { key: "status", label: "STATUS", color: statusColor },
    { key: "url", label: "ACCESS" }, { key: "ttl", label: "TTL", color: (v) => (v === "expired" ? red(v) : dim(v)) },
  ]);
  out(live);
}

async function cmdLifecycle(action, id) {
  const dep = await state.get(id);
  if (!dep) die(`no deployment "${id}" — see \`rtlab status\``);
  const engine = dep.engine === "vm" ? vagrantEngine : dockerEngine;
  step(`${action} ${dep.name} ${dim(dep.id)}`);
  try { await engine[action](dep, { onLog: logger }); }
  catch (e) { die(`${action} failed: ${e.message}`); }
  await state.update(dep.id, { status: action === "stop" ? "stopped" : "running" });
  ok(`${dep.name} ${action === "stop" ? "stopped" : "started"}`);
  out({ ok: true, id: dep.id, action });
}

async function destroyOne(dep) {
  const engine = dep.engine === "vm" ? vagrantEngine : dockerEngine;
  step(`destroying ${dep.name} ${dim(dep.id)}`);
  await engine.destroy(dep, { onLog: logger }).catch((e) => warn(`teardown warning: ${e.message}`));
  await state.remove(dep.id);
  ok(`${dep.name} destroyed`);
}

async function cmdDestroy(id) {
  if (flags.all) {
    const rows = await state.list();
    if (!rows.length) { info("nothing to destroy"); return; }
    if (!(await confirm(`Destroy ALL ${rows.length} lab(s)?`))) die("aborted");
    for (const r of rows) await destroyOne(r);
    return out({ ok: true, destroyed: rows.length });
  }
  const dep = await state.get(id);
  if (!dep) die(`no deployment "${id}" — see \`rtlab status\``);
  if (!(await confirm(`Destroy ${dep.name} (${dep.id})?`))) die("aborted");
  await destroyOne(dep);
  out({ ok: true, id: dep.id });
}

async function cmdReap() {
  const rows = await state.expired();
  if (!rows.length) { if (!isJson()) info("nothing expired"); return out({ reaped: 0 }); }
  step(`${rows.length} lab(s) past TTL`);
  for (const r of rows) await destroyOne(r);
  out({ reaped: rows.length, ids: rows.map((r) => r.id) });
}

async function cmdLogs(id) {
  const dep = await state.get(id);
  if (!dep) die(`no deployment "${id}" — see \`rtlab status\``);
  const engine = dep.engine === "vm" ? vagrantEngine : dockerEngine;
  const { cmd, args, cwd } = await engine.logs(dep, { follow: !!(flags.follow || flags.f) });
  const child = spawn(cmd, args, { cwd, stdio: "inherit" });
  child.on("close", (c) => process.exit(c ?? 0));
}

// ── interactive wizard ───────────────────────────────────────────────────────
async function cmdRun() {
  plain("");
  plain(`  ${bold("rtlab")} — interactive lab launcher`);
  plain("");
  const domains = [...DOMAINS, "service-cve"];
  domains.forEach((d, i) => plain(`    ${dim(`${i + 1}.`)} ${d}`));
  const dPick = await ask(`domain [1-${domains.length}]: `, "1");
  const domain = domains[Number(dPick) - 1] || domains[0];

  const entries = filterEntries({ domain }).filter((e) => e.deploy.available);
  if (!entries.length) die(`no auto-deployable labs in "${domain}"`);
  plain("");
  entries.forEach((e, i) => plain(`    ${dim(`${i + 1}.`)} ${e.name} ${dim(e.id)}`));
  const lPick = await ask(`lab [1-${entries.length}]: `, "1");
  const entry = entries[Number(lPick) - 1] || entries[0];

  plain("");
  const ips = candidateBindIps();
  ips.forEach((i, n) => plain(`    ${dim(`${n + 1}.`)} ${i.address} ${dim(`(${i.name} — ${i.hint})`)}`));
  const nPick = await ask(`bind address [1-${ips.length}]: `, "1");
  flags.bind = (ips[Number(nPick) - 1] || ips[0]).address;

  flags.ttl = await ask("ttl (30m/4h/24h/manual) [4h]: ", "4h");
  plain("");
  await cmdDeploy(entry.id);
}

// ── dispatch ─────────────────────────────────────────────────────────────────
const [cmd, a1, a2] = pos;
if (flags.help || flags.h || !cmd) { plain(HELP); process.exit(0); }

try {
  switch (cmd) {
    case "doctor": await cmdDoctor(); break;
    case "list": case "ls": cmdList(); break;
    case "search": cmdSearch(a1); break;
    case "info": case "show": cmdInfo(a1); break;
    case "catalog": out(allEntries()); if (!isJson()) info("use --json (this command is the integration contract)"); break;
    case "services":
      if (a1 === "deploy") await cmdDeploy(a2);
      else cmdServicesList(a1 === "list" ? a2 : a1);
      break;
    case "deploy": await cmdDeploy(a1); break;
    case "status": case "ps": await cmdStatus(a1); break;
    case "logs": await cmdLogs(a1); break;
    case "start": await cmdLifecycle("start", a1); break;
    case "stop": await cmdLifecycle("stop", a1); break;
    case "destroy": case "rm": await cmdDestroy(a1); break;
    case "reap": await cmdReap(); break;
    case "run": case "wizard": await cmdRun(); break;
    default: die(`unknown command "${cmd}" — see \`rtlab --help\``);
  }
} catch (e) {
  die(e?.message || String(e));
}
