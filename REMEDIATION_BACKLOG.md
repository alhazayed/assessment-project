# Remediation Execution Backlog
Generated: 2026-06-24 | Branch: `claude/project-functionality-UDm55`

---

## Already Closed (Skip)
- S1 Clinical-note POST authorization — fixed (assignment check added)
- S4 PHI scrubber ordering — fixed (Saudi ID/ISO DOB now precede phone rule)
- S7 Admin HMAC derives from PIN — fixed (`ADMIN_SESSION_SECRET` in use)
- I1 vercel.json stale routes — fixed (only `clinical-notes` maxDuration remains)
- DB1 Migrations absent from source — fixed (supabase/migrations/ committed)
- Rate limits on clinical-notes POST, delete-request, assignments, notify-message — fixed
- Gemini 15s timeout + retry — fixed
- Auth open-redirect hardening — fixed
- Clinician-patient consent system — implemented (PR #16)

---

## Phase 1 — Critical Production Blockers

### P1-1 · AI Draft button calls PUT /api/clinical-notes which returns 405
**Root cause:** `generateAiDraft()` in `patients-content.tsx:186` calls `PUT /api/clinical-notes`; no PUT handler exists in `app/api/clinical-notes/route.ts`.

**Exact code changes:**

`app/api/clinical-notes/route.ts` — add PUT handler after DELETE:
```ts
export async function PUT(request: Request) {
  const ctx = await requireClinician()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, supabase } = ctx

  const rl = await checkRateLimit(`ai-draft:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { patient_id } = await request.json()
  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  // Auth guard — same assignment check as GET/POST
  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role === 'clinician') {
    const { data: patientProfile } = await supabase
      .from('profiles').select('assigned_clinician_id').eq('id', patient_id).single()
    if (patientProfile?.assigned_clinician_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch patient context for the draft
  const [{ data: submissions }, { data: moods }] = await Promise.all([
    supabase.from('assessment_submissions')
      .select('severity_band, submitted_at, assessment_definitions(name_en)')
      .eq('patient_id', patient_id).order('submitted_at', { ascending: false }).limit(5),
    supabase.from('mood_logs')
      .select('mood_score, log_date').eq('patient_id', patient_id)
      .order('log_date', { ascending: false }).limit(7),
  ])

  const context = `Recent assessments: ${JSON.stringify(submissions ?? [])}. Recent mood logs: ${JSON.stringify(moods ?? [])}.`
  const { callGemini } = await import('@/lib/gemini')
  const prompt = `You are a mental health clinician writing a brief clinical note. Based on the following patient data, generate a concise clinical note template (under 200 words). Do not invent facts. Only reflect what the data shows.\n\nPatient data:\n${context}`
  const draft = await callGemini(prompt)

  return NextResponse.json({ draft })
}
```

**Affected files:**
- `app/api/clinical-notes/route.ts`

**DB migration:** None.

**Testing:** POST to `/api/clinical-notes` (PUT) with valid clinician session and assigned patient_id → returns `{ draft: string }`. Unassigned patient_id → 403. Rate > 10/hr → 429.

**Acceptance criteria:** AI Draft button populates textarea with Gemini-generated draft. Button is disabled while loading. No 405 errors in network panel.

**Dependencies:** `lib/gemini.ts` (already has `callGemini` + timeout/retry).

---

### P1-2 · Next.js 14.2.35 — 4 HIGH CVEs (DoS, SSRF, cache poisoning, middleware bypass)
**Root cause:** `next@14.2.35` is pinned below patched versions. CVEs affect core runtime in production.

**Exact code changes:**

```bash
npm install next@14.2.36
```
(Or latest `14.2.x` — run `npm info next versions --json | jq '[.[] | select(startswith("14.2"))] | last'` to find it first.)

`package.json`:
```json
"next": "14.2.36"
```

Run full regression:
```bash
npx tsc --noEmit && npm run lint && npm run build
```

**Affected files:** `package.json`, `package-lock.json`

**DB migration:** None.

**Testing:** `npm audit` should show 0 HIGH for next/eslint-config-next/glob. Vercel preview build must pass.

**Acceptance criteria:** `npm audit --json` reports 0 HIGH vulnerabilities attributable to Next.js. Build succeeds on Vercel preview.

**Dependencies:** None (independent).

---

## Phase 2 — Security Fixes

### P2-1 · Rate limiting is non-atomic (count → insert race condition)
**Root cause:** `lib/rate-limit.ts` does `SELECT count(*) WHERE created_at >= windowStart` then `INSERT` as two separate queries. Concurrent requests can both read `hits < limit` and both insert, bypassing the limit.

**Exact code changes:**

New migration `supabase/migrations/20260624180000_atomic_rate_limit.sql`:
```sql
create or replace function check_and_record_rate_limit(
  p_key text,
  p_window_start timestamptz,
  p_limit int
) returns int language plpgsql security definer as $$
declare
  v_count int;
begin
  -- Acquire advisory lock per key to serialize concurrent checks
  perform pg_advisory_xact_lock(hashtext(p_key));

  select count(*) into v_count
  from rate_limit_log
  where key = p_key and created_at >= p_window_start;

  if v_count < p_limit then
    insert into rate_limit_log(key) values (p_key);
    return v_count + 1; -- new count (allowed)
  else
    return -1; -- denied
  end if;
end;
$$;

-- Ensure index exists for the window scan
create index if not exists idx_rate_limit_key_created
  on rate_limit_log(key, created_at desc);
```

`lib/rate-limit.ts` — replace entire file:
```ts
import { createAdminClient } from '@/lib/supabase/admin'

interface RateLimitOptions {
  limit: number
  windowMs: number
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<{ allowed: boolean; remaining: number }> {
  const db = createAdminClient()
  const windowStart = new Date(Date.now() - options.windowMs).toISOString()

  const { data, error } = await db.rpc('check_and_record_rate_limit', {
    p_key: key,
    p_window_start: windowStart,
    p_limit: options.limit,
  })

  if (error) {
    // Fail open — do not block on DB error, but log
    console.error('rate-limit error:', error)
    return { allowed: true, remaining: 0 }
  }

  const newCount = data as number
  if (newCount === -1) return { allowed: false, remaining: 0 }
  return { allowed: true, remaining: Math.max(0, options.limit - newCount) }
}
```

**Affected files:** `lib/rate-limit.ts`, new migration file.

**DB migration:** `supabase/migrations/20260624180000_atomic_rate_limit.sql`

**RLS changes:** Function is `SECURITY DEFINER` — callable by authenticated and service role.

**Testing:** Fire 5 concurrent requests against a limit-of-3 endpoint. Exactly 3 must succeed; 2 must get 429.

**Acceptance criteria:** Zero race-condition bypasses under concurrent load. `npm run build` passes. Migration applies cleanly.

**Dependencies:** None.

---

### P2-2 · Admin session HMAC cookie has no expiry
**Root cause:** `app/api/admin/login/route.ts` sets `admin_session` cookie but does not set `maxAge` or `expires`. Browser session cookie is lost on close but long-lived in SSO contexts or if browser keeps sessions.

**Exact code changes:**

`app/api/admin/login/route.ts` — in the `cookies().set(...)` call, add:
```ts
response.cookies.set('admin_session', hmac, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 8, // 8 hours
})
```

**Affected files:** `app/api/admin/login/route.ts`

**DB migration:** None.

**Testing:** Log in as admin, wait (or mock) 8 hours, confirm redirect to `/x/control/login`.

**Acceptance criteria:** Admin cookie has `Max-Age=28800` in Set-Cookie header.

**Dependencies:** None.

---

### P2-3 · CSP allows `unsafe-inline` for scripts and styles
**Root cause:** `next.config.js` CSP includes `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'`. These negate XSS protection.

**Exact code changes:**

`next.config.js` — migrate to nonce-based CSP via middleware:

1. `middleware.ts` — generate nonce and set header:
```ts
// At top of middleware, before all checks:
const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
const csp = [
  "default-src 'self'",
  `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`,
  `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

requestHeaders.set('x-nonce', nonce)
requestHeaders.set('content-security-policy', csp)
```

2. `app/layout.tsx` — read nonce from headers and pass to `<Script>` and `<style>`:
```ts
import { headers } from 'next/headers'
// In component:
const nonce = headers().get('x-nonce') ?? ''
// Pass nonce to next/script components: <Script nonce={nonce} ...>
```

3. `next.config.js` — remove hardcoded CSP header block (CSP is now set in middleware).

**Affected files:** `next.config.js`, `middleware.ts`, `app/layout.tsx`

**Testing:** Load page, inspect `Content-Security-Policy` response header → should contain `nonce-<base64>` not `unsafe-inline`. Load Cloudflare Turnstile → must work. No console CSP violations.

**Acceptance criteria:** No `unsafe-inline` in CSP header. Turnstile, Google Fonts, and Supabase realtime all function on Vercel preview.

**Dependencies:** P1-2 (Next.js upgrade) should be done first to ensure middleware nonce support is stable.

---

### P2-4 · Security tests require live server — not CI-executable
**Root cause:** `__tests__/security/*.test.ts` default `BASE_URL` to `http://localhost:3000`. Tests cannot run in CI without a running server.

**Exact code changes:**

`package.json` — add script:
```json
"test:security:ci": "BASE_URL=${VERCEL_PREVIEW_URL:-http://localhost:3000} jest --testPathPattern=security --passWithNoTests"
```

`__tests__/security/setup.ts` (create if absent):
```ts
// Validate that required env vars are set before running IDOR/authz tests
if (!process.env.VICTIM_PATIENT_ID || !process.env.ATTACKER_COOKIE) {
  console.warn('Security tests skipped: VICTIM_PATIENT_ID and ATTACKER_COOKIE not set.')
  process.exit(0)
}
```

`.env.test.example` (new file):
```env
BASE_URL=https://your-preview.vercel.app
VICTIM_PATIENT_ID=<seeded-patient-uuid>
VICTIM_SUBMISSION_ID=<seeded-submission-uuid>
ATTACKER_COOKIE=<attacker-session-cookie>
```

**Affected files:** `package.json`, `__tests__/security/setup.ts` (new), `.env.test.example` (new).

**Testing:** Run `npm run test:security:ci` without env vars → exits 0 with warning. With env vars pointing at Vercel preview → IDOR tests execute and pass.

**Acceptance criteria:** Security tests do not fail CI for missing env. When env is set against a preview URL, tests pass.

---

## Phase 3 — Data Integrity Fixes

### P3-1 · Missing performance-critical database indexes
**Root cause:** Audit SQL recommendations were not yet committed as a migration. High-traffic queries (submission history, notification reads, messages, rate-limit window scan) use sequential scans.

**Exact code changes:**

New migration `supabase/migrations/20260624180100_missing_indexes.sql`:
```sql
-- Assessment submissions: patient history page, dashboard recent
create index if not exists idx_assessment_submissions_patient_submitted
  on assessment_submissions(patient_id, submitted_at desc);

-- Assessment submissions: admin results filtering
create index if not exists idx_assessment_submissions_definition_submitted
  on assessment_submissions(definition_id, submitted_at desc);

-- Notifications: unread count badge (hot path)
create index if not exists idx_notifications_user_read_created
  on notifications(user_id, read_at, created_at desc);

-- Messages: conversation load
create index if not exists idx_messages_patient_clinician_created
  on messages(patient_id, clinician_id, created_at);

-- Mood logs: dashboard + insights
create index if not exists idx_mood_logs_patient_date
  on mood_logs(patient_id, log_date desc);

-- Journal entries: list page
create index if not exists idx_journal_entries_patient_created
  on journal_entries(patient_id, created_at desc);

-- Audit log: admin audit page filter by actor
create index if not exists idx_audit_log_actor_created
  on audit_log(actor_id, created_at desc);
```

**Affected files:** New migration file only.

**DB migration:** `supabase/migrations/20260624180100_missing_indexes.sql`

**Testing:** `EXPLAIN ANALYZE` on `SELECT * FROM assessment_submissions WHERE patient_id = $1 ORDER BY submitted_at DESC LIMIT 5` → should show Index Scan.

**Acceptance criteria:** All seven indexes appear in `pg_indexes`. No sequential scan warnings on instrumented queries.

**Dependencies:** None (additive).

---

### P3-2 · assessment_submissions missing patient_id NOT NULL + ON DELETE CASCADE
**Root cause:** If a patient is hard-deleted, orphaned submission rows remain. No DB-level guarantee that `patient_id` is always populated.

**Exact code changes:**

New migration `supabase/migrations/20260624180200_assessment_submissions_constraints.sql`:
```sql
-- Guard against null patient references
alter table assessment_submissions
  alter column patient_id set not null;

-- Cascade deletes so orphan rows are cleaned up automatically
alter table assessment_submissions
  drop constraint if exists assessment_submissions_patient_id_fkey;
alter table assessment_submissions
  add constraint assessment_submissions_patient_id_fkey
  foreign key (patient_id) references profiles(id) on delete cascade;

-- Softer constraint on assignment link — preserve results when assignment deleted
alter table assessment_submissions
  drop constraint if exists assessment_submissions_assignment_id_fkey;
alter table assessment_submissions
  add constraint assessment_submissions_assignment_id_fkey
  foreign key (assignment_id) references assessment_assignments(id) on delete set null;
```

**Affected files:** New migration file only.

**DB migration:** `supabase/migrations/20260624180200_assessment_submissions_constraints.sql`

**Testing:** Attempt to insert a row with `patient_id = null` → should fail with NOT NULL violation. Delete a profile → submissions cascade-delete.

**Acceptance criteria:** Migration applies without error. Constraints visible in `information_schema.table_constraints`.

---

## Phase 4 — UX Improvements

### P4-1 · Inconsistent loading / error / empty states across client pages
**Root cause:** Client components (insights, journal, messages, mood, patients, profile) each implement ad-hoc loading patterns with different strings and no unified error retry UI.

**Exact code changes:**

New component `components/ui/page-states.tsx`:
```tsx
'use client'
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react'

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20 gap-3">
      <div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--brand)' }}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      )}
    </div>
  )
}

export function PageEmpty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Inbox className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  )
}
```

Apply to these files — replace inline loading/error text with `<PageLoading>`, `<PageError onRetry={load}>`, `<PageEmpty>`:
- `app/(app)/insights/page.tsx`
- `app/(app)/journal/page.tsx`
- `app/(app)/messages/page.tsx`
- `app/(app)/mood/mood-content.tsx`
- `app/(app)/patients/patients-content.tsx`
- `app/(app)/profile/page.tsx`

**Affected files:** `components/ui/page-states.tsx` (new) + 6 page files.

**DB migration:** None.

**Testing:** Disconnect network → load each page → should show `<PageError>` with Retry button. Empty state (no data) → should show `<PageEmpty>` with icon. Initial load → should show `<PageLoading>` spinner.

**Acceptance criteria:** All 6 pages use unified components. No page shows blank white screen on error.

---

### P4-2 · React hook missing-dependency warnings (9 warnings across 7 files)
**Root cause:** `useEffect` closures capture stale Supabase client or fetch function references because deps arrays are incomplete.

**Exact code changes — fix pattern (apply to each file):**

For any `useEffect` that uses a local function not in deps:
```ts
// BEFORE
useEffect(() => { load() }, []) // load not in deps

// AFTER — wrap load with useCallback
const load = useCallback(async () => {
  // ... existing load body
}, [supabase]) // list actual deps
useEffect(() => { load() }, [load])
```

For `supabase` client used directly in effect:
```ts
// AFTER — memoize the client
const supabase = useMemo(() => createClient(), [])
```

**Files to fix:**
- `app/(app)/assessments/[id]/assessment-content.tsx` — wrap supabase in useMemo, wrap load in useCallback
- `app/(app)/insights/page.tsx` — supabase dep
- `app/(app)/journal/page.tsx` — loadEntries dep
- `app/(app)/messages/page.tsx` — load, loadMessages, profile.id, profile?.role, supabase
- `app/(app)/mood/mood-content.tsx` — loadLogs dep
- `app/(app)/patients/patients-content.tsx` — load dep
- `app/(app)/profile/page.tsx` — load dep

**Affected files:** 7 client component files.

**DB migration:** None.

**Testing:** `npx eslint app/ --ext .ts,.tsx --format compact | grep "react-hooks"` → 0 warnings.

**Acceptance criteria:** `npm run lint` exits 0 with no `react-hooks/exhaustive-deps` warnings.

---

### P4-3 · Clinician/patient navigation links missing from sidebar
**Root cause:** New pages (`/patient/clinicians`, `/clinician/verification`, `/clinician/connect`) were implemented in PR #16 but not wired into the Sidebar component nav.

**Exact code changes:**

`components/sidebar.tsx` — add nav entries:
```ts
// In patient role nav items array:
{ href: '/patient/clinicians', label: lang === 'ar' ? 'طاقمي الطبي' : 'My Clinicians', icon: UserCheck }

// In clinician role nav items array:
{ href: '/clinician/verification', label: lang === 'ar' ? 'التحقق من الهوية' : 'Verification', icon: ShieldCheck },
{ href: '/clinician/connect', label: lang === 'ar' ? 'ربط المرضى' : 'Connect Patients', icon: Link2 },
```

**Affected files:** `components/sidebar.tsx`

**DB migration:** None.

**Testing:** Log in as patient → sidebar shows "My Clinicians". Log in as clinician → sidebar shows "Verification" and "Connect Patients".

**Acceptance criteria:** All 3 new pages are reachable from sidebar navigation.

---

### P4-4 · Add clinician-verifications review UI to admin panel
**Root cause:** `GET/PATCH /api/admin/clinician-verifications` is implemented but no admin UI page exists to review pending verifications.

**Exact code changes:**

New page `app/x/control/(panel)/clinician-verifications/page.tsx`:
- Server component using `requireAdmin()`
- Fetches `GET /api/admin/clinician-verifications?status=pending_verification`
- Table with columns: clinician name, email, license type, license number, jurisdiction, submitted date
- "Approve" / "Reject" buttons → PATCH `/api/admin/clinician-verifications` with `{ id, action: 'approve'|'reject', reason? }`
- Filter tabs: Pending / Verified / Rejected / Suspended

Add nav entry in admin sidebar/panel navigation:
```ts
{ href: '/x/control/clinician-verifications', label: 'Clinician Verifications', icon: ShieldCheck }
```

**Affected files:** `app/x/control/(panel)/clinician-verifications/page.tsx` (new), admin nav component.

**DB migration:** None (uses existing table from PR #16).

**Testing:** Submit verification as clinician → admin sees row in Pending tab → Approve → clinician status updates → clinician can now submit access requests.

**Acceptance criteria:** Admin can approve/reject verifications from the panel. Status change is reflected immediately on refresh.

---

## Phase 5 — Clinician Workflow Improvements

### P5-1 · Clinical notes: add RLS policy on clinical_notes table
**Root cause:** `clinical_notes` table has application-level authorization (verified in route.ts) but no RLS policies documented or committed. A direct PostgREST query without the API layer would expose all notes.

**Exact code changes:**

New migration `supabase/migrations/20260624180300_clinical_notes_rls.sql`:
```sql
-- Enable RLS
alter table clinical_notes enable row level security;

-- Clinician can only read/write notes they authored
create policy "cn_clinician_own" on clinical_notes
  for all to authenticated
  using (clinician_id = auth.uid())
  with check (clinician_id = auth.uid());

-- Patient can only read notes written for them
create policy "cn_patient_read" on clinical_notes
  for select to authenticated
  using (patient_id = auth.uid());

-- Admins can read all
create policy "cn_admin_read" on clinical_notes
  for select to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin','superadmin')
  ));
```

**Affected files:** New migration file.

**DB migration:** `supabase/migrations/20260624180300_clinical_notes_rls.sql`

**Testing:** Direct Supabase PostgREST call with clinician A's JWT for clinician B's notes → 0 rows returned. Patient JWT → returns only their own notes.

**Acceptance criteria:** RLS enabled. `select * from clinical_notes` via anon or cross-user JWT returns 0 rows.

---

### P5-2 · Messages page: add RLS policy
**Root cause:** Similar to clinical_notes — messages table authorization is enforced at API layer but RLS status is unknown/unverified in source.

**Exact code changes:**

New migration `supabase/migrations/20260624180400_messages_rls.sql`:
```sql
alter table messages enable row level security;

-- Patient or clinician in the conversation can read
create policy "msg_read" on messages
  for select to authenticated
  using (patient_id = auth.uid() or clinician_id = auth.uid());

-- Sender inserts — must be participant
create policy "msg_insert" on messages
  for insert to authenticated
  with check (patient_id = auth.uid() or clinician_id = auth.uid());

-- Admins read all
create policy "msg_admin_read" on messages
  for select to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin','superadmin')
  ));
```

**Affected files:** New migration file.

**DB migration:** `supabase/migrations/20260624180400_messages_rls.sql`

**Testing:** User A's JWT querying messages between User B and User C → 0 rows.

**Acceptance criteria:** RLS enabled. Cross-tenant message reads blocked at DB layer.

---

## Phase 6 — Admin Analytics Improvements

### P6-1 · Admin analytics/export uses in-memory filtering — replace with SQL
**Root cause:** `app/x/control/(panel)/analytics/page.tsx` fetches large submission/mood sets and filters in JS. This breaks pagination, overloads server memory, and produces inaccurate counts when filters are applied post-query.

**Exact code changes:**

New migration `supabase/migrations/20260624180500_analytics_views.sql`:
```sql
-- Submission counts by assessment and severity for analytics dashboard
create or replace view analytics_submissions_summary as
select
  ad.code,
  ad.name_en,
  count(*) as total,
  count(*) filter (where s.severity_band ilike '%severe%') as severe_count,
  count(*) filter (where s.severity_band ilike '%moderate%') as moderate_count,
  count(*) filter (where s.severity_band ilike '%mild%') as mild_count,
  count(*) filter (where s.severity_band ilike '%minimal%' or s.severity_band ilike '%normal%') as minimal_count,
  date_trunc('month', s.submitted_at) as month
from assessment_submissions s
join assessment_definitions ad on s.definition_id = ad.id
group by ad.code, ad.name_en, date_trunc('month', s.submitted_at);

-- Daily active users (mood logs + submissions)
create or replace view analytics_dau as
select
  log_date::date as day,
  count(distinct patient_id) as active_users
from mood_logs
group by log_date::date;
```

`app/api/admin/analytics/route.ts` (new or update existing):
```ts
// Instead of fetching all rows:
const { data } = await adminClient.from('analytics_submissions_summary').select('*')
```

`app/x/control/(panel)/analytics/page.tsx`:
- Remove all `.filter()` / `.reduce()` calls that operate on full row arrays
- Replace with direct view queries + DB-side aggregations

**Affected files:** New migration, `app/api/admin/analytics/route.ts`, `app/x/control/(panel)/analytics/page.tsx`.

**DB migration:** `supabase/migrations/20260624180500_analytics_views.sql`

**Testing:** 10,000 submission rows → analytics page loads under 500ms. Filter by assessment code returns correct count from DB.

**Acceptance criteria:** Page load time < 1s with 10k rows. No JS `.filter()` on full dataset in analytics component.

---

### P6-2 · Admin export: cap 10,000 rows + stream as CSV
**Root cause:** Current export queries up to 10,000 rows into memory, serializes to JSON, then converts. This risks OOM on large datasets and is slow.

**Exact code changes:**

`app/api/admin/export/route.ts` — stream CSV using `ReadableStream`:
```ts
// Replace JSON.stringify approach with:
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder()
    controller.enqueue(encoder.encode('id,patient_id,assessment,severity,submitted_at\n'))
    // Paginate in 500-row chunks
    let offset = 0
    while (true) {
      const { data } = await adminClient
        .from('assessment_submissions')
        .select('id, patient_id, assessment_definitions(name_en), severity_band, submitted_at')
        .range(offset, offset + 499)
      if (!data || data.length === 0) break
      for (const row of data) {
        controller.enqueue(encoder.encode(
          `${row.id},${row.patient_id},"${(row as any).assessment_definitions?.name_en ?? ''}",${row.severity_band},${row.submitted_at}\n`
        ))
      }
      if (data.length < 500) break
      offset += 500
    }
    controller.close()
  }
})
return new Response(stream, {
  headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="export.csv"' }
})
```

**Affected files:** `app/api/admin/export/route.ts`

**DB migration:** None.

**Testing:** Export with 50,000 rows → no OOM, file downloads completely. Vercel function stays under 128MB RAM.

**Acceptance criteria:** Export streams correctly. Memory usage stays flat during export.

---

## Phase 7 — Mobile Optimization

### P7-1 · Mobile assessment submission bypasses server-side scoring
**Root cause:** `mobile/app/(app)/assessments/[id].tsx` writes `assessment_submissions` and `assessment_responses` directly to Supabase. This bypasses the scoring engine in `app/api/submit-assessment/route.ts`, allowing arbitrary score injection via a modified client.

**Exact code changes:**

`mobile/app/(app)/assessments/[id].tsx` — replace direct Supabase writes:
```ts
// REMOVE:
const { error } = await supabase.from('assessment_submissions').insert({...})

// ADD:
const apiBase = process.env.EXPO_PUBLIC_API_URL // e.g. https://vwelfare.vercel.app
const session = await supabase.auth.getSession()
const token = session.data.session?.access_token

const res = await fetch(`${apiBase}/api/submit-assessment`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    definition_id: assessment.id,
    responses: answers, // { [itemId]: value }
    assignment_id: assignmentId ?? null,
  }),
})

if (!res.ok) {
  const err = await res.json()
  throw new Error(err.error ?? 'Submission failed')
}
const { submission } = await res.json()
router.push(`/results?submission_id=${submission.id}`)
```

`app/api/submit-assessment/route.ts` — ensure it accepts Bearer token (not just cookie):
```ts
// At start of handler, accept both cookie and Bearer:
let user = null
const authHeader = request.headers.get('authorization')
if (authHeader?.startsWith('Bearer ')) {
  const token = authHeader.slice(7)
  const { data } = await supabase.auth.getUser(token)
  user = data.user
} else {
  const { data } = await supabase.auth.getUser()
  user = data.user
}
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

`.env.example` / `mobile/.env.example` — add:
```env
EXPO_PUBLIC_API_URL=https://vwelfare.vercel.app
```

**Affected files:** `mobile/app/(app)/assessments/[id].tsx`, `app/api/submit-assessment/route.ts`, `.env.example`.

**DB migration:** None.

**RLS changes:** Remove any RLS INSERT policies on `assessment_submissions` that allow direct patient writes (they should now come only from service-role via the API route).

**Testing:** Submit assessment from mobile → score in DB matches server-computed score. Attempt to POST manually crafted `severity_band: 'none'` to API → overridden by server scoring.

**Acceptance criteria:** Mobile submission result matches web submission result for identical answers. Score cannot be set by the client.

**Dependencies:** P1-2 (Next.js upgrade) must be deployed first so the API endpoint is stable.

---

### P7-2 · Bundle size — dynamic import heavy client components
**Root cause:** `/insights` (275 kB), `/assessments/[id]` (236 kB), and `/x/control/analytics` (213 kB) have large first-load JS because chart libraries and assessment content are bundled eagerly.

**Exact code changes:**

`app/(app)/insights/page.tsx`:
```ts
import dynamic from 'next/dynamic'
const MoodCalendar = dynamic(() => import('@/components/mood-calendar'), { ssr: false })
const ScoreTrends = dynamic(() => import('@/components/score-trends'), { ssr: false })
```

`app/(app)/assessments/[id]/assessment-content.tsx`:
```ts
// Split assessment content lib — already huge at 209kB
// Move to dynamic import at question render time:
const { getAssessmentContent } = await import('@/lib/assessment-content')
```

`app/x/control/(panel)/analytics/page.tsx`:
```ts
import dynamic from 'next/dynamic'
const AnalyticsCharts = dynamic(() => import('@/components/admin/analytics-charts'), { ssr: false })
```

Create `components/admin/analytics-charts.tsx` by extracting the `recharts` rendering from the analytics page.

**Affected files:** `app/(app)/insights/page.tsx`, `app/x/control/(panel)/analytics/page.tsx`, new `components/admin/analytics-charts.tsx`.

**Testing:** `npm run build` output should show each route's first-load JS reduced by >50 kB. Lighthouse performance score >= 80 on mobile.

**Acceptance criteria:** Insights and analytics first-load JS < 150 kB. Build passes.

---

## Phase 8 — SEO Improvements

### P8-1 · Add Schema.org structured data to homepage
**Root cause:** `app/page.tsx` has Open Graph tags and sitemap but no JSON-LD structured data. Search engines cannot classify the service type or surface it in rich results.

**Exact code changes:**

`app/page.tsx` — add inside `<head>` via `<script type="application/ld+json">`:
```tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  'name': 'V Welfare',
  'description': 'Mental health assessment platform offering clinically validated tools in Arabic and English.',
  'url': 'https://vwelfare.com',
  'applicationCategory': 'HealthApplication',
  'operatingSystem': 'Web',
  'inLanguage': ['ar', 'en'],
  'offers': {
    '@type': 'Offer',
    'price': '0',
    'priceCurrency': 'SAR',
  },
  'author': {
    '@type': 'Organization',
    'name': 'V Welfare',
    'url': 'https://vwelfare.com',
  },
}

// In JSX:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
/>
```

**Affected files:** `app/page.tsx`

**DB migration:** None.

**Testing:** Fetch homepage HTML → `grep "application/ld+json"` → schema present. Validate with Google's Rich Results Test.

**Acceptance criteria:** JSON-LD block present in HTML source. No validation errors in Rich Results Test.

---

### P8-2 · hreflang implementation for Arabic/English
**Root cause:** Platform is bilingual but has no `hreflang` tags. Google may serve the wrong language version or split link equity.

**Exact code changes:**

`app/layout.tsx` — add to metadata:
```ts
export const metadata: Metadata = {
  // ... existing
  alternates: {
    canonical: 'https://vwelfare.com',
    languages: {
      'en': 'https://vwelfare.com/?lang=en',
      'ar': 'https://vwelfare.com/?lang=ar',
      'x-default': 'https://vwelfare.com',
    },
  },
}
```

**Affected files:** `app/layout.tsx`

**DB migration:** None.

**Testing:** Fetch homepage HTML → confirm `<link rel="alternate" hreflang="ar" ...>` present.

**Acceptance criteria:** hreflang tags in `<head>` for `en`, `ar`, and `x-default`.

---

## Effort Estimates

| ID | Task | Est. Hours |
|---|---|---|
| P1-1 | AI Draft PUT endpoint | 3 |
| P1-2 | Next.js patch upgrade | 2 |
| P2-1 | Atomic rate limiting (migration + lib) | 2 |
| P2-2 | Admin session cookie expiry | 0.5 |
| P2-3 | CSP nonce-based hardening | 4 |
| P2-4 | Security test CI setup | 1.5 |
| P3-1 | Missing indexes migration | 1 |
| P3-2 | Submission constraints migration | 1 |
| P4-1 | Unified page state components | 4 |
| P4-2 | React hook warnings fix | 3 |
| P4-3 | Sidebar nav for new pages | 1 |
| P4-4 | Admin clinician verification UI | 4 |
| P5-1 | clinical_notes RLS migration | 1 |
| P5-2 | messages RLS migration | 1 |
| P6-1 | Analytics SQL views | 3 |
| P6-2 | Export streaming CSV | 2 |
| P7-1 | Mobile → server scoring | 5 |
| P7-2 | Bundle code splitting | 3 |
| P8-1 | Schema.org JSON-LD | 1 |
| P8-2 | hreflang tags | 0.5 |
| **Total** | | **~43 hours** |

---

## Execution Order (dependency graph)

```
P1-2 (Next.js)
  └── P2-3 (CSP nonce) — test nonce on stable Next version
  └── P7-1 (mobile scoring) — stable API before mobile routes

P2-1 (atomic rate limit) — independent, run early
P3-1, P3-2, P5-1, P5-2 — independent migrations, batch together

P4-1 (page states) → P4-2 (hook warnings) — do states first so hooks refactor is coherent
P4-3, P4-4 — independent sidebar/UI additions

P6-1 (analytics views) → P6-2 (export streaming) — views first, then wire export

P7-2 (bundle split) — independent of P7-1
P8-1, P8-2 — independent, lowest priority
```
