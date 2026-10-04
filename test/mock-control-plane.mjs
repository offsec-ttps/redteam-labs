/** A stand-in control plane implementing the runner protocol, for testing the agent without Supabase. */
import http from "node:http";

export async function startMock({ codes = ["GOOD-CODE"], key = "rtr_testkey" } = {}) {
  const m = { conflictJobs: new Set(), strict: true, failReports: 0, layouts: new Set(), jobs: [], reports: [], heartbeats: [], polls: 0, rejectPoll: false, knownJobs: new Set(), key };
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => { raw += d; });
    req.on("end", () => {
      const send = (status, obj) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
      // Both layouts: /api/public/runner/<name> (app domain) and /functions/v1/runner-<name> (Supabase).
      const fn = req.url.replace(/^\/api\/public\/runner\//, "").replace(/^\/functions\/v1\/runner-/, "");
      m.layouts.add(req.url.startsWith("/functions/") ? "supabase" : "app");
      let body = {}; try { body = JSON.parse(raw || "{}"); } catch { return send(422, { error: "bad json" }); }
      if (fn === "enroll") {
        if (!codes.includes(body.enrollment_code)) return send(401, { error: "Invalid or expired enrollment code" });
        m.enrolled = body;
        return send(200, { runner_id: "runner-1", runner_key: key, org_id: "org-1", poll_interval_seconds: 1 });
      }
      if (req.headers.authorization !== `Bearer ${key}`) return send(401, { error: "Unknown runner key" });
      if (fn === "heartbeat") {
        // The real control plane validates strictly: only running/stopped are known per deployment.
        if (m.strict && (body.deployments || []).some((d) => !["running", "stopped", "missing"].includes(d.status))) return send(422, { error: "deployments.status: Invalid enum value" });
        m.heartbeats.push(body); return send(200, { ok: true, server_time: new Date().toISOString(), pending_jobs: m.jobs.length }); }
      if (fn === "poll") {
        m.polls++;
        if (m.rejectPoll) return send(401, { error: "runner revoked" });
        const job = m.jobs.shift() || null;
        if (job) m.knownJobs.add(job.id);
        return send(200, { job });
      }
      if (fn === "report") {
        if (!m.knownJobs.has(body.job_id) || m.conflictJobs.has(body.job_id)) return send(409, { error: "unknown job" });
        if (m.failReports > 0) { m.failReports--; return send(503, { error: "temporarily unavailable" }); }
        // Strict like the real endpoint: explicit nulls for optional strings are rejected, at most 200 events.
        if ((body.events || []).length > 200) return send(422, { error: "events: too many" });
        if (m.strict && body.result && Object.entries(body.result).some(([k, v]) => v === null && ["subnet", "vm_ip", "rtlab_id"].includes(k))) return send(422, { error: "result: expected string, received null" });
        m.reports.push(body);
        return send(200, { ok: true });
      }
      send(404, { error: "no such function" });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  m.url = `http://127.0.0.1:${server.address().port}`;
  m.close = () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); });
  m.final = (jobId) => m.reports.find((r) => r.job_id === jobId && r.status !== "running");
  return m;
}

export async function until(cond, ms = 8000, step = 25) {
  const t = Date.now();
  while (Date.now() - t < ms) { if (await cond()) return true; await new Promise((r) => setTimeout(r, step)); }
  throw new Error("timed out waiting for condition");
}
