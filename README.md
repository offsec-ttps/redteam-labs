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

**One line (runner hosts).** Downloads the CLI and puts `rtlab` on your PATH — no git, no `npm install` (it has zero npm dependencies):

```bash
# Linux / macOS
curl -fsSL https://labs.rusecure.in/install.sh | sh      # or: wget -qO- https://labs.rusecure.in/install.sh | sh
```

```powershell
# Windows (PowerShell)
irm https://labs.rusecure.in/install.ps1 | iex
```

**From source (development).**

```bash
git clone https://github.com/offsec-ttps/redteam-labs
cd redteam-labs
./bin/rtlab.mjs doctor          # or: npm link  → then `rtlab` anywhere
```

Requires Node ≥ 20. Docker + Compose for container labs; Vagrant + VirtualBox for VM labs.
`rtlab doctor` tells you exactly what's missing and which addresses you can bind to.

> The installer just fetches this repo's source tree and writes a `rtlab` launcher
> (`~/.local/bin/rtlab` on Linux/macOS, `%LOCALAPPDATA%\Programs\rtlab\rtlab.cmd` on
> Windows). Point it elsewhere with `RTLAB_REPO`, `RTLAB_REF`, `RTLAB_INSTALL_DIR`,
> `RTLAB_BIN_DIR`. The control plane serves these scripts at `/install.sh` and
> `/install.ps1`, so the Runners page can show the one-liner for your own domain.

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
{ "home": "/path/to/big-disk/redteam-labs/.rtlab" }
```

Keep the store **beside this tool**, not inside another project: a `git clean -xfd`
in that project would delete the whole store, since it would be an ignored directory
there. The default `.rtlab/` here is gitignored, so runtime state never shows up in
`git status`.

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

# Labs that take options (a model backend, an API key); `rtlab info <id>` lists what a lab accepts
rtlab deploy damn-vulnerable-llm-agent                                                      # bundled Ollama, llama3, no key
rtlab deploy damn-vulnerable-llm-agent --lab-env LLM_BACKEND=openrouter --lab-env OPENROUTER_API_KEY=sk-or-v1-…   # free hosted models
rtlab spinner deploy --os ubuntu --labs damn-vulnerable-llm-agent --lab-env LLM_BACKEND=openai --lab-env OPENAI_API_KEY=sk-…

# Full environments (several VMs on their own network)
rtlab deploy splunk-attack-range --windows 1 --domain --ttl 8h      # Splunk server + Windows DC, Sysmon -> Splunk
rtlab deploy splunk-attack-range --windows 2 --linux 1 --kali --memory 8192
rtlab deploy metasploitable3-ub1404                                   # single vulnerable VM

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

## Labs on your own server (VPS)

Container labs can run on a Linux server you own instead of a local VM: rtlab drives the server's Docker over SSH
(`DOCKER_HOST=ssh://`), with its own key file, known-hosts file and `ssh` wrapper for the one process that needs them.

```bash
rtlab remote check root@203.0.113.9 --ssh-key ~/.ssh/id_ed25519 --install-docker     # login, Docker (installs it if missing)
rtlab remote deploy --labs juice-shop,dvwa --remote root@203.0.113.9 --ssh-key ~/.ssh/id_ed25519 --ttl 4h
rtlab remote deploy --labs crapi --remote admin@vps.example.net:2222 --ssh-password-env VPS_PASSWORD --bind 10.8.0.2
rtlab remote presets        # Hostinger, DigitalOcean, Linode, Vultr, Hetzner, custom: where to find the SSH details
```

**Verified on 2026-10-02 against a real VPS** (Ubuntu 20.04, 1 vCPU, 2 GB): `rtlab remote check --install-docker` installed
Docker 28 (the get.docker.com script trips over a package missing on 20.04, so rtlab falls back to the explicit package
set), and `rtlab remote deploy --labs webgoat` had WebGoat answering on the public address in about 75 seconds, with
registration and login working through its own forms.

**Private by default with a VPN.** `rtlab remote vpn setup` installs WireGuard on the server (`wg0`, 10.8.0.1/24, UDP
51820), turns the firewall on so only SSH and the VPN port are reachable from the internet, and adds a Docker rule that
drops any new connection to a container arriving on the public interface. `rtlab remote deploy … --private` then binds
the labs to 10.8.0.1 only. Each student gets one peer: `rtlab remote vpn add-peer alice --out alice.conf` prints a
WireGuard client config once (import it in the WireGuard app; the server keeps only the public key); `peers` shows
handshakes, `remove-peer` revokes. Connected students reach the labs at `http://10.8.0.1:<port>`; nobody else can.

