# Superadmin-Only User & Result Deletion Guide

**Version**: 1.0.0  
**Date**: June 30, 2026  
**Status**: Production Ready

---

## Overview

This guide documents the superadmin-only deletion privileges for the V Welfare Platform. Superadmins can now delete user profiles and assessment results via explicit API endpoints, with full audit logging.

**Key Features**:
- ✅ Superadmin-only deletion (enforced at RLS policy layer + API layer)
- ✅ Both hard delete (permanent) and soft delete (mark as deleted_at)
- ✅ Complete audit trail of all deletions
- ✅ Preview mode to see what will be deleted before confirming
- ✅ Cascading deletion with proper referential integrity
- ✅ Self-deletion prevention

---

## API Endpoints

### 1. Delete User Profile (and all associated data)

**Endpoint**: `DELETE /api/admin/delete-user`

**Authentication**: Superadmin required

**Request**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Patient requested account deletion",
  "hardDelete": false
}
```

**Parameters**:
- `userId` (required): UUID of user to delete
- `reason` (optional): Reason for deletion (for audit trail)
- `hardDelete` (optional, default: false): 
  - `true` = hard delete (permanent removal from database)
  - `false` = soft delete (mark with deleted_at timestamp)

**Response (Success)**:
```json
{
  "ok": true,
  "deleted": {
    "profileId": "550e8400-e29b-41d4-a716-446655440000",
    "deletionMethod": "soft",
    "recordsDeleted": {
      "assessment_submissions": 5,
      "assessment_answers": 45,
      "assessment_results": 5,
      "messages": 12,
      "notifications": 23,
      "clinical_notes": 3,
      "draft_assessments": 1
    },
    "timestamp": "2026-06-30T14:30:00Z"
  }
}
```

**Response (Error - Not Superadmin)**:
```json
{
  "error": "Only superadmin can delete user profiles"
}
```

**Response (Error - Cannot Delete Self)**:
```json
{
  "error": "Cannot delete your own account"
}
```

**Response (Error - User Not Found)**:
```json
{
  "error": "User not found"
}
```

**What Gets Deleted**:
1. Assessment submissions
2. Assessment answers
3. Assessment results
4. Draft assessments
5. Messages (sent and received)
6. Conversations
7. Notifications
8. Clinical notes
9. Appointments
10. Patient profile
11. Clinician profile (if applicable)
12. Main profile record

**Audit Trail**: Logged as `user_deletion` action with full deletion details

---

### 2. Preview User Deletion

**Endpoint**: `GET /api/admin/delete-user?userId=[id]`

**Authentication**: Superadmin required

**Request**:
```
GET /api/admin/delete-user?userId=550e8400-e29b-41d4-a716-446655440000
```

**Response**:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name_en": "John Doe",
    "full_name_ar": "جون دو",
    "email": "john@example.com",
    "role": "patient",
    "created_at": "2026-01-15T10:00:00Z"
  },
  "willDelete": {
    "assessment_submissions": 5,
    "assessment_answers": 45,
    "assessment_results": 5,
    "messages": 12,
    "notifications": 23,
    "clinical_notes": 3,
    "draft_assessments": 1
  },
  "totalRecords": 94
}
```

**Use Case**: Call this before DELETE to confirm what will be deleted.

---

### 3. Delete Assessment Results

**Endpoint**: `DELETE /api/admin/delete-results`

**Authentication**: Superadmin required

**Request - Delete Single Submission**:
```json
{
  "submissionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**Request - Delete All Results for Patient**:
```json
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Request - Delete All Results for Assessment Definition**:
```json
{
  "definitionId": "phq9"
}
```

**Response**:
```json
{
  "ok": true,
  "deleted": {
    "submissionCount": 3,
    "answerCount": 27,
    "resultCount": 3,
    "timestamp": "2026-06-30T14:30:00Z"
  }
}
```

