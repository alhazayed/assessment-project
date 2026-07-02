# V Welfare Platform – Backup & Disaster Recovery Procedures
**Version:** 1.0  
**Last Updated:** June 30, 2026  
**Scope:** Supabase PostgreSQL, patient data, assessment results, clinical notes  

---

## 1. BACKUP STRATEGY

### Current Configuration

**Backup Provider:** Supabase (managed by PostgreSQL)

**Backup Schedule:**
- **Full Backups:** Daily at 00:00 UTC
- **Incremental Backups:** Continuous binary replication
- **Point-in-Time Recovery (PITR):** 7 days (configurable)
- **Long-term Archive:** 30-day retention (configurable)

**Backup Location:** Encrypted AWS S3 (managed by Supabase)

**Recovery Time Objective (RTO):** 4 hours  
**Recovery Point Objective (RPO):** < 1 hour

---

## 2. BACKUP VERIFICATION PROCEDURE

### Monthly Backup Verification Test

**Frequency:** First Sunday of each month, 15:00 UTC  
**Duration:** 1-2 hours  
**Owner:** DevOps Lead

**Pre-Verification Checklist:**
- [ ] Schedule test window (notify users if on staging)
- [ ] Verify no critical deployments scheduled
- [ ] Ensure team members available for rollback
- [ ] Prepare communication for any issues

**Verification Steps:**

1. **Verify Backup Existence:**
   ```bash
   # 1. Log into Supabase Console
   # 2. Project Settings → Backups
   # 3. Verify:
   #    - Latest backup timestamp
   #    - Backup size (> 100MB expected)
   #    - Backup status: "Success"
   ```

2. **Document Backup Details:**
   ```bash
   # Record in BACKUP_LOG.txt:
   - Backup timestamp: YYYY-MM-DD HH:MM:SS UTC
   - Backup size: XXX MB
   - Database version: PostgreSQL X.XX
   - Tables backed up: 50+ (from metadata)
   ```

3. **Verify Point-in-Time Recovery Window:**
   ```bash
   # Supabase Console → Database → Backups
   # Confirm PITR window shows:
   # - Earliest recovery point: [timestamp] (should be 7+ days ago)
   # - Latest recovery point: now
   ```

4. **Test Restore to Staging Database (OPTIONAL):**
   
   ⚠️ **WARNING:** Only perform if you have a staging database ready
   
   ```bash
   # 1. Create staging database clone:
   # Supabase Console → Databases → Branching
   
   # 2. Restore to staging:
   # Branch Database Settings → Restore from backup
   
   # 3. Select test timestamp
   
   # 4. Monitor restore progress (usually 10-15 minutes)
   
   # 5. Verify data integrity:
   psql [STAGING_DATABASE_URL] << EOF
   SELECT 
     tablename, 
     COUNT(*) as row_count
   FROM information_schema.tables
   JOIN pg_namespace ON information_schema.tables.table_schema = pg_namespace.nspname
   WHERE table_schema = 'public'
   GROUP BY tablename;
   EOF
   
   # 6. Run spot checks:
   psql [STAGING_DATABASE_URL] << EOF
   -- Check patient data
   SELECT COUNT(*) as patient_count FROM profiles WHERE role = 'patient';
   
   -- Check assessment data
   SELECT COUNT(*) as submission_count FROM assessment_submissions;
   
   -- Check audit logs
   SELECT COUNT(*) as audit_count FROM audit_log;
   EOF
   
   # 7. Delete staging database after verification
   # Supabase Console → Branches → [staging-branch] → Delete
   ```

5. **Document Verification Results:**
   ```markdown
   # Backup Verification Report - [DATE]
   
   **Status:** ✅ VERIFIED / ❌ FAILED
   
   **Backup Details:**
   - Timestamp: [timestamp]
   - Size: [XXX MB]
   - Tables: [count]
   - Retention: 7 days PITR + 30-day archive
   
   **Verification Checklist:**
   - [x] Backup file exists in S3
   - [x] Backup timestamp current
   - [x] PITR window valid
   - [x] Staging restore successful (if tested)
   - [x] Data integrity verified
   
   **Issues Found:** None / [List any issues]
   
   **Next Verification:** [Next month date]
   ```

---

## 3. RESTORE FROM BACKUP PROCEDURES

### Scenario A: Complete Database Restoration

**Use Case:** Critical data corruption, data loss, ransomware attack

**Prerequisites:**
- [ ] Backup has been verified
- [ ] Root cause identified and fixed
- [ ] Restore plan documented
- [ ] Users notified of restore window
- [ ] Downtime window scheduled

**Restoration Steps:**

1. **Create Communication:**
   ```markdown
   Subject: Scheduled Maintenance - Database Restore
   
   We are performing a database restore from backup as part of 
   disaster recovery procedures. The platform will be unavailable 
   for 30-45 minutes during this window.
   
   Start: [DATE] [TIME] UTC
   End: [DATE] [TIME] UTC
   
   Estimated data recovery: [XX hours before maintenance]
   Affected users: ~XXX
   ```

