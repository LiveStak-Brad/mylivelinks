# MyLiveLinks Database Schema Design

## Overview

This schema supports a production-grade group live streaming platform with:
- Demand-based video publishing (cost-efficient)
- High-value monetization (coins, gifting)
- Real-time leaderboards
- Profile system with external links
- 12-box group live room

**Critical Production Requirements:**
- ✅ Supabase Auth integration (uses `auth.users`, `profiles` is primary table)
- ✅ Ledger-based coin system (immutable transaction log)
- ✅ Strict idempotency for high-value purchases
- ✅ Demand-based publishing derived from viewer presence
- ✅ BIGINT for all coin fields (supports whale-level balances)

---

## Table Relationships

```
auth.users (Supabase) ──< (1) profiles (PRIMARY USER TABLE)
profiles (1) ──< (1) live_streams
profiles (1) ──< (*) ledger_entries (source of truth for balances)
profiles (1) ──< (*) coin_purchases
profiles (1) ──< (*) gifts (as sender)
profiles (1) ──< (*) gifts (as recipient)
profiles (1) ──< (*) user_links
profiles (1) ──< (*) follows (as follower)
profiles (1) ──< (*) follows (as followee)
profiles (1) ──< (*) chat_messages
profiles (1) ──< (*) video_boxes (as streamer)
profiles (1) ──< (*) box_viewers (as viewer)

live_streams (1) ──< (*) video_boxes
video_boxes (1) ──< (*) box_viewers (SOURCE OF TRUTH for is_published)

gift_types (1) ──< (*) gifts
coin_purchases (1) ──< (*) ledger_entries
gifts (1) ──< (*) ledger_entries
```

---

## Table Descriptions

### 1. `profiles` (PRIMARY USER TABLE)
**This is the main user table - everything references `profiles.id` (UUID)**

**Purpose:** Primary user table that references Supabase `auth.users.id`. All other tables reference `profiles.id`, not a custom users table.

**Key Fields:**
- `id` - UUID PRIMARY KEY, references `auth.users(id)` ON DELETE CASCADE
- `username` - Unique username (used in URLs: /username)
- `avatar_url`, `bio`, `display_name` - Profile data
- `follower_count` - Cached follower count (updated via trigger)
- `total_gifts_received` - Lifetime gifts received (coins) - BIGINT
- `total_gifts_sent` - Lifetime gifts sent (coins) - BIGINT
- `coin_balance` - **Cached** spendable coin balance (BIGINT) - source of truth is `ledger_entries`
- `earnings_balance` - **Separate** earnings from gifts (BIGINT) - may convert to spendable per policy
- `total_purchased` - Lifetime coins purchased (BIGINT)
- `total_spent` - Lifetime coins spent (BIGINT)
- `is_live` - Current live status (denormalized from live_streams)

**Important:**
- `coin_balance` is **cached** - always update via `update_coin_balance_via_ledger()` RPC
- `earnings_balance` is separate from `coin_balance` for clean accounting
- All foreign keys reference `profiles.id` (UUID), not a custom users table

**Indexes:**
- Primary key on `id` (UUID)
- Unique index on `username` (for URL routing)
- Index on `coin_balance` DESC (for high-balance queries)
- Index on `total_gifts_received` DESC (for leaderboards)
- Index on `is_live` (for live discovery)

---

### 2. `live_streams`
Tracks streamer live availability and publishing state.

**Purpose:** Implements demand-based publishing logic. Streamers are marked `live_available` when they press "Go Live", but `is_published` is **DERIVED** from viewer presence, not manually set.

**Key Fields:**
- `profile_id` - UUID references `profiles(id)` (not users.id)
- `live_available` - Streamer has pressed "Go Live" (eligible for boxes)
- `is_published` - **DERIVED** from `box_viewers` presence - **DO NOT SET MANUALLY**
- `published_at` - When video was first published
- `unpublished_at` - When video was last unpublished
- `total_viewer_minutes` - Aggregate viewing time (BIGINT)
- `webrtc_channel`, `webrtc_token`, `webrtc_uid` - WebRTC connection data

**Critical Logic:**
- `is_published` is controlled by `update_publish_state_from_viewers()` RPC function
- When `box_viewers` count > 0 for a stream → `is_published = true`
- When `box_viewers` count = 0 → `is_published = false`
- Streamer remains `live_available = true` until they manually stop

**Indexes:**
- Primary key on `id`
- Unique index on `profile_id` (one active stream per user)
- Index on `live_available` WHERE `live_available = TRUE`
- Index on `is_published` WHERE `is_published = TRUE`

---

### 3. `video_boxes`
Represents the 12-box grid state in the main live room.

**Purpose:** Tracks which streamers occupy which box positions, viewer counts, and box state.