**What Gets Deleted**:
1. Assessment submissions
2. Assessment answers
3. Assessment results

**Audit Trail**: Logged as `assessment_results_deletion` with deletion details

---

### 4. Preview Assessment Deletion

**Endpoint**: `GET /api/admin/delete-results?type=[type]&id=[id]`

**Authentication**: Superadmin required

**Request - Preview Single Submission**:
```
GET /api/admin/delete-results?type=submission&id=f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Request - Preview Patient Results**:
```
GET /api/admin/delete-results?type=patient&id=550e8400-e29b-41d4-a716-446655440000
```

**Request - Preview Definition Results**:
```
GET /api/admin/delete-results?type=definition&id=phq9
```

**Response**:
```json
{
  "submissions": 3,
  "willDelete": {
    "submissions": 3,
    "answers": 27,
    "results": 3,
    "total": 33
  },
  "details": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "patient_id": "550e8400-e29b-41d4-a716-446655440000",
      "definition_id": "phq9",
      "submitted_at": "2026-06-20T10:30:00Z"
    }
  ]
}
```

---

## Usage Examples

### Example 1: Delete a Test Patient Account

```bash
# Step 1: Preview what will be deleted
curl -X GET \
  'https://vwelfare.com/api/admin/delete-user?userId=550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer [superadmin-token]'

# Step 2: If preview looks correct, execute deletion
curl -X DELETE \
  'https://vwelfare.com/api/admin/delete-user' \
  -H 'Authorization: Bearer [superadmin-token]' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Test account cleanup before production",
    "hardDelete": false
  }'
```

### Example 2: Delete All Assessment Results for a Patient (Keep Profile)

```bash
# Step 1: Preview results to delete
curl -X GET \
  'https://vwelfare.com/api/admin/delete-results?type=patient&id=550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer [superadmin-token]'

# Step 2: Execute deletion
curl -X DELETE \
  'https://vwelfare.com/api/admin/delete-results' \
  -H 'Authorization: Bearer [superadmin-token]' \
  -H 'Content-Type: application/json' \
  -d '{
    "patientId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Example 3: Clean Up All Test Results for PHQ-9

```bash
curl -X DELETE \
  'https://vwelfare.com/api/admin/delete-results' \
  -H 'Authorization: Bearer [superadmin-token]' \
  -H 'Content-Type: application/json' \
  -d '{
    "definitionId": "phq9"
  }'
```

---

## Deletion Methods

### Soft Delete (Default)

**Method**: `hardDelete: false`

**Behavior**:
- Records are marked with `deleted_at` timestamp
- Data remains in database for recovery
- Audit trail preserved for all tables
- Soft-deleted records excluded from normal queries

**Use Case**: 
- Default for all deletions
- Allows recovery if deletion was accidental
- Meets GDPR "right to be forgotten" with recovery capability

**Recovery**:
```sql
-- To recover soft-deleted user data:
UPDATE profiles
SET deleted_at = NULL, is_active = true
WHERE id = 'user-id' AND deleted_at IS NOT NULL;
```

### Hard Delete (Permanent)

**Method**: `hardDelete: true`

**Behavior**:
- Records are permanently removed from database
- Cannot be recovered
- No undo possible
- Audit log entry preserves deletion metadata

**Use Case**:
- GDPR "right to be forgotten" (permanent removal)
- Sensitive data cleanup
- Compliance requirement

**⚠️ WARNING**: Hard delete is permanent and irreversible. Confirm with user before executing.

---

## Audit Trail

All deletions are logged in the `audit_log` table:

```sql
SELECT * FROM audit_log
WHERE action IN ('user_deletion', 'assessment_results_deletion')
ORDER BY created_at DESC;
```

