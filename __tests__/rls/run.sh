#!/usr/bin/env bash
# Boot an ephemeral Postgres, apply the RLS isolation test, report pass/fail.
# Requires: postgresql-16 binaries + a non-root user to own the cluster.
# Usage: bash __tests__/rls/run.sh
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=$(mktemp -d)
PORT=${PGPORT:-5433}
OWNER=${PG_OWNER:-postgres}   # system user to run the cluster as (postgres refuses root)
SQL="$(cd "$(dirname "$0")" && pwd)/rls_isolation.test.sql"

cleanup() { runuser -u "$OWNER" -- "$PGBIN/pg_ctl" -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$PGDATA"; }
trap cleanup EXIT

chown "$OWNER":"$OWNER" "$PGDATA"
runuser -u "$OWNER" -- "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust >/dev/null
runuser -u "$OWNER" -- "$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -c listen_addresses=localhost" -w start >/dev/null

if psql -h localhost -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -f "$SQL"; then
  echo "RLS ISOLATION: PASS"
else
  echo "RLS ISOLATION: FAIL"; exit 1
fi
