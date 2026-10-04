/**
 * Child-process helpers. Ports the pattern proven in DetectOps'
 * src/lib/c2/deploy-generic.ts: stream output to a logger, enforce a timeout, and
 * on failure reject with the last few lines so the caller reports *why*.
 *
 * Always argv-array form (execFile/spawn) — never a shell string — so lab ids,
 * paths and bind addresses can never be interpreted as shell metacharacters.
 */

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import net from "node:net";

const execFileAsync = promisify(execFile);

/** Is a command present? */
export async function has(cmd, args = ["--version"]) {
  try { await execFileAsync(cmd, args, { timeout: 8000 }); return true; } catch { return false; }
}

/** Capture a command's stdout (trimmed), or null when it fails. */
export async function capture(cmd, args, timeout = 10000, { cwd, env } = {}) {
  try {
    const { stdout } = await execFileAsync(cmd, args, {
      timeout, cwd, env: env ? { ...process.env, ...env } : undefined,
    });
    return stdout.trim();
  } catch { return null; }
}

/** Like capture, but feeds `input` to stdin (a script for `bash -s` on a remote host). Resolves with stdout or null. */
export function captureWithInput(cmd, args, { input = "", timeout = 60_000, cwd, env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: env ? { ...process.env, ...env } : process.env, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    const t = setTimeout(() => { child.kill("SIGKILL"); }, timeout);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("close", (code) => { clearTimeout(t); resolve(code === 0 ? out.trim() : null); if (code !== 0 && process.env.RTLAB_DEBUG) console.error(err); });
    child.on("error", () => { clearTimeout(t); resolve(null); });
    child.stdin.end(input);
  });
}

/**
 * Run a command, streaming each line to onLog. Rejects with the tail of output on
 * non-zero exit so failures are self-explanatory.
 */
export function run(cmd, args, { cwd, timeout = 600_000, env, onLog } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    const tail = [];
    const onData = (d) => {
      for (const l of d.toString().split("\n")) {
        const t = l.trimEnd();
        if (!t) continue;
        tail.push(t);
        if (tail.length > 80) tail.shift();
        onLog?.(t);
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`\`${cmd} ${args.slice(0, 3).join(" ")}…\` timed out after ${Math.round(timeout / 1000)}s`));
    }, timeout);
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve({ ok: true });
      reject(new Error(`\`${cmd} ${args.slice(0, 3).join(" ")}…\` exited ${code}: ${tail.slice(-5).join(" | ")}`));
    });
  });
}

/** TCP connect probe — the honest "is it actually up?" test. */
export function tcpProbe(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const done = (v) => { s.destroy(); resolve(v); };
    s.setTimeout(timeout);
    s.once("connect", () => done(true));
    s.once("timeout", () => done(false));
    s.once("error", () => done(false));
    s.connect(port, host);
  });
}

/** Poll a port until it answers, or give up. */
export async function waitForPort(host, port, { timeout = 180_000, interval = 3000, onLog } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await tcpProbe(host, port)) return true;
    onLog?.(`waiting for ${host}:${port}…`);
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}
