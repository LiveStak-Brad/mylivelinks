# MyLiveLinks Monetization System - LIVE Setup Guide

## Overview

This document covers the complete Coins → Gifts → Diamonds → Cashout flow using **Stripe Connect Express** in LIVE mode.

### Key Rules
- **40% Platform Fee**: Applied when user earns diamonds (not at cashout)
- **60% User Value**: Recipient gets 60% of coins as diamonds
- **100 Diamonds = $1 USD**: Direct conversion rate for cashouts
- **Minimum Cashout**: 10,000 diamonds = $100 USD
- **Coins are NON-REDEEMABLE**: Cannot be cashed out, only spent on gifts

---

## Environment Variables (Required)

Add these to your `.env.local` and Vercel environment:

```bash
# Stripe LIVE Keys (already configured)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stripe Webhook Secret (LIVE endpoint)
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Service Role (for webhook handlers)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Stripe Dashboard Configuration (LIVE Mode)

### 1. Create Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click **Add endpoint**
3. Endpoint URL: `https://mylivelinks.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed` ✅ (Required - coin purchases)
   - `account.updated` ✅ (Required - Connect status)
   - `payout.paid` (Recommended - audit)
   - `payout.failed` (Recommended - audit)
   - `transfer.created` (Optional - audit)
5. Copy the **Signing secret** → Set as `STRIPE_WEBHOOK_SECRET`

### 2. Stripe Connect Settings

1. Go to Stripe Dashboard → Settings → Connect
2. Enable Express accounts
3. Set branding (logo, colors)
4. Configure country availability

---

## Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- Execute the migration file
\i monetization_system.sql
```

Or copy the contents of `monetization_system.sql` and run directly.

### Tables Created/Updated
- `coin_packs` - Available coin purchase options
- `ledger_entries` - Idempotent transaction log
- `connect_accounts` - Stripe Connect account status
- `cashouts` - Cashout requests and transfers
- `stripe_events` - Webhook event audit log
- `profiles` - Added lifetime tracking fields
- `gifts` - Added platform fee tracking columns

---

## API Endpoints

### Coin Purchase Flow

```
POST /api/coins/create-checkout
Body: { packSku: "coins_700_usd_999" }
Returns: { url: "https://checkout.stripe.com/..." }
```

### Gift Flow

```
POST /api/gifts/send
Body: { 
  toUserId: "uuid",
  coinsAmount: 100,
  giftTypeId: 1,      // optional
  streamId: 123       // optional
}
Returns: { 
  success: true,
  giftId: 456,
  coinsSpent: 100,
  diamondsAwarded: 60,  // 60% of coins
  platformFee: 40       // 40% of coins
}
```

### Connect Onboarding

```
POST /api/connect/onboard
Returns: { url: "https://connect.stripe.com/..." }

GET /api/connect/status
Returns: {
  hasAccount: true,
  payoutsEnabled: true,
  onboardingComplete: true,
  country: "US"
}
```

### Cashout Request

```
POST /api/cashout/request
Body: { diamondsRequested: 15000 }  // optional, defaults to max
Returns: {
  success: true,
  cashoutId: 789,
  diamondsDebited: 15000,
  amountUsd: 150.00,
  transferId: "tr_xxx",
  remainingDiamonds: 5000
}
```

---

## Smoke Test Steps (LIVE - Use Small Amounts)

### Test 1: Coin Purchase

1. Log in as test user
2. Go to `/wallet`
3. Click on $4.99 coin pack
4. Complete Stripe Checkout with real card
5. Verify:
   - Webhook received (`stripe_events` table)
   - Ledger entry created (`ledger_entries` table)
   - Coin balance updated (`profiles.coin_balance`)

### Test 2: Gift Sending

1. Log in as User A (with coins)
2. Go to live room
3. Send gift to User B
4. Verify:
   - User A: coins deducted
   - User B: diamonds = 60% of coins
   - Gift record in `gifts` table
   - Ledger entries for both users

### Test 3: Stripe Connect Setup

1. Log in as user who will receive gifts
2. Go to `/wallet`
3. Click "Set Up Payouts"
4. Complete Stripe Express onboarding
5. Verify:
   - `connect_accounts` row created
   - `payouts_enabled = true` after completion

### Test 4: Cashout

1. Log in as user with ≥10,000 diamonds
2. Go to `/wallet`
3. Enter cashout amount
4. Click "Cash Out"
5. Verify:
   - Diamonds deducted from balance
   - `cashouts` row created with `stripe_transfer_id`
   - Transfer visible in Stripe Dashboard

---

## Idempotency & Safety

All operations are idempotent:

- **Webhook**: Uses `stripe_events.event_id` to prevent duplicate processing
- **Coin Purchase**: Uses `ledger_entries.idempotency_key = stripe:checkout:{session_id}`
- **Gifts**: Uses `request_id` for deduplication
- **Cashout**: Uses `cashouts.idempotency_key = cashout:{request_id}`

---

## Logging

All API routes include structured logging:

```
[STRIPE] {"timestamp":"...","service":"stripe","action":"checkout-success","userId":"...","sessionId":"..."}
```

Check server logs for:
- `webhook-received` - Incoming webhook
- `checkout-finalized` - Coin purchase completed
- `account-updated` - Connect status change
- `cashout-success` - Transfer created

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Insufficient coin balance" | User doesn't have enough coins | Buy more coins |
| "Payouts not enabled" | Connect onboarding incomplete | Complete Stripe setup |
| "Minimum cashout is 10,000 diamonds" | Balance too low | Earn more diamonds |
| "Transfer failed" | Stripe API error | Diamonds auto-refunded |

### Webhook Failures

If webhook fails:
1. Check `STRIPE_WEBHOOK_SECRET` is correct
2. Check server logs for signature verification errors
3. Stripe will retry failed webhooks automatically

---

## Fee Structure Summary

| Action | User Pays/Receives | Platform Gets |
|--------|-------------------|---------------|
| Buy 100 coins | Pays $X | $X revenue |
| Send 100 coin gift | -100 coins | 40 coins (40%) |
| Receive 100 coin gift | +60 diamonds | - |
| Cash out 10,000 diamonds | +$100 | - (fee already taken) |

**Important**: Platform fee (40%) is taken once, when diamonds are awarded. No additional fee at cashout.

---

## Files Changed

### New Files
- `lib/stripe.ts` - Stripe client & helpers
- `lib/supabase-admin.ts` - Admin client for webhooks
- `app/api/coins/create-checkout/route.ts`
- `app/api/coins/packs/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/gifts/send/route.ts`
- `app/api/connect/onboard/route.ts`
- `app/api/connect/status/route.ts`
- `app/api/cashout/request/route.ts`
- `app/wallet/page.tsx`
- `monetization_system.sql`

### Updated Files
- `components/CoinPurchaseSection.tsx` - Wired to checkout API
- `components/GiftModal.tsx` - Updated to 60% diamond rate
- `package.json` - Added stripe dependency

---

## Checklist Before Go-Live

- [ ] `STRIPE_SECRET_KEY` is LIVE key (`sk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` is from LIVE webhook endpoint
- [ ] Webhook endpoint verified in Stripe Dashboard
- [ ] Run `monetization_system.sql` migration
- [ ] Test coin purchase with real card (small amount)
- [ ] Test Connect onboarding for US user
- [ ] Test cashout with real diamonds
- [ ] Verify logs are appearing in production




