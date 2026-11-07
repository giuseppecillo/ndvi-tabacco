#!/usr/bin/env bash
# Disposable synthetic PostgreSQL, Unix socket only; never connects to application DBs.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
if [[ "${NITROCROP_BACKUP_OFFLINE:-}" != "yes" ]]; then
  exec env -i PATH="$PATH" NITROCROP_BACKUP_OFFLINE=yes bash "$0"
fi
for bin in initdb pg_ctl psql pg_dump pg_restore age age-keygen node; do
  command -v "$bin" >/dev/null
done
work="$(mktemp -d /tmp/nitrocrop-backup-preflight.XXXXXXXX)"
chmod 700 "$work"
cleanup() {
  if [[ -f "$work/data/postmaster.pid" ]]; then
    if ! pg_ctl -D "$work/data" -m immediate -w stop >/dev/null 2>&1; then
      echo "ERROR: disposable synthetic server cleanup failed." >&2
      return 1
    fi
  fi
  rm -rf -- "$work"
}
trap cleanup EXIT
initdb -D "$work/data" -U backup_synthetic --auth-local=trust \
  --auth-host=reject --no-locale --encoding=UTF8 >"$work/init.log"
pg_ctl -D "$work/data" -l "$work/server.log" \
  -o "-c listen_addresses='' -c unix_socket_directories='$work' -c unix_socket_permissions=0700 -p 55440" \
  -w start >/dev/null
export NITROCROP_SYNTHETIC_SOCKET="$work"
node --test lib/db/migration-preparation/backup/source-guard.test.mjs \
  lib/db/migration-preparation/backup/pipeline.test.mjs