2. **Perform Restore:**
   ```bash
   # 1. Stop all API traffic (optional but safer)
   # - Disable Vercel deployment
   # OR manually block traffic at Cloudflare
   
   # 2. Select restore point
   # Supabase Console → Database Settings → Restore
   # Choose recovery timestamp
   
   # 3. Confirm restore (⚠️ POINT OF NO RETURN)
   # System will prompt for confirmation
   
   # 4. Monitor restore progress
   # Supabase Console → Backups → Restore Status
   # Typical duration: 20-30 minutes
   ```

3. **Verify Restored Data:**
   ```bash
   # 1. Check database connectivity
   psql [DATABASE_URL] -c "SELECT NOW();"
   
   # 2. Verify row counts match expected values
   SELECT 
     tablename, 
     COUNT(*) 
   FROM information_schema.tables
   WHERE table_schema = 'public'
   GROUP BY tablename;
   
   # 3. Verify no corruption
   # Run integrity checks:
   SELECT COUNT(*) FROM profiles WHERE id IS NULL;  -- Should be 0
   SELECT COUNT(*) FROM assessment_submissions WHERE patient_id IS NULL;  -- Should be 0
   
   # 4. Check for orphaned records
   SELECT COUNT(*) FROM assessment_submissions 
   WHERE patient_id NOT IN (SELECT id FROM profiles);  -- Should be 0
   ```

4. **Restore Application Access:**
   ```bash
   # 1. Re-enable Vercel deployment
   # Vercel Dashboard → Deployments → Promote previous stable version
   
   # 2. Clear application caches (if any)
   
   # 3. Test health endpoint
   curl https://vwelfare.vercel.app/api/health
   # Expected: { "status": "ok", ... }
   
   # 4. Perform smoke tests
   # Test user login
   # Test assessment submission
   # Test report generation
   ```

5. **Post-Restore Activities:**
   - [ ] Document restore completion
   - [ ] Notify users via email
   - [ ] Update status page
   - [ ] Schedule root cause analysis meeting
   - [ ] Create action items to prevent recurrence

**Data Loss Window:**
- Users can expect to lose changes made after: [RECOVERY_TIMESTAMP]
- Estimated affected records: ~XXX
- Example: "Assessments submitted between 14:00 and 14:45 UTC on June 30"

---

### Scenario B: Point-in-Time Recovery (PITR)

**Use Case:** Accidental data deletion, single table corruption

**Duration:** 5-15 minutes (faster than full restore)

**Procedure:**

```bash
# 1. Identify exact recovery timestamp
# Example: User deleted data at 14:32 UTC on June 30
# Restore to: 14:31 UTC (one minute before deletion)

# 2. Create backup branch for testing
# Supabase Console → Branches → New Branch
# Select recovery timestamp: 2026-06-30 14:31:00 UTC

# 3. Verify restored data on branch
# Test that deleted data is present

# 4. If correct:
# Manually copy needed records back to production
# OR promote branch as new production (if acceptable downtime)

# 5. If incorrect:
# Delete branch and try different timestamp
```

---

### Scenario C: Ransomware / Data Breach Restore

**Critical Incident - Contact Security Lead Immediately**

1. **Declare Incident:**
   - Severity: P1 (Critical)
   - Notify: Engineering, Security, Legal, Executive team
   - Document: Timeline of suspected attack

2. **Initial Containment:**
   - Take affected database offline (if possible)
   - Do NOT delete or modify logs
   - Capture forensic evidence
   - Engage external security firm (if available)

3. **Determine Attack Scope:**
   - What data was accessed/modified?
   - When did attack start?
   - What is earliest clean backup?

4. **Restore from Oldest Safe Backup:**
   ```bash
   # Use PITR to restore to last known-good state
   # Supabase Console → Backups → Restore
   # Select earliest timestamp before attack began
   ```

5. **Verify Restoration:**
   - No malware/backdoors present
   - All encryption keys rotated
   - All credentials reset
   - Users forced to reset passwords

6. **External Notification** (if required by law):
   - Legal team coordinates disclosure
   - Notify affected users within 72 hours (GDPR)
   - Work with regulatory bodies if required

---

## 4. DISASTER RECOVERY TESTING SCHEDULE

### Quarterly DR Test (Every 3 months)

**Objectives:**
- Verify backup integrity
- Test restoration procedures
- Measure actual RTO and RPO
- Identify gaps in recovery plan
- Train team on procedures

**Test Scope:**

**Q1 Test (March):** Full database restore to staging
**Q2 Test (June):** Point-in-time recovery test
**Q3 Test (September):** Backup verification + data integrity
**Q4 Test (December):** Complete production failover drill

