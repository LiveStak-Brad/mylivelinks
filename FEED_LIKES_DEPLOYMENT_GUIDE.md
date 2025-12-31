# Feed Likes System - Deployment Guide

## What Was Fixed

### 1. **Likes Weren't Working**
- ✅ Like button had no handler attached
- ✅ No state tracking for liked posts
- ✅ No visual feedback when liked

### 2. **UI Looked Outdated**
- ✅ Cramped, unclear layout
- ✅ No separation between stats and actions
- ✅ Not modern like Facebook/Instagram

## Modern UI Design (Facebook/Instagram Style)

### Before:
```
┌───────────────────────────────┐
│ [@] Username • 2h ago         │
│ Post content...               │
│ [── Image ──]                 │
│ [♡ Like] [🎁 Gift] 🪙42 [💬]  │ ← Cramped!
└───────────────────────────────┘
```

### After:
```
┌───────────────────────────────┐
│ [@] Username                  │
│     2 hours ago               │
├───────────────────────────────┤
│ Post content...               │
│ [────── Image ────────]       │
├───────────────────────────────┤
│ ❤️ 24 likes  💬 5 comments    │ ← Stats bar
├───────────────────────────────┤
│ [❤️ Like] [💬 Comment] [🎁 Gift] │ ← Action buttons
└───────────────────────────────┘
```

## Changes Made

### Mobile App (`mobile/`)
1. **`mobile/hooks/useFeed.ts`**
   - Added `likes_count: number` to `FeedPost` type

2. **`mobile/screens/FeedScreen.tsx`**
   - Added like state tracking: `likedPostIds`, `likesLoading`
   - Added `loadLikedPosts()` to fetch user's liked posts
   - Added `handleLike()` with optimistic updates
   - **Modern UI redesign:**
     - Separate stats bar (likes, comments, coins)
     - Separate action buttons bar (Like, Comment, Gift)
     - Red heart (❤️) when liked, outline (♡) when not
     - Clean borders separating sections
     - Larger touch targets

3. **Styles Updated:**
   - `statsBar` - Shows engagement metrics
   - `statsText` - Metric labels (e.g., "24 likes")
   - `actionsBar` - Button container with border
   - `actionButton` - Individual action buttons
   - `actionIcon` / `actionLabel` - Button content
   - `actionIconLiked` / `actionLabelLiked` - Red color when liked

### Backend (`app/api/feed/route.ts`)
- Added `likes_count: number` to `FeedPost` type
- Added `likes_count: Number(r.likes_count ?? 0)` to response mapping

### Database

#### New Tables:
- `post_likes` - Tracks who liked which posts (dedupe: one per user per post)
- `post_comment_likes` - Tracks comment likes
- `notifications` - Stores all notification types

#### New Columns:
- `posts.likes_count` - Cached like count (integer)
- `post_comments.likes_count` - Cached comment like count

#### New RPC Functions:
- `rpc_like_post(post_id, profile_id)` - Like a post (no unlike)
- `rpc_like_comment(comment_id, profile_id)` - Like a comment
- `rpc_get_user_post_likes(profile_id, post_ids[])` - Get user's liked posts
- `rpc_get_user_comment_likes(profile_id, comment_ids[])` - Get liked comments
- `rpc_mark_notification_read(notification_id)` - Mark notification read
- `rpc_mark_all_notifications_read()` - Mark all as read
- `rpc_get_unread_count()` - Get unread count
- Updated `get_public_feed()` - Now returns `likes_count`

#### Triggers:
- Post like → Notify post author
- Comment like → Notify comment author  
- New comment → Notify post author

## Deployment Steps

### 1. Apply Database Migration
```bash
# In Supabase SQL Editor, run these in order:
1. APPLY_FEED_LIKES_SYSTEM.sql
2. UPDATE_FEED_RPC_WITH_LIKES.sql
```

### 2. Deploy Web/API
```bash
git add .
git commit -m "feat: modern feed UI with working likes (Facebook/Instagram style)"
git push
```

Vercel will auto-deploy.

