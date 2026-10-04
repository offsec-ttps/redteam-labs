/**
 * Runner agent: connects this machine to a RedTeam Labs control plane and carries out deployments.
 *
 *   # install rtlab first (fresh host, no git/npm needed):  curl -fsSL https://<app>/install.sh | sh
 *   rtlab agent enroll --url https://<project>.supabase.co --code <one-time code> [--name laptop]
 *   rtlab agent run        # heartbeat + poll for jobs; run until Ctrl-C
 *   rtlab agent status | unenroll
 *
 * The agent only ever connects OUT (HTTPS). It never opens a port. The control plane is a separate system, so
 * every job is validated strictly here before anything is executed: only known job types, only catalogued labs,
 * only storage locations the operator configured, only bounded numbers. Jobs run through the same `rtlab` CLI a
 * human would use (argument arrays, never a shell), so the state lock, isolation and TTL behave identically.
 */

import { readFile, writeFile, rm, chmod, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RT_HOME } from "./state.mjs";
import * as state from "./state.mjs";
import { findEntry } from "./catalog/index.mjs";
import * as storage from "./storage.mjs";
import { validateLabEnv, secretKeys } from "./labenv.mjs";
import { normalizeRemote, remoteSecrets, checkRemote } from "./remote.mjs";
import * as vpn from "./remote-vpn.mjs";
import { mkdtemp, writeFile as writeTmp, rm as rmTmp } from "node:fs/promises";
import os from "node:os";
import { hostPreflight } from "./preflight.mjs";
import { normalizeCloudOptions } from "./engines/arcloud.mjs";

export const AGENT_VERSION = "0.1.0";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CLI = path.resolve(HERE, "..", "bin", "rtlab.mjs");
// RTLAB_AGENT_CONFIG lets tests (and unusual setups) keep the runner key somewhere else.
export const CONFIG_PATH = () => process.env.RTLAB_AGENT_CONFIG
  ? path.resolve(process.env.RTLAB_AGENT_CONFIG)
  : path.join(process.env.RTLAB_HOME ? path.resolve(process.env.RTLAB_HOME) : RT_HOME, "agent.json");

const STORAGE_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
// spinner-ab12cd, or <lab id>-ab12cd for whole-lab deployments (Attack Range, single-box VM labs)
const RTLAB_ID = /^[a-z0-9][a-z0-9-]{0,48}-[a-z0-9]{4,12}$/;
const WHOLE_LAB_ENGINES = new Set(["attack-range", "vm"]);
// Cloud labs: which credential fields a job may carry per provider, and the environment variable each one becomes.
// rtlab passes them to Terraform for a plan only; nothing here ever applies.
const CLOUD_FIELDS = {
  aws: { access_key_id: "AWS_ACCESS_KEY_ID", secret_access_key: "AWS_SECRET_ACCESS_KEY", session_token: "AWS_SESSION_TOKEN", region: "AWS_REGION" },
  azure: { client_id: "ARM_CLIENT_ID", client_secret: "ARM_CLIENT_SECRET", tenant_id: "ARM_TENANT_ID", subscription_id: "ARM_SUBSCRIPTION_ID" },
  gcp: { credentials_json: "GOOGLE_CREDENTIALS", project: "GOOGLE_PROJECT" },
};
const CLOUD_REQUIRED = { aws: ["access_key_id", "secret_access_key"], azure: ["client_id", "client_secret", "tenant_id", "subscription_id"], gcp: ["credentials_json"] };
const KALI_BUNDLE = /^kali-tools-[a-z0-9-]+$/;
const int = (v, lo, hi, what) => {
  if (!Number.isInteger(v) || v < lo || v > hi) throw new Error(`${what} must be a whole number from ${lo} to ${hi}`);
  return v;
};

// ── config ───────────────────────────────────────────────────────────────────
export async function loadConfig() {
  try { return JSON.parse(await readFile(CONFIG_PATH(), "utf-8")); } catch { return null; }
}
async function saveConfig(cfg) {
  await mkdir(path.dirname(CONFIG_PATH()), { recursive: true });
  await writeFile(CONFIG_PATH(), JSON.stringify(cfg, null, 2), { mode: 0o600 });
  await chmod(CONFIG_PATH(), 0o600);                      // holds the runner key: owner-only
}
export async function unenroll() { await rm(CONFIG_PATH(), { force: true }); }

/**
 * Where the runner API lives. Two layouts are understood:
 *   - an app's own domain (https://my-app.lovable.app): <origin>/api/public/runner/<name>
 *   - Supabase Edge Functions (https://x.supabase.co):   <origin>/functions/v1/runner-<name>
 * Plain http is only allowed for localhost (development and tests).
 */
export function normalizeControlUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error(`"${raw}" is not a valid URL`); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (u.protocol !== "https:" && !(local && u.protocol === "http:")) throw new Error("the control plane URL must be https:// (http is only allowed for localhost)");
  const p = u.pathname.replace(/\/+$/, "");
  if (p.endsWith("/functions/v1") || p.endsWith("/api/public/runner")) return `${u.origin}${p}`;
  if (u.hostname.endsWith(".supabase.co")) return `${u.origin}${p}/functions/v1`;
  return `${u.origin}${p}/api/public/runner`;
}
const endpoint = (base, name) => (base.endsWith("/functions/v1") ? `${base}/runner-${name}` : `${base}/${name}`);

// ── host facts (never filesystem paths: the browser shows these) ─────────────
export function stripPaths(host) {
  const h = JSON.parse(JSON.stringify(host));
  delete h.labStore;
  for (const k of ["boxCache", "dockerRoot"]) if (h[k]) { delete h[k].path; delete h[k].device; }
  h.storage = (h.storage || []).map(({ path: _p, device: _d, ...rest }) => rest);
  return h;
}

