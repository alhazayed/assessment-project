#!/usr/bin/env bash
# Boot an ephemeral Postgres, run the submit_assessment_atomic regression test.
set -euo pipefail
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=$(mktemp -d)
PORT=${PGPORT:-5434}
OWNER=${PG_OWNER:-postgres}
SQL="$(cd "$(dirname "$0")" && pwd)/submit_assessment_atomic.test.sql"
cleanup() { runuser -u "$OWNER" -- "$PGBIN/pg_ctl" -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$PGDATA"; }
trap cleanup EXIT
chown "$OWNER":"$OWNER" "$PGDATA"
runuser -u "$OWNER" -- "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust >/dev/null
runuser -u "$OWNER" -- "$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -c listen_addresses=localhost" -w start >/dev/null
if psql -h localhost -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -f "$SQL"; then
  echo "SUBMIT_ATOMIC: PASS"
else
  echo "SUBMIT_ATOMIC: FAIL"; exit 1
fi
