# Teams Navigation & State Wiring — COMPLETE

**Agent**: Logic / Integration Agent  
**Task**: Wire Teams panels, state management, and navigation  
**Status**: ✅ COMPLETE

---

## A) NAVIGATION / STATE FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TEAM CONTEXT PROVIDER                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Source of Truth:                                                        ││
│  │  • teamId / teamSlug (canonical identifiers)                            ││
│  │  • team (cached TeamData)                                               ││
│  │  • membership (loaded once, reused)                                     ││
│  │  • permissions (derived from role + mute/ban status)                    ││
│  │  • presence (online/live counts, polled every 30s)                      ││
│  │  • currentSurface (active panel)                                        ││
│  │  • uiRole (leader | core | member | guest)                              ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     setSurface(panel) — ONE-TAP NAV                   │  │
│  │                      (No nested stacks, no refetch)                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│       ┌────────────┬───────────────┼───────────────┬───────────────┐        │
│       ▼            ▼               ▼               ▼               ▼        │
│  ┌─────────┐  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────┐  │
│  │  HOME   │  │  FEED   │    │  CHAT   │    │  LIVE   │    │  MEMBERS    │  │
│  └────┬────┘  └────┬────┘    └────┬────┘    └────┬────┘    └──────┬──────┘  │
│       │            │              │              │                │          │
│       └────────────┴──────────────┴──────────────┴────────────────┘          │
│                                    │                                        │
│                      ┌─────────────┴─────────────┐                          │
│                      ▼                           ▼                          │
│               ┌─────────────┐            ┌─────────────┐                    │
│               │  SETTINGS   │            │ DOCKED CHAT │                    │
│               │ (role-gated)│            │ (all panels)│                    │
│               └─────────────┘            └─────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘

DATA FLOW:
                         ┌──────────────────────────────────────┐
                         │      React Query Cache (TanStack)    │
                         │  ┌─────────────────────────────────┐ │
                         │  │ team:detail:${slug}             │ │  ← 5min stale
                         │  │ team:membership:${id}:${userId} │ │  ← 5min stale
                         │  │ team:feed:${id}:${sort}         │ │  ← 1min stale
                         │  │ team:members:${id}:${filter}    │ │  ← 2min stale
                         │  │ team:presence:${id}             │ │  ← 15s stale, 30s poll
                         │  │ team:liveRooms:${id}            │ │  ← 30s stale, 60s poll
                         │  └─────────────────────────────────┘ │
                         └──────────────────────────────────────┘
                                          ▲
                                          │ invalidate on mutations
                         ┌────────────────┼────────────────┐
                         │                │                │
                    useCreatePost    useReactToPost   useJoinTeam
```

---

## B) SOURCE OF TRUTH (ENFORCED)

| Data | Location | Loaded When | Reused By |
|------|----------|-------------|-----------|
| `teamId` / `teamSlug` | `TeamContext` | Route mount | All panels |
| `membership` | `TeamContext` + React Query | Once on team load | All panels, permission checks |
| `role` / `permissions` | Derived in `TeamContext` | On membership fetch | Nav tabs, action buttons, Settings gate |
| `presence` | `useTeamPresence` | 30s polling | Home, Members, Live counts |
| `feed` | `useTeamFeed` | Panel mount, cached | Home (preview), Feed |
| `liveRooms` | `useTeamLiveRooms` | Panel mount + realtime | Home, Live |
| `members` | `useTeamMembers` | Panel mount, cached | Home (strip), Members |

**NO DUPLICATE MEMBERSHIP QUERIES**: Membership is fetched once via `TeamContext` and shared with all panels via context. Individual hooks access cached data through React Query.

---

## C) SHARED HOOKS / STATE USED BY MULTIPLE PANELS

### Context Provider
- **`TeamContext`** (`contexts/TeamContext.tsx`)
  - Provides: `teamId`, `teamSlug`, `team`, `membership`, `permissions`, `presence`, `currentSurface`, `uiRole`
  - Used by: ALL panels

### Data Hooks (in `hooks/useTeam.ts`)

| Hook | Used By | Cache Key | Stale Time |
|------|---------|-----------|------------|
| `useTeam(slug)` | TeamContext, Settings | `team:detail:${slug}` | 5 min |
| `useTeamMembership(teamId)` | TeamContext, permission checks | `team:membership:${id}:${userId}` | 5 min |
| `useTeamFeed(teamId, sort)` | Home, Feed | `team:feed:${id}:${sort}` | 1 min |
| `useTeamMembers(teamId, filter)` | Home, Members | `team:members:${id}:${filter}` | 2 min |
| `useTeamPresence(teamId)` | Home, Members, Live | `team:presence:${id}` | 15s (polls 30s) |
| `useTeamLiveRooms(teamId)` | Home, Live | `team:liveRooms:${id}` | 30s (polls 60s) |
| `useTeamChat(teamId)` | Chat | realtime subscription | live |

### Mutation Hooks

| Hook | Invalidates | Used By |
|------|-------------|---------|
| `useCreatePost(teamSlug)` | `team:feed:*` | Feed composer |
| `useReactToPost(teamId)` | `team:feed:*` | Feed cards |
| `useJoinTeam()` | `team:*` | Join flow |
| `useLeaveTeam(teamId)` | `team:*` | Settings |

---

## D) LIVE PANEL CONNECTIONS

### When Team Member Goes Live:
1. `team_live_rooms` table gets INSERT via RPC
2. `useTeamLiveRooms` detects via realtime subscription
3. React Query invalidates `team:liveRooms:${teamId}`
4. **Home**: Live strip updates immediately
5. **Live panel**: Grid updates without refresh
6. **Presence**: `rpc_get_presence_summary` reflects new `live_session` source

### When User Taps Live Tile:
1. `navigateToLiveRoom(roomId)` called from context
2. Navigation preserves team context via `?team=${teamSlug}` param
3. Team chat remains accessible via docked bar or toggle

### Realtime Subscriptions:
```typescript
// Live rooms changes
supabase.channel(`team_live_rooms:${teamId}`)
  .on('postgres_changes', { event: '*', table: 'team_live_rooms' }, invalidate)