// ── job validation: the control plane is not trusted with arguments ──────────
export function validateDeploy(payload) {
  if (!payload || typeof payload !== "object") throw new Error("deploy payload missing");
  const os = payload.base_os;
  if (!["ubuntu", "kali"].includes(os)) throw new Error('base_os must be "ubuntu" or "kali"');
  const labs = payload.labs;
  if (!Array.isArray(labs) || labs.length < 1 || labs.length > 5 || new Set(labs).size !== labs.length) throw new Error("labs must be 1 to 5 distinct lab ids");
  for (const id of labs) {
    const e = typeof id === "string" ? findEntry(id) : null;
    if (!e || e.id !== id) throw new Error(`unknown lab "${String(id).slice(0, 60)}"`);
    if (!e.spinnerEligible) throw new Error(`lab "${id}" cannot be deployed into a spinner VM`);
  }
  const o = payload.options || {};
  const out = {
    os, labs,
    ttlMinutes: payload.ttl_minutes == null ? 240 : int(payload.ttl_minutes, 5, 4320, "ttl_minutes"),
    noEgress: o.no_egress === true,
    allowLow: o.accept_risks === true,
    cpus: o.cpus == null ? undefined : int(o.cpus, 1, 8, "cpus"),
    memoryMB: o.memory_mb == null ? undefined : int(o.memory_mb, 1024, 16384, "memory_mb"),
    kaliTools: undefined, storageId: "default",
  };
  if (o.kali_tools != null) {
    if (os !== "kali" || typeof o.kali_tools !== "string" || !KALI_BUNDLE.test(o.kali_tools)) throw new Error("kali_tools must look like kali-tools-top10 and needs base_os kali");
    out.kaliTools = o.kali_tools;
  }
  // Per-lab options (a model choice, an API key): each lab's catalog entry says what it accepts; nothing else passes.
  out.labEnv = {};
  if (o.lab_env != null) {
    if (typeof o.lab_env !== "object" || Array.isArray(o.lab_env)) throw new Error("lab_env must be an object keyed by lab id");
    for (const [slug, values] of Object.entries(o.lab_env)) {
      if (!labs.includes(slug)) throw new Error(`lab_env names "${String(slug).slice(0, 60)}", which is not being deployed`);
      if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error(`lab_env for "${slug}" must be an object`);
      const env = validateLabEnv(findEntry(slug), values);
      if (Object.keys(env).length) out.labEnv[slug] = env;
    }
  }
  if (o.storage_id != null) {
    if (typeof o.storage_id !== "string" || !STORAGE_ID.test(o.storage_id)) throw new Error("storage_id is not a valid storage name");
    storage.resolve(o.storage_id);                          // must be one the operator configured, and usable
    out.storageId = o.storage_id;
  }
  return out;
}

/**
 * A whole-lab deployment: one catalog entry that is an environment in itself (Splunk Attack Range, a
 * single-box VM lab). Validated the same way: known id, deployable engine, bounded engine options.
 */
export function validateLabDeploy(payload) {
  if (!payload || typeof payload !== "object") throw new Error("deploy payload missing");
  const id = payload.lab;
  const e = typeof id === "string" ? findEntry(id) : null;
  if (!e || e.id !== id) throw new Error(`unknown lab "${String(id).slice(0, 60)}"`);
  if (!e.deploy?.available || !WHOLE_LAB_ENGINES.has(e.engine)) throw new Error(`lab "${id}" cannot be deployed as a whole-lab environment`);
  const o = payload.options || {};
  const out = { lab: id, engine: e.engine, ttlMinutes: payload.ttl_minutes == null ? 240 : int(payload.ttl_minutes, 5, 4320, "ttl_minutes"), opts: {} };
  if (e.engine === "attack-range") {
    out.opts.windows = o.windows == null ? 1 : int(o.windows, 0, 4, "windows");
    out.opts.linux = o.linux == null ? 0 : int(o.linux, 0, 2, "linux");
    out.opts.kali = o.kali === true;
    out.opts.createDomain = o.createDomain === true;
    if (o.splunkMemoryMB != null) out.opts.splunkMemoryMB = int(o.splunkMemoryMB, 4096, 16384, "splunkMemoryMB");
  }
  if (o.storage_id != null) {
    if (typeof o.storage_id !== "string" || !STORAGE_ID.test(o.storage_id)) throw new Error("storage_id is not a valid storage name");
    storage.resolve(o.storage_id);
    out.opts.storageId = o.storage_id;   // validated, but full environments land in VirtualBox's default folder today
  }
  return out;
}

/** `{ kind: "cloud", lab, provider, credentials: {...} }` -> the lab to plan and the env rtlab needs. */
export function validateCloudDeploy(payload) {
  if (!payload || typeof payload !== "object") throw new Error("deploy payload missing");
  const id = payload.lab;
  const e = typeof id === "string" ? findEntry(id) : null;
  if (!e || e.id !== id) throw new Error(`unknown lab "${String(id).slice(0, 60)}"`);
  if (!e.deploy?.available || (e.engine !== "terraform" && e.engine !== "attack-range")) throw new Error(`lab "${id}" is not a cloud lab`);
  if (e.engine === "attack-range") {
    // The range's own cloud modes: a preset or custom knobs, validated with the engine's own rules (bounded, allow-listed).
    const provider = payload.provider;
    if (!CLOUD_FIELDS[provider]) throw new Error(`unsupported cloud provider "${String(provider).slice(0, 10)}"`);
    const o = payload.options || {};
    const opts = normalizeCloudOptions({ provider, preset: o.preset, region: o.region, location: o.location, zone: o.zone, projectId: o.project_id ?? o.projectId,
      windows: o.windows, linux: o.linux, kali: o.kali === true || undefined, createDomain: o.createDomain === true || undefined,
      zeek: o.zeek === true || undefined, soar: o.soar === true || undefined, installEs: o.installEs === true || undefined });
    return { lab: id, provider, env: cloudEnv(provider, payload.credentials), range: opts };
  }
  const provider = e.provider || e.source?.provider || "aws";
  if (payload.provider && payload.provider !== provider) throw new Error(`lab "${id}" is a ${provider} lab, not ${String(payload.provider).slice(0, 10)}`);
  const env = cloudEnv(provider, payload.credentials);
  return { lab: id, provider, env };
}