### 3. Build & Deploy Mobile App
```bash
cd mobile
eas build --profile preview --platform ios --clear-cache
```

## Testing Checklist

### Database
- [ ] Tables created: `post_likes`, `post_comment_likes`, `notifications`
- [ ] Columns added: `posts.likes_count`, `post_comments.likes_count`
- [ ] RPC functions work:
  ```sql
  -- Test like a post
  SELECT * FROM rpc_like_post('your-post-id'::uuid, 'your-profile-id'::uuid);
  
  -- Check if user liked posts
  SELECT * FROM rpc_get_user_post_likes('your-profile-id'::uuid, ARRAY['post-id-1'::uuid, 'post-id-2'::uuid]);
  
  -- Get unread notification count
  SELECT rpc_get_unread_count();
  ```

### Mobile App
- [ ] Feed loads with like counts visible
- [ ] Like button changes from ♡ to ❤️ when tapped
- [ ] Like count increments immediately (optimistic UI)
- [ ] Already liked posts show filled heart
- [ ] Cannot unlike (by design)
- [ ] Stats bar shows: "❤️ X likes  💬 Y comments  🪙 Z coins"
- [ ] Action buttons clearly separated from stats
- [ ] UI looks clean and modern (Facebook/Instagram style)

### Notifications
- [ ] Liking a post creates notification for author
- [ ] No notification when liking own post
- [ ] Notification links to post

## Key Features

### Like-Only (No Unlike)
- Mimics Instagram's approach
- Simplifies UX and reduces DB writes
- Once liked, heart stays filled

### Optimistic UI
- Heart changes instantly when tapped
- Like count increments immediately
- Reverts if server request fails

### Efficient Data Loading
- Batch fetch: "Which posts has this user liked?"
- Single RPC call with array of post IDs
- Loads on feed refresh

### Modern Visual Design
- **Stats Bar**: Shows engagement metrics clearly
- **Actions Bar**: Dedicated space for interaction buttons
- **Border Separation**: Clean lines between sections
- **Color Coding**: Red for likes, purple for gifts
- **Larger Touch Targets**: Easier to tap (44pt minimum)

## Performance

### Database
- Primary keys on `(post_id, profile_id)` prevent duplicate likes
- Indexes on `post_id` and `profile_id` for fast lookups
- Cached counters (`likes_count`) avoid COUNT(*) on every request

### Mobile
- Optimistic updates = instant UI feedback
- Batch RPC calls = fewer network requests
- Set-based state (`Set<string>`) = O(1) lookups

## Files Changed

### Mobile
- `mobile/hooks/useFeed.ts`
- `mobile/screens/FeedScreen.tsx`

### Backend
- `app/api/feed/route.ts`

### Database
- `APPLY_FEED_LIKES_SYSTEM.sql` (new)
- `UPDATE_FEED_RPC_WITH_LIKES.sql` (new)

### Docs
- `FEED_LIKES_MODERNIZATION_PLAN.md` (new)
- `FEED_LIKES_DEPLOYMENT_GUIDE.md` (this file)

## Troubleshooting

### Like button does nothing
- Check console for errors
- Verify user is logged in (`user?.id` exists)
- Check Supabase RPC function exists: `rpc_like_post`

### Like count doesn't show
- Verify `posts.likes_count` column exists
- Check API response includes `likes_count` field
- Confirm `get_public_feed()` function updated

### Heart doesn't turn red
- Check `likedPostIds` state is populated
- Verify `loadLikedPosts()` is called on mount
- Check `rpc_get_user_post_likes()` function exists

### Old UI still showing
- Clear mobile app cache
- Rebuild app: `eas build --profile preview --platform ios --clear-cache`
- Hard refresh web: Ctrl+Shift+R

## Next Steps (Optional)

### Future Enhancements
- [ ] Unlike functionality (if requested)
- [ ] Like count on hover shows "who liked"
- [ ] Animation when liking
- [ ] Comment system integration
- [ ] Share button
- [ ] Real-time like updates via Supabase Realtime

---

**Status:** ✅ Complete & Ready to Deploy
