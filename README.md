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

> **Small `$HOME` partition?** Labs are stored in `~/.rtlab`. Point it at a bigger
> disk with `export RTLAB_HOME=/path/to/disk/.rtlab`.

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

## Lab catalog

**28 labs across 6 categories.** Every entry carries its **MITRE ATT&CK techniques** and a **Sigma namespace**, so you know what you are meant to detect before you start.

<!-- CATALOG:START -->

### At a glance

| Category | `--domain` | Labs | Auto-deploy | Guided | Engine |
| --- | --- | :---: | :---: | :---: | --- |
| Web &amp; API | `web` | 6 | 5 | 1 | docker |
| CI/CD &amp; Supply Chain | `cicd` | 1 | 1 | 0 | docker |
| Kubernetes &amp; Containers | `k8s` | 1 | 0 | 1 | k8s |
| Linux / Endpoint | `linux` | 1 | 1 | 0 | vm |
| Active Directory / Windows | `ad` | 1 | 0 | 1 | vm |
| Service-Level CVE Labs | `service-cve` | 18 | 18 | 0 | docker |
| **Total** | | **28** | **25** | **3** | |

`auto` = one-command deploy · `guided` = catalogued with prerequisites and steps, but no automated path yet (run `rtlab info <id>` for the reason).

### Web &amp; API &nbsp;<sub>`rtlab list --domain web`</sub>

OWASP-style application and API targets — the fastest path from exploit to detection.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **DVWA (Damn Vulnerable Web Application)** | `dvwa` | `auto` | docker | 80 | 1 vCPU · 1 GB | `T1190`, `T1059`, `T1078` |
| **OWASP crAPI** | `crapi` | `auto` | docker | 8888 | 2 vCPU · 4 GB | `T1190`, `T1059` |
| **OWASP Juice Shop** | `juice-shop` | `auto` | docker | 3000 | 1 vCPU · 1 GB | `T1190`, `T1071`, `T1505` |
| **OWASP WebGoat** | `webgoat` | `auto` | docker | 8080 | 2 vCPU · 2 GB | `T1190`, `T1059` |
| **VAmPI (Vulnerable API)** | `vampi` | `auto` | docker | 5000 | 1 vCPU · 0.5 GB | `T1190` |
| **DVGA (Damn Vulnerable GraphQL App)** | `dvga` | `guided` | docker | 5013 | 1 vCPU · 0.5 GB | `T1592`, `T1190` |

### CI/CD &amp; Supply Chain &nbsp;<sub>`rtlab list --domain cicd`</sub>

Pipeline and supply-chain attack paths (Jenkins, GitLab, Gitea).

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **CI/CD Goat** | `cicd-goat` | `auto` | docker | 8080 | 4 vCPU · 8 GB | `T1195`, `T1059.004` |

### Kubernetes &amp; Containers &nbsp;<sub>`rtlab list --domain k8s`</sub>

Cluster misconfiguration, container escape and RBAC abuse. Pair with Falco/Tetragon for runtime telemetry.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **Kubernetes Goat** | `kubernetes-goat` | `guided` | k8s | 1234 | 4 vCPU · 8 GB | `T1611`, `T1613`, `T1525`, `T1610`, `T1609` |

### Linux / Endpoint &nbsp;<sub>`rtlab list --domain linux`</sub>

Host-level exploitation and privilege escalation with rich endpoint telemetry.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **Metasploitable 3 (Ubuntu 14.04)** | `metasploitable3-ub1404` | `auto` | vm | 22 | 2 vCPU · 2 GB | `T1190`, `T1068` |

### Active Directory / Windows &nbsp;<sub>`rtlab list --domain ad`</sub>

Vulnerable AD forests — the richest source of Windows attack telemetry.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **GOAD (Game of Active Directory)** | `goad` | `guided` | vm | 3389 | 8 vCPU · 24 GB | `T1003`, `T1068`, `T1071`, `T1486`, `T1055` |

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