/** `{ rtlab_id, provider, credentials }` -> the explicit, confirmed apply of a planned cloud lab. */
export function validateCloudApply(payload) {
  const id = payload?.rtlab_id;
  if (typeof id !== "string" || !RTLAB_ID.test(id)) throw new Error("rtlab_id is not a valid deployment id");
  const provider = payload.provider;
  if (!CLOUD_FIELDS[provider]) throw new Error(`unsupported cloud provider "${String(provider).slice(0, 10)}"`);
  return { id, provider, env: cloudEnv(provider, payload.credentials) };
}

/** Credentials from a job -> process env for one rtlab run. Unknown fields are rejected, values are bounded. */
export function cloudEnv(provider, credentials) {
  const fields = CLOUD_FIELDS[provider];
  if (!fields) throw new Error(`unsupported cloud provider "${String(provider).slice(0, 10)}"`);
  if (!credentials || typeof credentials !== "object") throw new Error("cloud credentials missing from the job");
  const env = {};
  for (const [k, v] of Object.entries(credentials)) {
    if (!fields[k]) throw new Error(`unexpected credential field "${String(k).slice(0, 30)}"`);
    if (typeof v !== "string" || !v || v.length > 20000 || /[\r\n]/.test(v) && k !== "credentials_json") throw new Error(`credential field "${k}" is not usable`);
    env[fields[k]] = v;
  }
  for (const k of CLOUD_REQUIRED[provider]) if (!env[fields[k]]) throw new Error(`credential field "${k}" is required for ${provider}`);
  if (provider === "aws") env.AWS_DEFAULT_REGION = env.AWS_REGION || "us-east-1";
  return env;
}

export function cloudDeployArgs(n) {
  if (!n.range) return ["deploy", n.lab, "--yes"];
  const r = n.range;
  const where = r.provider === "aws" ? ["--region", r.region] : r.provider === "azure" ? ["--location", r.location] : ["--region", r.region, "--zone", r.zone, "--project", r.projectId];
  return ["deploy", n.lab, "--yes", "--provider", r.provider, ...where, ...(r.preset ? ["--preset", r.preset] : []), "--windows", String(r.windows), "--linux", String(r.linux),
    ...(r.kali ? ["--kali"] : []), ...(r.createDomain ? ["--domain"] : []), ...(r.zeek ? ["--zeek"] : []), ...(r.soar ? ["--soar"] : []), ...(r.installEs ? ["--es"] : [])];
}

/** `{ kind: "remote", labs, ttl_minutes, options, target: { kind: "vps", host, port, username, private_key|password, ... } }` */
export function validateRemoteDeploy(payload) {
  if (!payload || typeof payload !== "object") throw new Error("deploy payload missing");
  const labs = payload.labs;
  if (!Array.isArray(labs) || labs.length < 1 || labs.length > 5 || new Set(labs).size !== labs.length) throw new Error("labs must be 1 to 5 distinct lab ids");
  for (const id of labs) {
    const e = typeof id === "string" ? findEntry(id) : null;
    if (!e || e.id !== id) throw new Error(`unknown lab "${String(id).slice(0, 60)}"`);
    if (e.engine !== "docker" || !e.deploy?.available) throw new Error(`lab "${id}" is not a container lab; a server runs container labs only`);
  }
  const o = payload.options || {};
  const out = { labs, ttlMinutes: payload.ttl_minutes == null ? 240 : int(payload.ttl_minutes, 5, 4320, "ttl_minutes"),
    noEgress: o.no_egress === true, labEnv: {}, remote: validateTarget(payload.target), installDocker: o.install_docker === true };
  if (o.lab_env != null) {
    if (typeof o.lab_env !== "object" || Array.isArray(o.lab_env)) throw new Error("lab_env must be an object keyed by lab id");
    for (const [slug, values] of Object.entries(o.lab_env)) {
      if (!labs.includes(slug)) throw new Error(`lab_env names "${String(slug).slice(0, 60)}", which is not being deployed`);
      const env = validateLabEnv(findEntry(slug), values);
      if (Object.keys(env).length) out.labEnv[slug] = env;
    }
  }
  return out;
}

/** A job's `target` block (added by the control plane at poll time) -> a validated remote target. */
export function validateTarget(t) {
  if (!t || typeof t !== "object" || t.kind !== "vps") throw new Error("target must be a VPS target ({ kind: \"vps\", host, username, private_key | password })");
  return normalizeRemote({ host: t.host, port: t.port, username: t.username, label: t.label, bindIp: t.bind_ip,
    privateKey: t.private_key, passphrase: t.passphrase, password: t.password });
}

/** Run the CLI for a remote target: the key goes to a 0600 temp file (never argv), a password to the child's env. */
export async function withRemoteCli(remote, fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "rtlab-ssh-"));
  try {
    const args = ["--remote", `${remote.username}@${remote.host}:${remote.port}`];
    const env = {};
    if (remote.auth.kind === "key") { await writeTmp(path.join(dir, "key"), remote.auth.privateKey, { mode: 0o600 }); args.push("--ssh-key", path.join(dir, "key")); }
    else if (remote.auth.kind === "keyfile") args.push("--ssh-key", remote.auth.keyFile);
    else { env.RTLAB_SSH_PASSWORD = remote.auth.password; args.push("--ssh-password-env", "RTLAB_SSH_PASSWORD"); }
    if (remote.auth.passphrase) env.RTLAB_SSH_PASSPHRASE = remote.auth.passphrase;
    if (remote.bindIp) args.push("--bind", remote.bindIp);
    return await fn(args, env);
  } finally { await rmTmp(dir, { recursive: true, force: true }).catch(() => {}); }
}

export function remoteDeployArgs(n) {
  const a = ["remote", "deploy", "--labs", n.labs.join(","), "--ttl", `${n.ttlMinutes}m`, "--yes"];
  if (n.noEgress) a.push("--no-egress");
  if (n.installDocker) a.push("--install-docker");
  for (const [slug, env] of Object.entries(n.labEnv || {})) for (const [k, v] of Object.entries(env)) a.push("--lab-env", `${slug}:${k}=${v}`);
  return a;
}

