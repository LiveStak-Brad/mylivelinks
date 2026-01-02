# Teams Feature Launch Specification

## Overview

This document specifies the complete work required to launch the Teams feature. The **UI is complete** (sandbox at `/teams/sandbox`). The **database schema and RPC functions exist** (see migrations). What remains is **wiring the UI to the backend** and implementing missing real-time/chat infrastructure.

---

## 1. CURRENT STATE

### 1.1 UI Components (COMPLETE)

Location: `app/teams/sandbox/page.tsx`

**6 Surfaces Built:**
- **Team Home** - Dashboard with presence strip, pinned announcement, momentum bar, content stack
- **Team Feed** - Posts, threads, polls, clips with Hot/New/Top sorting
- **Team Chat** - Discord-style messages with reactions, system messages, live jump buttons
- **Team Live** - Live room grid, scheduled events, Go Live CTA
- **Team Members** - Roster with search, filters (All/Live/Online), role grouping
- **Team Settings** - Role-gated settings (Leader/Core only)

**TypeScript Interfaces Defined:**
```typescript
type Surface = 'home' | 'feed' | 'chat' | 'live' | 'members' | 'settings';
type RoleState = 'leader' | 'core' | 'member' | 'guest';
type MemberActivity = 'online' | 'live' | 'offline';
type FeedSort = 'hot' | 'new' | 'top';
type ContentType = 'post' | 'thread' | 'poll' | 'clip' | 'announcement' | 'event';

interface TeamMember {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: RoleState;
  activity: MemberActivity;
  isStreaming?: boolean;
}

interface FeedItem {
  id: string;
  type: ContentType;
  author: TeamMember;
  title?: string;
  body: string;
  media?: string;
  createdAt: number;
  hotScore: number;
  upvotes: number;
  downvotes: number;
  comments: number;
  isPinned?: boolean;
  isAnnouncement?: boolean;
  pollOptions?: { label: string; votes: number }[];
  topReplies?: { author: TeamMember; text: string }[];
}

interface ChatMessage {
  id: string;
  author: TeamMember;
  text: string;
  timestamp: number;
  reactions?: { emoji: string; count: number }[];
  isSystem?: boolean;
  replyTo?: string;
}

interface LiveRoom {
  id: string;
  host: TeamMember;
  title: string;
  viewers: number;
  thumbnail: string;
  isTeamRoom?: boolean;
}
```

### 1.2 Database Schema (COMPLETE)

Location: `supabase/migrations/20260102_zz_canonical_teams_backend.sql`

**Tables:**
- `teams` - Team metadata (name, slug, tag, description, icon, banner, theme, member counts)
- `team_memberships` - Member status/role (requested/approved/rejected/banned/left)
- `team_bans` - Ban records with expiry
- `team_mutes` - Mute records with scope (team_chat/team_live_chat/all)
- `team_permissions` - Per-member permission overrides
- `team_feed_posts` - Posts with text, media, pinned state, reaction/comment counts
- `team_feed_comments` - Nested comments on posts
- `team_feed_reactions` - Like reactions on posts
- `team_threads` - Forum threads with title, body, reply count
- `team_thread_comments` - Thread replies
- `team_assets` - Uploaded assets (icon/banner/emote/media)
- `team_emotes` - Custom team emotes
- `team_live_rooms` - Live streams linked to teams

**Enums:**
- `team_member_role`: 'Team_Admin' | 'Team_Moderator' | 'Team_Member'
- `team_membership_status`: 'requested' | 'approved' | 'rejected' | 'banned' | 'left'

**Helper Functions:**
- `is_team_approved_member(team_id, profile_id)` → boolean
- `team_role(team_id, profile_id)` → team_member_role
- `team_can_moderate(team_id, profile_id)` → boolean
- `is_team_banned(team_id, profile_id)` → boolean
- `is_team_muted(team_id, profile_id, stream_id)` → boolean

