# Post Management Features Implementation

## Overview
Added comprehensive post management capabilities for both personal feed posts and team feed posts, including:
- **Pin/Unpin posts** - Keep important posts at the top of feeds
- **Delete posts** - Remove posts (author or moderators)
- **Edit visibility** - Change who can see posts (public/friends/private for personal, public/members for teams)

## Database Changes

### Migration: `20260110_post_management_features.sql`

#### Personal Feed Posts (`posts` table)
- Added `is_pinned` boolean column (default: false)
- Added `pinned_at` timestamptz column
- Created index for efficient pinned post queries: `idx_posts_author_pinned`

#### Team Feed Posts (`team_feed_posts` table)
- Added `visibility` text column (default: 'public')
- Added constraint: visibility must be 'public' or 'members'
- Created index: `idx_team_feed_posts_visibility`

#### New RPC Functions

**Personal Feed:**
- `rpc_pin_post(p_post_id uuid, p_pin boolean)` - Pin/unpin own posts
- `rpc_delete_post(p_post_id uuid)` - Delete own posts
- `rpc_update_post_visibility(p_post_id uuid, p_visibility text)` - Change visibility (public/friends/private)

**Team Feed:**
- `rpc_update_team_post_visibility(p_post_id uuid, p_visibility text)` - Change visibility (public/members)
- Team posts already had `rpc_pin_team_post` and `rpc_delete_team_post` from previous migration

**Updated Functions:**
- `get_public_feed()` - Now returns `is_pinned` and `pinned_at` fields, sorts pinned posts first on profile feeds
- `rpc_get_team_feed()` - Now returns `visibility` field

## Frontend Components

### New Component: `PostManagementModal.tsx`
Location: `c:\mylivelinks.com\components\feed\PostManagementModal.tsx`

Modal dialog for managing posts with:
- **Pin/Unpin button** - Shows current pin status, available to authors and team moderators
- **Visibility selector** - Radio buttons to change post visibility (personal: public/friends/private, team: public/members)
- **Delete button** - Destructive action with confirmation, available to authors and team moderators
- Clean, modern UI with icons and descriptions

### Updated Component: `FeedPostCard.tsx`
Location: `c:\mylivelinks.com\components\feed\FeedPostCard.tsx`

Changes:
- Added new props: `postType`, `currentUserId`, `isModerator`, `visibility`, `isPinned`, `onPostDeleted`, `onPostUpdated`
- Shows "Pinned" badge next to author name when post is pinned
- Replaced "Report" button with "Manage" button (three dots) for post authors/moderators
- Integrates `PostManagementModal` for post management actions
- Non-authors still see "Report" button

### Updated Component: `PublicFeedClient.tsx`
Location: `c:\mylivelinks.com\components\feed\PublicFeedClient.tsx`

Changes:
- Updated `FeedPost` type to include `visibility` and `is_pinned` fields
- Passes post management props to `FeedPostWithLikes`:
  - `postType="personal"`
  - `currentUserId` from auth state
  - `visibility` and `isPinned` from post data
- Handles `onPostDeleted` callback - removes post from local state
- Handles `onPostUpdated` callback - refreshes feed to show changes

### Team Feed Integration
Location: `c:\mylivelinks.com\app\teams\[slug]\TeamPageContent.tsx`

The existing `FeedCard` component already has:
- `onDelete` and `onPin` callbacks wired up
- Permission checks for authors and moderators
- The new visibility editing can be added to the existing menu system

## Usage

### For Users (Personal Feed)
1. Click the three-dot menu button on your own posts
2. Choose from:
   - **Pin/Unpin** - Keep post at top of your profile feed
   - **Change Visibility** - Make post public, friends-only, or private
   - **Delete** - Permanently remove the post

### For Team Members
1. Click the three-dot menu button on your own team posts
2. Choose from:
   - **Pin/Unpin** - Keep post at top of team feed (moderators only)
   - **Change Visibility** - Make post public or members-only
   - **Delete** - Remove the post (author or moderators)

## Security

All RPC functions enforce proper authorization:
- **Pin/Unpin**: Only post author (personal) or team moderators (team)
- **Delete**: Only post author or team moderators
- **Visibility**: Only post author can change visibility
- All functions check authentication and ownership before allowing actions

## Database Migration Instructions

1. Apply the migration:
   ```bash
   # If using Supabase CLI
   supabase db push
   
   # Or apply directly via SQL editor in Supabase dashboard
   ```

2. Verify the migration:
   ```sql
   -- Check personal posts table
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'posts' 
   AND column_name IN ('is_pinned', 'pinned_at');
   
   -- Check team posts table
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'team_feed_posts' 
   AND column_name = 'visibility';
   
   -- Test RPC functions exist
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name LIKE 'rpc_%post%';
   ```

## Testing Checklist

- [ ] Pin a personal post - verify it appears at top of profile feed
- [ ] Unpin a personal post - verify it returns to chronological order
- [ ] Change personal post visibility to friends-only
- [ ] Change personal post visibility to private
- [ ] Delete a personal post
- [ ] Pin a team post as moderator
- [ ] Change team post visibility to members-only
- [ ] Delete team post as author
- [ ] Delete team post as moderator
- [ ] Verify non-authors cannot manage posts (only see Report button)

## Notes

- Pinned posts only appear at the top when viewing a specific user's profile feed (username filter)
- On the global feed, posts remain in chronological order
- Team post visibility "members" means only approved team members can see the post
- Personal post visibility "friends" requires the friends relationship in the database
- All visibility changes are instant and don't require page refresh
