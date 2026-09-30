#!/usr/bin/env node
/**
 * Import the research catalog from Detection_Engineering_Lab_Catalog.docx into
 * src/catalog/imported.mjs.
 *
 *   node scripts/import-docx-catalog.mjs --docx ../Detection_Engineering_Lab_Catalog.docx
 *
 * The .docx is the source of truth for WHICH labs exist. Imported entries are
 * always `deploy.available: false` — catalogued with their repo and guided steps,
 * because "a row exists in a document" is not evidence that a deploy works. Labs
 * promoted to automated deploy live in src/catalog/labs.mjs (hand-curated) and
 * take precedence over anything imported here.
 *
 * Zero dependencies: a minimal ZIP reader (central directory + zlib.inflateRaw)
 * plus regex over document.xml. No office toolchain required.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── minimal ZIP reader ───────────────────────────────────────────────────────
function unzipEntry(buf, wanted) {
  // End of Central Directory: scan back for 0x06054b50
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66_000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip (no end-of-central-directory record)");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad central directory entry");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const cmtLen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf-8", p + 46, p + 46 + nameLen);
    if (name === wanted) {
      if (buf.readUInt32LE(lho) !== 0x04034b50) throw new Error("bad local file header");
      const lNameLen = buf.readUInt16LE(lho + 26);
      const lExtraLen = buf.readUInt16LE(lho + 28);
      const start = lho + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compSize);
      return method === 0 ? raw : inflateRawSync(raw);
    }
    p += 46 + nameLen + extraLen + cmtLen;
  }
  throw new Error(`${wanted} not found in the archive`);
}

// ── docx helpers ─────────────────────────────────────────────────────────────
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const textOf = (xml) => unesc((xml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
  .map((t) => t.replace(/<[^>]+>/g, "")).join("")).replace(/\s+/g, " ").trim();

function parseTable(tbl) {
  const rows = [];
  for (const tr of tbl.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/g) || []) {
    const cells = (tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map(textOf);
    if (cells.length) rows.push(cells);
  }
  return rows;
}

/** Walk paragraphs + tables in document order, tagging each table with its heading. */
function sections(xml) {
  const body = xml.slice(xml.indexOf("<w:body>"));
  const re = /<w:p\b[^>]*>[\s\S]*?<\/w:p>|<w:tbl>[\s\S]*?<\/w:tbl>/g;
  const out = [];
  let heading = "";
  let m;
  while ((m = re.exec(body))) {
    const block = m[0];
    if (block.startsWith("<w:tbl>")) out.push({ heading, rows: parseTable(block) });
    else if (/w:pStyle w:val="Heading[12]"/.test(block)) {
      const t = textOf(block);
      if (t) heading = t;
    }
  }
  return out;
}

// ── mapping ──────────────────────────────────────────────────────────────────
const DOMAIN_BY_HEADING = [
  [/cloud security/i, "cloud"], [/kubernetes|container/i, "k8s"],
  [/web application|api labs/i, "web"], [/llm|genai/i, "llm"],
  [/active directory|windows endpoint/i, "ad"], [/linux|privilege escalation/i, "linux"],
  [/ci\/cd|supply chain/i, "cicd"], [/iac|terraform|policy as code/i, "iac"],
  [/mobile/i, "mobile"], [/network|pcap/i, "network"],
  [/identity|iam|authentication/i, "identity"], [/iot|ot|ics/i, "ot"],
];
const domainFor = (h) => (DOMAIN_BY_HEADING.find(([re]) => re.test(h)) || [])[1] || null;

function parseEnvironment(env) {
  const e = (env || "").toLowerCase();
  const envs = new Set();
  let provider = null;
  if (/aws/.test(e)) { envs.add("cloud"); provider = "aws"; }
  if (/azure|entra|m365/.test(e)) { envs.add("cloud"); provider = provider || "azure"; }
  if (/gcp|google/.test(e)) { envs.add("cloud"); provider = provider || "gcp"; }
  if (/github/.test(e)) { envs.add("cloud"); provider = provider || "github"; }
  if (/cloud/.test(e) && envs.size === 0) envs.add("cloud");
  if (/local|docker|minikube|kind|vagrant/.test(e)) envs.add("local");
  if (envs.size === 0) envs.add("local");
  return { environments: [...envs], provider, raw: env || "" };
}