```bash
rtlab remote vpn setup --remote root@203.0.113.9 --ssh-key ~/.ssh/id_ed25519
rtlab remote deploy --labs webgoat --remote root@203.0.113.9 --ssh-key ~/.ssh/id_ed25519 --private --ttl 8h
rtlab remote vpn add-peer alice --remote root@203.0.113.9 --ssh-key ~/.ssh/id_ed25519 --out alice.conf
```

Without `--private`, the labs listen on the server's address (or `--bind`): on an internet-facing server they are
reachable by everyone, so use a disposable server and firewall it to your own IP. Secrets are never stored: the state file keeps the key's path
or the name of the environment variable holding the password, and lifecycle commands reuse them. The web platforms
offer the same as the **VPS** target with servers stored encrypted per organization.

## Bring your own VPS or cloud: what happens to your credentials

- **Validated before use.** A server is checked over SSH (login, Docker, host key) and a cloud key is resolved to its
  account identity by the runner before any lab is created with it.
- **Isolated.** On the platforms, credentials belong to one organization; row-level security keeps every other
  account out, and no browser role can read the encrypted column.
- **Used only for the work.** The runner receives a credential only inside the job that needs it, writes a key to a
  0600 temporary file for that one command, masks it in every log line, and deletes it when the command ends. The
  CLI stores a key's *path* or the *name* of an environment variable, never a value.
- **Time-limited labs.** Every deployment has a TTL (default 4 h, maximum 72 h) after which it is destroyed.
- **Your choice afterwards.** When a VPS or cloud lab is destroyed, the platform asks once whether to remove the
  stored credentials now or keep them for the next lab; the answer is recorded in the audit log.

## Runner agent

`rtlab agent` connects this machine to a RedTeam Labs control plane so the website can deploy labs onto it.
A local lab is deployed **by a runner**, so each host that will run labs installs `rtlab` and enrolls once, before any deploy:

```bash
# 1. install rtlab on the host (skip if you already have it)
curl -fsSL https://labs.rusecure.in/install.sh | sh          # Windows: irm https://labs.rusecure.in/install.ps1 | iex

# 2. enroll + run (copy the exact line, with your code, from the Runners page)
rtlab agent enroll --url https://labs.rusecure.in --code <one-time code from the Runners page> --name lab-host
rtlab agent run          # heartbeat + carry out deployments; Ctrl-C to stop after the current job
rtlab agent status | unenroll
```

It only connects out over HTTPS and never opens a port. The control plane is not trusted with arguments: every job is
validated (known lab ids, bounded numbers, operator-configured storage only) and run without a shell, and secrets are
redacted from logs. Jobs come in two kinds: container labs (up to five in one spinner VM) and full environments such as
Splunk Attack Range, which the runner deploys alone with the engine options the website collected. Protocol: [docs/runner-protocol.md](docs/runner-protocol.md). Tests: `npm test`
(`RTLAB_REAL_VM=1 npm test` also boots a real VM through the protocol).

## Lovable deployment (control plane)

The web app also exists as a Lovable project (TanStack Start + Supabase): <https://redteam-labs.lovable.app>
(workspace "Tech's Lovable", project `9523987a-52b5-4c52-b01b-0da2ffa65dd5`). Lovable hosts the website, accounts,
catalog and deployment tracking; it cannot run VMs, so each machine that hosts labs runs a **runner**
(`rtlab agent`, see above) that connects out to `/api/public/runner/*` and carries out deployments.
Only the **local** target is live; VPS and cloud appear in the wizard as "Coming next".

- The published site is visible to the Lovable workspace only until its owner makes it public (Lovable -> Publish).
- Verified against the deployed backend with a real VM: enrollment (single-use code), deploy, credentials stored as
  AES-GCM ciphertext, stop, start, removal on the host reconciled to `destroyed`, and runner revocation stopping the agent.
  Re-verified on 2026-10-01 after the catalog, full-environment and cloud work: a runner enrolled with the live site built
  Juice Shop through the site's job queue (HTTP 200, 408 events stored without any plaintext password), the destroy job
  removed the VM and the site deleted the encrypted login record. The same runner then built Splunk Attack Range as a
  `kind: lab` job from the site (Splunk login with the generated password, Sysmon and domain events from the DC, RDP
  open, logins stored as 868 bytes of ciphertext, no password-like text in the 700+ stored events) and the site's destroy
  job removed both VMs.