**Key Fields:**
- `position` - Box number (1-12)
- `streamer_id` - UUID references `profiles(id)` (not users.id)
- `live_stream_id` - Foreign key to live_streams
- `viewer_count` - Current viewers watching this box (denormalized from box_viewers)
- `gifts_received_recent` - Gifts received in last 5 minutes (BIGINT, for auto-selection)
- `is_pinned`, `is_muted` - Viewer preferences

**Indexes:**
- Primary key on `id`
- Unique index on `position` (one box per position)
- Index on `streamer_id` (UUID)
- Index on `viewer_count` DESC (for sorting)
- Index on `gifts_received_recent` DESC (for auto-selection)

---

### 4. `box_viewers`
Tracks which users are currently watching which video boxes.

**Purpose:** **SOURCE OF TRUTH** for demand-based publishing. When `box_viewers` is empty for a stream, video unpublishes.

**Key Fields:**
- `box_id` - Foreign key to video_boxes
- `viewer_id` - UUID references `profiles(id)` (not users.id)
- `joined_at` - When viewer started watching
- `last_active_at` - **Last heartbeat timestamp** (critical for disconnect detection)

**Critical Logic:**
- When viewer opens box: INSERT into `box_viewers`
- Periodic heartbeat updates `last_active_at` (every 10-15 seconds)
- If `last_active_at` > 30 seconds old → viewer considered disconnected
- `cleanup_stale_viewers()` function removes stale sessions
- `update_publish_state_from_viewers()` function sets `is_published` based on active viewer count

**Indexes:**
- Primary key on `id`
- Unique index on `(box_id, viewer_id)` (one viewer record per box)
- Index on `viewer_id` (UUID)
- Index on `box_id` (for box viewer queries)
- Index on `last_active_at` (for cleanup of stale sessions)

---

### 5. `ledger_entries` ⚠️ **CRITICAL - SOURCE OF TRUTH**
Immutable transaction log for all coin movements.

**Purpose:** **Source of truth** for coin balances. All coin movements go through this table. `profiles.coin_balance` is cached and updated only via `update_coin_balance_via_ledger()` RPC.

**Key Fields:**
- `profile_id` - UUID references `profiles(id)`
- `amount` - BIGINT (positive for credits, negative for debits)
- `type` - 'purchase', 'gift_sent', 'gift_received', 'refund', 'chargeback', 'admin_adjustment'
- `ref_type` - 'coin_purchase', 'gift', etc.
- `ref_id` - Foreign key to related record
- `description` - Human-readable description
- `created_at` - Timestamp (immutable)

**Why Ledger-Based:**
- Prevents balance drift from retries, partial failures, concurrent updates
- Enables audit trail and reconciliation
- Balance computed as `SUM(amount)` from ledger
- Cached balance updated only via single RPC with row locking

**Indexes:**
- Primary key on `id`
- Index on `profile_id` (UUID)
- Index on `type`
- Index on `(ref_type, ref_id)` (for related record lookups)
- Index on `created_at` DESC (for transaction history)

---

### 6. `coin_purchases`
Purchase transactions with **strict idempotency** for high-value purchases.

**Purpose:** Tracks revenue, supports refunds, and enables analytics. **Critical for $25,000+ purchases** - must handle Stripe webhook retries and duplicate events.

**Key Fields:**
- `profile_id` - UUID references `profiles(id)`
- `platform` - 'web', 'ios', 'android'
- `payment_provider` - 'stripe', 'apple', 'google'
- **`provider_event_id`** - **UNIQUE** webhook event ID (prevents duplicate processing)
- **`provider_payment_id`** - **UNIQUE** payment intent ID or IAP transaction ID
- `coin_amount` - BIGINT (coins purchased)
- `usd_amount` - DECIMAL(10, 2) (USD paid)
- **`status`** - State machine: 'pending' → 'confirmed' → 'refunded'/'chargeback'/'failed'
- `confirmed_at`, `refunded_at` - Timestamps

**Idempotency:**
- `provider_event_id` UNIQUE constraint prevents duplicate webhook processing
- `provider_payment_id` UNIQUE constraint prevents duplicate payment processing
- Use `process_coin_purchase()` RPC function for idempotent processing

**Indexes:**
- Primary key on `id`
- Index on `profile_id` (UUID)
- Index on `status`
- **Unique index on `provider_event_id`** (idempotency)
- **Unique index on `provider_payment_id`** (idempotency)
- Index on `purchased_at` DESC (for revenue analytics)

---

### 7. `gifts`
Gift transactions with 70/30 revenue split.

**Purpose:** Tracks gifting revenue, enables leaderboards, and triggers chat messages.

