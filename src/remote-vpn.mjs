/**
 * Private access to labs on a VPS: a WireGuard network on the server (wg0, 10.8.0.0/24 by default). Labs are bound
 * to the server's VPN address, the firewall admits only SSH and the VPN port from the internet, and a Docker rule
 * drops any new connection to a container that arrives on the public interface. Students get one peer config each.
 *
 * Everything runs on the server over the same SSH wrapper the remote engine uses; the server's private key never
 * leaves it, and a student's private key is generated on the server, printed once, and not kept there.
 */
import path from "node:path";
import { captureWithInput } from "./run.mjs";
import { prepareRemote } from "./remote.mjs";

export const DEFAULTS = { network: "10.8.0.0/24", address: "10.8.0.1", port: 51820, iface: "wg0" };
const NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const CIDR = /^(?:\d{1,3}\.){3}\d{1,3}\/(?:[0-9]|[12][0-9]|3[0-2])$/;
const ENDPOINT = /^[A-Za-z0-9.-]{1,253}(?::\d{1,5})?$/;

/** Every value that lands in a server-side script is checked against a strict shape first; nothing else is interpolated. */
function checkOpts({ address, network, port, iface, sshPort, endpoint, routes }) {
  if (address != null && !IPV4.test(address)) throw new Error("VPN address must be an IPv4 address");
  if (network != null && !CIDR.test(network)) throw new Error("VPN network must be an IPv4 CIDR");
  if (routes != null) {
    if (!Array.isArray(routes) || routes.length > 8) throw new Error("routes must be a list of up to 8 IPv4 CIDRs");
    for (const r of routes) if (!CIDR.test(r)) throw new Error("every route must be an IPv4 CIDR");
  }
  for (const [k, v] of Object.entries({ port, sshPort })) if (v != null && (!Number.isInteger(Number(v)) || Number(v) < 1 || Number(v) > 65535)) throw new Error(`${k} must be 1-65535`);
  if (iface != null && !/^[a-z][a-z0-9]{0,14}$/.test(iface)) throw new Error("interface name is not valid");
  if (endpoint != null && !ENDPOINT.test(endpoint)) throw new Error("endpoint must be host[:port]");
}

/**
 * The script that installs and configures WireGuard plus the firewall. Idempotent: re-running keeps keys and peers.
 *
 * Two shapes share it:
 *  - a VPS (default): labs bind to the VPN address; ufw admits only SSH and the VPN port from the internet.
 *  - a cloud gateway (`routes`, `firewall: false`): the server forwards VPN traffic to the networks in `routes`
 *    (the lab VPC) behind NAT, and the provider's security group does the firewalling instead of ufw.
 */
export function setupScript({ address = DEFAULTS.address, network = DEFAULTS.network, port = DEFAULTS.port, iface = DEFAULTS.iface, sshPort = 22, routes = [], firewall = true } = {}) {
  checkOpts({ address, network, port, iface, sshPort, routes });
  const cidr = network.split("/")[1] || "24";
  const fwd = routes.length
    ? `PostUp = sysctl -q -w net.ipv4.ip_forward=1; iptables -t nat -A POSTROUTING -s ${network} -o $PUBIF -j MASQUERADE; iptables -A FORWARD -i ${iface} -j ACCEPT; iptables -A FORWARD -o ${iface} -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -s ${network} -o $PUBIF -j MASQUERADE; iptables -D FORWARD -i ${iface} -j ACCEPT; iptables -D FORWARD -o ${iface} -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
# VPN clients reach ${routes.join(", ")} through this host (NAT), so lab hosts see the gateway's own address.
`
    : "";
  const fw = firewall
    ? `# firewall: SSH and the VPN port from anywhere; everything else only over the VPN
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null; ufw default allow outgoing >/dev/null
ufw allow ${sshPort}/tcp >/dev/null; ufw allow ${port}/udp >/dev/null; ufw allow in on ${iface} >/dev/null
ufw --force enable >/dev/null`
    : `# no host firewall here: the cloud security group admits only the VPN port (and management from the runner)
printf 'net.ipv4.ip_forward=1\\n' > /etc/sysctl.d/99-rtlab-vpn.conf; sysctl -q -p /etc/sysctl.d/99-rtlab-vpn.conf || true`;
  return `set -eu
export DEBIAN_FRONTEND=noninteractive
command -v wg >/dev/null 2>&1 || { apt-get update -qq; apt-get install -y -qq wireguard wireguard-tools; }
${firewall ? "command -v ufw >/dev/null 2>&1 || apt-get install -y -qq ufw" : ""}
command -v iptables >/dev/null 2>&1 || apt-get install -y -qq iptables
umask 077; mkdir -p /etc/wireguard/peers
[ -f /etc/wireguard/server.key ] || { wg genkey > /etc/wireguard/server.key; }
wg pubkey < /etc/wireguard/server.key > /etc/wireguard/server.pub
PUBIF=$(ip -4 route get 1.1.1.1 | awk '{print $5; exit}')
cat > /etc/wireguard/${iface}.base <<CONF
[Interface]
Address = ${address}/${cidr}
ListenPort = ${port}
PrivateKey = $(cat /etc/wireguard/server.key)
# Labs are published on ${address} only; this also drops any NEW connection to a container that arrives on the public interface.
PostUp = iptables -I DOCKER-USER -i $PUBIF -m conntrack --ctstate NEW -j DROP 2>/dev/null || true
PostDown = iptables -D DOCKER-USER -i $PUBIF -m conntrack --ctstate NEW -j DROP 2>/dev/null || true
${fwd}CONF
# wg0.conf = base + every peer on file
{ cat /etc/wireguard/${iface}.base; for f in /etc/wireguard/peers/*.peer; do [ -f "$f" ] && cat "$f"; done; } > /etc/wireguard/${iface}.conf
chmod 600 /etc/wireguard/${iface}.conf
systemctl enable wg-quick@${iface} >/dev/null 2>&1 || true
if systemctl is-active --quiet wg-quick@${iface}; then wg syncconf ${iface} <(wg-quick strip ${iface}); else systemctl restart wg-quick@${iface}; fi
mkdir -p /etc/rtlab && [ -e /etc/rtlab/vpn.installed ] || date -u +%FT%TZ > /etc/rtlab/vpn.installed
${fw}
echo "SERVER_PUB=$(cat /etc/wireguard/server.pub)"
echo "PUBLIC_IF=$PUBIF"
echo "PUBLIC_IP=$(curl -4 -fsS --max-time 8 https://api.ipify.org 2>/dev/null || ip -4 -o addr show $PUBIF | awk '{print $4}' | cut -d/ -f1 | head -1)"
wg show ${iface} | head -3
`;
}

