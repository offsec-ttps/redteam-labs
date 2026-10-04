/**
 * Splunk Attack Range in the cloud (AWS) — the project's own 4.x cloud mode, driven through its config loader and
 * Terraform wrapper (src/engines/arcloud-shim.py) so provisioning stays upstream's: stock Ubuntu and Windows AMIs,
 * then Ansible inside Terraform installs Splunk, forwarders, Sysmon and the attack tooling.
 *
 * Same rule as every cloud lab here: `deploy` only PLANS (free, nothing created). `apply` is a separate, explicit step
 * that creates billable EC2 instances; `destroy --destroy-cloud` tears them down and deletes the key pair. The
 * per-deployment RSA key pair (needed to decrypt Windows passwords) lives under the lab folder (0600).
 *
 * ACCESS IS PRIVATE. Nothing a student uses is reachable from the internet:
 *  - the range is provisioned with its security group whitelisted to this machine's public IP only (never 0.0.0.0/0);
 *  - after the build, the Splunk server doubles as a WireGuard gateway (`vpnEnable`): the security group then admits
 *    only UDP 51820 from anywhere plus SSH/WinRM/Splunk-API from the runner (Ansible keeps working), and students
 *    reach Splunk and the Windows hosts on their PRIVATE VPC addresses through the tunnel, one peer config each.
 *  Same idea as the detection-platform's router + private subnet, without forking Attack Range's Terraform.
 */
import { mkdir, writeFile, rm, readFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { has, run, capture } from "../run.mjs";
import { LABS_DIR, RT_HOME } from "../state.mjs";
import { credEnv, verifyCreds } from "../creds.mjs";
import { normalizeRemote } from "../remote.mjs";
import * as vpn from "../remote-vpn.mjs";
import { cloneOnce } from "./docker.mjs";
import { generatePassword } from "./attackrange.mjs";
import { INSTANCES as PROVIDER_INSTANCES, SUPPORTS, findPreset, PROVIDERS } from "./arcloud-presets.mjs";

export const UPSTREAM = "https://github.com/splunk/attack_range";
export const UPSTREAM_REF = "v4.0.1";
const VENV = path.join(RT_HOME, "attack-range", "venv-v4");
const SHIM = path.join(path.dirname(fileURLToPath(import.meta.url)), "arcloud-shim.py");
const AWS_REGION = /^[a-z]{2}(-gov)?-[a-z]+-\d$/;
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
/** Attack Range's VPC (10.0.0.0/16, hosts in 10.0.1.0/24): what VPN clients route through the gateway. */
export const RANGE_NETWORKS = ["10.0.0.0/16"];
export const VPN = { ...vpn.DEFAULTS, routes: RANGE_NETWORKS };

/** This machine's public IPv4: the only address the range's security group admits for provisioning. */
export async function publicIp() {
  for (const url of ["https://api.ipify.org", "https://checkip.amazonaws.com"]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const t = (await r.text()).trim();
      if (r.ok && IPV4.test(t)) return t;
    } catch { /* next */ }
  }
  throw new Error("could not determine this machine's public IP (needed to whitelist the runner, and only the runner, on the range's security group)");
}

export const INSTANCES = PROVIDER_INSTANCES.aws;   // kept for callers that only know AWS
const AZURE_LOCATIONS = ["West Europe", "North Europe", "East US", "East US 2", "West US 2", "Central US", "UK South", "Southeast Asia", "Central India"];
const GCP_REGION = /^[a-z]+-[a-z]+\d$/, GCP_ZONE = /^[a-z]+-[a-z]+\d-[a-z]$/, GCP_PROJECT = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

