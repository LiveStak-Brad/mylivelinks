# Day Streak Calculation Fix - Complete

## Summary

Fixed the day streak calculation on user profiles to include **all meaningful user activities**, not just a subset. The streak now properly tracks consecutive days of real engagement.

---

## Problem Identified

The day streak calculation was **incomplete** - it was only checking 3 activity types:

### Previous (Incomplete) Activities:
1. ✅ `gifts` - Sending or receiving gifts
2. ✅ `ledger_entries` - Coin transactions (purchases, etc.)
3. ✅ `chat_messages` - Chat activity

### Missing Activities:
4. ❌ `posts` - Creating feed posts (**MISSING**)
5. ❌ `post_comments` - Commenting on posts (**MISSING**)
6. ❌ `post_likes` - Liking posts (**MISSING**)
7. ❌ `follows` - Following other users (**MISSING**)

This meant users who were actively posting, commenting, liking, or following were **not** getting credit for their daily activity streaks.

---

## Fix Applied

### File Changed:
- `app/api/profile/[username]/route.ts`

### What Changed:
Added 4 additional activity queries to the streak calculation:

```typescript
// 1. Posts (feed posts)
const { data: postRows } = await supabase
  .from('posts')
  .select('created_at')
  .eq('author_id', profileId)
  .gte('created_at', sinceIso)
  .limit(2000);

// 2. Comments on posts
const { data: commentRows } = await supabase
  .from('post_comments')
  .select('created_at')
  .eq('author_id', profileId)
  .gte('created_at', sinceIso)
  .limit(2000);

// 3. Likes on posts
const { data: likeRows } = await supabase
  .from('post_likes')
  .select('created_at')
  .eq('profile_id', profileId)
  .gte('created_at', sinceIso)
  .limit(2000);

// 4. Following other users
const { data: followRows } = await supabase
  .from('follows')
  .select('followed_at')
  .eq('follower_id', profileId)
  .gte('followed_at', sinceIso)
  .limit(2000);
```

---

## Complete Activity List

The streak calculation now tracks **all 7 activity types**:

1. ✅ **Gifts** - Sending or receiving gifts (`gifts.sent_at`)
2. ✅ **Transactions** - Coin purchases, ledger entries (`ledger_entries.created_at`)
3. ✅ **Chat** - Chat messages (`chat_messages.created_at`)
4. ✅ **Posts** - Creating feed posts (`posts.created_at`)
5. ✅ **Comments** - Commenting on posts (`post_comments.created_at`)
6. ✅ **Likes** - Liking posts (`post_likes.created_at`)
7. ✅ **Follows** - Following other users (`follows.followed_at`)

---

## How Streak Calculation Works

### Logic:
1. Query the **last 60 days** of activity across all 7 tables
2. Collect all unique **dates** (YYYY-MM-DD) where activity occurred
3. Starting from **today**, count **consecutive days** backward
4. If any day has **no activity**, the streak **breaks**

### Example:
```
Today: 2026-01-01
Activity dates: [2026-01-01, 2025-12-31, 2025-12-30, 2025-12-28]
                                                      ↑ GAP HERE

Result: 3-day streak (stops at the gap)
```

### Tolerant Design:
- Queries up to **2,000 records per table** (prevents performance issues)
- Uses **try/catch** on all queries (resilient to missing tables or permissions)
- **UTC-based** date calculation (consistent across timezones)

---

## Impact

### Before:
- Users posting daily: ❌ No streak credit
- Users commenting daily: ❌ No streak credit
- Users liking posts daily: ❌ No streak credit
- Users following others: ❌ No streak credit

### After:
- Users posting daily: ✅ Streak increments
- Users commenting daily: ✅ Streak increments
- Users liking posts daily: ✅ Streak increments
- Users following others: ✅ Streak increments

---

## Testing Checklist

- [ ] User creates a post → Check streak increases
- [ ] User comments on a post → Check streak increases
- [ ] User likes a post → Check streak increases
- [ ] User follows another user → Check streak increases
- [ ] User sends a gift → Check streak increases (already working)
- [ ] User chats → Check streak increases (already working)
- [ ] User purchases coins → Check streak increases (already working)
- [ ] User has **no activity** for a day → Streak resets to 0
- [ ] User has activity on consecutive days → Streak increments correctly

---

## UI Text Consistency

The UI tooltip already correctly states:
> "Streak days require real activity (comment, gift, chat, transactions, etc.). Refreshing the app/page doesn't count."

This fix ensures the backend **matches** what the UI promises.

---

## Status: ✅ COMPLETE

All meaningful user activities are now correctly tracked for day streaks.