- Database security was reviewed and fixed (column-level grants, no client writes to memberships/audit, quota only via a
  platform-admin function); `supabase/tests/rls.sql` in the Lovable project lists the attacks that must fail.
- `platform/frontend/e2e-lovable/` is the full browser test for that app (needs a public or logged-in URL and a confirmed
  account): `LOVABLE_URL=... E2E_EMAIL=... E2E_PASSWORD=... npx playwright test -c playwright.lovable.config.ts`.

## Web platform

A multi-user web app on top of this CLI (accounts, organizations, catalog UI, deploy wizard,
one isolated spinner VM per deployment) lives in [`platform/`](platform/README.md).
The CLI side of it is `rtlab spinner deploy --os ubuntu|kali --labs a,b [--storage <id>]`, `rtlab spinner bake`,
`rtlab storage add|list|remove` (put VM disks on a secondary drive) and `rtlab preflight` (RAM, disks, tools).

## Where a lab runs (placement)

Every catalog entry carries a `placement` (see `rtlab catalog --json`): its runtime (`docker`, `vm`, `k8s`, `cloud`, `guided`), the targets it can be deployed to in order of preference, the recommended one, and what it needs. The rule set is the product rule, shared with the web platform:

| Runtime | Recommended | Also | Notes |
|---|---|---|---|
| container (`docker`) | your VPS with Docker | a local VM | size-checked against the server's RAM and free disk |
| full environment (`vm`, e.g. Splunk Attack Range) | your AWS account (`--provider aws`) | local VirtualBox; a VPS only with nested virtualization and the runner installed on it | the cloud plan is free; `rtlab cloud apply` is the billable step |
| cloud (`terraform`) | the lab's provider | – | plans only until you apply |
| `k8s`, `guided` | – | – | guided steps on the lab page |

If a VPS is too small for what you picked, the platform says so with the numbers and, when the lab has a cloud mode, asks for your cloud credentials instead of failing half-way.

Housekeeping commands added for the failure cases we hit: `rtlab orphans [--prune]` lists VMs and containers named after labs that have no record here; `rtlab destroy <id> --remote … --ssh-key …` cleans a server lab whose local record was lost; `rtlab destroy <id> --purge` also removes the lab's images; `rtlab remote reset --remote … [--remove-docker] [--dry-run]` reverts what rtlab set up on a server; `rtlab agent install-service` keeps the runner alive across crashes and reboots.

## Cloud labs — rtlab plans, you approve the spend

**Verified with a real AWS account on 2026-10-01:** `rtlab deploy awsgoat` and `rtlab deploy cloudfoxable` ran `terraform init`
and `terraform plan` against the operator's account (345 and 31 resources to add) and reported the exact apply command;
nothing was applied. The web platform offers the same through **Cloud accounts** (Account page): an admin stores AWS, Azure
or Google Cloud credentials for the organization (encrypted at rest, never shown again), the worker confirms which account
they belong to, and a cloud lab picked in the wizard is planned with them and shown with its apply and destroy commands.
TerraGoat is a scanner target (its Terraform needs an S3 state backend and pre-1.0 syntax) and Sadcloud's repository is
gone, so neither is deployable.

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

### Cloud ranges are private: VPN-only access

Splunk Attack Range in AWS is the exception to "public endpoints by design", because students use it, not scanners.
Nothing a student touches is reachable from the internet:

- the range is provisioned with its security group whitelisted to **the runner's public IP only** (never `0.0.0.0/0`);
- `rtlab cloud apply` ends by turning the Splunk server into a **WireGuard gateway** (`10.8.0.1/24`, UDP 51820, forwarding
  to the VPC `10.0.0.0/16`) and closing every security-group port that was open to the internet. Only UDP 51820 stays
  open; SSH, WinRM and the Splunk API stay open to the runner's IP so Ansible and the range tooling keep working;
- students get one WireGuard peer each (`rtlab cloud vpn-peer <id> <name>`, or "Get my VPN config" on the platform)
  and use the **private** addresses: `http://10.0.1.12:8000`, `rdp://10.0.1.14:3389`.