/** What `rtlab remote deploy --json` returns -> the protocol's result object (same shape as a spinner result). */
export function mapRemoteResult(r) {
  return compact({
    rtlab_id: r.id, status: r.status === "running" ? "running" : "starting", vm_ip: r.bindIp, subnet: null,
    services: (r.services || []).map((s) => ({ lab: s.lab || s.name, name: s.name, port: s.port, url: s.url })),
    credentials: { vm: { host: r.bindIp }, labs: (r.labs || []).map((l) => ({ lab: l.labId, name: l.name, default_credentials: l.defaultCreds || null,
      services: (l.services || []).map((s) => ({ lab: l.labId, name: s.name, port: s.port, url: s.url })) })) },
  });
}

/** What `rtlab deploy <cloud-lab> --json` returns (a plan) -> the protocol's result object. No secrets, no services yet. */
export function mapCloudResult(r, lab) {
  const plan = r.plan || {};
  return compact({
    rtlab_id: r.id, status: "planned", services: [],
    plan: { identity: r.identity, add: plan.add, change: plan.change, destroy: plan.destroy, apply_cmd: r.applyCmd, destroy_cmd: r.destroyCmd, tf_dir: r.tfDir,
      instances: r.instances?.list?.map((i) => ({ name: i.name, type: i.type, usd_per_hour: i.usdPerHour })), usd_per_hour: r.instances?.usdPerHour, region: r.options?.region, preset: r.options?.preset || undefined },
    credentials: { vm: {}, labs: [{ lab, name: r.name || lab, default_credentials: null, services: [] }] },
  });
}

/** Mask every secret value of an env map wherever it appears in a line (defence in depth beyond `redact`). */
export function maskValues(env) {
  const secrets = Object.values(env || {}).filter((v) => typeof v === "string" && v.length >= 8);
  return (s) => secrets.reduce((acc, v) => acc.split(v).join("***"), String(s));
}

export function labDeployArgs(n) {
  const a = ["deploy", n.lab, "--ttl", `${n.ttlMinutes}m`, "--yes"];
  if (n.engine === "attack-range") {
    a.push("--windows", String(n.opts.windows), "--linux", String(n.opts.linux));
    if (n.opts.kali) a.push("--kali");
    if (n.opts.createDomain) a.push("--domain");
    if (n.opts.splunkMemoryMB) a.push("--memory", String(n.opts.splunkMemoryMB));
  }
  return a;
}

export function deployArgs(n) {
  const a = ["spinner", "deploy", "--os", n.os, "--labs", n.labs.join(","), "--ttl", `${n.ttlMinutes}m`, "--storage", n.storageId, "--yes"];
  if (n.noEgress) a.push("--no-egress");
  if (n.allowLow) a.push("--allow-low-resources");
  if (n.cpus) a.push("--cpus", String(n.cpus));
  if (n.memoryMB) a.push("--memory", String(n.memoryMB));
  if (n.kaliTools) a.push("--kali-tools", n.kaliTools);
  for (const [slug, env] of Object.entries(n.labEnv || {})) for (const [k, v] of Object.entries(env)) a.push("--lab-env", `${slug}:${k}=${v}`);
  return a;
}

/** Every secret option value in a validated spinner payload, so log lines and errors can be masked. */
export function labEnvSecrets(n) {
  const out = [];
  for (const [slug, env] of Object.entries(n?.labEnv || {})) for (const k of secretKeys(findEntry(slug) || {})) if (env[k] && env[k].length >= 6) out.push(env[k]);
  return out;
}

export async function validateLifecycle(type, payload) {
  const id = payload?.rtlab_id;
  if (typeof id !== "string" || !RTLAB_ID.test(id)) throw new Error("rtlab_id is not a valid deployment id");
  // A destroy may target a lab whose local record was lost: the CLI then sweeps by exact name (VirtualBox VMs and
  // Compose projects carry the id), or by label on a server when the job brings SSH credentials. start/stop need the record.
  if (type !== "destroy" && !(await state.get(id))) throw new Error(`no deployment "${id}" on this machine`);
  // purge: also remove the images the lab pulled (VPS labs). Only a boolean true switches it on.
  return [type, id, "--yes", ...(type === "destroy" && payload?.purge === true ? ["--purge"] : [])];
}

// ── redaction: defence in depth for anything that leaves the machine as a log line ──
export const redact = (s) => String(s)
  .replace(/(chpasswd|operator:)\S*/gi, (m) => m.split(":")[0] + ":***")
  .replace(/(net user \S+ )\S+/gi, "$1***")                       // Windows: net user Administrator <password>
  .replace(/(password["'=:\s]+)[^\s"',]{6,}/gi, "$1***")
  .replace(/(--password[= ]|-p )\S+/gi, "$1***")
  .replace(/(AWS_SECRET_ACCESS_KEY|ARM_CLIENT_SECRET|GOOGLE_CREDENTIALS|AWS_SESSION_TOKEN)(["'=:\s]+)\S+/g, "$1$2***")
  .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, "<aws-key-id>");

// ── CLI runner ───────────────────────────────────────────────────────────────
export function runCli(args, onEvent, cli = process.env.RTLAB_AGENT_CLI || DEFAULT_CLI, env = null) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args, "--json", "--events"], { stdio: ["ignore", "pipe", "pipe"], env: env ? { ...process.env, ...env } : process.env });
    let out = "", err = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => {
      err += d;
      let i;
      while ((i = err.indexOf("\n")) >= 0) {
        const line = err.slice(0, i).trim(); err = err.slice(i + 1);
        if (!line) continue;
        try { const e = JSON.parse(line); onEvent?.({ ts: e.t, level: e.level || "info", message: e.msg }); }
        catch { onEvent?.({ ts: new Date().toISOString(), level: "info", message: line }); }
      }
    });
    child.on("close", (code) => {
      let result = null;
      try { result = JSON.parse(out); } catch { /* not JSON: surfaced below */ }
      resolve({ code, result, raw: out });
    });
    child.on("error", (e) => resolve({ code: 1, result: { ok: false, error: e.message }, raw: "" }));
  });
}

/**
 * `rtlab status` -> the heartbeat's `deployments`. The protocol only knows "running" and "stopped" (absent = gone),
 * so transitional or unknown states ("starting", "partial", "unknown", "planned") are left out rather than sent:
 * an unrecognised value would get the whole heartbeat rejected.
 */
