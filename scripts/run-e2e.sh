#!/usr/bin/env bash
set -euo pipefail

npm run build
npx astro preview --background --host 127.0.0.1 --port 4321 >/tmp/jcore-preview.log 2>&1
trap 'npx astro preview stop >/dev/null 2>&1 || true' EXIT
npx playwright test "$@"
