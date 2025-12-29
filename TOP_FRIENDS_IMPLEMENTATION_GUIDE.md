# Top Friends Feature - Implementation Guide

## 🚀 Quick Start

### Step 1: Apply Database Migration
Run the SQL migration to create the `top_friends` table and RPC functions:

```bash
# Option 1: Using Supabase SQL Editor
# Copy the contents of sql/create_top_friends.sql and paste into Supabase SQL Editor, then run

# Option 2: Using psql (if you have direct database access)
psql -h your-supabase-host -U postgres -d postgres -f sql/create_top_friends.sql

# Option 3: Using Supabase CLI
supabase db push
```

**What this creates:**
- `top_friends` table with RLS policies
- 4 RPC functions for CRUD operations
- Proper indexes for performance
- Automatic updated_at timestamp trigger

### Step 2: Verify Installation
After running the migration, verify it worked:

```sql
-- Check table exists
SELECT * FROM top_friends LIMIT 1;

-- Check RPC functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%top_friend%';

-- Should return:
-- - get_top_friends
-- - upsert_top_friend
-- - remove_top_friend
-- - reorder_top_friends
```

### Step 3: Test the Feature
1. Log in to your app
2. Navigate to your profile
3. Scroll to "Top Friends" section
4. Click "Manage" button
5. Search for a friend and add them
6. Verify they appear in position 1

## 📂 Files Created

### Database
- `sql/create_top_friends.sql` - Complete database schema

### API Routes
- `app/api/profile/top-friends/route.ts` - CRUD endpoints
- `app/api/search/users/route.ts` - User search endpoint

### Components
- `components/profile/TopFriendsDisplay.tsx` - Public display
- `components/profile/TopFriendsManager.tsx` - Management modal

### Documentation
- `TOP_FRIENDS_FEATURE_DELIVERABLE.md` - Complete feature docs
- `TOP_FRIENDS_VISUAL_GUIDE.md` - Visual design reference
- `TOP_FRIENDS_IMPLEMENTATION_GUIDE.md` - This file

### Modified Files
- `app/[username]/modern-page.tsx` - Integrated display + manager

## 🔧 Configuration

### No Configuration Required!
The feature works out of the box with sensible defaults:
- Max 8 friends (hardcoded, can be changed in SQL)
- Public viewing, owner-only editing
- Inherits profile theme customization

### Optional Customizations

#### Change Maximum Friends Limit
Edit `sql/create_top_friends.sql` before running:

```sql
-- Change from 8 to any number (e.g., 12)
position INTEGER NOT NULL CHECK (position >= 1 AND position <= 12),
```

Then update the UI components:
- `TopFriendsDisplay.tsx` - Change grid columns
- `TopFriendsManager.tsx` - Update "8" references

#### Change Grid Layout
In `TopFriendsDisplay.tsx`, modify the grid classes:

```tsx
// Current: 2 columns mobile, 4 desktop
className="grid grid-cols-2 sm:grid-cols-4 gap-4"

// Example: 3 columns mobile, 6 desktop
className="grid grid-cols-3 sm:grid-cols-6 gap-4"
```

#### Disable for Specific Profile Types
In `app/[username]/modern-page.tsx`, add conditional rendering:

```tsx
{/* Only show for 'creator' and 'streamer' profile types */}
{(profile.profile_type === 'creator' || profile.profile_type === 'streamer') && (
  <TopFriendsDisplay
    // ... props
  />
)}
```

## 🧪 Testing Checklist

### Manual Testing
- [ ] Can add a friend (search works)
- [ ] Can add up to 8 friends
- [ ] Cannot add 9th friend (error message)
- [ ] Can remove a friend
- [ ] Can reorder friends via drag-and-drop
- [ ] Position numbers update correctly after reorder
- [ ] Changes persist after page reload
- [ ] Non-owners cannot see "Manage" button
- [ ] Non-owners can view friends
- [ ] Live badges appear for streaming friends
- [ ] Empty slots show for owners with < 8 friends
- [ ] Section hidden for visitors if owner has 0 friends
- [ ] Avatar fallbacks work (colored circles)
- [ ] Theme customization applies (accent color, etc.)
- [ ] Mobile responsive (2 columns)
- [ ] Desktop responsive (4 columns)
- [ ] Search filters out self
- [ ] Search filters out already-added friends
- [ ] Loading states display correctly

### Database Testing
```sql
-- Test adding a friend
SELECT upsert_top_friend(
  'friend-uuid-here'::uuid, 
  1
);

-- Test getting top friends
SELECT * FROM get_top_friends('your-profile-uuid'::uuid);

-- Test removing a friend
SELECT remove_top_friend('friend-uuid-here'::uuid);

-- Test reordering
SELECT reorder_top_friends('friend-uuid-here'::uuid, 3);
```

### API Testing
```bash
# Get top friends
curl "http://localhost:3000/api/profile/top-friends?profileId=YOUR_PROFILE_ID"

# Add a friend (requires auth)
curl -X POST "http://localhost:3000/api/profile/top-friends" \
  -H "Content-Type: application/json" \
  -d '{"friendId":"FRIEND_ID","position":1}'

# Remove a friend (requires auth)
curl -X DELETE "http://localhost:3000/api/profile/top-friends?friendId=FRIEND_ID"

# Reorder (requires auth)
curl -X PATCH "http://localhost:3000/api/profile/top-friends/reorder" \
  -H "Content-Type: application/json" \
  -d '{"friendId":"FRIEND_ID","newPosition":3}'
```

## 🐛 Troubleshooting

### "Function does not exist" Error
**Problem:** RPC functions not created
**Solution:** Run the SQL migration again in Supabase SQL Editor

