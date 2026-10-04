#!/bin/sh
# RedTeam Labs runner installer (Linux / macOS).
#
#   curl -fsSL https://labs.rusecure.in/install.sh | sh
#   wget -qO-  https://labs.rusecure.in/install.sh | sh
#
# Downloads the `rtlab` CLI (pure Node, no npm dependencies), installs it under
# ~/.rtlab-cli, and drops a `rtlab` launcher on your PATH. After this you can run:
#
#   rtlab agent enroll --url https://<your-app> --code <one-time code> --name lab-host
#   rtlab agent run
#
# Override anything with env vars:
#   RTLAB_REPO        git/tarball source      (default: offsec-ttps/redteam-labs on GitHub)
#   RTLAB_REF         branch / tag / commit   (default: main)
#   RTLAB_INSTALL_DIR where the source lives  (default: ~/.rtlab-cli)
#   RTLAB_BIN_DIR     where the launcher goes (default: ~/.local/bin)
set -eu

REPO="${RTLAB_REPO:-offsec-ttps/redteam-labs}"
REF="${RTLAB_REF:-main}"
INSTALL_DIR="${RTLAB_INSTALL_DIR:-$HOME/.rtlab-cli}"
BIN_DIR="${RTLAB_BIN_DIR:-$HOME/.local/bin}"

info() { printf '\033[36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mwarning:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# ── prerequisites ─────────────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || die "Node.js is required (>= 20). Install it from https://nodejs.org and re-run."
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
[ "$NODE_MAJOR" -ge 20 ] 2>/dev/null || die "Node.js >= 20 is required (found $(node -v 2>/dev/null || echo none))."

if command -v curl >/dev/null 2>&1; then DL="curl -fsSL"; DL_O="curl -fsSL -o";
elif command -v wget >/dev/null 2>&1; then DL="wget -qO-"; DL_O="wget -qO";
else die "need either curl or wget to download rtlab."; fi

# ── fetch the source tree ─────────────────────────────────────────────────────
TMP=$(mktemp -d "${TMPDIR:-/tmp}/rtlab.XXXXXX")
trap 'rm -rf "$TMP"' EXIT INT TERM

if command -v git >/dev/null 2>&1 && [ "${RTLAB_NO_GIT:-}" != "1" ]; then
  info "Fetching rtlab ($REPO@$REF) with git"
  git clone --quiet --depth 1 --branch "$REF" "https://github.com/$REPO.git" "$TMP/src" 2>/dev/null \
    || git clone --quiet --depth 1 "https://github.com/$REPO.git" "$TMP/src" \
    || die "git clone failed. Set RTLAB_NO_GIT=1 to use a tarball instead."
  SRC="$TMP/src"
else
  info "Downloading rtlab ($REPO@$REF) tarball"
  $DL_O "$TMP/rtlab.tar.gz" "https://codeload.github.com/$REPO/tar.gz/$REF" \
    || die "download failed from https://codeload.github.com/$REPO/tar.gz/$REF"
  mkdir -p "$TMP/x"
  tar -xzf "$TMP/rtlab.tar.gz" -C "$TMP/x" || die "could not extract the tarball."
  SRC=$(find "$TMP/x" -mindepth 1 -maxdepth 1 -type d | head -n 1)
  [ -n "$SRC" ] || die "unexpected tarball layout."
fi

[ -f "$SRC/bin/rtlab.mjs" ] || die "downloaded source is missing bin/rtlab.mjs — is RTLAB_REPO correct?"

# ── install ───────────────────────────────────────────────────────────────────
info "Installing to $INSTALL_DIR"
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
# copy contents (portable across tar/cp versions)
( cd "$SRC" && tar -cf - . ) | ( cd "$INSTALL_DIR" && tar -xf - )
chmod +x "$INSTALL_DIR/bin/rtlab.mjs" 2>/dev/null || true

mkdir -p "$BIN_DIR"
LAUNCHER="$BIN_DIR/rtlab"
cat > "$LAUNCHER" <<EOF
#!/bin/sh
exec node "$INSTALL_DIR/bin/rtlab.mjs" "\$@"
EOF
chmod +x "$LAUNCHER"

info "Installed: $LAUNCHER"

# ── PATH hint ─────────────────────────────────────────────────────────────────
case ":$PATH:" in
  *":$BIN_DIR:"*) PATH_OK=1 ;;
  *) PATH_OK=0 ;;
esac

echo
info "rtlab is ready."
if [ "$PATH_OK" -ne 1 ]; then
  warn "$BIN_DIR is not on your PATH. Add it, then open a new shell:"
  printf '    echo '\''export PATH="%s:$PATH"'\'' >> ~/.profile && export PATH="%s:$PATH"\n\n' "$BIN_DIR" "$BIN_DIR"
fi
cat <<EOF
Next: enroll this machine as a runner, then start it.

    rtlab agent enroll --url https://<your-app> --code <one-time code> --name lab-host
    rtlab agent run

(copy the exact enroll command, with your code, from the Runners page in the web app)
EOF
