# MyLiveLinks - Implementation Plan: Connect Real Data

## Overview

This document outlines a phased approach to connect the MyLiveLinks UI to real Supabase + LiveKit infrastructure, moving from mock/seed data to production-ready data flows.

**Principle:** Build incrementally, test each phase, maintain seed mode compatibility.

---

## Phase 0: Keep Seed Mode (Current State)

**Status:** ✅ Complete

**Outcome:**
- Seed mode remains functional for UI development
- Mock data generators continue to work
- No breaking changes to existing UI

**Acceptance Tests:**
- ✅ `/live` page shows 12 mock streamers
- ✅ Chat shows 20 mock messages
- ✅ Profile pages work with seed data
- ✅ All UI components render without errors

**Files:** No changes needed

---

## Phase 1: Supabase Auth + Profiles + Linktree Pages

**Status:** ⚠️ Partially Complete (needs storage wiring)

**Goal:** Complete the profile system with real Supabase data, including media storage.

### 1.1 Authentication (Already Complete ✅)

**Files:**
- `app/login/page.tsx` - Already uses Supabase Auth
- `lib/supabase.ts` - Already configured

**Acceptance Tests:**
- ✅ User can sign up with email/password
- ✅ User can sign in
- ✅ Session persists across page refreshes
- ✅ Protected routes redirect to `/login` if not authenticated

### 1.2 Profile CRUD (Already Complete ✅)

**Files:**
- `app/[username]/page.tsx` - Already queries `profiles`, `user_links`, `pinned_posts`
- `app/settings/profile/page.tsx` - Already updates `profiles`, `user_links`, `pinned_posts`

**Acceptance Tests:**
- ✅ Public profile page loads real data from Supabase
- ✅ Profile edit page loads current user's data
- ✅ Updates save to Supabase
- ✅ Links CRUD works
- ✅ Pinned post CRUD works

### 1.3 Storage Buckets (Needs Implementation ⚠️)

**Tasks:**
1. Create Supabase Storage buckets:
   - `avatars` (public read, authenticated write)
   - `pinned-posts` (public read, authenticated write)

2. Update `app/settings/profile/page.tsx`:
   - Replace `URL.createObjectURL()` with Supabase Storage upload
   - Upload avatar to `avatars/{profile_id}/avatar.{ext}`
   - Upload pinned post media to `pinned-posts/{profile_id}/pinned.{ext}`
   - Store URLs in database

3. Update `app/[username]/page.tsx`:
   - Use Supabase Storage URLs for avatars and pinned post media

**Files to Modify:**
- `app/settings/profile/page.tsx` - Add storage upload logic
- `app/[username]/page.tsx` - Use storage URLs
- `lib/supabase.ts` - Add storage client helper (optional)

