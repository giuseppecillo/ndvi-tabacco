#!/usr/bin/env bash
# Synthetic local PostgreSQL only. Never reads DATABASE_URL or a password.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
if [[ "${NITROCROP_ISOLATED_ENV:-}" != "yes" ]]; then
  exec env -i PATH="$PATH" HOME="$HOME" NITROCROP_ISOLATED_ENV=yes bash "$0"
fi
for bin in postgres initdb pg_ctl psql node pnpm; do command -v "$bin" >/dev/null; done
postgres --version
work="$(mktemp -d /tmp/nitrocrop-synthetic.XXXXXXXX)"
chmod 700 "$work"
cleanup() {
  if [[ -f "$work/data/postmaster.pid" ]]; then
    if ! pg_ctl -D "$work/data" -m immediate -w stop >/dev/null 2>&1; then
      echo "ERROR: synthetic server cleanup failed; retained at $work" >&2
      return 1
    fi
  fi
  rm -rf -- "$work"
}
trap cleanup EXIT
initdb -D "$work/data" -U nitrocrop_test_admin --auth-local=trust \
  --auth-host=reject --no-locale --encoding=UTF8 >"$work/init.log"
pg_ctl -D "$work/data" -l "$work/server.log" \
  -o "-c listen_addresses='' -c unix_socket_directories='$work' -c unix_socket_permissions=0700 -p 55439" \
  -w start >/dev/null
pnpm --filter @workspace/api-server exec esbuild \
  ../../lib/db/migration-preparation/tests/synthetic.test.ts \
  --bundle --platform=node --format=cjs --outfile="$work/test.cjs" >/dev/null
node "$work/test.cjs" "$work"
