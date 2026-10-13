/**
 * Kubernetes engine: a k8s lab runs in a disposable k3d cluster (k3s-in-Docker) created on a server over SSH.
 *
 * It mirrors the remote engine's model: everything happens on the server, where k3d, kubectl and helm live and
 * where Docker already runs — the cluster's API server is never published to the internet. The one lab service a
 * recipe nominates is exposed on the server's VPN bind address through a NodePort, so the lab is reachable only
 * over the VPN, exactly like the container labs. Destroy deletes the whole cluster, so nothing is left behind.
 *
 * Source recipe (`entry.source`):
 *   { kind: "k8s", repo, ref?, setup, expose: { selector: "app=foo", port, namespace? }, teardown? }
 * `setup` is a shell command run in the cloned repo with KUBECONFIG pointing at the cluster and kubectl/helm/k3d
 * on PATH; `expose.selector` is the pod label the NodePort targets. One lab per cluster (clusters are heavy).
 */
import path from "node:path";
import { rm } from "node:fs/promises";
import { LABS_DIR } from "../state.mjs";
import { run, capture } from "../run.mjs";
import { prepareRemote, remoteBindIp } from "../remote.mjs";

const K3D_VERSION = "v5.7.4";
const WORK_BASE = "/opt/rtlab/k8s";
const clusterFor = (id) => `rtlab-${id}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 32);
const shq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
/** A stable NodePort in the 30000–32767 range derived from the deployment id (one cluster per deployment). */
const nodePortFor = (id) => 30000 + (Array.from(String(id)).reduce((a, c) => (a + c.charCodeAt(0)) % 2700, 0));

function ssh(p, remote) { return path.join(p.dir, "ssh"); }
function sshRun(p, remote, cmd, { timeout = 120_000, onLog } = {}) {
  return run(ssh(p, remote), ["-p", String(remote.port), `${remote.username}@${remote.host}`, cmd], { env: p.env, timeout, onLog });
}
function sshCap(p, remote, cmd, timeout = 60_000) {
  return capture(ssh(p, remote), ["-p", String(remote.port), `${remote.username}@${remote.host}`, cmd], timeout, { env: p.env });
}

/** Compare what the lab declares it needs with what the server has (RAM/disk), like the remote engine does. */
export function fit(entries, info) {
  const memNeed = entries.reduce((a, e) => a + (e.resources?.memoryMB || 2048), 0) + 512; // +cluster overhead
  if (info?.memoryMB && memNeed > info.memoryMB) {
    return { blocked: `${entries.map((e) => e.name).join(", ")} plus a k3d cluster need about ${Math.ceil(memNeed / 1024)} GB RAM; this server has ${Math.round(info.memoryMB / 1024)} GB.` };
  }
  return {};
}

/** Install kubectl, k3d and helm on the server if missing. Assumes root (or a writable /usr/local/bin). Idempotent. */
async function ensureTooling(p, remote, onLog) {
  const have = await sshCap(p, remote, "command -v kubectl >/dev/null && command -v k3d >/dev/null && command -v helm >/dev/null && echo ok || echo no");
  if ((have || "").includes("ok")) return;
  onLog?.("installing kubectl, k3d and helm on the server…");
  const sudo = remote.username === "root" ? "" : "sudo ";
  const script = [
    "set -e",
    `if ! command -v kubectl >/dev/null; then curl -fsSL -o /tmp/kubectl "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && ${sudo}install -m 0755 /tmp/kubectl /usr/local/bin/kubectl; fi`,
    `if ! command -v k3d >/dev/null; then curl -fsSL https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | ${sudo}env TAG=${K3D_VERSION} bash; fi`,
    `if ! command -v helm >/dev/null; then curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | ${sudo}bash; fi`,
  ].join("; ");
  await sshRun(p, remote, script, { timeout: 600_000, onLog });
}

