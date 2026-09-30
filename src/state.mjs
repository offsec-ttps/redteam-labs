/**
 * Local deployment state: ~/.rtlab/state.json
 *
 * Same shape/rationale as DetectOps' src/lib/os-images/registry.ts — a small JSON
 * file rather than a database, with *live* facts (container/VM power state) derived
 * at read time rather than trusted from disk.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INSTALL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Where labs, box images and the vulhub cache live. Resolution order:
 *   1. RTLAB_HOME env var                    — per-invocation override
 *   2. rtlab.config.json  { "home": "..." }  — persistent, next to the install
 *   3. ~/.rtlab                              — portable default
 *
 * Order matters on hosts where $HOME sits on a small partition: point `home` at a
 * roomy disk once in the config file and every lab, Vagrant box and clone follows.
 */
function resolveHome() {
  if (process.env.RTLAB_HOME) {
    return { dir: path.resolve(process.env.RTLAB_HOME), source: "RTLAB_HOME env" };
  }
  try {
    const cfg = JSON.parse(readFileSync(path.join(INSTALL_DIR, "rtlab.config.json"), "utf-8"));
    if (cfg?.home) return { dir: path.resolve(cfg.home), source: "rtlab.config.json" };
  } catch { /* no config, or unreadable — fall through */ }
  return { dir: path.join(homedir(), ".rtlab"), source: "default (~/.rtlab)" };
}

const resolved = resolveHome();
export const RT_HOME = resolved.dir;
export const RT_HOME_SOURCE = resolved.source;
export const LABS_DIR = path.join(RT_HOME, "labs");
/** Vagrant box cache — kept beside the labs so multi-GB boxes never land on $HOME. */
export const VAGRANT_HOME = path.join(RT_HOME, "vagrant");
const STATE = path.join(RT_HOME, "state.json");

export async function ensureDirs() {
  await mkdir(LABS_DIR, { recursive: true });
  await mkdir(VAGRANT_HOME, { recursive: true });
}

async function readAll() {
  try { return JSON.parse(await readFile(STATE, "utf-8")); } catch { return []; }
}
async function writeAll(rows) {
  await mkdir(RT_HOME, { recursive: true });
  await writeFile(STATE, JSON.stringify(rows, null, 2), "utf-8");
}

/**
 * A deployment record:
 * { id, labId, name, engine, dir, bindIp, services:[{name,port,url}],
 *   status, createdAt, expiresAt, ttl, noEgress, vmName?, composeProject? }
 */
export async function add(row) {
  const rows = await readAll();
  await writeAll([row, ...rows.filter((r) => r.id !== row.id)]);
  return row;
}
export async function update(id, patch) {
  const rows = await readAll();
  const r = rows.find((x) => x.id === id);
  if (!r) return null;
  Object.assign(r, patch);
  await writeAll(rows);
  return r;
}
export async function remove(id) {
  await writeAll((await readAll()).filter((r) => r.id !== id));
}
export async function get(id) {
  const rows = await readAll();
  // accept a unique id prefix for convenience
  return rows.find((r) => r.id === id) || rows.filter((r) => r.id.startsWith(id))[0] || null;
}
export async function list() { return readAll(); }

/** Deployments whose TTL has elapsed. */
export async function expired() {
  const now = Date.now();
  return (await readAll()).filter((r) => r.expiresAt && new Date(r.expiresAt).getTime() <= now);
}
