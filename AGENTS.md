# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
V Welfare is a bilingual (Arabic/English, RTL-aware) mental-health assessment platform.
- **Web app**: Next.js 16 (App Router, Turbopack) + React 19 at the repo root, backed by **Supabase** (Postgres + Auth + RLS). This is the primary product.
- **Mobile**: separate Expo/Capacitor apps under `mobile/` and `capacitor/` (own `package.json`s) — not needed to run the web app.

### Standard commands (already documented in `package.json` / CI)
`npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, and offline tests `npm run test:security:unit` (also `test:security`, `test:radar`). The web CI gate `.github/workflows/ci.yml` runs lint → typecheck → `test:security:unit` → build, and builds with **placeholder** `NEXT_PUBLIC_SUPABASE_*` env (no live backend needed for lint/typecheck/test/build).

### Local env file
Copy the committed sample: `cp env.local.sample .env.local`. It contains only local, non-secret defaults (local Supabase demo keys, Cloudflare Turnstile test keys, throwaway admin PIN). `.env.local` itself is git-ignored.

### Running the full stack locally (non-obvious — read before starting services)
Prerequisites present in the Cloud environment: **Docker** (daemon must be running: `sudo dockerd` in the background if `docker ps` fails) and the **Supabase CLI** (`supabase`). If either is missing, install Docker (this dind host needs `storage-driver: fuse-overlayfs`, `containerd-snapshotter: false`, and `iptables-legacy`) and the Supabase CLI release tarball (it ships two binaries: `supabase` **and** `supabase-go` — install both onto PATH).

Startup sequence:
1. `./scripts/dev-local-supabase.sh start` — starts local Supabase (API at `http://127.0.0.1:54321`, Studio at `:54323`).
2. `PORT=3001 npm run dev` — Next.js dev server on **3001** (not 3000).
3. `node scripts/dev-proxy.mjs` — same-origin reverse proxy on **3000**.
4. Open the app at **http://localhost:3000** (always use the proxy origin, never 3001 directly).

### Helper scripts and the important gotchas
- **`scripts/dev-local-supabase.sh`** — thin wrapper around the Supabase CLI (`start`/`stop`/`status`). The tracked migrations now apply cleanly to a fresh database; you can also just run `supabase start` directly.
  - Migration history is mostly stubs: the first 72 migrations (and the core assessment-content **seed** migrations) are 2-line placeholders ("applied directly to remote"); the real schema is `supabase/migrations/20260619120000_schema_baseline.sql`. Earlier fresh-rebuild bugs (a forward FK in the baseline, a broken `20260627220000_admin_dashboard_materialized_views.sql` referencing non-existent `profiles.user_type/full_name/email` with syntax errors, and a signup trigger dropped by `20260619210813`) have been **fixed** in the migration files, plus `20260726120000_ensure_signup_trigger.sql` and `20260726120100_fix_admin_matview_drift.sql`.
  - Consequence of the stubbed seeds: a fresh local DB has **0 `assessment_definitions` / `assessment_items`** (that content lives only on the hosted DB, not in git). `packages` are seeded (27). Auth/registration/dashboard work fully; taking a real assessment needs seed data that isn't in the repo.
- **`scripts/dev-proxy.mjs`** — `middleware.ts` sets a strict CSP whose `connect-src` only allows `'self'` and `https://*.supabase.co`, so the browser cannot reach local Supabase at `127.0.0.1:54321`. The proxy serves Next.js and Supabase from one origin (port 3000) so all Supabase calls are same-origin. This is why `NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000` in the sample env.

### Alternative backend
To skip local Supabase, point `NEXT_PUBLIC_SUPABASE_URL` at a hosted `*.supabase.co` project (the app's intended deployment target) — that host satisfies the CSP, so the dev proxy is not needed in that case.

### Other notes
- CAPTCHA: local uses Cloudflare's auto-pass **test** keys. Without a Turnstile site key the register page errors, because it calls `window.turnstile.getResponse()` unguarded when the Cloudflare script has loaded.
- Signup rate limiting is stored in the `rate_limit_log` table (Upstash Redis is optional); a fresh Supabase start clears it. A stale "Too many signup attempts" banner can linger client-side after failed attempts but does not block a subsequent successful signup on a fresh DB.
