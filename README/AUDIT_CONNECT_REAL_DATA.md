# MyLiveLinks - Audit: Connect Real Data

## Overview

This document provides a comprehensive audit of the current UI implementation, identifying what data each component needs, where it currently comes from (mocked vs real), and what gaps exist for connecting to real Supabase + LiveKit infrastructure.

---

## A) Current UI Inventory

### 1. `/live` - Main Live Room Page

**Component:** `components/LiveRoom.tsx`

**Current Features:**
- 12 camera tiles in a grid (6×2 on desktop, responsive on mobile)
- Focus Mode toggle (hides all UI panels, expands grid)
- Fullscreen tile mode (auto-mutes others)
- Tile controls: close, mute/unmute, volume slider, expand
- Drag-and-drop tile swapping
- Randomize button (repopulates grid)
- Filter buttons: Randomize, Most Gifted, Most Viewed, Newest (planned)
- Global chat panel (right side)
- Leaderboard panel (left side)
- Viewer list panel (right side)
- Top Supporters panel (right side)
- User Stats panel (right side)
- Coin Purchase section (right side)
- Diamond Conversion section (right side)
- Options menu (header)
- User menu (header)

**Data Needs:**

| Data | Current Source | Real Source | Status |
|------|---------------|-------------|--------|
| Live streamers list | `generateSeedStreamers()` (mock) | `live_streams` table via `get_available_streamers_filtered` RPC | ✅ RPC exists, needs wiring |
| Grid slots (12 per user) | Local state only | `user_grid_slots` table (per-user layout) | ⚠️ Table exists, needs load/save |
| Viewer counts | Mock random numbers | `active_viewers` table (heartbeat) | ⚠️ Table exists, needs realtime |
| Chat messages | `generateSeedChatMessages()` (mock) | `chat_messages` table + Supabase Realtime | ⚠️ Table exists, needs realtime |
| Leaderboard data | Mock data | `profiles` + `gifts` aggregated | ⚠️ Needs aggregation query |
| Top supporters | Mock data | `gifts` table aggregated by recipient | ⚠️ Needs aggregation query |
| User stats (coins/diamonds) | Mock data | `profiles.coin_balance` + `profiles.earnings_balance` | ⚠️ Needs auth + query |
| Gifter badges | Mock data | `gifter_levels` table | ✅ Table exists |
| Blocked users | Mock (none) | `blocks` table via `get_available_streamers_filtered` | ✅ RPC exists |

**What's Mocked:**
- All streamer data (avatars, usernames, viewer counts)
- Chat messages
- Leaderboards
- User wallet balances
- Grid layout persistence (local state only)

**What's Real (when Supabase configured):**
- User authentication (Supabase Auth)
- Blocked users filtering (via RPC)
- Profile data (when logged in)

---

### 2. `/login` - Authentication Page

**Component:** `app/login/page.tsx`

**Current Features:**
- Email + password input
- Sign in / Sign up toggle
- Redirects to `/settings/profile` after login
- Redirects to `/login` if not authenticated

**Data Needs:**

| Data | Current Source | Real Source | Status |
|------|---------------|-------------|--------|
| User authentication | Supabase Auth (real) | `auth.users` table | ✅ Fully wired |
| User session | Supabase Auth (real) | `auth.users` + `profiles` | ✅ Fully wired |
| Mock mode fallback | `localStorage` mock user | N/A (seed mode only) | ✅ Works |

**What's Mocked:**
- Seed mode: localStorage-based mock user

**What's Real:**
- Supabase Auth integration (email/password)
- Session management
- Profile creation on signup

---

### 3. `/[username]` - Public Profile Page

**Component:** `app/[username]/page.tsx`

**Current Features:**
- Linktree-style layout
- Avatar, display name, @username, bio
- "Watch Live" button (links to `/live`)
- "Go Live" button (links to `/live?goLive=1`)
- Pinned post card (image or video)
- Links list (Linktree-style buttons)
- "Edit Profile" link (owner only)

**Data Needs:**

| Data | Current Source | Real Source | Status |
|------|---------------|-------------|--------|
| Profile data | `profiles` table (real) or seed mock | `profiles` table | ✅ Fully wired |
| User links | `user_links` table (real) or mock | `user_links` table | ✅ Fully wired |
| Pinned post | `pinned_posts` table (real) or mock | `pinned_posts` table | ✅ Fully wired |
| Live status | `live_streams.live_available` (real) or mock | `live_streams` table (source of truth) | ⚠️ Must query `live_streams`, not `profiles.is_live` |
| Avatar media | Supabase Storage (planned) or mock | Supabase Storage bucket | ⚠️ Storage not connected |
| Pinned post media | Local object URL (mock) | Supabase Storage bucket | ⚠️ Storage not connected |

