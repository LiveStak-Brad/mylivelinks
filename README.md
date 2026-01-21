# MyLiveLinks - Group Live Streaming Platform

**One link. Every live.**

## Overview

MyLiveLinks is a production-grade, monetized, enterprise-scale web platform for group live streaming. Inspired by classic Stickam/Userplane chatrooms, rebuilt for modern creators with shared live presence, gifting, competition, profiles, and enterprise cost efficiency.

## Core Features

### 🎥 Group Live Room
- **12 video boxes** always visible (6×2 grid)
- All users share one global room
- Heavy chat presence
- Competitive, fast-moving environment

### 📺 Demand-Based Publishing (Cost-Efficient)
- Streamers marked "live-available" when pressing "Go Live"
- Video/audio publishes **only when viewers are watching**
- When last viewer leaves → unpublish
- Streamer remains live-available
- **Eliminates wasted minutes and reduces idle costs**

### 💰 Monetization
- **Coin System**: Purchase-only coins (never earned for free)
- **Gifting**: Send gifts to any video box
- **Revenue Split**: Platform 30% / Streamer 70%
- **High-Value Packs**: Supports purchases up to $25,000+ on web
- **Ledger-Based**: Immutable transaction log for accurate balances

### 🏆 Leaderboards
- Top Streamers (daily/weekly/all-time)
- Top Gifters (daily/weekly/all-time)
- Driven from real transactional data

### 👤 Profiles
- `/username` URLs
- Avatar, bio, live status
- Follower count, gift totals, rank
- External links (LinkTree-style)

## Database Schema

The complete database schema is provided in:

- **`DATABASE_SCHEMA.md`** - Detailed explanation of all tables, relationships, and design decisions
- **`database_schema.sql`** - Complete SQL CREATE TABLE statements with indexes, constraints, triggers, and RPC functions

### Key Production Features

✅ **Supabase Auth Integration** - Uses `auth.users`, `profiles` is primary table  
✅ **Ledger-Based Coins** - Immutable `ledger_entries` table (source of truth)  
✅ **Strict Idempotency** - High-value purchase protection (`provider_event_id` UNIQUE)  
✅ **Demand-Based Publishing** - `is_published` derived from viewer presence  
✅ **BIGINT Support** - All coin fields use BIGINT (supports whale-level balances)  
✅ **Separate Earnings** - `earnings_balance` separate from `coin_balance`  

### Key Tables

1. **`profiles`** - Primary user table (UUID, references `auth.users.id`)
2. **`live_streams`** - Demand-based publishing state
3. **`video_boxes`** - 12-box grid state
4. **`box_viewers`** - Active viewers (source of truth for publishing)
5. **`ledger_entries`** - ⚠️ **Immutable transaction log (source of truth)**
6. **`coin_purchases`** - Purchase transactions (strict idempotency)
7. **`gifts`** - Gift transactions (70/30 split)
8. **`gift_types`** - Gift catalog
9. **`chat_messages`** - Global chat
10. **`user_links`** - Profile external links
11. **`follows`** - Follower relationships
12. **`leaderboard_cache`** - Pre-computed leaderboards

## Coin Packs

See **`COIN_PACKS_CONFIG.md`** for complete coin pack pricing:

- **Web**: Up to $25,000 packs (70 coins/$)
- **Mobile**: Up to $1,000 packs (50 coins/$)
- Coins spent identically across platforms

## Architecture Highlights

### Supabase Auth Integration

- **No custom `users` table** - uses Supabase `auth.users`
- **`profiles` is primary** - all foreign keys reference `profiles.id` (UUID)
- **RLS Compatible** - ready for Row Level Security policies

### Ledger-Based Coin System

**Critical:** Never update `profiles.coin_balance` directly!

1. All coin movements go through `ledger_entries` (immutable)
2. Balance computed as `SUM(amount)` from ledger
3. Cached balance updated only via `update_coin_balance_via_ledger()` RPC
4. Prevents balance drift from retries, partial failures, concurrent updates

### Demand-Based Publishing Flow

1. Streamer presses "Go Live"
   - `live_streams.live_available = true`
   - `live_streams.is_published = false`
   - Streamer appears in live-available pool

2. Viewer opens streamer's box
   - INSERT into `box_viewers`
   - Heartbeat updates `last_active_at` every 10-15 seconds
   - `update_publish_state_from_viewers()` sets `is_published = true`

