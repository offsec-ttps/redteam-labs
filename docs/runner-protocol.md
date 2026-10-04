# Runner protocol

A **runner** (`rtlab agent`) connects a machine that hosts labs to a control plane (the RedTeam Labs web app).
The runner only ever connects **out** over HTTPS and never listens on a port. The control plane never runs VMs.

## Transport

- Base URL, one of:
  - app domain: `https://<app>/api/public/runner/<name>` (what the Lovable build uses)
  - Supabase Edge Functions: `https://<ref>.supabase.co/functions/v1/runner-<name>`
- `POST`, JSON in and out. Runner endpoints are **not** browser endpoints: they authenticate with
  `Authorization: Bearer rtr_...` (an opaque runner key, not a user JWT) and must bypass user-session middleware.
- Errors are `{ "error": "message" }`: `401` unknown/revoked key, `409` stale or unknown job, `422` bad body.
- The control plane stores only `sha256(runner_key)` and `sha256(enrollment_code)` and compares in constant time.

## Endpoints

### `enroll`  (no Authorization header)
Request `{ enrollment_code, name, version, host }` -> `{ runner_id, runner_key, org_id, poll_interval_seconds }`.
The code is created in the UI by an org owner/admin, is single use and expires in 15 minutes. The key is returned once.
`host` is the same object as in `heartbeat` (used to show the machine's capacity immediately).

### `heartbeat`  (every ~30 s)
Request:
```json
{ "version": "0.1.0",
  "host": { "cpus": 8, "memory": {"totalMB": 16000, "availableMB": 9000},
            "tools": {"vagrant": "...", "virtualbox": "...", "docker": "...", "git": "...", "dockerCompose": true},
            "runningVms": 0,
            "boxes": {"ubuntu": {"stockCached": true, "baked": false}, "kali": {"stockCached": false, "baked": false}},
            "boxCache": {"freeGB": 300, "totalGB": 900}, "dockerRoot": {"freeGB": 50},
            "storage": [{"id": "default", "label": "Default", "isDefault": true, "usable": true, "reason": null, "freeGB": 300, "totalGB": 900}] },
  "deployments": [{"rtlab_id": "spinner-abc123", "status": "running"}] }
```
The runner strips every filesystem path before sending. A runner is **online** when its last heartbeat is under 90 s old.
Response `{ ok: true, server_time, pending_jobs }`.

**Reconciliation** (this is how timer-destroyed or manually removed labs disappear from the website): for each deployment of
this runner that is `running`, `stopped` or `error`, has an `rtlab_id`, and has **no queued/running job**:
- absent from `deployments` -> mark `destroyed`, delete its stored credentials, log "Removed on the host (timer or manual)";
- present with status `running`/`stopped` that differs -> update to match.
Deployments with an active job are never touched. Unknown `rtlab_id`s (labs a human made with the CLI) are ignored.

### `poll`
Request `{}`. Atomically claim the oldest `queued` job for this runner (`FOR UPDATE SKIP LOCKED`), set it `running`
with a 10-minute lease. Response `{ "job": null }` or
`{ "job": { "id", "type", "deployment_id", "lease_seconds": 600, "payload": {...} } }`.

| type | payload |
| --- | --- |
| `deploy` (container labs) | `{ kind: "spinner", name, base_os: "ubuntu"\|"kali", labs: ["juice-shop"], ttl_minutes, options: { no_egress, cpus, memory_mb, kali_tools, storage_id, accept_risks, lab_env?: { "<lab>": { KEY: "value" } } } }`. `kind` may be absent (older control planes). `lab_env` carries a lab's declared options (see `options` on the catalog entry: choice, string, secret, int, bool); the runner refuses undeclared keys or bad values, passes them as `--lab-env`, and masks every secret value in the events it sends. Control planes store secret values encrypted and add them to the payload only at poll time. |
| `deploy` (full environment) | `{ kind: "lab", lab: "splunk-attack-range", ttl_minutes, options: { windows, linux, kali, createDomain, splunkMemoryMB, storage_id? } }`. One lab, deployed alone; it must be a catalog entry with `deploy.available` and engine `attack-range` or `vm`. The runner runs `rtlab deploy <lab> --ttl <m>m --yes` plus the engine flags it derives from the options; unknown or out-of-range options fail the job before anything runs. |
| `deploy` (container labs on a VPS) | `{ kind: "remote", labs: ["juice-shop"], ttl_minutes, options: { no_egress, accept_risks, install_docker?, lab_env? }, target: { kind: "vps", label, host, port, username, private_key \| password, passphrase?, bind_ip? } }`. The `target` block is added by the control plane **at poll time** (it holds the server's SSH secret) for deploy and for every lifecycle job of that deployment. The runner validates host, port, user and key format, writes the key to a 0600 temp file for one `rtlab remote deploy` run (never argv), checks SSH and Docker on the server (installing Docker with get.docker.com when `install_docker` is set and the user is root or has passwordless sudo), starts the labs with Docker Compose over `DOCKER_HOST=ssh://`, and masks the secret in every event. Result shape = the spinner result (`vm_ip` is the server's address). Labs listen on `bind_ip` or the server's address: reachable from the internet unless the server is firewalled. |
| `vpn-setup` | `{ server_id, target }` → the runner installs WireGuard on the server (`wg0` 10.8.0.1/24, UDP 51820), enables the firewall (SSH and the VPN port only from the internet) and a Docker rule that drops new connections to containers from the public interface. `result: { ok, address, network, port, server_public_key, endpoint }`. Idempotent. |
| `vpn-peer` | `{ server_id, name, endpoint?, target }` → one WireGuard peer for a student. `result: { ok, name, address, credentials: { vpn_config } }`: the client config (it contains the student's private key) is in `credentials`, which the control plane stores encrypted and reveals once to the student; the server keeps only the public key. |
| `vpn-remove-peer` | `{ server_id, name, target }` → revokes the peer. `result: { ok, name }`. |
| `verify-cloud` | `{ provider, credentials }` (added at poll time) → the runner runs `rtlab creds` with them and reports `result: { ok: true, identity }` (for example the AWS account ARN) or `{ ok: false, error }`. The control plane refuses to use an account that has no identity yet. |
| `verify-server` | `{ server_id, install_docker?, target: {...as above...} }` → `report` with `status: "succeeded"` and `result: { ok: true, os, docker_version, compose_version, fingerprint }` or `{ ok: false, error }`. Never touches a deployment. |
| `deploy` (cloud lab, plan only) | `{ kind: "cloud", lab: "awsgoat", provider: "aws", credentials: { access_key_id, secret_access_key, session_token?, region? } }` (Azure: `client_id, client_secret, tenant_id, subscription_id`; GCP: `credentials_json, project?`). The runner validates the lab is a catalogued Terraform lab of that provider, turns the fields into process environment for one `rtlab deploy <lab>` run (Terraform init and plan), and masks every secret value in the events it sends back. **Nothing is applied**: the result is a plan. |
| `start` `stop` `destroy` | `{ rtlab_id }`. For a planned cloud lab, `destroy` also carries `provider` and `credentials`, because rtlab checks the Terraform state is empty with them before removing the local record (it refuses while resources exist, so nothing applied by hand is orphaned). |

### `report`
Request `{ job_id, events?: [{ts, level, message}], status: "running"\|"succeeded"\|"failed", error?, result? }`.
- `running` appends events and extends the lease.
- `deploy` (cloud) + `succeeded` -> `result = { rtlab_id, status: "planned", services: [], plan: { identity, add, change, destroy, apply_cmd, destroy_cmd, tf_dir }, credentials: {...empty...} }`.
  The deployment becomes `planned`; the UI shows the identity (account the key resolves to), the counts and the apply command.
- `rtlab_id` must match `^[a-z0-9][a-z0-9-]{0,48}-[a-z0-9]{4,12}$` (`spinner-ab12cd`, `splunk-attack-range-ab12cd`).
- `deploy` + `succeeded` -> `result = { rtlab_id, status: "running"\|"starting", vm_ip, subnet, services: [{lab, name, port, url}],
  credentials: { vm: {host, ssh, username, password}, labs: [{lab, name, default_credentials, services}] } }`.
  Credentials are stored **encrypted**, are never readable by any browser role, and are revealed only by an audited,
  authorised server call. They are deleted when the deployment is destroyed.
- State transitions: deploy ok -> `running` (or `error` if `result.status != "running"`); start ok -> `running`;
  stop ok -> `stopped`; destroy ok -> `destroyed` (+ credentials deleted); any `failed` -> `error` with the message.
- Idempotent. Unknown or already-finished `job_id` -> `409`.

## Expiry

Every deployment carries `expires_at`. The control plane destroys expired labs on every target (a scheduled job queues a
normal `destroy` job, with the VPS target or cloud credentials merged at poll time); the runner also reaps its own
CLI-made local deployments with `rtlab reap`. A runner that is offline when a lab expires is told so when it returns:
the lab shows an error until someone destroys it.

## Job state machine

`queued -> running -> succeeded | failed`. A `running` job whose lease expired with no report is marked `failed`
("the runner stopped responding") and its deployment goes to `error`.

## What the runner guarantees

Every job is validated before anything runs: only `deploy/start/stop/destroy`; container labs must be catalogued and
spinner-eligible (max 5, no duplicates); a full environment must be a single catalogued whole-lab entry; `base_os` in
{ubuntu, kali}; bounded numbers (Attack Range: 0-4 Windows, 0-2 Linux, Splunk memory 4096-16384 MB); `storage_id` must be a location the machine's
operator configured; lifecycle ids must be well-formed and exist locally. Commands run as argument arrays (never a shell).
Log lines are redacted for password-looking text before they leave the machine.

### Expiry and lost records (server labs)

- The runner's own timer (`rtlab reap`) never tears down a server (VPS) lab by itself: it has no SSH credentials, and removing the local record would orphan the containers. Expired server labs are skipped by `reap` (reported as `skipped`) and left to the control plane, which queues a `destroy` job carrying the server's `target` block.
- A `destroy` job with a `target` block works even when the runner has no local record of the `rtlab_id` (an older runner reaped it, or the runner moved machines): the CLI sweeps the server by Compose project label (`rtlab-<id>-*`), removing containers, networks and volumes, and reports success. `start`/`stop` still require the local record.
- The control plane must queue the destroy for every expired lab regardless of whether the runner is online; the job is leased when the runner next polls.

### Server facts, purge and reset (2026-10-04)

- `verify-server` result also carries `virtualization` (`kvm` | `cpu` | `none`: can the server host VMs) and `installed_by_rtlab` (array of what rtlab itself set up there, from the marker files in `/etc/rtlab/*.installed`: today `docker`, `vpn`).
- A `destroy` job may carry `purge: true` (boolean only). For a VPS lab the runner then also removes the container images the lab pulled, leaving any image another container still uses; the job result carries `removed: { images: [...], imagesKept: [...] }`.
- New job `server-reset` `{ server_id, target, remove_docker?: boolean }`: reverts what rtlab set up on that server, judged by its markers: the VPN (WireGuard config, keys, peers, the ufw policy with SSH kept open, the DOCKER-USER rule, the wireguard packages) and, only with `remove_docker: true` and a `docker` marker, Docker Engine with everything under `/var/lib/docker`; refused while containers not named `rtlab-*` exist. Result `{ ok, removed: ["vpn", "docker"], kept: [...] }`. The control plane must only queue it once no deployment uses the server. `rtlab remote reset --dry-run` prints the same plan.
- Placement: `rtlab catalog --json` entries carry `placement` (`runtime`, `targets` in order of preference, `recommended`, `requirements`, `cloudProviders`, `vps.needs`, `note`, `images`), the single rule set the control plane mirrors in `lab_templates`.

### Cloud apply and Attack Range in AWS (2026-10-04)

- A `deploy` job of kind `cloud` may now target `splunk-attack-range` with `provider: "aws"` and `options { region, windows, linux, kali, createDomain }` (validated with the engine's own bounds). The runner runs the project's 4.x cloud mode through `src/engines/arcloud.mjs`: Terraform init + plan only. The result is the usual `planned` shape, plus `plan.instances [{ name, type, usd_per_hour }]`, `plan.usd_per_hour` and `plan.region` (approximate us-east-1 on-demand figures). Kali needs a one-time AWS Marketplace subscription; the runner says so when the AMI lookup fails.
- New job `cloud-apply` `{ rtlab_id, provider, credentials }`: the billable step (`rtlab cloud apply <id> --yes`): imports the range's key pair, applies the saved plan (Terraform + Ansible, 30-60 min for a range), then reports `{ rtlab_id, status, services, instances, credentials }` (logins travel in the encrypted `credentials`, like a deploy). Only ever queued after the user confirmed on the control plane.
- A `destroy` job may carry `destroy_cloud: true` (boolean) with the provider credentials: the runner then runs `terraform destroy -auto-approve` (and deletes the range's key pair) before dropping the record. Without it, rtlab refuses to drop a record while Terraform state still holds resources.
- `rtlab deploy` with a lowercase engine option (`--windows`, `--kali`, `--region`, …) no longer trips the environment-variable validator; those options steer the engine, UPPER_CASE options become container env.

### VPN-only cloud ranges (2026-10-04, later still)

Goal: no lab is reachable on a public address; students come in through the lab VPN. Same outcome as the detection-platform's router + private subnet, without forking Attack Range's Terraform.

- `rtlab deploy splunk-attack-range --provider aws` renders `ip_whitelist` as the runner's public IPv4 `/32` (never `0.0.0.0/0`); the plan fails if that IP can't be determined. The planned result's `extra.vpnOnly` is `true`, `extra.runnerIp` is that address.
- `cloud-apply` now ends with the gateway step (`vpnEnable`): WireGuard on the Splunk server (`wg0`, 10.8.0.1/24, UDP 51820, forwarding to the VPC `10.0.0.0/16` behind NAT, no ufw: the security group does the firewalling), then the security group drops every rule open to the internet and keeps UDP 51820 from anywhere plus SSH 22, WinRM 5985/5986 and the Splunk API 8089 from the runner's IP only (Ansible and the range tooling keep working). Idempotent.
- The `cloud-apply` result carries `vpn: { gateway, endpoint, server_public_key, address, network, port, routes, runner_ip, enabled_at }`, `vpn_only: true`, `instances[].private_ip`, and `services`/`credentials` on the **private** addresses (`http://10.0.1.12:8000`, `rdp://10.0.1.14:3389`). If the gateway step fails, the result has `vpn: null`, `vpn_only: false`, `vpn_error`; the range is still reachable only from the runner's IP, never the internet.
- New job `cloud-vpn` `{ rtlab_id, provider, credentials }` (`rtlab cloud vpn <id> --yes`): makes an already-applied range VPN-only, or re-syncs the gateway after the runner's IP changed. Result shape = `cloud-apply`.
- `vpn-peer` / `vpn-remove-peer` may target a cloud range: payload `{ rtlab_id, name }` with no `target` (the runner holds the range's key pair). Results are unchanged. The client config routes `10.8.0.0/24, 10.0.0.0/16` through the tunnel.
- AWS only today; Azure/GCP ranges keep the runner-IP whitelist and report `vpn_only: false`.

### Attack Range presets and providers (2026-10-04, later)

- `placement.presets` on `splunk-attack-range` (and `rtlab presets`) lists ready-made shapes per provider (`splunk_minimal_aws`, `splunk_ad_azure`, `splunk_zeek_windows_gcp`, …): `{ id, provider, name, description, servers, options }`. A cloud deploy job may send `options.preset` plus overrides; the runner merges them (explicit values win) and validates everything (`windows` 0-4, `linux` 0-2, `kali`/`zeek`/`soar`/`installEs` booleans, each only where the provider's Terraform has the module; AWS `region`, Azure `location` from an allow-list, GCP `region`+`zone`+`project_id`).
- Providers: AWS (plan verified for real), Azure and GCP (same code path through Attack Range's own controllers; credentials from the usual `credentials` block; not yet exercised end to end). Enterprise Security presets need the user's licensed `.spl` under `~/.rtlab/attack-range/apps/` on the runner; the plan fails with a clear message otherwise.
- The plan result's `plan` now also carries `preset`.
