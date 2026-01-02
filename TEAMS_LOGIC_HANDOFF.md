# Teams Feature — Logic Agent Handoff

## Overview

The Teams feature is a Discord/Patreon-style premium community system. The **UI is complete**. This document explains the routing, architecture, and what backend logic needs to be hooked up.

---

## 1. Routing Structure

```
/teams                           → TeamsIndexPage (discovery/redirect)
/teams/setup                     → TeamsSetupPage (onboarding, create team)
/teams/[slug]                    → TeamPage (main team page with surfaces)
/teams/[slug]/admin              → TeamAdminPage (admin panel for leaders)
/teams/sandbox                   → UI sandbox/preview (dev only)
/teams/preview                   → Static preview page (dev only)
```

### Key Routing Logic

| Route | File | Behavior |
|-------|------|----------|
| `/teams` | `app/teams/page.tsx` | Checks `localStorage` for `mylivelinks_teams_onboarding_completed`. If false → redirect to `/teams/setup`. If true → checks if user has a team membership → redirects to `/teams/[slug]`. Falls back to discovery page. |
| `/teams/setup` | `app/teams/setup/page.tsx` | Two-step flow: (1) Create Team form, (2) Invite Friends. Calls `rpc_create_team`. Sets `localStorage` flag on completion. |
| `/teams/[slug]` | `app/teams/[slug]/page.tsx` + `TeamPageContent.tsx` | Uses `TeamContext` provider. Fetches team data via `rpc_get_team_home`. Has 6 surfaces: Home, Feed, Chat, Live, Members, Settings. |
| `/teams/[slug]/admin` | `app/teams/[slug]/admin/page.tsx` | Admin panel for managing members, moderation, settings. Requires `Team_Admin` role. |

---

## 2. Context & State Management

### TeamContext (`contexts/TeamContext.tsx`)

The central state provider for team pages. Wraps `/teams/[slug]/*`.

**Key State:**
```typescript
interface TeamContextValue {
  teamId: string | null;
  teamSlug: string | null;
  team: TeamData | null;
  membership: Membership | null;
  permissions: TeamPermissions;
  presence: PresenceSummary;
  currentSurface: Surface;  // 'home' | 'feed' | 'chat' | 'live' | 'members' | 'settings'
  uiRole: UIRole;           // 'leader' | 'core' | 'member' | 'guest'
  isLoading: boolean;
  isError: boolean;
}
```

**Permissions are derived from membership:**
- `Team_Admin` → leader (canModerate, canAccessSettings)
- `Team_Moderator` → core (canModerate)
- `Team_Member` → member (canPost, canComment, canReact, canStartLive)
- Not approved/no membership → guest (read-only)

---

## 3. Data Hooks (`hooks/useTeam.ts`)

All data fetching uses these hooks. They call Supabase RPC functions.

| Hook | RPC Function | Description | Status |
|------|--------------|-------------|--------|
| `useTeam(slug)` | `rpc_get_team_home` | Fetches team details + viewer state | ✅ HOOKED UP |
| `useTeamMembership(teamId)` | Direct query + `is_team_banned`, `is_team_muted` | Current user's membership | ✅ HOOKED UP |
| `useTeamFeed(teamId, sort)` | `rpc_get_team_feed` | Paginated feed posts | ✅ HOOKED UP |
| `useTeamMembers(teamId, filter)` | `rpc_get_team_members` | Member roster | ✅ HOOKED UP |
| `useTeamPresence(teamId)` | `rpc_get_presence_summary` | Online/live counts | ✅ HOOKED UP |
| `useTeamLiveRooms(teamId)` | `rpc_get_team_live_rooms` | Active streams | ✅ HOOKED UP |
| `useTeamChat(teamId)` | **NOT IMPLEMENTED** | Team chat messages | ❌ NEEDS WORK |

### Mutation Hooks

| Hook | RPC Function | Description | Status |
|------|--------------|-------------|--------|
| `useCreatePost(teamSlug)` | `rpc_create_team_post` | Create feed post | ✅ HOOKED UP |
| `useReactToPost(teamId)` | `rpc_react_team_post` | Like/react to post | ✅ HOOKED UP |
| `useJoinTeam()` | `rpc_request_join_team` | Request to join | ✅ HOOKED UP |
| `useLeaveTeam(teamId)` | Direct update to `team_memberships` | Leave team | ✅ HOOKED UP |

---

