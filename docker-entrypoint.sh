#!/bin/sh
set -e

# Applies any pending schema migrations before the app starts, so updates
# (docker compose pull && docker compose up -d) never leave the DB out of sync.
npx prisma migrate deploy

exec "$@"
