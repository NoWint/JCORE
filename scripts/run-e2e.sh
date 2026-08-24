#!/usr/bin/env bash
set -euo pipefail

npm run build:search

port="${JCORE_E2E_PORT:-4321}"
while lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
  port=$((port + 1))
done

export PLAYWRIGHT_BASE_URL="http://127.0.0.1:${port}"
npx astro preview --background --host 127.0.0.1 --port "$port" >/tmp/jcore-preview.log 2>&1
trap 'npx astro preview stop >/dev/null 2>&1 || true' EXIT
npx playwright test "$@"