## 4. Required Backend RPC Functions

These are defined in migration files under `supabase/migrations/`:

### Core Team RPCs (20260102_zz_canonical_teams_backend.sql)
- `rpc_create_team(p_name, p_slug, p_team_tag, p_description)` → Creates team + auto-joins creator as Team_Admin
- `rpc_get_team_home(p_team_slug)` → Returns team data + viewer state
- `rpc_request_join_team(p_team_slug)` → Request membership
- `rpc_get_team_members(p_team_slug, p_status, p_role, p_search, p_limit)` → Member roster
- `rpc_get_team_feed(p_team_slug, p_limit, p_before_created_at, p_before_id)` → Paginated feed
- `rpc_create_team_post(p_team_slug, p_text_content, p_media_url)` → Create post
- `rpc_react_team_post(p_post_id, p_reaction_type)` → React to post

### Live Rooms (20260102_team_live_rooms_backend.sql)
- `rpc_get_team_live_rooms(p_team_slug)` → Active streams by team members

### Presence (20260103_team_presence_model.sql)
- `rpc_get_presence_summary(p_team_id)` → Online/live counts
- `rpc_update_team_presence(p_team_id, p_source)` → Update heartbeat

### Team Invites (20260104_team_invites.sql)
- `rpc_send_team_invite(p_team_id, p_invitee_id, p_message)` → Send invite + notification
- `rpc_accept_team_invite(p_invite_id)` → Accept + auto-join
- `rpc_decline_team_invite(p_invite_id)` → Decline
- `rpc_get_my_team_invites()` → Get pending invites

### Moderation (in teams backend)
- `is_team_banned(p_team_id, p_profile_id)` → Check if banned
- `is_team_muted(p_team_id, p_profile_id, p_stream_id)` → Check if muted

---

## 5. Surfaces (Tabs) in TeamPageContent

The team page has 6 surfaces/tabs. Each is a separate component:

### 5.1 Home (`HomeScreen`)
**Status: ✅ UI complete, data hooked up**

Shows:
- Presence avatars (live/online members)
- Pinned announcements
- Recent feed posts
- Active live rooms

### 5.2 Feed (`FeedScreen`)
**Status: ✅ UI complete, data hooked up**

- Post creation (text + media)
- Post sorting (Hot/New/Top)
- Like/react to posts
- Pinned posts at top

**Calls:** `useTeamFeed()`, `useCreatePost()`, `useReactToPost()`

### 5.3 Chat (`ChatScreen`)
**Status: ⚠️ UI complete, data NOT hooked up**

- Real-time team chat
- Message reactions
- Reply threading

**NEEDS:**
1. Create `team_chat_messages` table
2. Create `rpc_get_team_chat_messages(p_team_id, p_limit, p_before)` RPC
3. Create `rpc_send_team_chat_message(p_team_id, p_content)` RPC
4. Wire up realtime subscription for new messages
5. Update `useTeamChat()` hook to call these

### 5.4 Live (`LiveScreen`)
**Status: ⚠️ UI complete, Go Live NOT hooked up**

Shows:
- "Go Live" CTA button
- Grid of active live streams

**NEEDS:**
1. "Go Live" button should open the existing live streaming flow
2. When going live, associate the stream with the team via `team_id` column on `live_streams`
3. Show "Coming Soon" popup for now (see below)

**COMING SOON PLACEHOLDER:**
Make the "Go Live" button show an alert/modal:
```tsx
<Button onClick={() => alert('Coming Soon! Team Live will be available shortly.')}>
  Go Live
</Button>
```

### 5.5 Members (`MembersScreen`)
**Status: ✅ UI complete, data hooked up**

Shows member roster with:
- Search
- Role badges (Leader, Core, Member)
- Online/Live status indicators

**Calls:** `useTeamMembers()`

### 5.6 Settings (`SettingsScreen`)
**Status: ⚠️ UI complete, some features not hooked up**

Shows:
- Team branding (banner/icon upload) → ✅ hooked up via `uploadTeamAsset()`
- Team URL editing → ✅ hooked up
- Notifications toggles → ❌ NOT hooked up (UI only)
- Privacy settings → ❌ NOT hooked up (UI only)
- Leave Team → ❌ Need to confirm and hook up

---

## 6. Invite System

**Status: ✅ Fully implemented**