**Documentation:**
```markdown
# Q[X] 2026 Disaster Recovery Test Report

**Date:** YYYY-MM-DD  
**Duration:** [X hours]  
**Participants:** [Names]  
**Test Type:** [Full Restore / PITR / Failover]

## Results

### Backup Status
- Backup Age: [X hours]
- Backup Size: [X GB]
- Status: ✅ Healthy

### Restoration Time
- Start: HH:MM UTC
- Completion: HH:MM UTC  
- **Actual RTO: XX minutes** (Target: 4 hours) ✅

### Data Verification
- Row counts verified: [x/50 tables]
- Data integrity: ✅ Passed
- No corruption detected: ✅

### Issues Found
- [Issue 1 - Impact: Minor]
- [Issue 2 - Impact: None]

### Improvements
- [Improvement 1]
- [Improvement 2]

### Sign-off
- Engineering Lead: _______________
- DevOps Lead: ___________________
- Date: ________________________
```

---

## 5. CONTINUITY PROCEDURES

### Regional Failover (if needed)

**Current Setup:** Single region (us-east-1 via Supabase)

**Future Enhancement:** Multi-region replication would require:
1. Supabase paid tier with replication
2. Secondary database in different region
3. Automated failover configuration
4. Cross-region backup syncing

---

## 6. BACKUP RETENTION POLICY

| Backup Type | Retention | Purpose |
|-------------|-----------|---------|
| **Daily Backups** | 7 days | PITR window, quick recovery |
| **Weekly Backups** | 4 weeks | Longer recovery window |
| **Monthly Backups** | 12 months | Compliance, audit trail |
| **Archive Backups** | 7 years | Legal/regulatory requirements |

**Storage:**
- Backups encrypted at rest (AES-256)
- Located in AWS S3 (managed by Supabase)
- Replicated across availability zones
- Cost: ~$0.023 per GB per month (managed by Supabase)

---

## 7. ENCRYPTION & SECURITY

### Backup Encryption

- **At Rest:** AES-256 (Supabase default)
- **In Transit:** TLS 1.3 (Supabase → S3)
- **Key Management:** AWS KMS (Supabase managed)

### Access Control

**Who Can Restore Backups:**
- [ ] Engineering Lead
- [ ] DevOps Lead
- [ ] CTO (in emergencies)

**Audit Trail:**
- All restore operations logged in Supabase audit logs
- Accessible via: Supabase Console → Database → Logs

---

## 8. COMPLIANCE & DOCUMENTATION

### GDPR Compliance
- Data backups comply with GDPR Article 32 (security)
- Backups encrypted and access-controlled
- User data deletion: Retained in backups per retention policy
- User right to be forgotten: Removes from live DB; backups aged out per schedule

### HIPAA-Style Requirements
- Backups separated from production by access controls
- Restore operations require explicit authorization
- All restore operations logged and auditable
- Backup integrity verified quarterly

### Documentation
- [x] Backup policy documented (this document)
- [x] Recovery procedures documented
- [x] Quarterly testing performed
- [x] Team trained on procedures
- [x] Post-incident RCAs track improvements

---

## 9. INCIDENT RESPONSE INTEGRATION

### Backup Restoration is NOT a Substitute for:
1. Finding root cause
2. Implementing permanent fix
3. Preventing recurrence
4. User notification and remediation

### When to Restore from Backup

**DO Restore When:**
- ✅ Data corruption detected
- ✅ Accidental data deletion
- ✅ Ransomware/breach confirmed
- ✅ Database becomes unrecoverable

**DO NOT Restore When:**
- ❌ Just a deployment bug (rollback code instead)
- ❌ Performance issue (scale resources instead)
- ❌ Temporary connectivity issue (wait for recovery)

---

## 10. CONTACT & ESCALATION

**Backup Verification/Restoration Authority:**
- Primary: DevOps Lead
- Backup: CTO
- Emergency: CEO (if both unavailable)

**Approval Required For:**
- Any restoration during business hours: Engineering Lead approval
- Any restoration outside business hours: On-call engineer approval
- Full production restore: CTO approval required

---

## QUICK REFERENCE

**Monthly Verification:**
```bash
1. Open Supabase Console
2. Go to: Project Settings → Backups
3. Verify latest backup timestamp (should be < 24 hours old)
4. Verify backup size (expect > 100 MB)
5. Verify backup status: "Success"
✅ Done
```

**Emergency Restore:**
```bash
1. Supabase Console → Database Settings
2. Click "Restore from backup"
3. Select recovery timestamp
4. Confirm (warning: data after this time will be lost)
5. Monitor progress (10-30 minutes typically)
6. Run health checks after restore
✅ Done
```

---

**Last Updated:** June 30, 2026  
**Next Review:** September 30, 2026  
**Tested:** Monthly (last test: [DATE])