```bash
rtlab cloud vpn <id>                    # make an already-applied range VPN-only, or re-sync after the runner's IP changed
rtlab cloud vpn-peer <id> alice --out alice.conf
rtlab cloud vpn-remove-peer <id> alice
```

This mirrors the detection-platform's router-plus-private-subnet design without forking Attack Range's Terraform.
AWS only today; Azure and GCP ranges keep the runner-IP whitelist.

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

**103 labs across 13 categories, 37 of them one-command deploys (plus 2 cloud labs planned in your own account).** Every entry carries its **MITRE ATT&CK techniques** and a **Sigma namespace**, so you know what you are meant to detect before you start.

The catalog was audited on 2026-10-01: every upstream repository was cloned or probed, and 98 entries were retired
(repositories that no longer exist, hosted platforms such as TryHackMe and Hack The Box that are not deployable labs,
organisation links and sample-capture sites). The list, with a reason per entry, is in
[`src/catalog/catalog-removed.json`](src/catalog/catalog-removed.json). Entries that are security tools rather than
labs (scanners, policy engines, rule sets) stay catalogued but say so in `rtlab info`.

<!-- CATALOG:START -->

### At a glance

| Category | `--domain` | Labs | Auto-deploy | Guided | Engine |
| --- | --- | :---: | :---: | :---: | --- |
| Cloud Security | `cloud` | 8 | 2 | 6 | terraform |
| Kubernetes &amp; Containers | `k8s` | 7 | 0 | 7 | k8s |
| Web &amp; API | `web` | 14 | 10 | 4 | docker |
| LLM / GenAI / MCP | `llm` | 6 | 1 | 5 | docker |
| Active Directory / Windows | `ad` | 5 | 0 | 5 | terraform, vm |
| Linux / Endpoint | `linux` | 3 | 1 | 2 | docker, vm |
| CI/CD &amp; Supply Chain | `cicd` | 8 | 1 | 7 | docker |
| IaC / Terraform / Policy as Code | `iac` | 7 | 0 | 7 | docker, terraform |
| Mobile Application | `mobile` | 6 | 1 | 5 | docker, manual |
| Network / PCAP | `network` | 11 | 1 | 10 | attack-range, manual |
| Identity / IAM | `identity` | 5 | 0 | 5 | docker, terraform |
| IoT / OT / ICS | `ot` | 5 | 2 | 3 | docker, manual |
| Service-Level CVE Labs | `service-cve` | 18 | 18 | 0 | docker |
| **Total** | | **103** | **37** | **66** | |

`auto` = one-command deploy · `guided` = catalogued with prerequisites and steps, but no automated path yet (run `rtlab info <id>` for the reason).

### Cloud Security &nbsp;<sub>`rtlab list --domain cloud`</sub>

Deliberately vulnerable cloud estates. These run in **your own account**, cost real money and expose public endpoints — `rtlab` plans them for free and hands you the apply command.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **AWSGoat** | `awsgoat` | `auto` | terraform | — | _cloud_ | `T1190`, `T1078`, `T1552` |
| **CloudFoxable** | `cloudfoxable` | `auto` | terraform | — | _cloud_ | `T1526`, `T1552` |
| **AzureGoat** | `azuregoat` | `guided` | terraform | — | _cloud_ | — |
| **CloudGoat** | `cloudgoat` | `guided` | terraform | — | _cloud_ | — |
| **EKS Goat (OWASP)** | `eks-goat-owasp` | `guided` | terraform | — | _cloud_ | — |
| **EntraGoat** | `entragoat` | `guided` | terraform | — | _cloud_ | `T1098` |
| **GCPGoat** | `gcpgoat` | `guided` | terraform | — | _cloud_ | — |
| **GitHub Actions Goat** | `github-actions-goat` | `guided` | terraform | — | _cloud_ | — |

### Kubernetes &amp; Containers &nbsp;<sub>`rtlab list --domain k8s`</sub>