function engineFor(domain, envInfo) {
  if (envInfo.environments.includes("cloud") && !envInfo.environments.includes("local")) return "terraform";
  if (domain === "k8s") return "k8s";
  if (domain === "ad") return "vm";
  if (domain === "mobile" || domain === "network" || domain === "ot") return "manual";
  return "docker";
}

const slug = (s) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "").slice(0, 48);

/** §17 "MITRE ATT&CK ↔ Sigma Coverage Mapping" → techniques + sigma path by lab name. */
function attackMap(secs) {
  const map = new Map();
  for (const s of secs) {
    if (!/att&ck|attack/i.test(s.heading) || !/sigma/i.test(s.heading)) continue;
    for (const r of s.rows) {
      if (r.length < 3 || /^lab$/i.test(r[0])) continue;
      const techs = [...new Set((r[1].match(/\bT\d{4}(?:\.\d{3})?\b/g) || []))];
      const tactics = [...new Set((r[1].match(/\bTA\d{4}\b/g) || []))];
      map.set(r[0].toLowerCase().trim(), { techniques: techs, tactics, sigmaPath: (r[2] || "").trim() });
    }
  }
  return map;
}

// ── main ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const docxPath = argv[argv.indexOf("--docx") + 1];
if (!docxPath || docxPath.startsWith("--")) {
  console.error("usage: node scripts/import-docx-catalog.mjs --docx <path to .docx>");
  process.exit(1);
}

const xml = unzipEntry(readFileSync(path.resolve(docxPath)), "word/document.xml").toString("utf-8");
const secs = sections(xml);
const atk = attackMap(secs);

const seen = new Set();
const entries = [];
let skippedNoRepo = 0;

for (const s of secs) {
  const domain = domainFor(s.heading);
  if (!domain) continue;                                  // skip tools/SIEM/mapping/summary tables
  for (const row of s.rows) {
    if (row.length < 3) continue;
    const [, name, repo, env, notes] = row;
    if (!name || /^lab name$|^tool$/i.test(name)) continue;   // header row
    const url = (repo || "").match(/https?:\/\/\S+/)?.[0] || "";
    if (!url) { skippedNoRepo++; continue; }
    const id = slug(name);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const envInfo = parseEnvironment(env);
    const a = atk.get(name.toLowerCase().trim()) || {};
    entries.push({
      id, name, domain,
      description: (notes && notes.trim()) || `${name} — vulnerable lab catalogued from the research set (${envInfo.raw || "environment unspecified"}).`,
      repo: url, docsUrl: url,
      engine: engineFor(domain, envInfo),
      environments: envInfo.environments,
      provider: envInfo.provider,
      resources: { cpus: 2, memoryMB: 4096, diskGB: 10 },
      services: [],
      attack: { tactics: a.tactics?.length ? a.tactics : [], techniques: a.techniques?.length ? a.techniques : [] },
      sigmaPath: a.sigmaPath || "",
      isolation: { requiresEgress: true, requiresPublicIp: envInfo.environments.includes("cloud") },
      deploy: { available: false },
      imported: true,
      seeded: true,
    });
  }
}

entries.sort((a, b) => (a.domain === b.domain ? a.name.localeCompare(b.name) : a.domain.localeCompare(b.domain)));

const byDomain = entries.reduce((m, e) => ((m[e.domain] = (m[e.domain] || 0) + 1), m), {});
const header = `/**
 * GENERATED — do not edit by hand.
 *   node scripts/import-docx-catalog.mjs --docx <Detection_Engineering_Lab_Catalog.docx>
 *
 * Imported from the research catalog (${path.basename(docxPath)}).
 * ${entries.length} labs across ${Object.keys(byDomain).length} domains:
 * ${Object.entries(byDomain).map(([d, n]) => `${d}=${n}`).join(" · ")}
 *
 * Every entry is deploy.available:false — catalogued with its upstream repo, not
 * verified as deployable. Curated entries in labs.mjs override these by id.
 */

export const IMPORTED_LABS = ${JSON.stringify(entries, null, 2)};
`;

writeFileSync(path.join(HERE, "..", "src", "catalog", "imported.mjs"), header, "utf-8");
console.log(`imported ${entries.length} labs → src/catalog/imported.mjs`);
console.log(Object.entries(byDomain).map(([d, n]) => `  ${d.padEnd(10)} ${n}`).join("\n"));
if (skippedNoRepo) console.log(`  (skipped ${skippedNoRepo} row(s) without a URL)`);
