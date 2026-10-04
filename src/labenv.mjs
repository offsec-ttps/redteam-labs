/**
 * Per-lab options for container labs: values a person supplies at deploy time (a model choice, an API key)
 * that reach the lab's containers as environment variables. Entries declare what they accept in
 * `options: [{ key, label, type: "choice"|"string"|"secret"|"int"|"bool", choices?, default?, min?, max? }]`;
 * anything undeclared is refused, and secret values are never written to state or logs.
 */
const KEY = /^[A-Z][A-Z0-9_]{0,63}$/;

/** `--lab-env [slug:]KEY=VALUE` arguments -> { slug|"": { KEY: VALUE } } */
export function parseLabEnvArgs(list) {
  const out = {};
  for (const raw of Array.isArray(list) ? list : list ? [list] : []) {
    const m = String(raw).match(/^(?:([a-z0-9][a-z0-9@._-]*):)?([A-Z][A-Z0-9_]*)=([\s\S]*)$/);
    if (!m) throw new Error(`--lab-env expects [lab-id:]KEY=VALUE, got "${String(raw).slice(0, 40)}"`);
    const slug = m[1] || "";
    (out[slug] ||= {})[m[2]] = m[3];
  }
  return out;
}

/** Validate supplied values against an entry's declared options; fills defaults; returns the env to inject. */
export function validateLabEnv(entry, supplied = {}) {
  // Full environments declare engine options with lowercase keys (windows, kali, …); those never become env variables.
  const spec = envOptions(entry);
  const byKey = new Map(spec.map((o) => [o.key, o]));
  for (const k of Object.keys(supplied)) {
    if (!byKey.has(k)) throw new Error(`"${entry.id}" does not take an option "${String(k).slice(0, 40)}" (see rtlab info ${entry.id})`);
  }
  const env = {};
  for (const o of spec) {
    let v = supplied[o.key];
    if (v === undefined || v === "") v = o.default;
    if (v === undefined || v === null || v === "") {
      if (o.required) throw new Error(`${o.label || o.key} is required for "${entry.id}"`);
      continue;
    }
    v = String(v);
    if (v.length > 20000 || /[\r\n\0]/.test(v)) throw new Error(`${o.label || o.key} is not a usable value`);
    if (o.type === "choice" && !(o.choices || []).includes(v)) throw new Error(`${o.label || o.key} must be one of: ${(o.choices || []).join(", ")}`);
    if (o.type === "int") {
      const n = Number(v);
      if (!Number.isInteger(n) || (o.min != null && n < o.min) || (o.max != null && n > o.max)) throw new Error(`${o.label || o.key} must be a whole number${o.min != null || o.max != null ? ` between ${o.min ?? "-"} and ${o.max ?? "-"}` : ""}`);
      v = String(n);
    }
    if (o.type === "bool") { if (!["true", "false", "1", "0"].includes(v)) throw new Error(`${o.label || o.key} must be true or false`); v = v === "true" || v === "1" ? "1" : "0"; }
    env[o.key] = v;
  }
  return env;
}

/** The options of an entry that are environment variables for its containers (UPPER_CASE keys). */
export function envOptions(entry) { return (entry?.options || []).filter((o) => KEY.test(o.key)); }
/** The options of an entry that steer its engine instead (lowercase keys: windows, kali, region, …). */
export function engineOptions(entry) { return (entry?.options || []).filter((o) => !KEY.test(o.key)); }

/** Which of an entry's options are secrets (their values must be masked wherever they could appear). */
export function secretKeys(entry) { return (entry.options || []).filter((o) => o.type === "secret").map((o) => o.key); }

/** Replace every secret value from `env` with *** in a string. */
export function maskSecrets(entry, env, s) {
  let out = String(s);
  for (const k of secretKeys(entry)) if (env?.[k] && env[k].length >= 6) out = out.split(env[k]).join("***");
  return out;
}
