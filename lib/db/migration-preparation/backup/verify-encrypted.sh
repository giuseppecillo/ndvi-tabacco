#!/usr/bin/env bash
# Reads an already-authorized encrypted archive only; never connects to a database.
set -euo pipefail
if [[ $# != 3 || "$1" != "--authorized-verify-encrypted-archive" ]]; then
  echo "BLOCKED: encrypted archive verification requires explicit approval." >&2
  exit 1
fi
identity="$2"
archive="$3"
if [[ ! -f "$identity" || ! -f "$archive" ]]; then
  echo "BLOCKED: approved archive/identity missing." >&2
  exit 1
fi
if env -i PATH="$PATH" timeout 300 bash -c '
  set -euo pipefail
  age --decrypt --identity "$1" "$2" 2>/dev/null |
    pg_restore --file=/dev/null 2>/dev/null
' -- "$identity" "$archive"; then
  echo "ENCRYPTED_ARCHIVE_DECRYPTED_AND_FULLY_PARSED_NO_DATABASE_CONNECTION"
else
  echo "BLOCKED: decryption/authentication/archive parsing failed; no valid backup claimed." >&2
  exit 1
fi
