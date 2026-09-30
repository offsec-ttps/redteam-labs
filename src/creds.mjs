/**
 * Cloud credential resolution + validation.
 *
 * rtlab NEVER persists credentials: they are read at call time and passed to
 * terraform as process env. Nothing lands in state.json, and nothing is printed —
 * validation reports the resolved *identity* (account/subscription/project), which
 * is what an operator actually needs to confirm before spending money.
 *
 * Sources, highest first:
 *   1. process env (the standard provider variables, or AWS_PROFILE)
 *   2. rtlab.creds.json next to the install  — gitignored, never committed
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { capture, has } from "./run.mjs";

const INSTALL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CREDS_FILE = path.join(INSTALL_DIR, "rtlab.creds.json");

/** Which env vars each provider needs, and the CLI that can verify them. */
export const PROVIDERS = {
  aws: {
    label: "AWS",
    vars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "AWS_REGION", "AWS_DEFAULT_REGION", "AWS_PROFILE"],
    required: [["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"], ["AWS_PROFILE"]],
    cli: "aws",
    verify: ["sts", "get-caller-identity", "--output", "json"],
    identity: (out) => { try { const d = JSON.parse(out); return `account ${d.Account} · ${d.Arn}`; } catch { return null; } },
  },
  azure: {
    label: "Azure",
    vars: ["ARM_CLIENT_ID", "ARM_CLIENT_SECRET", "ARM_TENANT_ID", "ARM_SUBSCRIPTION_ID"],
    required: [["ARM_CLIENT_ID", "ARM_CLIENT_SECRET", "ARM_TENANT_ID", "ARM_SUBSCRIPTION_ID"]],
    cli: "az",
    verify: ["account", "show", "-o", "json"],
    identity: (out) => { try { const d = JSON.parse(out); return `subscription ${d.name} (${d.id})`; } catch { return null; } },
  },
  gcp: {
    label: "GCP",
    vars: ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT", "GOOGLE_PROJECT", "GOOGLE_CREDENTIALS"],
    required: [["GOOGLE_APPLICATION_CREDENTIALS"], ["GOOGLE_CREDENTIALS"]],
    cli: "gcloud",
    verify: ["config", "get-value", "project"],
    identity: (out) => (out && out !== "(unset)" ? `project ${out.trim()}` : null),
  },
};

function fromFile() {
  try { return JSON.parse(readFileSync(CREDS_FILE, "utf-8")); } catch { return {}; }
}

/**
 * Env to hand terraform for `provider`. Env wins over the file; only the
 * provider's own variables are forwarded.
 */
export function credEnv(provider) {
  const spec = PROVIDERS[provider];
  if (!spec) return {};
  const file = fromFile()[provider] || {};
  const env = {};
  for (const v of spec.vars) {
    const value = process.env[v] ?? file[v];
    if (value) env[v] = String(value);
  }
  return env;
}

/** Are the minimum variables present (from either source)? */
export function credsPresent(provider) {
  const env = credEnv(provider);
  const spec = PROVIDERS[provider];
  if (!spec) return false;
  return spec.required.some((set) => set.every((v) => env[v]));
}

/**
 * Which variables are missing, for an actionable error message. Prefers a set the
 * operator has already started filling in; otherwise names the FIRST (primary) set —
 * "missing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY" is far more useful guidance
 * than the shortest alternative, "missing AWS_PROFILE".
 */
export function missingVars(provider) {
  const env = credEnv(provider);
  const spec = PROVIDERS[provider];
  if (!spec) return [];
  const started = spec.required.find((set) => set.some((v) => env[v]));
  const set = started || spec.required[0] || [];
  return set.filter((v) => !env[v]);
}

/**
 * Validate against the provider itself. Returns the resolved identity so the
 * operator can confirm WHICH account is about to be billed. Never returns secrets.
 */
export async function verifyCreds(provider) {
  const spec = PROVIDERS[provider];
  if (!spec) return { ok: false, error: `unknown provider "${provider}"` };
  if (!credsPresent(provider)) {
    return { ok: false, error: `missing ${missingVars(provider).join(", ")}`, missing: missingVars(provider) };
  }
  if (!(await has(spec.cli, ["--version"]))) {
    return { ok: false, error: `\`${spec.cli}\` CLI not found — needed to verify ${spec.label} credentials` };
  }
  const out = await capture(spec.cli, spec.verify, 30_000);
  if (out === null) return { ok: false, error: `${spec.label} rejected these credentials` };
  return { ok: true, identity: spec.identity(out) || "(identity unavailable)" };
}

/** Summary for `rtlab creds` — no secret values, only presence + identity. */
export async function credsStatus() {
  const rows = [];
  for (const [key, spec] of Object.entries(PROVIDERS)) {
    const present = credsPresent(key);
    const v = present ? await verifyCreds(key) : { ok: false, error: `missing ${missingVars(key).join(", ")}` };
    rows.push({ provider: key, label: spec.label, present, valid: v.ok, detail: v.ok ? v.identity : v.error });
  }
  return rows;
}

export const CREDS_FILE_PATH = CREDS_FILE;