export function mapStatuses(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => typeof r?.id === "string" && ["running", "stopped"].includes(r.status))
    .map((r) => ({ rtlab_id: r.id, status: r.status }));
}

/** Drop null/undefined keys: the control plane validates strictly and rejects explicit nulls for optional strings. */
export function compact(o) {
  if (Array.isArray(o)) return o.map(compact);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => [k, compact(v)]));
  return o;
}

/** What `rtlab deploy <whole lab> --json` returns -> the protocol's result object (same shape as a spinner). */
/** `rtlab cloud apply` -> the running cloud lab: endpoints plus the logins, which the control plane encrypts. */
export function mapCloudApplyResult(r) {
  const access = r.access || {};
  const creds = {};
  if (access.splunk?.url) creds.splunk_web = `${access.splunk.url}  user ${access.splunk.username}  password ${access.splunk.password}`;
  for (const w of access.windows || []) creds[`${w.hostname || w.host}_rdp`] = `${w.host}:${w.port}  user ${w.username}  password ${w.password}`;
  if (r.outputs && typeof r.outputs === "object") for (const [k, v] of Object.entries(r.outputs)) if (typeof v === "string" && v.length < 500) creds[`output_${k}`] = v;
  const services = (r.services || []).map((s) => ({ name: s.name, port: s.port, url: s.url }));
  const v = r.vpn && typeof r.vpn === "object" ? r.vpn : null;
  // `vpn` = the gateway students connect to (public key, endpoint, the networks the tunnel routes); peers are issued per student.
  const vpnOut = v ? { gateway: v.gateway, endpoint: v.endpoint, server_public_key: v.server_public_key, address: v.address, network: v.network, port: v.port, routes: Array.isArray(v.routes) ? v.routes : [], runner_ip: v.runner_ip, enabled_at: v.enabled_at } : undefined;
  return compact({ rtlab_id: r.id, status: r.status === "running" ? "running" : "starting", services,
    instances: Array.isArray(r.instances) ? r.instances.map((i) => ({ name: i.name, state: i.state, public_ip: i.public_ip, private_ip: i.private_ip, type: i.type })) : undefined,
    vpn: vpnOut, vpn_only: !!r.vpnOnly, vpn_error: r.vpnError ? String(r.vpnError).slice(0, 500) : undefined,
    credentials: { vm: {}, labs: [{ lab: "cloud", name: "cloud resources", default_credentials: Object.keys(creds).length ? creds : null, services }] } });
}

export function mapLabResult(r, lab) {
  const access = r.access || {};
  const creds = {};
  if (access.splunk) creds.splunk_web = `${access.splunk.url}  user ${access.splunk.username}  password ${access.splunk.password}`;
  for (const w of access.windows || []) creds[`windows_${w.hostname || w.port}_rdp`] = `${w.host}:${w.port}  user ${w.username}  password ${w.password}`;
  if (access.password && !access.splunk) creds.password = access.password;
  const services = (r.services || []).map((s) => ({ lab, name: s.name, port: s.port, url: s.url }));
  return compact({
    rtlab_id: r.id, status: r.status === "running" ? "running" : "starting", vm_ip: r.bindIp || r.privateIp, subnet: access.note ? "10.0.1.0/24" : undefined,
    services,
    credentials: { vm: { host: r.bindIp || r.privateIp, username: access.splunk?.username, password: access.splunk?.password, ssh: access.ssh },
      labs: [{ lab, name: r.name, default_credentials: Object.keys(creds).length ? creds : null, services }] },
  });
}

/** What `rtlab spinner deploy --json` returns -> the protocol's result object. */
export function mapDeployResult(r) {
  return compact({
    rtlab_id: r.id, status: r.status === "running" ? "running" : "starting", vm_ip: r.privateIp,
    subnet: r.spinnerNet ? `10.66.${r.spinnerNet}.0/24` : null,
    services: (r.services || []).map((s) => ({ lab: s.lab || s.name, name: s.name, port: s.port, url: s.url })),
    credentials: {
      vm: { host: r.access?.host, ssh: r.access?.ssh, username: r.access?.username, password: r.access?.password },
      labs: (r.labs || []).map((l) => ({ lab: l.labId, name: l.name, default_credentials: l.defaultCreds || null, services: (l.services || []).map((s) => ({ lab: l.labId, name: s.name, port: s.port, url: s.url })) })),
    },
  });
}

// ── HTTP ─────────────────────────────────────────────────────────────────────
export class AuthError extends Error {}

async function call(base, fn, body, key) {
  const headers = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;
  // Redirects are not followed: the runner key must only ever reach the enrolled origin. A control plane that
  // moved domains (a custom domain in front of the app) is reported as such instead of a bare "fetch failed".
  const res = await fetch(endpoint(base, fn), { method: "POST", headers, body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(30_000), redirect: "manual" });
  if (res.status >= 300 && res.status < 400) {
    const to = res.headers.get("location") || "";
    throw new Error(`the control plane now answers at ${to.replace(/\/api\/public\/runner.*$/, "") || "another address"}: run \`rtlab agent enroll --url <that address> --code <new code>\`, or set controlUrl in ${CONFIG_PATH()}`);
  }
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json };
}

export async function enroll({ url, code, name, hostFacts = hostPreflight }) {
  const base = normalizeControlUrl(url);
  const host = stripPaths(await hostFacts());
  const { status, json } = await call(base, "enroll", { enrollment_code: code, name: name || "runner", version: AGENT_VERSION, host });
  if (status !== 200 || !json?.runner_key) throw new Error(json?.error || `enrollment failed (HTTP ${status})`);
  const cfg = { controlUrl: base, runnerId: json.runner_id, runnerKey: json.runner_key, orgId: json.org_id, pollIntervalSeconds: json.poll_interval_seconds || 5, name: name || "runner", enrolledAt: new Date().toISOString() };
  await saveConfig(cfg);
  return cfg;
}