/** Validate and normalise the range's cloud options; a preset id fills the knobs first, explicit values win. */
export function normalizeCloudOptions(o = {}) {
  const int = (v, lo, hi, what, dflt) => {
    if (v == null || v === "") return dflt;
    const n = Number(v);
    if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`${what} must be a whole number from ${lo} to ${hi}`);
    return n;
  };
  const bool = (v, dflt = false) => (v == null ? dflt : v === true || v === "1" || v === "true");
  let preset = null;
  if (o.preset != null && o.preset !== "") {
    if (typeof o.preset !== "string" || !/^[a-z0-9_]{3,48}$/.test(o.preset)) throw new Error("preset id is not valid");
    preset = findPreset(o.preset);
    if (!preset) throw new Error(`unknown Attack Range preset "${o.preset}"`);
    if (o.provider && o.provider !== preset.provider) throw new Error(`preset ${o.preset} is for ${preset.provider}, not ${String(o.provider).slice(0, 10)}`);
  }
  const provider = o.provider || preset?.provider || "aws";
  if (!PROVIDERS.includes(provider)) throw new Error(`Attack Range in the cloud supports aws, azure and gcp (got "${String(provider).slice(0, 10)}")`);
  const po = preset?.options || {};
  const pick = (k) => (o[k] != null && o[k] !== "" ? o[k] : po[k]);
  const n = {
    provider, preset: preset?.id || null,
    windows: int(pick("windows"), 0, 4, "--windows", 1), linux: int(pick("linux"), 0, 2, "--linux", 0),
    kali: bool(pick("kali")), createDomain: bool(pick("createDomain")), zeek: bool(pick("zeek")), soar: bool(pick("soar")), installEs: bool(pick("installEs")),
  };
  for (const [flag, name] of [["kali", "Kali"], ["zeek", "Zeek"], ["soar", "SOAR"]]) if (n[flag] && !SUPPORTS[provider].includes(flag)) throw new Error(`${name} is not available on ${provider} in Attack Range`);
  if (n.createDomain && n.windows < 1) throw new Error("a domain controller needs at least one Windows server");
  if (provider === "aws") { n.region = o.region || "us-east-1"; if (!AWS_REGION.test(n.region)) throw new Error("region must look like us-east-1"); }
  if (provider === "azure") { n.location = o.location || o.region || "West Europe"; if (!AZURE_LOCATIONS.includes(n.location)) throw new Error(`location must be one of: ${AZURE_LOCATIONS.join(", ")}`); n.region = n.location; }
  if (provider === "gcp") {
    n.region = o.region || "us-central1"; n.zone = o.zone || `${n.region}-a`; n.projectId = o.projectId || o.project_id || "";
    if (!GCP_REGION.test(n.region)) throw new Error("region must look like us-central1");
    if (!GCP_ZONE.test(n.zone) || !n.zone.startsWith(n.region)) throw new Error("zone must be in the region, like us-central1-a");
    if (!GCP_PROJECT.test(n.projectId)) throw new Error("projectId must be a GCP project id (6-30 chars, lowercase letters, digits, dashes)");
  }
  return n;
}

/** The instances a range with these options creates, for the pre-deployment summary. */
export function instancesFor(n) {
  const I = PROVIDER_INSTANCES[n.provider] || PROVIDER_INSTANCES.aws;
  const list = [{ role: "splunk", name: `Splunk server${n.installEs ? " (Enterprise Security)" : ""}`, ...I.splunk }];
  for (let i = 0; i < n.windows; i++) list.push({ role: "windows", name: `Windows server ${i}${i === 0 && n.createDomain ? " (domain controller)" : ""}`, ...I.windows });
  for (let i = 0; i < n.linux; i++) list.push({ role: "linux", name: `Linux server ${i}`, ...I.linux });
  if (n.kali) list.push({ role: "kali", name: "Kali", ...I.kali });
  if (n.zeek && I.zeek) list.push({ role: "zeek", name: "Zeek sensor", ...I.zeek });
  if (n.soar && I.soar) list.push({ role: "soar", name: "Splunk SOAR", ...I.soar });
  const usdPerHour = Math.round(list.reduce((a, x) => a + x.usdPerHour, 0) * 100) / 100;
  return { list, usdPerHour, approximate: true };
}

