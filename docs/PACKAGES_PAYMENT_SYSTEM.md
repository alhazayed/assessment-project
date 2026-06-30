# Premium Assessment Packages - Payment System Documentation

**Version**: 1.0.0 (Coming Soon)  
**Status**: Infrastructure Ready for Launch  
**Release Target**: Q3 2026

---

## Overview

The Premium Assessment Packages system enables monetization of specialized assessment instruments through Stripe payment processing. Users purchase packages to access advanced assessments, with all results securely stored in their personal dashboard.

**Key Components**:
- Stripe payment integration (PCI-DSS compliant)
- Flexible pricing (one-time & recurring)
- Superadmin promo code management
- Payment analytics dashboard
- Secure result storage & retrieval

---

## Payment System Architecture

### Database Schema

#### 1. Stripe Configuration
```sql
stripe_configuration
├── public_key (Stripe publishable key)
├── webhook_secret (Stripe webhook signing secret)
├── test_mode (boolean)
└── configured (boolean)
```

#### 2. Products & Pricing
```sql
stripe_products
├── id (UUID)
├── stripe_product_id (Stripe API ID)
├── name
├── description
└── active

stripe_prices
├── id (UUID)
├── stripe_price_id (Stripe API ID)
├── amount_cents
├── currency (default: usd)
├── interval (one_time, month, year)
└── active
```

#### 3. Payments & Transactions
```sql
payments
├── id (UUID)
├── stripe_payment_intent_id
├── user_id (FK → profiles)
├── package_id (FK → packages)
├── amount_cents
├── status (pending, succeeded, failed, cancelled)
├── promo_code_id (FK → promo_codes)
├── discount_applied_cents
└── created_at

package_purchases
├── id (UUID)
├── user_id (FK → profiles)
├── package_id (FK → packages)
├── payment_id (FK → payments)
├── status (active, cancelled, expired)
├── purchased_at
└── expires_at
```

#### 4. Promo Codes (Superadmin Managed)
```sql
promo_codes
├── id (UUID)
├── code (UNIQUE, uppercase)
├── code_type (free_use, discount)
├── discount_type (percentage, fixed_amount, free)
├── discount_value
├── created_by (FK → profiles)
├── max_uses
├── current_uses
├── valid_from
├── valid_until
└── active

promo_code_usage
├── id (UUID)
├── promo_code_id (FK → promo_codes)
├── user_id (FK → profiles)
└── used_at
```

#### 5. Results Storage
```sql
purchased_package_results
├── id (UUID)
├── user_id (FK → profiles)
├── package_id (FK → packages)
├── package_purchase_id (FK → package_purchases)
├── responses (JSONB - user answers)
├── results (JSONB - computed scores)
├── interpretation (text)
├── score (integer)
├── severity_level (text)
├── recommendations (text[])
└── created_at
```

---

## Superadmin Features

### 1. Promo Code Management

**Create Free Use Code**:
```bash
POST /api/admin/promo-codes
Content-Type: application/json
Authorization: Bearer [superadmin-token]

{
  "code": "FREEPILOT2026",
  "codeType": "free_use",
  "description": "Free access for pilot users",
  "maxUses": 100,
  "validUntil": "2026-12-31T23:59:59Z"
}
```

Response:
```json
{
  "ok": true,
  "code": {
    "id": "uuid",
    "code": "FREEPILOT2026",
    "code_type": "free_use",
    "max_uses": 100,
    "current_uses": 0,
    "active": true,
    "created_at": "2026-06-30T15:00:00Z"
  }
}
```

**Create Percentage Discount Code**:
```bash
POST /api/admin/promo-codes
{
  "code": "SUMMER25",
  "codeType": "discount",
  "discountType": "percentage",
  "discountValue": 25,
  "description": "25% off summer promotion",
  "maxUses": 500,
  "validUntil": "2026-09-30T23:59:59Z"
}
```

