# MyLiveLinks - Development Notes

## Purpose

This file tracks ongoing development decisions, TODOs, questions answered, and items requiring review.

**Last Updated:** 2024-12-19 (Phase 1.3 Complete)

---

## Decisions Made

### 2024-12-19: Phase 1.3 Storage Buckets Complete

**Decision:** Implemented Supabase Storage for avatars and pinned posts.

**Implementation:**
- Created `storage_buckets_setup.sql` with RLS policies (buckets must be created in Dashboard first)
- Created `lib/storage.ts` helper functions (`uploadAvatar`, `uploadPinnedPostMedia`, `deleteAvatar`, `deletePinnedPostMedia`)
- Updated `app/settings/profile/page.tsx` to upload files to storage before saving URLs
- Updated `lib/supabase.ts` mock client to include storage methods
- Created `.env.example` with storage setup notes
- Seed mode fallback: returns object URLs (not persisted)

**Important:** Storage buckets cannot be created via SQL. They must be created manually in Supabase Dashboard > Storage before running the SQL file.

**Setup Steps:**
1. Create `avatars` bucket in Dashboard (public, 5MB limit)
2. Create `pinned-posts` bucket in Dashboard (public, 50MB limit)
3. Run `storage_buckets_setup.sql` to create RLS policies

**Assumptions:**
- Buckets are created manually in Supabase Dashboard first (SQL only creates policies)
- File extensions are preserved from original filename
- Upsert mode replaces existing files (avatars/pinned posts are single per user)

**Open Questions:**
- None (implementation complete)

**Files Changed:**
- `storage_buckets_setup.sql` (new)
- `lib/storage.ts` (new)
- `app/settings/profile/page.tsx` (updated)
- `lib/supabase.ts` (updated mock client)
- `lib/pinnedPosts.ts` (fixed function call)
- `.env.example` (new)
- `README/DEV_NOTES.md` (this file)

**Testing:**
- ✅ Avatar upload works in real mode
- ✅ Pinned post media upload works in real mode
- ✅ Seed mode still works (object URLs)
- ✅ Storage URLs stored in database
- ✅ URLs display correctly on profile pages

### 2024-12-19: Documentation Corrections Applied

**Decision:** Applied critical corrections to Phase 0 documentation based on review.

**Corrections:**
1. Unified table naming: `user_grid_slots` (not `video_boxes`)
2. Documented `went_live_at` server-side trigger requirement
3. Fixed beta invites RLS (removed public SELECT, use RPC validation only)
4. Removed PREVIEW_MODE, use only APP_MODE
5. Clarified `live_streams` as source of truth for live status
6. Documented demand-based publishing rules (active_viewers is ONLY driver)
7. Specified exact storage bucket paths and RLS policies
8. Updated date placeholders

**Files Updated:**
- `README/AUDIT_CONNECT_REAL_DATA.md` - All corrections applied
- `README/IMPLEMENT_CONNECT_PLAN.md` - All corrections applied
- `README/BETA_TESTING_PLAN.md` - All corrections applied
- `README/DEV_NOTES.md` - This file

### 2024-12-19: Documentation Phase Complete

**Decision:** Created comprehensive documentation before implementing real data connections.

**Rationale:** 
- Provides clear roadmap for phased implementation
- Identifies gaps and missing pieces
- Ensures no breaking changes during migration
- Maintains seed mode compatibility

**Files Created:**
- `README/AUDIT_CONNECT_REAL_DATA.md` - Complete UI inventory and gap analysis
- `README/IMPLEMENT_CONNECT_PLAN.md` - Phased implementation plan
- `README/BETA_TESTING_PLAN.md` - Beta testing strategy

### 2024-12-19: App Mode Switching

**Decision:** Use `NEXT_PUBLIC_APP_MODE` environment variable to control app behavior (seed/beta/live).

**Rationale:**
- Clear separation of development, beta, and production modes
- Easy rollback if issues occur
- Allows beta testing with real data without affecting production

**Implementation:** See `README/BETA_TESTING_PLAN.md` Section A.

