# Scripts

## Post-migration verification

After applying `20260628120000_production_security_hardening.sql` to Supabase:

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: verify deployed cron endpoint
export BASE_URL=https://your-production-domain.com
export CRON_SECRET=your-cron-secret

npm run verify:migration
```

### What it checks

| Check | Expected |
|-------|----------|
| Anon JWT → admin RPCs | `permission denied` (42501) |
| Anon JWT → `generate_patient_access_code` | blocked |
| Service role → admin RPCs | success |
| Service role → `generate_patient_access_code` | success |
| `profiles.deletion_requested_at` | column exists |
| Anon JWT → `admin_*` matviews | blocked or absent |
| Service role → existing `admin_*` matviews | readable |
| Cron endpoint (optional) | 200 with `ok: true` |

### Manual SQL spot-check (policies)

```sql
SELECT policyname FROM pg_policies WHERE tablename = 'clinical_notes' ORDER BY 1;
-- Must NOT include: cn_clinician_own, cn_patient_read, cn_admin_read
-- Must include: clinician_own_notes
```

### Remote apply status

Migration `production_security_hardening` was applied to project `wyzezyctpvlohuuhzyof` on 2026-07-13 via Supabase MCP.
Uses conditional blocks for matviews/RPCs that may not exist in all environments.