**Log Entry Example**:
```json
{
  "id": "log-entry-uuid",
  "actor_id": "superadmin-uuid",
  "action": "user_deletion",
  "target_type": "profile",
  "target_id": "deleted-user-uuid",
  "reason": "SOFT DELETE: Patient requested account deletion",
  "metadata": {
    "deleted_records": {
      "assessment_submissions": 5,
      "assessment_answers": 45,
      "assessment_results": 5,
      "messages": 12,
      "notifications": 23,
      "clinical_notes": 3,
      "draft_assessments": 1
    },
    "method": "soft",
    "timestamp": "2026-06-30T14:30:00Z"
  },
  "created_at": "2026-06-30T14:30:00Z"
}
```

---

## Security Measures

### 1. Superadmin-Only Enforcement

- **API Layer**: Every endpoint checks `role === 'superadmin'`
- **Database Layer**: RLS policies enforce deletion only via superadmin auth
- **Session Security**: HMAC-signed session cookie validates superadmin role

### 2. Self-Deletion Prevention

```typescript
// Cannot delete own account
if (userId === callerUser.id) {
  return { error: 'Cannot delete your own account' }
}
```

### 3. Cannot Delete Other Superadmins

```typescript
if (profile.role === 'superadmin') {
  return { error: 'Cannot delete other superadmin accounts' }
}
```

### 4. Complete Audit Trail

Every deletion is logged with:
- Actor (superadmin who initiated)
- Timestamp
- Reason
- All affected records (counts)
- Deletion method (hard/soft)

### 5. Cascading Delete Order

Deletions happen in strict order to maintain referential integrity:
1. Assessment answers (no foreign keys to other records)
2. Assessment submissions
3. Assessment results
4. Draft assessments
5. Messages
6. Conversations
7. Notifications
8. Clinical notes
9. Appointments
10. Patient profile
11. Profile (after all related records)

---

## RLS Policies

The following RLS policies enforce superadmin-only deletion:

```sql
-- Can only delete if superadmin
CREATE POLICY "superadmin_can_delete_any_patient_profile"
  ON public.patient_profiles
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
  );
```

All deletion policies follow this pattern, requiring:
1. Authenticated user
2. Role = 'superadmin'
3. Not deleting own profile

---

## Best Practices

### ✅ Do

- Always use **preview endpoint** before deleting
- Document reason in the `reason` field for audit trail
- Use **soft delete** by default for data recovery
- Review audit logs regularly for all deletions
- Require confirmation from another superadmin for sensitive deletes
- Keep superadmin credentials secure

### ❌ Don't

- Never hard delete without written authorization
- Never delete production user data without documentation
- Don't bypass audit logging (logging is automatic)
- Don't share superadmin credentials
- Don't delete other superadmin accounts
- Don't attempt to delete own account

---

## Troubleshooting

### Error: "Only superadmin can delete"

**Cause**: User calling endpoint is not a superadmin.

**Solution**: Log in as superadmin account.

### Error: "User not found"

**Cause**: Invalid userId provided.

**Solution**: Verify userId exists: `GET /api/admin/users?search=[name]`

### Error: "Cannot delete your own account"

**Cause**: Attempted to delete own profile.

**Solution**: Use a different superadmin account to delete.

### Records Not Deleted

**Cause**: RLS policies preventing deletion or database error.

**Solution**: Check Supabase logs and verify superadmin role in profiles table.

---

## Compliance & Legal

### GDPR Compliance

- ✅ Right to be forgotten: Hard delete option available
- ✅ Audit trail: All deletions logged
- ✅ Data minimization: Can delete specific datasets
- ✅ User authorization: Superadmin confirmation required

### HIPAA Compliance

- ✅ Audit controls: Complete deletion audit trail
- ✅ Access controls: Superadmin-only deletion
- ✅ Data retention: Soft delete allows data retention if needed
- ✅ Integrity: Referential integrity maintained via cascading deletes

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-30 | Initial release - Superadmin deletion privileges |

---

## Support

For questions about deletion privileges:
- Technical: devops@vwelfare.com
- Compliance: legal@vwelfare.com
- Clinical: clinical@vwelfare.com
