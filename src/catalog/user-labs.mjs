/**
 * User-onboarded labs, persisted to user-labs.json beside this file. These are labs added through the pipeline
 * (`rtlab lab add` / `rtlab lab import`) rather than hand-curated in labs.mjs. They are merged into the catalog by
 * index.mjs with lower precedence than the curated LABS (a curated id always wins) and higher than the imported set.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const USER_LABS_PATH = fileURLToPath(new URL("./user-labs.json", import.meta.url));

export function loadUserLabs() {
  try {
    if (!existsSync(USER_LABS_PATH)) return [];
    const arr = JSON.parse(readFileSync(USER_LABS_PATH, "utf-8"));
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveUserLabs(labs) {
  writeFileSync(USER_LABS_PATH, JSON.stringify(labs, null, 2) + "\n", { encoding: "utf-8" });
}

/** Snapshot read at module load; the CLI reloads with loadUserLabs() when it needs the freshest set. */
export const USER_LABS = loadUserLabs();
