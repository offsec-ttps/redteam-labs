/**
 * Splunk Attack Range (local) engine.
 *
 * Builds the Attack Range that Splunk's own project describes for "local" mode (v3.0.0, the last version
 * with a Vagrant/VirtualBox provider): a Splunk server, one or more Windows servers (optionally a domain
 * controller), optional Linux servers and an optional Kali box, all provisioned by the project's own
 * Ansible playbooks (Sysmon, universal forwarders, ESCU content, Atomic Red Team ...).
 *
 * What rtlab adds on top of the upstream templates:
 *   - every forwarded port is bound to ONE private address (never 0.0.0.0), and allocated to be free;
 *   - VM names are unique per deployment, so several ranges can coexist;
 *   - no GUI windows pop up; a per-deployment password replaces the project's hardcoded one;
 *   - Ansible runs from an isolated virtual environment (the system Ansible on this host is broken);
 *   - the range is tracked, TTL'd, stopped, started and destroyed like every other rtlab lab.
 *
 * Downloads on first build: Splunk Enterprise 8.2.5 (~550 MB), apps from Splunk's public S3 bucket, the
 * Windows 2016 box (d1vious/windows2016, ~6 GB) and generic/ubuntu2004. Budget 30-60 minutes.
 */

import { mkdir, writeFile, rm, appendFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { has, run, capture, waitForPort } from "../run.mjs";
import { LABS_DIR, VAGRANT_HOME, RT_HOME } from "../state.mjs";
import { freePort } from "../net.mjs";
import { cloneOnce } from "./docker.mjs";

export const UPSTREAM = "https://github.com/splunk/attack_range";
export const UPSTREAM_REF = "v3.0.0";                       // pinned: later versions dropped local mode
const VENV = path.join(RT_HOME, "attack-range", "venv");
const vagrantEnv = () => ({ VAGRANT_HOME, PATH: `${path.join(VENV, "bin")}:${process.env.PATH}`, ANSIBLE_HOST_KEY_CHECKING: "False" });

/** The project's own defaults (configs/attack_range_default.yml), minus cloud-only sections. */
const DEFAULTS = {
  general: {
    cloud_provider: "local", key_name: "rtlab", ip_whitelist: "0.0.0.0/0", version: "3.0.0",
    use_prebuilt_images_with_packer: "0", crowdstrike_falcon: "0", crowdstrike_agent_name: "WindowsSensor.exe",
    crowdstrike_customer_ID: "", crowdstrike_logs_region: "", crowdstrike_logs_access_key_id: "",
    crowdstrike_logs_secret_access_key: "", crowdstrike_logs_sqs_url: "", carbon_black_cloud: "0",
    carbon_black_cloud_agent_name: "installer_vista_win7_win8-64-3.8.0.627.msi", carbon_black_cloud_company_code: "", carbon_black_cloud_s3_bucket: "",
  },
  splunk_server: {
    splunk_image: "splunk-v3-0-0", install_es: "0", splunk_es_app: "splunk-enterprise-security_701.spl",
    s3_bucket_url: "https://attack-range-appbinaries.s3-us-west-2.amazonaws.com",
    splunk_url: "https://download.splunk.com/products/splunk/releases/8.2.5/linux/splunk-8.2.5-77015bc7a462-Linux-x86_64.tgz",
    splunk_uf_url: "https://download.splunk.com/products/universalforwarder/releases/8.2.5/linux/splunkforwarder-8.2.5-77015bc7a462-linux-2.6-amd64.deb",
    splunk_uf_win_url: "https://download.splunk.com/products/universalforwarder/releases/8.2.5/windows/splunkforwarder-8.2.5-77015bc7a462-x64-release.msi",
    byo_splunk: "0", byo_splunk_ip: "", ingest_bots3_data: "0", install_dltk: "0",
  },
  phantom_server: {
    phantom_server: "0", phantom_image: "phantom-v3-0-0", phantom_community_username: "user", phantom_community_password: "password",
    phantom_repo_url: "https://repo.phantom.us/phantom/5.2/base/7/x86_64/phantom_repo-5.2.1.78411-1.x86_64.rpm",
    phantom_version: "5.2.1.78411-1", phantom_byo: "0", phantom_byo_ip: "", phantom_byo_api_token: "",
  },
  simulation: {
    atomic_red_team_repo: "redcanaryco", atomic_red_team_branch: "master", prelude: "0",
    prelude_operator_url: "https://download.prelude.org/latest?arch=x64&platform=linux&variant=zip&edition=headless", prelude_account_email: "test@test.com",
  },
  windows: { windows_image: "windows-2016-v3-0-0", create_domain: "0", join_domain: "0", win_sysmon_config: "SwiftOnSecurity.xml", install_red_team_tools: "0", bad_blood: "0" },
  linux: { linux_image: "linux-v3-0-0", sysmon_config: "SysMonLinux-CatchAll.xml" },
};

const SPLUNK_IP = "10.0.1.12";                 // the playbooks assume this address for the Splunk server
const rb = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/#\{/g, "\\#{")}"`;   // a safe Ruby string literal
const vars = (o) => Object.entries(o).map(([k, v]) => `          ${k}: ${rb(v)},`).join("\n");
const safeName = (s) => String(s).replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 40);

