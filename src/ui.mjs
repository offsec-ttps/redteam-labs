/**
 * Terminal output helpers. Mirrors the house style of DetectOps' cli/detectops.mjs
 * (same glyphs, colours and table layout) so the two CLIs feel like one toolchain.
 * Zero dependencies.
 */

let useColor = process.stdout.isTTY;
let jsonMode = false;
let assumeYes = false;

export function configureUi({ color, json, yes } = {}) {
  if (color === false) useColor = false;
  if (json) { jsonMode = true; useColor = false; }
  if (yes) assumeYes = true;
}
export const isJson = () => jsonMode;

const C = (n) => (s) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : String(s));
export const dim = C(2), bold = C(1), red = C(31), grn = C(32), ylw = C(33), blu = C(34), cyn = C(36);

export const ok = (s) => { if (!jsonMode) console.log(`  ${grn("✓")} ${s}`); };
export const warn = (s) => { if (!jsonMode) console.log(`  ${ylw("!")} ${s}`); };
export const info = (s) => { if (!jsonMode) console.log(`  ${dim(s)}`); };
export const step = (s) => { if (!jsonMode) console.log(`${blu("▸")} ${s}`); };
export const plain = (s) => { if (!jsonMode) console.log(s); };

export function die(msg, code = 1) {
  if (jsonMode) console.log(JSON.stringify({ ok: false, error: String(msg) }, null, 2));
  else console.error(`  ${red("✗")} ${msg}`);
  process.exit(code);
}

export function out(obj) { if (jsonMode) console.log(JSON.stringify(obj, null, 2)); }

export function table(rows, cols) {
  if (jsonMode) return;
  if (!rows.length) { info("(none)"); return; }
  const w = cols.map((c) => Math.max(c.label.length, ...rows.map((r) => String(r[c.key] ?? "").length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(w[i])).join("  ");
  console.log("  " + bold(line(cols.map((c) => c.label))));
  for (const r of rows) {
    console.log("  " + line(cols.map((c) => (c.color ? c.color(r[c.key] ?? "") : (r[c.key] ?? "")))));
  }
}

export function statusColor(s) {
  s = String(s || "").toLowerCase();
  if (["running", "online", "up", "ready"].includes(s)) return grn(s);
  if (["error", "failed", "unreachable", "expired"].includes(s)) return red(s);
  if (["deploying", "starting", "stopping", "pulling"].includes(s)) return ylw(s);
  return dim(s || "unknown");
}

export async function confirm(prompt) {
  if (assumeYes) return true;
  if (!process.stdin.isTTY) {
    die(`Refusing a destructive action non-interactively. Re-run with --yes to confirm. (${prompt})`);
  }
  const rl = (await import("node:readline/promises")).createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question(`  ${ylw("?")} ${prompt} type 'yes' to proceed: `)).trim();
  rl.close();
  return ans === "yes";
}

/** Free-text prompt used by the interactive wizard. */
export async function ask(prompt, fallback = "") {
  if (!process.stdin.isTTY) return fallback;
  const rl = (await import("node:readline/promises")).createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question(`  ${cyn("?")} ${prompt}`)).trim();
  rl.close();
  return ans || fallback;
}

/** The banner shown before anything intentionally vulnerable is started. */
export function vulnerableBanner(labName) {
  if (jsonMode) return;
  console.log("");
  console.log(`  ${ylw("⚠")}  ${bold(labName)} is ${bold("intentionally vulnerable")}.`);
  console.log(`     ${dim("Run it only on an isolated lab network you are authorized to use.")}`);
  console.log(`     ${dim("It is bound to a private interface and auto-destroyed at TTL — keep it that way.")}`);
  console.log("");
}