const y = (s) => JSON.stringify(String(s));   // a YAML-safe double-quoted scalar
/** attack_range.yml: only the overrides; the project merges them with configs/attack_range_default.yml. */
export function renderConfig({ name, keyName, privateKeyPath, password, n, whitelist }) {
  // The whitelist is the security group's ingress source. It is this machine (the runner) only: students never use
  // these public addresses, they come in through the VPN gateway set up after the build.
  if (!whitelist || !IPV4.test(whitelist)) throw new Error("renderConfig needs the runner's public IPv4 as whitelist");
  const lines = [
    "general:", `  cloud_provider: ${y(n.provider)}`, `  key_name: ${y(keyName)}`, `  attack_range_name: ${y(name)}`,
    `  attack_range_password: ${y(password)}`, `  ip_whitelist: ${y(`${whitelist}/32`)}`,
  ];
  if (n.provider === "aws") lines.push("aws:", `  region: ${y(n.region)}`, `  private_key_path: ${y(privateKeyPath)}`, `  use_elastic_ips: "1"`);
  if (n.provider === "azure") lines.push("azure:", `  location: ${y(n.location)}`, `  subscription_id: ${y(n.subscriptionId || process.env.ARM_SUBSCRIPTION_ID || "")}`, `  private_key_path: ${y(privateKeyPath)}`, `  public_key_path: ${y(privateKeyPath + ".pub")}`);
  if (n.provider === "gcp") lines.push("gcp:", `  region: ${y(n.region)}`, `  zone: ${y(n.zone)}`, `  project_id: ${y(n.projectId)}`, `  private_key_path: ${y(privateKeyPath)}`, `  public_key_path: ${y(privateKeyPath + ".pub")}`);
  lines.push("splunk_server:", `  install_es: ${y(n.installEs ? "1" : "0")}`, "windows_servers:");
  for (let i = 0; i < n.windows; i++) {
    lines.push(`  - hostname: ${y(`ar-win-${i}`)}`, `    windows_image: "windows-server-2019"`,
      `    create_domain: ${y(i === 0 && n.createDomain ? "1" : "0")}`, `    join_domain: ${y(i > 0 && n.createDomain ? "1" : "0")}`, ...(n.zeek ? [`    zeek_monitor: "1"`] : []));
  }
  if (!n.windows) lines.push("  []");
  lines.push("linux_servers:");
  for (let i = 0; i < n.linux; i++) lines.push(`  - hostname: ${y(`ar-linux-${i}`)}`);
  if (!n.linux) lines.push("  []");
  lines.push("kali_server:", `  kali_server: ${y(n.kali ? "1" : "0")}`);
  lines.push("zeek_server:", `  zeek_server: ${y(n.zeek ? "1" : "0")}`);
  lines.push("phantom_server:", `  phantom_server: ${y(n.soar ? "1" : "0")}`);
  return lines.join("\n") + "\n";
}

export async function pythonForVenv() {
  for (const c of ["python3.13", "python3.12", "python3.11", "python3.10"]) if (await has(c, ["--version"])) return c;
  const v = await capture("python3", ["-c", "import sys; print(sys.version_info[0]*100+sys.version_info[1])"], 10_000);
  if (Number(v) >= 310) return "python3";
  throw new Error("Attack Range 4 needs Python 3.10 or newer (found an older python3); install python3.11 and retry");
}

export async function preflight(provider = "aws") {
  if (!(await has("terraform", ["version"]))) throw new Error("`terraform` not found — install Terraform, then retry.");
  if (!(await has("git"))) throw new Error("`git` not found — needed to fetch Attack Range.");
  await pythonForVenv();
  if (!(await has("ssh", ["-V"]))) throw new Error("`ssh` not found — install an OpenSSH client (ssh-keygen makes the range's key pair).");
  const v = await verifyCreds(provider);
  if (!v.ok) throw new Error(`${provider.toUpperCase()} credentials not usable: ${v.error}`);
  return v;
}

/** Attack Range's Python requirements in an isolated environment (first use takes a few minutes). */
export async function ensureVenv(src, onLog) {
  const py = path.join(VENV, "bin", "python");
  if (existsSync(py) && (await capture(py, ["-c", "import python_terraform, boto3, yaml"], 30_000)) !== null) return VENV;
  onLog?.("preparing Attack Range's Python environment (first use; a few minutes)…");
  const tmp = path.join(RT_HOME, "attack-range", "tmp-v4");
  await mkdir(tmp, { recursive: true });
  const env = { TMPDIR: tmp, PIP_CACHE_DIR: path.join(RT_HOME, "attack-range", "pip-cache") };
  if (!existsSync(py)) await run(await pythonForVenv(), ["-m", "venv", VENV], { timeout: 300_000, onLog });
  await run(path.join(VENV, "bin", "pip"), ["install", "-q", "--upgrade", "pip", "wheel"], { timeout: 600_000, env, onLog });
  await run(path.join(VENV, "bin", "pip"), ["install", "-q", "-r", path.join(src, "requirements.txt")], { timeout: 1_800_000, env, onLog });
  await rm(tmp, { recursive: true, force: true }).catch(() => {});
  return VENV;
}