/** Windows and Splunk both reject weak passwords; this satisfies both complexity rules. */
export function generatePassword() {
  const a = "abcdefghjkmnpqrstuvwxyz", A = "ABCDEFGHJKMNPQRSTUVWXYZ", d = "23456789", s = "!#%";
  const pick = (set) => set[randomBytes(1)[0] % set.length];
  const body = Array.from({ length: 12 }, () => pick(a + A + d)).join("");
  return `Rt${pick(A)}${body}${pick(d)}${pick(s)}`;
}

/** Validate and normalise the per-deployment options. */
export function normalizeOptions(o = {}) {
  const int = (v, lo, hi, what, dflt) => {
    if (v == null || v === "") return dflt;
    const n = Number(v);
    if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`${what} must be a whole number from ${lo} to ${hi}`);
    return n;
  };
  return {
    windows: int(o.windows, 0, 4, "--windows", 1),
    linux: int(o.linux, 0, 2, "--linux", 0),
    kali: o.kali === true || o.kali === "1",
    createDomain: o.createDomain === true || o.createDomain === "1",
    splunkMemoryMB: int(o.splunkMemoryMB, 4096, 16384, "--memory (Splunk server)", 6144),
    splunkCpus: int(o.splunkCpus, 2, 8, "--cpus (Splunk server)", 4),
    windowsMemoryMB: int(o.windowsMemoryMB, 2048, 8192, "--windows-memory", 2048),
    installEs: false,
  };
}

/** Total RAM the range will claim, for pre-flight. */
/**
 * Upstream's packer/ansible/windows.yml without the `windows_aurora_agent` role: that role downloads a Nextron
 * Aurora Lite licence from a 2022 URL that no longer exists, which failed every build. Sysmon, the Splunk
 * universal forwarder and the Windows baseline are unchanged.
 */
export const WINDOWS_PLAYBOOK = `# Written by rtlab: upstream's windows.yml minus the windows_aurora_agent role (its licence URL is dead).
- hosts: all
  gather_facts: True
  vars:
    ansible_connection: winrm
    ansible_winrm_server_cert_validation: ignore
  roles:
    - role: windows_common
      when: use_prebuilt_images_with_packer == "0"
    - role: windows_universal_forwarder
      when: use_prebuilt_images_with_packer == "0"
    - role: sysmon
      when: use_prebuilt_images_with_packer == "0"
`;

export const memoryFor = (n) => n.splunkMemoryMB + n.windows * n.windowsMemoryMB + n.linux * 2048 + (n.kali ? 2048 : 0);

/**
 * Render the single Vagrantfile the project would have rendered from its Jinja templates, with rtlab's
 * safety changes. `ports` maps each guest port to the host port already allocated on `bindIp`.
 */
