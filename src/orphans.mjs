// Orphans: VirtualBox VMs and Compose projects that carry an rtlab deployment id in their name but have no record in the
// state file (a lost/reinstalled state file, an older runner, a crash mid-deploy). Everything here matches by the exact
// naming rtlab uses when it creates things, so a sweep can never touch a VM or project rtlab did not make.
import { capture, run } from "./run.mjs";
import * as state from "./state.mjs";
import { allEntries } from "./catalog/index.mjs";

const safeName = (s) => String(s).replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 40);
const ID = /^[a-z0-9][a-z0-9-]{0,48}-[a-z0-9]{4,12}$/;

/** `VBoxManage list vms` -> names. Null when VirtualBox is not installed. */
export async function listVboxVms() {
  const out = await capture("VBoxManage", ["list", "vms"], 15_000);
  if (out == null) return null;
  return out.split("\n").map((l) => l.match(/^"(.+)" \{[0-9a-f-]+\}$/)?.[1]).filter(Boolean);
}

/** Local Docker Compose project names starting with `rtlab-`. Null when Docker is not usable. */
export async function listLocalProjects() {
  const out = await capture("docker", ["ps", "-a", "--format", '{{.Label "com.docker.compose.project"}}'], 15_000);
  if (out == null) return null;
  return [...new Set(out.split("\n").map((x) => x.trim()).filter((x) => x.startsWith("rtlab-")))];
}

/** VirtualBox VM names that belong to this deployment id: a spinner/vagrant VM (named exactly the id) or Attack Range VMs (`<id>-splunk`, `<id>-win-0`, ...). */
export function vboxNamesFor(id, names) {
  const s = safeName(id);
  return (names || []).filter((n) => n === id || /^(splunk|win-\d+|linux-\d+|kali)$/.test(n.startsWith(`${s}-`) ? n.slice(s.length + 1) : ""));
}

/** Does this VM or project name belong to any of the given deployment ids? */
function owned(name, ids, kind) {
  return ids.some((id) => (kind === "vm" ? vboxNamesFor(id, [name]).length > 0 : name === `rtlab-${id}` || name.startsWith(`rtlab-${id}-`)));
}

const slugOf = (s) => String(s).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
/** Deployment-id prefixes rtlab can generate: `spinner`, `remote`, and every catalog entry's slug (`<slug>-<6 chars>`). */
export function knownPrefixes(entries = allEntries()) {
  return new Set(["spinner", "remote", ...entries.map((e) => slugOf(e.id))]);
}

/** The deployment id inside a name rtlab generated (`<known prefix>-<6 chars>`), or null. */
export function idIn(name, prefixes = knownPrefixes()) {
  const m = String(name).match(/^(.+)-([a-z0-9]{6})$/);
  return m && prefixes.has(m[1]) ? name : null;
}

/**
 * Looks like something rtlab made, judged strictly: a VM named `<known prefix>-<6 chars>` (spinner, vagrant) or
 * `<that>-splunk|win-N|linux-N|kali` (Attack Range); a Compose project `rtlab-<that>` or `rtlab-<that>-<lab>`.
 * Other tools' VMs (for example `lab-ob36ng-splunk-server`) never match, so a sweep cannot touch them.
 */
export function looksLikeOurs(name, kind, prefixes = knownPrefixes()) {
  if (kind === "vm") {
    const base = name.replace(/-(splunk|win-\d+|linux-\d+|kali)$/, "");
    return idIn(base, prefixes) != null;
  }
  if (!name.startsWith("rtlab-")) return false;
  const rest = name.slice(6);
  if (idIn(rest, prefixes)) return true;
  // rtlab-<id>-<lab>: some split of the tail is a lab name
  const parts = rest.split("-");
  for (let i = parts.length - 1; i >= 2; i--) if (idIn(parts.slice(0, i).join("-"), prefixes)) return true;
  return false;
}

/** VMs and local Compose projects that look like rtlab's but have no state record. */
export async function findOrphans() {
  const ids = (await state.list()).map((r) => r.id);
  const vms = await listVboxVms();
  const projects = await listLocalProjects();
  return {
    vms: (vms || []).filter((n) => looksLikeOurs(n, "vm") && !owned(n, ids, "vm")),
    projects: (projects || []).filter((n) => looksLikeOurs(n, "project") && !owned(n, ids, "project")),
    virtualbox: vms != null, docker: projects != null,
  };
}

/** Power off and delete the VirtualBox VMs of one deployment id (exact names only). */
export async function destroyVboxOrphan(id, { onLog } = {}) {
  const names = vboxNamesFor(id, (await listVboxVms()) || []);
  for (const n of names) {
    await run("VBoxManage", ["controlvm", n, "poweroff"], { timeout: 60_000 }).catch(() => {});
    await run("VBoxManage", ["unregistervm", n, "--delete"], { timeout: 300_000, onLog }).catch((e) => onLog?.(`could not delete VM ${n}: ${e.message}`));
    onLog?.(`deleted VM ${n}`);
  }
  return names;
}

/** Remove a local Compose project by label (containers, networks, volumes), like the server sweep. */
export async function destroyLocalProject(project, { onLog } = {}) {
  const filter = `label=com.docker.compose.project=${project}`;
  const lines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const c = lines(await capture("docker", ["ps", "-aq", "--filter", filter], 30_000));
  if (c.length) await run("docker", ["rm", "-f", "-v", ...c], { timeout: 300_000 });
  for (const n of lines(await capture("docker", ["network", "ls", "-q", "--filter", filter], 30_000))) await run("docker", ["network", "rm", n], { timeout: 60_000 }).catch(() => {});
  for (const v of lines(await capture("docker", ["volume", "ls", "-q", "--filter", filter], 30_000))) await run("docker", ["volume", "rm", "-f", v], { timeout: 60_000 }).catch(() => {});
  onLog?.(`removed project ${project} (${c.length} container(s))`);
  return c.length;
}

/** Everything of one deployment id on this machine, with no record needed: VMs by name, local Compose projects by prefix. */
export async function destroyLocalOrphan(id, { onLog } = {}) {
  const vms = await destroyVboxOrphan(id, { onLog });
  const projects = ((await listLocalProjects()) || []).filter((p) => p === `rtlab-${id}` || p.startsWith(`rtlab-${id}-`));
  for (const p of projects) await destroyLocalProject(p, { onLog });
  return { vms, projects };
}