3. Last viewer leaves box
   - Stale viewers cleaned up (`last_active_at` > 30 seconds)
   - `update_publish_state_from_viewers()` sets `is_published = false`
   - Video/audio stops publishing
   - Streamer remains `live_available = true`

**Critical:** `is_published` is **derived** from viewer presence, never set manually!

### Purchase Idempotency

For high-value purchases ($25,000+), strict idempotency is required:

1. **Webhook handlers** check `provider_event_id` before processing
2. **Unique constraints** prevent duplicate processing
3. **RPC function** `process_coin_purchase()` handles idempotency

### Revenue Split

When a gift is sent:
- `gifts.platform_revenue = coin_amount * 0.30`
- `gifts.streamer_revenue = coin_amount * 0.70`
- Streamer's earnings added to `earnings_balance` (separate from spendable)

## Tech Stack Requirements

### Frontend
- Web-first, desktop-optimized
- Real-time updates (WebSocket/SSE)
- WebRTC for video/audio

### Backend
- **Supabase** - Auth, Database, Realtime
- REST/GraphQL API
- Real-time WebSocket server
- Payment processing (Stripe, Apple IAP, Google Play)

### Live Video
- WebRTC SFU (Agora, Twilio, or similar)
- Demand-based publishing
- Group live optimized

## Database Setup

### Prerequisites
- Supabase project (or PostgreSQL 14+)
- Database user with CREATE privileges

### Installation

```bash
# Connect to Supabase PostgreSQL
psql -h [your-supabase-host] -U postgres -d postgres

# Run schema
\i database_schema.sql
```

### Verification

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RPC functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';

-- Check indexes
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

## Critical RPC Functions

### `update_coin_balance_via_ledger()`
**ONLY function that updates `profiles.coin_balance`**
- Locks profile row
- Inserts ledger entry
- Recalculates balance from ledger
- Updates cached balance

### `process_coin_purchase()`
**Idempotent purchase processing**
- Checks `provider_event_id` for duplicates
- Updates ledger and balance
- Call from webhook handlers

### `process_gift()`
**Process gift transaction**
- Validates balance and gift type
- Deducts from sender via ledger
- Adds to recipient's earnings

### `update_publish_state_from_viewers()`
**Derives `is_published` from viewer presence**
- Checks active viewer count
- Sets publish state automatically
- Call periodically (every 10-15 seconds)

### `cleanup_stale_viewers()`
**Removes stale viewer sessions**
- Deletes viewers with `last_active_at` > 30 seconds
- Call periodically (every 30 seconds)

## Version 1 Requirements

✅ Main group live room (12 boxes)  
✅ Go Live / Watch / Chat  
✅ Demand-based live publishing  
✅ Coin purchases (web)  
✅ Gifting  
✅ Profiles  
✅ Leaderboards  

## Production Checklist

Before going live:

- [ ] Set up Supabase RLS policies on all tables
- [ ] Configure webhook handlers with idempotency checks
- [ ] Set up cron jobs for:
  - `update_publish_state_from_viewers()` (every 10-15 seconds)
  - `cleanup_stale_viewers()` (every 30 seconds)
  - Leaderboard cache refresh (hourly/daily)
- [ ] Test high-value purchases ($25,000+) with idempotency
- [ ] Test concurrent coin transactions
- [ ] Test demand-based publishing with multiple viewers
- [ ] Set up monitoring for ledger balance reconciliation

## Important Notes

- **Monetization is not optional** - Core to platform design
- **No artificial spending caps** - Supports high-value purchases
- **Cost efficiency** - Demand-based publishing reduces infrastructure waste
- **Scalability** - Schema designed for enterprise-scale growth
- **Ledger is source of truth** - Never update balances directly
- **Publish state is derived** - Never set `is_published` manually

## Developer Tooling

### LiveKit MCP Integration

For AI-assisted LiveKit development in Cursor, we provide an MCP server integration that gives direct access to LiveKit documentation:

- **Setup Guide**: [`docs/livekit/LiveKit_MCP.md`](docs/livekit/LiveKit_MCP.md)
- **Quick Add**: In Cursor Settings → MCP, add `https://docs.livekit.io/mcp`
- **No runtime changes** - tooling only

## Support

For questions about the schema design or implementation, refer to:
- `DATABASE_SCHEMA.md` - Table explanations and relationships
- `database_schema.sql` - Complete SQL implementation
- `COIN_PACKS_CONFIG.md` - Coin pack pricing and strategy

---

**Built for high-traffic streamers, whales, and enterprise-scale usage.**