**Key Fields:**
- `sender_id` - UUID references `profiles(id)`
- `recipient_id` - UUID references `profiles(id)`
- `gift_type_id` - Foreign key to gift_types
- `coin_amount` - BIGINT (coins spent)
- `platform_revenue` - BIGINT (30% of coin_amount)
- `streamer_revenue` - BIGINT (70% of coin_amount)
- `box_position` - Which video box received the gift (1-12)
- `live_stream_id` - Foreign key to live_streams

**Revenue Split:**
- `platform_revenue = coin_amount * 0.30`
- `streamer_revenue = coin_amount * 0.70`
- Streamer's earnings added to `profiles.earnings_balance` (separate from spendable)

**Processing:**
- Use `process_gift()` RPC function
- Deducts from sender's `coin_balance` via ledger
- Adds to recipient's `earnings_balance` (separate from spendable coins)

**Indexes:**
- Primary key on `id`
- Index on `sender_id` (UUID)
- Index on `recipient_id` (UUID)
- Index on `sent_at` DESC
- Index on `(recipient_id, sent_at)` (for streamer gift history)
- Index on `(sender_id, sent_at)` (for gifter history)

---

### 8. `chat_messages`
Global chat messages visible to all users.

**Purpose:** Stores chat history, gift messages, and system events.

**Key Fields:**
- `profile_id` - UUID references `profiles(id)` (NULL for system messages)
- `message_type` - 'text', 'gift', 'system', 'emoji'
- `content` - Message text/content
- `gift_id` - Foreign key to gifts (if message_type = 'gift')
- `metadata` - JSONB for emoji reactions, mentions, etc.

**Indexes:**
- Primary key on `id`
- Index on `created_at` DESC (for chat history queries)
- Index on `profile_id` (UUID)
- Index on `message_type`

---

### 9. `gift_types`
Catalog of available gifts.

**Purpose:** Defines gift inventory, prices, animations, and display properties.

**Key Fields:**
- `name` - Gift name (e.g., "Rose", "Diamond", "Super Star")
- `coin_cost` - BIGINT (coins required to send)
- `animation_url`, `icon_url` - Media URLs
- `tier` - Gift tier (1-5) for categorization
- `is_active` - Gift is available for purchase

**Indexes:**
- Primary key on `id`
- Index on `coin_cost`
- Index on `is_active` WHERE `is_active = TRUE`
- Index on `tier`

---

### 10. `user_links`
External links displayed on user profiles (/username).

**Purpose:** LinkTree-style link hub on profiles.

**Key Fields:**
- `profile_id` - UUID references `profiles(id)`
- `title` - Link title/label
- `url` - External URL
- `display_order` - Sort order on profile
- `is_active` - Link is visible

**Indexes:**
- Primary key on `id`
- Index on `profile_id` (UUID)
- Index on `(profile_id, display_order)` (for sorted display)

---

### 11. `follows`
Follower/following relationships.

**Purpose:** Enables follower counts and follow feeds.

**Key Fields:**
- `follower_id` - UUID references `profiles(id)`
- `followee_id` - UUID references `profiles(id)`
- `followed_at` - Relationship creation timestamp

**Indexes:**
- Primary key on `id`
- Unique index on `(follower_id, followee_id)` (prevent duplicate follows)
- Index on `follower_id` (UUID)
- Index on `followee_id` (UUID)
- Index on `followed_at` DESC

**Constraints:**
- `follower_id` cannot equal `followee_id` (no self-follows)

---

### 12. `leaderboard_cache`
Pre-computed leaderboard data for fast display.

**Purpose:** Stores aggregated leaderboard rankings. **Source of truth remains transaction tables** (gifts, live_streams). This is a cache.

**Key Fields:**
- `leaderboard_type` - 'top_streamers_daily', 'top_streamers_weekly', 'top_streamers_alltime', 'top_gifters_daily', 'top_gifters_weekly', 'top_gifters_alltime'
- `profile_id` - UUID references `profiles(id)`
- `rank` - Position (1, 2, 3, ...)
- `metric_value` - BIGINT (score: gifts received, gifts sent, viewer minutes, etc.)
- `period_start`, `period_end` - Ranking period
- `computed_at` - When leaderboard was last updated

**Refresh Strategy:**
- Daily leaderboards: Recompute every hour
- Weekly leaderboards: Recompute every 6 hours
- All-time leaderboards: Recompute daily
- Source of truth: Query `gifts` and `live_streams` tables directly

**Indexes:**
- Primary key on `id`
- Unique index on `(leaderboard_type, rank, period_start)`
- Index on `profile_id` (UUID)
- Index on `leaderboard_type`
- Index on `period_start` DESC

---

## Critical RPC Functions

### `update_coin_balance_via_ledger()`
**ONLY function that updates `profiles.coin_balance`**

