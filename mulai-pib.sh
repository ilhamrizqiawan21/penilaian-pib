#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PIB_PORT="${PIB_PORT:-3000}"
PIB_HOST="${PIB_HOST:-127.0.0.1}"
PIB_NO_BROWSER="${PIB_NO_BROWSER:-0}"
ENV_FILE="$ROOT_DIR/.env.local"
BUILD_MARKER="$ROOT_DIR/.next-prod/BUILD_ID"
NEXT_BIN="$ROOT_DIR/node_modules/.bin/next"
TSX_BIN="$ROOT_DIR/node_modules/.bin/tsx"

cd "$ROOT_DIR"

fail() {
  echo "[PIB] Error: $*" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Node.js belum terpasang. Gunakan Node.js 24.x."
command -v npm >/dev/null 2>&1 || fail "npm belum tersedia."
command -v curl >/dev/null 2>&1 || fail "curl belum terpasang dan diperlukan untuk memeriksa kesiapan server."

open_browser() {
  if [[ "$PIB_NO_BROWSER" != "1" ]] && command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://$PIB_HOST:$PIB_PORT" >/dev/null 2>&1 &
  fi
}

node -e 'const major=Number(process.versions.node.split(".")[0]); if(major !== 24) process.exit(1)' \
  || fail "Node.js 24.x diperlukan. Versi saat ini: $(node --version)"

if [[ ! -x "$NEXT_BIN" ]]; then
  echo "[PIB] Dependency belum tersedia, memasang package..."
  npm ci
fi

if [[ ! -f "$ENV_FILE" && ! -f "$ROOT_DIR/.env" ]]; then
  echo "[PIB] Membuat konfigurasi lokal dan secret session..."
  node -e 'const fs=require("node:fs"),crypto=require("node:crypto"),file=process.argv[1]; fs.writeFileSync(file, `DATABASE_URL="file:./pib.sqlite"\nSESSION_SECRET="${crypto.randomBytes(32).toString("hex")}"\n`, {mode:0o600})' "$ENV_FILE"
fi

if [[ ! -f "$ROOT_DIR/pib.sqlite" && -x "$TSX_BIN" ]]; then
  echo "[PIB] Menyiapkan database awal..."
  "$TSX_BIN" scripts/setup-db.ts
fi

build_required=0
if [[ ! -f "$BUILD_MARKER" ]]; then
  build_required=1
elif find app lib public scripts middleware.ts next.config.ts package.json package-lock.json \
    -type f -newer "$BUILD_MARKER" -print -quit | grep -q .; then
  build_required=1
fi

if [[ "$build_required" == "1" ]]; then
  echo "[PIB] Menyiapkan versi production..."
  "$NEXT_BIN" build
fi

if curl --silent --fail --max-time 2 "http://$PIB_HOST:$PIB_PORT/" >/dev/null 2>&1; then
  echo "[PIB] Aplikasi sudah berjalan: http://$PIB_HOST:$PIB_PORT"
  open_browser
  exit 0
fi

echo "[PIB] Menjalankan PIB Penilaian di http://$PIB_HOST:$PIB_PORT"
"$NEXT_BIN" start -H "$PIB_HOST" -p "$PIB_PORT" &
server_pid=$!
cleanup() {
  kill "$server_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

for attempt in {1..30}; do
  if curl --silent --fail --max-time 1 "http://$PIB_HOST:$PIB_PORT/" >/dev/null 2>&1; then
    open_browser
    echo "[PIB] Siap. Tekan Ctrl+C untuk menghentikan aplikasi."
    break
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid" || true
    fail "Server tidak dapat dijalankan. Periksa pesan error di atas."
  fi
  sleep 1
  if [[ "$attempt" == "30" ]]; then
    fail "Server tidak merespons dalam 30 detik."
  fi
done

wait "$server_pid"