// ── the agent ────────────────────────────────────────────────────────────────
export class Agent {
  constructor(cfg, opts = {}) {
    const { hostFacts = hostPreflight, cli, log = console.log, heartbeatMs = 30_000, reapMs = 60_000 } = opts;
    Object.assign(this, { cfg, hostFacts, cli, log, heartbeatMs, reapMs });
    this.stopping = false;
    this.busy = Promise.resolve();          // serialises anything that changes lab state (jobs, reaping)
    this.timers = [];
    this.reportRetryMs = opts.reportRetryMs;
    this.sleepers = new Set();              // pending sleeps, so stop() can wake them instead of leaving the loop hanging
  }
  say(m) { this.log(`${new Date().toISOString()}  ${m}`); }
  api(fn, body) { return call(this.cfg.controlUrl, fn, body, this.cfg.runnerKey); }
  exclusive(fn) { const p = this.busy.then(fn, fn); this.busy = p.catch(() => {}); return p; }

  async statuses() {
    const { result } = await runCli(["status"], null, this.cli);
    return mapStatuses(result);
  }

  async heartbeat() {
    const host = stripPaths(await this.hostFacts());
    const { status, json } = await this.api("heartbeat", { version: AGENT_VERSION, host, deployments: await this.statuses() });
    if (status === 401) throw new AuthError(json?.error || "the control plane rejected this runner's key");
    if (status !== 200) throw new Error(`heartbeat failed (HTTP ${status}): ${json?.error ?? ""}`);
    return json;
  }

  /** Destroy labs whose timer ran out. The next heartbeat tells the control plane they are gone. */
  async reap() {
    return this.exclusive(async () => {
      const { result } = await runCli(["reap"], (e) => this.say(`reap: ${e.message}`), this.cli);
      if (result?.reaped) this.say(`timer destroyed ${result.reaped} lab(s)`);
    });
  }

