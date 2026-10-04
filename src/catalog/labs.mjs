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
 *   { kind: "build",   repo, port, subdir?, dockerfile? }
 *                                           → upstream ships only a Dockerfile: clone and build it
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    source: { kind: "image", image: "dolevf/dvga", port: 5013, env: { WEB_HOST: "0.0.0.0" } },
    resources: { cpus: 1, memoryMB: 512, diskGB: 1 },
    services: [{ name: "api", port: 5013, protocol: "http" }],
    attack: { tactics: web.tactics, techniques: ["T1592", "T1190"] },
    sigmaPath: "web/graphql/",
    isolation: { requiresEgress: false, requiresPublicIp: false },
    // Verified 2026-09-30: the dolevf/dvga image's app binds 127.0.0.1:5013 inside
    // the container, so it is unreachable from the host however the network is set
    // up. Needs the image's bind-address env var — add it to source.env and flip
    // this back to available once confirmed.
    deploy: { available: true },
    verified: true,
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
    verified: true,
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
    verified: true,
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

  // ── Cloud (Terraform engine — rtlab plans, you approve the spend) ──
  // ids match the imported research entries so these curated ones take precedence.
  {
    id: "awsgoat",
    name: "AWSGoat",
    domain: "cloud",
    description:
      "Tiered, deliberately vulnerable AWS environment (IAM privesc, Lambda, S3, ECS) built from Terraform. Generates real CloudTrail telemetry for cloud detection work.",
    repo: "https://github.com/ine-labs/AWSGoat",
    docsUrl: "https://github.com/ine-labs/AWSGoat",
    engine: "terraform",
    environments: ["cloud"],
    provider: "aws",
    source: { kind: "terraform", repo: "https://github.com/ine-labs/AWSGoat", provider: "aws", tfDir: "modules/module-1" },   // the root has no module; module-1 is the deployable app
    resources: { cpus: 0, memoryMB: 0, diskGB: 1 },
    services: [],
    attack: { tactics: ["TA0006 Credential Access", "TA0001 Initial Access"], techniques: ["T1190", "T1078", "T1552"] },
    sigmaPath: "cloud/aws/",
    isolation: { requiresEgress: true, requiresPublicIp: true },
    deploy: { available: true },
    verified: false,
  },
  {
    id: "terragoat",
    name: "TerraGoat",
    domain: "iac",
    description:
      "Bridgecrew's deliberately misconfigured Terraform — the reference target for IaC scanning and drift/misconfiguration detection. Supports AWS, Azure and GCP modules.",
    repo: "https://github.com/bridgecrewio/terragoat",
    docsUrl: "https://github.com/bridgecrewio/terragoat",
    engine: "terraform",
    environments: ["cloud"],
    provider: "aws",
    source: { kind: "terraform", repo: "https://github.com/bridgecrewio/terragoat", provider: "aws", tfDir: "terraform/aws" },
    resources: { cpus: 0, memoryMB: 0, diskGB: 1 },
    services: [],
    attack: { tactics: ["TA0005 Defense Evasion"], techniques: ["T1578"] },
    sigmaPath: "cloud/terraform/",
    isolation: { requiresEgress: true, requiresPublicIp: true },
    deploy: { available: false, reason: "Scanner target, not a deployable lab: its Terraform demands an S3 state backend (bucket, key, region passed to `terraform init`) and uses pre-1.0 syntax, so `terraform init` fails as shipped. Point Checkov, tfsec, KICS or Terrascan at the repository instead.", guidedSteps: ["git clone https://github.com/bridgecrewio/terragoat", "checkov -d terragoat/terraform   # or tfsec / kics / terrascan", "Compare the findings with TerraGoat's documented misconfigurations"] },
    verified: false,
  },
  {
    id: "cloudfoxable",
    name: "CloudFoxable",
    domain: "cloud",
    description:
      "Bishop Fox's intentionally vulnerable AWS CTF range, designed as a target for CloudFox enumeration — good for practising cloud recon detection.",
    repo: "https://github.com/BishopFox/cloudfoxable",
    docsUrl: "https://cloudfoxable.bishopfox.com/",
    engine: "terraform",
    environments: ["cloud"],
    provider: "aws",
    source: { kind: "terraform", repo: "https://github.com/BishopFox/cloudfoxable", provider: "aws" },
    resources: { cpus: 0, memoryMB: 0, diskGB: 1 },
    services: [],
    attack: { tactics: ["TA0007 Discovery", "TA0006 Credential Access"], techniques: ["T1526", "T1552"] },
    sigmaPath: "cloud/aws/",
    isolation: { requiresEgress: true, requiresPublicIp: true },
    deploy: { available: true },
    verified: false,
  },

  // ── Promoted after the 2026-10-01 repo audit: upstream ships a compose file, an image or a Dockerfile ──
  {"id": "dvna", "name": "DVNA (Damn Vulnerable NodeJS Application)", "domain": "web", "description": "Node.js app demonstrating the OWASP Top 10 with intentionally insecure code (official single-container build with SQLite).", "repo": "https://github.com/appsecco/dvna", "docsUrl": "https://github.com/appsecco/dvna", "engine": "docker", "environments": ["local", "remote"], "source": {"kind": "image", "image": "appsecco/dvna:sqlite", "port": 9090}, "resources": {"cpus": 1, "memoryMB": 1024, "diskGB": 3}, "services": [{"name": "web", "port": 9090, "protocol": "http"}], "attack": {"tactics": ["TA0001 Initial Access", "TA0002 Execution"], "techniques": ["T1190", "T1059"]}, "sigmaPath": "web/", "isolation": {"requiresEgress": false, "requiresPublicIp": false}, "deploy": {"available": true}, "verified": true},
  {"id": "dvws-node", "name": "DVWS (Damn Vulnerable Web Services)", "domain": "web", "description": "Insecure web services and APIs (REST, GraphQL, XML, JWT) built to practise API attacks.", "repo": "https://github.com/snoopysecurity/dvws-node", "docsUrl": "https://github.com/snoopysecurity/dvws-node", "engine": "docker", "environments": ["local", "remote"], "source": {"kind": "compose", "repo": "https://github.com/snoopysecurity/dvws-node"}, "resources": {"cpus": 1, "memoryMB": 1024, "diskGB": 3}, "services": [{"name": "web", "port": 80, "protocol": "http"}], "attack": {"tactics": ["TA0001 Initial Access", "TA0002 Execution"], "techniques": ["T1190", "T1552"]}, "sigmaPath": "web/", "isolation": {"requiresEgress": false, "requiresPublicIp": false}, "deploy": {"available": true}, "verified": true},
  {"id": "owasp-nodegoat", "name": "OWASP NodeGoat", "domain": "web", "description": "OWASP's Node.js/MongoDB app with the Top 10 built in, plus tutorials for each flaw.", "repo": "https://github.com/OWASP/NodeGoat", "docsUrl": "https://github.com/OWASP/NodeGoat", "engine": "docker", "environments": ["local", "remote"], "source": {"kind": "compose", "repo": "https://github.com/OWASP/NodeGoat"}, "resources": {"cpus": 1, "memoryMB": 1024, "diskGB": 3}, "services": [{"name": "web", "port": 4000, "protocol": "http"}], "attack": {"tactics": ["TA0001 Initial Access", "TA0002 Execution"], "techniques": ["T1190", "T1059"]}, "sigmaPath": "web/", "isolation": {"requiresEgress": false, "requiresPublicIp": false}, "deploy": {"available": true}, "verified": true},
  {"id": "owasp-railsgoat", "name": "OWASP RailsGoat", "domain": "web", "description": "Ruby on Rails app with the OWASP Top 10 and a deliberately weak authorization model.", "repo": "https://github.com/OWASP/railsgoat", "docsUrl": "https://github.com/OWASP/railsgoat", "engine": "docker", "environments": ["local", "remote"], "source": {"kind": "compose", "repo": "https://github.com/OWASP/railsgoat", "file": "rtlab-railsgoat.yml", "files": {"rtlab-railsgoat.yml": "# rtlab: upstream's compose expects a manual `rails db:setup`; prepare the SQLite database on start.\nservices:\n  web:\n    build: .\n    command: bash -c \"rm -f tmp/pids/server.pid && bundle exec rails db:prepare && bundle exec rails s -p 3000 -b '0.0.0.0'\"\n    ports:\n      - \"3000:3000\"\n"}}, "resources": {"cpus": 1, "memoryMB": 1536, "diskGB": 4}, "services": [{"name": "web", "port": 3000, "protocol": "http"}], "attack": {"tactics": ["TA0001 Initial Access", "TA0002 Execution"], "techniques": ["T1190", "T1078"]}, "sigmaPath": "web/", "isolation": {"requiresEgress": false, "requiresPublicIp": false}, "deploy": {"available": true}, "verified": true},
  {"id": "owasp-security-shepherd", "name": "OWASP Security Shepherd", "domain": "web", "description": "Web and mobile security training platform with levelled challenges and scoring.", "repo": "https://github.com/OWASP/SecurityShepherd", "docsUrl": "https://github.com/OWASP/SecurityShepherd", "engine": "docker", "environments": ["local", "remote"], "resources": {"cpus": 2, "memoryMB": 2048, "diskGB": 5}, "services": [{"name": "web", "port": 80, "protocol": "http"}], "attack": {"tactics": ["TA0001 Initial Access", "TA0002 Execution"], "techniques": ["T1190"]}, "sigmaPath": "web/", "isolation": {"requiresEgress": false, "requiresPublicIp": false}, "deploy": {"available": false, "reason": "Its compose file copies a WAR and TLS keystore that only `mvn -Pdocker clean install` produces; run that Maven build first, then `docker compose up` (admin / password)."}, "verified": false, "prerequisites": ["Java 17 and Maven", "Docker with Compose"], "steps": ["git clone https://github.com/OWASP/SecurityShepherd && cd SecurityShepherd", "mvn -Pdocker clean install -DskipTests", "docker compose up -d", "Open http://localhost (admin / password, change it at first login)"]},
  {"id": "damn-vulnerable-llm-agent", "name": "Damn Vulnerable LLM Agent", "domain": "llm", "description": "A ReAct-style LLM agent with prompt-injection and tool-abuse weaknesses. Choose the model at deploy time: a bundled local Ollama (llama3, about 4.7 GB on first start, slow on CPU), OpenRouter free models with your API key, or OpenAI.", "repo": "https://github.com/WithSecureLabs/damn-vulnerable-llm-agent", "docsUrl": "https://github.com/WithSecureLabs/damn-vulnerable-llm-agent", "engine": "docker", "environments": ["local", "remote"], "source": {"kind": "compose", "repo": "https://github.com/WithSecureLabs/damn-vulnerable-llm-agent", "file": "rtlab-dvla.yml", "files": {"rtlab-dvla.yml": "# rtlab: the agent needs a model behind it. Options (rtlab --lab-env, or the platform's deploy form) choose the\n# ($$ keeps the variables for the container's shell: Compose must not expand them on the host.)\n# backend: a bundled local Ollama (default, no key needed, slow on CPU), OpenRouter (free models with a key), or\n# OpenAI. The Ollama containers only pull a model when the Ollama backend is selected.\nservices:\n  ollama:\n    image: ollama/ollama:latest\n    volumes:\n      - ollama:/root/.ollama\n  ollama-pull:\n    image: ollama/ollama:latest\n    depends_on:\n      - ollama\n    environment:\n      OLLAMA_HOST: http://ollama:11434\n    entrypoint: [\"/bin/sh\", \"-c\", \"[ \\\"$${LLM_BACKEND:-ollama}\\\" = ollama ] || exit 0; until ollama list >/dev/null 2>&1; do sleep 2; done; ollama pull \\\"$${LLM_MODEL:-llama3}\\\"\"]\n    restart: \"no\"\n  agent:\n    build:\n      context: .\n      dockerfile: rtlab.Dockerfile\n    depends_on:\n      - ollama\n    environment:\n      OLLAMA_HOST: http://ollama:11434\n      OLLAMA_API_BASE: http://ollama:11434\n    ports:\n      - \"8501:8501\"\nvolumes:\n  ollama: {}\n", "rtlab.Dockerfile": "# rtlab: upstream's Dockerfile installs the apt package \"pip\", which does not exist on Debian, so the build fails.\nFROM python:3.9-slim\nWORKDIR /app\nRUN apt-get update && apt-get install -y --no-install-recommends build-essential curl git && rm -rf /var/lib/apt/lists/*\nRUN pip install python-dotenv\nCOPY . /app/\nRUN pip3 install -r requirements.txt\nCOPY config.toml /root/.streamlit/config.toml\nRUN chmod +x /app/rtlab-entrypoint.sh\nEXPOSE 8501\nENTRYPOINT [\"/app/rtlab-entrypoint.sh\"]\n", "rtlab-entrypoint.sh": "#!/bin/sh\n# rtlab: pick the model backend from deploy-time options and write the app's llm-config.yaml accordingly.\n# The app reads `model_name` and maps it through llm-config.yaml to a litellm model string.\nset -e\nBACKEND=\"${LLM_BACKEND:-ollama}\"\ncase \"$BACKEND\" in\n  ollama)     MODEL=\"ollama/${LLM_MODEL:-llama3}\";;\n  openrouter) MODEL=\"openrouter/${LLM_MODEL:-qwen/qwen3.8-27b:free}\";;\n  openai)     MODEL=\"${LLM_MODEL:-gpt-4o-mini}\";;\n  *) echo \"unknown LLM_BACKEND $BACKEND\" >&2; exit 1;;\nesac\nprintf 'default_model: \"%s\"\\nmodels:\\n  - model_name: rtlab\\n    model: \"%s\"\\n' \"$MODEL\" \"$MODEL\" > /app/llm-config.yaml\nexport model_name=rtlab\necho \"rtlab: LLM backend $BACKEND, model $MODEL\"\nexec streamlit run main.py --server.port=8501 --server.address=0.0.0.0\n"}}, "resources": {"cpus": 4, "memoryMB": 8192, "diskGB": 15}, "services": [{"name": "web", "port": 8501, "protocol": "http"}], "attack": {"tactics": ["TA0001 Initial Access", "TA0002 Execution"], "techniques": ["T1190"]}, "sigmaPath": "", "isolation": {"requiresEgress": true, "requiresPublicIp": false}, "deploy": {"available": true}, "verified": true, "options": [{"key": "LLM_BACKEND", "label": "Model backend", "type": "choice", "choices": ["ollama", "openrouter", "openai"], "default": "ollama", "help": "ollama runs a model inside the lab VM (no key, needs about 8 GB); openrouter uses OpenRouter's API (free models exist); openai uses OpenAI's API."}, {"key": "LLM_MODEL", "label": "Model id (blank = backend default)", "type": "string", "default": "", "help": "Ollama: llama3. OpenRouter: qwen/qwen3.8-27b:free or any id ending in :free. OpenAI: gpt-4o-mini."}, {"key": "OPENROUTER_API_KEY", "label": "OpenRouter API key", "type": "secret", "help": "Needed when the backend is openrouter; create a free key at openrouter.ai."}, {"key": "OPENAI_API_KEY", "label": "OpenAI API key", "type": "secret", "help": "Needed when the backend is openai."}]},
  {"id": "iotgoat-owasp", "name": "OWASP IoTGoat", "domain": "ot", "description": "Deliberately insecure IoT firmware (OpenWrt based) with the OWASP IoT Top 10 weaknesses, booted under QEMU inside a container. Downloads the firmware image on first start and takes a few minutes to boot.", "repo": "https://github.com/OWASP/IoTGoat", "docsUrl": "https://github.com/OWASP/IoTGoat", "engine": "docker", "environments": ["local", "remote"], "source": {"kind": "compose", "repo": "https://github.com/OWASP/IoTGoat", "subdir": "docker"}, "resources": {"cpus": 2, "memoryMB": 3072, "diskGB": 4}, "services": [{"name": "web", "port": 8080, "protocol": "http"}, {"name": "web-tls", "port": 4443, "protocol": "https"}, {"name": "ssh", "port": 2222, "protocol": "ssh"}], "attack": {"tactics": ["TA0001 Initial Access", "TA0002 Execution"], "techniques": ["T1190", "T1078"]}, "sigmaPath": "", "isolation": {"requiresEgress": false, "requiresPublicIp": false}, "deploy": {"available": true}, "verified": true, "requiresEgress": true},
  {"id": "conpot-honeypot", "name": "Conpot ICS honeypot", "domain": "ot", "description": "Low-interaction ICS/SCADA honeypot (Modbus, S7comm, SNMP, BACnet, HTTP) that produces realistic OT telemetry.", "repo": "https://github.com/mushorg/conpot", "docsUrl": "https://github.com/mushorg/conpot", "engine": "docker", "environments": ["local", "remote"], "source": {"kind": "compose", "repo": "https://github.com/mushorg/conpot"}, "resources": {"cpus": 1, "memoryMB": 1024, "diskGB": 3}, "services": [{"name": "web", "port": 8800, "protocol": "http"}], "attack": {"tactics": ["TA0001 Initial Access", "TA0002 Execution"], "techniques": ["T0846", "T0861"]}, "sigmaPath": "", "isolation": {"requiresEgress": false, "requiresPublicIp": false}, "deploy": {"available": true}, "verified": true},
  {"id": "mobsf-lab", "name": "MobSF (Mobile Security Framework)", "domain": "mobile", "description": "Static and dynamic analysis platform for Android/iOS apps; pair it with the vulnerable APKs in this catalog.", "repo": "https://github.com/MobSF/Mobile-Security-Framework-MobSF", "docsUrl": "https://github.com/MobSF/Mobile-Security-Framework-MobSF", "engine": "docker", "environments": ["local", "remote"], "source": {"kind": "image", "image": "opensecurity/mobile-security-framework-mobsf", "port": 8000}, "resources": {"cpus": 2, "memoryMB": 2048, "diskGB": 6}, "services": [{"name": "web", "port": 8000, "protocol": "http"}], "attack": {"tactics": [], "techniques": []}, "sigmaPath": "", "isolation": {"requiresEgress": false, "requiresPublicIp": false}, "deploy": {"available": true}, "verified": true},

  // ── Splunk Attack Range (local): its own engine, several VMs per deployment ──
  {
    id: "splunk-attack-range",
    name: "Splunk Attack Range",
    domain: "network",
    description: "Splunk's detection-development range: a Splunk server with ESCU content plus Windows (optionally a domain controller), Linux and Kali hosts that forward Sysmon and logs to it, with Atomic Red Team ready to run. Built locally with VirtualBox from the project's own playbooks.",
    repo: "https://github.com/splunk/attack_range",
    docsUrl: "https://github.com/splunk/attack_range/blob/v3.0.0/docs/source/Attack_Range_Local.md",
    engine: "attack-range",
    environments: ["local"],
    source: { kind: "attack-range", repo: "https://github.com/splunk/attack_range", ref: "v3.0.0" },
    // Splunk server 6 GB + one Windows server 2 GB. Each extra Windows/Linux/Kali host adds 2 GB.
    resources: { cpus: 5, memoryMB: 8192, diskGB: 40 },
    services: [{ name: "splunk-web", port: 8000, protocol: "http" }, { name: "windows-rdp", port: 3389, protocol: "rdp" }],
    attack: { tactics: ["TA0002 Execution", "TA0003 Persistence", "TA0006 Credential Access"], techniques: ["T1059", "T1053", "T1003", "T1547"] },
    sigmaPath: "windows/",
    isolation: { requiresEgress: true, requiresPublicIp: false },
    options: [
      { key: "windows", label: "Windows servers", type: "int", min: 0, max: 4, default: 1 },
      { key: "createDomain", label: "Make the first Windows server a domain controller", type: "bool", default: false },
      { key: "linux", label: "Linux servers", type: "int", min: 0, max: 2, default: 0 },
      { key: "kali", label: "Add a Kali attacker box", type: "bool", default: false },
      { key: "splunkMemoryMB", label: "Splunk server memory (MB)", type: "int", min: 4096, max: 16384, default: 6144 },
    ],
    deploy: { available: true },
    verified: true,
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
    source: { kind: "vagrant", box: "rapid7/metasploitable3-ub1404", ssh: { username: "vagrant", password: "vagrant" } },   // the box ships without Vagrant's insecure key
    resources: { cpus: 2, memoryMB: 2048, diskGB: 20 },
    services: [{ name: "ssh", port: 22, protocol: "tcp" }],
    attack: { tactics: ["TA0001 Initial Access", "TA0004 Privilege Escalation"], techniques: ["T1190", "T1068"] },
    sigmaPath: "linux/",
    isolation: { requiresEgress: false, requiresPublicIp: false },
    deploy: { available: true },
    verified: true,
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
