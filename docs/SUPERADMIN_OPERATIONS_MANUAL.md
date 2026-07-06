# Superadmin Operations Manual

**V Welfare Platform - Complete Administrative Functions Guide**

**Version**: 1.0  
**Last Updated**: June 30, 2026  
**For**: Superadmin and Administrative Staff

---

## Table of Contents

1. [Authentication & Access](#authentication--access)
2. [User Management](#user-management)
3. [Assessment Result Management](#assessment-result-management)
4. [Promo Code Management](#promo-code-management)
5. [Payment & Package Management](#payment--package-management)
6. [Analytics & Reporting](#analytics--reporting)
7. [API Reference](#api-reference)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Authentication & Access

### Superadmin Access Requirements

**Prerequisites**:
- Superadmin role assigned in the `profiles` table
- Active session with valid JWT token
- HTTPS connection (required)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Accessing Admin Dashboard

1. **Navigate to Admin Dashboard**
   - URL: `https://app.vwelfare.com/admin`
   - Requires superadmin authentication
   - Session expires after 24 hours of inactivity

2. **Session Management**
   - Tokens stored securely in httpOnly cookies
   - Automatic refresh tokens handle expiration
   - Multi-tab support (changes sync across tabs)
   - Logout: Click "Logout" button in navigation

---

## User Management

### Deleting User Profiles

The deletion system supports **two strategies**: soft delete (reversible) and hard delete (permanent).

#### Option 1: Soft Delete (Recommended for Most Cases)

**Purpose**: Deactivate user account while preserving data for legal/compliance reasons.

**What Happens**:
- User profile marked as inactive (`is_active = false`)
- Timestamp recorded (`deactivated_at`)
- User cannot login
- All user data retained in database
- Can be reactivated if needed
- Appears in audit logs

**Step-by-Step Instructions**:

1. **Access Deletion Interface**
   ```
   Navigate to: Admin Dashboard > User Management > Delete User
   ```

2. **Find the User**
   - Enter user email address
   - Or search by user ID
   - System displays user summary

3. **Review User Data**
   - Click "Preview Deletion"
   - Review what will be marked inactive:
     * Patient profile information
     * Assessment submissions (all)
     * Assessment responses (all)
     * Messages and communications
     * Notifications
     * Clinical notes
   - All data remains visible in audit

4. **Confirm Soft Delete**
   - Select deletion type: **"Soft Delete (Deactivate)"**
   - Type confirmation phrase (prevents accidental deletion)
   - Click "Confirm Soft Delete"
   - Audit log entry created automatically

5. **Verification**
   - Success message displayed
   - User appears as "inactive" in user list
   - User cannot login
   - All data preserved

**API Call Example** (for integration):
```bash
curl -X POST https://app.vwelfare.com/api/admin/delete-user \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "deleteType": "soft",
    "reason": "User requested account deactivation"
  }'
```

**Response**:
```json
{
  "success": true,
  "userId": "user-uuid-here",
  "deleteType": "soft",
  "deactivatedAt": "2026-06-30T17:50:00Z",
  "auditId": "audit-log-uuid",
  "message": "User soft deleted successfully"
}
```

---

#### Option 2: Hard Delete (Permanent Removal)

**⚠️ WARNING**: This action is **PERMANENT** and **CANNOT BE UNDONE**.

**Purpose**: Completely remove user from system (GDPR right to be forgotten, data cleanup).

**What Happens**:
- User profile permanently deleted
- All assessment data permanently deleted
- All communications permanently deleted
- All audit records deleted
- No recovery possible
- Recorded in master audit log only

**Step-by-Step Instructions**:

1. **Access Deletion Interface**
   ```
   Navigate to: Admin Dashboard > User Management > Delete User
   ```

2. **Find and Review User**
   - Enter user email or ID
   - Click "Preview Deletion"
   - Review complete deletion scope

3. **Select Hard Delete**
   - Select deletion type: **"Hard Delete (Permanent)"**
   - Warning message displayed
   - You must acknowledge understanding

4. **Confirm Hard Delete**
   - Type exact confirmation phrase: **"PERMANENTLY DELETE [USERNAME]"**
   - Confirm you understand data cannot be recovered
   - Click "Permanently Delete"
   - Provide reason for deletion

5. **System Confirmation**
   - Success message with deletion timestamp
   - Master audit log entry created
   - User completely removed from system

**API Call Example**:
```bash
curl -X POST https://app.vwelfare.com/api/admin/delete-user \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "deleteType": "hard",
    "reason": "GDPR right to be forgotten - user requested",
    "confirmationPhrase": "PERMANENTLY DELETE john@example.com"
  }'
```

**Response**:
```json
{
  "success": true,
  "userId": "user-uuid-here",
  "deleteType": "hard",
  "deletedAt": "2026-06-30T17:52:00Z",
  "totalRecordsDeleted": 847,
  "auditId": "master-audit-uuid",
  "message": "User permanently deleted. Cannot be recovered."
}
```

---

### User Deletion Policies

**Superadmin Self-Protection**:
- Superadmins cannot delete themselves
- Superadmins cannot delete other superadmins
- Other admin roles can be deleted only by another superadmin

**Data Cascade on Deletion**:

**Soft Delete** cascades to:
- Mark `patient_profiles.is_active = false`
- Mark `assessment_submissions.is_active = false`
- Mark `messages.is_active = false`
- Mark `notifications.is_active = false`
- Mark `clinical_notes.is_active = false`

**Hard Delete** cascades to:
- Delete all assessment responses
- Delete all assessment submissions
- Delete all patient profiles
- Delete all messages
- Delete all notifications
- Delete all clinical notes
- Delete all audit references (except master log)

---

## Assessment Result Management

### Deleting Assessment Results

**Purpose**: Remove specific assessment submissions and responses.

**Use Cases**:
- Erroneous assessment entry
- Duplicate submissions
- Data cleanup
- GDPR compliance

#### Step 1: Access Assessment Deletion

1. **Navigate to Assessment Management**
   ```
   Admin Dashboard > Assessment Management > Delete Results
   ```

2. **Select Deletion Method**
   - By Submission ID (single assessment)
   - By Patient ID (all assessments for a user)
   - By Assessment Definition (all instances of a type)

---

#### Step 2: Preview Deletion

**For Submission ID**:
```
1. Enter submission ID
2. Click "Preview"
3. System shows:
   - Submission details
   - All responses (questions/answers)
   - Timestamps
   - Patient information
4. Verify deletion scope
```

**For Patient ID**:
```
1. Enter patient email or ID
2. Click "Preview"
3. System shows:
   - Total submissions: X
   - Date range
   - Assessment types
   - Complete deletion impact
```

**For Assessment Definition**:
```
1. Select assessment type (e.g., "ADHD Zone Check-in")
2. Click "Preview"
3. System shows:
   - Total instances: X
   - Number of patients affected
   - Date range
   - WARNING if deleting large dataset
```

---

#### Step 3: Confirm Deletion

1. **Review Scope**
   - Confirm what will be deleted
   - Check deletion type (soft/hard)

2. **Enter Confirmation**
   - Type confirmation phrase
   - Provide reason for deletion

3. **Execute Deletion**
   - Click "Confirm Deletion"
   - Receive confirmation with deletion ID

---

#### Step 4: Verification

**Check Audit Log**:
```
Admin Dashboard > Audit Logs > Filter by deletion ID
```

**What to verify**:
- Deletion timestamp matches
- Correct number of records deleted
- Reason recorded accurately
- No errors logged

---

### Assessment Deletion API Examples

**Delete by Submission ID**:
```bash
curl -X DELETE https://app.vwelfare.com/api/admin/delete-results \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "submission-uuid",
    "deleteType": "soft",
    "reason": "Duplicate submission - patient took test twice"
  }'
```

**Delete by Patient ID**:
```bash
curl -X DELETE https://app.vwelfare.com/api/admin/delete-results \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "user-uuid",
    "deleteType": "soft",
    "reason": "Data cleanup - patient requested removal"
  }'
```

**Delete by Assessment Definition**:
```bash
curl -X DELETE https://app.vwelfare.com/api/admin/delete-results \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "definitionId": "assessment-def-uuid",
    "deleteType": "soft",
    "reason": "Retiring old assessment version"
  }'
```

**Response Example**:
```json
{
  "success": true,
  "deletedCount": 15,
  "deletionId": "deletion-audit-uuid",
  "deletedAt": "2026-06-30T18:00:00Z",
  "details": {
    "responsesDeleted": 127,
    "submissionsDeleted": 15,
    "patientsAffected": 12
  },
  "message": "Assessment results successfully deleted"
}
```

---

## Promo Code Management

### Creating Promo Codes

Promo codes allow you to offer discounts or free access to premium packages.

#### Types of Promo Codes

**Type 1: Free Use Code**
- Allows one free use of a package
- User pays $0
- After use, user must purchase normally
- No expiration tracking
- Example: "WELCOME50" → Free assessment package

**Type 2: Percentage Discount**
- Reduces price by percentage
- Example: 20% off → $100 package becomes $80
- Applies to single purchase
- Can be reused by multiple users

**Type 3: Fixed Amount Discount**
- Reduces price by fixed dollar amount
- Example: -$25 off → $100 package becomes $75
- Applies to single purchase
- Can be reused by multiple users

---

#### Step-by-Step: Create Promo Code

1. **Access Promo Code Management**
   ```
   Admin Dashboard > Promo Codes > Create New Code
   ```

2. **Fill in Basic Information**
   ```
   Code Name:        SUMMER2026
   Description:      Summer promotion - 25% off all packages
   Code Type:        [Select type]
   ```

3. **Configure by Type**

   **For Free Use Code**:
   ```
   Type:             free_use
   Discount Value:   [N/A - automatically 100%]
   Max Uses:         500    [How many users can use]
   Valid Until:      2026-08-31
   Active:           Yes
   ```

   **For Percentage Discount**:
   ```
   Type:             percentage
   Discount:         25          [Percentage: 1-99%]
   Max Uses:         1000        [How many users]
   Valid Until:      2026-08-31
   Active:           Yes
   ```

   **For Fixed Amount Discount**:
   ```
   Type:             fixed_amount
   Discount Amount:  25.00       [Dollar amount]
   Max Uses:         500
   Valid Until:      2026-08-31
   Active:           Yes
   ```

4. **Apply Restrictions** (Optional)

   ```
   Minimum Order:    $50.00      [Only for orders above this]
   Applicable To:    All Packages  [Or specific packages]
   Single Use Per User: Yes       [Can user use multiple times?]
   ```

5. **Review and Create**
   - Click "Preview Code"
   - Verify all settings
   - Click "Create Code"
   - Receive confirmation with code ID

6. **Share Code**
   - Unique code generated: `SUMMER2026`
   - Share with users via email
   - Post on marketing channels
   - Add to landing pages

---

### Managing Existing Promo Codes

#### View All Codes

1. **Navigate to Promo Code Dashboard**
   ```
   Admin Dashboard > Promo Codes > All Codes
   ```

2. **Filter and Search**
   ```
   Status:    [Active / Inactive / Expired]
   Type:      [Free Use / Percentage / Fixed Amount]
   Sort by:   [Creation Date / Uses / Expiration]
   ```

3. **View Code Details**
   - Code name and type
   - Discount value
   - Times used / Max uses
   - Expiration date
   - Status (active/inactive)
   - Created date
   - Performance metrics

---

#### Update Promo Code

**What Can Be Changed**:
- Status (activate/deactivate)
- Max uses limit
- Expiration date
- Description

**What Cannot Be Changed**:
- Code name (edit: create new, retire old)
- Discount type
- Discount value

**How to Update**:

1. **Find Code**
   ```
   Search for: SUMMER2026
   Click code to open details
   ```

2. **Edit Settings**
   ```
   Max Uses:     500 → 1000
   Valid Until:  2026-08-31 → 2026-09-30
   Status:       Active
   ```

3. **Save Changes**
   - Click "Update Code"
   - Confirmation message
   - Changes take effect immediately

---

#### Deactivate/Retire Promo Code

**When to Deactivate**:
- Campaign ended
- Code being retired
- Too many uses
- Reached expiration

**How to Deactivate**:

1. **Find Code**
   ```
   Admin Dashboard > Promo Codes > [Search SUMMER2026]
   ```

2. **Deactivate**
   - Click "Deactivate" button
   - Confirm deactivation
   - Code no longer usable by customers
   - Previous uses still tracked in history

3. **Retire (Archive)**
   - Code remains in system for historical records
   - Does not appear in active lists
   - Can still view usage statistics

---

### Using Promo Codes (User Experience)

**How Customers Apply Codes**:

1. **At Checkout**
   ```
   Select Package → Proceed to Checkout
   ↓
   Enter Code: SUMMER2026
   ↓
   Click "Apply"
   ↓
   Discount calculated and applied
   ↓
   Total updated (e.g., $100 → $75)
   ↓
   Complete Purchase
   ```

2. **Validation System**
   - Code must be active
   - Code must not be expired
   - User must not exceed max uses (if applicable)
   - Order must meet minimum if set
   - System prevents invalid combinations

3. **Verification**
   - Code shows in order details
   - Discount amount recorded
   - Audit log tracks usage
   - Payment records reference code

---

### Promo Code API Examples

**Create Promo Code**:
```bash
curl -X POST https://app.vwelfare.com/api/admin/promo-codes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER2026",
    "description": "Summer promotion",
    "type": "percentage",
    "discountValue": 25,
    "maxUses": 1000,
    "validUntil": "2026-08-31",
    "active": true
  }'
```

**Response**:
```json
{
  "success": true,
  "codeId": "promo-code-uuid",
  "code": "SUMMER2026",
  "type": "percentage",
  "discountValue": 25,
  "maxUses": 1000,
  "timesUsed": 0,
  "validUntil": "2026-08-31",
  "active": true,
  "createdAt": "2026-06-30T18:10:00Z"
}
```

**List All Codes**:
```bash
curl -X GET "https://app.vwelfare.com/api/admin/promo-codes?active=true&type=percentage" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Update Promo Code**:
```bash
curl -X PATCH https://app.vwelfare.com/api/admin/promo-codes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codeId": "promo-code-uuid",
    "maxUses": 1500,
    "validUntil": "2026-09-30",
    "active": true
  }'
```

**Deactivate Promo Code**:
```bash
curl -X DELETE https://app.vwelfare.com/api/admin/promo-codes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codeId": "promo-code-uuid"
  }'
```

---

## Payment & Package Management

### Package Overview

**Available Package Tiers**:

| Package | Price | Duration | Features |
|---------|-------|----------|----------|
| Basic | $9.99 | 30 days | Standard assessments |
| Standard | $24.99 | 30 days | All assessments + reports |
| Premium | $49.99 | 30 days | All + priority support |
| Professional | $99.99 | 30 days | Enterprise features |

---

### Viewing Payments

#### Payment Dashboard

1. **Access Payment Management**
   ```
   Admin Dashboard > Payments > All Transactions
   ```

2. **View Payment List**
   ```
   Date Range:    [Select from/to]
   Status:        [All / Pending / Succeeded / Failed / Refunded]
   Package:       [All / Specific package]
   User:          [Search by email or ID]
   Sort:          [Date / Amount / Status]
   ```

3. **Payment Details**
   ```
   Each transaction shows:
   - Transaction ID
   - User email
   - Amount and currency
   - Package name
   - Promo code applied (if any)
   - Final amount paid
   - Payment method
   - Timestamp
   - Status
   ```

---

#### Payment Statistics

1. **Access Analytics**
   ```
   Admin Dashboard > Payments > Analytics
   ```

2. **View Metrics**
   ```
   Total Revenue:        $[X,XXX.XX]
   
   By Status:
   - Succeeded:          [X] transactions - $[X,XXX.XX]
   - Pending:            [X] transactions - $[X,XXX.xx]
   - Failed:             [X] transactions
   - Refunded:           [X] transactions - $[X,XXX.XX]
   
   Top Packages by Revenue:
   1. Premium:           $[X,XXX.XX]
   2. Standard:          $[X,XXX.XX]
   3. Professional:      $[X,XXX.XX]
   
   Active Purchases:     [X] users with active packages
   ```

---

### Refund Management

**When to Issue Refunds**:
- User reports billing error
- Service failure during period
- User requests cancellation with justification
- System error caused duplicate charge

**How to Process Refund** (When payment system is fully integrated):

```
1. Find transaction in payment list
2. Click "Actions" → "Issue Refund"
3. Select refund type:
   - Full refund
   - Partial refund [enter amount]
4. Reason for refund
5. Confirm refund
6. Refund processed within 3-5 business days
```

---

## Analytics & Reporting

### User Analytics

**Access User Dashboard**:
```
Admin Dashboard > Analytics > Users
```

**Metrics Available**:
```
Total Users:           [X]
Active Users (30d):    [X]
New Users (Today):     [X]
New Users (This Week): [X]
Churn Rate:            [X%]
Signup Conversion:     [X%]
```

---

### Assessment Analytics

**Access Assessment Dashboard**:
```
Admin Dashboard > Analytics > Assessments
```

**Metrics Available**:
```
Total Assessments:     [X]
Completed Today:       [X]
Completion Rate:       [X%]
Average Time:          [X minutes]

By Assessment Type:
- ADHD Zone:           [X] completed
- [Other types]:       [X] completed

By Date Range:
- Today:               [X]
- This Week:           [X]
- This Month:          [X]
```

---

### Revenue Analytics

**Access Revenue Dashboard**:
```
Admin Dashboard > Analytics > Revenue
```

**Metrics Available**:
```
Monthly Revenue:       $[X,XXX.XX]
Daily Average:         $[XXX.XX]
Total MRR:             $[X,XXX.XX]

Top Revenue Sources:
1. Premium Package:    $[X,XXX.XX]
2. Standard Package:   $[X,XXX.XX]

Payment Methods:
- Credit Card:         [X%]
- Debit Card:          [X%]
- Digital Wallet:      [X%]
```

---

## API Reference

### Authentication

**All API calls require**:
```
Header: Authorization: Bearer YOUR_JWT_TOKEN
Header: Content-Type: application/json
Method: HTTPS (required)
```

**Token obtained from**:
- Login endpoint
- Valid for 24 hours
- Automatically refreshed

---

### Admin Endpoints

#### User Deletion

**Endpoint**: `POST /api/admin/delete-user`

**Parameters**:
```json
{
  "userId": "string (UUID)",
  "deleteType": "soft | hard",
  "reason": "string",
  "confirmationPhrase": "string (required for hard delete)"
}
```

**Response**:
```json
{
  "success": boolean,
  "userId": "string",
  "deleteType": "string",
  "deletedAt": "ISO8601 timestamp",
  "auditId": "string",
  "message": "string"
}
```

**Error Responses**:
```json
{
  "error": "Unauthorized - Not superadmin",
  "status": 403
}

{
  "error": "Cannot delete self or other superadmins",
  "status": 403
}

{
  "error": "User not found",
  "status": 404
}
```

---

#### Results Deletion

**Endpoint**: `DELETE /api/admin/delete-results`

**Parameters** (one required):
```json
{
  "submissionId": "string (UUID) - for single submission",
  "patientId": "string (UUID) - for all patient results",
  "definitionId": "string (UUID) - for all instances of assessment type",
  "deleteType": "soft | hard",
  "reason": "string"
}
```

**Response**:
```json
{
  "success": boolean,
  "deletedCount": integer,
  "deletionId": "string",
  "deletedAt": "ISO8601 timestamp",
  "details": {
    "responsesDeleted": integer,
    "submissionsDeleted": integer,
    "patientsAffected": integer
  }
}
```

---

#### Promo Code Management

**Create Code**:
```
POST /api/admin/promo-codes

{
  "code": "SUMMER2026",
  "type": "percentage | fixed_amount | free_use",
  "discountValue": 25,
  "maxUses": 1000,
  "validUntil": "2026-08-31",
  "active": true,
  "description": "string"
}
```

**List Codes**:
```
GET /api/admin/promo-codes?active=true&type=percentage
```

**Update Code**:
```
PATCH /api/admin/promo-codes

{
  "codeId": "string",
  "maxUses": 1500,
  "validUntil": "2026-09-30",
  "active": true
}
```

**Deactivate Code**:
```
DELETE /api/admin/promo-codes

{
  "codeId": "string"
}
```

---

#### Payment Information

**List Payments**:
```
GET /api/admin/payments?userId=X&status=succeeded&limit=20&offset=0
```

**Get Payment Stats**:
```
GET /api/admin/payments/stats

Response:
{
  "revenue": {
    "totalCents": 50000,
    "totalUSD": 500.00
  },
  "paymentsByStatus": {
    "succeeded": 12,
    "pending": 2,
    "failed": 1
  },
  "topPackages": [...],
  "activePurchases": 45
}
```

---

## Security Best Practices

### Access Control

✅ **DO**:
- Keep superadmin credentials secure
- Use strong, unique passwords
- Enable two-factor authentication (when available)
- Logout when finished
- Clear browser cache after logout

❌ **DON'T**:
- Share superadmin credentials
- Login on public WiFi
- Keep superadmin session open unattended
- Use the same password for multiple accounts
- Disable HTTPS

---

### Data Protection

✅ **DO**:
- Document reason for every deletion
- Review preview before confirming
- Audit logs regularly
- Follow deletion policies
- Keep records of deletions for compliance

❌ **DON'T**:
- Delete user data without valid reason
- Bypass confirmation prompts
- Delete superadmin accounts (use deactivation)
- Ignore audit log warnings
- Modify user data without documentation

---

### Audit Logging

**What is Recorded**:
- Every user deletion (soft and hard)
- Every assessment result deletion
- Every promo code created/modified
- Every refund issued
- Admin login/logout
- Failed authentication attempts

**Access Audit Logs**:
```
Admin Dashboard > Audit Logs

Filter by:
- Admin user
- Action type
- Date range
- Affected user
- Success/failure
```

**Audit Log Entry Example**:
```json
{
  "id": "audit-uuid",
  "adminId": "superadmin-uuid",
  "action": "user_deletion",
  "actionType": "soft_delete",
  "targetUserId": "user-uuid",
  "reason": "User requested account deactivation",
  "status": "success",
  "timestamp": "2026-06-30T18:00:00Z",
  "ipAddress": "[redacted for privacy]",
  "metadata": {
    "dataDeleted": ["profile", "assessments", "messages"],
    "recordsAffected": 42
  }
}
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Cannot Delete User

**Error**: "User not found"
```
Solution:
1. Verify user email or ID is correct
2. Check if user exists in system
3. Confirm user hasn't been deleted already
4. Check user's active status
```

**Error**: "Cannot delete self"
```
Solution:
1. Use different superadmin account
2. Or ask another superadmin to delete you
3. Superadmins cannot delete themselves
```

**Error**: "Unauthorized - Not superadmin"
```
Solution:
1. Confirm your account has superadmin role
2. Logout and login again
3. Check with system administrator
4. Verify token hasn't expired
```

---

#### Issue 2: Promo Code Not Working

**Error**: "Code not found"
```
Solution:
1. Verify code spelling (case-sensitive)
2. Check code is active
3. Confirm code hasn't expired
4. Check max uses not exceeded
```

**Error**: "Code already used by this user"
```
Solution:
1. Promo code allows only 1 use per user
2. Create new code for same user
3. Or increase max uses in code settings
```

**Error**: "Order amount below minimum"
```
Solution:
1. Code requires minimum order amount
2. User must add items to meet minimum
3. Or create new code with no minimum
```

---

#### Issue 3: Payment Processing

**Error**: "Payment failed"
```
Solution:
1. Check Stripe connection
2. Verify API keys are valid
3. Check payment method is valid
4. Contact Stripe support if persistent
```

**Error**: "Refund cannot be processed"
```
Solution:
1. Only succeeded transactions can be refunded
2. Check transaction status in payment list
3. May take 5-10 business days to appear
4. Contact payment processor support
```

---

#### Issue 4: Performance Issues

**Dashboard Loading Slow**:
```
Solution:
1. Clear browser cache
2. Close other tabs/applications
3. Check internet connection
4. Try different browser
5. Contact support if persistent
```

**Large Deletion Hanging**:
```
Solution:
1. Do not refresh page
2. Wait for process to complete (5-15 min for large deletions)
3. Check audit log for progress
4. If timeout occurs, contact support
```

---

### Getting Help

**Contact Support**:
- Email: admin@vwelfare.com
- Issues: Include error message, screenshot, timestamp
- Deletions: Include deletion ID from confirmation

**Escalation**:
- Critical security issues: security@vwelfare.com
- Database issues: dba@vwelfare.com

---

## Appendix: Keyboard Shortcuts

```
Admin Dashboard     Ctrl+1
Users              Ctrl+2
Assessments        Ctrl+3
Payments           Ctrl+4
Promo Codes        Ctrl+5
Analytics          Ctrl+6
Audit Logs         Ctrl+7
Logout             Ctrl+Q
```

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-30 | Initial release - User deletion, promo codes, payments |
| 1.1 | TBD | Refund system integration |
| 1.2 | TBD | Advanced analytics features |
| 2.0 | TBD | Machine learning insights |

---

**Last Updated**: June 30, 2026  
**Maintained By**: V Welfare Admin Team  
**Confidentiality**: Internal Use Only

---

**For questions or updates to this manual, please contact: admin@vwelfare.com**