  async handle(job) {
    const buffer = [];
    let lastFlush = Date.now();
    const push = (e) => buffer.push({ ts: e.ts || new Date().toISOString(), level: e.level, message: redact(e.message).slice(0, 2000) });
    // The control plane accepts at most 200 events per report, so send in chunks.
    const flush = async () => {
      if (!buffer.length) return this.api("report", { job_id: job.id, events: [], status: "running" });   // still extends the lease
      let r;
      while (buffer.length) r = await this.api("report", { job_id: job.id, events: buffer.splice(0, 200), status: "running" });
      lastFlush = Date.now();
      return r;
    };
    const onEvent = (e) => { push(e); if (Date.now() - lastFlush > 4000) flush().catch(() => {}); };   // also extends the lease

    /**
     * The final report carries the lab's credentials, which exist nowhere else, so it is never given up on lightly:
     * server errors and network failures are retried with backoff for several minutes. A 4xx is final.
     */
    const finish = async (status, extra) => {
      while (buffer.length > 200) await flush();
      const body = { job_id: job.id, events: buffer.splice(0), status, ...extra };
      let delay = 2000;
      const until = Date.now() + (this.reportRetryMs ?? 5 * 60_000);
      for (;;) {
        let r = null;
        try { r = await this.api("report", body); } catch (e) { this.say(`job ${job.id}: report failed (${e.message})`); }
        if (r && r.status === 401) throw new AuthError("runner key rejected while reporting");
        if (r && r.status === 409) { this.say(`job ${job.id}: the control plane no longer wants this result (${r.json?.error ?? "conflict"})`); return; }
        if (r && r.status < 300) return;
        if (r && r.status >= 400 && r.status < 500) { this.say(`job ${job.id}: the control plane refused the report (HTTP ${r.status}: ${r.json?.error ?? ""})`); return; }
        if (Date.now() + delay > until) { this.say(`job ${job.id}: giving up reporting after repeated failures`); return; }
        this.say(`job ${job.id}: report not accepted (HTTP ${r?.status ?? "no response"}), retrying in ${delay / 1000}s`);
        await new Promise((res) => setTimeout(res, delay)); delay = Math.min(delay * 2, 30_000);
      }
    };

    try {
      let args, wholeLab = null, cloudJob = null, env = null, mask = (s) => s;
      let remoteJob = null;
      if ((job.type === "vpn-peer" || job.type === "vpn-remove-peer") && job.payload?.rtlab_id != null && !job.payload?.target) {
        // Peers on a cloud range's gateway (the Splunk server): the range's key pair is on this machine, so no target block travels.
        const id = String(job.payload.rtlab_id); const name = String(job.payload?.name || "");
        if (!RTLAB_ID.test(id)) throw new Error("rtlab_id is not a valid deployment id");
        if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(name)) throw new Error("peer name must be 1-32 characters: lowercase letters, digits, dashes");
        const sub = job.type === "vpn-peer" ? "vpn-peer" : "vpn-remove-peer";
        try {
          const { result, code } = await this.exclusive(() => runCli(["cloud", sub, id, name], (ev) => onEvent(ev), this.cli, null));
          if (!result || result.ok === false || code !== 0) throw new Error(result?.error || `rtlab exited with code ${code}`);
          await finish("succeeded", job.type === "vpn-peer"
            ? { result: { ok: true, name, address: result.address || null, credentials: { vpn_config: String(result.config || "") } } }
            : { result: { ok: true, name } });
        } catch (e) { await finish("succeeded", { result: { ok: false, error: redact(e.message).slice(0, 500) } }); }
        return;
      }
      if (job.type === "vpn-setup" || job.type === "vpn-peer" || job.type === "vpn-remove-peer") {
        // Private access for a VPS: WireGuard on the server, one peer config per student, issued through the platform.
        const remote = validateTarget(job.payload?.target); mask = (s) => remoteSecrets(remote).reduce((acc, v) => String(acc).split(v).join("***"), String(s));
        const opts = { address: vpn.DEFAULTS.address, network: vpn.DEFAULTS.network, port: vpn.DEFAULTS.port, sshPort: remote.port };
        try {
          if (job.type === "vpn-setup") {
            push({ level: "info", message: `Setting up WireGuard on ${remote.label} (${remote.host}): ${opts.address} on ${opts.network}, UDP ${opts.port}; firewall admits only SSH and the VPN` });
            const text = await vpn.runOnServer(remote, vpn.setupScript(opts), { timeout: 900_000 });
            if (text === null) throw new Error("the VPN setup script failed on the server");
            const kv = Object.fromEntries(text.split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => l.split("=")));
            await finish("succeeded", { result: { ok: true, address: opts.address, network: opts.network, port: opts.port, server_public_key: kv.SERVER_PUB || null, endpoint: `${kv.PUBLIC_IP || remote.host}:${opts.port}` } });
          } else if (job.type === "vpn-peer") {
            const name = String(job.payload?.name || "");
            const text = await vpn.runOnServer(remote, vpn.addPeerScript({ ...opts, name, endpoint: job.payload?.endpoint || null }), { timeout: 120_000 });
            if (text === null) throw new Error(`could not create the VPN peer "${name}" (does it already exist?)`);
            const config = text.slice(text.indexOf("[Interface]"));
            const addr = config.match(/Address = ([\d.]+)/)?.[1] || null;
            // The config holds the student's private key: it goes back in `credentials`, which the control plane encrypts.
            await finish("succeeded", { result: { ok: true, name, address: addr, credentials: { vpn_config: config } } });
          } else {
            const name = String(job.payload?.name || "");
            const text = await vpn.runOnServer(remote, vpn.removePeerScript({ name }), { timeout: 60_000 });
            if (text === null) throw new Error(`could not remove the VPN peer "${name}"`);
            await finish("succeeded", { result: { ok: true, name } });
          }
        } catch (e) { await finish("succeeded", { result: { ok: false, error: mask(e.message).slice(0, 500) } }); }
        return;
      }
      if (job.type === "server-reset") {
        // Revert what rtlab set up on a server (by its /etc/rtlab markers): the VPN + firewall, and Docker if asked and we installed it.
        const remote = validateTarget(job.payload?.target); mask = (s) => remoteSecrets(remote).reduce((acc, v) => String(acc).split(v).join("***"), String(s));
        const removeDocker = job.payload?.remove_docker === true;
        try {
          const facts = await checkRemote(remote, { onLog: (l) => push({ level: "info", message: mask(l) }), id: `reset-${job.id.slice(0, 8)}` });
          const plan = vpn.resetPlan(facts.installedByRtlab, { removeDocker });
          for (const x of plan) push({ level: "info", message: `${x.kept ? "keep" : "revert"} ${x.what}: ${x.detail}` });
          const text = plan.some((x) => !x.kept) ? await vpn.runOnServer(remote, vpn.resetScript({ removeDocker, sshPort: remote.port }), { timeout: 900_000, onLog: (l) => push({ level: "info", message: mask(l) }) }) : "RESET done";
          if (text === null) throw new Error("the reset script failed on the server");
          const lines = text.split("\n").filter((l) => /^(REMOVED|KEPT) /.test(l));
          await finish("succeeded", { result: { ok: true, removed: lines.filter((l) => l.startsWith("REMOVED ")).map((l) => l.slice(8, 40)), kept: lines.filter((l) => l.startsWith("KEPT ")).map((l) => mask(l.slice(5)).slice(0, 200)) } });
        } catch (e) { await finish("succeeded", { result: { ok: false, error: mask(e.message).slice(0, 500) } }); }
        return;
      }
      if (job.type === "verify-cloud") {
        // Validate a cloud account before any lab uses it: rtlab asks the provider's CLI which account the key belongs to.
        let cenv;
        try { cenv = cloudEnv(job.payload?.provider, job.payload?.credentials); } catch (e) { await finish("succeeded", { result: { ok: false, error: e.message.slice(0, 300) } }); return; }
        mask = maskValues(cenv);
        const { result } = await this.exclusive(() => runCli(["creds"], null, this.cli, cenv));
        const mine = Array.isArray(result) ? result.find((r) => r.provider === job.payload.provider) : null;
        if (mine?.valid) await finish("succeeded", { result: { ok: true, identity: String(mine.detail || "").slice(0, 300) } });
        else await finish("succeeded", { result: { ok: false, error: mask(String(mine?.detail || "could not verify the credentials")).slice(0, 300) } });
        return;
      }
      if (job.type === "verify-server") {
        const remote = validateTarget(job.payload?.target); mask = (s) => remoteSecrets(remote).reduce((acc, v) => String(acc).split(v).join("***"), String(s));
        push({ level: "info", message: `Checking ${remote.username}@${remote.host}:${remote.port} over SSH` });
        try {
          const r = await checkRemote(remote, { onLog: (l) => push({ level: "info", message: mask(l) }), installDocker: job.payload?.install_docker === true, id: `verify-${job.id.slice(0, 8)}` });
          // Size fields are sent only when measured: the control plane validates them as non-negative integers and rejects null.
          const size = {};
          for (const [k, v] of [["cpus", r.cpus], ["memory_mb", r.memoryMB], ["memory_available_mb", r.memoryAvailableMB], ["disk_free_gb", r.diskFreeGB]]) {
            if (Number.isInteger(v) && v >= 0) size[k] = v;
          }
          if (["kvm", "cpu", "none"].includes(r.virtualization)) size.virtualization = r.virtualization;
          if (r.installedByRtlab && typeof r.installedByRtlab === "object") size.installed_by_rtlab = Object.keys(r.installedByRtlab).filter((k) => /^[a-z0-9-]{1,32}$/.test(k)).sort();
          await finish("succeeded", { result: { ok: true, os: r.os, docker_version: r.dockerVersion, compose_version: r.composeVersion, fingerprint: r.fingerprint, ...size } });
        } catch (e) { await finish("succeeded", { result: { ok: false, error: mask(e.message).slice(0, 500) } }); }
        return;
      }
      if (job.type === "deploy" && job.payload?.kind === "remote") {
        remoteJob = validateRemoteDeploy(job.payload);
        const secrets = [...remoteSecrets(remoteJob.remote), ...labEnvSecrets(remoteJob)];
        mask = (s) => secrets.reduce((acc, v) => String(acc).split(v).join("***"), String(s));
        push({ level: "info", message: `Deploying ${remoteJob.labs.join(", ")} on ${remoteJob.remote.label} (${remoteJob.remote.host}) with Docker over SSH` });
      }
      else if (job.type === "deploy" && job.payload?.kind === "cloud") {
        cloudJob = validateCloudDeploy(job.payload); args = cloudDeployArgs(cloudJob); env = cloudJob.env; mask = maskValues(env);
        push({ level: "info", message: `Planning ${cloudJob.lab} in the organization's ${cloudJob.provider.toUpperCase()} account with Terraform; nothing is created` });
      }
      else if (job.type === "deploy" && job.payload?.kind === "lab") {
        wholeLab = validateLabDeploy(job.payload); args = labDeployArgs(wholeLab);
        if (wholeLab.opts.storageId && wholeLab.opts.storageId !== "default")
          push({ level: "warn", message: `Storage "${wholeLab.opts.storageId}" is not applied to full environments yet; their VMs use VirtualBox's default folder` });
      }
      else if (job.type === "deploy") {
        const n = validateDeploy(job.payload); args = deployArgs(n);
        const secrets = labEnvSecrets(n);
        if (secrets.length) mask = (s) => secrets.reduce((acc, v) => String(acc).split(v).join("***"), String(s));
      }
      else if (job.type === "cloud-apply") {
        // The billable step, only ever on a job the user confirmed on the control plane.
        const a = validateCloudApply(job.payload); args = ["cloud", "apply", a.id, "--yes"]; env = a.env; mask = maskValues(env); cloudJob = { apply: true };
      }
      else if (job.type === "cloud-vpn") {
        // Make an applied range VPN-only (or re-sync the gateway after the runner's IP changed): needs the provider credentials for the security group.
        const a = validateCloudApply(job.payload); args = ["cloud", "vpn", a.id, "--yes"]; env = a.env; mask = maskValues(env); cloudJob = { vpn: true };
        push({ level: "info", message: "Setting up the lab VPN on the Splunk server and closing every port that is open to the internet" });
      }
      else if (["start", "stop", "destroy"].includes(job.type)) {
        args = await validateLifecycle(job.type, job.payload);
        if (job.type === "destroy" && job.payload?.destroy_cloud === true) args.push("--destroy-cloud");
        // Removing a cloud plan runs with the same credentials (rtlab refuses while the Terraform state holds resources).
        if (job.payload?.provider && job.payload?.credentials) { env = cloudEnv(job.payload.provider, job.payload.credentials); mask = maskValues(env); }
        if (job.payload?.target) { remoteJob = { remote: validateTarget(job.payload.target), lifecycle: true }; mask = (s) => remoteSecrets(remoteJob.remote).reduce((acc, v) => String(acc).split(v).join("***"), String(s)); }
      }
      else throw new Error(`unsupported job type "${String(job.type).slice(0, 30)}"`);

