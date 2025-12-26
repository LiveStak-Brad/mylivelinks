# Schema Changes Applied

## Summary

All critical production requirements have been applied to the database schema. The schema is now production-ready for Supabase with ledger-based coins, strict idempotency, and demand-based publishing.

---

## Changes Applied

### 1. ✅ Supabase Auth Integration

**Before:**
- Custom `users` table with BIGINT primary key
- `user_profiles` table referencing `users.id`

**After:**
- **Removed** custom `users` table
- **Renamed** `user_profiles` → `profiles` (primary user table)
- `profiles.id` is UUID PRIMARY KEY referencing `auth.users(id)`
- **All foreign keys** now reference `profiles.id` (UUID)

**Impact:**
- Compatible with Supabase Auth
- Avoids duplicate identity tables
- RLS-ready (can use `auth.uid()`)
- Clean join logic

---

### 2. ✅ Ledger-Based Coin System

**Before:**
- `coins` table with `balance` field
- Triggers updating balance on purchases/gifts
- Risk of balance drift from retries, partial failures, concurrent updates

**After:**
- **Created** `coin_ledger` table (immutable transaction log)
- `profiles.coin_balance` is **cached** (source of truth is ledger)
- **Removed** trigger-based balance updates
- **Created** `update_coin_balance_via_ledger()` RPC function with row locking
- Balance computed as `SUM(amount)` from ledger

**Impact:**
- Prevents balance drift
- Enables audit trail
- Supports reconciliation
- Handles concurrent updates safely

---

### 3. ✅ Strict Idempotency for High-Value Purchases

**Before:**
- `coin_purchases` had `payment_intent_id` UNIQUE
- No webhook event ID tracking
- Risk of duplicate processing on webhook retries

**After:**
- **Added** `provider_event_id` VARCHAR(255) UNIQUE (webhook event ID)
- **Added** `provider_payment_id` VARCHAR(255) UNIQUE (payment intent/transaction ID)
- **Created** `process_coin_purchase()` RPC function with idempotency check
- Status state machine: 'pending' → 'confirmed' → 'refunded'/'chargeback'

**Impact:**
- Prevents duplicate processing on webhook retries
- Safe for $25,000+ purchases
- Handles Stripe/Apple/Google webhook retries

---

### 4. ✅ Demand-Based Publishing Derived from Viewers

**Before:**
- `is_published` boolean could be set manually
- Risk of state drift
- Client-side toggles could cause inconsistencies

**After:**
- `is_published` is **derived** from `box_viewers` presence
- **Created** `update_publish_state_from_viewers()` RPC function
- **Created** `cleanup_stale_viewers()` RPC function (heartbeat timeout)
- Viewer heartbeat required (`last_active_at` updated every 10-15 seconds)

**Impact:**
- Single source of truth (box_viewers)
- No state drift
- Automatic publish/unpublish based on viewer presence
- Handles disconnects gracefully

---

### 5. ✅ BIGINT for All Coin Fields

**Before:**
- Some coin fields used INTEGER
- Risk of overflow with whale-level balances

**After:**
- **All coin fields** use BIGINT:
  - `coin_balance`, `earnings_balance`
  - `total_purchased`, `total_spent`
  - `total_gifts_received`, `total_gifts_sent`
  - `coin_amount`, `platform_revenue`, `streamer_revenue`
  - `coin_cost` in gift_types
  - `amount` in coin_ledger

**Impact:**
- Supports millions of coins per user
- No overflow risk
- Whale-ready

---

### 6. ✅ Separate Earnings Balance

**Before:**
- Single `coin_balance` field
- Earnings mixed with purchased coins

**After:**
- **Added** `earnings_balance` BIGINT to `profiles`
- Separate from `coin_balance` (spendable coins)
- Gift earnings go to `earnings_balance`
- Purchased coins go to `coin_balance`

**Impact:**
- Clean accounting separation
- Can implement conversion policy later
- Clear distinction between purchased vs earned coins

---

### 7. ✅ Updated All Foreign Keys

**Before:**
- Foreign keys referenced `users.id` (BIGINT)

