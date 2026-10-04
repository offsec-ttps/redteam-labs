/**
 * Service-level CVE labs: pick an application, pick a version/CVE, get a
 * disposable vulnerable instance.
 *
 * Backed by vulhub, whose layout is already exactly <app>/<CVE>/docker-compose.yml,
 * so no per-CVE environment has to be authored here. We pin the revision (see
 * VULHUB_REF in labs.mjs) so an exploitable image set cannot shift underneath us.
 *
 * `port` is advisory only — the docker engine discovers the real published ports
 * from `docker compose config --format json`, so an upstream change cannot cause a
 * lab to be reported on the wrong address.
 */

/** app → list of CVE/version variants. `path` is the directory inside vulhub. */
// Deployed into a real spinner VM and checked on 2026-10-01 (HTTP answer, or the container running for non-HTTP services).
const VERIFIED = new Set([
  "httpd@CVE-2021-41773", "httpd@CVE-2021-42013", "httpd@CVE-2017-15715", "tomcat@CVE-2017-12615", "tomcat@CVE-2020-1938", "tomcat@weak-password",
  "nginx@CVE-2013-4547", "nginx@insecure-config", "struts2@S2-046", "struts2@S2-053",
  "spring@CVE-2022-22965", "spring@CVE-2022-22947", "log4j@CVE-2021-44228", "redis@CVE-2022-0543", "redis@unauth",
  "jenkins@CVE-2018-1000861", "weblogic@CVE-2017-10271", "confluence@CVE-2022-26134",
]);

export const SERVICES = {
  httpd: {
    label: "Apache HTTP Server",
    variants: [
      { id: "CVE-2021-41773", title: "Path traversal / RCE via mod_cgi", affected: "2.4.49", severity: "critical", path: "httpd/CVE-2021-41773", port: 8080, techniques: ["T1190"] },
      { id: "CVE-2021-42013", title: "Path traversal (2.4.50 bypass of the 41773 fix)", affected: "2.4.50", severity: "critical", path: "httpd/CVE-2021-42013", port: 8080, techniques: ["T1190"] },
      { id: "CVE-2017-15715", title: "Newline in filename bypasses upload filters", affected: "2.4.0–2.4.29", severity: "high", path: "httpd/CVE-2017-15715", port: 8080, techniques: ["T1190", "T1505.003"] },
    ],
  },
  tomcat: {
    label: "Apache Tomcat",
    variants: [
      { id: "CVE-2017-12615", title: "RCE via HTTP PUT (readonly=false)", affected: "7.0.x", severity: "high", path: "tomcat/CVE-2017-12615", port: 8080, techniques: ["T1190", "T1505.003"] },
      { id: "CVE-2020-1938", title: "Ghostcat — AJP file read / inclusion", affected: "6/7/8/9", severity: "critical", path: "tomcat/CVE-2020-1938", port: 8080, techniques: ["T1190"] },
      { id: "weak-password", title: "Manager deployed with weak credentials → WAR upload", affected: "8.x", severity: "high", path: "tomcat/tomcat8", port: 8080, techniques: ["T1078", "T1505.003"] },
    ],
  },
  nginx: {
    label: "Nginx",
    variants: [
      { id: "CVE-2013-4547", title: "Space-in-URI parsing flaw bypasses restrictions", affected: "0.8.41–1.5.6", severity: "medium", path: "nginx/CVE-2013-4547", port: 8080, techniques: ["T1190"] },
      { id: "insecure-config", title: "Off-by-slash alias traversal", affected: "any (misconfig)", severity: "medium", path: "nginx/insecure-configuration", port: 8080, techniques: ["T1190"] },
    ],
  },
  struts2: {
    label: "Apache Struts 2",
    variants: [
      { id: "S2-046", title: "OGNL RCE via multipart Content-Disposition", affected: "2.3.x", severity: "critical", path: "struts2/s2-046", port: 8080, techniques: ["T1190", "T1059"] },
      { id: "S2-053", title: "OGNL RCE via Freemarker tag", affected: "2.0.0–2.3.33", severity: "critical", path: "struts2/s2-053", port: 8080, techniques: ["T1190", "T1059"] },
    ],
  },
  spring: {
    label: "Spring Framework",
    variants: [
      { id: "CVE-2022-22965", title: "Spring4Shell — data-binding RCE", affected: "≤5.3.17", severity: "critical", path: "spring/CVE-2022-22965", port: 8080, techniques: ["T1190", "T1059"] },
      { id: "CVE-2022-22947", title: "Spring Cloud Gateway SpEL RCE", affected: "3.1.0", severity: "critical", path: "spring/CVE-2022-22947", port: 8080, techniques: ["T1190", "T1059"] },
    ],
  },
  log4j: {
    label: "Apache Log4j",
    variants: [
      { id: "CVE-2021-44228", title: "Log4Shell — JNDI lookup RCE", affected: "2.0–2.14.1", severity: "critical", path: "log4j/CVE-2021-44228", port: 8983, techniques: ["T1190", "T1059"] },
    ],
  },
  redis: {
    label: "Redis",
    variants: [
      { id: "CVE-2022-0543", title: "Lua sandbox escape → RCE", affected: "Debian/Ubuntu builds", severity: "critical", path: "redis/CVE-2022-0543", port: 6379, techniques: ["T1190", "T1059"] },
      { id: "unauth", title: "Unauthenticated access", affected: "any (misconfig)", severity: "high", path: "redis/4-unacc", port: 6379, techniques: ["T1078"] },
    ],
  },
  jenkins: {
    label: "Jenkins",
    variants: [
      { id: "CVE-2018-1000861", title: "Unauthenticated RCE via stapler routing", affected: "≤2.153", severity: "critical", path: "jenkins/CVE-2018-1000861", port: 8080, techniques: ["T1190", "T1059"] },
    ],
  },
  weblogic: {
    label: "Oracle WebLogic",
    variants: [
      { id: "CVE-2017-10271", title: "XMLDecoder deserialization RCE", affected: "10.3.6 / 12.x", severity: "critical", path: "weblogic/CVE-2017-10271", port: 7001, techniques: ["T1190", "T1059"] },
    ],
  },
  confluence: {
    label: "Atlassian Confluence",
    variants: [
      { id: "CVE-2022-26134", title: "OGNL injection → unauthenticated RCE", affected: "<7.18.1", severity: "critical", path: "confluence/CVE-2022-26134", port: 8090, techniques: ["T1190", "T1059"] },
    ],
  },
};

/** Flatten to lab-like records so the CLI can render/deploy them uniformly. */
export function serviceEntries() {
  const out = [];
  for (const [app, meta] of Object.entries(SERVICES)) {
    for (const v of meta.variants) {
      out.push({
        id: `${app}@${v.id}`,
        name: `${meta.label} — ${v.id}`,
        app,
        domain: "service-cve",
        description: `${v.title} (affected: ${v.affected})`,
        severity: v.severity,
        engine: "docker",
        environments: ["local", "remote"],
        source: { kind: "vulhub", path: v.path },
        resources: { cpus: 1, memoryMB: 1024, diskGB: 2 },
        services: v.port ? [{ name: app, port: v.port, protocol: "tcp" }] : [],
        attack: { tactics: ["TA0001 Initial Access"], techniques: v.techniques },
        sigmaPath: "web/",
        isolation: { requiresEgress: false, requiresPublicIp: false },
        deploy: { available: true },
        verified: VERIFIED.has(`${app}@${v.id}`),
      });
    }
  }
  return out;
}

export const SERVICE_APPS = Object.keys(SERVICES);
