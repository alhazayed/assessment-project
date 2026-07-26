# V Welfare — Operator / DBA Log v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-OPL-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Senior DBA |
| **Approver** | Release Manager |
| **Release** | `v1.0.0` |
| **PHI rule** | Commands and outputs only; no patient rows |

---

## 1. Operator identity

| Field | Value |
|---|---|
| Operator name | |
| Role | Senior DBA / Operator |
| Workstation ID | |
| Supabase access confirmed ☐ | ☐ |
| CLI versions (`supabase --version`, `vercel --version`, `node -v`) | |

---

## 2. Command log (append-only)

For every command executed in production context:

| # | Time (UTC) | Why | Command (redacted secrets) | Expected | Actual | Diverge action taken | Initials |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |

---

## 3. SQL verification log

| Query ref (Package §6) | Time (UTC) | Pass ☐ | md5 / counts recorded | Initials |
|---|---|---|---|---|
| §6.1A has_clinician_access md5 | | ☐ | Expected `06aedade9e809c61a3da2ee5a4764efc` · Actual: | |
| §6.1B RLS counts | | ☐ | | |
| §6.1C policy names | | ☐ | | |
| §6.2 admin RPC grants | | ☐ | | |
| §6.3 anon helpers | | ☐ | | |
| §6.4 search_path pins | | ☐ | | |
| §6.5 schema_migrations tip | | ☐ | | |
| §6.6 RLS enabled | | ☐ | | |

---

## 4. db push attestation

| Question | Answer |
|---|---|
| Was `supabase db push` executed? | YES / NO |
| If YES — dry-run showed only accepted `ipip120`? | YES / NO / N/A |
| RM verbal/written approval recorded? | YES / NO / N/A |
| Evidence ID | E-003 / E-004 |

**Forbidden:** Any dashboard schema edit; any MCP apply_migration; any SQL Editor DDL outside emergency procedure.

---

## Approval

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Senior DBA | | | | |
| Release Manager | | | | |