**SQL Required:**
```sql
-- Storage bucket policies (run in Supabase Dashboard > Storage)
-- Bucket: avatars
-- Path structure: avatars/{profile_id}/avatar.{ext}
-- Policy: Public read (anyone can read)
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Policy: Authenticated users can upload their own avatar only
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own avatar only
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Bucket: pinned-posts
-- Path structure: pinned-posts/{profile_id}/pinned.{ext}
-- Policy: Public read (anyone can read)
CREATE POLICY "Public read pinned posts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pinned-posts');

-- Policy: Authenticated users can upload their own media only
CREATE POLICY "Users can upload own pinned post"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pinned-posts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own pinned post only
CREATE POLICY "Users can update own pinned post"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pinned-posts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Acceptance Tests:**
- ✅ Avatar upload saves to Supabase Storage
- ✅ Avatar displays on profile page
- ✅ Pinned post media upload saves to Supabase Storage
- ✅ Pinned post media displays on profile page
- ✅ Media persists across page refreshes
- ✅ Seed mode still works (fallback to mock)

**Deliverables:**
- Storage buckets created
- Upload functions implemented
- URLs stored in database
- Clear README notes for storage setup

---

## Phase 2: Global Chat Realtime

**Status:** ⚠️ Partially Complete (needs testing)

**Goal:** Connect chat to Supabase Realtime for live message updates.

### 2.1 Chat Message Loading (Already Complete ✅)

**Files:**
- `components/Chat.tsx` - Already queries `chat_messages` table

**Current State:**
- Loads messages on mount
- Subscribes to `chat-messages` channel
- Filters blocked users via RPC

**Acceptance Tests:**
- ✅ Chat loads messages from database
- ✅ New messages appear in real-time
- ✅ Blocked users' messages are hidden
- ✅ Message sending works (if implemented)

### 2.2 Message Sending (Needs Implementation ⚠️)

**Tasks:**
1. Update `components/Chat.tsx`:
   - Implement `handleSendMessage()` to INSERT into `chat_messages`
   - Add error handling
   - Optimistic UI update (show message immediately, rollback on error)

**Files to Modify:**
- `components/Chat.tsx` - Implement `handleSendMessage()`

**SQL Required:** None (table and RLS already exist)

**Acceptance Tests:**
- ✅ User can send messages
- ✅ Messages appear immediately (optimistic)
- ✅ Messages persist to database
- ✅ Other users see messages in real-time
- ✅ Blocked users don't see sender's messages

**Deliverables:**
- Working chat send functionality
- Real-time message updates
- Blocking integration verified

---

## Phase 3: Discovery + Per-User Grid Slots Wiring

**Status:** ⚠️ Partially Complete (needs grid layout persistence)

**Goal:** Connect the 12-slot grid to real data, including discovery filters and per-user layout persistence.

### 3.1 Streamer Discovery (Already Complete ✅)

**Files:**
- `components/LiveRoom.tsx` - Already uses `get_available_streamers_filtered` RPC

**Current State:**
- Loads available streamers from database
- Filters blocked users
- Falls back to seed mode if no Supabase config

**Acceptance Tests:**
- ✅ Streamers load from database
- ✅ Blocked users are excluded
- ✅ Viewer counts are accurate (if heartbeat is running)

### 3.2 Grid Layout Persistence (Needs Implementation ⚠️)

**Tasks:**
1. Create RPC functions:
   - `save_user_grid_layout(p_profile_id UUID, p_slots JSONB)`
   - `load_user_grid_layout(p_profile_id UUID)`

2. Update `components/LiveRoom.tsx`:
   - Load grid layout on mount (after auth check)
   - Save grid layout on changes (debounced)
   - Handle empty layout (first-time user)

**Files to Modify:**
- `components/LiveRoom.tsx` - Add `loadGridLayout()` and `saveGridLayout()` functions
- `database_schema.sql` - Add RPC functions (or separate SQL file)

**SQL Required:**
```sql
-- RPC: save_user_grid_layout
CREATE OR REPLACE FUNCTION save_user_grid_layout(
  p_profile_id UUID,
  p_slots JSONB
) RETURNS VOID AS $$
BEGIN
  -- Delete existing slots for this user
  DELETE FROM user_grid_slots WHERE profile_id = p_profile_id;
  
  -- Insert new slots
  INSERT INTO user_grid_slots (profile_id, slot_index, live_stream_id, is_pinned, display_order)
  SELECT
    p_profile_id,
    (slot->>'slotIndex')::INTEGER,
    (slot->>'live_stream_id')::UUID,
    COALESCE((slot->>'isPinned')::BOOLEAN, false),
    (slot->>'slotIndex')::INTEGER
  FROM jsonb_array_elements(p_slots) AS slot
  WHERE slot->>'live_stream_id' IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: load_user_grid_layout
