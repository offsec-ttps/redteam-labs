# rtlab — red-team lab launcher

Pick a vulnerable lab, get it running in seconds — **isolated, host-only bound, and
auto-destroyed at TTL**. Built for detection engineers who need real attack telemetry
to write and test detections against.

```
$ rtlab deploy juice-shop --ttl 4h

  ⚠  OWASP Juice Shop is intentionally vulnerable.
     Run it only on an isolated lab network you are authorized to use.

▸ Deploying OWASP Juice Shop (docker · bind 10.0.1.1)
  ✓ OWASP Juice Shop is up
  web          http://10.0.1.1:3001
  id juice-shop-i8xd1h   ttl 4h (expires 4h)
```

Zero dependencies — Node 20+ built-ins only. No daemon, no account, no config file.

---

## Why this exists

Writing a detection and knowing it fires are two different jobs. To validate a rule
you need a target that actually produces the telemetry — which usually means an
afternoon of lab plumbing. `rtlab` collapses that to one command, and makes the
safety properties the default rather than an afterthought.

## Safety model

These labs are **deliberately exploitable**. The defaults reflect that:

| Guarantee | How |
| --- | --- |
| **Never published on `0.0.0.0`** | Every port is bound to one private address (a hypervisor host-only interface by preference). `--bind 0.0.0.0` is refused outright. |
| **Optional egress denial** | `--no-egress` attaches the lab to an `internal` Docker network. No port is published at all; you reach it at its container IP, from this host only. |
| **Nothing outlives the exercise** | Default `--ttl 4h`. `rtlab reap` destroys anything past its TTL — run it from cron. |
| **Disk guard** | Refuses to deploy below 10 GB free (`RTLAB_MIN_FREE_GB`). |
| **No exploit code shipped** | `rtlab` orchestrates public upstream lab projects (`git clone`, `docker compose`, Vagrant boxes) and pins its CVE corpus. It authors no payloads. |

You are responsible for running these only on infrastructure you are authorized to use.

## Install

```bash
git clone https://github.com/offsec-ttps/redteam-labs
cd redteam-labs
./bin/rtlab.mjs doctor          # or: npm link  → then `rtlab` anywhere
```

Requires Node ≥ 20. Docker + Compose for container labs; Vagrant + VirtualBox for VM labs.
`rtlab doctor` tells you exactly what's missing and which addresses you can bind to.

### Where labs are stored

Lab clones, the vulhub cache and Vagrant box images all live under one root, resolved
in this order:

| Precedence | Source | Use it for |
| --- | --- | --- |
| 1 | `RTLAB_HOME` env var | one-off override |
| 2 | `rtlab.config.json` → `{ "home": "…" }` | the persistent setting |
| 3 | `~/.rtlab` | portable default |

Box images are multi-GB, so `rtlab` also pins **Vagrant's own cache** (`VAGRANT_HOME`)
inside this root — otherwise Vagrant would fill `~/.vagrant.d` regardless of where the
labs live. Set it once if your home partition is small:

```json
{ "home": "/mnt/big-disk/.rtlab" }
```

`rtlab doctor` prints the resolved root, which source it came from, and free space.

> **Container images are the one exception.** Docker stores images under its daemon's
> `data-root` (usually `/var/lib/docker`), which `rtlab` cannot relocate per-run —
> `doctor` reports that filesystem separately and warns when it is too full to pull.
> Move it via the Docker daemon's `data-root` setting if needed.

## Usage

```bash
# Browse
rtlab list                        # everything
rtlab list --domain web           # web · cicd · k8s · linux · ad · service-cve
rtlab search graphql
rtlab info juice-shop

# Deploy
rtlab deploy juice-shop --ttl 4h
rtlab deploy dvwa --bind 10.0.1.1 --no-egress
rtlab deploy webgoat --dry-run    # show the plan, download nothing

# Service-level CVE labs (pick an app + version/CVE)
rtlab services list               # all
rtlab services list tomcat
rtlab services deploy httpd@CVE-2021-41773

# Manage
rtlab status
rtlab logs <id> --follow
rtlab stop <id>   ·   rtlab start <id>
rtlab destroy <id>   ·   rtlab destroy --all --yes
rtlab reap                        # destroy expired labs (cron this)

# Interactive
rtlab run
```