// Presence polling (every 30s) - more efficient than realtime for counts
setInterval(fetchPresence, 30000)
```

---

## E) SETTINGS & PERMISSIONS LOGIC

### Role Gating:
```typescript
// In TeamContext
const permissions = {
  canPost: !isMuted && membership?.status === 'approved',
  canComment: !isMuted && membership?.status === 'approved',
  canReact: !isMuted && membership?.status === 'approved',
  canStartLive: membership?.status === 'approved',
  canModerate: role === 'Team_Admin' || role === 'Team_Moderator',
  canAccessSettings: role === 'Team_Admin' || role === 'Team_Moderator',
  isMuted,
  isBanned,
};
```

### Settings Panel Visibility:
```tsx
// In navigation tabs
{permissions.canAccessSettings && (
  <NavTab label="Settings" onClick={() => setSurface('settings')} />
)}
```

### Muted Users:
- ✅ **Can read**: Feed, Chat, Members, Live (no content blocked)
- ❌ **Cannot post/chat**: Composer disabled, shows `MutedBanner`
- ❌ **Cannot react**: Heart button disabled

### Banned Users:
- ❌ **Cannot access ANY team panel**: Shown `BannedState` component
- Check happens at `TeamPageContent` before rendering

### Pending/Rejected Users:
- Shown as `guest` role
- Can view public team info only
- Cannot access member-only content (RLS enforces)

---

## F) ERROR & EMPTY STATES

### Implemented States:

| Condition | Component | Shown |
|-----------|-----------|-------|
| Team loading | `TeamSkeleton` | Spinner + "Loading team..." |
| Team not found | `TeamErrorState` | Alert icon + error message + retry |
| User banned | `BannedState` | Red alert + "Access Denied" |
| User muted | `MutedBanner` | Amber banner in composer areas |
| No one live | `EmptyState` | "No one is live" + Go Live CTA |
| No posts | `EmptyState` | "No posts yet" + Create Post CTA |
| No members found | `EmptyState` | "No members found" (filter result) |
| Network/RLS error | Graceful fallback | Empty arrays, no crash |

### Permission-Safe Fallbacks:
- Hooks return empty arrays on error (no throws to UI)
- React Query retry (2 attempts) before showing error
- Muted/banned checks happen BEFORE content render

---

## G) EDGE CASES HANDLED

| Edge Case | Handling |
|-----------|----------|
| User views team while not logged in | `userId = null`, guest permissions, join prompt |
| User's membership status changes while viewing | Realtime listener on `team_memberships` triggers refresh |
| Switching panels rapidly | State preserved in context, no refetch if cached |
| Opening live room from team | Team context preserved via URL param |
| User muted mid-session | Next poll catches mute, UI updates gracefully |
| User banned mid-session | Next poll catches ban, redirects to `BannedState` |
| No pending members for settings | Shows "0" with "Review" button (empty state) |
| Stale presence data | 30s polling + 15s stale time ensures freshness |
| Feed sort change | Cached per-sort, instant switch if visited before |
| Deep link to team panel | Route loads team, context restores `currentSurface` |

---

## H) FILES CREATED/MODIFIED

### New Files:
```
contexts/TeamContext.tsx          # Central state provider
hooks/useTeam.ts                  # All team data hooks + mutations
app/teams/[slug]/page.tsx         # Dynamic route entry
app/teams/[slug]/layout.tsx       # Metadata layout
app/teams/[slug]/TeamPageContent.tsx  # Main UI with all panels
```

### Modified Files:
```
hooks/index.ts                    # Export team hooks
```

---

## I) VERIFICATION CHECKLIST

### ✅ No Duplicate Fetches
- [x] Membership loaded once in `TeamContext`, not per-panel
- [x] React Query caches by `queryKey`, prevents duplicate requests
- [x] Presence polled at fixed interval, not per-component

### ✅ Permissions Enforced Consistently
- [x] Settings tab only visible for `leader`/`core`
- [x] Composer disabled for muted users
- [x] Banned users blocked at page level
- [x] RLS policies in DB are source of truth for data access

### ✅ Navigation Flow
- [x] One-tap between panels via `setSurface()`
- [x] No nested React Navigation stacks
- [x] Scroll state preserved (component not unmounted)
- [x] Docked chat accessible from all non-chat panels

### ✅ Realtime Updates
- [x] Live rooms: Postgres changes subscription
- [x] Presence: 30s polling (efficient for counts)
- [x] Feed: Invalidated on mutation, not subscribed

### ✅ Edge Cases
- [x] Loading/error/empty states for all panels
- [x] Banned/muted UI states
- [x] Guest (non-member) access flow

---

## J) QUICK START FOR TESTING

```bash
# 1. Navigate to teams index
/teams

# 2. Click "Open Premium Sandbox" to test UI-only
/teams/sandbox

# 3. Navigate to real team (once data exists)
/teams/{team-slug}

# Example: If you created a team with slug "my-team"
/teams/my-team
```

---

**Integration Complete** — Teams section now has tight, fast, intentional panel coordination with shared state and proper permission gating.