**Create Fixed Amount Discount**:
```bash
POST /api/admin/promo-codes
{
  "code": "FLAT5OFF",
  "codeType": "discount",
  "discountType": "fixed_amount",
  "discountValue": 500,  // $5.00 in cents
  "description": "$5 off any package",
  "maxUses": 1000
}
```

### 2. Code Management

**List All Promo Codes**:
```bash
GET /api/admin/promo-codes
GET /api/admin/promo-codes?active=true

Response:
{
  "codes": [
    {
      "id": "uuid",
      "code": "FREEPILOT2026",
      "code_type": "free_use",
      "current_uses": 42,
      "max_uses": 100,
      "active": true,
      "valid_until": "2026-12-31T23:59:59Z",
      "created_by_profile": {
        "full_name_en": "Admin User"
      }
    }
  ],
  "total": 12
}
```

**Update Promo Code**:
```bash
PATCH /api/admin/promo-codes/[id]
{
  "active": false,
  "maxUses": 150
}
```

**Deactivate or Delete Code**:
```bash
DELETE /api/admin/promo-codes/[id]
```

### 3. Payment Monitoring

**View All Payments**:
```bash
GET /api/admin/payments

Query parameters:
- userId: Filter by customer
- packageId: Filter by package
- status: pending, succeeded, failed, cancelled
- sortBy: created_at (default), amount_cents, status
- limit: 1-500 (default 50)
- offset: pagination offset

Response:
{
  "payments": [
    {
      "id": "uuid",
      "stripe_payment_intent_id": "pi_...",
      "user": {
        "full_name_en": "John Doe",
        "email": "john@example.com"
      },
      "package": {
        "name": "Advanced Personality Assessment"
      },
      "amount_cents": 9999,
      "currency": "usd",
      "status": "succeeded",
      "discount_applied_cents": 2500,
      "created_at": "2026-06-28T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 243
  }
}
```

**Payment Analytics Dashboard**:
```bash
GET /api/admin/payments/stats

Response:
{
  "revenue": {
    "totalCents": 54250000,
    "totalUSD": 542500.00
  },
  "paymentsByStatus": {
    "succeeded": 1240,
    "pending": 12,
    "failed": 8,
    "cancelled": 3
  },
  "topPackages": [
    {
      "package_id": "uuid",
      "package": {
        "name": "Comprehensive Wellness Assessment"
      },
      "amount_cents": 19999
    }
  ],
  "activePurchases": 1215
}
```

---

## User Payment Flow (When Live)

### 1. Browse Packages
User sees:
- Package name & description
- Price
- Discount if promo code applied
- Testimonials/reviews
- What's included (assessment list)

### 2. Apply Promo Code
```
"SUMMER25" → 25% discount applied
"FREEPILOT2026" → Free access code
```

### 3. Checkout
- Stripe payment form (PCI-DSS compliant)
- Credit/debit card entry
- Billing information

### 4. Payment Processing
- Stripe processes payment
- Webhook callback to backend
- Payment record created
- Package purchase activated

### 5. Access Package
- Package unlocked in dashboard
- Can start assessments
- Results stored in personal account

### 6. Results Dashboard
- View all completed assessments
- Track scores over time
- Export/share results
- Access interpretations & recommendations

---

## Promo Code Types

### Free Use Code
- Users get **free unlimited access** to a package
- No payment required
- Limited use count (optional)
- Example: `FREEPILOT2026` for 100 pilot users

### Discount Code
**Percentage-based**:
- Example: `SUMMER25` = 25% off any purchase
- Applied to final price

**Fixed Amount**:
- Example: `FLAT5OFF` = $5.00 off
- Subtracted from price

**Free Grant**:
- Special discount type that makes package free
- Useful for special promotions

---

## Security Features

### 1. RLS Policies
```sql
-- Users see only their own payments
policy: users_can_view_own_payments

-- Users see only their own purchases
policy: users_can_view_own_purchases

-- Only superadmin can manage promo codes
policy: superadmin_can_manage_promo_codes

-- Superadmin only can access Stripe configuration
policy: only_superadmin_can_access_stripe_config
```

