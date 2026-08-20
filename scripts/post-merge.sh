#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Applica le modifiche additive allo schema (incluse le colonne delle osservazioni)
# prima che la riconciliazione riavvii i servizi.
pnpm --filter @workspace/db run push-deployment
