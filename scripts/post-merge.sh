#!/bin/bash
set -euo pipefail
pnpm install --frozen-lockfile
# No database commands here. Workflow reconciliation restarts the API, whose
# startup performs read-only schema verification and fails instead of repairing.