const shimEnv = (n) => {
  const p = n?.provider || "aws";
  const env = { ...credEnv(p), PATH: `${path.join(VENV, "bin")}:${process.env.PATH}`, ANSIBLE_HOST_KEY_CHECKING: "False" };
  if (p === "aws") Object.assign(env, { AWS_DEFAULT_REGION: n.region, AWS_REGION: n.region });
  if (p === "azure") Object.assign(env, { AZURE_SUBSCRIPTION_ID: env.ARM_SUBSCRIPTION_ID || "", AZURE_CLIENT_ID: env.ARM_CLIENT_ID || "", AZURE_CLIENT_SECRET: env.ARM_CLIENT_SECRET || "", AZURE_TENANT_ID: env.ARM_TENANT_ID || "" });
  if (p === "gcp") Object.assign(env, { CLOUDSDK_CORE_PROJECT: n.projectId, GOOGLE_PROJECT: n.projectId, GOOGLE_CLOUD_PROJECT: n.projectId });
  return env;
};
const shim = async (dep, action, extra = [], { onLog, timeout = 900_000, captureOut = false } = {}) => {
  // Always run the driver that ships with THIS rtlab, not the copy made when the range was planned: an old copy once
  // lacked `sg-lockdown`, failed, and the failure read as "nothing open". A failed capture is an error, never a result.
  await copyFile(SHIM, path.join(dep.srcDir, "rtlab_arcloud.py"));
  const args = [path.join(dep.srcDir, "rtlab_arcloud.py"), action, "attack_range.yml", ...extra];
  const opts = { cwd: dep.srcDir, env: shimEnv(dep.options), timeout, onLog };
  if (!captureOut) return run(path.join(VENV, "bin", "python"), args, opts);
  const out = await capture(path.join(VENV, "bin", "python"), args, timeout, { cwd: dep.srcDir, env: shimEnv(dep.options) });
  if (out === null) throw new Error(`Attack Range driver "${action}" failed (run with RTLAB_DEBUG=1 for its output)`);
  return out;
};

function planSummary(lines) {
  const m = lines.join("\n").match(/Plan:\s*(\d+)\s*to add,\s*(\d+)\s*to change,\s*(\d+)\s*to destroy/);
  return m ? { add: Number(m[1]), change: Number(m[2]), destroy: Number(m[3]) } : null;
}