export function renderVagrantfile({ id, bindIp, password, n, ports }) {
  const name = safeName(id);
  const general = { ...DEFAULTS.general, attack_range_password: password, attack_range_name: name };
  const fwd = (guest, host) => `    config.vm.network "forwarded_port", guest: ${guest}, host: ${host}, host_ip: ${rb(bindIp)}, protocol: "tcp"`;
  const provider = (vmName, mem, cpus, extra = "") => [
    '    config.vm.provider "virtualbox" do |vb, override|',
    "      vb.gui = false",
    `      vb.name = ${rb(vmName)}`,
    `      vb.customize ["modifyvm", :id, "--memory", "${mem}"]`,
    `      vb.customize ["modifyvm", :id, "--cpus", "${cpus}"]`,
    extra, "    end",
  ].filter(Boolean).join("\n");

  const out = ['Vagrant.configure("2") do |config|', ""];

  out.push(`  config.vm.define ${rb(`ar-splunk-${name}`)} do |config|`,
    '    config.vm.box = "generic/ubuntu2004"',
    '    config.vm.hostname = "ar-splunk"',
    "    config.vm.boot_timeout = 600",
    fwd(8000, ports.splunkWeb), fwd(8089, ports.splunkApi),
    `    config.vm.network :private_network, ip: ${rb(SPLUNK_IP)}`,
    '    config.vm.provision "ansible" do |ansible|',
    '        ansible.playbook = "../packer/ansible/splunk_server.yml"',
    '        ansible.compatibility_mode = "2.0"',
    "        ansible.extra_vars = {",
    '          ansible_python_interpreter: "/usr/bin/python3",',
    `          splunk_admin_password: ${rb(password)},`,
    `          s3_bucket_url: ${rb(DEFAULTS.splunk_server.s3_bucket_url)},`,
    `          splunk_url: ${rb(DEFAULTS.splunk_server.splunk_url)},`,
    vars(general), "        }", "    end",
    '    config.vm.provision "ansible" do |ansible|',
    '        ansible.playbook = "../terraform/ansible/splunk_server_post.yml"',
    '        ansible.compatibility_mode = "2.0"',
    "        ansible.extra_vars = {",
    '          ansible_python_interpreter: "/usr/bin/python3",',
    vars(general), vars({ ...DEFAULTS.splunk_server, install_es: n.installEs ? "1" : "0" }), vars(DEFAULTS.phantom_server), vars(DEFAULTS.simulation),
    "        }", "    end",
    provider(`${name}-splunk`, n.splunkMemoryMB, n.splunkCpus), "  end", "");

  for (let i = 0; i < n.windows; i++) {
    const server = { hostname: `ar-win-${i}`, ...DEFAULTS.windows, create_domain: i === 0 && n.createDomain ? "1" : "0" };
    out.push(`  config.vm.define ${rb(`ar-win-${name}-${i}`)} do |config|`,
      '    config.vm.box = "d1vious/windows2016"',
      `    config.vm.hostname = ${rb(server.hostname)}`,
      "    config.vm.boot_timeout = 600",
      '    config.vm.communicator = "winrm"', "    config.winrm.transport = :plaintext", "    config.winrm.basic_auth_only = true",
      "    config.winrm.timeout = 300", "    config.winrm.retry_limit = 20",
      // WinRM is forwarded on the lab address only, so Vagrant must not look for it on 127.0.0.1 (it would wait
      // the whole boot_timeout for a port that never answers there).
      `    config.winrm.host = ${rb(bindIp)}`, `    config.winrm.port = ${ports.winrm[i]}`,
      fwd(5985, ports.winrm[i]), fwd(3389, ports.rdp[i]),
      `    config.vm.network :private_network, ip: ${rb(`10.0.1.${14 + i}`)}`,
      "    config.vm.synced_folder '.', '/vagrant', disabled: true",
      `    config.vm.provision "shell", inline: ${rb(`net user Administrator ${password}`)}`,
      '    config.vm.provision "ansible" do |ansible|',
      "        ansible.extra_vars = {",
      `          ansible_port: ${ports.winrm[i]},`, "          ansible_winrm_scheme: 'http',",
      `          splunk_admin_password: ${rb(password)},`,
      `          splunk_uf_win_url: ${rb(DEFAULTS.splunk_server.splunk_uf_win_url)},`,
      `          win_password: ${rb(password)},`, "          use_prebuilt_images_with_packer: '0',",
      "        }", '        ansible.playbook = "../packer/ansible/rtlab-windows.yml"', '        ansible.compatibility_mode = "2.0"', "    end",
      '    config.vm.provision "ansible" do |ansible|',
      "        ansible.extra_vars = {",
      `          ansible_port: ${ports.winrm[i]},`, "          ansible_winrm_scheme: 'http',",
      "          ansible_winrm_operation_timeout_sec: 300,", "          ansible_winrm_read_timeout_sec: 400,",
      '          ansible_user: "Administrator",', `          ansible_password: ${rb(password)},`,
      vars(general), vars(server), vars(DEFAULTS.simulation), vars({ ...DEFAULTS.splunk_server, install_es: n.installEs ? "1" : "0" }),
      "        }", '        ansible.playbook = "../terraform/ansible/windows_post.yml"', '        ansible.compatibility_mode = "2.0"', "    end",
      provider(`${name}-win-${i}`, n.windowsMemoryMB, 1, '      vb.customize ["modifyvm", :id, "--vram", "32"]'), "  end", "");
  }

  for (let i = 0; i < n.linux; i++) {
    const server = { hostname: `ar-linux-${i}`, ...DEFAULTS.linux };
    out.push(`  config.vm.define ${rb(`ar-linux-${name}-${i}`)} do |config|`,
      '    config.vm.box = "generic/ubuntu2004"', `    config.vm.hostname = ${rb(server.hostname)}`, "    config.vm.boot_timeout = 600",
      `    config.vm.network :private_network, ip: ${rb(`10.0.1.${21 + i}`)}`, fwd(22, ports.linuxSsh[i]),
      '    config.vm.provision "ansible" do |ansible|',
      '        ansible.playbook = "../packer/ansible/linux_server.yml"', '        ansible.compatibility_mode = "2.0"',
      "        ansible.extra_vars = {", '          ansible_python_interpreter: "/usr/bin/python3",',
      `          splunk_admin_password: ${rb(password)},`, "          use_prebuilt_images_with_packer: '0',",
      `          splunk_uf_url: ${rb(DEFAULTS.splunk_server.splunk_uf_url)},`, "        }", "    end",
      '    config.vm.provision "ansible" do |ansible|',
      '        ansible.playbook = "../terraform/ansible/linux_server_post.yml"', '        ansible.compatibility_mode = "2.0"',
      "        ansible.extra_vars = {", '          ansible_python_interpreter: "/usr/bin/python3",',
      vars(general), vars(server), vars(DEFAULTS.simulation), vars({ ...DEFAULTS.splunk_server, install_es: n.installEs ? "1" : "0" }),
      "        }", "    end",
      provider(`${name}-linux-${i}`, 2048, 1), "  end", "");
  }

  if (n.kali) {
    out.push(`  config.vm.define ${rb(`ar-kali-${name}`)} do |config|`,
      '    config.vm.box = "kalilinux/rolling"', "    config.vm.boot_timeout = 600", '    config.vm.hostname = "kali"',
      '    config.vm.network :private_network, ip: "10.0.1.30"', '    config.ssh.password = "vagrant"', fwd(22, ports.kaliSsh),
      provider(`${name}-kali`, 2048, 1), "  end", "");
  }
  out.push("end", "");
  return out.join("\n");
}

