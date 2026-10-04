/**
 * Network isolation + host-capacity helpers.
 *
 * Core safety rule: a vulnerable lab is NEVER published on 0.0.0.0. Every port is
 * bound to a specific private address — preferring a hypervisor host-only
 * interface (vboxnet / vmnet / virbr), which is reachable from lab VMs but not
 * from the wider network.
 */

import { networkInterfaces } from "node:os";
import net from "node:net";
import pathMod from "node:path";
import { existsSync } from "node:fs";
import { capture } from "./run.mjs";

const isPrivate = (ip) =>
  /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

/**
 * Candidate bind addresses, best first:
 *   1. hypervisor host-only interfaces (vboxnet*, vmnet*) — ideal isolation
 *   2. other private LAN addresses
 *   3. loopback — always available, host-only by definition
 */
export function candidateBindIps() {
  const out = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== "IPv4") continue;
      if (a.internal) continue;
      if (!isPrivate(a.address)) continue;
      const hostOnly = /^(vboxnet|vmnet|virbr)/i.test(name);
      out.push({ name, address: a.address, hostOnly, hint: hostOnly ? "hypervisor host-only (preferred)" : "private LAN" });
    }
  }
  out.sort((a, b) => (a.hostOnly === b.hostOnly ? 0 : a.hostOnly ? -1 : 1));
  out.push({ name: "lo", address: "127.0.0.1", hostOnly: true, hint: "loopback — this host only" });
  return out;
}

/** Resolve the address to publish on. Explicit wins; refuses 0.0.0.0 outright. */
export function pickBindIp(requested) {
  if (requested) {
    if (requested === "0.0.0.0" || requested === "*") {
      throw new Error("Refusing to bind a vulnerable lab to 0.0.0.0 — pass a private address (see `rtlab doctor`).");
    }
    return requested;
  }
  return candidateBindIps()[0].address;
}

/** Is this host:port free to bind? */
function portFree(host, port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => resolve(false));
    s.once("listening", () => s.close(() => resolve(true)));
    s.listen(port, host);
  });
}

/**
 * First free port at or after `start` on the given address. Ports below 1024 need root to bind, so an
 * unprivileged run maps them up by 8000 (80 -> 8080, 443 -> 8443): the lab still answers on its own port
 * inside the container; only the published host port moves.
 */
export async function freePort(host, start) {
  if (start < 1024 && typeof process.getuid === "function" && process.getuid() !== 0) start += 8000;
  for (let p = start; p < start + 200; p++) {
    if (await portFree(host, p)) return p;
  }
  throw new Error(`No free port found near ${start} on ${host}`);
}

/**
 * Free space (GB) on the filesystem holding `target`. Walks up to the nearest
 * EXISTING ancestor, because the lab store may not have been created yet — `df`
 * on a missing path just fails.
 */
export async function freeDiskGB(target) {
  let p = pathMod.resolve(target);
  for (let i = 0; i < 12; i++) {
    if (existsSync(p)) break;
    const parent = pathMod.dirname(p);
    if (parent === p) break;
    p = parent;
  }
  const out = await capture("df", ["-BG", "--output=avail", p]);
  if (!out) return null;
  const m = out.match(/(\d+)G/);
  return m ? Number(m[1]) : null;
}

/** "4h" | "90m" | "1d" | "manual" → ms (null = never expire). */
export function parseTtl(v) {
  if (!v || v === "manual" || v === "none") return null;
  const m = String(v).match(/^(\d+)\s*([smhd])$/i);
  if (!m) throw new Error(`Bad --ttl "${v}". Use e.g. 30m, 4h, 24h, or manual.`);
  const n = Number(m[1]);
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2].toLowerCase()];
  return n * mult;
}

export function fmtRemaining(expiresAt) {
  if (!expiresAt) return "manual";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const total = Math.max(1, Math.round(ms / 60_000));     // round once, then split, so 59.6m can't print "0h60m"
  const h = Math.floor(total / 60), m = total % 60;
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}
