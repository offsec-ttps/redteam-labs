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
import { has, capture, run } from "../src/run.mjs";
import * as state from "../src/state.mjs";
import { allEntries, findEntry, filterEntries, searchEntries, DOMAINS, SERVICES, SERVICE_APPS } from "../src/catalog/index.mjs";
import * as dockerEngine from "../src/engines/docker.mjs";
import * as vagrantEngine from "../src/engines/vagrant.mjs";
import * as terraformEngine from "../src/engines/terraform.mjs";
import * as spinnerEngine from "../src/engines/spinner.mjs";
import * as attackRangeEngine from "../src/engines/attackrange.mjs";
import * as remoteEngine from "../src/engines/remote.mjs";
import * as arcloudEngine from "../src/engines/arcloud.mjs";
import { normalizeRemote, checkRemote, PRESETS as REMOTE_PRESETS } from "../src/remote.mjs";
import * as vpn from "../src/remote-vpn.mjs";
import { writeFile as writeFileP } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as storage from "../src/storage.mjs";
import { parseLabEnvArgs, validateLabEnv } from "../src/labenv.mjs";
import * as agent from "../src/agent.mjs";
import { hostPreflight } from "../src/preflight.mjs";
import * as orphans from "../src/orphans.mjs";
import { placement } from "../src/placement.mjs";
import { installService, uninstallService } from "../src/service.mjs";
import { credsStatus, CREDS_FILE_PATH } from "../src/creds.mjs";

const BOOL = new Set(["--json", "--yes", "-y", "--no-color", "--help", "-h", "--all",
  "--dry-run", "--no-egress", "--follow", "-f", "--quiet", "--events", "--allow-low-resources", "--kali", "--domain", "--install-docker", "--private", "--purge", "--prune", "--remove-docker", "--destroy-cloud", "--zeek", "--soar", "--es"]);

function parseArgs(list) {
  const pos = []; const flags = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.startsWith("--") || (a.startsWith("-") && a.length === 2 && !/^-\d/.test(a))) {
      const key = a.replace(/^--?/, "");
      if (BOOL.has(a)) flags[key] = true;
      else if (key === "lab-env") { (flags[key] ||= []).push(list[i + 1]); i++; }     // repeatable: [lab:]KEY=VALUE
      else { flags[key] = list[i + 1]; i++; }
    } else pos.push(a);
  }
  return { pos, flags };
}

const { pos, flags } = parseArgs(process.argv.slice(2));
configureUi({ color: !flags["no-color"], json: flags.json, yes: flags.yes || flags.y });
const DRY = !!flags["dry-run"];
const MIN_FREE_GB = Number(process.env.RTLAB_MIN_FREE_GB || 10);

const ENGINES = { vm: vagrantEngine, terraform: terraformEngine, docker: dockerEngine, spinner: spinnerEngine, "attack-range": attackRangeEngine, remote: remoteEngine, arcloud: arcloudEngine };
const engineFor = (entry) => ENGINES[entry.engine] || dockerEngine;

/** `user@host[:port]` plus --ssh-key / --ssh-password-env / --bind -> a validated remote target (secrets are read, never stored). */
function remoteFromFlags(spec, saved = null) {
  const src = spec || saved?.spec;
  if (!src) die("a remote target is needed: --remote user@host[:port] with --ssh-key <file> or --ssh-password-env <VAR>");
  const m = String(src).match(/^(?:([^@]+)@)?([^:]+)(?::(\d+))?$/);
  if (!m) die("--remote expects user@host[:port]");
  const keyFile = flags["ssh-key"] || saved?.keyFile;
  const passwordEnv = flags["ssh-password-env"] || saved?.passwordEnv;
  if (passwordEnv && !process.env[passwordEnv]) die(`environment variable ${passwordEnv} (the SSH password) is not set`);
  try {
    return normalizeRemote({ host: m[2], port: m[3] || 22, username: m[1] || "root", label: flags.label || saved?.label || m[2],
      bindIp: flags.bind || saved?.bindIp || null, keyFile, password: passwordEnv ? process.env[passwordEnv] : undefined, passphrase: process.env.RTLAB_SSH_PASSPHRASE });
  } catch (e) { die(e.message); }
}
/** For stop/start/destroy/logs/status of a remote deployment: credentials come from flags, or the paths recorded at deploy time. */
function engineOpts(dep) {
  if (dep.engine !== "remote") return { onLog: logger };
  const given = flags.remote || flags["ssh-key"] || flags["ssh-password-env"];
  const saved = dep.remote?.spec && (dep.remote.keyFile ? existsSync(dep.remote.keyFile) : !!dep.remote.passwordEnv && !!process.env[dep.remote.passwordEnv]);
  if (!given && !saved) return { onLog: logger, remote: null };    // no credentials at hand (a runner-made deployment): act on the record only
  return { onLog: logger, remote: remoteFromFlags(flags.remote, dep.remote) };
}
const engineForDep = (dep) => ENGINES[dep.engine] || dockerEngine;
// --events: NDJSON progress on stderr, so a wrapper (the platform worker) can stream
// live logs while stdout stays reserved for the final --json result.
const logger = (raw) => {
  // Vagrant/box downloads emit carriage-return progress bars; keep the log readable.
  const line = String(raw).replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "").trim();
  if (!line || /^Progress:/.test(line)) return;
  if (flags.events) process.stderr.write(JSON.stringify({ t: new Date().toISOString(), level: "info", msg: line }) + "\n");
  else if (!isJson() && !flags.quiet) console.log(`    ${dim(line)}`);
};
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
  rtlab deploy splunk-attack-range [--windows 1] [--domain] [--linux 0] [--kali] [--memory 6144]
  rtlab services deploy <app>@<cve> [same flags]
  rtlab status [<id>]  ·  rtlab logs <id> [--follow]
  rtlab start <id>     ·  rtlab stop <id>
  rtlab destroy <id> | --all [--yes]
  rtlab reap                      ${dim("destroy TTL-expired labs (cron-friendly)")}

