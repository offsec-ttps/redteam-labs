/**
 * Storage locations: where a deployment's VM disk and files live.
 *
 * A lab VM's disk grows to many GB, and docker images pulled inside it live on that disk,
 * so hosts with a small system drive need to put deployments on a secondary disk. Locations
 * are configured by the host operator in rtlab.config.json ("storage": [...]) and chosen by
 * ID at deploy time. Callers (including the web platform) never supply a raw path, so a
 * deploy request cannot make rtlab write somewhere the operator did not approve.
 *
 *   { "storage": [ { "id": "ssd2", "label": "Samsung EVO", "path": "/mnt/ssd2/rtlab" } ] }
 *
 * "default" always exists and is the lab store (RTLAB_HOME).
 */

import { readFileSync, writeFileSync, mkdirSync, accessSync, statSync, realpathSync, constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RT_HOME } from "./state.mjs";
import { capture } from "./run.mjs";

const INSTALL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONFIG_PATH = path.join(INSTALL_DIR, "rtlab.config.json");

const ID_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
// Paths are interpolated into a generated Vagrantfile (Ruby). `#{}`, quotes, `$` and
// backslashes would be code/escape injection there, so only plain path characters are allowed.
const SAFE_PATH_RE = /^\/[A-Za-z0-9_./+@%:=, -]*$/;
const FORBIDDEN = new Set(["/", "/bin", "/boot", "/dev", "/etc", "/lib", "/lib64", "/proc", "/root", "/run", "/sbin", "/sys", "/usr", "/var", "/home", "/tmp"]);

/** Throws unless `p` is a safe absolute path to interpolate into generated files. */
export function assertSafePath(p) {
  if (typeof p !== "string" || !SAFE_PATH_RE.test(p) || p.split("/").includes("..")) {
    throw new Error(`unsafe path "${p}" - use an absolute path of letters, digits and . _ - / + @ % : = , space`);
  }
  return p;
}

function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")); } catch { return {}; }
}
function writeConfig(cfg) { writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n", "utf-8"); }

function validateLocation({ id, path: p }) {
  if (!ID_RE.test(id || "")) throw new Error(`bad id "${id}" - use lowercase letters, digits and dashes (max 32)`);
  if (id === "default") throw new Error('"default" is reserved for the lab store');
  if (!path.isAbsolute(p || "")) throw new Error("path must be absolute");
  const norm = path.normalize(p).replace(/\/+$/, "") || "/";
  assertSafePath(norm);
  if (FORBIDDEN.has(norm)) throw new Error(`refusing to use ${norm} - pick a dedicated directory on the disk`);
  let st;
  try { st = statSync(norm); } catch { throw new Error(`${norm} does not exist - create it first (and mount the disk)`); }
  if (!st.isDirectory()) throw new Error(`${norm} is not a directory`);
  const real = realpathSync(norm);                     // a symlink must not smuggle in a forbidden target
  if (FORBIDDEN.has(real)) throw new Error(`${norm} resolves to ${real} - pick a dedicated directory on the disk`);
  try { accessSync(norm, constants.W_OK | constants.X_OK); } catch { throw new Error(`${norm} is not writable by this user`); }
  return norm;
}

/** All locations, "default" first. Entries that no longer validate are kept but flagged unusable. */
export function locations() {
  const out = [{ id: "default", label: "Default (lab store)", path: RT_HOME, isDefault: true, usable: true }];
  for (const s of readConfig().storage || []) {
    let usable = true, reason = null, p = s.path;
    try { p = validateLocation(s); } catch (e) { usable = false; reason = e.message; }
    out.push({ id: s.id, label: s.label || s.id, path: p, isDefault: false, usable, reason });
  }
  return out;
}

export function resolve(id) {
  const loc = locations().find((l) => l.id === (id || "default"));
  if (!loc) throw new Error(`unknown storage "${id}" - see \`rtlab storage list\``);
  if (!loc.usable) throw new Error(`storage "${loc.id}" is unusable: ${loc.reason}`);
  return loc;
}

export function add({ id, label, path: p }) {
  const norm = validateLocation({ id, path: p });
  const cfg = readConfig();
  cfg.storage = (cfg.storage || []).filter((s) => s.id !== id);
  cfg.storage.push({ id, label: label || id, path: norm });
  writeConfig(cfg);
  mkdirSync(path.join(norm, "labs"), { recursive: true });
  mkdirSync(path.join(norm, "vms"), { recursive: true });
  return { id, label: label || id, path: norm };
}

export function remove(id) {
  const cfg = readConfig();
  const before = (cfg.storage || []).length;
  cfg.storage = (cfg.storage || []).filter((s) => s.id !== id);
  if (cfg.storage.length === before) throw new Error(`no storage "${id}"`);
  writeConfig(cfg);
}

/** Free/total GB of the filesystem holding `p` (walks up to the nearest existing ancestor). */
export async function diskInfo(p) {
  let q = path.resolve(p);
  for (let i = 0; i < 12; i++) {
    try { statSync(q); break; } catch { q = path.dirname(q); }
  }
  const out = await capture("df", ["-BG", "--output=avail,size,source", q]);
  const line = out?.split("\n")[1]?.trim().split(/\s+/);
  if (!line) return { freeGB: null, totalGB: null, device: null };
  return { freeGB: parseInt(line[0], 10), totalGB: parseInt(line[1], 10), device: line[2] };
}