- Locks profile row to prevent concurrent updates
- Inserts ledger entry
- Recalculates balance from ledger (source of truth)
- Updates cached balance

**Usage:** Call this for all coin movements (purchases, gifts, refunds)

---

### `process_coin_purchase()`
**Idempotent coin purchase processing**

- Checks `provider_event_id` for duplicate processing
- Inserts purchase record
- Updates ledger and balance via `update_coin_balance_via_ledger()`
- Updates `total_purchased`

**Usage:** Call from Stripe/Apple/Google webhook handlers with `provider_event_id`

---

### `process_gift()`
**Process gift transaction**

- Validates gift type and sender balance
- Calculates 70/30 revenue split
- Inserts gift record
- Deducts from sender's `coin_balance` via ledger
- Adds to recipient's `earnings_balance` (separate from spendable)

**Usage:** Call when user sends a gift

---

### `update_publish_state_from_viewers()`
**Derives `is_published` from viewer presence**

- Checks active viewer count per stream (last_active_at within 30 seconds)
- Sets `is_published = true` when viewer_count > 0
- Sets `is_published = false` when viewer_count = 0

**Usage:** Call periodically (every 10-15 seconds) or when `box_viewers` changes

---

### `cleanup_stale_viewers()`
**Removes stale viewer sessions**

- Deletes viewers with `last_active_at` > 30 seconds old

**Usage:** Call periodically (every 30 seconds) to clean up disconnected viewers

---

## Implementation Notes

### Supabase Auth Integration

1. **Do NOT create a custom `users` table** - use `auth.users` from Supabase
2. **`profiles` is the primary user table** - all foreign keys reference `profiles.id` (UUID)
3. **RLS Policies:** Set up Row Level Security on `profiles` table referencing `auth.uid()`

### Coin Balance Management

1. **Never update `profiles.coin_balance` directly** - always use `update_coin_balance_via_ledger()`
2. **Ledger is source of truth** - balance computed as `SUM(amount)` from `ledger_entries`
3. **Cached balance** - `profiles.coin_balance` is cached for performance
4. **Separate earnings** - `earnings_balance` is separate from `coin_balance` for clean accounting

### Demand-Based Publishing

1. **`is_published` is derived** - never set manually, always use `update_publish_state_from_viewers()`
2. **Viewer heartbeat** - clients must send heartbeat every 10-15 seconds to update `last_active_at`
3. **Stale cleanup** - run `cleanup_stale_viewers()` periodically
4. **Publish state update** - run `update_publish_state_from_viewers()` periodically or on viewer changes

### High-Value Purchase Idempotency

1. **Webhook handlers** - always check `provider_event_id` before processing
2. **Use RPC function** - call `process_coin_purchase()` for idempotent processing
3. **Unique constraints** - `provider_event_id` and `provider_payment_id` prevent duplicates

### BIGINT Usage

All coin-related fields use BIGINT:
- `coin_balance`, `earnings_balance`
- `total_purchased`, `total_spent`
- `total_gifts_received`, `total_gifts_sent`
- `coin_amount`, `platform_revenue`, `streamer_revenue`
- `coin_cost` in gift_types
- `amount` in ledger_entries

This supports whale-level balances (millions of coins per user).

---

## Scalability Notes

1. **Partitioning:** `chat_messages` and `gifts` tables can be partitioned by date
2. **Read Replicas:** Leaderboard queries can use read replicas
3. **Caching:** Leaderboard cache table reduces database load
4. **Archiving:** Old chat messages can be archived to cold storage after 30 days
5. **Ledger Performance:** Index `ledger_entries` by `profile_id` and `created_at` for fast balance queries

---

## Security Considerations

1. **RLS Policies:** Set up Row Level Security on all tables referencing `auth.uid()`
2. **RPC Security:** Use `SECURITY DEFINER` for RPC functions, validate inputs
3. **SQL Injection:** Use parameterized queries
4. **Rate Limiting:** Enforce rate limits on gift sending, chat messages
5. **Payment Security:** Never store raw payment card data; use Stripe tokens
6. **Idempotency:** Always check `provider_event_id` before processing purchases

---

## Migration Notes

If migrating from the previous schema:

1. **Create `profiles` table** with UUID primary key referencing `auth.users.id`
2. **Migrate user data** from old `users` table to `profiles`
3. **Update all foreign keys** to reference `profiles.id` (UUID) instead of `users.id` (BIGINT)
4. **Create `ledger_entries` table** and backfill from existing `coins` table
5. **Add idempotency fields** to `coin_purchases` (`provider_event_id`, `provider_payment_id`)
6. **Update RPC functions** to use ledger-based balance updates
7. **Add `earnings_balance`** to `profiles` table
