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

## What's in the catalog

28 entries today, across web/API, CI/CD, Kubernetes, Linux, Active Directory, and
service-level CVEs.

- **Web / API** — Juice Shop, DVWA, WebGoat, VAmPI, crAPI
- **CI/CD** — CI/CD Goat
- **Kubernetes** — Kubernetes Goat *(guided)*
- **Linux / AD** — Metasploitable 3, GOAD *(guided)*
- **Service CVEs** — Apache httpd, Tomcat, Nginx, Struts2, Spring, Log4j, Redis,
  Jenkins, WebLogic, Confluence — by version/CVE, backed by a pinned
  [vulhub](https://github.com/vulhub/vulhub) revision

Each entry carries its **MITRE ATT&CK techniques** and a **Sigma namespace**, so you
know what you're meant to detect before you start.

`auto` = one-command deploy. `guided` = catalogued with prerequisites and steps, but
no automated path yet (e.g. GOAD ships its own multi-VM installer). Run
`rtlab info <id>` to see which, and why.

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
