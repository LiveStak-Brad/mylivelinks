# Mobile Teams - Web Feature Parity Audit

**Date:** January 12, 2026  
**Status:** In Progress

---

## Web Teams Features (Source of Truth)

### Navigation Tabs (Web)
1. **Home** - Team overview, stats, pinned posts, live members
2. **Feed** - All team posts with reactions, comments, polls
3. **Chat** - Real-time team messaging
4. **Live** - Team live rooms and streaming
5. **Members** - Member list with roles and management
6. **Settings** - Team configuration (admin only)

### Home Tab Features (Web)
- Live member presence indicators
- Online count / Live count badges
- Pinned posts preview
- Quick navigation to other tabs
- Team stats overview
- Recent activity feed

### Feed Tab Features (Web)
- Create post with text/media
- Post reactions (like)
- Post comments with threading
- Post gifting
- Post pinning (admin)
- Post deletion (author/admin)
- Post management modal
- Poll creation
- Poll voting
- Feed sorting (recent/top)
- Infinite scroll / load more
- Pull to refresh

### Chat Tab Features (Web)
- Real-time messaging
- Message reactions (emoji)
- Member @mentions
- Chat permissions based on role
- Muted members cannot chat
- Message history

### Live Tab Features (Web)
- List of active team live rooms
- "Go Live" button for members
- Team live unlock status (100 members)
- Team live visibility toggle (private/public)
- Live room creation
- Navigation to live rooms

### Members Tab Features (Web)
- Member list with avatars
- Role badges (Owner/Moderator/Member)
- Member count
- Manage button (admin only)
- Member search/filter
- Presence indicators

### Settings Tab Features (Web - Admin Only)
- Team name/description editing
- Team icon/banner upload
- Team slug management
- Team privacy settings
- Member role management
- Team deletion
- Notification preferences
- Team live settings

### Header Features (Web)
- Team banner with gradient overlay
- Team icon
- Team name and slug
- Member count
- Join/Leave buttons
- Invite button (members)
- Share button
- Settings button (admin)
- Notification bell with preferences

### Notification Preferences (Web)
- New posts
- New comments
- New members
- Live room starts
- @mentions
- Per-team customization

### Post Features (Web)
- Text content
- Media attachments (images)
- Author info with avatar
- Timestamp
- Reaction count
- Comment count
- Like button
- Comment button
- Gift button
- Pin button (admin)
- Delete button (author/admin)
- Share button

### Comment Features (Web)
- Nested replies
- Comment reactions
- Comment gifting
- Comment deletion
- Author info

### Member Management (Web - Admin)
- Promote to moderator
- Demote from moderator
- Remove member
- Ban member
- Approve pending requests

---

## Mobile Teams Current Implementation

### Navigation Tabs (Mobile)
✅ **Home** - Placeholder with empty state  
✅ **Feed** - Posts loading from `team_feed_posts`  
✅ **Chat** - Placeholder with empty state  
✅ **Live** - Placeholder with "Go Live" button  
✅ **Members** - Real members from `rpc_get_team_members`  
✅ **About** - Team description and info  

### Tab Layout
✅ Icons + labels (no text wrapping)  
✅ Active state styling  
✅ Proper spacing

### Header Features (Mobile)
✅ Team banner with gradient fallback  
✅ Team icon with initial fallback  
✅ Team name  
✅ Member count  
✅ Join button (non-members)  
✅ Leave button (members, not owner)  
✅ Invite button (members)  
❌ Share button  
❌ Settings button  
❌ Notification bell  

### Feed Tab (Mobile)
✅ Posts list with real data  
✅ Author avatar with fallback  
✅ Author name  
✅ Post timestamp  
✅ Post content  
✅ Empty state  
✅ Loading state  
✅ Pull to refresh  
✅ Create post button (placeholder)  
❌ Post media display  
❌ Reaction button/count  
❌ Comment button/count  
❌ Gift button  
❌ Pin functionality  
❌ Delete functionality  
❌ Post management  
❌ Polls  
❌ Feed sorting  

### Members Tab (Mobile)
✅ Member list with real data  
✅ Member avatars with fallback  
✅ Member names  
✅ Role display  
✅ Empty state  
✅ Loading state  
✅ Manage button (owner, placeholder)  
❌ Presence indicators  
❌ Member search  
❌ Role badges styling  

### Home Tab (Mobile)
❌ Live member presence  
❌ Online/live counts  
❌ Pinned posts  
❌ Team stats  
❌ Recent activity  
❌ Quick navigation  

### Chat Tab (Mobile)
❌ All features (placeholder)

### Live Tab (Mobile)
✅ Empty state  
✅ Go Live button (placeholder)  
❌ Active rooms list  
❌ Team live unlock status  
❌ Visibility toggle  

