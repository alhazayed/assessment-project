#!/usr/bin/env bash
# Boots a throwaway Postgres 16, applies the Supabase stand-ins and every
# migration in order, then runs a test file (default: launch_blocker_access.sql).
# Usage: bash supabase/tests/run.sh [test-file.sql]
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PORT=${PGPORT:-5435}
OWNER=${PG_OWNER:-postgres}   # postgres refuses to run as root
HERE="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS="$HERE/../migrations"
TEST="$HERE/${1:-launch_blocker_access.sql}"
PGDATA=$(mktemp -d)
SOCK=$(mktemp -d)

cleanup() { runuser -u "$OWNER" -- "$PGBIN/pg_ctl" -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$PGDATA" "$SOCK"; }
trap cleanup EXIT

chown "$OWNER":"$OWNER" "$PGDATA" "$SOCK"
runuser -u "$OWNER" -- "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust >/dev/null
runuser -u "$OWNER" -- "$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -w start >/dev/null

PSQL=(psql -h "$SOCK" -p "$PORT" -U postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -c "alter database postgres set search_path = public, extensions" >/dev/null
"${PSQL[@]}" -f "$HERE/supabase_stub.sql" >/dev/null 2>&1

for f in "$MIGRATIONS"/*.sql; do
  "${PSQL[@]}" --single-transaction -f "$f" >/dev/null || { echo "MIGRATION FAILED: $(basename "$f")"; exit 1; }
done

if "${PSQL[@]}" -t -f "$TEST" 2>&1 | sed -n -e 's/.*NOTICE:  //p' -e 's/.*ERROR:  /ERROR: /p'; [ "${PIPESTATUS[0]}" -eq 0 ]; then
  echo "LAUNCH BLOCKER CHECKS: PASS"
else
  echo "LAUNCH BLOCKER CHECKS: FAIL"; exit 1
fi