**RPC Functions:**
- `rpc_create_team(...)` → Create team + auto-join as admin
- `rpc_request_join_team(slug)` → Request membership
- `rpc_approve_member(team_id, profile_id)` → Approve request
- `rpc_reject_member(team_id, profile_id)` → Reject request
- `rpc_set_member_role(team_id, profile_id, role)` → Change role
- `rpc_get_team_home(slug)` → Team dashboard data
- `rpc_get_team_feed(slug, limit, cursor)` → Paginated feed
- `rpc_create_team_post(slug, text, media)` → Create post
- `rpc_create_team_comment(post_id, text, parent_id)` → Create comment
- `rpc_react_team_post(post_id, type)` → Toggle reaction
- `rpc_get_team_members(slug, status, role, search, limit)` → Member roster
- `rpc_get_team_live_rooms(slug)` → Active live streams

### 1.3 Presence System (COMPLETE)

Location: `supabase/migrations/20260103_team_presence_model.sql`

**Tables:**
- `team_presence_events` - Heartbeat records (team_id, member_id, source, expires_at)
- `team_presence_snapshots` - Snapshot stability for gift distribution

**RPC Functions:**
- `rpc_upsert_team_presence(team_id, member_id, live_session_id, source)` → Heartbeat
- `rpc_get_active_team_members(team_id, live_session_id, min_weight, snapshot_tx_id)` → Active members
- `rpc_get_presence_summary(team_id)` → Counts (NOT for financial decisions)

---

## 2. WORK REQUIRED

### 2.1 Create React Hooks for Data Fetching

**File to create:** `hooks/useTeam.ts`

```typescript
// Hooks needed:
export function useTeam(slug: string) // Fetches team home data
export function useTeamMembership(teamId: string) // Current user's membership
export function useTeamFeed(teamId: string, sort: FeedSort) // Paginated feed
export function useTeamMembers(teamId: string, filter: MemberFilter) // Roster
export function useTeamLiveRooms(teamId: string) // Active streams
export function useTeamPresence(teamId: string) // Online/live counts
```

**Implementation pattern:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useTeam(slug: string) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ['team', slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_get_team_home', { p_team_slug: slug });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePost(teamSlug: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ text, mediaUrl }: { text: string; mediaUrl?: string }) => {
      const { data, error } = await supabase.rpc('rpc_create_team_post', {
        p_team_slug: teamSlug,
        p_text_content: text,
        p_media_url: mediaUrl,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-feed', teamSlug] });
    },
  });
}
```

### 2.2 Wire UI Components to Hooks

**Replace mock data with real queries in:**
- `HomeScreen` → `useTeam(slug)`, `useTeamPresence(teamId)`, `useTeamFeed(teamId, 'hot')`
- `FeedScreen` → `useTeamFeed(teamId, sort)`, `useCreatePost(slug)`
- `MembersScreen` → `useTeamMembers(teamId, filter)`
- `LiveScreen` → `useTeamLiveRooms(teamId)`
- `SettingsScreen` → `useTeam(slug)`, update mutations

### 2.3 Implement Team Chat (NEW WORK REQUIRED)

**Database additions needed:**

```sql
CREATE TABLE public.team_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  reply_to_id uuid REFERENCES public.team_chat_messages(id) ON DELETE SET NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_chat_messages_team_created 
  ON public.team_chat_messages(team_id, created_at DESC);

