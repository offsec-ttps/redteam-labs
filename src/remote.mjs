/**
 * Remote Docker hosts (a VPS) reached over SSH. rtlab drives the server's Docker daemon through
 * `DOCKER_HOST=ssh://user@host:port`; the Docker CLI then runs `ssh` itself. To pass a key, a known-hosts
 * file and sane options without touching the operator's ~/.ssh, a wrapper `ssh` is put first in PATH for
 * the one process that needs it. Secrets live in a 0700 scratch directory that is removed afterwards.
 */
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import dns from "node:dns/promises";
import { RT_HOME } from "./state.mjs";
import { capture, has, run } from "./run.mjs";

export const HOST = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$|^(?:\d{1,3}\.){3}\d{1,3}$/;
export const USER = /^[a-z_][a-z0-9_-]{0,31}$/;
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
export const PRESETS = {
  hostinger: { label: "Hostinger VPS", help: "SSH details are under hPanel, VPS, SSH access; root is the default user." },
  digitalocean: { label: "DigitalOcean Droplet", help: "Use the Droplet's public IP, user root, and the SSH key the Droplet was created with." },
  linode: { label: "Linode", help: "Use the Linode's public IP, user root, and the key or root password you set." },
  vultr: { label: "Vultr", help: "Use the instance's public IP, user root, and the SSH key you attached." },
  hetzner: { label: "Hetzner Cloud", help: "Use the server's public IP, user root, and the SSH key you attached." },
  custom: { label: "Custom server", help: "Any Linux server reachable over SSH. Docker is installed for you if missing (needs root or passwordless sudo)." },
};

