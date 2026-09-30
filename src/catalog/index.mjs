/** Catalog lookup/search over labs + service-CVE entries. */

import { LABS, DOMAINS } from "./labs.mjs";
import { serviceEntries, SERVICES, SERVICE_APPS } from "./services.mjs";

/** Every deployable/catalogued entry, labs first then service-CVE variants. */
export function allEntries() {
  return [...LABS, ...serviceEntries()];
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

export { LABS, DOMAINS, SERVICES, SERVICE_APPS };