export async function preflight() {
  if (!(await has("vagrant"))) throw new Error("`vagrant` not found — install Vagrant, then retry.");
  if (!(await has("VBoxManage"))) throw new Error("`VBoxManage` not found — install VirtualBox, then retry.");
  if (!(await has("git"))) throw new Error("`git` not found — install git, then retry.");
}

/** Ansible for the playbooks, isolated from whatever the host has (creates it on first use). */
export async function ensureAnsible(onLog) {
  if (existsSync(path.join(VENV, "bin", "ansible-playbook")) && existsSync(path.join(VENV, "bin", "python"))) {
    const ok = await capture(path.join(VENV, "bin", "python"), ["-c", "import ansible, winrm"], 20_000);
    if (ok !== null) return VENV;
  }
  onLog?.("preparing the isolated Ansible environment for Attack Range (first use; a few minutes)…");
  const tmp = path.join(RT_HOME, "attack-range", "tmp");
  await mkdir(tmp, { recursive: true });
  await run("python3", ["-m", "venv", VENV], { timeout: 300_000, onLog });
  // pip builds in TMPDIR and caches in ~/.cache by default; both may sit on a small system drive.
  const env = { TMPDIR: tmp, PIP_CACHE_DIR: path.join(RT_HOME, "attack-range", "pip-cache") };
  await run(path.join(VENV, "bin", "pip"), ["install", "-q", "--upgrade", "pip", "wheel"], { timeout: 600_000, env, onLog });
  await run(path.join(VENV, "bin", "pip"), ["install", "-q", "ansible==5.10.0", "pywinrm>=0.4.3"], { timeout: 1_800_000, env, onLog });
  await rm(tmp, { recursive: true, force: true });
  return VENV;
}