export async function deploy(entries, opts) {
  const { id, remote, dryRun = false, onLog } = opts;
  const entry = entries[0];
  if (!entry) throw new Error("k8s engine: no lab given");
  if (entries.length > 1) throw new Error("k8s labs deploy one per cluster; deploy them separately");
  const src = entry.source || {};
  if (src.kind !== "k8s") throw new Error(`k8s engine: unsupported source kind "${src.kind}"`);
  const expose = src.expose || {};
  const bindIp = await remoteBindIp(remote);
  const nodePort = nodePortFor(id);
  const cluster = clusterFor(id);
  const services = [{ lab: entry.id, name: expose.name || "web", port: nodePort, container: expose.port || 80,
    protocol: "tcp", url: `http://${bindIp}:${nodePort}` }];
  const labs = [{ labId: entry.id, name: entry.name, cluster }];
  if (dryRun) return { dryRun: true, bindIp, cluster, nodePort, labs, services };

  const p = await prepareRemote(remote, id);
  const work = `${WORK_BASE}/${cluster}`;
  const kubeconfig = `${work}/kubeconfig`;
  const envPrefix = `export KUBECONFIG=${kubeconfig}; export PATH=/usr/local/bin:$PATH;`;
  try {
    await ensureTooling(p, remote, onLog);
    onLog?.(`creating k3d cluster ${cluster} (NodePort ${nodePort} on ${bindIp})…`);
    await sshRun(p, remote, `k3d cluster delete ${cluster} >/dev/null 2>&1 || true`, { timeout: 120_000 });
    await sshRun(p, remote, `mkdir -p ${work} && k3d cluster create ${cluster} --servers 1 --agents 0 ` +
      `-p "${bindIp}:${nodePort}:${nodePort}@server:0" --wait --timeout 300s`, { timeout: 420_000, onLog });
    await sshRun(p, remote, `k3d kubeconfig write ${cluster} --output ${kubeconfig}`, { timeout: 60_000 });

    if (src.repo) {
      onLog?.(`cloning ${src.repo} on the server…`);
      const branch = src.ref && src.ref !== "master" && src.ref !== "main" ? `--branch ${src.ref} ` : "";
      await sshRun(p, remote, `rm -rf ${work}/src && git clone --depth 1 ${branch}${src.repo} ${work}/src`, { timeout: 300_000, onLog });
    }
    onLog?.(`deploying ${entry.name} into the cluster…`);
    await sshRun(p, remote, `cd ${work}/src && ${envPrefix} ${src.setup}`, { timeout: 1_200_000, onLog });

    if (expose.selector) {
      const [k, v] = String(expose.selector).split("=");
      const ns = expose.namespace || "default";
      const port = expose.port || 80;
      const yaml = `apiVersion: v1\nkind: Service\nmetadata:\n  name: rtlab-ingress\n  namespace: ${ns}\nspec:\n  type: NodePort\n  selector:\n    ${k}: ${v}\n  ports:\n  - port: ${port}\n    targetPort: ${port}\n    nodePort: ${nodePort}\n`;
      await sshRun(p, remote, `${envPrefix} printf %s ${shq(yaml)} > ${work}/rtlab-ingress.yaml && kubectl apply -f ${work}/rtlab-ingress.yaml`, { timeout: 120_000, onLog });
    }

    let ready = false;
    const until = Date.now() + 300_000;
    while (Date.now() < until) {
      const c = (await sshCap(p, remote, `curl -s -m 5 -o /dev/null -w '%{http_code}' http://${bindIp}:${nodePort}/ || echo 000`, 15_000) || "").trim();
      if (c && !/^000/.test(c) && !/^5/.test(c)) { ready = true; break; }
      await new Promise((r) => setTimeout(r, 6000));
    }
    return { bindIp, cluster, nodePort, work, kubeconfig, labs, services, ready, status: ready ? "running" : "starting",
      remote: { host: remote.host, port: remote.port, username: remote.username, label: remote.label, bindIp },
      fingerprint: await p.fingerprint() };
  } catch (e) {
    await sshRun(p, remote, `k3d cluster delete ${cluster} >/dev/null 2>&1 || true; rm -rf ${work}`, { timeout: 180_000 }).catch(() => {});
    throw e;
  } finally { await p.cleanup(); }
}

export async function destroy(dep, { remote, onLog } = {}) {
  const cluster = dep.cluster || clusterFor(dep.id);
  if (!remote) {
    onLog?.("no SSH credentials given: removing the local record only; the cluster stays on the server");
  } else {
    const p = await prepareRemote(remote, dep.id);
    try {
      onLog?.(`deleting k3d cluster ${cluster} from the server…`);
      await sshRun(p, remote, `k3d cluster delete ${cluster} >/dev/null 2>&1 || true; rm -rf ${WORK_BASE}/${cluster}`, { timeout: 240_000, onLog });
    } finally { await p.cleanup(); }
  }
  if (dep.dir) await rm(dep.dir, { recursive: true, force: true }).catch(() => {});
  return {};
}

async function clusterVerb(dep, remote, verb, onLog) {
  const cluster = dep.cluster || clusterFor(dep.id);
  const p = await prepareRemote(remote, dep.id);
  try { await sshRun(p, remote, `k3d cluster ${verb} ${cluster}`, { timeout: 240_000, onLog }); }
  finally { await p.cleanup(); }
}
export async function start(dep, { onLog, remote } = {}) { if (remote) await clusterVerb(dep, remote, "start", onLog); }
export async function stop(dep, { onLog, remote } = {}) { if (remote) await clusterVerb(dep, remote, "stop", onLog); }

export async function status(dep, { remote } = {}) {
  if (!remote) return { status: dep.status || "unknown", containers: [] };
  const cluster = dep.cluster || clusterFor(dep.id);
  const p = await prepareRemote(remote, dep.id);
  try {
    const list = await sshCap(p, remote, `k3d cluster list ${cluster} --no-headers 2>/dev/null`, 30_000);
    if (!list || !list.trim()) return { status: "stopped", containers: [] };
    const running = /\b([1-9]\d*)\/\1\b/.test(list); // servers column "1/1"
    return { status: running ? "running" : "partial", containers: [] };
  } finally { await p.cleanup(); }
}

export async function logs(dep, { remote } = {}) {
  const cluster = dep.cluster || clusterFor(dep.id);
  if (!remote) return { cmd: "echo", args: ["no SSH credentials given: run with --remote/--ssh-key"], cwd: dep.dir };
  const p = await prepareRemote(remote, dep.id);
  return { cmd: ssh(p, remote), args: ["-p", String(remote.port), `${remote.username}@${remote.host}`,
    `export KUBECONFIG=${WORK_BASE}/${cluster}/kubeconfig; export PATH=/usr/local/bin:$PATH; kubectl get pods -A`],
    cwd: dep.dir, env: p.env, cleanup: p.cleanup };
}