Add `--json` to any read command for scripting.

## Cloud labs — rtlab plans, you approve the spend

Cloud labs (AWSGoat, Sadcloud, CloudFoxable, TerraGoat…) are different in two ways
that rule out a one-command deploy: they create **billable resources in your own
account**, and they expose **public endpoints by design**, so the private-bind
isolation used elsewhere cannot apply.

So `rtlab` does everything up to the irreversible step — verifies your credentials,
clones the lab, runs `terraform init` and a full `terraform plan` (free, creates
nothing) — then hands you the exact `apply` command:

```bash
rtlab creds                 # which providers are configured, and as whom
rtlab deploy awsgoat        # verify → clone → init → plan (no resources created)
# review the plan, then run the command it prints:
#   cd <lab>/src/terraform && terraform apply rtlab.tfplan
```

**`rtlab` never runs `apply` or `destroy` for you.** Cloud spend stays a human
decision, and a silently-failed destroy would leave resources billing forever.
`rtlab destroy` refuses to delete a lab's directory while Terraform state still
holds resources — deleting that state would orphan them.

### Credentials

Supply them however you already do; `rtlab` reads them at call time and **never
stores or prints values** — only the identity they resolve to (so you can confirm
*which* account is about to be billed).

| Source | Precedence |
| --- | --- |
| Standard provider env vars (`AWS_ACCESS_KEY_ID`, `ARM_CLIENT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `AWS_PROFILE`, …) | highest |
| `rtlab.creds.json` next to the install — **gitignored** | fallback |

```json
{ "aws": { "AWS_ACCESS_KEY_ID": "…", "AWS_SECRET_ACCESS_KEY": "…", "AWS_REGION": "us-east-1" } }
```

`rtlab creds` validates each provider against its own CLI (`aws sts
get-caller-identity`, `az account show`, `gcloud config get-value project`) and
reports the resolved account. A cloud deploy refuses to start if credentials are
missing or rejected — before anything is cloned.

> Use a **throwaway cloud account** with a spending limit. These labs are designed
> to be exploitable and publicly reachable.

## Lab catalog

**28 labs across 6 categories.** Every entry carries its **MITRE ATT&CK techniques** and a **Sigma namespace**, so you know what you are meant to detect before you start.

<!-- CATALOG:START -->

### At a glance

| Category | `--domain` | Labs | Auto-deploy | Guided | Engine |
| --- | --- | :---: | :---: | :---: | --- |
| Cloud Security | `cloud` | 13 | 3 | 10 | terraform |
| Kubernetes &amp; Containers | `k8s` | 17 | 0 | 17 | k8s |
| Web &amp; API | `web` | 18 | 5 | 13 | docker |
| LLM / GenAI / MCP | `llm` | 20 | 0 | 20 | docker |
| Active Directory / Windows | `ad` | 20 | 0 | 20 | terraform, vm |
| Linux / Endpoint | `linux` | 13 | 1 | 12 | docker, vm |
| CI/CD &amp; Supply Chain | `cicd` | 17 | 1 | 16 | docker, terraform |
| IaC / Terraform / Policy as Code | `iac` | 11 | 1 | 10 | docker, terraform |
| Mobile Application | `mobile` | 9 | 0 | 9 | manual |
| Network / PCAP | `network` | 19 | 0 | 19 | manual |
| Identity / IAM | `identity` | 12 | 0 | 12 | docker, terraform |
| IoT / OT / ICS | `ot` | 12 | 0 | 12 | manual |
| Service-Level CVE Labs | `service-cve` | 18 | 18 | 0 | docker |
| **Total** | | **199** | **29** | **170** | |

`auto` = one-command deploy · `guided` = catalogued with prerequisites and steps, but no automated path yet (run `rtlab info <id>` for the reason).

### Cloud Security &nbsp;<sub>`rtlab list --domain cloud`</sub>

Deliberately vulnerable cloud estates. These run in **your own account**, cost real money and expose public endpoints — `rtlab` plans them for free and hands you the apply command.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **AWSGoat** | `awsgoat` | `auto` | terraform | — | _cloud_ | `T1190`, `T1078`, `T1552` |
| **CloudFoxable** | `cloudfoxable` | `auto` | terraform | — | _cloud_ | `T1526`, `T1552` |
| **Sadcloud** | `sadcloud` | `auto` | terraform | — | _cloud_ | `T1578`, `T1526` |
| **AzureGoat** | `azuregoat` | `guided` | terraform | — | _cloud_ | — |
| **CloudGoat** | `cloudgoat` | `guided` | terraform | — | _cloud_ | — |
| **CloudSecList Labs** | `cloudseclist-labs` | `guided` | terraform | — | _cloud_ | — |
| **DVCA** | `dvca` | `guided` | terraform | — | _cloud_ | — |
| **EKS Goat (OWASP)** | `eks-goat-owasp` | `guided` | terraform | — | _cloud_ | — |
| **EntraGoat** | `entragoat` | `guided` | terraform | — | _cloud_ | `T1098` |
| **GCPGoat** | `gcpgoat` | `guided` | terraform | — | _cloud_ | — |
| **GitHub Actions Goat** | `github-actions-goat` | `guided` | terraform | — | _cloud_ | — |
| **Hacking The Cloud** | `hacking-the-cloud` | `guided` | terraform | — | _cloud_ | — |
| **SANS Cloud Security Workshop** | `sans-cloud-security-workshop` | `guided` | terraform | — | _cloud_ | — |

### Kubernetes &amp; Containers &nbsp;<sub>`rtlab list --domain k8s`</sub>

Cluster misconfiguration, container escape and RBAC abuse. Pair with Falco/Tetragon for runtime telemetry.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **CKA-CKS Mastery** | `cka-cks-mastery` | `guided` | k8s | — | — | — |
| **CKS Challenge** | `cks-challenge` | `guided` | k8s | — | — | — |
| **Container Attack Demo** | `container-attack-demo` | `guided` | k8s | — | — | — |
| **Container Security Lab** | `container-security-lab` | `guided` | k8s | — | — | — |
| **Docker Attack Platform** | `docker-attack-platform` | `guided` | k8s | — | — | — |
| **DVCC** | `dvcc` | `guided` | k8s | — | — | — |
| **Falco CTF** | `falco-ctf` | `guided` | k8s | — | — | — |
| **K8s Security Lab** | `k8s-security-lab` | `guided` | k8s | — | — | — |
| **Kubernetes Goat** | `kubernetes-goat` | `guided` | k8s | 1234 | 4 vCPU · 8 GB | `T1611`, `T1613`, `T1525`, `T1610`, `T1609` |
| **Kubescape Hippo** | `kubescape-hippo` | `guided` | k8s | — | — | — |
| **KubeSecurity Lab** | `kubesecurity-lab` | `guided` | k8s | — | — | — |
| **Kubestriker Lab** | `kubestriker-lab` | `guided` | k8s | — | — | — |
| **Kyverno Policy Lab** | `kyverno-policy-lab` | `guided` | k8s | — | — | — |
| **Misconfig-Kubernetes** | `misconfig-kubernetes` | `guided` | k8s | — | — | — |
| **Polaris Playground** | `polaris-playground` | `guided` | k8s | — | — | — |
| **Tetragon Lab** | `tetragon-lab` | `guided` | k8s | — | — | — |
| **Tracee Sample Lab** | `tracee-sample-lab` | `guided` | k8s | — | — | — |

### Web &amp; API &nbsp;<sub>`rtlab list --domain web`</sub>

OWASP-style application and API targets — the fastest path from exploit to detection.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **DVWA (Damn Vulnerable Web Application)** | `dvwa` | `auto` | docker | 80 | 1 vCPU · 1 GB | `T1190`, `T1059`, `T1078` |
| **OWASP crAPI** | `crapi` | `auto` | docker | 8888 | 2 vCPU · 4 GB | `T1190`, `T1059` |
| **OWASP Juice Shop** | `juice-shop` | `auto` | docker | 3000 | 1 vCPU · 1 GB | `T1190`, `T1071`, `T1505` |
| **OWASP WebGoat** | `webgoat` | `auto` | docker | 8080 | 2 vCPU · 2 GB | `T1190`, `T1059` |
| **VAmPI (Vulnerable API)** | `vampi` | `auto` | docker | 5000 | 1 vCPU · 0.5 GB | `T1190` |
| **API Sec Lab (Checkmarx)** | `api-sec-lab-checkmarx` | `guided` | docker | — | — | — |
| **BuggyBank** | `buggybank` | `guided` | docker | — | — | — |
| **DVGA (Damn Vulnerable GraphQL App)** | `dvga` | `guided` | docker | 5013 | 1 vCPU · 0.5 GB | `T1592`, `T1190` |
| **DVNA** | `dvna` | `guided` | docker | — | — | — |
| **DVTA** | `dvta` | `guided` | docker | — | — | — |
| **DVWS-node** | `dvws-node` | `guided` | docker | — | — | — |
| **Mutillidae** | `mutillidae` | `guided` | docker | — | — | — |
| **OWASP NodeGoat** | `owasp-nodegoat` | `guided` | docker | — | — | — |
| **OWASP PyGoat** | `owasp-pygoat` | `guided` | docker | — | — | — |
| **OWASP RailsGoat** | `owasp-railsgoat` | `guided` | docker | — | — | — |
| **OWASP Security Shepherd** | `owasp-security-shepherd` | `guided` | docker | — | — | — |
| **PortSwigger Web Security Academy** | `portswigger-web-security-academy` | `guided` | docker | — | — | — |
| **XVWA** | `xvwa` | `guided` | docker | — | — | — |

### LLM / GenAI / MCP &nbsp;<sub>`rtlab list --domain llm`</sub>

Prompt injection, insecure output handling, MCP and agent abuse (OWASP LLM Top 10).

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **AgenticSecurity** | `agenticsecurity` | `guided` | docker | — | — | — |
| **AI Village CTF** | `ai-village-ctf` | `guided` | docker | — | — | — |
| **Anthropic Red Team Suite** | `anthropic-red-team-suite` | `guided` | docker | — | — | — |
| **Damn Vulnerable LLM Agent** | `damn-vulnerable-llm-agent` | `guided` | docker | — | — | — |
| **Damn Vulnerable MCP** | `damn-vulnerable-mcp` | `guided` | docker | — | — | — |
| **Garak** | `garak` | `guided` | docker | — | — | — |
| **Inspector MCP** | `inspector-mcp` | `guided` | docker | — | — | — |
| **Invariant Labs MCP Tests** | `invariant-labs-mcp-tests` | `guided` | docker | — | — | — |
| **Lakera Gandalf** | `lakera-gandalf` | `guided` | docker | — | — | — |
| **LLMCTF** | `llmctf` | `guided` | docker | — | — | — |
| **LLMGoat** | `llmgoat` | `guided` | docker | — | — | — |
| **MCP-Goat** | `mcp-goat` | `guided` | docker | — | — | — |
| **MCPScan Playground** | `mcpscan-playground` | `guided` | docker | — | — | — |
| **Nagini** | `nagini` | `guided` | docker | — | — | — |
| **OWASP Agentic LLM Top 10** | `owasp-agentic-llm-top-10` | `guided` | docker | — | — | — |
| **OWASP LLM Top10 Demo** | `owasp-llm-top10-demo` | `guided` | docker | — | — | — |
| **Pacu-LLM** | `pacu-llm` | `guided` | docker | — | — | — |
| **Promptfoo** | `promptfoo` | `guided` | docker | — | — | — |
| **PyRIT (Microsoft)** | `pyrit-microsoft` | `guided` | docker | — | — | — |
| **Tensor Trust** | `tensor-trust` | `guided` | docker | — | — | — |

### Active Directory / Windows &nbsp;<sub>`rtlab list --domain ad`</sub>

Vulnerable AD forests — the richest source of Windows attack telemetry.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **AutomatedLab** | `automatedlab` | `guided` | vm | — | — | — |
| **Azure Sentinel Lab** | `azure-sentinel-lab` | `guided` | terraform | — | _cloud_ | — |
| **BlackHills AD Lab** | `blackhills-ad-lab` | `guided` | vm | — | — | — |
| **DAFT** | `daft` | `guided` | vm | — | — | — |
| **DetectionLab** | `detectionlab` | `guided` | vm | — | — | — |
| **Elastic Detection Lab** | `elastic-detection-lab` | `guided` | vm | — | — | — |
| **GOAD (Game of Active Directory)** | `goad` | `guided` | vm | 3389 | 8 vCPU · 24 GB | `T1003`, `T1068`, `T1071`, `T1486`, `T1055` |
| **HackTheBox Pro Labs** | `hackthebox-pro-labs` | `guided` | terraform | — | _cloud_ | — |
| **Invoke-ADLabDeployer** | `invoke-adlabdeployer` | `guided` | vm | — | — | — |
| **King of the Hill** | `king-of-the-hill` | `guided` | vm | — | — | — |
| **LabBuilder** | `labbuilder` | `guided` | vm | — | — | — |
| **Malware Lab** | `malware-lab` | `guided` | vm | — | — | — |
| **PoshC2 Lab** | `poshc2-lab` | `guided` | vm | — | — | — |
| **Purple Knight (Semperis)** | `purple-knight-semperis` | `guided` | vm | — | — | — |
| **SOC Fortress** | `soc-fortress` | `guided` | vm | — | — | — |
| **Splunk Attack Range** | `splunk-attack-range` | `guided` | vm | — | — | — |
| **TCM PEH Lab** | `tcm-peh-lab` | `guided` | vm | — | — | — |
| **VulnAD** | `vulnad` | `guided` | vm | — | — | — |
| **Vulnerable AD** | `vulnerable-ad` | `guided` | vm | — | — | — |
| **WinPilot** | `winpilot` | `guided` | vm | — | — | — |

### Linux / Endpoint &nbsp;<sub>`rtlab list --domain linux`</sub>

Host-level exploitation and privilege escalation with rich endpoint telemetry.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **Metasploitable 3 (Ubuntu 14.04)** | `metasploitable3-ub1404` | `auto` | vm | 22 | 2 vCPU · 2 GB | `T1190`, `T1068` |
| **Auditd Lab** | `auditd-lab` | `guided` | docker | — | — | — |
| **Damn Vulnerable Linux** | `damn-vulnerable-linux` | `guided` | docker | — | — | — |
| **Falco Playground** | `falco-playground` | `guided` | docker | — | — | — |
| **Linux PrivEsc Arena** | `linux-privesc-arena` | `guided` | docker | — | — | — |
| **LinuxFortress** | `linuxfortress` | `guided` | docker | — | — | — |
| **OverTheWire** | `overthewire` | `guided` | docker | — | — | — |
| **SELinux Playground** | `selinux-playground` | `guided` | docker | — | — | — |
| **Sysmon for Linux** | `sysmon-for-linux` | `guided` | docker | — | — | — |
| **TCM Linux Priv-Esc** | `tcm-linux-priv-esc` | `guided` | docker | — | — | — |
| **TryHackMe Linux PrivEsc** | `tryhackme-linux-privesc` | `guided` | docker | — | — | — |
| **VulnHub Images** | `vulnhub-images` | `guided` | docker | — | — | — |
| **Wazuh Agent Lab** | `wazuh-agent-lab` | `guided` | docker | — | — | — |

### CI/CD &amp; Supply Chain &nbsp;<sub>`rtlab list --domain cicd`</sub>

Pipeline and supply-chain attack paths (Jenkins, GitLab, Gitea, GitHub Actions).

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **CI/CD Goat** | `cicd-goat` | `auto` | docker | 8080 | 4 vCPU · 8 GB | `T1195`, `T1059.004` |
| **Argo Goat** | `argo-goat` | `guided` | docker | — | — | — |
| **CI Tests (Chainguard)** | `ci-tests-chainguard` | `guided` | docker | — | — | — |
| **CNCF Supply Chain Lab** | `cncf-supply-chain-lab` | `guided` | docker | — | — | — |
| **Dependency-Track Demo** | `dependency-track-demo` | `guided` | docker | — | — | — |
| **GitLab CICD Goat** | `gitlab-cicd-goat` | `guided` | terraform | — | _cloud_ | — |
| **Grype Lab** | `grype-lab` | `guided` | docker | — | — | — |
| **HelmGoat** | `helmgoat` | `guided` | docker | — | — | — |
| **Jenkins Goat** | `jenkins-goat` | `guided` | docker | — | — | — |
| **OSV-Scanner Tests** | `osv-scanner-tests` | `guided` | docker | — | — | — |
| **SBOM Lab (Anchore)** | `sbom-lab-anchore` | `guided` | docker | — | — | — |
| **Secure Workflows** | `secure-workflows` | `guided` | docker | — | — | — |
| **Sigstore Playground** | `sigstore-playground` | `guided` | docker | — | — | — |
| **SLSA Playground** | `slsa-playground` | `guided` | terraform | — | _cloud_ | — |
| **Syft Lab** | `syft-lab` | `guided` | docker | — | — | — |
| **Tekton Goat** | `tekton-goat` | `guided` | docker | — | — | — |
| **Trivy Vuln Lab** | `trivy-vuln-lab` | `guided` | docker | — | — | — |

### IaC / Terraform / Policy as Code &nbsp;<sub>`rtlab list --domain iac`</sub>

Misconfigured infrastructure-as-code — the reference targets for IaC scanning and drift detection.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **TerraGoat** | `terragoat` | `auto` | terraform | — | _cloud_ | `T1578` |
| **Audit Kubernetes** | `audit-kubernetes` | `guided` | docker | — | — | — |
| **CFNgoat** | `cfngoat` | `guided` | terraform | — | _cloud_ | — |
| **Checkov Playground** | `checkov-playground` | `guided` | docker | — | — | — |
| **Conftest Playground** | `conftest-playground` | `guided` | docker | — | — | — |
| **K8sGoat (IaC)** | `k8sgoat-iac` | `guided` | docker | — | — | — |
| **KICS Playground** | `kics-playground` | `guided` | docker | — | — | — |
| **OPA Playground** | `opa-playground` | `guided` | docker | — | — | — |
| **PACPro Play** | `pacpro-play` | `guided` | docker | — | — | — |
| **Regula Lab** | `regula-lab` | `guided` | docker | — | — | — |
| **Terrascan Playground** | `terrascan-playground` | `guided` | docker | — | — | — |

### Mobile Application &nbsp;<sub>`rtlab list --domain mobile`</sub>

Vulnerable Android/iOS applications for mobile app security testing.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **AndroGoat** | `androgoat` | `guided` | manual | — | — | — |
| **Damn Vulnerable iOS App** | `damn-vulnerable-ios-app` | `guided` | manual | — | — | — |
| **DIVA Android** | `diva-android` | `guided` | manual | — | — | — |
| **DVHMA** | `dvhma` | `guided` | manual | — | — | — |
| **InjuredAndroid** | `injuredandroid` | `guided` | manual | — | — | — |
| **MobSF Lab** | `mobsf-lab` | `guided` | manual | — | — | — |
| **MSTG Hacking Playground** | `mstg-hacking-playground` | `guided` | manual | — | — | — |
| **OWASP iGoat** | `owasp-igoat` | `guided` | manual | — | — | — |
| **OWASP MSTG Vulnerable Apps** | `owasp-mstg-vulnerable-apps` | `guided` | manual | — | — | — |

### Network / PCAP &nbsp;<sub>`rtlab list --domain network`</sub>

Traffic, PCAP and network-detection labs (Zeek, Suricata, Arkime).

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **Arkime (Moloch) Lab** | `arkime-moloch-lab` | `guided` | manual | — | — | — |
| **BLUESPAWN** | `bluespawn` | `guided` | manual | — | — | — |
| **CyberDefenders CTFs** | `cyberdefenders-ctfs` | `guided` | manual | — | — | — |
| **LetsDefend.io** | `letsdefend-io` | `guided` | manual | — | — | — |
| **Malware Traffic Analysis** | `malware-traffic-analysis` | `guided` | manual | — | — | — |
| **Mordor (Forge)** | `mordor-forge` | `guided` | manual | — | — | — |
| **Mordor Datasets** | `mordor-datasets` | `guided` | manual | — | — | — |
| **NetRESec Samples** | `netresec-samples` | `guided` | manual | — | — | — |
| **PCAP Files Collection** | `pcap-files-collection` | `guided` | manual | — | — | — |
| **PCAP Labs** | `pcap-labs` | `guided` | manual | — | — | — |
| **SigmaHQ Ruleset** | `sigmahq-ruleset` | `guided` | manual | — | — | — |
| **Splunk BOTS v2** | `splunk-bots-v2` | `guided` | manual | — | — | — |
| **Splunk BOTS v3** | `splunk-bots-v3` | `guided` | manual | — | — | — |
| **Stenographer Lab** | `stenographer-lab` | `guided` | manual | — | — | — |
| **Suricata Playground** | `suricata-playground` | `guided` | manual | — | — | — |
| **ThreatHunter Playbook** | `threathunter-playbook` | `guided` | manual | — | — | — |
| **TryHackMe SOC** | `tryhackme-soc` | `guided` | manual | — | — | — |
| **Wireshark Sample Captures** | `wireshark-sample-captures` | `guided` | manual | — | — | — |
| **Zeek Security Repo** | `zeek-security-repo` | `guided` | manual | — | — | — |

### Identity / IAM &nbsp;<sub>`rtlab list --domain identity`</sub>

Identity provider, SSO, OAuth and IAM attack paths.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **AADInternals** | `aadinternals` | `guided` | terraform | — | _cloud_ | — |
| **BARK Lab** | `bark-lab` | `guided` | docker | — | — | — |
| **BloodHound CE** | `bloodhound-ce` | `guided` | docker | — | — | — |
| **EntraAttack** | `entraattack` | `guided` | docker | — | — | — |
| **Keycloak Goat** | `keycloak-goat` | `guided` | docker | — | — | — |
| **LabForge AD Playground** | `labforge-ad-playground` | `guided` | docker | — | — | — |
| **Munchhausen (CS Lab)** | `munchhausen-cs-lab` | `guided` | terraform | — | _cloud_ | — |
| **OIDC Lab** | `oidc-lab` | `guided` | docker | — | — | — |
| **Okta Auth Lab** | `okta-auth-lab` | `guided` | docker | — | — | — |
| **PingCastle Lab** | `pingcastle-lab` | `guided` | docker | — | — | — |
| **ROADtools Lab** | `roadtools-lab` | `guided` | docker | — | — | — |
| **StormSpotter** | `stormspotter` | `guided` | terraform | — | _cloud_ | — |

### IoT / OT / ICS &nbsp;<sub>`rtlab list --domain ot`</sub>

Industrial control, PLC and IoT protocol labs.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **Conpot Honeypot** | `conpot-honeypot` | `guided` | manual | — | — | — |
| **CymiLab** | `cymilab` | `guided` | manual | — | — | — |
| **Damn Vulnerable Chemical Process** | `damn-vulnerable-chemical-process` | `guided` | manual | — | — | — |
| **Damn Vulnerable PLC** | `damn-vulnerable-plc` | `guided` | manual | — | — | — |
| **DVRF (Router Firmware)** | `dvrf-router-firmware` | `guided` | manual | — | — | — |
| **Firmware Slap** | `firmware-slap` | `guided` | manual | — | — | — |
| **ICS Security Testbeds** | `ics-security-testbeds` | `guided` | manual | — | — | — |
| **IoT Lab** | `iot-lab` | `guided` | manual | — | — | — |
| **IoTGoat (OWASP)** | `iotgoat-owasp` | `guided` | manual | — | — | — |
| **MiniCPS3** | `minicps3` | `guided` | manual | — | — | — |
| **Redpoint (DigitalBond)** | `redpoint-digitalbond` | `guided` | manual | — | — | — |
| **T-Pot Honeypot** | `t-pot-honeypot` | `guided` | manual | — | — | — |

### Service-Level CVE Labs &nbsp;<sub>`rtlab list --domain service-cve`</sub>

One application, one version, one CVE — isolated and disposable. Backed by a pinned [vulhub](https://github.com/vulhub/vulhub) revision.

```bash
rtlab services list                          # every app + CVE
rtlab services list tomcat                   # one app
rtlab services deploy httpd@CVE-2021-41773   # deploy one
```

| Application | `id` | Affected version | Severity | Vulnerability | ATT&CK |
| --- | --- | --- | :---: | --- | --- |
| Atlassian Confluence | `confluence@CVE-2022-26134` | <7.18.1 | **critical** | OGNL injection → unauthenticated RCE | `T1190`, `T1059` |
| Apache HTTP Server | `httpd@CVE-2017-15715` | 2.4.0–2.4.29 | high | Newline in filename bypasses upload filters | `T1190`, `T1505.003` |
| Apache HTTP Server | `httpd@CVE-2021-41773` | 2.4.49 | **critical** | Path traversal / RCE via mod_cgi | `T1190` |
| Apache HTTP Server | `httpd@CVE-2021-42013` | 2.4.50 | **critical** | Path traversal (2.4.50 bypass of the 41773 fix) | `T1190` |
| Jenkins | `jenkins@CVE-2018-1000861` | ≤2.153 | **critical** | Unauthenticated RCE via stapler routing | `T1190`, `T1059` |
| Apache Log4j | `log4j@CVE-2021-44228` | 2.0–2.14.1 | **critical** | Log4Shell — JNDI lookup RCE | `T1190`, `T1059` |
| Nginx | `nginx@CVE-2013-4547` | 0.8.41–1.5.6 | medium | Space-in-URI parsing flaw bypasses restrictions | `T1190` |
| Nginx | `nginx@insecure-config` | any (misconfig) | medium | Off-by-slash alias traversal | `T1190` |
| Redis | `redis@CVE-2022-0543` | Debian/Ubuntu builds | **critical** | Lua sandbox escape → RCE | `T1190`, `T1059` |
| Redis | `redis@unauth` | any (misconfig) | high | Unauthenticated access | `T1078` |
| Spring Framework | `spring@CVE-2022-22947` | 3.1.0 | **critical** | Spring Cloud Gateway SpEL RCE | `T1190`, `T1059` |
| Spring Framework | `spring@CVE-2022-22965` | ≤5.3.17 | **critical** | Spring4Shell — data-binding RCE | `T1190`, `T1059` |
| Apache Struts 2 | `struts2@S2-046` | 2.3.x | **critical** | OGNL RCE via multipart Content-Disposition | `T1190`, `T1059` |
| Apache Struts 2 | `struts2@S2-053` | 2.0.0–2.3.33 | **critical** | OGNL RCE via Freemarker tag | `T1190`, `T1059` |
| Apache Tomcat | `tomcat@CVE-2017-12615` | 7.0.x | high | RCE via HTTP PUT (readonly=false) | `T1190`, `T1505.003` |
| Apache Tomcat | `tomcat@CVE-2020-1938` | 6/7/8/9 | **critical** | Ghostcat — AJP file read / inclusion | `T1190` |
| Apache Tomcat | `tomcat@weak-password` | 8.x | high | Manager deployed with weak credentials → WAR upload | `T1078`, `T1505.003` |
| Oracle WebLogic | `weblogic@CVE-2017-10271` | 10.3.6 / 12.x | **critical** | XMLDecoder deserialization RCE | `T1190`, `T1059` |

<!-- CATALOG:END -->

## Honest status

- **Docker engine:** validated end to end — deploy, isolation assertions, egress
  denial, stop/start, logs, TTL reap, destroy.
- **Vagrant engine:** implemented and validated via `--dry-run` (renders a correct
  Vagrantfile with a host-only network). A live multi-GB box pull hasn't been run
  yet, so VM entries are marked `verified: false`.
- **Terraform engine:** plan-only by design (see above). Credential resolution and
  the refuse-without-credentials guard are validated; `init`/`plan` against a real
  cloud account has not been run here, because that needs live credentials.
- **The 170 `guided` labs** come from the research catalogue and are **catalogued,
  not verified** — each carries its upstream repo and prerequisites. Promoting one
  to `auto` means adding it to `src/catalog/labs.mjs` with a working source, which
  then overrides the imported entry.
- `verified: false` on a catalog entry means nobody has run it end to end yet. When
  a lab starts but its port never answers, `rtlab` inspects the container's
  listening sockets and tells you *why* — e.g. *"the app inside is listening on
  127.0.0.1, not 0.0.0.0"* — rather than just timing out.

## Integration

`rtlab catalog --json` is a stable contract. Field names match the `VulnLabEntry`
shape used by [DetectOps](https://github.com/offsec-ttps/DetectOps-Platform), so the
platform can consume this catalog with no mapping layer. The engines
(`src/engines/*.mjs`) are pure `(entry, opts) → result` functions with no CLI
coupling, so they can be wrapped directly by a server.

## Roadmap

Cloud engine (Terraform: AWSGoat/CloudGoat) · Kubernetes engine (kind/minikube) ·
automatic Splunk/Elastic log forwarding (`--hec`) · more verified VM labs ·
catalog generated from the full 212-lab research set.

## License

MIT. The labs themselves are third-party projects under their own licenses.