### 2024-12-19: Invite-Only Beta

**Decision:** Implement invite-only beta access using `beta_invites` table and middleware.

**Rationale:**
- Controls beta user access
- Tracks who has access
- Allows revocation if needed
- Can assign invites to specific emails/usernames

**Implementation:** See `README/BETA_TESTING_PLAN.md` Section B.

### 2024-12-19: Phased Implementation Approach

**Decision:** Implement real data connections in phases, not all at once.

**Rationale:**
- Reduces risk of breaking changes
- Allows testing each phase independently
- Maintains seed mode compatibility
- Easier to debug issues

**Phases:** See `README/IMPLEMENT_CONNECT_PLAN.md`

---

## TODOs

### High Priority

- [x] **Phase 1.3: Storage Buckets** ✅ COMPLETE
  - Created `avatars` bucket SQL setup
  - Created `pinned-posts` bucket SQL setup
  - Created `lib/storage.ts` helper functions
  - Updated `app/settings/profile/page.tsx` to upload to storage
  - Updated `app/[username]/page.tsx` to use storage URLs (already uses URLs from DB)
  - Seed mode fallback works (returns object URLs)
  - See `storage_buckets_setup.sql` for RLS policies

- [ ] **Phase 2.2: Chat Message Sending**
  - Implement `handleSendMessage()` in `components/Chat.tsx`
  - Add error handling
  - Add optimistic UI updates
  - Test real-time message delivery
  - Test blocking integration

- [ ] **Phase 3.2: Grid Layout Persistence**
  - Create `save_user_grid_layout()` RPC (uses `user_grid_slots` table)
  - Create `load_user_grid_layout()` RPC (uses `user_grid_slots` table)
  - Update `components/LiveRoom.tsx` to load/save layout
  - Test persistence across page refreshes
  - Test pinned tile persistence

- [ ] **Phase 3.3: Filter Buttons**
  - Create `get_most_gifted_streamers()` RPC
  - Create `get_newest_streamers()` RPC
  - Add filter buttons UI to `components/LiveRoom.tsx`
  - Implement filter handlers
  - Test filter functionality
  - Test pinned tile preservation

### Medium Priority

- [ ] **Phase 4: LiveKit Integration**
  - Install LiveKit SDK
  - Create `/api/livekit/token` endpoint
  - Create `/api/livekit/webhook` endpoint
  - Create `hooks/useLiveKit.ts`
  - Update `components/Tile.tsx` for video
  - Update `components/LiveRoom.tsx` for demand-based publishing
  - Test video streaming
  - Test demand-based publishing

- [ ] **Phase 5: Monetization Wiring**
  - Update `components/UserStatsSection.tsx` for real balances
  - Update `components/GiftModal.tsx` for real gifting
  - Update `components/DiamondConversion.tsx` for real conversion
  - Update `components/Leaderboard.tsx` for real data
  - Update `components/TopSupporters.tsx` for real data
  - Test all monetization flows

- [ ] **Beta Invite System**
  - Create `beta_invites` table
  - Create RPC functions (`redeem_beta_invite`, `check_beta_access`, `generate_beta_invite`, `revoke_beta_invite`)
  - Create `/beta` page
  - Create `/admin/invites` page
  - Create middleware for access enforcement
  - Test invite flow

### Low Priority

- [ ] **Room Applications**
  - Create `room_applications` table
  - Update `/apply` page to submit to database
  - Create admin review page
  - Test application flow

- [ ] **Admin Features**
  - Add `is_admin` column to `profiles` table
  - Create admin dashboard
  - Create moderation panel
  - Test admin access control

- [ ] **Analytics & Monitoring**
  - Set up error tracking (Sentry)
  - Set up analytics (Google Analytics)
  - Set up database monitoring
  - Set up uptime monitoring

---

## Questions Answered

### Q: Should we use LiveKit or Agora for video streaming?

**A:** LiveKit is chosen. Reasons:
- Modern, open-source solution
- Better developer experience
- Good documentation
- Supports demand-based publishing
- WebRTC-based (low latency)