      this.say(`job ${job.id}: ${job.type} ${(remoteJob && !remoteJob.lifecycle ? remoteDeployArgs(remoteJob) : args).slice(0, 3).join(" ")}`);
      push({ level: "info", message: `Runner "${this.cfg.name}" started ${job.type}` });
      const invoke = (extraArgs = [], extraEnv = null) => this.exclusive(() => runCli([...(remoteJob && !remoteJob.lifecycle ? remoteDeployArgs(remoteJob) : args), ...extraArgs], (ev) => onEvent({ ...ev, message: mask(ev.message) }), this.cli, extraEnv ? { ...(env || {}), ...extraEnv } : env));
      const { result, code } = remoteJob ? await withRemoteCli(remoteJob.remote, (ra, re) => invoke(ra, re)) : await invoke();
      if (!result || result.ok === false || code !== 0) throw new Error(mask(result?.error || `rtlab exited with code ${code}`));
      await finish("succeeded", job.type === "deploy"
        ? { result: cloudJob ? mapCloudResult(result, cloudJob.lab) : wholeLab ? mapLabResult(result, wholeLab.lab) : remoteJob ? mapRemoteResult(result) : mapDeployResult(result) }
        : job.type === "cloud-apply" || job.type === "cloud-vpn" ? { result: mapCloudApplyResult(result) }
        : { result: { rtlab_id: job.payload.rtlab_id, ...(result?.removed && typeof result.removed === "object" ? { removed: result.removed } : {}) } });
    } catch (e) {
      if (e instanceof AuthError) throw e;
      this.say(`job ${job.id} failed: ${e.message}`);
      push({ level: "error", message: e.message });
      await finish("failed", { error: redact(e.message).slice(0, 1500) });
    }
  }

  async run() {
    const sleep = (ms) => new Promise((resolve) => {
      const wake = () => { clearTimeout(t); this.sleepers.delete(wake); resolve(); };
      const t = setTimeout(wake, ms);
      this.sleepers.add(wake);
    });
    let backoff = 1000;
    const hb = async () => {
      try { const r = await this.heartbeat(); backoff = 1000; return r; }
      catch (e) { if (e instanceof AuthError) { this.stopping = true; this.say(`stopping: ${e.message}. Re-enroll this runner with a new code.`); this.fatal = e; } else this.say(`heartbeat: ${e.message}`); }
    };
    await hb();
    this.timers.push(setInterval(hb, this.heartbeatMs));
    this.timers.push(setInterval(() => this.reap().catch(() => {}), this.reapMs));

    while (!this.stopping) {
      try {
        const { status, json } = await this.api("poll", {});
        if (status === 401) throw new AuthError(json?.error || "the control plane rejected this runner's key");
        if (status !== 200) throw new Error(`poll failed (HTTP ${status})`);
        backoff = 1000;
        if (json?.job) { await this.handle(json.job); continue; }
        await sleep(this.cfg.pollIntervalSeconds * 1000);
      } catch (e) {
        if (e instanceof AuthError) { this.stopping = true; this.fatal = e; this.say(`stopping: ${e.message}. Re-enroll this runner with a new code.`); break; }
        this.say(`${e.message}; retrying in ${Math.round(backoff / 1000)}s`);
        await sleep(backoff); backoff = Math.min(backoff * 2, 60_000);
      }
    }
    this.stop();
    await this.busy;
    if (this.fatal) throw this.fatal;
  }

  stop() {
    this.stopping = true;
    for (const t of this.timers) { clearTimeout(t); clearInterval(t); }
    this.timers = [];
    for (const wake of [...this.sleepers]) wake();
  }
}