/** Validate a target block from the CLI or a job. Returns a normalised copy; throws on anything unusable. */
export function normalizeRemote(t) {
  if (!t || typeof t !== "object") throw new Error("remote target missing");
  const host = String(t.host || "").trim();
  if (!HOST.test(host) || host.includes("..")) throw new Error("remote host must be an IP address or hostname");
  const port = t.port == null ? 22 : Number(t.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("remote port must be 1-65535");
  const username = String(t.username || "root").trim();
  if (!USER.test(username)) throw new Error("remote username is not valid");
  const out = { host, port, username, label: String(t.label || host).slice(0, 80), bindIp: null, auth: null };
  if (t.bindIp != null && String(t.bindIp).trim()) {
    const b = String(t.bindIp).trim();
    if (!IPV4.test(b)) throw new Error("bind address must be an IPv4 address on the server");
    out.bindIp = b;
  }
  if (t.privateKey) {
    const k = String(t.privateKey).replace(/\r\n/g, "\n").trim() + "\n";
    if (!/^-----BEGIN (OPENSSH|RSA|EC|DSA|ENCRYPTED)? ?PRIVATE KEY-----/.test(k) || k.length > 20000) throw new Error("private key must be an OpenSSH or PEM private key");
    out.auth = { kind: "key", privateKey: k, passphrase: t.passphrase ? String(t.passphrase) : null };
  } else if (t.keyFile) {
    if (!existsSync(String(t.keyFile))) throw new Error(`SSH key file not found: ${t.keyFile}`);
    out.auth = { kind: "keyfile", keyFile: path.resolve(String(t.keyFile)), passphrase: t.passphrase ? String(t.passphrase) : null };
  } else if (t.password) {
    const p = String(t.password);
    if (p.length < 1 || p.length > 200 || /[\r\n]/.test(p)) throw new Error("password is not usable");
    out.auth = { kind: "password", password: p };
  } else throw new Error("remote target needs an SSH key or a password");
  return out;
}

/** Every secret in a target (for log masking). */
export function remoteSecrets(r) {
  const a = r?.auth || {};
  return [a.privateKey, a.passphrase, a.password].filter((v) => typeof v === "string" && v.length >= 6);
}

/**
 * Materialise SSH material for one process: key file, known-hosts file and an `ssh` wrapper. Returns the env to
 * give Docker (DOCKER_HOST, PATH with the wrapper first, SSHPASS for password auth) and a cleanup function.
 */
/** Where rtlab records what it installed on a server: one `<what>.installed` file per thing (Docker, the VPN), so a reset reverts only that. */
export const MARKER_DIR = "/etc/rtlab";
/** Record that rtlab installed `what` on the server (best effort; a file holding the UTC time). */
export async function markInstalled(p, sshArgs, remote, what) {
  if (!/^[a-z0-9-]{1,32}$/.test(what)) throw new Error("bad marker name");
  const sudo = remote.username === "root" ? "" : "sudo -n ";
  await run(path.join(p.dir, "ssh"), [...sshArgs, `${sudo}sh -c 'mkdir -p ${MARKER_DIR} && date -u +%FT%TZ > ${MARKER_DIR}/${what}.installed'`], { env: p.env, timeout: 30_000 });
}
/** Parse the marker listing `name<TAB>date` lines into { name: date }. */
export function parseMarkers(text) {
  const out = {};
  for (const line of String(text || "").split("\n")) {
    const m = line.trim().match(/^([a-z0-9-]{1,32})\.installed\t(\S+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

export async function prepareRemote(remote, id) {
  if (!remote || !remote.auth) throw new Error("no SSH credentials for this server: pass --remote user@host[:port] with --ssh-key <file> or --ssh-password-env <VAR>");
  if (!(await has("ssh", ["-V"]))) throw new Error("`ssh` not found: install an OpenSSH client");
  const dir = path.join(RT_HOME, "remote", `${id}-${Math.random().toString(36).slice(2, 8)}`);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const known = path.join(dir, "known_hosts");
  await writeFile(known, "", { mode: 0o600 });
  const a = remote.auth;
  let keyArg = "", passEnv = {};
  if (a.kind === "key") { await writeFile(path.join(dir, "key"), a.privateKey, { mode: 0o600 }); keyArg = `-i "${path.join(dir, "key")}" -o IdentitiesOnly=yes`; }
  else if (a.kind === "keyfile") keyArg = `-i "${a.keyFile}" -o IdentitiesOnly=yes`;
  else if (a.kind === "password") {
    if (!(await has("sshpass", ["-V"]))) throw new Error("password login needs `sshpass` on this machine (apt install sshpass), or use an SSH key");
    passEnv = { SSHPASS: a.password };
  }
  let agentEnv = {}, agentPid = null;
  if ((a.kind === "key" || a.kind === "keyfile") && a.passphrase) {
    // A passphrase-protected key: load it into a private ssh-agent for the lifetime of this command.
    const ag = await capture("ssh-agent", ["-s"], 10_000);
    const sock = ag?.match(/SSH_AUTH_SOCK=([^;]+)/)?.[1]; agentPid = ag?.match(/SSH_AGENT_PID=(\d+)/)?.[1];
    if (!sock) throw new Error("could not start ssh-agent for the key passphrase");
    const askpass = path.join(dir, "askpass.sh");
    await writeFile(askpass, `#!/bin/sh\ncat "${path.join(dir, "passphrase")}"\n`, { mode: 0o700 });
    await writeFile(path.join(dir, "passphrase"), a.passphrase + "\n", { mode: 0o600 });
    agentEnv = { SSH_AUTH_SOCK: sock, SSH_AGENT_PID: agentPid };
    await run("ssh-add", [a.kind === "key" ? path.join(dir, "key") : a.keyFile], { env: { ...agentEnv, SSH_ASKPASS: askpass, SSH_ASKPASS_REQUIRE: "force", DISPLAY: ":0" }, timeout: 20_000 });
    await rm(path.join(dir, "passphrase"), { force: true });
    keyArg = "";
  }
  const wrapper = path.join(dir, "ssh");
  await writeFile(wrapper, `#!/bin/sh
# rtlab: ssh with this deployment's key and known-hosts file, never the operator's ~/.ssh.
exec ${a.kind === "password" ? "sshpass -e " : ""}/usr/bin/ssh ${keyArg} -o UserKnownHostsFile="${known}" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -o ServerAliveInterval=15 -o LogLevel=ERROR "$@"
`, { mode: 0o700 });
  const env = { DOCKER_HOST: `ssh://${remote.username}@${remote.host}:${remote.port}`, PATH: `${dir}:${process.env.PATH || "/usr/bin:/bin"}`, ...passEnv, ...agentEnv };
  const cleanup = async () => {
    if (agentPid) await capture("kill", [String(agentPid)], 5000).catch(() => {});
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  };
  const fingerprint = async () => (await readFile(known, "utf-8").catch(() => "")).split("\n").find((l) => l.trim())?.split(" ").slice(1).join(" ") || null;
  return { env, dir, cleanup, fingerprint };
}

/** The address labs listen on: the chosen bind address, or the server's IPv4. */
export async function remoteBindIp(remote) {
  if (remote.bindIp) return remote.bindIp;
  if (IPV4.test(remote.host)) return remote.host;
  const { address } = await dns.lookup(remote.host, { family: 4 });
  return address;
}

/** Can we log in, and is Docker there? Optionally install Docker (get.docker.com) when it is missing. */
export async function checkRemote(remote, { onLog, installDocker = false, id = "check" } = {}) {
  const p = await prepareRemote(remote, id);
  try {
    const target = `${remote.username}@${remote.host}`;
    const sshArgs = ["-p", String(remote.port), target];
    const os = await capture(path.join(p.dir, "ssh"), [...sshArgs, "uname -sr; . /etc/os-release 2>/dev/null && echo $PRETTY_NAME"], 45_000, { env: p.env });
    if (os === null) throw new Error(`cannot log in to ${target}:${remote.port} over SSH (check the address, port, user and key or password)`);
    let docker = await capture("docker", ["version", "--format", "{{.Server.Version}}"], 60_000, { env: p.env });
    if (!docker && installDocker) {
      onLog?.("Docker is not installed on the server; installing it with get.docker.com…");
      await markInstalled(p, sshArgs, remote, "docker").catch(() => {});
      const sudo = remote.username === "root" ? "" : "sudo -n ";
      await run(path.join(p.dir, "ssh"), [...sshArgs, `${sudo}sh -c 'curl -fsSL https://get.docker.com | sh'`], { env: p.env, timeout: 900_000, onLog }).catch((e) => onLog?.(`get.docker.com did not finish cleanly (${e.message.slice(0, 120)}); trying the package set directly`));
      docker = await capture("docker", ["version", "--format", "{{.Server.Version}}"], 60_000, { env: p.env });
      if (!docker) {
        // Older releases (Ubuntu 20.04) choke on packages the script adds (docker-model-plugin); the repository
        // it configured still works, so install the core set explicitly, falling back to the distro's docker.io.
        const explicit = `${sudo}sh -c 'DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-buildx-plugin ` +
          `|| DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io docker-compose-v2 || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io; systemctl enable --now docker 2>/dev/null || service docker start'`;
        await run(path.join(p.dir, "ssh"), [...sshArgs, explicit], { env: p.env, timeout: 900_000, onLog }).catch((e) => onLog?.(`package install: ${e.message.slice(0, 160)}`));
        docker = await capture("docker", ["version", "--format", "{{.Server.Version}}"], 60_000, { env: p.env });
      }
      if (remote.username !== "root") await run(path.join(p.dir, "ssh"), [...sshArgs, `sudo -n usermod -aG docker ${remote.username}`], { env: p.env, timeout: 60_000 }).catch(() => {});
    }
    if (!docker) throw new Error("logged in, but Docker is not usable there (install Docker Engine, or let rtlab install it with --install-docker)");
    const compose = await capture("docker", ["compose", "version", "--short"], 60_000, { env: p.env });
    // Size of the server, so a control plane can say which labs fit (RAM in MB, free disk in GB, CPUs).
    // Also: can it host VMs (nested virtualization), and what did rtlab itself install here (so a reset can revert exactly that).
    const size = await capture(path.join(p.dir, "ssh"), [...sshArgs, "nproc; free -m | awk 'NR==2{print $2\" \"$7}'; df -BG --output=avail / | tail -1 | tr -d 'G '; " +
      "if [ -e /dev/kvm ]; then echo kvm; elif grep -qE 'vmx|svm' /proc/cpuinfo 2>/dev/null; then echo cpu; else echo none; fi; " +
      `echo ---; for f in ${MARKER_DIR}/*.installed; do [ -e "$f" ] && printf '%s\\t%s\\n' "$(basename "$f")" "$(head -c 40 "$f")"; done; true`], 30_000, { env: p.env });
    const [head, markers] = (size || "").split("\n---\n");
    const [cpus, mem, diskFree, virt] = (head || "").split("\n").map((l) => l.trim());
    const [memTotal, memAvail] = (mem || "").split(" ");
    const installedByRtlab = parseMarkers(markers);
    return { ok: true, os: os.split("\n").filter(Boolean).join(" · "), dockerVersion: docker.trim(), composeVersion: compose?.trim() || null, fingerprint: await p.fingerprint(),
      cpus: Number(cpus) || null, memoryMB: Number(memTotal) || null, memoryAvailableMB: Number(memAvail) || null, diskFreeGB: Number(diskFree) || null,
      virtualization: ["kvm", "cpu", "none"].includes(virt) ? virt : null, installedByRtlab };
  } finally { await p.cleanup(); }
}