### "Permission denied" Error
**Problem:** RLS policies not working
**Solution:** Check that you're authenticated and calling from client-side with proper session

### Friends Not Appearing
**Problem:** Data not loading
**Solution:** 
1. Check browser console for API errors
2. Verify profile ID is correct
3. Check Supabase logs for RPC errors

### Search Not Working
**Problem:** User search returns empty
**Solution:**
1. Verify `/api/search/users` route exists
2. Check that profiles table has data
3. Ensure search query is at least 1 character

### Drag-and-Drop Not Working
**Problem:** Reorder doesn't save
**Solution:**
1. Check browser console for errors
2. Verify `reorder_top_friends` RPC exists
3. Ensure you have permission (are the profile owner)

### Position Numbers Wrong
**Problem:** Positions don't match 1-8 sequence
**Solution:** Positions are set by the database. Delete all friends and re-add them to reset positions.

## 🔒 Security Notes

### RLS Policies
The feature uses Row Level Security to ensure:
- Anyone can view top friends (public)
- Only profile owner can edit their top friends
- No one can edit others' top friends

### Authentication Required For:
- Adding friends
- Removing friends
- Reordering friends

### No Authentication Required For:
- Viewing top friends
- Searching users (public data)

### SQL Injection Protection
All inputs are parameterized through RPC functions, preventing SQL injection.

### Rate Limiting
Consider adding rate limits to:
- `/api/profile/top-friends` (POST) - Prevent spam adding
- `/api/search/users` - Prevent search abuse

Example using Vercel KV:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

// In your route handler:
const { success } = await ratelimit.limit(user.id);
if (!success) {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

## 📈 Performance Considerations

### Database Indexes
The migration creates indexes on:
- `profile_id` - Fast user lookups
- `friend_id` - Reverse relationship queries
- `(profile_id, position)` - Sorted retrieval

### Caching Opportunities
Consider caching top friends data:

```typescript
// Example with Redis
import { kv } from "@vercel/kv";

// Cache top friends for 5 minutes
const cacheKey = `top_friends:${profileId}`;
const cached = await kv.get(cacheKey);

if (cached) {
  return cached;
}

const data = await fetchTopFriends(profileId);
await kv.set(cacheKey, data, { ex: 300 }); // 5 min TTL
return data;
```

### Lazy Loading
The TopFriendsDisplay component loads data on mount, not blocking page render.

### Image Optimization
Avatar images use Next.js Image component with automatic optimization.

## 🎨 Customization Examples

### Example 1: Hide Section by Default
Make it collapsible like Connections:

```tsx
const [topFriendsExpanded, setTopFriendsExpanded] = useState(false);

// In render:
<button onClick={() => setTopFriendsExpanded(!topFriendsExpanded)}>
  Top Friends ▼
</button>
{topFriendsExpanded && <TopFriendsDisplay {...props} />}
```

### Example 2: Add to Mobile App
The components are already mobile-friendly. Import in your React Native app:

```tsx
import { TopFriendsDisplay } from '@/components/profile/TopFriendsDisplay';

// In your profile screen:
<TopFriendsDisplay
  profileId={profileId}
  isOwner={isOwner}
  onManage={() => setModalOpen(true)}
/>
```

### Example 3: Show on Hover
Add hover card with top friends preview:

```tsx
<HoverCard>
  <HoverCardTrigger>@{username}</HoverCardTrigger>
  <HoverCardContent>
    <TopFriendsDisplay profileId={profileId} isOwner={false} />
  </HoverCardContent>
</HoverCard>
```

## 📊 Analytics Ideas

Track user engagement with top friends:

```typescript
// When friend is added
analytics.track('Top Friend Added', {
  profileId: user.id,
  friendId: friendId,
  position: position,
});

// When friends are reordered
analytics.track('Top Friends Reordered', {
  profileId: user.id,
  fromPosition: oldPosition,
  toPosition: newPosition,
});

// When friend card is clicked
analytics.track('Top Friend Profile Viewed', {
  viewerId: currentUser.id,
  profileId: friendId,
  position: position,
});
```

## 🎯 Future Enhancement Ideas

### Mutual Top Friends Badge
Show a badge when friends have each other in their top friends:

```typescript
const isMutual = await checkMutualTopFriend(profileId, friendId);
// Display special badge on card
```

### Friend Since Date
Add `added_at` column to show how long they've been in top friends:

```sql
ALTER TABLE top_friends ADD COLUMN added_at TIMESTAMPTZ DEFAULT now();
```

### Private Mode
Add option to hide top friends from public:

```sql
ALTER TABLE profiles ADD COLUMN hide_top_friends BOOLEAN DEFAULT false;
```

### Activity Feed
Show recent activity from top friends on profile:

```typescript
const activities = await getTopFriendsActivity(profileId);
// Display in a feed widget
```

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Run database migration on production Supabase
- [ ] Verify RPC functions exist
- [ ] Test adding/removing/reordering in production
- [ ] Check RLS policies work correctly
- [ ] Verify responsive design on mobile devices
- [ ] Test with different profile themes
- [ ] Ensure loading states work
- [ ] Check error handling for edge cases
- [ ] Verify search performance with large user base
- [ ] Add monitoring/logging for errors
- [ ] Consider adding rate limiting
- [ ] Update user documentation/help docs
- [ ] Announce new feature to users! 🎉

## 🎉 You're Done!

The Top Friends feature is now live and ready to bring back MySpace nostalgia! Users can showcase their favorite people and build stronger social connections.

Happy coding! 💙

---

**Need Help?**
- Check the console for errors
- Review Supabase logs
- Verify RPC function signatures
- Test with simpler cases first

**Found a Bug?**
- Check if migration ran successfully
- Verify authentication is working
- Test with fresh data
- Review RLS policies

