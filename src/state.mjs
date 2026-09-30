/**
 * Local deployment state: ~/.rtlab/state.json
 *
 * Same shape/rationale as DetectOps' src/lib/os-images/registry.ts — a small JSON
 * file rather than a database, with *live* facts (container/VM power state) derived
 * at read time rather than trusted from disk.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const RT_HOME = process.env.RTLAB_HOME || path.join(homedir(), ".rtlab");
export const LABS_DIR = path.join(RT_HOME, "labs");
const STATE = path.join(RT_HOME, "state.json");

export async function ensureDirs() {
  await mkdir(LABS_DIR, { recursive: true });
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