Cluster misconfiguration, container escape and RBAC abuse. Pair with Falco/Tetragon for runtime telemetry.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **Falco CTF** | `falco-ctf` | `guided` | k8s | — | — | — |
| **Kubernetes Goat** | `kubernetes-goat` | `guided` | k8s | 1234 | 4 vCPU · 8 GB | `T1611`, `T1613`, `T1525`, `T1610`, `T1609` |
| **Kubescape Hippo** | `kubescape-hippo` | `guided` | k8s | — | — | — |
| **Kyverno Policy Lab** | `kyverno-policy-lab` | `guided` | k8s | — | — | — |
| **Polaris Playground** | `polaris-playground` | `guided` | k8s | — | — | — |
| **Tetragon Lab** | `tetragon-lab` | `guided` | k8s | — | — | — |
| **Tracee Sample Lab** | `tracee-sample-lab` | `guided` | k8s | — | — | — |

### Web &amp; API &nbsp;<sub>`rtlab list --domain web`</sub>

OWASP-style application and API targets — the fastest path from exploit to detection.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **DVGA (Damn Vulnerable GraphQL App)** | `dvga` | `auto` | docker | 5013 | 1 vCPU · 0.5 GB | `T1592`, `T1190` |
| **DVNA (Damn Vulnerable NodeJS Application)** | `dvna` | `auto` | docker | 9090 | 1 vCPU · 1 GB | `T1190`, `T1059` |
| **DVWA (Damn Vulnerable Web Application)** | `dvwa` | `auto` | docker | 80 | 1 vCPU · 1 GB | `T1190`, `T1059`, `T1078` |
| **DVWS (Damn Vulnerable Web Services)** | `dvws-node` | `auto` | docker | 80 | 1 vCPU · 1 GB | `T1190`, `T1552` |
| **OWASP crAPI** | `crapi` | `auto` | docker | 8888 | 2 vCPU · 4 GB | `T1190`, `T1059` |
| **OWASP Juice Shop** | `juice-shop` | `auto` | docker | 3000 | 1 vCPU · 1 GB | `T1190`, `T1071`, `T1505` |
| **OWASP NodeGoat** | `owasp-nodegoat` | `auto` | docker | 4000 | 1 vCPU · 1 GB | `T1190`, `T1059` |
| **OWASP RailsGoat** | `owasp-railsgoat` | `auto` | docker | 3000 | 1 vCPU · 1.5 GB | `T1190`, `T1078` |
| **OWASP WebGoat** | `webgoat` | `auto` | docker | 8080 | 2 vCPU · 2 GB | `T1190`, `T1059` |
| **VAmPI (Vulnerable API)** | `vampi` | `auto` | docker | 5000 | 1 vCPU · 0.5 GB | `T1190` |
| **DVTA** | `dvta` | `guided` | docker | — | — | — |
| **Mutillidae** | `mutillidae` | `guided` | docker | — | — | — |
| **OWASP Security Shepherd** | `owasp-security-shepherd` | `guided` | docker | 80 | 2 vCPU · 2 GB | `T1190` |
| **XVWA** | `xvwa` | `guided` | docker | — | — | — |

### LLM / GenAI / MCP &nbsp;<sub>`rtlab list --domain llm`</sub>

Prompt injection, insecure output handling, MCP and agent abuse (OWASP LLM Top 10).

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **Damn Vulnerable LLM Agent** | `damn-vulnerable-llm-agent` | `auto` | docker | 8501 | 1 vCPU · 1 GB | `T1190` |
| **Garak** | `garak` | `guided` | docker | — | — | — |
| **OWASP LLM Top10 Demo** | `owasp-llm-top10-demo` | `guided` | docker | — | — | — |
| **Pacu-LLM** | `pacu-llm` | `guided` | docker | — | — | — |
| **Promptfoo** | `promptfoo` | `guided` | docker | — | — | — |
| **PyRIT (Microsoft)** | `pyrit-microsoft` | `guided` | docker | — | — | — |

### Active Directory / Windows &nbsp;<sub>`rtlab list --domain ad`</sub>

Vulnerable AD forests — the richest source of Windows attack telemetry.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **AutomatedLab** | `automatedlab` | `guided` | vm | — | — | — |
| **Azure Sentinel Lab** | `azure-sentinel-lab` | `guided` | terraform | — | _cloud_ | — |
| **DetectionLab** | `detectionlab` | `guided` | vm | — | — | — |
| **GOAD (Game of Active Directory)** | `goad` | `guided` | vm | 3389 | 8 vCPU · 24 GB | `T1003`, `T1068`, `T1071`, `T1486`, `T1055` |
| **LabBuilder** | `labbuilder` | `guided` | vm | — | — | — |

