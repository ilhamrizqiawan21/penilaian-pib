#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
[[ "$(uname -m)" == "x86_64" ]] || { echo 'Installer ini membutuhkan Linux x86_64.' >&2; exit 1; }
NODE_VERSION="$(tr -d '[:space:]' < .nvmrc)"
RUNTIME="$ROOT_DIR/.runtime/node-v${NODE_VERSION}-linux-x64"
if [[ ! -x "$RUNTIME/bin/node" ]]; then
  DOWNLOAD_DIR="$(mktemp -d)"
  trap 'rm -rf -- "$DOWNLOAD_DIR"' EXIT
  ARCHIVE="node-v${NODE_VERSION}-linux-x64.tar.xz"
  curl -fSL --retry 3 --connect-timeout 15 --max-time 1800 "https://nodejs.org/dist/v${NODE_VERSION}/$ARCHIVE" -o "$DOWNLOAD_DIR/$ARCHIVE"
  curl -fsSL --retry 3 --connect-timeout 15 --max-time 60 "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" -o "$DOWNLOAD_DIR/SHASUMS256.txt"
  (cd "$DOWNLOAD_DIR"; awk -v name="$ARCHIVE" '$2 == name' SHASUMS256.txt > CHECKSUM; test -s CHECKSUM; sha256sum -c CHECKSUM)
  mkdir -p .runtime
  tar -xJf "$DOWNLOAD_DIR/$ARCHIVE" -C .runtime
fi
export PATH="$RUNTIME/bin:$PATH"
npm ci
node <<'JS'
const fs = require('node:fs'), crypto = require('node:crypto');
if (!fs.existsSync('.env.local') && !fs.existsSync('.env')) {
  fs.writeFileSync('.env.local', `DATABASE_URL="file:./pib.sqlite"\nSESSION_SECRET="${crypto.randomBytes(32).toString('hex')}"\n`, {mode: 0o600, flag: 'wx'});
}
JS
if [[ ! -f pib.sqlite ]]; then npm run db:setup; fi
npm run check
mkdir -p "$HOME/.config/systemd/user"
python3 - "$ROOT_DIR" "$HOME/.config/systemd/user/pib-penilaian.service" <<'PY'
import pathlib,sys
root,destination=sys.argv[1:]
def quote(value):
    return '"'+value.replace('\\','\\\\').replace('"','\\"').replace('%','%%')+'"'
template=pathlib.Path(root,'deploy/pib-penilaian.service').read_text()
template=template.replace('WorkingDirectory=%h/Projects/penilaian-pib','WorkingDirectory='+root.replace('%','%%'))
template=template.replace('ExecStart=%h/Projects/penilaian-pib/mulai-pib.sh','ExecStart='+quote(root+'/mulai-pib.sh'))
pathlib.Path(destination).write_text(template)
PY
loginctl enable-linger "$(id -un)"
systemctl --user daemon-reload
systemctl --user enable pib-penilaian.service
systemctl --user restart pib-penilaian.service
for attempt in {1..30}; do
  if curl -fsS --max-time 2 http://127.0.0.1:3000/ >/dev/null; then
    systemctl --user is-active pib-penilaian.service
    echo 'Siap: http://localhost:3000 — autostart saat boot aktif.'
    exit 0
  fi
  sleep 1
done
journalctl --user -u pib-penilaian.service -n 40 --no-pager
exit 1
