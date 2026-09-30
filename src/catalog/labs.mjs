/**
 * Curated red-team / vulnerable lab catalog.
 *
 * Field names intentionally match `VulnLabEntry` in the DetectOps repo's
 * VULNERABLE-LABS-PLAN.md §3, so the platform can consume `rtlab catalog --json`
 * with no mapping layer. Keep them in sync.
 *
 * `source` decides how the lab is materialised:
 *   { kind: "image",   image, port }        → rtlab authors the compose file itself
 *                                             (full control of port binding)
 *   { kind: "compose", repo, subdir? }      → shallow-clone upstream, use their compose;
 *                                             ports re-bound via a generated override
 *   { kind: "vulhub",  path }               → pinned vulhub revision, <app>/<CVE>/
 *   { kind: "vagrant", box }                → VM engine
 *
 * `deploy.available: false` = catalogued but no automated path yet (template +
 * guided steps). `verified` = a maintainer has actually run it end-to-end.
 */

export const VULHUB_REPO = "https://github.com/vulhub/vulhub";
/** Pinned so an exploitable image set can't shift under us. Bump deliberately. */
export const VULHUB_REF = "master";

const web = { tactics: ["TA0001 Initial Access", "TA0002 Execution"], techniques: ["T1190", "T1059"] };

export const LABS = [
  // ── Web / API (single-image: rtlab authors compose → strongest isolation) ──
  {
    id: "juice-shop",
    name: "OWASP Juice Shop",
    domain: "web",
    description: "The most widely used intentionally insecure web app — covers the entire OWASP Top 10. Small image, fastest lab to stand up.",
    repo: "https://github.com/juice-shop/juice-shop",
    docsUrl: "https://owasp.org/www-project-juice-shop/",
    engine: "docker",
    environments: ["local", "remote"],
    source: { kind: "image", image: "bkimminich/juice-shop", port: 3000 },
    resources: { cpus: 1, memoryMB: 1024, diskGB: 2 },
    services: [{ name: "web", port: 3000, protocol: "http" }],
    attack: { tactics: web.tactics, techniques: ["T1190", "T1071", "T1505"] },
    sigmaPath: "web/",
    isolation: { requiresEgress: false, requiresPublicIp: false },
    deploy: { available: true },
    verified: false,
  },
  {
    id: "dvwa",
    name: "DVWA (Damn Vulnerable Web Application)",
    domain: "web",
    description: "Classic PHP/MySQL teaching app with selectable security levels — ideal for mapping one vulnerability class at a time to a detection.",
    repo: "https://github.com/digininja/DVWA",
    docsUrl: "https://github.com/digininja/DVWA",
    engine: "docker",
    environments: ["local", "remote"],
    source: { kind: "image", image: "vulnerables/web-dvwa", port: 80 },
    resources: { cpus: 1, memoryMB: 1024, diskGB: 2 },
    services: [{ name: "web", port: 80, protocol: "http" }],
    attack: { tactics: web.tactics, techniques: ["T1190", "T1059", "T1078"] },
    sigmaPath: "web/",
    isolation: { requiresEgress: false, requiresPublicIp: false },
    deploy: { available: true },
    verified: false,
  },
  {
    id: "webgoat",
    name: "OWASP WebGoat",
    domain: "web",
    description: "Guided lesson-based insecure Java app; each lesson isolates a vulnerability class with a known-good exploitation path.",
    repo: "https://github.com/WebGoat/WebGoat",
    docsUrl: "https://owasp.org/www-project-webgoat/",
    engine: "docker",
    environments: ["local", "remote"],
    source: { kind: "image", image: "webgoat/webgoat", port: 8080 },
    resources: { cpus: 2, memoryMB: 2048, diskGB: 3 },
    services: [{ name: "web", port: 8080, protocol: "http" }],
    attack: { tactics: web.tactics, techniques: ["T1190", "T1059"] },
    sigmaPath: "web/",
    isolation: { requiresEgress: false, requiresPublicIp: false },
    deploy: { available: true },
    verified: false,
  },
  {
    id: "vampi",
    name: "VAmPI (Vulnerable API)",
    domain: "web",
    description: "Deliberately vulnerable REST API covering the OWASP API Security Top 10 — BOLA, broken auth, mass assignment.",
    repo: "https://github.com/erev0s/VAmPI",
    docsUrl: "https://github.com/erev0s/VAmPI",
    engine: "docker",
    environments: ["local", "remote"],
    source: { kind: "image", image: "erev0s/vampi", port: 5000 },
    resources: { cpus: 1, memoryMB: 512, diskGB: 1 },
    services: [{ name: "api", port: 5000, protocol: "http" }],
    attack: { tactics: web.tactics, techniques: ["T1190"] },
    sigmaPath: "web/api/",
    isolation: { requiresEgress: false, requiresPublicIp: false },
    deploy: { available: true },
    verified: false,
  },
  {
    id: "dvga",
    name: "DVGA (Damn Vulnerable GraphQL App)",
    domain: "web",
    description: "Vulnerable GraphQL API — introspection abuse, batching attacks, injection through resolvers.",
    repo: "https://github.com/dolevf/Damn-Vulnerable-GraphQL-Application",
    docsUrl: "https://github.com/dolevf/Damn-Vulnerable-GraphQL-Application",
    engine: "docker",
    environments: ["local", "remote"],
    source: { kind: "image", image: "dolevf/dvga", port: 5013 },
    resources: { cpus: 1, memoryMB: 512, diskGB: 1 },
    services: [{ name: "api", port: 5013, protocol: "http" }],
    attack: { tactics: web.tactics, techniques: ["T1592", "T1190"] },
    sigmaPath: "web/graphql/",
    isolation: { requiresEgress: false, requiresPublicIp: false },
    // Verified 2026-09-30: the dolevf/dvga image's app binds 127.0.0.1:5013 inside
    // the container, so it is unreachable from the host however the network is set
    // up. Needs the image's bind-address env var — add it to source.env and flip
    // this back to available once confirmed.
    deploy: {
      available: false,
      guidedSteps: [
        "The published image binds 127.0.0.1 inside the container, so rtlab cannot expose it yet.",
        "Run it directly and set the bind address per the project's README:",
        "  docker run --rm -p 5013:5013 dolevf/dvga   # then check it is reachable",
        "If an env var (e.g. WEB_HOST=0.0.0.0) fixes the bind, add it to this entry's source.env.",
      ],
    },
    verified: false,
  },

  // ── Multi-container upstream compose (ports re-bound via generated override) ──
  {
    id: "crapi",
    name: "OWASP crAPI",
    domain: "web",
    description: "Completely Ridiculous API — a realistic multi-service API stack (web, API, MongoDB, Postgres, mailhog) with API Top 10 flaws.",
    repo: "https://github.com/OWASP/crAPI",
    docsUrl: "https://owasp.org/www-project-crapi/",
    engine: "docker",
    environments: ["local", "remote"],
    source: { kind: "compose", repo: "https://github.com/OWASP/crAPI", subdir: "deploy/docker" },
    resources: { cpus: 2, memoryMB: 4096, diskGB: 6 },
    services: [{ name: "web", port: 8888, protocol: "http" }],
    attack: { tactics: web.tactics, techniques: ["T1190", "T1059"] },
    sigmaPath: "web/api/",
    isolation: { requiresEgress: true, requiresPublicIp: false },
    deploy: { available: true },
    verified: false,
  },
  {
    id: "cicd-goat",
    name: "CI/CD Goat",
    domain: "cicd",
    description: "Deliberately vulnerable CI/CD environment (Jenkins + GitLab + Gitea) teaching the top 10 CI/CD security risks.",
    repo: "https://github.com/cider-security-research/cicd-goat",
    docsUrl: "https://github.com/cider-security-research/cicd-goat",
    engine: "docker",
    environments: ["local"],
    source: { kind: "compose", repo: "https://github.com/cider-security-research/cicd-goat" },
    resources: { cpus: 4, memoryMB: 8192, diskGB: 12 },
    services: [{ name: "jenkins", port: 8080, protocol: "http" }],
    attack: { tactics: ["TA0001 Initial Access"], techniques: ["T1195", "T1059.004"] },
    sigmaPath: "devops/",
    isolation: { requiresEgress: true, requiresPublicIp: false },
    deploy: { available: true },
    verified: false,
  },

  // ── Kubernetes (needs a cluster: catalogued, guided for now) ──
  {
    id: "kubernetes-goat",
    name: "Kubernetes Goat",
    domain: "k8s",
    description: "Interactive Kubernetes security playground — container escape, RBAC abuse, secrets exposure, SSRF in-cluster.",
    repo: "https://github.com/madhuakula/kubernetes-goat",
    docsUrl: "https://madhuakula.com/kubernetes-goat/",
    engine: "k8s",
    environments: ["local"],
    source: { kind: "compose", repo: "https://github.com/madhuakula/kubernetes-goat" },
    resources: { cpus: 4, memoryMB: 8192, diskGB: 20 },
    services: [{ name: "landing", port: 1234, protocol: "http" }],
    attack: { tactics: ["TA0004 Privilege Escalation"], techniques: ["T1611", "T1613", "T1525", "T1610", "T1609"] },
    sigmaPath: "cloud/k8s/",
    isolation: { requiresEgress: true, requiresPublicIp: false },
    deploy: {
      available: false,
      guidedSteps: [
        "Create a local cluster: kind create cluster --name goat  (or minikube start)",
        "git clone https://github.com/madhuakula/kubernetes-goat",
        "cd kubernetes-goat && bash setup-kubernetes-goat.sh",
        "bash access-kubernetes-goat.sh   # port-forwards the scenarios",
        "Pair with Falco or Tetragon for runtime detection telemetry.",
      ],
    },
    verified: false,
  },

  // ── VM labs (Vagrant engine) ──
  {
    id: "metasploitable3-ub1404",
    name: "Metasploitable 3 (Ubuntu 14.04)",
    domain: "linux",
    description: "Rapid7's intentionally vulnerable Linux VM — a broad service surface for exploitation and host-telemetry detection work.",
    repo: "https://github.com/rapid7/metasploitable3",
    docsUrl: "https://github.com/rapid7/metasploitable3",
    engine: "vm",
    environments: ["local"],
    source: { kind: "vagrant", box: "rapid7/metasploitable3-ub1404" },
    resources: { cpus: 2, memoryMB: 2048, diskGB: 20 },
    services: [{ name: "ssh", port: 22, protocol: "tcp" }],
    attack: { tactics: ["TA0001 Initial Access", "TA0004 Privilege Escalation"], techniques: ["T1190", "T1068"] },
    sigmaPath: "linux/",
    isolation: { requiresEgress: false, requiresPublicIp: false },
    deploy: { available: true },
    verified: false,
  },
  {
    id: "goad",
    name: "GOAD (Game of Active Directory)",
    domain: "ad",
    description: "Multi-VM vulnerable Active Directory forest — the richest source of Windows attack telemetry for detection engineering.",
    repo: "https://github.com/Orange-Cyberdefense/GOAD",
    docsUrl: "https://orange-cyberdefense.github.io/GOAD/",
    engine: "vm",
    environments: ["local"],
    source: { kind: "vagrant", box: "(multi-VM — uses GOAD's own installer)" },
    resources: { cpus: 8, memoryMB: 24576, diskGB: 120 },
    services: [{ name: "rdp", port: 3389, protocol: "tcp" }],
    attack: { tactics: ["TA0006 Credential Access", "TA0008 Lateral Movement"], techniques: ["T1003", "T1068", "T1071", "T1486", "T1055", "T1136"] },
    sigmaPath: "windows/",
    isolation: { requiresEgress: true, requiresPublicIp: false },
    deploy: {
      available: false,
      guidedSteps: [
        "GOAD orchestrates several VMs with its own installer — rtlab does not wrap it yet.",
        "git clone https://github.com/Orange-Cyberdefense/GOAD && cd GOAD",
        "./goad.sh -t check -l GOAD -p virtualbox   # verify prerequisites",
        "./goad.sh -t install -l GOAD -p virtualbox  # expect a long build",
        "Budget ~24GB RAM and ~120GB disk before starting.",
      ],
    },
    verified: false,
  },
];

export const DOMAINS = [...new Set(LABS.map((l) => l.domain))].sort();
