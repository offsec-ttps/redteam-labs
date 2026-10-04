# RedTeam Labs runner installer (Windows, PowerShell).
#
#   irm https://labs.rusecure.in/install.ps1 | iex
#
# Downloads the `rtlab` CLI (pure Node, no npm dependencies), installs it under
# %LOCALAPPDATA%\rtlab-cli, and drops a `rtlab.cmd` launcher on your PATH. Then:
#
#   rtlab agent enroll --url https://<your-app> --code <one-time code> --name lab-host
#   rtlab agent run
#
# Override with env vars: RTLAB_REPO, RTLAB_REF, RTLAB_INSTALL_DIR, RTLAB_BIN_DIR.
$ErrorActionPreference = "Stop"

$Repo       = if ($env:RTLAB_REPO)        { $env:RTLAB_REPO }        else { "offsec-ttps/redteam-labs" }
$Ref        = if ($env:RTLAB_REF)         { $env:RTLAB_REF }         else { "main" }
$InstallDir = if ($env:RTLAB_INSTALL_DIR) { $env:RTLAB_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "rtlab-cli" }
$BinDir     = if ($env:RTLAB_BIN_DIR)     { $env:RTLAB_BIN_DIR }     else { Join-Path $env:LOCALAPPDATA "Programs\rtlab" }

function Info($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "warning: $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "error: $m" -ForegroundColor Red; exit 1 }

# ── prerequisites ─────────────────────────────────────────────────────────────
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Die "Node.js is required (>= 20). Install it from https://nodejs.org and re-run." }
$major = [int](& node -p "process.versions.node.split('.')[0]")
if ($major -lt 20) { Die "Node.js >= 20 is required (found $(& node -v))." }

# ── fetch the source tarball ──────────────────────────────────────────────────
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("rtlab-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
try {
  $tarball = Join-Path $tmp "rtlab.tar.gz"
  Info "Downloading rtlab ($Repo@$Ref)"
  Invoke-WebRequest -UseBasicParsing -Uri "https://codeload.github.com/$Repo/tar.gz/$Ref" -OutFile $tarball

  # tar ships with Windows 10+ (bsdtar); use it to extract the .tar.gz
  if (-not (Get-Command tar -ErrorAction SilentlyContinue)) { Die "the 'tar' command is required (built in on Windows 10+)." }
  $extract = Join-Path $tmp "x"
  New-Item -ItemType Directory -Path $extract -Force | Out-Null
  & tar -xzf $tarball -C $extract
  if ($LASTEXITCODE -ne 0) { Die "could not extract the tarball." }

  $src = Get-ChildItem -Path $extract -Directory | Select-Object -First 1
  if (-not $src -or -not (Test-Path (Join-Path $src.FullName "bin\rtlab.mjs"))) {
    Die "downloaded source is missing bin\rtlab.mjs - is RTLAB_REPO correct?"
  }

  # ── install ─────────────────────────────────────────────────────────────────
  Info "Installing to $InstallDir"
  if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  Copy-Item -Path (Join-Path $src.FullName "*") -Destination $InstallDir -Recurse -Force

  New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
  $launcher = Join-Path $BinDir "rtlab.cmd"
  $cliPath  = Join-Path $InstallDir "bin\rtlab.mjs"
  "@echo off`r`nnode `"$cliPath`" %*`r`n" | Set-Content -Path $launcher -Encoding ASCII
  Info "Installed: $launcher"
}
finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

# ── PATH (persist for the user) ───────────────────────────────────────────────
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (($userPath -split ';') -notcontains $BinDir) {
  [Environment]::SetEnvironmentVariable("Path", ($userPath.TrimEnd(';') + ";" + $BinDir), "User")
  $env:Path = $env:Path + ";" + $BinDir
  Warn "Added $BinDir to your user PATH. Open a NEW terminal for `rtlab` to be found everywhere."
}

Write-Host ""
Info "rtlab is ready."
Write-Host @"
Next: enroll this machine as a runner, then start it.

    rtlab agent enroll --url https://<your-app> --code <one-time code> --name lab-host
    rtlab agent run

(copy the exact enroll command, with your code, from the Runners page in the web app)
"@