/** Plan only. Returns what `rtlab deploy` records; `apply` creates the instances later. */
export async function deploy(entry, opts) {
  const { id, onLog, dryRun = false } = opts;
  const n = normalizeCloudOptions(opts.options);
  const dir = path.join(LABS_DIR, id);
  const srcDir = path.join(dir, "src");
  const short = id.replace(/[^a-z0-9]/g, "").slice(-8);
  const keyName = `rtlab-${short}`;
  const name = `rt${short}`;
  const keyFile = path.join(dir, "keys", "ar_rsa");
  const password = generatePassword();
  const instances = instancesFor(n);
  if (dryRun) {
    const config = renderConfig({ name, keyName, privateKeyPath: keyFile, password, n, whitelist: "203.0.113.1" });
    return { dryRun: true, dir, provider: n.provider, region: n.region, options: n, instances, config: config.split(password).join("<generated>").replace("203.0.113.1/32", "<this machine's public IP>/32") };
  }

  const identity = await preflight(n.provider);
  const runnerIp = await publicIp();
  onLog?.(`the range's security group will admit ${runnerIp} (this machine) only; students use the lab VPN set up after the build`);
  if (n.provider === "azure") n.subscriptionId = credEnv("azure").ARM_SUBSCRIPTION_ID || "";
  await mkdir(path.join(dir, "keys"), { recursive: true, mode: 0o700 });
  onLog?.(`fetching Splunk Attack Range ${UPSTREAM_REF}…`);
  await cloneOnce(UPSTREAM, srcDir, UPSTREAM_REF, onLog);
  await ensureVenv(srcDir, onLog);
  if (!existsSync(keyFile)) await run("ssh-keygen", ["-q", "-t", "rsa", "-b", "2048", "-m", "PEM", "-N", "", "-f", keyFile], { timeout: 60_000 });
  if (n.installEs) {
    // Enterprise Security is licensed: the user drops the .spl into the range's apps folder; nothing is downloaded for them.
    const esApp = (await readFile(path.join(srcDir, "configs", "attack_range_default.yml"), "utf-8")).match(/splunk_es_app:\s*"?([^"\n]+)"?/)?.[1]?.trim();
    const esPath = path.join(RT_HOME, "attack-range", "apps", esApp || "splunk-enterprise-security.spl");
    if (!existsSync(esPath)) throw new Error(`Enterprise Security needs your licensed package: copy ${esApp || "the ES .spl"} to ${path.dirname(esPath)}/ on the runner, then plan again (or pick a preset without ES).`);
    await mkdir(path.join(srcDir, "apps"), { recursive: true });
    await copyFile(esPath, path.join(srcDir, "apps", path.basename(esPath)));
  }
  const config2 = renderConfig({ name, keyName, privateKeyPath: keyFile, password, n, whitelist: runnerIp });
  await writeFile(path.join(srcDir, "attack_range.yml"), config2, { encoding: "utf-8", mode: 0o600 });
  await copyFile(SHIM, path.join(srcDir, "rtlab_arcloud.py"));
  const dep = { id, dir, srcDir, options: n };
  const captured = [];
  onLog?.(`terraform plan in ${n.region} — previewing, nothing is created…`);
  try {
    await shim(dep, "plan", [], { onLog: (l) => { captured.push(l); onLog?.(l); }, timeout: 1_200_000 });
  } catch (e) {
    if (/latest-kali-linux|kali/i.test(captured.join("\n")) && /query returned no results/i.test(captured.join("\n")))
      throw new Error("Kali on AWS needs a one-time, free subscription to the Kali Linux AMI in AWS Marketplace (search 'Kali Linux' by Offensive Security, click Subscribe), then plan again; or deploy the range without Kali.");
    throw e;
  }
  const tfDir = path.join(srcDir, "terraform", n.provider);
  return {
    planned: true, engine: "arcloud", dir, tfDir, provider: n.provider, identity: identity.identity, plan: planSummary(captured), services: [], status: "planned",
    applyCmd: `rtlab cloud apply ${id} --yes`, destroyCmd: `rtlab destroy ${id} --destroy-cloud --yes`,
    extra: { srcDir, options: n, keyName, keyFile, instances, runnerIp, vpnOnly: true, access: { password, username: "admin" } },
  };
}

/** The range's instances as the shim reports them (name, state, public_ip, private_ip, type, id). */
async function rangeRows(dep) {
  return JSON.parse((await shim(dep, "instances", [], { captureOut: true, timeout: 120_000 })) || "[]");
}

const short = (name) => name.split("-").slice(0, 2).join("-");
/** Services and logins on the given addresses (public before the VPN exists, private once it does). */
function endpoints(dep, rows, field) {
  const splunk = rows.find((r) => /^ar-splunk-/.test(r.name));
  const ip = (r) => r?.[field];
  const services = [];
  if (ip(splunk)) services.push({ name: "splunk-web", port: 8000, protocol: "http", url: `http://${ip(splunk)}:8000` }, { name: "splunk-api", port: 8089, protocol: "https", url: `https://${ip(splunk)}:8089` });
  for (const r of rows.filter((x) => /^ar-win-/.test(x.name))) if (ip(r)) services.push({ name: `${short(r.name)}-rdp`, port: 3389, protocol: "rdp", url: `rdp://${ip(r)}:3389` });
  for (const r of rows.filter((x) => /^ar-(linux|kali)-/.test(x.name))) if (ip(r)) services.push({ name: `${short(r.name)}-ssh`, port: 22, protocol: "ssh", url: `ssh://ubuntu@${ip(r)}` });
  const access = { ...(dep.access || {}),
    splunk: ip(splunk) ? { url: `http://${ip(splunk)}:8000`, username: "admin", password: dep.access?.password } : null,
    windows: rows.filter((x) => /^ar-win-/.test(x.name) && ip(x)).map((r) => ({ host: ip(r), port: 3389, username: "Administrator", password: dep.access?.password, hostname: r.name })) };
  return { services, access, splunk };
}

