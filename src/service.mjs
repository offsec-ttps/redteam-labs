// `rtlab agent install-service`: run the runner under systemd so it survives crashes, logouts and reboots.
// A user unit (systemctl --user, with lingering) when not root; a system unit when root. Linux only.
import { writeFile, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { run, has, capture } from "./run.mjs";

const UNIT = "rtlab-agent.service";
const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../bin/rtlab.mjs");

function scope() {
  if (process.platform !== "linux") throw new Error("the service installer supports Linux (systemd) only; on macOS/Windows keep `rtlab agent run` in a terminal or a login item");
  return process.getuid?.() === 0 ? "system" : "user";
}
const unitPath = (sc) => sc === "system" ? `/etc/systemd/system/${UNIT}` : path.join(os.homedir(), ".config", "systemd", "user", UNIT);
const sysctl = (sc, args, timeout = 60_000) => run("systemctl", sc === "system" ? args : ["--user", ...args], { timeout });

export function unitFile({ node = process.execPath, cli = CLI, home = os.homedir(), extraEnv = [] } = {}) {
  return [
    "[Unit]", "Description=BreakPoint Labs runner (rtlab agent)", "After=network-online.target", "Wants=network-online.target", "",
    "[Service]", "Type=simple", `ExecStart=${node} ${cli} agent run`, `WorkingDirectory=${home}`, "Restart=always", "RestartSec=5",
    "Environment=NODE_ENV=production", ...extraEnv.map((e) => `Environment=${e}`), "",
    "[Install]", "WantedBy=default.target", "",
  ].join("\n");
}

export async function installService({ onLog } = {}) {
  if (!(await has("systemctl"))) throw new Error("systemctl not found: this machine does not use systemd");
  const sc = scope();
  const file = unitPath(sc);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, unitFile(), { mode: 0o644 });
  onLog?.(`wrote ${file}`);
  if (sc === "user") {
    // Lingering keeps user services running when nobody is logged in (a headless lab host).
    await run("loginctl", ["enable-linger", os.userInfo().username], { timeout: 30_000 }).catch(() => onLog?.("could not enable lingering; the service stops when you log out (run: sudo loginctl enable-linger $USER)"));
  }
  await sysctl(sc, ["daemon-reload"]);
  await sysctl(sc, ["enable", "--now", UNIT]);
  const active = (await capture("systemctl", sc === "system" ? ["is-active", UNIT] : ["--user", "is-active", UNIT], 15_000)) || "unknown";
  return { unit: UNIT, scope: sc, file, active, logs: sc === "system" ? `journalctl -u ${UNIT} -f` : `journalctl --user -u ${UNIT} -f` };
}

export async function uninstallService({ onLog } = {}) {
  const sc = scope();
  await sysctl(sc, ["disable", "--now", UNIT]).catch(() => {});
  await rm(unitPath(sc), { force: true });
  await sysctl(sc, ["daemon-reload"]).catch(() => {});
  onLog?.(`removed ${unitPath(sc)}`);
  return { unit: UNIT, scope: sc };
}
