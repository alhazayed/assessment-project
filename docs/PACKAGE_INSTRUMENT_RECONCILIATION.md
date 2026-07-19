# Package Instrument Reconciliation Report

**Date:** 2026-07-19  
**Supabase project:** `wyzezyctpvlohuuhzyof`  
**Migration:** `20260719100100_reconcile_package_assessment_codes.sql`

---

## Problem

`package_assessments.assessment_code` values did not always match live rows in `assessment_definitions`. Active packages were advertising instruments that cannot be taken, while several real instruments (PHQ-9, GAD-7, PCL-5) were incorrectly marked unavailable.

## Live inventory (before fix)

| Placeholder code | Rows | Available (wrong) | Active packages | Live match |
|---|---:|---:|---|---|
| `RESILIENCE` | 22 | 8 | yes | → **BRS** |
| `EQ` | 19 | 4 | yes | none (keep unavailable) |
| `GRIT` | 6 | 3 | yes | none (keep unavailable) |
| `ATTACHMENT` | 5 | 2 | yes | → **ECRR** |
| `EXEC_FUNC` | 4 | 1 | yes | none (keep unavailable) |
| `ESS` | 1 | 0 | yes | none (keep unavailable) |
| `DECISION` | 5 | 0 | draft only | none (keep unavailable) |

### Incorrectly gated (exist + active, but `is_available = false`)

| Code | Package |
|---|---|
| `PHQ9` | V Depression Screening Profile |
| `GAD7` | V Anxiety & Stress Profile |
| `PCL5` | V Trauma & Resilience Profile |

## Actions applied

1. **Remap** `RESILIENCE` → `BRS` (Brief Resilience Scale) and enable.
2. **Remap** `ATTACHMENT` → `ECRR` (ECR-R attachment measure) and enable.
3. **Enable** `PHQ9`, `GAD7`, `PCL5` where the definition is active.
4. **Force disable** `EQ`, `GRIT`, `EXEC_FUNC`, `ESS`, `DECISION` until instruments are built.
5. **Safety net:** any orphan code cannot remain `is_available = true`.

Verified before remap: **0** `package_results` rows keyed on the broken codes.

## Still missing (build later)

These catalog instruments are referenced by packages but have no `assessment_definitions` row yet:

| Code | Intended instrument | Suggested next step |
|---|---|---|
| `EQ` | Emotional Intelligence scale | Choose TEIQue-SF / EQ-i short form; seed definition + items |
| `GRIT` | Grit Scale (Duckworth) | Seed Grit-S (8-item) bilingual |
| `EXEC_FUNC` | Executive function screen | Choose BRIEF-A subset or Barkley deficits; seed |
| `ESS` | Epworth Sleepiness Scale | Seed ESS (8-item); distinct from ISI |
| `DECISION` | Decision-making assessment | Scope + validate before seeding |

## Verification queries

```sql
-- Must return 0
SELECT count(*) FROM package_assessments pa
WHERE pa.is_available
  AND NOT EXISTS (
    SELECT 1 FROM assessment_definitions ad
    WHERE upper(ad.code) = upper(pa.assessment_code) AND ad.is_active
  );

-- Remaps complete
SELECT assessment_code, count(*) FROM package_assessments
WHERE upper(assessment_code) IN ('BRS','ECRR','PHQ9','GAD7','PCL5','EQ','GRIT')
GROUP BY 1 ORDER BY 1;
```