### Linux / Endpoint &nbsp;<sub>`rtlab list --domain linux`</sub>

Host-level exploitation and privilege escalation with rich endpoint telemetry.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **Metasploitable 3 (Ubuntu 14.04)** | `metasploitable3-ub1404` | `auto` | vm | 22 | 2 vCPU · 2 GB | `T1190`, `T1068` |
| **Sysmon for Linux** | `sysmon-for-linux` | `guided` | docker | — | — | — |
| **Wazuh Agent Lab** | `wazuh-agent-lab` | `guided` | docker | — | — | — |

### CI/CD &amp; Supply Chain &nbsp;<sub>`rtlab list --domain cicd`</sub>

Pipeline and supply-chain attack paths (Jenkins, GitLab, Gitea, GitHub Actions).

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **CI/CD Goat** | `cicd-goat` | `auto` | docker | 8080 | 4 vCPU · 8 GB | `T1195`, `T1059.004` |
| **CNCF Supply Chain Lab** | `cncf-supply-chain-lab` | `guided` | docker | — | — | — |
| **Dependency-Track Demo** | `dependency-track-demo` | `guided` | docker | — | — | — |
| **Grype Lab** | `grype-lab` | `guided` | docker | — | — | — |
| **OSV-Scanner Tests** | `osv-scanner-tests` | `guided` | docker | — | — | — |
| **Secure Workflows** | `secure-workflows` | `guided` | docker | — | — | — |
| **Syft Lab** | `syft-lab` | `guided` | docker | — | — | — |
| **Trivy Vuln Lab** | `trivy-vuln-lab` | `guided` | docker | — | — | — |

### IaC / Terraform / Policy as Code &nbsp;<sub>`rtlab list --domain iac`</sub>

Misconfigured infrastructure-as-code — the reference targets for IaC scanning and drift detection.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **CFNgoat** | `cfngoat` | `guided` | terraform | — | _cloud_ | — |
| **Checkov Playground** | `checkov-playground` | `guided` | docker | — | — | — |
| **Conftest Playground** | `conftest-playground` | `guided` | docker | — | — | — |
| **KICS Playground** | `kics-playground` | `guided` | docker | — | — | — |
| **OPA Playground** | `opa-playground` | `guided` | docker | — | — | — |
| **TerraGoat** | `terragoat` | `guided` | terraform | — | _cloud_ | `T1578` |
| **Terrascan Playground** | `terrascan-playground` | `guided` | docker | — | — | — |

### Mobile Application &nbsp;<sub>`rtlab list --domain mobile`</sub>

Vulnerable Android/iOS applications for mobile app security testing.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **MobSF (Mobile Security Framework)** | `mobsf-lab` | `auto` | docker | 8000 | 2 vCPU · 2 GB | — |
| **AndroGoat** | `androgoat` | `guided` | manual | — | — | — |
| **Damn Vulnerable iOS App** | `damn-vulnerable-ios-app` | `guided` | manual | — | — | — |
| **MSTG Hacking Playground** | `mstg-hacking-playground` | `guided` | manual | — | — | — |
| **OWASP iGoat** | `owasp-igoat` | `guided` | manual | — | — | — |
| **OWASP MSTG Vulnerable Apps** | `owasp-mstg-vulnerable-apps` | `guided` | manual | — | — | — |

### Network / PCAP &nbsp;<sub>`rtlab list --domain network`</sub>

Traffic, PCAP and network-detection labs (Zeek, Suricata, Arkime).

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **Splunk Attack Range** | `splunk-attack-range` | `auto` | attack-range | 8000, 3389 | 5 vCPU · 8 GB | `T1059`, `T1053`, `T1003`, `T1547` |
| **Arkime (Moloch) Lab** | `arkime-moloch-lab` | `guided` | manual | — | — | — |
| **Mordor (Forge)** | `mordor-forge` | `guided` | manual | — | — | — |
| **Mordor Datasets** | `mordor-datasets` | `guided` | manual | — | — | — |
| **SigmaHQ Ruleset** | `sigmahq-ruleset` | `guided` | manual | — | — | — |
| **Splunk BOTS v2** | `splunk-bots-v2` | `guided` | manual | — | — | — |
| **Splunk BOTS v3** | `splunk-bots-v3` | `guided` | manual | — | — | — |
| **Stenographer Lab** | `stenographer-lab` | `guided` | manual | — | — | — |
| **Suricata Playground** | `suricata-playground` | `guided` | manual | — | — | — |
| **ThreatHunter Playbook** | `threathunter-playbook` | `guided` | manual | — | — | — |
| **Zeek Security Repo** | `zeek-security-repo` | `guided` | manual | — | — | — |

