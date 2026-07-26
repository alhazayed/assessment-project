# Remaining Administrative Actions — V Welfare Platform v1.0.0

**Document status:** AUTHORITATIVE  
**As of:** 2026-07-26  
**These are not engineering tasks.** Execute via [`OPERATOR_RUNBOOK_v1.0.0.md`](./OPERATOR_RUNBOOK_v1.0.0.md).

---

## Block GA tag / patient-open

| ID | Action | Owner | Runbook | Status |
|---|---|---|---|---|
| A1 | File migration dry-run + `migration list` evidence | DevOps | §A | ☐ |
| A2 | Confirm `main` branch protection requires web CI checks | DevOps | §B | ☐ |
| A3 | Run live `test:security` with seeded accounts; file log | Security Lead | §C | ☐ |
| A4 | Enable leaked-password protection; file evidence | Security Lead | §D | ☐ |
| A5 | Confirm `app.vwelfare.com` serves intended SHA; file evidence | DevOps | §E | ☐ |
| A6 | Confirm PITR posture meets RPO \<1h (or Board accepts interim RPO) | DevOps + Compliance | DR doc | ☐ |
| A7 | Populate IR emergency contacts (replace `[Name]` / phone placeholders) | Release Manager | IR Runbook | ☐ |
| A8 | Confirm or explicitly waive public status page | Release Manager | IR Runbook | ☐ |
| A9 | Checklist §8 signed by named Release Manager, Security Lead, Clinical/Compliance | All three | Checklist §8 | ☐ |
| A10 | Cut `v1.0.0` + publish GitHub Release; update Canonical Release State | Release Manager | §F | ☐ |

---

## Required risk acceptances before patient-open (if still deferred)

| ID | Item | Owner | Status |
|---|---|---|---|
| R1 | BAA/DPA status for Gemini, Supabase, Vercel — execute **or** written time-boxed acceptance | Clinical/Compliance | ☐ |
| R2 | Deferred MFA for admin/clinician — accepted until Hardening v1.1 | Security Lead | ☐ |
| R3 | Deferred email confirmation — accepted until SMTP/templates ready | Security Lead | ☐ |
| R4 | Deferred central admin audit trail — accepted until implemented; blocks regulated/enterprise onboarding | Security Lead | ☐ |

---

## Post-GA (non-blocking for tag once A1–A10 + acceptances done)

- MFA rollout (Hardening v1.1)  
- Email confirmation enablement  
- Mobile SecureStore + anon-key rotation (mobile track)  
- Centralized immutable admin audit trail  
- Data-retention automation  
- Load-test execution (Phase 6)  
- Edge-function source backfill (Governance §9 gap)

---

*When A1–A10 are ✅, flip Canonical Release State decision to GO and date Timeline T10.*
