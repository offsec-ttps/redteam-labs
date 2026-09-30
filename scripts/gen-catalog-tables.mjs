#!/usr/bin/env node
/**
 * Regenerate the README's lab tables from the catalog — the catalog is the single
 * source of truth, so the tables can never drift from what `rtlab list` shows.
 *
 *   npm run readme        # rewrite README.md between the CATALOG markers
 *   npm run readme -- --check   # fail if the README is stale (CI-friendly)
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allEntries } from "../src/catalog/index.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const README = path.join(HERE, "..", "README.md");
const START = "<!-- CATALOG:START -->";
const END = "<!-- CATALOG:END -->";

const TITLE = {
  cloud: "Cloud Security", k8s: "Kubernetes &amp; Containers", web: "Web &amp; API",
  llm: "LLM / GenAI / MCP", ad: "Active Directory / Windows", linux: "Linux / Endpoint",
  cicd: "CI/CD &amp; Supply Chain", iac: "IaC / Terraform / Policy as Code",
  mobile: "Mobile Application", network: "Network / PCAP", identity: "Identity / IAM",
  ot: "IoT / OT / ICS", "service-cve": "Service-Level CVE Labs",
};
const BLURB = {
  cloud: "Deliberately vulnerable cloud estates. These run in **your own account**, cost real money and expose public endpoints — `rtlab` plans them for free and hands you the apply command.",
  k8s: "Cluster misconfiguration, container escape and RBAC abuse. Pair with Falco/Tetragon for runtime telemetry.",
  web: "OWASP-style application and API targets — the fastest path from exploit to detection.",
  llm: "Prompt injection, insecure output handling, MCP and agent abuse (OWASP LLM Top 10).",
  ad: "Vulnerable AD forests — the richest source of Windows attack telemetry.",
  linux: "Host-level exploitation and privilege escalation with rich endpoint telemetry.",
  cicd: "Pipeline and supply-chain attack paths (Jenkins, GitLab, Gitea, GitHub Actions).",
  iac: "Misconfigured infrastructure-as-code — the reference targets for IaC scanning and drift detection.",
  mobile: "Vulnerable Android/iOS applications for mobile app security testing.",
  network: "Traffic, PCAP and network-detection labs (Zeek, Suricata, Arkime).",
  identity: "Identity provider, SSO, OAuth and IAM attack paths.",
  ot: "Industrial control, PLC and IoT protocol labs.",
  "service-cve": "One application, one version, one CVE — isolated and disposable. Backed by a pinned [vulhub](https://github.com/vulhub/vulhub) revision.",
};
/** Preferred order; any domain not listed is appended alphabetically. */
const PREFERRED = ["cloud", "k8s", "web", "llm", "ad", "linux", "cicd", "iac", "mobile", "network", "identity", "ot", "service-cve"];
const titleFor = (d) => TITLE[d] || d.replace(/(^|-)([a-z])/g, (_, a, b) => a + b.toUpperCase());

const gb = (mb) => { const v = mb / 1024; return Number.isInteger(v) ? `${v}` : v.toFixed(1); };
/**
 * Imported entries carry placeholder resources (the research doc does not state
 * them), and cloud labs have no local footprint at all. Print "—" rather than
 * invented numbers.
 */
const res = (e) => {
  if (e.engine === "terraform") return "_cloud_";
  if (e.imported) return "—";
  return `${e.resources.cpus} vCPU · ${gb(e.resources.memoryMB)} GB`;
};
const ports = (e) => (e.services || []).map((s) => s.port).filter((p) => p).join(", ") || "—";
const tech = (e, n) => e.attack.techniques.slice(0, n).map((t) => `\`${t}\``).join(", ") || "—";