**What's Mocked:**
- Seed mode: `getSeedProfileByUsername()` fallback
- Media uploads: local object URLs (not persisted)

**What's Real:**
- Profile queries (Supabase)
- User links queries (Supabase)
- Pinned post queries (Supabase)
- Live status (from `live_streams.live_available` - source of truth)

---

### 4. `/settings/profile` - Profile Edit Page

**Component:** `app/settings/profile/page.tsx`

**Current Features:**
- Upload avatar (image)
- Edit display name & bio
- Manage links (add/edit/remove/reorder)
- Pinned post editor:
  - Upload media (image or video)
  - Edit caption
  - Replace media
  - Delete pinned post

**Data Needs:**

| Data | Current Source | Real Source | Status |
|------|---------------|-------------|--------|
| Profile updates | `profiles` table UPDATE | `profiles` table | ✅ Fully wired |
| Links CRUD | `user_links` table | `user_links` table | ✅ Fully wired |
| Pinned post CRUD | `pinned_posts` table | `pinned_posts` table | ✅ Fully wired |
| Avatar upload | Local object URL (mock) | Supabase Storage bucket | ⚠️ Storage not connected |
| Media upload | Local object URL (mock) | Supabase Storage bucket | ⚠️ Storage not connected |
| Auth check | Supabase Auth | `auth.users` | ✅ Fully wired |

**What's Mocked:**
- Media file uploads (local object URLs, not persisted)
- Seed mode: localStorage-based profile

**What's Real:**
- Profile updates (Supabase)
- Links CRUD (Supabase)
- Pinned post CRUD (Supabase)
- Authentication checks

---

### 5. `/apply` - Room Application Page

**Component:** `app/apply/page.tsx`

**Current Features:**
- Simple form with fields:
  - Room name idea
  - Why they want a room
  - How they will promote it
  - Social links
- Mock submit button

**Data Needs:**

| Data | Current Source | Real Source | Status |
|------|---------------|-------------|--------|
| Application submission | Mock (alert only) | `room_applications` table (planned) | ❌ Table doesn't exist |

**What's Mocked:**
- Form submission (alert only)

**What's Real:**
- Nothing (needs table + RPC)

---

### 6. Gifting/Convert UI Components

**Components:** `components/GiftModal.tsx`, `components/DiamondConversion.tsx`, `components/CoinPurchaseSection.tsx`

**Current Features:**
- Gift modal (select gift type, send to streamer)
- Diamond to coin conversion (30% platform fee)
- Coin purchase section (mock Stripe integration)

**Data Needs:**

| Data | Current Source | Real Source | Status |
|------|---------------|-------------|--------|
| Gift types | Mock data | `gift_types` table | ⚠️ Table exists, needs query |
| Gift sending | Mock (alert only) | `process_gift()` RPC | ✅ RPC exists, needs wiring |
| Coin purchases | Mock (alert only) | `process_coin_purchase()` RPC | ✅ RPC exists, needs wiring |
| Diamond conversion | Mock (alert only) | `convert_diamonds_to_coins()` RPC | ✅ RPC exists, needs wiring |
| Wallet balances | Mock data | `profiles.coin_balance` + `profiles.earnings_balance` | ⚠️ Needs auth + query |
| Stripe integration | Not implemented | Stripe API (future) | ❌ Not implemented |

**What's Mocked:**
- All gift operations (alerts only)
- Coin purchases (alerts only)
- Diamond conversion (alerts only)
- Wallet balances

**What's Real:**
- RPC functions exist in database
- Tables exist (`gift_types`, `gifts`, `coin_purchases`, `ledger_entries`)

---

## B) Source of Truth Map

### Supabase Tables (Primary Data Store)