**Status:** ✅ Decided

### Q: Should grid layout be per-user or global?

**A:** Per-user. Each user has their own 12-slot grid layout stored in `user_grid_slots` table.

**Status:** ✅ Decided (table already exists, canonical name confirmed)

### Q: Should we use Supabase Storage or external storage (S3) for media?

**A:** Supabase Storage for now. Reasons:
- Integrated with Supabase
- Easy RLS policies
- Can migrate to S3 later if needed

**Status:** ✅ Decided

### Q: Should beta invites expire?

**A:** Yes, by default 30 days. Can be customized per invite.

**Status:** ✅ Decided

### Q: Should we implement Stripe for coin purchases now?

**A:** No, defer to Phase 5. Focus on core functionality first.

**Status:** ✅ Decided

---

## Questions Pending Review

### Q: What is the exact demand-based publishing logic?

**A:** ✅ Clarified and documented:
- Streamer presses "Go Live" → `live_available = true` (in `live_streams` table)
- Streamer appears in discovery
- `active_viewers` table is the ONLY driver of `is_published`:
  - A viewer is "watching" ONLY if: tile visible in grid (`user_grid_slots`), tile active (not closed), heartbeat current
  - `is_published = true` when `active_viewers` count > 0 for that `live_stream_id`
  - `is_published = false` when `active_viewers` count = 0
- Streamer remains `live_available = true` until they manually stop
- `live_streams` table is source of truth (not `profiles.is_live`)

**Status:** ✅ Confirmed and documented

### Q: Should we cache leaderboard data or query on-demand?

**A:** Pending decision. Options:
- Query on-demand (simpler, but slower)
- Cache in Redis (faster, but more complex)
- Materialized view (PostgreSQL native, good middle ground)

**Status:** ⚠️ Needs decision

### Q: What is the exact gift animation/display flow?

**A:** Pending clarification. Current understanding:
- Gift appears in chat as a message
- Gift animation plays on tile (if implemented)
- Gift badge appears on sender's username

**Status:** ⚠️ Needs clarification

### Q: Should we support multiple rooms at launch?

**A:** No, single room (`live_central`) at launch. Multi-room support can be added later.

**Status:** ✅ Decided

---

## Code Review Items

### Review Needed: Storage Upload Implementation

**File:** `app/settings/profile/page.tsx`

**Issue:** Currently uses `URL.createObjectURL()` for media preview. Needs to be replaced with Supabase Storage upload.

**Action Required:**
- Implement `uploadToStorage()` function
- Handle upload progress
- Handle errors
- Store URLs in database
- Maintain seed mode fallback

**Status:** ⚠️ Pending implementation

### Review Needed: Chat Message Sending

**File:** `components/Chat.tsx`

**Issue:** `handleSendMessage()` is not fully implemented. Currently shows alert only.

**Action Required:**
- Implement Supabase INSERT
- Add error handling
- Add optimistic UI updates
- Test real-time delivery

**Status:** ⚠️ Pending implementation

### Review Needed: Grid Layout Load/Save

**File:** `components/LiveRoom.tsx`

**Issue:** Grid layout is stored in local state only. Needs database persistence.

**Action Required:**
- Create RPC functions
- Implement `loadGridLayout()` on mount
- Implement `saveGridLayout()` on changes (debounced)
- Test persistence

**Status:** ⚠️ Pending implementation

---

## Known Issues

### Issue: Chat Not Showing in Seed Mode

**Status:** ✅ Fixed

**Solution:** Added `seedMessagesInitialized` ref to prevent regeneration on re-renders.

**Files:** `components/Chat.tsx`

### Issue: Mock User ID Not Valid UUID

**Status:** ✅ Fixed

**Solution:** Prioritize real Supabase auth over mock auth. Clear mock data when real auth succeeds.

**Files:** `app/settings/profile/page.tsx`, `app/login/page.tsx`

### Issue: Volume Slider Interferes with Drag-and-Drop

**Status:** ✅ Fixed

**Solution:** Disable drag when volume slider is open. Add `onVolumeSliderToggle` callback.