function build() {
  const all = allEntries();
  const by = new Map();
  for (const e of all) { if (!by.has(e.domain)) by.set(e.domain, []); by.get(e.domain).push(e); }
  // Derived, not hardcoded: a domain added to the catalog can never silently
  // vanish from the README (which is exactly what a fixed list caused once).
  const present = [...by.keys()];
  const ORDER = [...PREFERRED.filter((d) => by.has(d)), ...present.filter((d) => !PREFERRED.includes(d)).sort()];
  const L = [];

  L.push("### At a glance", "");
  L.push("| Category | `--domain` | Labs | Auto-deploy | Guided | Engine |");
  L.push("| --- | --- | :---: | :---: | :---: | --- |");
  for (const d of ORDER) {
    const rows = by.get(d); if (!rows) continue;
    const auto = rows.filter((e) => e.deploy.available).length;
    const eng = [...new Set(rows.map((e) => e.engine))].sort().join(", ");
    L.push(`| ${titleFor(d)} | \`${d}\` | ${rows.length} | ${auto} | ${rows.length - auto} | ${eng} |`);
  }
  const auto = all.filter((e) => e.deploy.available).length;
  L.push(`| **Total** | | **${all.length}** | **${auto}** | **${all.length - auto}** | |`, "");
  L.push("`auto` = one-command deploy · `guided` = catalogued with prerequisites and steps, but no automated path yet (run `rtlab info <id>` for the reason).", "");

  for (const d of ORDER.filter((x) => x !== "service-cve")) {
    const rows = by.get(d); if (!rows) continue;
    L.push(`### ${titleFor(d)} &nbsp;<sub>\`rtlab list --domain ${d}\`</sub>`, "", (BLURB[d] || ""), "");
    L.push("| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |");
    L.push("| --- | --- | :---: | :---: | --- | --- | --- |");
    for (const e of rows.sort((a, b) => (a.deploy.available === b.deploy.available ? a.name.localeCompare(b.name) : a.deploy.available ? -1 : 1))) {
      L.push(`| **${e.name}** | \`${e.id}\` | \`${e.deploy.available ? "auto" : "guided"}\` | ${e.engine} | ${ports(e)} | ${res(e)} | ${tech(e, 5)} |`);
    }
    L.push("");
  }

  const svcs = by.get("service-cve") || [];
  L.push(`### ${titleFor("service-cve")} &nbsp;<sub>\`rtlab list --domain service-cve\`</sub>`, "", BLURB["service-cve"], "");
  L.push("```bash", "rtlab services list                          # every app + CVE",
    "rtlab services list tomcat                   # one app",
    "rtlab services deploy httpd@CVE-2021-41773   # deploy one", "```", "");
  L.push("| Application | `id` | Affected version | Severity | Vulnerability | ATT&CK |");
  L.push("| --- | --- | --- | :---: | --- | --- |");
  for (const e of svcs.sort((a, b) => a.id.localeCompare(b.id))) {
    const app = e.name.split(" — ")[0];
    const i = e.description.indexOf(" (affected: ");
    let issue = e.description, affected = "—";
    if (i !== -1) {
      issue = e.description.slice(0, i);
      const rest = e.description.slice(i + " (affected: ".length);
      affected = rest.endsWith(")") ? rest.slice(0, -1) : rest;   // drop exactly one paren
    }
    const sev = e.severity === "critical" ? `**${e.severity}**` : e.severity;
    L.push(`| ${app} | \`${e.id}\` | ${affected} | ${sev} | ${issue} | ${tech(e, 3)} |`);
  }
  return L.join("\n");
}

const readme = readFileSync(README, "utf-8");
const s = readme.indexOf(START), t = readme.indexOf(END);
if (s === -1 || t === -1) {
  console.error(`README.md is missing the ${START} / ${END} markers`);
  process.exit(1);
}
const next = `${readme.slice(0, s + START.length)}\n\n${build()}\n\n${readme.slice(t)}`;

if (process.argv.includes("--check")) {
  if (next !== readme) { console.error("README catalog tables are STALE — run `npm run readme`"); process.exit(1); }
  console.log("README catalog tables are up to date");
} else {
  writeFileSync(README, next, "utf-8");
  console.log(`README.md catalog tables regenerated (${allEntries().length} entries)`);
}
