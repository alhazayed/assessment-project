# V Welfare Platform v1.0.0 — Release Notes

> **DOCUMENT STATUS: SUPERSEDED AS LAUNCH AUTHORITY (2026-07-26)**  
> This file is retained as the **draft product release notes** for the future GitHub Release.  
> It does **not** declare GA. Current status is governed solely by  
> [`docs/release/CANONICAL_RELEASE_STATE.md`](./docs/release/CANONICAL_RELEASE_STATE.md).  
> **Tag `v1.0.0` is NOT CUT. Decision: CONDITIONAL GO.**

**Release name:** V Welfare Platform v1.0.0  
**Version:** `1.0.0`  
**Target tag:** `v1.0.0` (pending Operator Runbook completion)  
**Documentation freeze SHA:** `6e219e62e9f74273595ef10e31220bb24d0945f7`  
**Production alias:** `https://app.vwelfare.com`  
**Timeline:** Freeze T6 = 2026-07-26 · Production GA = T10 *pending*  
([`docs/release/CANONICAL_RELEASE_TIMELINE.md`](./docs/release/CANONICAL_RELEASE_TIMELINE.md))

---

## Status (canonical)

| Field | Value |
|---|---|
| Release decision | ⚠️ CONDITIONAL GO |
| Tag | Not cut |
| Patient-open | Not authorized |
| Operator procedure | [`docs/release/OPERATOR_RUNBOOK_v1.0.0.md`](./docs/release/OPERATOR_RUNBOOK_v1.0.0.md) |

Historical drafts that said “Production Ready ✅ / Released” on 2026-06-30 were **incorrect as current state** and are revoked by the 2026-07-26 reconciliation.

---

## What’s included at GA (when T10 is recorded)

### Clinical
- Validated psychometric assessment instruments with server-side scoring
- High-risk detection workflows
- PDF report export with authorization checks
- Patient / clinician collaboration with consent-scoped access

### Platform
- Multi-role access (patient, clinician, admin, superadmin) with RLS isolation
- Bilingual English / Arabic with RTL support
- Admin analytics surfaces
- Monitoring hooks (Sentry-capable; configure DSN per ops)

### Security (as certified in Checklist §1; live HTTP suite still open)
- RLS-enforced PHI isolation
- AI PHI scrubbing before Gemini
- Redirect allow-list for password reset
- Security headers (CSP nonce, HSTS, etc.)
- Rate limiting

### Explicitly not claimed at web GA
- MFA (post-GA)
- Email confirmation (currently disabled; post-GA)
- Complete centralized admin audit trail (post-GA)
- Mobile SecureStore hardening complete (mobile track)
- Appointments / telehealth / video as certified GA subsystems

---

## Operations constants

| Item | Canonical value |
|---|---|
| RTO | 4 hours |
| RPO | \< 1 hour |
| PITR | Confirm before GA (admin action) |
| Promote | Human deliberate promote of `main` builds only |
| Merge | Squash-merge |
| Rollback / runbook | [`docs/release/OPERATOR_RUNBOOK_v1.0.0.md`](./docs/release/OPERATOR_RUNBOOK_v1.0.0.md) |

---

## Version history

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0 | *pending T10* | CONDITIONAL GO | Tag not cut; see Canonical Release State |
| *(draft)* | 2026-06-30 | Historical only | Prior “Released” claim **revoked** |

---

**Release Manager:** *(named at Checklist §8)*  
**Do not publish these notes as “Released” until Canonical Release State decision = GO.**
