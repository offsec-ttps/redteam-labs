import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLabEnvArgs, validateLabEnv, maskSecrets, secretKeys } from "../src/labenv.mjs";

const entry = { id: "dvla", options: [
  { key: "LLM_BACKEND", label: "Model backend", type: "choice", choices: ["ollama", "openrouter", "openai"], default: "ollama" },
  { key: "LLM_MODEL", label: "Model id", type: "string", default: "" },
  { key: "OPENROUTER_API_KEY", label: "OpenRouter API key", type: "secret" },
  { key: "WORKERS", label: "Workers", type: "int", min: 1, max: 4, default: 2 },
  { key: "DEBUG", label: "Debug", type: "bool", default: false },
] };

test("lab env: declared options only, defaults filled, types checked", () => {
  assert.deepEqual(validateLabEnv(entry, {}), { LLM_BACKEND: "ollama", WORKERS: "2", DEBUG: "0" });
  assert.deepEqual(validateLabEnv(entry, { LLM_BACKEND: "openrouter", OPENROUTER_API_KEY: "sk-or-v1-abcdef", LLM_MODEL: "x/y:free", DEBUG: "true" }),
    { LLM_BACKEND: "openrouter", LLM_MODEL: "x/y:free", OPENROUTER_API_KEY: "sk-or-v1-abcdef", WORKERS: "2", DEBUG: "1" });
  assert.throws(() => validateLabEnv(entry, { LLM_BACKEND: "groq" }), /must be one of/);
  assert.throws(() => validateLabEnv(entry, { FOO: "1" }), /does not take an option/);
  assert.throws(() => validateLabEnv(entry, { WORKERS: "9" }), /between 1 and 4/);
  assert.throws(() => validateLabEnv(entry, { LLM_MODEL: "a\nb" }), /not a usable value/);
  assert.deepEqual(validateLabEnv({ id: "plain" }, {}), {});
  assert.throws(() => validateLabEnv({ id: "plain" }, { X: "1" }), /does not take an option/);
});

test("lab env: CLI arguments parse with optional lab prefix", () => {
  assert.deepEqual(parseLabEnvArgs(["LLM_BACKEND=openai", "dvla:OPENAI_API_KEY=sk-1", "other@v1:X=y=z"]),
    { "": { LLM_BACKEND: "openai" }, dvla: { OPENAI_API_KEY: "sk-1" }, "other@v1": { X: "y=z" } });
  assert.throws(() => parseLabEnvArgs(["lowercase=1"]), /expects/);
  assert.deepEqual(parseLabEnvArgs(undefined), {});
});

test("lab env: secrets are masked wherever their value appears", () => {
  const env = validateLabEnv(entry, { LLM_BACKEND: "openrouter", OPENROUTER_API_KEY: "sk-or-v1-SECRETVALUE" });
  assert.deepEqual(secretKeys(entry), ["OPENROUTER_API_KEY"]);
  assert.equal(maskSecrets(entry, env, "auth failed for key sk-or-v1-SECRETVALUE (401)"), "auth failed for key *** (401)");
});

test("engine options (lowercase keys) of a full environment are not environment variables", async () => {
  const { validateLabEnv, envOptions, engineOptions } = await import("../src/labenv.mjs");
  const { findEntry } = await import("../src/catalog/index.mjs");
  const ar = findEntry("splunk-attack-range");
  assert.deepEqual(validateLabEnv(ar, {}), {});
  assert.deepEqual(envOptions(ar), []);
  assert.deepEqual(engineOptions(ar).map((o) => o.key), ["windows", "createDomain", "linux", "kali", "splunkMemoryMB"]);
  assert.throws(() => validateLabEnv(ar, { windows: "2" }), /does not take an option/);
});