export async function deploy(entry, opts) {
  const { id, bindIp, dryRun = false, onLog } = opts;
  const n = normalizeOptions(opts.options);
  if (!bindIp || bindIp === "0.0.0.0") throw new Error("Attack Range needs a private bind address (see `rtlab doctor`)");
  if (!dryRun) await preflight();

  const dir = path.join(LABS_DIR, id);
  const src = path.join(dir, "src");
  const vagrantDir = path.join(src, "vagrant");
  const password = generatePassword();

  // Allocate every published port on the bind address (dry runs reuse the upstream numbers as examples).
  const alloc = async (want) => (dryRun ? want : freePort(bindIp, want));
  const ports = { splunkWeb: await alloc(8000), splunkApi: await alloc(8089), winrm: [], rdp: [], linuxSsh: [], kaliSsh: null };
  for (let i = 0; i < n.windows; i++) { ports.winrm.push(await alloc(5985 + i)); ports.rdp.push(await alloc(5389 + i)); }
  for (let i = 0; i < n.linux; i++) ports.linuxSsh.push(await alloc(2022 + i));
  if (n.kali) ports.kaliSsh = await alloc(2030);

  const vagrantfile = renderVagrantfile({ id, bindIp, password, n, ports });
  const services = [
    { name: "splunk-web", port: ports.splunkWeb, container: 8000, protocol: "http", url: `http://${bindIp}:${ports.splunkWeb}` },
    { name: "splunk-api", port: ports.splunkApi, container: 8089, protocol: "https", url: `https://${bindIp}:${ports.splunkApi}` },
    ...ports.rdp.map((p, i) => ({ name: `windows-${i}-rdp`, port: p, container: 3389, protocol: "rdp", url: `rdp://${bindIp}:${p}` })),
    ...ports.linuxSsh.map((p, i) => ({ name: `linux-${i}-ssh`, port: p, container: 22, protocol: "ssh", url: `ssh://vagrant@${bindIp}:${p}` })),
    ...(n.kali ? [{ name: "kali-ssh", port: ports.kaliSsh, container: 22, protocol: "ssh", url: `ssh://vagrant@${bindIp}:${ports.kaliSsh}` }] : []),
  ];
  const vmNames = [`ar-splunk-${safeName(id)}`, ...Array.from({ length: n.windows }, (_, i) => `ar-win-${safeName(id)}-${i}`),
    ...Array.from({ length: n.linux }, (_, i) => `ar-linux-${safeName(id)}-${i}`), ...(n.kali ? [`ar-kali-${safeName(id)}`] : [])];
  const vboxNames = [`${safeName(id)}-splunk`, ...Array.from({ length: n.windows }, (_, i) => `${safeName(id)}-win-${i}`),
    ...Array.from({ length: n.linux }, (_, i) => `${safeName(id)}-linux-${i}`), ...(n.kali ? [`${safeName(id)}-kali`] : [])];

  if (dryRun) {
    return { dryRun: true, dir, vagrantDir, vmNames, services, options: n, memoryMB: memoryFor(n),
      vagrantfile: vagrantfile.split(password).join("<generated>") };
  }

  try {
    await mkdir(dir, { recursive: true });
    await ensureAnsible(onLog);
    onLog?.(`fetching Splunk Attack Range ${UPSTREAM_REF}…`);
    await cloneOnce(UPSTREAM, src, UPSTREAM_REF, onLog);
    await writeFile(path.join(src, "packer", "ansible", "rtlab-windows.yml"), WINDOWS_PLAYBOOK, "utf-8");
    await writeFile(path.join(vagrantDir, "Vagrantfile"), vagrantfile, { encoding: "utf-8", mode: 0o600 });   // holds the password
    const log = path.join(dir, "build.log");
    const tee = (l) => { onLog?.(l); appendFile(log, l + "\n").catch(() => {}); };
    onLog?.(`vagrant up — Splunk server + ${n.windows} Windows${n.linux ? ` + ${n.linux} Linux` : ""}${n.kali ? " + Kali" : ""}; first build downloads several GB…`);
    await run("vagrant", ["up", "--provider", "virtualbox"], { cwd: vagrantDir, timeout: 3 * 3_600_000, env: vagrantEnv(), onLog: tee });
    const ready = await waitForPort(bindIp, ports.splunkWeb, { timeout: 300_000, interval: 5000, onLog });
    return {
      dir, vagrantDir, vmNames, vboxNames, services, options: n, memoryMB: memoryFor(n), ready, status: ready ? "running" : "starting",
      access: {
        splunk: { url: `http://${bindIp}:${ports.splunkWeb}`, username: "admin", password },
        windows: ports.rdp.map((p, i) => ({ host: bindIp, port: p, username: "Administrator", password, hostname: `ar-win-${i}` })),
        note: "Hosts talk to each other on 10.0.1.0/24 (Splunk is 10.0.1.12). Windows/Linux forward Sysmon and logs to Splunk.",
      },
    };
  } catch (e) {
    // Keep the build log: the lab directory is removed below, and the log is the only way to see why it failed.
    const keep = path.join(RT_HOME, "logs", `${id}.log`);
    const kept = await mkdir(path.dirname(keep), { recursive: true })
      .then(() => copyFile(path.join(dir, "build.log"), keep)).then(() => true, () => false);
    await destroy({ dir, vagrantDir }, { onLog }).catch(() => {});
    if (kept) e.message += ` (build log kept at ${keep})`;
    throw e;
  }
}