/** SSH target for the gateway: the Splunk server (Ubuntu) with the range's own key pair. */
function gateway(dep, rows) {
  const splunk = rows.find((r) => /^ar-splunk-/.test(r.name) && r.state === "running");
  if (!splunk?.public_ip) throw new Error("the Splunk server is not running (or has no public address), so there is no VPN gateway to set up");
  if (!dep.keyFile || !existsSync(dep.keyFile)) throw new Error("this range's SSH key is not on this machine; the VPN can only be managed from the runner that built it");
  return { splunk, remote: normalizeRemote({ host: splunk.public_ip, port: 22, username: "ubuntu", keyFile: dep.keyFile, label: "Splunk server (VPN gateway)" }) };
}

/**
 * Make an applied range VPN-only: WireGuard on the Splunk server (forwarding to the VPC behind NAT), then the security
 * group admits only the VPN port from the internet plus provisioning ports from the runner. Idempotent; re-run after
 * the runner's public IP changes. Returns the VPN facts and the PRIVATE endpoints students use.
 */
export async function vpnEnable(dep, { onLog } = {}) {
  await preflight(dep.options?.provider || "aws");
  await ensureVenv(dep.srcDir, onLog);
  const rows = await rangeRows(dep);
  const { splunk, remote } = gateway(dep, rows);
  const opts = { address: VPN.address, network: VPN.network, port: VPN.port, routes: VPN.routes, firewall: false };
  onLog?.(`WireGuard on the Splunk server ${splunk.public_ip}: ${opts.address} on ${opts.network}, UDP ${opts.port}, routing ${opts.routes.join(", ")} for clients`);
  const text = await vpn.runOnServer(remote, vpn.setupScript(opts), { onLog, timeout: 900_000 });
  if (text === null) throw new Error("the VPN setup script failed on the Splunk server");
  const kv = Object.fromEntries(text.split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => l.split("=")));
  if (!kv.SERVER_PUB) throw new Error("the gateway did not report its WireGuard public key");
  const runnerIp = await publicIp();
  onLog?.(`security group: closing every port that was open to the internet; keeping UDP ${opts.port} (VPN) and provisioning from ${runnerIp}`);
  const sg = JSON.parse((await shim(dep, "sg-lockdown", [runnerIp, String(opts.port)], { captureOut: true, timeout: 180_000 })) || "{}");
  const stillOpen = (sg.groups || []).flatMap((g) => g.public_ports || []).filter((p) => !(p.protocol === "udp" && p.from === opts.port));
  if (stillOpen.length) throw new Error(`ports still open to the internet after lockdown: ${stillOpen.map((p) => `${p.protocol}/${p.from}`).join(", ")}`);
  const { services, access } = endpoints(dep, rows, "private_ip");
  const facts = { gateway: splunk.public_ip, endpoint: `${splunk.public_ip}:${opts.port}`, server_public_key: kv.SERVER_PUB, address: opts.address, network: opts.network, port: opts.port, routes: opts.routes, runner_ip: runnerIp, enabled_at: new Date().toISOString() };
  return { vpn: facts, vpnOnly: true, services, access, instances: rows, securityGroups: sg.groups || [] };
}

/** One WireGuard peer on the range's gateway; the client config (with its private key) is returned once, never stored here. */
export async function vpnPeer(dep, name, { onLog } = {}) {
  if (!dep.vpn?.endpoint) throw new Error("this range is not VPN-only yet: run `rtlab cloud vpn <id>` first");
  const rows = await rangeRows(dep);
  const { remote } = gateway(dep, rows);
  const text = await vpn.runOnServer(remote, vpn.addPeerScript({ name, address: VPN.address, network: VPN.network, port: VPN.port, routes: VPN.routes, endpoint: dep.vpn.endpoint }), { onLog, timeout: 120_000 });
  if (text === null) throw new Error(`could not create the VPN peer "${name}" (does it already exist?)`);
  const config = text.slice(text.indexOf("[Interface]"));
  return { name, address: config.match(/Address = ([\d.]+)/)?.[1] || null, config };
}

export async function vpnRemovePeer(dep, name, { onLog } = {}) {
  const rows = await rangeRows(dep);
  const { remote } = gateway(dep, rows);
  const text = await vpn.runOnServer(remote, vpn.removePeerScript({ name }), { onLog, timeout: 60_000 });
  if (text === null) throw new Error(`could not remove the VPN peer "${name}"`);
  return { name };
}