/** Create a peer on the server; prints the client config once. The peer's private key is not kept on the server. */
/**
 * Revert what rtlab set up on a server, judged by the marker files in /etc/rtlab: the VPN (WireGuard config, keys, peers,
 * the ufw policy and the DOCKER-USER rule) and, when asked and rtlab installed it, Docker Engine itself. Refuses to remove
 * Docker while containers that are not rtlab's exist. Prints one `REMOVED <what>` line per thing it reverted.
 */
export function resetScript({ iface = DEFAULTS.iface, removeDocker = false, sshPort = 22 } = {}) {
  checkOpts({ iface, sshPort });
  return `set -eu
export DEBIAN_FRONTEND=noninteractive
if [ -e /etc/rtlab/vpn.installed ]; then
  PUBIF=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $5; exit}' || true)
  systemctl disable --now wg-quick@${iface} >/dev/null 2>&1 || true
  [ -n "$PUBIF" ] && iptables -D DOCKER-USER -i "$PUBIF" -m conntrack --ctstate NEW -j DROP 2>/dev/null || true
  rm -rf /etc/wireguard/${iface}.conf /etc/wireguard/${iface}.base /etc/wireguard/peers /etc/wireguard/server.key /etc/wireguard/server.pub
  if command -v ufw >/dev/null 2>&1; then ufw --force reset >/dev/null 2>&1 || true; ufw --force disable >/dev/null 2>&1 || true; ufw allow ${sshPort}/tcp >/dev/null 2>&1 || true; fi
  apt-get remove -y -qq wireguard wireguard-tools >/dev/null 2>&1 || true
  rm -f /etc/rtlab/vpn.installed
  echo "REMOVED vpn"
fi
${removeDocker ? `if [ -e /etc/rtlab/docker.installed ] && command -v docker >/dev/null 2>&1; then
  OTHERS=$(docker ps -a --format '{{.Names}}' | grep -v '^rtlab-' | head -5 || true)
  if [ -n "$OTHERS" ]; then echo "KEPT docker (containers not made by rtlab exist: $OTHERS)"; else
    docker ps -aq | xargs -r docker rm -f >/dev/null 2>&1 || true
    systemctl disable --now docker docker.socket containerd >/dev/null 2>&1 || true
    apt-get purge -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-buildx-plugin docker-ce-rootless-extras docker.io docker-compose >/dev/null 2>&1 || true
    rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/apt/sources.list.d/docker.list /etc/apt/keyrings/docker.asc /etc/apt/keyrings/docker.gpg
    rm -f /etc/rtlab/docker.installed
    echo "REMOVED docker"
  fi
fi` : `[ -e /etc/rtlab/docker.installed ] && echo "KEPT docker (not asked to remove it)" || true`}
rmdir /etc/rtlab 2>/dev/null || true
echo "RESET done"
`;
}

/** What a reset would revert on a server, from the markers the check reported: [{ what, detail }]. */
export function resetPlan(installedByRtlab = {}, { removeDocker = false } = {}) {
  const plan = [];
  if (installedByRtlab.vpn) plan.push({ what: "vpn", detail: "WireGuard config, server keys and all peer configs; the ufw policy (reset, disabled, SSH kept open); the DOCKER-USER rule that blocks public access to containers; the wireguard packages" });
  if (installedByRtlab.docker) plan.push(removeDocker
    ? { what: "docker", detail: "Docker Engine, the compose plugin and containerd, with all images, containers and volumes under /var/lib/docker (refused if containers not made by BreakPoint exist)" }
    : { what: "docker", detail: "kept: Docker Engine stays installed (choose 'also remove Docker' to uninstall it)", kept: true });
  return plan;
}