export async function start(dep, { onLog } = {}) {
  await run("vagrant", ["up", "--no-provision", "--provider", "virtualbox"], { cwd: dep.vagrantDir, timeout: 1_800_000, env: vagrantEnv(), onLog });
}
export async function stop(dep, { onLog } = {}) {
  await run("vagrant", ["halt"], { cwd: dep.vagrantDir, timeout: 900_000, env: vagrantEnv(), onLog });
}
export async function destroy(dep, { onLog } = {}) {
  if (dep.vagrantDir && existsSync(path.join(dep.vagrantDir, "Vagrantfile"))) {
    await run("vagrant", ["destroy", "-f"], { cwd: dep.vagrantDir, timeout: 1_800_000, env: vagrantEnv(), onLog })
      .catch((e) => onLog?.(`destroy warning: ${e.message}`));
  }
  if (dep.dir) await rm(dep.dir, { recursive: true, force: true }).catch(() => {});
}
export async function logs(dep) {
  return { cmd: "tail", args: ["-n", "300", path.join(dep.dir, "build.log")], cwd: dep.dir };
}

/** One range = several VMs: running only when all are, partial when some are. */
export async function status(dep) {
  const out = await capture("VBoxManage", ["list", "runningvms"], 8000);
  const names = dep.vboxNames || [];
  const up = names.filter((nme) => out && out.includes(`"${nme}"`)).length;
  return { status: names.length === 0 ? "unknown" : up === names.length ? "running" : up > 0 ? "partial" : "stopped",
    containers: names.map((nme) => ({ name: nme, state: out && out.includes(`"${nme}"`) ? "running" : "stopped" })) };
}