| Table | Purpose | Current Status |
|------|---------|----------------|
| `profiles` | Primary user table | ✅ Fully implemented |
| `user_links` | Profile external links | ✅ Fully implemented |
| `pinned_posts` | Single pinned post per profile | ✅ Fully implemented |
| `live_streams` | Streamer live availability | ✅ Table exists, needs realtime |
| `user_grid_slots` | Per-user 12-slot grid layout | ✅ Table exists, needs load/save |
| `active_viewers` | Viewer presence/heartbeat | ✅ Table exists, needs heartbeat |
| `chat_messages` | Global chat messages | ✅ Table exists, needs realtime |
| `gift_types` | Gift catalog | ✅ Table exists, needs query |
| `gifts` | Gift transactions | ✅ Table exists, RPC ready |
| `ledger_entries` | Immutable coin transaction log | ✅ Table exists, RPC ready |
| `coin_purchases` | Coin purchase records | ✅ Table exists, RPC ready |
| `diamond_conversions` | Diamond→coin conversions | ✅ Table exists, RPC ready |
| `gifter_levels` | Gifter badge definitions | ✅ Table exists |
| `blocks` | User blocking | ✅ Table exists, RPC ready |
| `follows` | User follows | ✅ Table exists |
| `room_applications` | Room application submissions | ❌ Table doesn't exist |

### LiveKit (Video Streaming)

| Component | Purpose | Current Status |
|-----------|---------|---------------|
| LiveKit Server | Video streaming infrastructure | ❌ Not integrated |
| Token minting endpoint | `/api/livekit/token` | ❌ Doesn't exist |
| Room naming | `live_central` (single room) | ❌ Not implemented |
| Identity mapping | `profiles.id` → LiveKit identity | ❌ Not implemented |
| Demand-based publishing | Publish only when watched | ❌ Not implemented |

### Supabase Realtime

| Channel | Purpose | Current Status |
|---------|---------|---------------|
| `chat-messages` | Global chat updates | ⚠️ Subscribed but not tested |
| `live-streamers` | Streamer availability changes | ⚠️ Subscribed but not tested |
| `active-viewers` | Viewer presence updates | ❌ Not subscribed |
| `user-grid-slots` | Grid layout changes | ❌ Not subscribed |

### Ranking/Filters

| Filter | Source | Current Status |
|--------|--------|---------------|
| **Most Gifted** | Time-windowed `gifts` aggregation (5-15 min rolling window) | ❌ Query doesn't exist |
| **Most Viewed** | `active_viewers` count per `live_stream_id` | ⚠️ Query exists but not optimized |
| **Newest** | `live_streams.went_live_at` DESC | ⚠️ Field exists, set server-side only via trigger/RPC |

**Demand-Based Publishing Rules:**
- A viewer is "watching" ONLY if:
  - The streamer's tile is visible in the viewer's grid (`user_grid_slots` entry exists)
  - The tile is active (not closed)
  - Heartbeat is current (`active_viewers.last_active_at` within threshold)
- `active_viewers` table is the ONLY driver of `is_published`:
  - `is_published = true` when `active_viewers` count > 0 for that `live_stream_id`
  - `is_published = false` when `active_viewers` count = 0
- `live_streams` table is source of truth for live status:
  - `live_available` = streamer pressed "Go Live"
  - `is_published` = derived from `active_viewers` (demand-based)
  - `profiles.is_live` = cached denormalization (updated via RPC only)

---

## C) Dependencies Checklist

### Required Environment Variables

#### Supabase (Required for real data)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Supabase Service Role (Server-only, for admin operations)
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
**Note:** This should NEVER be exposed to client. Use only in API routes or server-side code.

#### LiveKit (Required for video streaming)
```env
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```
**Note:** These are server-only secrets. Never expose to client.