CREATE OR REPLACE FUNCTION load_user_grid_layout(
  p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_slots JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'slotIndex', slot_index,
      'live_stream_id', live_stream_id,
      'isPinned', is_pinned,
      'displayOrder', display_order
    )
    ORDER BY display_order
  )
  INTO v_slots
  FROM user_grid_slots
  WHERE profile_id = p_profile_id;
  
  RETURN COALESCE(v_slots, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Acceptance Tests:**
- ✅ Grid layout loads on page load (if user has saved layout)
- ✅ Grid layout saves when user changes tiles
- ✅ Grid layout persists across page refreshes
- ✅ First-time users get empty grid (can populate via filters)
- ✅ Pinned tiles persist across randomize/filter actions

### 3.3 Filter Buttons (✅ Complete)

**Status:** ✅ Implemented

**Implementation:**
1. Created unified RPC function: `get_live_grid(p_viewer_id UUID, p_sort_mode TEXT)`
   - Handles all sort modes: `random`, `most_viewed`, `most_gifted`, `newest`
   - Separate function: `get_live_grid_random(p_viewer_id UUID, p_seed INTEGER)` for stable random shuffle
   - Server-side sorting only (no client-side sorting)

2. Updated `components/LiveRoom.tsx`:
   - Added `sortMode` state: `'random' | 'most_viewed' | 'most_gifted' | 'newest'`
   - Added filter buttons UI next to Randomize button
   - Implemented `handleSortModeChange()` to reload streamers with new sort mode
   - Randomize button clears active filter and sets mode to 'random'
   - Seed mode supports deterministic sorting

3. Updated `lib/seedData.ts`:
   - `generateSeedStreamers()` now accepts `sortMode` parameter
   - Deterministic values for viewer counts, gift totals, and `went_live_at` timestamps
   - Filters work visibly in seed mode

**Files Modified:**
- `components/LiveRoom.tsx` - Added filter buttons and sort mode state
- `lib/seedData.ts` - Added sort mode support to seed data generation
- `live_grid_filters.sql` - New SQL file with RPC functions and trigger

**SQL Required:**
See `live_grid_filters.sql` for complete implementation:
- Added `went_live_at` column to `live_streams` table
- Created trigger `trigger_set_went_live_at` to set timestamp server-side
- Created `get_live_grid()` RPC function with sort_mode parameter
- Created `get_live_grid_random()` RPC function for stable random shuffle
- Added indexes for performance

**Acceptance Tests:**
- ✅ Filter buttons appear next to Randomize button
- ✅ Only one filter active at a time
- ✅ "Most Viewed" sorts by active viewer count (server-side)
- ✅ "Most Gifted" sorts by session gifts total (current live session only)
- ✅ "Newest" sorts by `went_live_at` DESC (server-set timestamp)
- ✅ Randomize clears active filter and uses stable shuffle
- ✅ Pinned tiles are preserved when filtering
- ✅ Seed mode works with deterministic sorting
- ✅ `went_live_at` is set server-side only (cannot be spoofed by clients)
- ✅ No client-side sorting logic

**Deliverables:**
- Grid layout persistence (load/save)
- Filter buttons UI
- Filter RPC functions
- Filter handlers wired

---

## Phase 4: LiveKit Token Minting + Demand-Based Streaming

**Status:** ❌ Not Started

**Goal:** Integrate LiveKit for video streaming with demand-based publishing (only publish when tile is actively watched).

### 4.1 LiveKit Setup

**Tasks:**
1. Install LiveKit SDK:
   ```bash
   npm install livekit-client livekit-server-sdk
   ```

2. Create API route: `app/api/livekit/token/route.ts`
   - Mint LiveKit access token
   - Validate user authentication
   - Set room permissions (publisher/subscriber)

3. Create API route: `app/api/livekit/webhook/route.ts`
   - Handle LiveKit webhook events
   - Update `active_viewers` table on participant join/leave
   - Trigger `update_publish_state_from_viewers()` RPC

**Files to Create:**
- `app/api/livekit/token/route.ts`
- `app/api/livekit/webhook/route.ts`
- `lib/livekit.ts` (helper functions)

**SQL Required:**
- Add `went_live_at` column to `live_streams` table (if not exists)
- Create trigger to set `went_live_at` server-side when `live_available` changes from `false` → `true`
- Ensure `update_publish_state_from_viewers()` RPC exists (should already exist)

```sql
-- Add column if not exists
ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS went_live_at TIMESTAMP WITH TIME ZONE;

-- Trigger to set went_live_at server-side ONLY
CREATE OR REPLACE FUNCTION set_went_live_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set when transitioning from false to true
  IF OLD.live_available = false AND NEW.live_available = true THEN
    NEW.went_live_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_went_live_at ON live_streams;
CREATE TRIGGER trigger_set_went_live_at
  BEFORE UPDATE ON live_streams
  FOR EACH ROW
  EXECUTE FUNCTION set_went_live_at();
```

**Acceptance Tests:**
- ✅ Token endpoint returns valid JWT
- ✅ Token includes correct room/identity/permissions
- ✅ Webhook receives participant events
- ✅ `active_viewers` table updates on join/leave

### 4.2 Video Component Integration

**Tasks:**
1. Create hook: `hooks/useLiveKit.ts`
   - Connect to LiveKit room
   - Subscribe to video tracks
   - Handle participant events

2. Update `components/Tile.tsx`:
   - Replace mock video with LiveKit video element
   - Subscribe to streamer's track when tile is visible
   - Unsubscribe when tile is closed/hidden

3. Update `components/LiveRoom.tsx`:
   - Request token when tile is added to grid
   - Connect to LiveKit room
   - Handle demand-based publishing (only subscribe to visible tiles)

**Files to Modify:**
- `components/Tile.tsx` - Add LiveKit video element
- `components/LiveRoom.tsx` - Add LiveKit connection logic
- `hooks/useLiveKit.ts` - Create hook (new file)

**Acceptance Tests:**
- ✅ Video appears in tile when streamer is published
- ✅ Video disappears when tile is closed
- ✅ Multiple tiles can show different streams simultaneously
- ✅ Fullscreen tile shows video correctly
- ✅ Mute/unmute controls work
- ✅ Volume slider works

### 4.3 Demand-Based Publishing

**Critical Rules:**
- `active_viewers` table is the ONLY driver of `is_published`
- A viewer is "watching" ONLY if:
  - The streamer's tile is visible in the viewer's grid (`user_grid_slots` entry exists)
  - The tile is active (not closed)
  - Heartbeat is current (`active_viewers.last_active_at` within threshold)
- `live_streams` table is source of truth for live status:
  - `live_available` = streamer pressed "Go Live"
  - `is_published` = derived from `active_viewers` count (demand-based)
  - `profiles.is_live` = cached denormalization (updated via RPC only)

**Tasks:**
1. Update `update_publish_state_from_viewers()` RPC (if needed):
   - Check `active_viewers` count per `live_stream_id`
   - Set `is_published = true` if count > 0
   - Set `is_published = false` if count = 0
   - Ensure `active_viewers` rows include: `viewer_id`, `live_stream_id`, `is_active`, `last_active_at`

2. Update webhook handler:
   - Call `update_publish_state_from_viewers()` on participant join/leave
   - Update `active_viewers` table on join/leave events

**Files to Modify:**
- `app/api/livekit/webhook/route.ts` - Call RPC on events, update `active_viewers`

**Acceptance Tests:**
- ✅ Streamer's `is_published` becomes `true` when someone watches (tile visible + active + heartbeat current)
- ✅ Streamer's `is_published` becomes `false` when no one watches
- ✅ Streamer remains `live_available = true` until they stop manually
- ✅ `active_viewers` table accurately reflects who is watching

**Deliverables:**
- LiveKit token endpoint
- LiveKit webhook handler
- Video component integration
- Demand-based publishing working

---

## Phase 5: Monetization Wiring (Coins/Diamonds/Gifts + Leaderboards)

**Status:** ⚠️ Partially Complete (RPCs exist, UI needs wiring)

**Goal:** Connect gifting, coin purchases, diamond conversion, and leaderboards to real data.

### 5.1 Wallet Balances (Needs Implementation ⚠️)

**Tasks:**
1. Update `components/UserStatsSection.tsx`:
   - Query `profiles.coin_balance` and `profiles.earnings_balance`
   - Display real balances (not mock)

2. Update `components/CoinPurchaseSection.tsx`:
   - Wire to `process_coin_purchase()` RPC (when Stripe is ready)
   - For now: show mock purchase flow

**Files to Modify:**
- `components/UserStatsSection.tsx` - Query real balances
- `components/CoinPurchaseSection.tsx` - Prepare for RPC (keep mock for now)

**Acceptance Tests:**
- ✅ Wallet balances display real data
- ✅ Balances update after gift/conversion
- ✅ Seed mode shows mock balances

### 5.2 Gifting (Needs Implementation ⚠️)

**Tasks:**
1. Update `components/GiftModal.tsx`:
   - Query `gift_types` table for available gifts
   - Implement `handleSendGift()` to call `process_gift()` RPC
   - Add error handling (insufficient balance, etc.)
   - Show success/error feedback

**Files to Modify:**
- `components/GiftModal.tsx` - Wire to RPC
- `components/LiveRoom.tsx` - Pass real streamer data to GiftModal

**SQL Required:** None (RPC already exists)

**Acceptance Tests:**
- ✅ Gift types load from database
- ✅ User can send gifts
- ✅ Coins are deducted from sender
- ✅ Diamonds are added to recipient
- ✅ Gift appears in chat (if implemented)
- ✅ Error handling works (insufficient balance)

### 5.3 Diamond Conversion (Needs Implementation ⚠️)

**Tasks:**
1. Update `components/DiamondConversion.tsx`:
   - Implement `handleConvert()` to call `convert_diamonds_to_coins()` RPC
   - Add error handling
   - Show success/error feedback

**Files to Modify:**
- `components/DiamondConversion.tsx` - Wire to RPC

**SQL Required:** None (RPC already exists)

**Acceptance Tests:**
- ✅ User can convert diamonds to coins
- ✅ 30% platform fee is deducted
- ✅ Coins are added to balance
- ✅ Diamonds are deducted from earnings
- ✅ Error handling works (insufficient diamonds)

### 5.4 Leaderboards (Needs Implementation ⚠️)

**Tasks:**
1. Update `components/Leaderboard.tsx`:
   - Query `profiles` sorted by `total_gifts_received` DESC
   - Display top 10-20 streamers
   - Show gifter badges

2. Update `components/TopSupporters.tsx`:
   - Query `gifts` aggregated by `sender_id` for current streamer
   - Display top supporters

**Files to Modify:**
- `components/Leaderboard.tsx` - Query real data
- `components/TopSupporters.tsx` - Query real data

**SQL Required:** None (tables exist, just need queries)

**Acceptance Tests:**
- ✅ Leaderboard shows top streamers by gifts received
- ✅ Top Supporters shows top gifters for current streamer
- ✅ Data updates in real-time (if realtime subscription added)

**Deliverables:**
- Wallet balances wired
- Gifting wired
- Diamond conversion wired
- Leaderboards wired

---

## Testing Strategy

### Local Testing (Windows)

1. **Seed Mode (No Supabase):**
   ```bash
   npm install
   npm run dev
   ```
   - Visit `http://localhost:3000/live`
   - Should show mock data
   - No database required

2. **With Supabase:**
   ```bash
   # Set .env.local
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   
   npm run dev
   ```
   - Visit `http://localhost:3000/live`
   - Should show real data
   - Requires Supabase setup

3. **With LiveKit (Phase 4+):**
   ```bash
   # Set .env.local
   LIVEKIT_URL=...
   LIVEKIT_API_KEY=...
   LIVEKIT_API_SECRET=...
   
   npm run dev
   ```
   - Requires LiveKit server running
   - Test video streaming

### Acceptance Checklist (Per Phase)

**Phase 1:**
- [ ] Storage buckets created
- [ ] Avatar upload works
- [ ] Pinned post media upload works
- [ ] Media displays on profile pages
- [ ] Seed mode still works

**Phase 2:**
- [ ] Chat messages load from database
- [ ] Chat messages send to database
- [ ] Real-time updates work
- [ ] Blocking integration works

**Phase 3:**
- [ ] Grid layout loads on mount
- [ ] Grid layout saves on changes
- [ ] Filter buttons work
- [ ] Pinned tiles persist

**Phase 4:**
- [ ] Token endpoint works
- [ ] Webhook receives events
- [ ] Video appears in tiles
- [ ] Demand-based publishing works

**Phase 5:**
- [ ] Wallet balances display real data
- [ ] Gifting works
- [ ] Diamond conversion works
- [ ] Leaderboards display real data

---

## Rollback Plan

If any phase breaks production:

1. **Set environment variable:**
   ```env
   NEXT_PUBLIC_APP_MODE=seed
   ```
   This forces seed mode, bypassing all real data connections.

2. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   ```

3. **Database rollback:**
   - RPC functions can be disabled by revoking EXECUTE permissions
   - Tables remain intact (no data loss)

---

**Next Steps:** Begin with Phase 1.3 (Storage Buckets) to complete the profile system.