${bold("Spinner VM")} ${dim("(one VM, several lab containers inside)")}
  rtlab spinner deploy --os ubuntu|kali --labs a,b [--ttl 4h] [--no-egress]
                       [--cpus N] [--memory MB] [--kali-tools kali-tools-top10] [--dry-run] [--events]
                       [--storage <id>] [--allow-low-resources] [--lab-env [lab:]KEY=VALUE …]
  rtlab spinner bake <ubuntu|kali>  ${dim("prebuild a base box with Docker (faster deploys)")}
  rtlab remote check <user@host[:port]> (--ssh-key <file> | --ssh-password-env VAR) [--install-docker]
  rtlab remote deploy --labs a,b --remote user@host[:port] (--ssh-key <file> | --ssh-password-env VAR)
                      [--private | --bind <ip>] [--ttl 4h] [--no-egress] [--lab-env …]     container labs on your own VPS
  rtlab remote vpn setup | add-peer <name> [--out file] | remove-peer <name> | peers   (same --remote/--ssh-key flags)
  rtlab remote reset --remote … [--remove-docker] [--dry-run]   ${dim("revert what rtlab set up on a server (markers in /etc/rtlab)")}
                      WireGuard on the server; --private binds labs to its VPN address, students connect with their peer config

${bold("Storage & pre-flight")} ${dim("(put VM disks on a secondary drive)")}
  rtlab storage list
  rtlab storage add <id> <absolute-path> [--label "Samsung EVO"]
  rtlab storage remove <id>
  rtlab preflight [--labs a,b --os ubuntu --memory MB --cpus N] [--json]

${bold("Runner agent")} ${dim("(connect this machine to a RedTeam Labs control plane)")}
  ${dim("install on a fresh host:  curl -fsSL https://<your-app>/install.sh | sh")}
  rtlab agent enroll --url https://<your-app> --code <code> [--name lab-host]
  rtlab agent run                 ${dim("heartbeat + carry out deployments until Ctrl-C")}
  rtlab agent status | unenroll
  rtlab agent install-service     ${dim("run the runner as a systemd service that restarts on crash/reboot")}
  rtlab agent uninstall-service

${bold("Other")}
  rtlab doctor                    ${dim("prerequisites, bind addresses, free disk")}
  rtlab orphans [--prune]         ${dim("VMs / containers named after labs that have no record here")}
  rtlab deploy splunk-attack-range --provider aws|azure|gcp [--preset splunk_ad_aws | --windows N --linux N --kali --domain --zeek --soar --es] [--region/--location/--zone/--project]
  rtlab presets                   ${dim("the ready-made Attack Range shapes per cloud provider")}
  rtlab cloud apply <id> --yes    ${dim("create the planned cloud resources (billable); destroy: rtlab destroy <id> --destroy-cloud --yes")}
  rtlab cloud vpn <id>            ${dim("make an applied range VPN-only (WireGuard on the Splunk server; closes public ports)")}
  rtlab cloud vpn-peer <id> <name> [--out f]   ${dim("one WireGuard client config for a student; vpn-remove-peer <id> <name> revokes it")}
  rtlab creds                     ${dim("cloud credential status (never prints secrets)")}
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