### About Tab (Mobile)
✅ Team description  
✅ Team info  
❌ Team rules  
❌ Created date  
❌ Creator info  

---

## Missing Features (Priority Order)

### P0 - Critical for Basic Functionality
1. ❌ **Post reactions** - Like button and count
2. ❌ **Post comments** - View and add comments
3. ❌ **Share button** - Share team/posts
4. ❌ **Post media display** - Show images in posts
5. ❌ **Create post modal** - Full post creation UI
6. ❌ **Notification preferences** - Bell icon + modal

### P1 - Important for Feature Parity
7. ❌ **Home tab content** - Stats, pinned posts, live members
8. ❌ **Chat functionality** - Real-time messaging
9. ❌ **Settings screen** - Team management (admin)
10. ❌ **Member management** - Promote/demote/remove
11. ❌ **Post management** - Pin/delete/edit
12. ❌ **Live rooms list** - Show active team rooms
13. ❌ **Presence indicators** - Online status dots

### P2 - Nice to Have
14. ❌ **Polls** - Create and vote on polls
15. ❌ **Post gifting** - Send gifts to posts
16. ❌ **Comment gifting** - Send gifts to comments
17. ❌ **Feed sorting** - Recent/top toggle
18. ❌ **Member search** - Filter members
19. ❌ **Team live visibility** - Toggle private/public
20. ❌ **Comment threading** - Nested replies

---

## Implementation Plan

### Phase 1: Core Interactions (P0)
- [ ] Add post reactions UI and RPC calls
- [ ] Add post comments screen/modal
- [ ] Add share functionality
- [ ] Add media display in posts
- [ ] Build create post modal
- [ ] Add notification preferences modal

### Phase 2: Feature Completion (P1)
- [ ] Build Home tab with real content
- [ ] Implement Chat tab with real-time messaging
- [ ] Build Settings screen for admins
- [ ] Add member management features
- [ ] Add post management (pin/delete)
- [ ] Show live rooms in Live tab
- [ ] Add presence indicators

### Phase 3: Advanced Features (P2)
- [ ] Add poll creation and voting
- [ ] Add gifting to posts/comments
- [ ] Add feed sorting options
- [ ] Add member search/filter
- [ ] Add team live visibility controls
- [ ] Add comment threading

---

## Data Model Alignment

### Tables Used (Mobile ✅ = Implemented)
- ✅ `teams` - Team data
- ✅ `team_memberships` - Membership status
- ✅ `team_feed_posts` - Posts
- ✅ `profiles` - User data
- ❌ `team_feed_comments` - Comments
- ❌ `team_feed_reactions` - Post reactions
- ❌ `team_comment_reactions` - Comment reactions
- ❌ `team_chat_messages` - Chat messages
- ❌ `team_chat_reactions` - Chat reactions
- ❌ `team_poll_options` - Poll options
- ❌ `team_poll_votes` - Poll votes
- ❌ `team_notification_preferences` - Notification settings
- ❌ `team_live_room_configs` - Live room settings
- ❌ `team_presence_events` - Member presence

### RPCs Used (Mobile ✅ = Implemented)
- ✅ `rpc_get_teams_discovery_ordered` - Discovery
- ✅ `rpc_get_team_members` - Members list
- ✅ `rpc_join_team` - Join team
- ✅ `rpc_leave_team` - Leave team
- ✅ `rpc_accept_team_invite` - Accept invite
- ✅ `rpc_decline_team_invite` - Decline invite
- ❌ `rpc_create_team_post` - Create post
- ❌ `rpc_delete_team_post` - Delete post
- ❌ `rpc_pin_team_post` - Pin post
- ❌ `rpc_react_to_post` - React to post
- ❌ `rpc_create_comment` - Create comment
- ❌ `rpc_send_team_chat_message` - Send chat
- ❌ `rpc_create_poll` - Create poll
- ❌ `rpc_vote_poll` - Vote on poll

---

## Summary

**Mobile Implementation Status: ~35% Complete**

**Implemented:**
- ✅ Navigation structure with icons
- ✅ Basic data loading (teams, members, posts)
- ✅ Join/leave functionality
- ✅ Photo display with fallbacks
- ✅ Pull-to-refresh
- ✅ Loading/empty/error states

**Missing:**
- ❌ Post interactions (reactions, comments, sharing)
- ❌ Post creation and management
- ❌ Chat functionality
- ❌ Home tab content
- ❌ Settings/admin features
- ❌ Notification preferences
- ❌ Live room features
- ❌ Member management
- ❌ Polls and gifting

**Next Steps:**
1. Implement post reactions and comments (P0)
2. Add share and media display (P0)
3. Build create post modal (P0)
4. Add notification preferences (P0)
5. Continue with P1 features
