# V Welfare — Post-Release Monitoring Plan v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-MON-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | DevOps On-call |
| **Approver** | Release Manager |
| **Release** | `v1.0.0` |
| **Related** | `INCIDENT_RESPONSE_RUNBOOK.md` |

---

## 1. Watch windows

| Window | Duration | Owner | Escalation |
|---|---|---|---|
| Hot watch | 0–4 hours post GO | OPS + SEC | P1 → RM immediate |
| Extended | 4–24 hours | OPS | P2 within 15m |
| Stability | 24–48 hours | OPS | Standard on-call |

---

## 2. Metrics & thresholds

| Signal | Pass threshold | Fail action |
|---|---|---|
| `/api/health` | 200 healthy | Investigate; rollback if unrestored in 10m (hot watch) |
| Sentry Critical | 0 unexplained | Incident `FRM-INC-100` |
| Auth failure spike | No sustained elevation vs baseline | SEC review |
| Assessment submit errors | No material elevation | DBA/OPS |
| PDF export errors | No material elevation; spot-check denial still holds | SEC |
| DB latency | Within normal | Supabase status + DBA |
| Advisor ERROR | Remains 0 | SEC + freeze new changes |

---

## 3. PHI / clinical safety monitoring

- [ ] No user reports of wrong-patient data  
- [ ] No export of another patient’s PDF  
- [ ] Crisis/disclaimer surfaces remain reachable  
- [ ] Admin analytics still deny non-service paths (spot check unauth 401/403)  

---

## 4. Monitoring log

| Time (UTC) | Check | Result | Initials | Ticket |
|---|---|---|---|---|
| | | | | |

---

## 5. Sign-off at +24h / +48h

| Checkpoint | Uptime / notes | Decision | OPS | RM | Date (UTC) |
|---|---|---|---|---|---|
| +24h | | STABLE / INCIDENT | | | |
| +48h | | STABLE / INCIDENT | | | |