**Files:** `components/LiveRoom.tsx`, `components/Tile.tsx`

---

## Architecture Decisions

### Decision: Use RPC Functions for Complex Queries

**Rationale:**
- Centralizes business logic in database
- Better performance (runs on database server)
- Easier to maintain
- Can be reused by multiple clients

**Examples:**
- `get_available_streamers_filtered()` - Filters blocked users
- `process_gift()` - Handles gift transaction logic
- `update_coin_balance_via_ledger()` - Ensures ledger consistency

**Status:** ✅ Implemented

### Decision: Ledger-Based Coin System

**Rationale:**
- Immutable transaction log
- Prevents balance manipulation
- Audit trail
- Idempotent operations

**Implementation:** `ledger_entries` table is source of truth. `profiles.coin_balance` is cached.

**Status:** ✅ Implemented

### Decision: Demand-Based Publishing

**Rationale:**
- Cost-efficient (only publish when watched)
- Scales better
- Reduces bandwidth costs

**Implementation:** `is_published` is derived from `active_viewers` count via `update_publish_state_from_viewers()` RPC.

**Status:** ⚠️ Partially implemented (RPC exists, needs LiveKit integration)

---

## Testing Notes

### Test: Seed Mode Compatibility

**Result:** ✅ Pass

**Notes:** All components work in seed mode. Mock data generators function correctly.

### Test: Supabase Auth

**Result:** ✅ Pass

**Notes:** Authentication works correctly. Session persists. Protected routes redirect properly.

### Test: Profile CRUD

**Result:** ✅ Pass

**Notes:** Profile updates work. Links CRUD works. Pinned post CRUD works. Storage uploads pending.

### Test: Chat Realtime

**Result:** ⚠️ Partial

**Notes:** Chat loads messages. Realtime subscription exists but not fully tested. Message sending not implemented.

### Test: Grid Layout

**Result:** ⚠️ Partial

**Notes:** Grid displays correctly. Layout persistence not implemented. Filters not implemented.

---

## Performance Considerations

### Database Queries

**Concern:** Leaderboard queries may be slow with many users.

**Solution:** Consider materialized views or caching. Defer optimization until needed.

**Status:** ⚠️ Monitor in production

### Realtime Subscriptions

**Concern:** Too many subscriptions may cause performance issues.

**Solution:** 
- Only subscribe to channels for visible data
- Unsubscribe when component unmounts
- Use `useOptimizedSubscription` hook if needed

**Status:** ⚠️ Monitor in production

### Video Streaming

**Concern:** Multiple concurrent video streams may be resource-intensive.

**Solution:** 
- Demand-based publishing (only publish when watched)
- Limit concurrent streams per user (12 max)
- Use adaptive bitrate streaming

**Status:** ⚠️ Defer to Phase 4

---

## Security Considerations

### RLS Policies

**Status:** ✅ Implemented

**Notes:** All sensitive tables have RLS policies. Policies tested and working.

### API Endpoints

**Status:** ⚠️ Pending

**Notes:** LiveKit token endpoint needs authentication. Webhook endpoint needs signature validation.

### Storage Buckets

**Status:** ⚠️ Pending

**Notes:** 
- Bucket paths: `avatars/{profile_id}/avatar.{ext}` and `pinned-posts/{profile_id}/pinned.{ext}`
- RLS policies: Write allowed ONLY if `auth.uid() = profile_id`, read allowed for all (public)
- See `IMPLEMENT_CONNECT_PLAN.md` Phase 1.3 for exact SQL policies

---

## Next Steps

1. **Immediate:** Complete Phase 1.3 (Storage Buckets)
2. **Next:** Complete Phase 2.2 (Chat Message Sending)
3. **Then:** Complete Phase 3.2 (Grid Layout Persistence)
4. **After:** Complete Phase 3.3 (Filter Buttons)
5. **Later:** Phase 4 (LiveKit) and Phase 5 (Monetization)

---

**Note:** This file should be updated regularly as development progresses. Keep it current with decisions, TODOs, and issues.

