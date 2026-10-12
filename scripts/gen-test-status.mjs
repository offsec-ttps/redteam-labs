/**
 * Build the public coverage data file for the web app (src/data/lab-test-status.json on Lovable) from the
 * source of truth qa/test-status.json, enriching each lab with its catalog name and any status note.
 *
 * Usage: node scripts/gen-test-status.mjs [outFile]
 * Source of truth: qa/test-status.json  (flat map id -> { domain, engine, local, vps, cloud })
 */
import { readFileSync, writeFileSync } from "node:fs";
import { allEntries } from "../src/catalog/index.mjs";

// Notes shown on /coverage for labs that are not a plain green. Keyed by lab id; only listed when the lab's
// status actually warrants it (a yellow/partial or a red/known-issue). Remove an entry when the lab goes green.
const NOTES = {
  "cicd-goat": "Needs ~8 GB RAM (test box is 8 GB); deploys on a larger server.",
  "damn-vulnerable-llm-agent": "Needs ~8 GB RAM (test box is 8 GB); deploys on a larger server.",
};

const status = JSON.parse(readFileSync(new URL("../qa/test-status.json", import.meta.url), "utf-8"));
const nameById = new Map(allEntries().map((e) => [e.id, e.name]));

const labs = {};
for (const [id, s] of Object.entries(status)) {
  labs[id] = {
    name: nameById.get(id) || id,
    domain: s.domain,
    engine: s.engine,
    local: s.local,
    vps: s.vps,
    cloud: s.cloud,
    ...(NOTES[id] ? { note: NOTES[id] } : {}),
  };
}

const out = {
  generated: new Date().toISOString().slice(0, 10),
  legend: {
    green: "Tested and working",
    yellow: "Partial — see note",
    red: "Known issue — see note",
    na: "Not applicable for this target",
    untested: "Not yet tested",
  },
  targets: ["local", "vps", "cloud"],
  labs,
};

const outFile = process.argv[2] || new URL("../qa/lab-test-status.generated.json", import.meta.url).pathname;
writeFileSync(outFile, JSON.stringify(out, null, 2) + "\n");
const t = (k) => Object.values(labs).reduce((a, l) => (l[k] === undefined ? a : ((a[l[k]] = (a[l[k]] || 0) + 1), a)), {});
console.error(`wrote ${Object.keys(labs).length} labs -> ${outFile}`);
console.error("vps:", JSON.stringify(t("vps")), "local:", JSON.stringify(t("local")), "cloud:", JSON.stringify(t("cloud")));