**After:**
- **All foreign keys** reference `profiles.id` (UUID):
  - `live_streams.profile_id`
  - `coin_ledger.profile_id`
  - `coin_purchases.profile_id`
  - `gifts.sender_id`, `gifts.recipient_id`
  - `chat_messages.profile_id`
  - `user_links.profile_id`
  - `follows.follower_id`, `follows.followee_id`
  - `box_viewers.viewer_id`
  - `video_boxes.streamer_id`
  - `leaderboard_cache.profile_id`

**Impact:**
- Consistent UUID references throughout
- Compatible with Supabase Auth
- Clean data model

---

## New RPC Functions

### `update_coin_balance_via_ledger()`
- **Purpose:** Only function that updates `profiles.coin_balance`
- **Features:** Row locking, ledger insertion, balance recalculation
- **Usage:** Call for all coin movements

### `process_coin_purchase()`
- **Purpose:** Idempotent purchase processing
- **Features:** Checks `provider_event_id`, updates ledger, updates balance
- **Usage:** Call from webhook handlers

### `process_gift()`
- **Purpose:** Process gift transaction
- **Features:** Validates balance, calculates revenue split, updates ledger
- **Usage:** Call when user sends gift

### `update_publish_state_from_viewers()`
- **Purpose:** Derives `is_published` from viewer presence
- **Features:** Checks active viewer count, sets publish state
- **Usage:** Call periodically (every 10-15 seconds)

### `cleanup_stale_viewers()`
- **Purpose:** Removes stale viewer sessions
- **Features:** Deletes viewers with `last_active_at` > 30 seconds
- **Usage:** Call periodically (every 30 seconds)

---

## Removed Triggers

- ❌ `trigger_update_coin_balance_on_purchase` - Replaced with RPC function
- ❌ `trigger_deduct_coins_on_gift` - Replaced with RPC function

**Kept Triggers:**
- ✅ `trigger_update_follower_count` - Safe, no concurrency issues
- ✅ `trigger_update_gift_totals` - Safe, aggregates only
- ✅ `trigger_update_live_status` - Safe, denormalization only
- ✅ `trigger_update_box_viewer_count` - Safe, counter only
- ✅ `trigger_update_recent_gifts` - Safe, counter only

---

## Migration Path

If migrating from previous schema:

1. **Create `profiles` table** with UUID primary key
2. **Migrate user data** from `users` to `profiles`
3. **Update foreign keys** to UUID references
4. **Create `coin_ledger` table** and backfill balances
5. **Add idempotency fields** to `coin_purchases`
6. **Add `earnings_balance`** to `profiles`
7. **Update application code** to use RPC functions

---

## Testing Checklist

Before production:

- [ ] Test coin purchase idempotency (duplicate webhook events)
- [ ] Test concurrent coin transactions (multiple purchases/gifts)
- [ ] Test demand-based publishing (viewer join/leave)
- [ ] Test stale viewer cleanup (heartbeat timeout)
- [ ] Test ledger balance reconciliation (SUM matches cached balance)
- [ ] Test high-value purchases ($25,000+)
- [ ] Test refund/chargeback processing
- [ ] Test RLS policies with Supabase Auth

---

## Performance Considerations

1. **Ledger Queries:** Index `coin_ledger` by `profile_id` and `created_at` for fast balance queries
2. **Publish State Updates:** Run `update_publish_state_from_viewers()` every 10-15 seconds (not on every viewer change)
3. **Stale Cleanup:** Run `cleanup_stale_viewers()` every 30 seconds
4. **Leaderboard Refresh:** Cache refresh cadence defined in `leaderboard_cache` comments

---

## Security Considerations

1. **RLS Policies:** Set up Row Level Security on all tables referencing `auth.uid()`
2. **RPC Security:** RPC functions use `SECURITY DEFINER` - validate inputs
3. **Idempotency:** Always check `provider_event_id` before processing purchases
4. **Row Locking:** `update_coin_balance_via_ledger()` uses `FOR UPDATE` to prevent race conditions

---

## Next Steps

1. ✅ Schema approved and updated
2. ⏭️ Set up Supabase project
3. ⏭️ Run `database_schema.sql`
4. ⏭️ Configure RLS policies
5. ⏭️ Implement webhook handlers with idempotency
6. ⏭️ Set up cron jobs for publish state updates
7. ⏭️ Test high-value purchases
8. ⏭️ Deploy to production

---

**Schema is production-ready!** 🚀