### Identity / IAM &nbsp;<sub>`rtlab list --domain identity`</sub>

Identity provider, SSO, OAuth and IAM attack paths.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **AADInternals** | `aadinternals` | `guided` | terraform | — | _cloud_ | — |
| **BloodHound CE** | `bloodhound-ce` | `guided` | docker | — | — | — |
| **PingCastle Lab** | `pingcastle-lab` | `guided` | docker | — | — | — |
| **ROADtools Lab** | `roadtools-lab` | `guided` | docker | — | — | — |
| **StormSpotter** | `stormspotter` | `guided` | terraform | — | _cloud_ | — |

### IoT / OT / ICS &nbsp;<sub>`rtlab list --domain ot`</sub>

Industrial control, PLC and IoT protocol labs.

| Lab | `id` | Deploy | Engine | Port | Resources | ATT&CK |
| --- | --- | :---: | :---: | --- | --- | --- |
| **Conpot ICS honeypot** | `conpot-honeypot` | `auto` | docker | 8800 | 1 vCPU · 1 GB | `T0846`, `T0861` |
| **OWASP IoTGoat** | `iotgoat-owasp` | `auto` | docker | 8080, 4443, 2222 | 2 vCPU · 3 GB | `T1190`, `T1078` |
| **DVRF (Router Firmware)** | `dvrf-router-firmware` | `guided` | manual | — | — | — |
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
  denial, stop/start, logs, TTL reap, destroy. On 2026-10-01 **every one-click lab in the catalog (35 of 35,
  including all 18 service-level CVE labs) was deployed into a real spinner VM, probed and destroyed**; each entry's
  `verified` flag records it. Fixes that came out of it: DVNA uses its official image, RailsGoat prepares its database
  on start, IoTGoat's ports and memory were wrong, the LLM agent ships its own Dockerfile, Vulhub labs are copied into
  the deployment directory so a spinner VM can see them, and Security Shepherd was demoted to guided (Maven build).
- **Attack Range engine (`splunk-attack-range`):** Splunk Attack Range v3.0.0, the last release with a local
  VirtualBox mode, rendered from the project's own Vagrant templates and provisioned by its Ansible playbooks in
  an isolated virtualenv. **Verified on 2026-10-01:** Splunk server plus a Windows 2016 domain controller built in
  about 28 minutes (boxes cached); Splunk login with the generated password, Sysmon, Security and PowerShell logs
  arriving from the DC (domain ATTACKRANGE.LOCAL), RDP reachable, every port bound to the lab address only, destroy
  removes both VMs. Two upstream problems are worked around: Vagrant's WinRM lookup on 127.0.0.1 and the Aurora
  agent role's dead licence URL (the Windows playbook rtlab writes skips that role). Needs about 8 GB of free RAM
  and a multi-GB Windows box download on first use; a failed build keeps its log under `.rtlab/logs/`.
- **Lab options:** entries can declare `options` (choice, string, secret, int, bool). `--lab-env [lab:]KEY=VALUE` sets them
  and only declared keys are accepted; values reach the lab's containers as environment, the resolved compose file is
  written with mode 0600, and secret values are masked in logs. The Damn Vulnerable LLM Agent uses this to pick its
  model: a bundled local Ollama (default), OpenRouter (free models with a key) or OpenAI.
- **Cloud labs** (AWSGoat, TerraGoat, Sadcloud, CloudFoxable, …) remain plan-only: they create billable, public
  resources and need your cloud credentials, so `rtlab` previews them and never applies without you.
- **Vagrant engine:** verified on 2026-10-01 with Metasploitable 3 (`rapid7/metasploitable3-ub1404`): the VM came
  up on its private address with HTTP, SSH, FTP, MySQL and SMB answering, and was destroyed cleanly. Two box quirks
  are handled: it ships without Vagrant's insecure key (the recipe carries `ssh: { username, password }`) and its
  guest additions cannot mount the default shared folder (disabled for every lab VM). A VM that fails to come up is
  destroyed instead of left running.
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