/** The billable step: import the key pair, build the range (Terraform apply + Ansible), read the public addresses. */
export async function apply(dep, { onLog } = {}) {
  if (!dep.srcDir || !existsSync(path.join(dep.srcDir, "attack_range.yml"))) throw new Error("this range was not planned on this machine");
  await preflight(dep.options?.provider || "aws");
  await ensureVenv(dep.srcDir, onLog);
  if ((dep.options?.provider || "aws") === "aws") {
    onLog?.(`importing key pair ${dep.keyName} into ${dep.options.region}…`);
    await shim(dep, "keypair-import", [`${dep.keyFile}.pub`], { onLog, timeout: 120_000 });
  }
  onLog?.("attack_range build: Terraform apply, then Ansible provisions Splunk and the hosts (30-60 minutes)…");
  await shim(dep, "build", [], { onLog, timeout: 3 * 3_600_000 });
  const rows = await rangeRows(dep);
  if ((dep.options?.provider || "aws") === "aws") {
    // Private access is the default, not an option: the gateway goes up as part of the apply.
    try {
      const v = await vpnEnable({ ...dep, srcDir: dep.srcDir }, { onLog });
      return { status: v.services.length ? "running" : "starting", ...v };
    } catch (e) {
      // No gateway, no endpoints: students are never handed a public address. The security group still admits only this
      // machine (never the internet); the operator retries with `rtlab cloud vpn <id>` and the private addresses appear then.
      onLog?.(`VPN gateway not set up: ${e.message}. No lab addresses are published; the range admits only ${dep.runnerIp || "the runner"} until \`rtlab cloud vpn ${dep.id}\` succeeds.`);
      return { status: "running", services: [], access: { ...(dep.access || {}), splunk: null, windows: [] }, instances: rows, vpn: null, vpnOnly: false, vpnError: e.message };
    }
  }
  const { services, access } = endpoints(dep, rows, "public_ip");
  return { status: services.length ? "running" : "starting", services, access, instances: rows, vpn: null, vpnOnly: false };
}

export async function start() { throw new Error("cloud ranges have no start/stop here — destroy with --destroy-cloud to stop the spend"); }
export async function stop() { throw new Error("cloud ranges have no start/stop here — destroy with --destroy-cloud to stop the spend"); }

/** Count of resources in Terraform state (what bills). */
async function stateCount(dep) {
  if (!dep.tfDir || !existsSync(dep.tfDir)) return 0;
  const stateFile = path.join(dep.tfDir, "state", `${dep.options ? `rt${dep.id.replace(/[^a-z0-9]/g, "").slice(-8)}` : "ar"}.terraform.tfstate`);
  const out = await capture("terraform", ["state", "list", `-state=${stateFile}`], 60_000, { cwd: dep.tfDir, env: shimEnv(dep.options || { region: "us-east-1" }) }).catch(() => null);
  return out ? out.split("\n").filter(Boolean).length : 0;
}

export async function destroy(dep, { onLog, destroyCloud = false } = {}) {
  const remaining = await stateCount(dep);
  if (remaining > 0 && !destroyCloud) {
    throw new Error(`${remaining} cloud resource(s) exist for this range. Run \`rtlab destroy ${dep.id} --destroy-cloud --yes\` to tear them down (billable until then); the local record is kept so they stay reachable.`);
  }
  if (remaining > 0) {
    onLog?.(`terraform destroy: removing ${remaining} resource(s) in ${dep.options?.region}…`);
    await shim(dep, "destroy", [], { onLog, timeout: 3_600_000 });
    if ((dep.options?.provider || "aws") === "aws") await shim(dep, "keypair-delete", [], { onLog, timeout: 120_000 }).catch((e) => onLog?.(`key pair: ${e.message}`));
    if ((await stateCount(dep)) > 0) throw new Error("terraform destroy did not remove everything; the local record is kept. Check the AWS console and retry.");
  }
  if (dep.dir) await rm(dep.dir, { recursive: true, force: true }).catch(() => {});
  return { cloud: remaining > 0 ? "destroyed" : "nothing applied" };
}

export async function logs(dep) { return { cmd: "tail", args: ["-n", "300", path.join(dep.srcDir || dep.dir, "attack_range.log")], cwd: dep.dir }; }

export async function status(dep) {
  const n = await stateCount(dep);
  return { status: n > 0 ? "running" : "planned", resources: n, containers: [] };
}
