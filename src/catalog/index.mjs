/** Catalog lookup/search over labs + service-CVE entries. */

import { LABS } from "./labs.mjs";
import { IMPORTED_LABS } from "./imported.mjs";
import { serviceEntries, SERVICES, SERVICE_APPS } from "./services.mjs";

/**
 * Every catalogued entry. Order of precedence matters:
 *   1. LABS          — hand-curated, some with a working automated deploy
 *   2. IMPORTED_LABS — the full research set from the .docx (catalogued, guided)
 *   3. serviceEntries — vulhub-backed app@CVE variants
 *
 * A curated entry always wins over an imported one with the same id, so promoting
 * a lab to automated deploy is just a matter of adding it to labs.mjs.
 */
/** github.com/owner/repo identifies one project; a bare domain does not. */
function specificRepo(url) {
  if (!url) return null;
  const u = url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
  return /^(github|gitlab)\.com\/[^/]+\/[^/]+/.test(u) ? u.split("/").slice(0, 3).join("/") : null;
}
/** "Purple Knight (Semperis)" and "Purple Knight" are the same lab. */
const nameKey = (n) => String(n).toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]/g, "");

export function allEntries() {
  const ids = new Set(), repos = new Set(), names = new Set();
  const take = (e) => { ids.add(e.id); const r = specificRepo(e.repo); if (r) repos.add(r); names.add(nameKey(e.name)); };
  LABS.forEach(take);

  // The research set lists some labs under several domains (TerraGoat appears in
  // cloud, cicd and iac) and under vendor-prefixed names ("OWASP WebGoat" vs the
  // curated "WebGoat"). Drop those twins on id, specific repo, or name — but NOT
  // on a bare domain, since e.g. two different TryHackMe rooms share tryhackme.com.
  const imported = [];
  for (const e of IMPORTED_LABS) {
    const r = specificRepo(e.repo);
    if (ids.has(e.id) || (r && repos.has(r)) || names.has(nameKey(e.name))) continue;
    take(e);
    imported.push(e);
  }
  return [...LABS, ...imported, ...serviceEntries()];
}

export function findEntry(id) {
  if (!id) return null;
  const all = allEntries();
  return all.find((e) => e.id === id)
    // allow `httpd@CVE-2021-41773` written as `httpd/CVE-2021-41773`
    || all.find((e) => e.id === String(id).replace("/", "@"))
    || all.find((e) => e.id.toLowerCase() === String(id).toLowerCase())
    || null;
}

export function filterEntries({ domain, engine, app } = {}) {
  return allEntries().filter((e) =>
    (!domain || e.domain === domain) &&
    (!engine || e.engine === engine) &&
    (!app || e.app === app));
}

/** Simple substring+token scoring — good enough, zero deps. */
export function searchEntries(q) {
  const needle = String(q || "").toLowerCase().trim();
  if (!needle) return [];
  const score = (e) => {
    const hay = `${e.id} ${e.name} ${e.domain} ${e.description}`.toLowerCase();
    if (e.id.toLowerCase() === needle) return 100;
    if (e.id.toLowerCase().includes(needle)) return 50;
    if (e.name.toLowerCase().includes(needle)) return 30;
    return hay.includes(needle) ? 10 : 0;
  };
  return allEntries().map((e) => ({ e, s: score(e) })).filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s).map((x) => x.e);
}

/** Domains present across the whole catalog (curated + imported + services). */
export const DOMAINS = [...new Set(allEntries().map((e) => e.domain))].sort();

export { LABS, IMPORTED_LABS, SERVICES, SERVICE_APPS };
