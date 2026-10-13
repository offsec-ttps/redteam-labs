/**
 * Lab spec schema + validator for the onboarding pipeline.
 *
 * A "lab spec" is just a catalog entry in the same shape the engines already consume (see labs.mjs). This module
 * validates a spec (from a JSON file or assembled from CLI flags), checks the fields each source kind needs, and
 * fills sensible defaults so a minimal spec still produces a complete, deployable entry.
 */

export const SOURCE_KINDS = ["image", "build", "compose", "vulhub", "k8s", "terraform"];
const ENGINE_BY_KIND = { image: "docker", build: "docker", compose: "docker", vulhub: "docker", k8s: "k8s", terraform: "terraform" };
const ID_RE = /^[a-z0-9][a-z0-9._@:-]*$/i;

/** Validate and normalize a lab spec. Returns { ok, errors, normalized }. `existingIds` are curated ids that must not be shadowed. */
export function validateLabSpec(input, { existingIds = [] } = {}) {
  const errors = [];
  const e = input && typeof input === "object" ? input : {};
  const src = e.source && typeof e.source === "object" ? { ...e.source } : {};

  if (!e.id) errors.push('missing "id"');
  else if (!ID_RE.test(e.id)) errors.push(`invalid id "${e.id}" (use letters, digits, and . _ - @ :)`);
  if (!e.name) errors.push('missing "name"');

  if (!src.kind) errors.push('missing "source.kind"');
  else if (!SOURCE_KINDS.includes(src.kind)) errors.push(`source.kind must be one of: ${SOURCE_KINDS.join(", ")}`);
  else {
    const need = (f, hint) => { if (!src[f]) errors.push(`source.${f} is required for kind "${src.kind}"${hint ? ` (${hint})` : ""}`); };
    if (src.kind === "image") { need("image"); if (!src.port) errors.push('source.port is required for kind "image"'); }
    else if (src.kind === "build") { need("repo"); if (!src.port) errors.push('source.port is required for kind "build"'); }
    else if (src.kind === "compose") { need("repo"); }
    else if (src.kind === "vulhub") { need("path"); }
    else if (src.kind === "k8s") { need("repo"); need("setup", "shell command to apply the lab"); if (!src.expose || !src.expose.selector) errors.push('source.expose.selector is required for kind "k8s"'); }
    else if (src.kind === "terraform") { need("repo"); need("provider"); need("tfDir"); }
  }

  const engine = e.engine || (src.kind ? ENGINE_BY_KIND[src.kind] : undefined);
  if (!engine) errors.push('cannot determine "engine" (set it, or a valid source.kind)');

  if (errors.length) return { ok: false, errors, normalized: null };

  if (existingIds.includes(e.id)) {
    return { ok: false, errors: [`a curated lab already uses id "${e.id}" — choose another id (curated labs win over user labs)`], normalized: null };
  }

  const port = src.port || (Array.isArray(e.services) && e.services[0]?.port) || null;
  const normalized = {
    id: e.id,
    name: e.name,
    domain: e.domain || "web",
    description: e.description || `${e.name} — onboarded via the lab pipeline.`,
    repo: e.repo || src.repo || "",
    docsUrl: e.docsUrl || e.repo || src.repo || "",
    engine,
    environments: e.environments || (engine === "terraform" ? ["cloud"] : engine === "k8s" ? ["local", "remote"] : ["local", "remote"]),
    source: src,
    resources: e.resources || { cpus: engine === "k8s" ? 2 : 1, memoryMB: engine === "k8s" ? 4096 : 1024, diskGB: engine === "k8s" ? 12 : 2 },
    services: Array.isArray(e.services) && e.services.length ? e.services : (port ? [{ name: e.serviceName || "web", port, protocol: src.protocol || "http" }] : []),
    attack: e.attack || { tactics: [], techniques: [] },
    sigmaPath: e.sigmaPath || "",
    isolation: e.isolation || { requiresEgress: e.requiresEgress ?? true, requiresPublicIp: false },
    deploy: { available: e.deploy?.available ?? true },
    verified: false,
    user: true,
  };
  return { ok: true, errors: [], normalized };
}