### Flow:
1. Team member clicks "Invite Members" from header menu
2. Modal shows followers who aren't in the team
3. Click "Invite" → calls `rpc_send_team_invite()`
4. Invitee sees notification in their Noties
5. Notification has Accept/Decline buttons
6. Accept → `rpc_accept_team_invite()` → joins team → redirect to team page

**Files:**
- `lib/teamInvites.ts` — Frontend API
- `components/noties/NotiesContext.tsx` — Loads team invite notifications
- `components/noties/NotiesModal.tsx` — Renders Accept/Decline buttons
- `app/teams/[slug]/TeamPageContent.tsx` — `InviteMembersModal` component

---

## 7. Storage (Team Assets)

**Status: ⚠️ Code complete, bucket needs creation**

**Bucket name:** `team-assets`

**Files:**
- `lib/teamAssets.ts` — Upload functions
- Migration: `supabase/migrations/20260104_team_assets_storage.sql`

**Structure:**
```
team-assets/
├── icons/{team_id}.jpg
└── banners/{team_id}.jpg
```

---

## 8. What Needs to Be Done

### HIGH PRIORITY

1. **Team Chat** — Create tables and RPCs, wire up `useTeamChat()` hook
2. **Go Live** — Show "Coming Soon" popup OR wire up to existing live system

### MEDIUM PRIORITY

3. **Settings Toggles** — Hook up notification preferences and privacy settings
4. **Leave Team** — Add confirmation modal, call `useLeaveTeam()`
5. **Admin Panel** — Review and hook up all admin actions

### LOW PRIORITY

6. **Presence Heartbeat** — Call `rpc_update_team_presence()` periodically while on team pages
7. **Realtime Subscriptions** — Add realtime updates for feed, members, live rooms

---

## 9. Database Tables

Key tables in the teams system:

| Table | Purpose |
|-------|---------|
| `teams` | Team metadata (name, slug, tag, description, icon_url, banner_url, etc.) |
| `team_memberships` | Links profiles to teams with role and status |
| `team_posts` | Feed posts within a team |
| `team_post_reactions` | Likes/reactions on posts |
| `team_invites` | Pending team invitations |
| `team_presence` | Online/active tracking |
| `team_live_rooms` | View associating live_streams with teams |
| `notifications` | System notifications (includes team_invite type) |

---

## 10. Quick Reference: File Locations

| Purpose | File |
|---------|------|
| Main team page UI | `app/teams/[slug]/TeamPageContent.tsx` |
| Team context provider | `contexts/TeamContext.tsx` |
| Data hooks | `hooks/useTeam.ts` |
| Team setup/onboarding | `app/teams/setup/page.tsx` |
| Team discovery | `app/teams/page.tsx` |
| Invite system | `lib/teamInvites.ts` |
| Asset upload | `lib/teamAssets.ts` |
| Admin panel | `app/teams/[slug]/admin/page.tsx` |
| Notifications context | `components/noties/NotiesContext.tsx` |
| Notifications modal | `components/noties/NotiesModal.tsx` |

---

## 11. Go Live Coming Soon Implementation

Replace the "Go Live" button in `LiveScreen` with a coming soon popup:

```tsx
// In app/teams/[slug]/TeamPageContent.tsx, find LiveScreen component

const [showComingSoon, setShowComingSoon] = useState(false);

// Replace the Button:
<Button 
  onClick={() => setShowComingSoon(true)}
  className="bg-gradient-to-r from-red-500 to-pink-500 text-white"
>
  Go Live
</Button>

// Add modal:
{showComingSoon && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="rounded-2xl bg-[#1a1a24] border border-white/10 p-6 max-w-sm mx-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20">
        <Video className="h-8 w-8 text-pink-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Coming Soon!</h3>
      <p className="text-sm text-white/60 mb-4">
        Team Live streaming is launching soon. Stay tuned for updates!
      </p>
      <Button onClick={() => setShowComingSoon(false)} className="w-full">
        Got it
      </Button>
    </div>
  </div>
)}
```

---

## Summary

The Teams UI is **complete**. The logic agent needs to:

1. ✅ Verify all RPC functions exist and work
2. ⚠️ Implement Team Chat (tables + RPCs + hook)
3. ⚠️ Add "Coming Soon" popup for Go Live
4. ⚠️ Wire up Settings toggles
5. ⚠️ Create the `team-assets` storage bucket

All routing and state management is in place. The hooks abstract the RPC calls, so the logic agent just needs to ensure the backend functions exist and return the expected shapes.