// ── credentials ──────────────────────────────────────────────────────────────
async function cmdCreds() {
  step("Cloud credentials");
  const rows = await credsStatus();
  table(rows.map((r) => ({
    provider: r.label, present: r.present ? "yes" : "no",
    valid: r.valid ? "yes" : "no", detail: r.detail,
  })), [
    { key: "provider", label: "PROVIDER" },
    { key: "present", label: "SET", color: (v) => (v === "yes" ? grn(v) : dim(v)) },
    { key: "valid", label: "VALID", color: (v) => (v === "yes" ? grn(v) : red(v)) },
    { key: "detail", label: "IDENTITY / REASON" },
  ]);
  plain("");
  info(`Set them in the environment, or in ${CREDS_FILE_PATH}`);
  info('e.g. { "aws": { "AWS_ACCESS_KEY_ID": "…", "AWS_SECRET_ACCESS_KEY": "…", "AWS_REGION": "us-east-1" } }');
  info(dim("rtlab never stores or prints credential values — only the identity they resolve to."));
  out(rows);
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
  // Cloud labs run in the operator's account: vCPU/RAM and "egress" say nothing
  // useful about them, while the provider and the spend/exposure reality do.
  if (e.engine === "terraform") {
    info(`provider   ${e.provider || "aws"}          cost     billable resources in your own account`);
  } else if (e.imported) {
    // Imported from the research catalogue, which does not state sizing.
    info(`resources  not recorded — see the project's own docs`);
  } else {
    info(`resources  ${e.resources.cpus} vCPU · ${(e.resources.memoryMB / 1024).toFixed(1)}GB RAM · ${e.resources.diskGB}GB disk`);
  }
  info(`ATT&CK     ${e.attack.techniques.join(", ") || "—"}${e.sigmaPath ? `   sigma: ${e.sigmaPath}` : ""}`);
  info(e.engine === "terraform"
    ? "isolation  public endpoints by design — use a throwaway account and destroy when done"
    : `isolation  egress ${e.isolation.requiresEgress ? "required" : "not needed (use --no-egress)"}`);
  if (e.repo) info(`repo       ${e.repo}`);
  if (e.docsUrl) info(`docs       ${e.docsUrl}`);
  plain("");
  if (e.deploy.available && e.engine === "terraform") ok(`Plan it for free: rtlab deploy ${e.id}   ${dim("— rtlab plans; you approve the apply")}`);
  else if (e.deploy.available) ok(`Deployable: rtlab deploy ${e.id}`);
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

function cloudBanner(entry) {
  if (isJson()) return;
  plain("");
  plain(`  ${ylw("⚠")}  ${bold(entry.name)} runs in ${bold("your real cloud account")}.`);
  plain(`     ${dim(entry.engine === "attack-range" ? "It creates billable resources; access is private (the lab VPN), never the public addresses." : "It creates billable resources and, by design, public endpoints.")}`);
  plain(`     ${dim("rtlab will plan it for free and hand you the apply command — it never applies for you.")}`);
  plain("");
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

  const isCloud = entry.engine === "terraform";

  let bindIp = null;
  if (!isCloud) {
    try { bindIp = pickBindIp(flags.bind); } catch (e) { die(e.message); }
  }

  const ttlMs = (() => { try { return parseTtl(flags.ttl ?? "4h"); } catch (e) { die(e.message); } })();
  const noEgress = !isCloud && !!flags["no-egress"] && !entry.isolation.requiresEgress;
  if (!isCloud && flags["no-egress"] && entry.isolation.requiresEgress) {
    warn(`${entry.name} needs outbound access — ignoring --no-egress`);
  }
  if (isCloud && flags["no-egress"]) warn("cloud labs expose public endpoints by design — --no-egress does not apply");

  if (!DRY) {
    const free = await freeDiskGB(state.RT_HOME).catch(() => null);
    if (free !== null && free < MIN_FREE_GB) {
      die(`Only ${free}GB free (minimum ${MIN_FREE_GB}GB). Free space or set RTLAB_MIN_FREE_GB.`);
    }
  }

  await state.ensureDirs();
  const depId = `${slug(entry.id)}-${Math.random().toString(36).slice(2, 8)}`;
  // `--provider aws` on Splunk Attack Range picks the project's own cloud mode (plan now, apply explicitly later).
  const arCloud = entry.engine === "attack-range" && !!flags.provider;
  const engine = arCloud ? arcloudEngine : engineFor(entry);

  if (isCloud) cloudBanner(entry);
  else if (!DRY) vulnerableBanner(entry.name);
  step(`${isCloud ? "Planning" : DRY ? "Planning" : "Deploying"} ${bold(entry.name)} `
    + dim(isCloud ? `(terraform · ${entry.provider || "aws"})` : `(${entry.engine} · bind ${bindIp})`));

  let res;
  try {
    // Engine-specific choices (Attack Range: how many Windows/Linux hosts, a DC, a Kali box, Splunk RAM).
    const options = { windows: flags.windows, linux: flags.linux, kali: !!flags.kali || undefined, createDomain: !!flags.domain || undefined, splunkMemoryMB: flags.memory, splunkCpus: flags.cpus,
      provider: flags.provider, region: flags.region, preset: flags.preset, zeek: !!flags.zeek || undefined, soar: !!flags.soar || undefined, installEs: !!flags.es || undefined,
      location: flags.location, zone: flags.zone, projectId: flags.project };
    let labEnv = null;
    try { const given = parseLabEnvArgs(flags["lab-env"]); labEnv = validateLabEnv(entry, { ...(given[""] || {}), ...(given[entry.id] || {}) }); }
    catch (e) { die(e.message); }
    res = await engine.deploy(entry, { id: depId, bindIp, noEgress, dryRun: DRY, onLog: logger, options, labEnv });
  } catch (e) {
    die(`deploy failed: ${e.message}`);
  }

  if (res.planned) {
    await state.ensureDirs();
    const row = {
      id: depId, labId: entry.id, name: entry.name, engine: res.engine || entry.engine,
      dir: res.dir, tfDir: res.tfDir, provider: res.provider, ...(res.extra || {}),
      services: res.services || [], status: "planned", createdAt: new Date().toISOString(),
      ttl: flags.ttl ?? "manual", expiresAt: null,
    };
    await state.add(row);
    plain("");
    ok("Plan complete — no cloud resources were created, nothing has been billed.");
    info(`account     ${res.identity}`);
    if (res.plan) info(`plan        ${res.plan.add} to add · ${res.plan.change} to change · ${res.plan.destroy} to destroy`);
    info(`id          ${depId}`);
    plain("");
    warn(res.extra?.vpnOnly
      ? "Applying creates BILLABLE resources. Access stays private: only this machine is admitted during the build, then only the lab VPN. Review the plan above, then run:"
      : "Applying creates BILLABLE resources with PUBLIC endpoints. Review the plan above, then run:");
    plain(`    ${cyn(res.applyCmd)}`);
    info("when you are done, tear it down to stop the spend:");
    plain(`    ${cyn(res.destroyCmd)}`);
    plain("");
    info(dim("rtlab deliberately does not apply for you — cloud spend stays a human decision."));
    const { access: _a, keyFile: _k, ...pub } = row;   // the range password and key path stay local
    return out({ ok: true, planned: true, ...pub, identity: res.identity, plan: res.plan, applyCmd: res.applyCmd, destroyCmd: res.destroyCmd, instances: res.extra?.instances });
  }

  if (DRY) {
    ok("Dry run — nothing was downloaded or started.");
    info(`deploy id   ${depId}`);
    info(`bind        ${bindIp}`);
    if (res.services?.length) info(`would expose ${res.services.map((s) => `${s.name}:${s.port}`).join(", ")}`);
    if (res.vagrantfile) { plain(""); plain(dim("  --- Vagrantfile ---")); res.vagrantfile.split("\n").forEach((l) => plain(`  ${dim(l)}`)); }
    if (res.config) { plain(""); plain(dim("  --- attack_range.yml ---")); res.config.split("\n").forEach((l) => plain(`  ${dim(l)}`)); if (res.instances) info(`instances: ${res.instances.list.map((i) => `${i.name} (${i.type})`).join(", ")} ≈ $${res.instances.usdPerHour}/hour on-demand`); }
    if (res.spec) { plain(""); plain(dim("  --- resolved compose (ports rebound) ---")); plain(dim(JSON.stringify(res.spec, null, 2).split("\n").map((l) => `  ${l}`).join("\n"))); }
    return out({ dryRun: true, id: depId, entry: entry.id, bindIp, ...res });
  }

  const row = {
    id: depId, labId: entry.id, name: entry.name, engine: entry.engine,
    dir: res.dir, file: res.file, project: res.project, vmName: res.vmName, vagrantDir: res.vagrantDir, vboxNames: res.vboxNames, access: res.access, options: res.options,
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


// ── spinner (one VM, many lab containers) ────────────────────────────────────
// ── remote (VPS over SSH) ────────────────────────────────────────────────────
async function cmdRemoteCheck(spec) {
  const remote = remoteFromFlags(spec);
  step(`checking ${remote.username}@${remote.host}:${remote.port}`);
  let r;
  try { r = await checkRemote(remote, { onLog: logger, installDocker: !!flags["install-docker"] }); } catch (e) { die(e.message); }
  ok(`reachable: ${r.os}`); info(`docker      ${r.dockerVersion}${r.composeVersion ? ` · compose ${r.composeVersion}` : ""}`);
  if (r.fingerprint) info(`host key    ${r.fingerprint.slice(0, 60)}…`);
  out({ ok: true, ...r });
}

async function cmdRemoteVpn(sub, arg) {
  const remote = remoteFromFlags(flags.remote);
  const opts = { address: flags.address || vpn.DEFAULTS.address, network: flags.network || vpn.DEFAULTS.network, port: flags["vpn-port"] ? Number(flags["vpn-port"]) : vpn.DEFAULTS.port, sshPort: remote.port };
  const runIt = async (script, timeout) => { const o = await vpn.runOnServer(remote, script, { timeout }).catch((e) => die(e.message)); if (o === null) die("the server script failed; re-run with RTLAB_DEBUG=1 to see its output"); return o; };
  if (sub === "setup") {
    step(`setting up WireGuard on ${remote.host}: ${opts.address} on ${opts.network}, UDP ${opts.port}; firewall admits only SSH ${remote.port}/tcp and the VPN`);
    const text = await runIt(vpn.setupScript(opts), 900_000);
    const kv = Object.fromEntries(text.split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => l.split("=")));
    ok("VPN is up"); info(`server key   ${kv.SERVER_PUB || "?"}`); info(`endpoint     ${kv.PUBLIC_IP || remote.host}:${opts.port}`); info(`labs bind to ${opts.address} (deploy with --private)`);
    return out({ ok: true, address: opts.address, network: opts.network, port: opts.port, serverPublicKey: kv.SERVER_PUB, endpoint: `${kv.PUBLIC_IP || remote.host}:${opts.port}` });
  }
  if (sub === "add-peer") {
    const name = arg || flags.name; if (!name) die("usage: rtlab remote vpn add-peer <name> --remote … --ssh-key …");
    let script; try { script = vpn.addPeerScript({ ...opts, name, endpoint: flags.endpoint || null }); } catch (e) { die(e.message); }
    const text = await runIt(script, 120_000);
    const cfg = text.slice(text.indexOf("[Interface]"));
    if (flags.out) { await writeFileP(flags.out, cfg + "\n", { mode: 0o600 }); ok(`client config for ${name} written to ${flags.out} (import it into WireGuard; it is shown only once)`); }
    else { ok(`client config for ${name} (shown once; save it as ${name}.conf and import it into WireGuard)`); plain(""); plain(cfg); plain(""); }
    return out({ ok: true, name, config: cfg });
  }
  if (sub === "remove-peer") { const name = arg || flags.name; if (!name) die("usage: rtlab remote vpn remove-peer <name>"); let sc; try { sc = vpn.removePeerScript({ name }); } catch (e) { die(e.message); } ok(await runIt(sc, 60_000)); return out({ ok: true, name }); }
  if (sub === "peers" || sub === "status") { const text = await runIt(vpn.peersScript(), 60_000); plain(text); return out({ ok: true, text }); }
  die("usage: rtlab remote vpn setup | add-peer <name> [--out file] | remove-peer <name> | peers   (with --remote user@host[:port] and --ssh-key/--ssh-password-env)");
}

/** `rtlab remote reset`: revert what rtlab set up on a server (VPN + firewall, and Docker with --remove-docker), by its markers. */
async function cmdRemoteReset() {
  const remote = remoteFromFlags(flags.remote);
  step(`checking what BreakPoint set up on ${remote.host}`);
  const facts = await checkRemote(remote, { onLog: logger }).catch((e) => die(e.message));
  const plan = vpn.resetPlan(facts.installedByRtlab, { removeDocker: !!flags["remove-docker"] });
  if (!plan.length) { info("nothing was set up by rtlab on this server (no markers in /etc/rtlab)"); return out({ ok: true, plan: [], removed: [] }); }
  for (const x of plan) plain(`  ${x.kept ? dim("keep  ") : "revert"} ${x.what}: ${x.detail}`);
  if (flags["dry-run"]) return out({ ok: true, dryRun: true, plan });
  const labs = (await state.list()).filter((r) => r.engine === "remote" && r.remote?.host === remote.host);
  if (labs.length) die(`${labs.length} lab(s) still recorded on ${remote.host} (${labs.map((l) => l.id).join(", ")}); destroy them first`);
  if (!(await confirm(`Revert the items above on ${remote.host}?`))) die("aborted");
  const text = await vpn.runOnServer(remote, vpn.resetScript({ removeDocker: !!flags["remove-docker"], sshPort: remote.port }), { timeout: 900_000, onLog: logger }).catch((e) => die(e.message));
  if (text === null) die("the reset script failed on the server; re-run with RTLAB_DEBUG=1");
  const removed = text.split("\n").filter((l) => /^(REMOVED|KEPT) /.test(l));
  for (const l of removed) info(l.toLowerCase());
  ok(`${remote.host} reset`);
  out({ ok: true, plan, removed: removed.filter((l) => l.startsWith("REMOVED ")).map((l) => l.slice(8)), kept: removed.filter((l) => l.startsWith("KEPT ")).map((l) => l.slice(5)) });
}

async function cmdRemoteDeploy() {
  const ids = String(flags.labs || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!ids.length) die("usage: rtlab remote deploy --labs <lab-id>[,…] --remote user@host[:port] (--ssh-key <file> | --ssh-password-env <VAR>) [--bind <ip>]");
  const entries = ids.map((i) => findEntry(i) || die(`unknown lab "${i}" — try \`rtlab search ${i}\``));
  for (const e of entries) if (e.engine !== "docker" || !e.deploy.available) die(`"${e.id}" is not a container lab; a server runs container labs only`);
  if (flags.private && !flags.bind) flags.bind = flags.address || vpn.DEFAULTS.address;   // --private: listen on the VPN address only
  const remote = remoteFromFlags(flags.remote);
  const ttlMs = (() => { try { return parseTtl(flags.ttl ?? "4h"); } catch (e) { die(e.message); } })();
  const noEgress = !!flags["no-egress"] && entries.every((e) => !e.isolation.requiresEgress);
  const labEnv = {};
  try {
    const given = parseLabEnvArgs(flags["lab-env"]);
    for (const slug of Object.keys(given)) if (slug && !entries.some((e) => e.id === slug)) throw new Error(`--lab-env names "${slug}", which is not among the labs being deployed`);
    if (given[""] && entries.length > 1) throw new Error("with several labs, prefix each --lab-env with the lab id (lab-id:KEY=VALUE)");
    for (const e of entries) { const env = validateLabEnv(e, { ...(entries.length === 1 ? given[""] || {} : {}), ...(given[e.id] || {}) }); if (Object.keys(env).length) labEnv[e.id] = env; }
  } catch (e) { die(e.message); }
  if (!DRY) {
    await state.ensureDirs();
    vulnerableBanner(entries.map((e) => e.name).join(", "));
    if (remote.bindIp && remote.bindIp !== remote.host) info(`the labs will listen on ${remote.bindIp} only (private; reachable through the VPN)`);
    else warn(`the labs will listen on ${remote.host}; a server on the internet exposes them to everyone unless it is firewalled (use --private after \`rtlab remote vpn setup\`)`);
  }
  const depId = `remote-${Math.random().toString(36).slice(2, 8)}`;
  step(`${DRY ? "Planning" : "Deploying"} ${entries.map((e) => e.id).join(", ")} on ${bold(remote.label)} ${dim(`(${remote.username}@${remote.host}:${remote.port})`)}`);
  let res;
  try { res = await remoteEngine.deploy(entries, { id: depId, remote, noEgress, dryRun: DRY, onLog: logger, labEnv, installDocker: !!flags["install-docker"] }); }
  catch (e) { die(`deploy failed: ${e.message}`); }
  if (DRY) { ok("Dry run — nothing was started on the server."); return out({ dryRun: true, id: depId, ...res }); }
  const row = {
    id: depId, labId: entries.map((e) => e.id).join(","), name: `remote (${remote.label})`, engine: "remote",
    dir: res.dir, bindIp: res.bindIp, labs: res.labs, services: res.services, noEgress,
    remote: { host: remote.host, port: remote.port, username: remote.username, label: remote.label, bindIp: res.bindIp, spec: `${remote.username}@${remote.host}:${remote.port}`,
      keyFile: remote.auth.kind === "keyfile" && !remote.auth.keyFile.includes("/rtlab-ssh-") ? remote.auth.keyFile : null, passwordEnv: flags["ssh-password-env"] || null, fingerprint: res.fingerprint || null },
    status: res.status, createdAt: new Date().toISOString(),
    ttl: flags.ttl ?? "4h", expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null,
  };
  await state.add(row);
  if (res.ready === false) warn("started, but the first service port never answered from the server itself");
  else ok("labs are up on the server");
  for (const s of res.services) info(`${String(s.lab).padEnd(14)} ${s.url}`);
  info(`id ${depId}   ttl ${row.ttl}${row.expiresAt ? ` (expires ${fmtRemaining(row.expiresAt)})` : ""}`);
  out({ ok: true, ...row });
}

async function cmdSpinnerDeploy() {
  const os = flags.os || "ubuntu";
  const ids = String(flags.labs || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!ids.length) die("usage: rtlab spinner deploy --os ubuntu|kali --labs <lab-id>[,<lab-id>…]");
  const entries = ids.map((i) => findEntry(i) || die(`unknown lab "${i}" — try \`rtlab search ${i}\``));
  const ttlMs = (() => { try { return parseTtl(flags.ttl ?? "4h"); } catch (e) { die(e.message); } })();
  const num = (v, name) => { if (v === undefined) return undefined; const n = Number(v); if (!Number.isInteger(n) || n <= 0) die(`--${name} must be a positive integer`); return n; };
  const noEgress = !!flags["no-egress"] && entries.every((e) => !e.isolation.requiresEgress);
  let store; try { store = storage.resolve(flags.storage); } catch (e) { die(e.message); }
  if (flags["no-egress"] && !noEgress) warn("a selected lab needs outbound access — ignoring --no-egress");

  if (!DRY) {
    await state.ensureDirs();
    vulnerableBanner(entries.map((e) => e.name).join(", "));
  }
  const depId = `spinner-${Math.random().toString(36).slice(2, 8)}`;
  step(`${DRY ? "Planning" : "Deploying"} spinner ${bold(os)} with ${entries.map((e) => e.id).join(", ")}`);

  // Per-lab options (`--lab-env [lab:]KEY=VALUE`), validated against what each entry declares.
  const labEnv = {};
  try {
    const given = parseLabEnvArgs(flags["lab-env"]);
    for (const slug of Object.keys(given)) if (slug && !entries.some((e) => e.id === slug)) throw new Error(`--lab-env names "${slug}", which is not among the labs being deployed`);
    if (given[""] && entries.length > 1) throw new Error("with several labs, prefix each --lab-env with the lab id (lab-id:KEY=VALUE)");
    for (const e of entries) {
      const env = validateLabEnv(e, { ...(entries.length === 1 ? given[""] || {} : {}), ...(given[e.id] || {}) });
      if (Object.keys(env).length) labEnv[e.id] = env;
    }
  } catch (e) { die(e.message); }

  let res;
  try {
    res = await spinnerEngine.deploy(entries, {
      id: depId, os, noEgress, dryRun: DRY, kaliTools: flags["kali-tools"], storage: store,
      allowLowResources: !!flags["allow-low-resources"],
      cpus: num(flags.cpus, "cpus"), memoryMB: num(flags.memory, "memory"), onLog: logger, labEnv,
    });
  } catch (e) { die(`deploy failed: ${e.message}`); }

  if (DRY) {
    ok("Dry run — nothing was downloaded or started.");
    info(`vm          ${res.box} · ${res.cpus} vCPU · ${res.memoryMB}MB · ~${res.diskGB}GB disk · ${res.privateIp}`);
    info(`storage     ${res.storage.id} (${res.storage.label})`);
    if (!isJson()) { plain(""); plain(dim("  --- Vagrantfile ---")); res.vagrantfile.split("\n").forEach((l) => plain(`  ${dim(l)}`)); }
    return out({ dryRun: true, id: depId, ...res });
  }

  const row = {
    id: depId, labId: entries.map((e) => e.id).join(","), name: `spinner (${os})`, engine: "spinner",
    dir: res.dir, vmName: res.vmName, vmDir: res.vmDir, storageId: res.storageId, os, privateIp: res.privateIp, spinnerNet: res.spinnerNet,
    labs: res.labs, services: res.services, access: res.access, noEgress,
    status: res.status, createdAt: new Date().toISOString(),
    ttl: flags.ttl ?? "4h", expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null,
  };
  await state.add(row);
  if (res.ready === false) warn("started, but the first service port never answered — check `rtlab logs " + depId + "`");
  else ok("spinner is up");
  info(`vm          ${res.privateIp}   ${res.access.ssh}`);
  for (const s of res.services) info(`${String(s.lab).padEnd(14)} ${s.url}`);
  info(`id ${depId}   ttl ${row.ttl}${row.expiresAt ? ` (expires ${fmtRemaining(row.expiresAt)})` : ""}`);
  out({ ok: true, ...row });
}

async function cmdSpinnerBake(os) {
  if (!os) die("usage: rtlab spinner bake <ubuntu|kali>");
  step(`Baking spinner base box for ${os} (one-off, several minutes)`);
  try { const r = await spinnerEngine.bake(os, { onLog: logger }); ok(`baked ${r.baked}`); out({ ok: true, ...r }); }
  catch (e) { die(`bake failed: ${e.message}`); }
}

// ── storage + pre-flight ─────────────────────────────────────────────────────
async function cmdStorage(sub, a, b) {
  if (sub === "add") {
    if (!a || !b) die('usage: rtlab storage add <id> <absolute-path> [--label "Name"]');
    try { const r = storage.add({ id: a, path: b, label: flags.label }); ok(`storage "${r.id}" -> ${r.path}`); return out({ ok: true, ...r }); }
    catch (e) { die(e.message); }
  }
  if (sub === "remove" || sub === "rm") {
    if (!a) die("usage: rtlab storage remove <id>");
    try { storage.remove(a); ok(`removed "${a}" (existing deployments on it are not touched)`); return out({ ok: true }); }
    catch (e) { die(e.message); }
  }
  const rows = [];
  for (const l of storage.locations()) {
    const d = await storage.diskInfo(l.path);
    rows.push({ id: l.id, label: l.label, path: l.path, free: d.freeGB == null ? "?" : `${d.freeGB}GB`, total: d.totalGB == null ? "?" : `${d.totalGB}GB`, status: l.usable ? "ok" : `UNUSABLE: ${l.reason}` });
  }
  table(rows, [{ key: "id", label: "ID", color: cyn }, { key: "label", label: "LABEL" }, { key: "path", label: "PATH" },
    { key: "free", label: "FREE" }, { key: "total", label: "TOTAL" }, { key: "status", label: "STATUS", color: (v) => (v === "ok" ? grn(v) : red(v)) }]);
  out(rows);
}

async function cmdPreflight() {
  const host = await hostPreflight();
  let sizing = null;
  if (flags.labs) {
    const entries = String(flags.labs).split(",").map((i) => findEntry(i.trim()) || die(`unknown lab "${i}"`));
    const num = (v) => (v === undefined ? undefined : Number(v));
    sizing = spinnerEngine.sizing(entries, { memoryMB: num(flags.memory), cpus: num(flags.cpus) });
  }
  if (!isJson()) {
    step("Host");
    info(`cpus ${host.cpus} · memory ${host.memory.availableMB}MB available of ${host.memory.totalMB}MB · running VMs ${host.runningVms ?? "?"}`);
    for (const [k, v] of Object.entries(host.tools)) (v ? ok : warn)(`${k}: ${v === true ? "yes" : v || "MISSING"}`);
    step("Storage");
    await cmdStorage("list");
    if (host.dockerRoot) info(`docker images live in ${host.dockerRoot.path} (${host.dockerRoot.freeGB}GB free)`);
    if (sizing) info(`this deployment needs ~${sizing.memoryMB}MB RAM, ${sizing.cpus} vCPU, ~${sizing.diskGB}GB disk`);
  }
  out({ host, sizing });
}

// ── runner agent ─────────────────────────────────────────────────────────────
async function cmdAgent(sub) {
  if (sub === "enroll") {
    if (!flags.url || !flags.code) die("usage: rtlab agent enroll --url https://<your-app>.lovable.app --code <one-time code> [--name laptop]");
    if (await agent.loadConfig() && !flags.yes) die("this machine is already enrolled. Run `rtlab agent unenroll` first (or pass --yes to replace it).");
    try {
      const cfg = await agent.enroll({ url: flags.url, code: flags.code, name: flags.name });
      ok(`enrolled as "${cfg.name}" (runner ${cfg.runnerId})`);
      info(`control plane  ${cfg.controlUrl}`);
      info("start it with:  rtlab agent run");
      return out({ ok: true, runnerId: cfg.runnerId, controlUrl: cfg.controlUrl });
    } catch (e) { die(`enrollment failed: ${e.message}`); }
  }
  if (sub === "status") {
    const cfg = await agent.loadConfig();
    if (!cfg) { info("not enrolled. Run `rtlab agent enroll`."); return out({ enrolled: false }); }
    info(`enrolled as "${cfg.name}" (runner ${cfg.runnerId}) since ${cfg.enrolledAt}`);
    info(`control plane  ${cfg.controlUrl}`);
    return out({ enrolled: true, name: cfg.name, runnerId: cfg.runnerId, controlUrl: cfg.controlUrl, enrolledAt: cfg.enrolledAt });
  }
  if (sub === "unenroll") {
    await agent.unenroll(); ok("this machine is no longer enrolled (revoke the runner in the web app too)");
    return out({ ok: true });
  }
  if (sub === "run") {
    const cfg = await agent.loadConfig();
    if (!cfg) die("not enrolled. Run `rtlab agent enroll --url ... --code ...` first.");
    const a = new agent.Agent(cfg);
    let hits = 0;
    process.on("SIGINT", () => { if (++hits > 1) process.exit(130); a.say("stopping after the current job (Ctrl-C again to quit now)"); a.stop(); });
    process.on("SIGTERM", () => a.stop());
    a.say(`runner "${cfg.name}" connected to ${cfg.controlUrl}`);
    try { await a.run(); } catch (e) { die(e.message, 2); }
    return;
  }
  if (sub === "install-service") { const r = await installService({ onLog: logger }).catch((e) => die(e.message)); ok(`installed ${r.unit} (${r.scope}); it is running now and restarts on crash or reboot`); return out({ ok: true, ...r }); }
  if (sub === "uninstall-service") { const r = await uninstallService({ onLog: logger }).catch((e) => die(e.message)); ok(`removed ${r.unit}`); return out({ ok: true, ...r }); }
  die("usage: rtlab agent enroll|run|status|unenroll|install-service|uninstall-service");
}

// ── lifecycle ────────────────────────────────────────────────────────────────
async function cmdStatus(id) {
  const rows = id ? [await state.get(id)].filter(Boolean) : await state.list();
  if (!rows.length) { if (!isJson()) info("no labs deployed"); return out([]); }
  const live = [];
  for (const r of rows) {
    const engine = engineForDep(r);
    const st = await engine.status(r, engineOpts(r)).catch(() => ({ status: "unknown" }));
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
  const engine = engineForDep(dep);
  step(`${action} ${dep.name} ${dim(dep.id)}`);
  try { await engine[action](dep, engineOpts(dep)); }
  catch (e) { die(`${action} failed: ${e.message}`); }
  await state.update(dep.id, { status: action === "stop" ? "stopped" : "running" });
  ok(`${dep.name} ${action === "stop" ? "stopped" : "started"}`);
  out({ ok: true, id: dep.id, action });
}

async function destroyOne(dep) {
  const engine = engineForDep(dep);
  step(`destroying ${dep.name} ${dim(dep.id)}${flags.purge ? dim(" (purge: images too)") : ""}`);
  let failed = null;
  const removed = await engine.destroy(dep, { ...engineOpts(dep), purge: !!flags.purge, destroyCloud: !!flags["destroy-cloud"] }).catch((e) => { failed = e; return null; });
  // A cloud engine refuses to drop a record while resources still bill; honour that instead of losing the only pointer to them.
  if (failed && (dep.engine === "terraform" || dep.engine === "arcloud")) die(failed.message);
  if (failed) warn(`teardown warning: ${failed.message}`);
  await state.remove(dep.id);
  ok(`${dep.name} destroyed`);
  return removed || null;
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
  if (!dep && flags.remote && /^remote-/.test(String(id))) {
    // The local record is gone (reaped by an older runner, or a fresh machine) but the control plane still knows the
    // id: clean the server by Compose project label so nothing keeps running there.
    if (!(await confirm(`No local record for ${id}; remove its containers from ${flags.remote}?`))) die("aborted");
    step(`cleaning ${id} on ${flags.remote} ${dim("(no local record)")}`);
    const removed = await remoteEngine.destroyOrphan(id, { remote: remoteFromFlags(flags.remote), onLog: logger }).catch((e) => die(`cleanup failed: ${e.message}`));
    ok(`${id} removed from the server`);
    return out({ ok: true, id, orphan: true, removed });
  }
  if (!dep && /^[a-z0-9][a-z0-9-]{0,48}-[a-z0-9]{4,12}$/.test(String(id))) {
    // No record on this machine: delete the VMs and local Compose projects that carry this id in their name (exact
    // rtlab naming only), so a lost state file never leaves a lab running.
    const found = { vms: orphans.vboxNamesFor(id, (await orphans.listVboxVms()) || []), projects: ((await orphans.listLocalProjects()) || []).filter((p) => p === `rtlab-${id}` || p.startsWith(`rtlab-${id}-`)) };
    if (!found.vms.length && !found.projects.length) die(`no deployment "${id}" — see \`rtlab status\` (and nothing with that id in VirtualBox or Docker)`);
    if (!(await confirm(`No local record for ${id}; delete ${found.vms.length} VM(s) and ${found.projects.length} Compose project(s) named after it?`))) die("aborted");
    step(`cleaning ${id} ${dim("(no local record)")}`);
    const removed = await orphans.destroyLocalOrphan(id, { onLog: logger });
    ok(`${id} removed from this machine`);
    return out({ ok: true, id, orphan: true, removed });
  }
  if (!dep) die(`no deployment "${id}" — see \`rtlab status\``);
  if (!(await confirm(`Destroy ${dep.name} (${dep.id})?`))) die("aborted");
  const removed = await destroyOne(dep);
  out({ ok: true, id: dep.id, ...(removed && typeof removed === "object" ? { removed } : {}) });
}

const CLOUD_USAGE = "usage: rtlab cloud apply <id> --yes | vpn <id> [--yes] | vpn-peer <id> <name> [--out file] | vpn-remove-peer <id> <name>   (destroy with: rtlab destroy <id> --destroy-cloud --yes)";
/** `rtlab cloud …`: the explicit, billable apply of a planned cloud lab or range, and the range's private VPN. */
async function cmdCloud(sub, id, name) {
  if (!["apply", "vpn", "vpn-peer", "vpn-remove-peer"].includes(sub)) die(CLOUD_USAGE);
  const dep = await state.get(id);
  if (!dep) die(`no deployment "${id}" — see \`rtlab status\``);
  const engine = engineForDep(dep);
  const vpnFacts = (res) => ({ vpn: res.vpn || null, vpnOnly: !!res.vpnOnly, vpnError: res.vpnError || null });
  if (sub === "apply") {
    if (typeof engine.apply !== "function") die(`${dep.name} is not a planned cloud lab`);
    if (dep.status !== "planned") die(`${dep.name} is ${dep.status}, not planned`);
    warn(`Applying creates BILLABLE resources in your cloud account.${dep.vpnOnly ? " Access is private: the range admits only this machine until its VPN gateway is up, then only the VPN." : " Terraform labs expose PUBLIC endpoints by design."}`);
    if (!(await confirm(`Apply ${dep.name} (${dep.id}) now?`))) die("aborted");
    step(`applying ${dep.name} ${dim(dep.id)}`);
    let res;
    try { res = await engine.apply(dep, { onLog: logger }); } catch (e) { die(`apply failed: ${e.message} (resources may exist: check with \`rtlab status\` and destroy with --destroy-cloud)`); }
    await state.update(dep.id, { status: res.status || "running", services: res.services || [], access: res.access || dep.access || null, outputs: res.outputs || null, instances: res.instances || null, appliedAt: new Date().toISOString(), ...vpnFacts(res) });
    ok(`${dep.name} applied`);
    if (res.vpn) { ok(`VPN-only: WireGuard endpoint ${res.vpn.endpoint}; add students with \`rtlab cloud vpn-peer ${dep.id} <name>\``); }
    else if (res.vpnError) warn(`VPN gateway not set up: ${res.vpnError} — retry with \`rtlab cloud vpn ${dep.id}\``);
    for (const s of res.services || []) if (s.url) info(`${s.name.padEnd(12)} ${s.url}${res.vpn ? dim("  (via VPN)") : ""}`);
    return out({ ok: true, id: dep.id, status: res.status || "running", services: res.services || [], access: res.access || null, instances: res.instances || null, outputs: res.outputs || null, ...vpnFacts(res) });
  }
  if (typeof engine.vpnEnable !== "function") die(`${dep.name} has no private VPN mode (only Attack Range on AWS today)`);
  if (sub === "vpn") {
    if (!["running", "starting"].includes(dep.status)) die(`${dep.name} is ${dep.status}; apply it first`);
    info("This sets up WireGuard on the Splunk server and closes every security-group port that is open to the internet (the VPN port stays open; the runner keeps SSH/WinRM/Splunk-API).");
    if (!(await confirm(`Make ${dep.name} (${dep.id}) VPN-only now?`))) die("aborted");
    step(`VPN gateway for ${dep.name} ${dim(dep.id)}`);
    let res;
    try { res = await engine.vpnEnable(dep, { onLog: logger }); } catch (e) { die(`VPN setup failed: ${e.message}`); }
    await state.update(dep.id, { services: res.services, access: res.access, instances: res.instances, ...vpnFacts(res) });
    ok(`${dep.name} is VPN-only: endpoint ${res.vpn.endpoint}, clients route ${res.vpn.routes.join(", ")}`);
    for (const s of res.services || []) if (s.url) info(`${s.name.padEnd(12)} ${s.url}${dim("  (via VPN)")}`);
    return out({ ok: true, id: dep.id, status: dep.status, services: res.services, access: res.access, instances: res.instances, securityGroups: res.securityGroups, ...vpnFacts(res) });
  }
  if (!name) die(CLOUD_USAGE);
  if (sub === "vpn-peer") {
    let res;
    try { res = await engine.vpnPeer(dep, name, { onLog: logger }); } catch (e) { die(e.message); }
    if (flags.out) { await writeFileP(flags.out, res.config + "\n", { mode: 0o600 }); ok(`client config for ${name} written to ${flags.out} (import it into WireGuard; it is shown only once)`); }
    else if (!isJson()) { ok(`client config for ${name} (shown once; save it as ${name}.conf and import it into WireGuard)`); plain(""); plain(res.config); plain(""); }
    return out({ ok: true, id: dep.id, name, address: res.address, config: res.config });
  }
  let res;
  try { res = await engine.vpnRemovePeer(dep, name, { onLog: logger }); } catch (e) { die(e.message); }
  ok(`peer ${res.name} removed`);
  out({ ok: true, id: dep.id, name: res.name });
}

/** `rtlab orphans [--prune]`: VMs / Compose projects that look like rtlab's but have no record. */
async function cmdOrphans() {
  const o = await orphans.findOrphans();
  if (!o.vms.length && !o.projects.length) { if (!isJson()) info(`no orphans${o.virtualbox ? "" : " (VirtualBox not installed)"}${o.docker ? "" : " (Docker not usable)"}`); return out({ ...o, pruned: null }); }
  for (const v of o.vms) plain(`  VM       ${v}`);
  for (const p of o.projects) plain(`  project  ${p}`);
  if (!flags.prune) { info("run with --prune to delete them"); return out({ ...o, pruned: null }); }
  if (!(await confirm(`Delete ${o.vms.length} VM(s) and ${o.projects.length} project(s)?`))) die("aborted");
  const pruned = { vms: [], projects: [] };
  for (const v of o.vms) { await run("VBoxManage", ["controlvm", v, "poweroff"], { timeout: 60_000 }).catch(() => {}); await run("VBoxManage", ["unregistervm", v, "--delete"], { timeout: 300_000, onLog: logger }).then(() => pruned.vms.push(v)).catch((e) => warn(`could not delete ${v}: ${e.message}`)); }
  for (const p of o.projects) await orphans.destroyLocalProject(p, { onLog: logger }).then(() => pruned.projects.push(p)).catch((e) => warn(`could not remove ${p}: ${e.message}`));
  ok(`pruned ${pruned.vms.length} VM(s), ${pruned.projects.length} project(s)`);
  out({ ...o, pruned });
}

async function cmdReap() {
  const rows = await state.expired();
  if (!rows.length) { if (!isJson()) info("nothing expired"); return out({ reaped: 0 }); }
  step(`${rows.length} lab(s) past TTL`);
  const reaped = [], skipped = [];
  for (const r of rows) {
    // A server lab needs SSH credentials to be torn down. Without them (a runner-made deployment) the record must
    // stay, so the control plane can send a destroy with the credentials; removing the record would orphan the containers.
    if (r.engine === "remote" && !engineOpts(r).remote) { skipped.push(r.id); warn(`${r.name} ${dim(r.id)} is past TTL but needs SSH credentials to destroy; left for the control plane`); continue; }
    await destroyOne(r); reaped.push(r.id);
  }
  out({ reaped: reaped.length, ids: reaped, skipped });
}

async function cmdLogs(id) {
  const dep = await state.get(id);
  if (!dep) die(`no deployment "${id}" — see \`rtlab status\``);
  const engine = engineForDep(dep);
  const { cmd, args, cwd, env } = await engine.logs(dep, { follow: !!(flags.follow || flags.f), ...engineOpts(dep) });
  const child = spawn(cmd, args, { cwd, stdio: "inherit", env: env ? { ...process.env, ...env } : process.env });
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
    case "creds": await cmdCreds(); break;
    case "list": case "ls": cmdList(); break;
    case "search": cmdSearch(a1); break;
    case "info": case "show": cmdInfo(a1); break;
    case "catalog": out(allEntries().map((e) => ({ ...e, placement: placement(e) }))); if (!isJson()) info("use --json (this command is the integration contract)"); break;
    case "services":
      if (a1 === "deploy") await cmdDeploy(a2);
      else cmdServicesList(a1 === "list" ? a2 : a1);
      break;
    case "storage": await cmdStorage(a1, a2, pos[3]); break;
    case "agent": await cmdAgent(a1); break;
    case "preflight": await cmdPreflight(); break;
    case "remote":
      if (a1 === "vpn") await cmdRemoteVpn(a2, pos[3]);
      else if (a1 === "check") await cmdRemoteCheck(a2);
      else if (a1 === "deploy") await cmdRemoteDeploy();
      else if (a1 === "presets") out(REMOTE_PRESETS);
      else if (a1 === "reset") await cmdRemoteReset();
      else die("usage: rtlab remote check <user@host[:port]> | rtlab remote deploy --labs … --remote user@host[:port] (--ssh-key <file> | --ssh-password-env <VAR>) | rtlab remote reset --remote … [--remove-docker] [--dry-run]");
      break;
    case "spinner":
      if (a1 === "deploy") await cmdSpinnerDeploy();
      else if (a1 === "bake") await cmdSpinnerBake(a2);
      else die("usage: rtlab spinner deploy|bake …");
      break;
    case "deploy": await cmdDeploy(a1); break;
    case "status": case "ps": await cmdStatus(a1); break;
    case "logs": await cmdLogs(a1); break;
    case "start": await cmdLifecycle("start", a1); break;
    case "stop": await cmdLifecycle("stop", a1); break;
    case "destroy": case "rm": await cmdDestroy(a1); break;
    case "reap": await cmdReap(); break;
    case "orphans": await cmdOrphans(); break;
    case "cloud": await cmdCloud(a1, a2, pos[3]); break;
    case "presets": { const { presetCatalog } = await import("../src/engines/arcloud-presets.mjs"); const rows = presetCatalog(); if (!isJson()) for (const r of rows) plain(`  ${r.provider.padEnd(6)} ${r.id.padEnd(28)} ${r.servers.join(" / ")}`); out(rows); break; }
    case "run": case "wizard": await cmdRun(); break;
    default: die(`unknown command "${cmd}" — see \`rtlab --help\``);
  }
} catch (e) {
  die(e?.message || String(e));
}
