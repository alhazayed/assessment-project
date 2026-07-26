#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Local Supabase convenience wrapper for V Welfare development.
#
# The tracked migrations in supabase/migrations now apply cleanly to a fresh
# database (the forward-FK ordering in schema_baseline, the broken admin-matview
# migration, and the missing signup trigger have all been fixed), so this is a
# thin wrapper around the Supabase CLI — no more throwaway-copy workarounds.
#
# Usage:
#   ./scripts/dev-local-supabase.sh start   # start (default)
#   ./scripts/dev-local-supabase.sh stop [--no-backup]
#   ./scripts/dev-local-supabase.sh status
# ---------------------------------------------------------------------------
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
CMD="${1:-start}"

case "$CMD" in
  start)  supabase start ;;
  stop)   supabase stop "${@:2}" ;;
  status) supabase status ;;
  *) echo "Usage: $0 {start|stop|status}" >&2; exit 1 ;;
esac