### 2. Stripe Integration
- PCI-DSS Level 1 compliant
- No card data stored locally
- Webhook signature verification
- Idempotency keys for retry safety

### 3. Audit Logging
All actions logged:
- Promo code created/updated/deleted
- Payment processed
- Purchase activated
- Code usage tracked
- Superadmin actions recorded

---

## Configuration

### Environment Variables Required
```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Payment Processing
PAYMENT_WEBHOOK_URL=https://vwelfare.com/api/webhooks/stripe
```

### Superadmin Setup
1. Configure Stripe keys in Stripe configuration table
2. Create Stripe products for each package
3. Set pricing in Stripe
4. Create promo codes for campaigns
5. Configure webhook endpoint

---

## Code Quotas & Best Practices

### Free Use Codes
- Set reasonable max_uses (e.g., 50-500)
- Use for:
  - Pilot programs
  - Clinical trials
  - Staff testing
  - Educational access

### Discount Codes
- Set max_uses to limit liability
- Typical limits: 100-1000 uses
- Use for:
  - Seasonal promotions
  - User acquisition campaigns
  - Referral incentives
  - Partnership agreements

### Expiration Strategy
- Free codes: ~3-6 month validity
- Discount codes: ~1-2 months
- Always set valid_until for time-limited campaigns
- Can deactivate codes manually before expiry

---

## Examples

### Example 1: Launch Promotion
```bash
# 30% off launch discount
POST /api/admin/promo-codes
{
  "code": "LAUNCH30",
  "codeType": "discount",
  "discountType": "percentage",
  "discountValue": 30,
  "description": "Launch week promotion - 30% off",
  "maxUses": 500,
  "validUntil": "2026-07-07T23:59:59Z"
}

# Result: User pays $699.93 instead of $999.90 on a $999.90 package
```

### Example 2: Free Pilot Access
```bash
# Free access for pilot clinics
POST /api/admin/promo-codes
{
  "code": "CLINICPILOT",
  "codeType": "free_use",
  "description": "Free pilot access for participating clinics",
  "maxUses": 50,
  "validUntil": "2026-12-31T23:59:59Z"
}

# Result: 50 clinic users get free unlimited access
```

### Example 3: Referral Incentive
```bash
# $10 off for referrals
POST /api/admin/promo-codes
{
  "code": "REFER10",
  "codeType": "discount",
  "discountType": "fixed_amount",
  "discountValue": 1000,  // $10.00
  "description": "Referral reward - $10 off",
  "maxUses": 1000
}
```

---

## Monitoring & Maintenance

### Daily
- Monitor failed payments
- Check webhook status
- Review error logs

### Weekly
- Review promo code usage
- Monitor revenue trends
- Check active subscriptions

### Monthly
- Full payment reconciliation
- Stripe statement review
- Promo code performance analysis
- Inactive code cleanup

---

## Troubleshooting

### Promo Code Not Working
1. Check if code is active
2. Verify valid_from / valid_until dates
3. Check if max_uses exceeded
4. Ensure code_type matches (free_use vs discount)

### Payment Failed
1. Check Stripe logs
2. Verify card details
3. Check for fraud flags
4. Retry payment

### Results Not Saving
1. Verify user has active package purchase
2. Check database permissions
3. Review audit logs
4. Check RLS policies

---

## Future Enhancements

- [ ] Subscription management (pause/cancel/upgrade)
- [ ] Automated invoice generation
- [ ] Tax calculation integration
- [ ] Multi-currency support
- [ ] Affiliate program
- [ ] Usage-based billing
- [ ] Enterprise agreements
- [ ] Bulk licensing

---

## Support & Contact

- **Technical Issues**: devops@vwelfare.com
- **Payment Issues**: payments@vwelfare.com
- **Superadmin Support**: admin@vwelfare.com
- **Stripe Support**: Via Stripe dashboard

---

**Status**: Infrastructure ready. UI and Stripe integration coming next.

🚀 **Target Launch**: Q3 2026