CREATE TABLE public.team_chat_reactions (
  message_id uuid NOT NULL REFERENCES public.team_chat_messages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, profile_id, emoji)
);
```

**RPC functions needed:**
```sql
rpc_get_team_chat(team_slug, limit, before_id) -- Paginated messages
rpc_send_team_chat(team_slug, text, reply_to_id) -- Send message
rpc_react_team_chat(message_id, emoji) -- Toggle reaction
```

**Real-time subscription:**
```typescript
// Subscribe to new messages
const channel = supabase
  .channel(`team_chat:${teamId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'team_chat_messages',
    filter: `team_id=eq.${teamId}`,
  }, handleNewMessage)
  .subscribe();
```

### 2.4 Implement Presence Heartbeat

**Client-side heartbeat:**
```typescript
// In useTeamPresence hook
useEffect(() => {
  if (!teamId || !userId) return;
  
  const heartbeat = async () => {
    await supabase.rpc('rpc_upsert_team_presence', {
      p_team_id: teamId,
      p_member_id: userId,
      p_source: 'web',
    });
  };
  
  heartbeat(); // Initial
  const interval = setInterval(heartbeat, 30000); // Every 30s
  
  return () => clearInterval(interval);
}, [teamId, userId]);
```

**Real-time presence updates:**
```typescript
// Subscribe to presence changes
const channel = supabase
  .channel(`team_presence:${teamId}`)
  .on('presence', { event: 'sync' }, handlePresenceSync)
  .subscribe();
```

### 2.5 Create Team Page Route

**File to create:** `app/teams/[slug]/page.tsx`

```typescript
'use client';

import { useParams } from 'next/navigation';
import { useTeam, useTeamMembership } from '@/hooks/useTeam';
import TeamsSandboxPage from '../sandbox/page'; // Reuse UI

export default function TeamPage() {
  const { slug } = useParams();
  const { data: team, isLoading } = useTeam(slug as string);
  const { data: membership } = useTeamMembership(team?.team?.id);
  
  if (isLoading) return <TeamSkeleton />;
  if (!team) return <TeamNotFound />;
  
  // Pass real data to UI components
  return <TeamUI team={team} membership={membership} />;
}
```

### 2.6 Implement Thread Voting System

**Database additions needed:**

```sql
CREATE TABLE public.team_thread_votes (
  thread_id uuid NOT NULL REFERENCES public.team_threads(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type smallint NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, profile_id)
);

-- Add vote columns to threads
ALTER TABLE public.team_threads 
  ADD COLUMN IF NOT EXISTS upvote_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvote_count int NOT NULL DEFAULT 0;

-- RPC for voting
CREATE FUNCTION rpc_vote_team_thread(thread_id, vote_type) ...
```

### 2.7 Implement Polls

**Database additions needed:**

```sql
CREATE TABLE public.team_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.team_polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  vote_count int NOT NULL DEFAULT 0,
  position smallint NOT NULL DEFAULT 0
);

CREATE TABLE public.team_poll_votes (
  poll_id uuid NOT NULL REFERENCES public.team_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.team_poll_options(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, profile_id)
);
```

### 2.8 Role Mapping

**UI Role → Database Role:**
| UI Role | Database Role |
|---------|---------------|
| `leader` | `Team_Admin` |
| `core` | `Team_Moderator` |
| `member` | `Team_Member` |
| `guest` | (not a member / requested) |

### 2.9 Storage Buckets

**Create Supabase storage buckets:**
```sql
-- In Supabase dashboard or migration
INSERT INTO storage.buckets (id, name, public) VALUES
  ('team-icons', 'team-icons', true),
  ('team-banners', 'team-banners', true),
  ('team-media', 'team-media', true),
  ('team-emotes', 'team-emotes', true);
```

**Upload handlers:**
```typescript
async function uploadTeamIcon(teamId: string, file: File) {
  const path = `${teamId}/icon-${Date.now()}.${file.type.split('/')[1]}`;
  const { data, error } = await supabase.storage
    .from('team-icons')
    .upload(path, file);
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('team-icons')
    .getPublicUrl(path);
  
  // Update team record
  await supabase.from('teams').update({ icon_url: publicUrl }).eq('id', teamId);
  
  return publicUrl;
}
```

---

## 3. IMPLEMENTATION ORDER

### Phase 1: Core Data Layer (1-2 days)
1. Create `hooks/useTeam.ts` with all query hooks
2. Wire `HomeScreen` to real data
3. Wire `FeedScreen` to real data
4. Wire `MembersScreen` to real data
5. Create `app/teams/[slug]/page.tsx` route

### Phase 2: Interactivity (1-2 days)
1. Implement post creation mutation
2. Implement reaction mutations
3. Implement comment mutations
4. Implement join/leave team flow
5. Wire settings mutations

### Phase 3: Chat System (2-3 days)
1. Create chat tables migration
2. Create chat RPC functions
3. Implement real-time message subscription
4. Wire chat UI to real data
5. Implement reactions on messages

### Phase 4: Presence System (1 day)
1. Implement client-side heartbeat
2. Wire presence summary to UI
3. Show online/live counts in header
4. Show streaming badges on members

### Phase 5: Advanced Features (2-3 days)
1. Implement thread voting
2. Implement polls
3. Implement media uploads
4. Implement team creation flow
5. Implement moderation tools

### Phase 6: Polish (1-2 days)
1. Loading states and skeletons
2. Error handling
3. Optimistic updates
4. Offline support
5. Mobile testing

---

## 4. TESTING CHECKLIST

### Authentication
- [ ] Only authenticated users can view team content
- [ ] Only approved members can post/comment/react
- [ ] Only Leader/Core can access settings
- [ ] Banned users cannot interact
- [ ] Muted users cannot chat

### Feed
- [ ] Posts paginate correctly
- [ ] Hot/New/Top sorting works
- [ ] Pinned posts show first
- [ ] Reactions update in real-time
- [ ] Comments load correctly

### Chat
- [ ] Messages appear in real-time
- [ ] Reactions work
- [ ] Reply threads work
- [ ] System messages appear (went live, joined, etc.)
- [ ] Jump to live works

### Live
- [ ] Live rooms show correctly
- [ ] Viewer counts update
- [ ] Go Live creates room linked to team
- [ ] Team context persists in live room

### Members
- [ ] Roster loads with correct roles
- [ ] Search works
- [ ] Filter by status works
- [ ] Presence indicators accurate

### Settings
- [ ] Only accessible to Leader/Core
- [ ] Team profile updates save
- [ ] Invite link/code work
- [ ] Moderation tools work

---

## 5. ENVIRONMENT VARIABLES

Ensure these are set:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # For admin operations
```

---

## 6. FILES TO CREATE/MODIFY

### New Files:
- `hooks/useTeam.ts` - All team-related hooks
- `hooks/useTeamChat.ts` - Chat-specific hooks
- `app/teams/[slug]/page.tsx` - Dynamic team route
- `app/teams/[slug]/layout.tsx` - Team layout with nav
- `supabase/migrations/YYYYMMDD_team_chat.sql` - Chat tables
- `supabase/migrations/YYYYMMDD_team_polls.sql` - Poll tables
- `supabase/migrations/YYYYMMDD_team_thread_votes.sql` - Voting tables

### Modify:
- `app/teams/sandbox/page.tsx` - Replace mock data with hooks
- `next.config.js` - Already has image domains configured

---

## 7. NOTES FOR BACKEND DEVELOPER

1. **RLS is already configured** - All tables have row-level security policies. Test with actual user tokens.

2. **Membership status flow:**
   - User calls `rpc_request_join_team(slug)` → status = 'requested'
   - Admin calls `rpc_approve_member(team_id, profile_id)` → status = 'approved'
   - Or admin calls `rpc_reject_member(...)` → status = 'rejected'
   - User calls update with status = 'left' → leaves team

3. **One team per creator** - Enforced by unique index on `teams.created_by`

4. **Hot score calculation** - Currently not implemented. Need to add:
   - Time decay function
   - Engagement weight (reactions + comments)
   - Consider cron job to recalculate

5. **Chat system messages** - Need triggers to insert system messages when:
   - Member joins team
   - Member goes live
   - Team levels up
   - Announcement is posted

6. **Presence expiry** - Events expire after 60 seconds. Client must heartbeat every 30s.

---

## 8. QUICK START FOR DEVELOPER

```bash
# 1. Run pending migrations
cd supabase && supabase db push

# 2. Create test team
# Login as user, then call:
# supabase.rpc('rpc_create_team', { p_name: 'Test Team', p_slug: 'test-team', p_team_tag: 'TEST' })

# 3. Start dev server
npm run dev

# 4. Navigate to /teams/test-team (once route is created)
# Or use /teams/sandbox for UI-only testing
```

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Author:** AI Assistant