#### Stripe (Future - for coin purchases)
```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
**Note:** Not implemented yet. Do not add until Phase 5.

#### Optional: TURN/STUN (Only if LiveKit requires custom TURN)
```env
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-credential
```
**Note:** LiveKit usually handles this. Only add if needed.

---

## D) Gap List

### Missing Tables

1. **`room_applications`** (for `/apply` page)
   - Fields: `id`, `profile_id`, `room_name_idea`, `why_want_room`, `promotion_plan`, `social_links`, `status`, `created_at`, `reviewed_at`, `reviewed_by`
   - RLS: Users can INSERT their own, admins can SELECT/UPDATE

### Missing Columns

1. **`live_streams.went_live_at`** (for "Newest" filter)
   - Type: `TIMESTAMP WITH TIME ZONE`
   - **CRITICAL:** Set server-side ONLY when `live_available` changes from `false` → `true`
   - Must be set via database trigger or SECURITY DEFINER RPC
   - Clients MUST NEVER be able to set or spoof this value

2. **`profiles.is_admin`** (for admin features)
   - Type: `BOOLEAN DEFAULT FALSE`
   - For admin-only UI features

### Missing RPC Functions

1. **`get_most_gifted_streamers(p_window_minutes INTEGER)`**
   - Purpose: Returns streamers sorted by gifts received in rolling window
   - Input: `p_window_minutes` (default 10)
   - Output: Streamers with `diamonds_received_in_window` field
   - Uses: `gifts.sent_at` + `gifts.streamer_revenue` aggregated

2. **`get_newest_streamers(limit INTEGER)`**
   - Purpose: Returns streamers sorted by `went_live_at` DESC
   - Input: `limit` (default 12)
   - Output: Streamers with `went_live_at` field

3. **`save_user_grid_layout(p_profile_id UUID, p_slots JSONB)`**
   - Purpose: Saves 12-slot grid layout to `user_grid_slots` table
   - Input: `p_profile_id`, `p_slots` (array of slot configs)
   - Output: Success/error

4. **`load_user_grid_layout(p_profile_id UUID)`**
   - Purpose: Loads 12-slot grid layout from `user_grid_slots` table
   - Input: `p_profile_id`
   - Output: Array of slot configs

### Missing Realtime Subscriptions

1. **`active-viewers` channel**
   - Event: `postgres_changes` on `active_viewers` table
   - Purpose: Update viewer counts in real-time
   - Filter: `live_stream_id` matches visible tiles

2. **`user-grid-slots` channel** (optional, for multi-device sync)
   - Event: `postgres_changes` on `user_grid_slots` table
   - Purpose: Sync grid layout across devices
   - Filter: `profile_id` matches current user

### Missing Server Endpoints

1. **`/api/livekit/token`** (POST)
   - Purpose: Mint LiveKit access token for viewer/streamer
   - Input: `room`, `identity`, `name`, `kind` (publisher/subscriber)
   - Output: JWT token
   - Auth: Requires authenticated user
   - Security: Validate user has access to requested room

2. **`/api/livekit/webhook`** (POST)
   - Purpose: Receive LiveKit webhook events (participant joined/left)
   - Input: LiveKit webhook payload
   - Output: 200 OK
   - Security: Validate webhook signature

### Missing Storage Buckets

1. **`avatars` bucket**
   - Purpose: Store user profile avatars
   - Path structure: `avatars/{profile_id}/avatar.{ext}`
   - Public: Yes (read-only)
   - RLS Policy: Write allowed ONLY if `auth.uid() = profile_id`
   - RLS Policy: Read allowed for all (public)

2. **`pinned-posts` bucket**
   - Purpose: Store pinned post media (images/videos)
   - Path structure: `pinned-posts/{profile_id}/pinned.{ext}`
   - Public: Yes (read-only)
   - RLS Policy: Write allowed ONLY if `auth.uid() = profile_id`
   - RLS Policy: Read allowed for all (public)

### Missing Aggregation Queries

1. **Leaderboard query** (Most Gifted - All Time)
   - Source: `profiles.total_gifts_received` DESC
   - Status: Field exists, needs query

2. **Leaderboard query** (Most Gifted - Rolling Window)
   - Source: `gifts` aggregated by `recipient_id` in window
   - Status: Needs RPC function

3. **Top Supporters query** (per streamer)
   - Source: `gifts` aggregated by `sender_id` for specific `recipient_id`
   - Status: Needs query or RPC

---

## Summary

### Fully Wired ✅
- Authentication (Supabase Auth)
- Profile CRUD (profiles, user_links, pinned_posts)
- Blocking system (RPC functions exist)

### Partially Wired ⚠️
- Live streamers discovery (RPC exists, needs UI wiring)
- Chat (table exists, needs realtime testing)
- Viewer counts (table exists, needs heartbeat)
- Grid layout (`user_grid_slots` table exists, needs load/save)
- Active viewers drive demand-based publishing (ONLY source of truth for `is_published`)
- Gifting (RPC exists, needs UI wiring)
- Coin/diamond operations (RPC exists, needs UI wiring)

### Not Wired ❌
- LiveKit video streaming (no integration)
- Token minting endpoint (doesn't exist)
- Demand-based publishing (not implemented)
- Filter queries (Most Gifted, Newest)
- Room applications (table doesn't exist)
- Storage buckets (not configured)
- Realtime subscriptions (not fully tested)

---

**Next Steps:** See `IMPLEMENT_CONNECT_PLAN.md` for phased implementation plan.