export function addPeerScript({ name, address = DEFAULTS.address, network = DEFAULTS.network, port = DEFAULTS.port, iface = DEFAULTS.iface, endpoint = null, routes = [] }) {
  if (!NAME.test(name)) throw new Error("peer name must be 1-32 characters: lowercase letters, digits, dashes");
  checkOpts({ address, network, port, iface, endpoint, routes });
  const base = address.split(".").slice(0, 3).join(".");
  // The client routes the VPN network and, on a cloud gateway, the lab networks behind it through the tunnel.
  const allowed = [network, ...routes].join(", ");
  return `set -eu
umask 077
[ -f /etc/wireguard/server.pub ] || { echo "VPN is not set up on this server (run: rtlab remote vpn setup)"; exit 2; }
f=/etc/wireguard/peers/${name}.peer
[ -f "$f" ] && { echo "peer '${name}' already exists (remove it first to issue a new config)"; exit 3; }
used=$( (grep -h "AllowedIPs" /etc/wireguard/peers/*.peer 2>/dev/null || true) | sed -E 's/.*${base.replace(/\./g, "\\.")}\\.([0-9]+)\\/32.*/\\1/' )
n=2; while echo "$used" | grep -qx "$n"; do n=$((n+1)); done
[ "$n" -lt 255 ] || { echo "no free VPN addresses"; exit 4; }
priv=$(wg genkey); pub=$(printf %s "$priv" | wg pubkey); psk=$(wg genpsk)
printf '\\n[Peer]\\n# ${name}\\nPublicKey = %s\\nPresharedKey = %s\\nAllowedIPs = ${base}.%s/32\\n' "$pub" "$psk" "$n" > "$f"
{ cat /etc/wireguard/${iface}.base; for p in /etc/wireguard/peers/*.peer; do cat "$p"; done; } > /etc/wireguard/${iface}.conf
wg syncconf ${iface} <(wg-quick strip ${iface})
ep=${endpoint ? `"${endpoint}"` : `"$(curl -4 -fsS --max-time 8 https://api.ipify.org 2>/dev/null || ip -4 -o addr show $(ip -4 route get 1.1.1.1 | awk '{print $5; exit}') | awk '{print $4}' | cut -d/ -f1 | head -1)"`}
echo "=== CLIENT CONFIG ${name} (shown once; the server keeps only the public key) ==="
printf '[Interface]\\nPrivateKey = %s\\nAddress = ${base}.%s/32\\n\\n[Peer]\\nPublicKey = %s\\nPresharedKey = %s\\nAllowedIPs = ${allowed}\\nEndpoint = %s:${port}\\nPersistentKeepalive = 25\\n' "$priv" "$n" "$(cat /etc/wireguard/server.pub)" "$psk" "$ep"
`;
}

export function removePeerScript({ name, iface = DEFAULTS.iface }) {
  if (!NAME.test(name)) throw new Error("peer name must be 1-32 characters: lowercase letters, digits, dashes");
  checkOpts({ iface });
  return `set -eu
rm -f /etc/wireguard/peers/${name}.peer
{ cat /etc/wireguard/${iface}.base; for p in /etc/wireguard/peers/*.peer; do [ -f "$p" ] && cat "$p"; done; } > /etc/wireguard/${iface}.conf
wg syncconf ${iface} <(wg-quick strip ${iface}) && echo "peer '${name}' removed"
`;
}

export const peersScript = (iface = DEFAULTS.iface) => { checkOpts({ iface }); return `set -eu
for f in /etc/wireguard/peers/*.peer; do [ -f "$f" ] || continue; n=$(basename "$f" .peer); ip=$(grep AllowedIPs "$f" | awk '{print $3}'); pub=$(grep PublicKey "$f" | awk '{print $3}')
hs=$(wg show ${iface} latest-handshakes 2>/dev/null | awk -v k="$pub" '$1==k{print $2}'); echo "$n $ip handshake=\${hs:-never}"; done
echo "---"; wg show ${iface} 2>/dev/null | head -4; ufw status | head -8
`; };

/** Run a script on the server as the SSH user (root, or passwordless sudo), returning stdout. */
export async function runOnServer(remote, script, { onLog, timeout = 900_000 } = {}) {
  const p = await prepareRemote(remote, "vpn");
  try {
    const sudo = remote.username === "root" ? "" : "sudo -n ";
    const out = await captureWithInput(path.join(p.dir, "ssh"), ["-p", String(remote.port), `${remote.username}@${remote.host}`, `${sudo}bash -s`], { input: script, timeout, env: p.env });
    if (out === null) throw new Error("the server script failed (see the output above)");
    return out;
  } finally { await p.cleanup(); }
}
