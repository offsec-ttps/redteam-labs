/**
 * Terraform engine for cloud labs (AWSGoat, TerraGoat, Sadcloud, CloudFoxable…).
 *
 * DESIGN: rtlab plans; the operator approves the spend.
 *
 * Cloud labs differ from container labs in ways that rule out a one-command deploy:
 *   1. They create BILLABLE resources in someone's real account. A tool that
 *      auto-approves that is a tool that surprises people with a bill.
 *   2. They deliberately expose PUBLIC endpoints, so the "bind to a private
 *      address" isolation this tool relies on elsewhere simply does not apply.
 *
 * So this engine does everything up to the irreversible step: verify credentials,
 * clone the lab, `terraform init`, and `terraform plan` — a complete, free preview —
 * then hand back the exact `apply` command to run. Nothing here ever runs
 * `apply`/`destroy` with -auto-approve. The same applies to teardown: the command
 * is surfaced, because a failed silent destroy leaves resources billing forever.
 *
 * Credentials come from src/creds.mjs (env or a gitignored rtlab.creds.json), are
 * passed to terraform as process env, and are never written to disk or into state.
 */

import { mkdir, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { has, run, capture } from "../run.mjs";
import { LABS_DIR } from "../state.mjs";
import { credEnv, verifyCreds } from "../creds.mjs";

export async function preflight(provider) {
  if (!(await has("terraform", ["version"]))) {
    throw new Error("`terraform` not found — install Terraform, then retry.");
  }
  if (!(await has("git"))) throw new Error("`git` not found — needed to fetch the lab source.");
  const v = await verifyCreds(provider);
  if (!v.ok) {
    throw new Error(`${provider.toUpperCase()} credentials not usable: ${v.error}. `
      + `Set them in the environment or ${"rtlab.creds.json"}, then check with \`rtlab creds\`.`);
  }
  return v;
}

/** Find the directory holding the root Terraform module. */
async function findTfDir(root, provider, hint) {
  const candidates = [];
  if (hint) candidates.push(path.join(root, hint));
  candidates.push(
    path.join(root, "terraform", provider),
    path.join(root, "terraform"),
    path.join(root, provider),
    root,
  );
  for (const c of candidates) {
    if (!existsSync(c)) continue;
    const files = await readdir(c).catch(() => []);
    if (files.some((f) => f.endsWith(".tf"))) return c;
  }
  for (const d of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (!d.isDirectory()) continue;
    const sub = path.join(root, d.name);
    const files = await readdir(sub).catch(() => []);
    if (files.some((f) => f.endsWith(".tf"))) return sub;
  }
  throw new Error(`no Terraform module (*.tf) found in ${root} — set source.tfDir for this lab`);
}

async function materialise(entry, dir, onLog) {
  const src = entry.source || {};
  const clone = path.join(dir, "src");
  if (!existsSync(clone)) {
    onLog?.(`cloning ${src.repo}…`);
    await run("git", ["clone", "--depth", "1", src.repo, clone], { timeout: 900_000, onLog });
  }
  const provider = entry.provider || src.provider || "aws";
  const tfDir = await findTfDir(clone, provider, src.tfDir);
  return { tfDir, provider };
}

/** Parse "Plan: 12 to add, 0 to change, 0 to destroy." out of plan output. */
function planSummary(lines) {
  const m = lines.join("\n").match(/Plan:\s*(\d+)\s*to add,\s*(\d+)\s*to change,\s*(\d+)\s*to destroy/);
  if (!m) return null;
  return { add: Number(m[1]), change: Number(m[2]), destroy: Number(m[3]) };
}

/**
 * Prepare the lab: verify creds → clone → init → plan. Returns the plan summary and
 * the exact commands for the operator to run. Never applies.
 */
export async function deploy(entry, opts) {
  const { id, onLog } = opts;
  const provider = entry.provider || entry.source?.provider || "aws";
  const identity = await preflight(provider);

  const dir = path.join(LABS_DIR, id);
  await mkdir(dir, { recursive: true });
  const { tfDir } = await materialise(entry, dir, onLog);
  const env = credEnv(provider);

  onLog?.("terraform init…");
  await run("terraform", ["init", "-input=false", "-no-color"], { cwd: tfDir, timeout: 900_000, env, onLog });

  const captured = [];
  onLog?.("terraform plan — previewing, nothing is created…");
  await run("terraform", ["plan", "-input=false", "-no-color", "-out=rtlab.tfplan"],
    { cwd: tfDir, timeout: 900_000, env, onLog: (l) => { captured.push(l); onLog?.(l); } });

  return {
    planned: true,
    dir, tfDir, provider,
    identity: identity.identity,
    plan: planSummary(captured),
    services: [],
    status: "planned",
    // The irreversible, billable step stays with the operator.
    applyCmd: `cd ${tfDir} && terraform apply rtlab.tfplan`,
    destroyCmd: `cd ${tfDir} && terraform destroy`,
  };
}

/**
 * Cloud labs have no cheap stop/start — destroy-and-reapply is the only honest
 * lifecycle, and pretending otherwise would leave resources billing.
 */
export async function start() {
  throw new Error("cloud labs have no start/stop — re-run `rtlab deploy <id>` to re-plan, or destroy to stop the spend.");
}
export async function stop() {
  throw new Error("cloud labs have no start/stop — tear the resources down to stop the spend (see `rtlab info` for the destroy command).");
}

/**
 * Teardown. rtlab will NOT silently destroy cloud resources: it reports the command
 * and refuses to drop the directory while Terraform state still holds resources,
 * because deleting that state orphans billable infrastructure.
 */
export async function destroy(dep, { onLog } = {}) {
  const provider = dep.provider || "aws";
  const env = credEnv(provider);
  let remaining = 0;
  if (dep.tfDir && existsSync(dep.tfDir)) {
    const out = await capture("terraform", ["state", "list"], 60_000, { cwd: dep.tfDir, env }).catch(() => null);
    remaining = out ? out.split("\n").filter(Boolean).length : 0;
  }
  if (remaining > 0) {
    throw new Error(
      `${remaining} cloud resource(s) are still in Terraform state — rtlab will not delete the state `
      + `directory while they exist, or they would bill forever with no way to reach them.\n`
      + `    Run:  cd ${dep.tfDir} && terraform destroy\n`
      + `    Then: rtlab destroy ${dep.id} (removes the local record)`);
  }
  if (dep.dir) await rm(dep.dir, { recursive: true, force: true }).catch(() => {});
  onLog?.("no resources in state — local record removed");
}

export async function logs(dep) {
  return { cmd: "terraform", args: ["show", "-no-color"], cwd: dep.tfDir };
}

/** Status from Terraform state: how many resources currently exist (i.e. bill). */
export async function status(dep) {
  if (!dep.tfDir || !existsSync(dep.tfDir)) return { status: "unknown", containers: [] };
  const env = credEnv(dep.provider || "aws");
  const out = await capture("terraform", ["state", "list"], 60_000, { cwd: dep.tfDir, env }).catch(() => null);
  const n = out ? out.split("\n").filter(Boolean).length : 0;
  return { status: n > 0 ? "running" : (dep.status === "planned" ? "planned" : "stopped"), resources: n, containers: [] };
}
