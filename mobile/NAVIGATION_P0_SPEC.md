# Mobile Navigation P0 Implementation Spec

**Date:** December 26, 2025  
**Agent:** Mobile Navigation & Routing Alignment Agent  
**Status:** SPEC READY FOR IMPLEMENTATION

---

## A) Navigation Structure

### Route 1: AuthScreen (Login)

**Purpose:** Authenticate user via Supabase

**What it does:**
- Displays email/password login form
- Calls Supabase `signInWithPassword()` or `signUp()`
- Stores session token in SecureStore
- Handles auth errors with user feedback

**Data required:**
- None (entry point)

**Navigation triggers:**
- SUCCESS + profile complete → `HomeDashboard`
- SUCCESS + no profile/incomplete → `CreateProfile`
- FAILURE → Stay on AuthScreen, show error

**File:** `mobile/screens/AuthScreen.tsx` (NEW)

---

### Route 2: CreateProfile (Onboarding)

**Purpose:** Collect required profile data before app access

**What it does:**
- Collects username (required, 4+ chars)
- Collects date of birth (required, 13+ years)
- Calculates age for 18+ gating
- Upserts profile to Supabase `profiles` table
- Sets `adult_verified_at` if 18+

**Data required:**
- Authenticated session (from AuthScreen)
- User ID from session

**Navigation triggers:**
- SUCCESS (profile saved) → `HomeDashboard`
- BACK/LOGOUT → `AuthScreen`

**File:** `mobile/screens/CreateProfileScreen.tsx` (NEW)

---

### Route 3: HomeDashboard (Default Post-Login)

**Purpose:** Main landing screen after authentication

**What it does:**
- Displays welcome message
- Shows user's username/avatar
- Provides navigation options (Live, Profile, Settings)
- **Does NOT mount LiveRoomScreen or any LiveKit components**

**Data required:**
- Authenticated session
- Profile data (username, avatar_url)

**Navigation triggers:**
- TAP "Enter Live" button → `LiveRoom` (only if enabled)
- TAP Profile → `ProfileSettings`
- TAP Logout → Clear session → `AuthScreen`

**File:** `mobile/screens/HomeDashboardScreen.tsx` (NEW)

---

### Route 4: LiveRoom (Explicit Access Only)

**Purpose:** Live streaming experience

**What it does:**
- Mounts existing `LiveRoomScreen` component
- Passes `enabled={true}` ONLY when this screen is active
- Connects to LiveKit room

**Data required:**
- Authenticated session
- Complete profile
- Explicit user navigation action

**Navigation triggers:**
- BACK button → `HomeDashboard` (disconnects from LiveKit)
- Session expires → `AuthScreen`

**File:** `mobile/screens/LiveRoomScreen.tsx` (EXISTING - wrapper changes only)

**Gate:** This route is LOCKED unless:
1. Session exists
2. Profile complete
3. User explicitly tapped "Enter Live"

---

### Route 5: ProfileSettings (Optional)

**Purpose:** View/edit profile settings

**What it does:**
- Display current profile info
- Allow bio/display_name edits
- Show wallet balance (optional)
- Logout button

**Data required:**
- Authenticated session
- Profile data

**Navigation triggers:**
- BACK → `HomeDashboard`
- LOGOUT → `AuthScreen`

**File:** `mobile/screens/ProfileSettingsScreen.tsx` (NEW, optional for MVP)

---

### Navigation State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                        APP LAUNCH                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Check Session  │
                    └─────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
       NO SESSION                       HAS SESSION
              │                               │
              ▼                               ▼
       ┌────────────┐               ┌─────────────────┐
       │ AuthScreen │               │  Check Profile  │
       └────────────┘               └─────────────────┘
              │                               │
              │                 ┌─────────────┴─────────────┐
              │                 │                           │
              │                 ▼                           ▼
              │          NO PROFILE                  HAS PROFILE
              │                 │                           │
              │                 ▼                           ▼
              │        ┌──────────────┐            ┌─────────────────┐
              │        │CreateProfile │            │  HomeDashboard  │
              │        └──────────────┘            └─────────────────┘
              │                 │                           │
              │                 │                           │
              └─────────────────┴───────────────────────────┘
                                        │
                                        │ User taps "Enter Live"
                                        ▼
                                ┌─────────────┐
                                │  LiveRoom   │
                                └─────────────┘
```

---

## B) Gate Logic (P0)

### Gate Check Order

Execute these checks sequentially at app launch and on relevant state changes:

```
GATE 1: Session Check
├── Source: SecureStore.getItemAsync('supabase_session')
├── PASS: Session exists and not expired
├── FAIL: Navigate to AuthScreen
└── File: mobile/hooks/useAuth.ts (NEW)

GATE 2: Profile Exists Check
├── Source: Supabase query profiles.select().eq('id', userId).maybeSingle()
├── PASS: Profile row exists
├── FAIL: Navigate to CreateProfile
└── File: mobile/hooks/useProfile.ts (NEW)

GATE 3: Profile Complete Check
├── Source: profile.username && profile.date_of_birth
├── PASS: Both fields non-null
├── FAIL: Navigate to CreateProfile
└── File: mobile/hooks/useProfile.ts (NEW)

GATE 4: Live Access Check (for LiveRoom route only)
├── Source: Explicit user action (button tap sets state)
├── PASS: User navigated via button + Gates 1-3 passed
├── FAIL: Stay on HomeDashboard
└── File: mobile/screens/HomeDashboardScreen.tsx
```

### Gate Implementation Location

| Gate | Where to Check | When to Check |
|------|----------------|---------------|
| Session | `App.tsx` or `useAuth` hook | App launch, auth state change |
| Profile Exists | `useProfile` hook | After session confirmed |
| Profile Complete | `useProfile` hook | After profile fetched |
| Live Access | `HomeDashboardScreen` | On "Enter Live" button tap |

### Gate Data Flow

```
App.tsx
  │
  ├─► useAuth() → returns { session, loading, user }
  │     │
  │     └─► if (!session) → render <AuthScreen />
  │
  └─► useProfile(user?.id) → returns { profile, loading, isComplete }
        │
        └─► if (!profile || !isComplete) → render <CreateProfileScreen />
        │
        └─► if (isComplete) → render <HomeDashboardScreen />
```

---

## C) LiveKit Auto-Connect Removal (P0)

### Current Problem

File: `mobile/hooks/useLiveRoomParticipants.ts`

```
Line 52: const { enabled = true } = options;  ← DEFAULT IS TRUE!
Line 222-375: useEffect with empty deps []   ← RUNS ON MOUNT!
Line 375: }, []);                            ← enabled NOT IN DEPS!
```

### Required Changes

#### Change 1: Default `enabled` to `false`

**File:** `mobile/hooks/useLiveRoomParticipants.ts`  
**Line:** 52

```typescript
// FROM:
const { enabled = true } = options;

// TO:
const { enabled = false } = options;
```

#### Change 2: Add `enabled` to useEffect deps

**File:** `mobile/hooks/useLiveRoomParticipants.ts`  
**Line:** 375

```typescript
// FROM:
}, []); // Empty deps - connect ONCE on mount

// TO:
}, [enabled]); // Only connect when enabled changes to true
```

#### Change 3: Early return if not enabled (reinforce)

**File:** `mobile/hooks/useLiveRoomParticipants.ts`  
**Lines:** 224-238

Ensure the guard is FIRST thing in useEffect and returns early:

```typescript
useEffect(() => {
  // GATE: Do not connect unless explicitly enabled
  if (!enabled) {
    console.log('[ROOM] Connection disabled - waiting for explicit enable');
    return;
  }
  
  // Guard: Only connect once
  if (hasConnectedRef.current || isConnectingRef.current) {
    return;
  }
  
  // ... rest of connection logic
}, [enabled]);
```

#### Change 4: Add disconnect on disable

**File:** `mobile/hooks/useLiveRoomParticipants.ts`  
**Inside useEffect, add cleanup on enabled change:**

```typescript
useEffect(() => {
  if (!enabled) {
    // Disconnect if we were connected and enabled becomes false
    if (roomRef.current) {
      console.log('[ROOM] Enabled changed to false - disconnecting');
      roomRef.current.disconnect();
      roomRef.current = null;
      hasConnectedRef.current = false;
      isConnectingRef.current = false;
      setIsConnected(false);
      setAllParticipants([]);
    }
    return;
  }
  
  // ... connection logic
}, [enabled]);
```

### Hidden Side Effects Check

| Location | Side Effect | Status |
|----------|-------------|--------|
| `useLiveRoomParticipants.ts:69-87` | SecureStore seed load | ✅ Safe (no LiveKit) |
| `useLiveRoomParticipants.ts:95-164` | `fetchToken()` | ✅ Only called inside guarded effect |
| `LiveRoomScreen.tsx:48` | Hook invocation | ⚠️ Must pass `enabled={false}` by default |
| `App.tsx:192` | `<LiveRoomScreen enabled={true} />` | 🔴 MUST CHANGE to conditional render |

### Final Architecture

```
HomeDashboardScreen
  │
  └─► Button: "Enter Live"
        │
        └─► setShowLive(true)  // State in App.tsx or nav
              │
              └─► {showLive && <LiveRoomScreen enabled={true} />}
                    │
                    └─► useLiveRoomParticipants({ enabled: true })
                          │
                          └─► NOW connects to LiveKit
```

---

## D) Immediate Hotfix vs Proper Fix

### Immediate Hotfix (Stop Crashes TODAY)

**Goal:** Prevent LiveKit auto-connect without full navigation refactor

#### Hotfix Patch 1: Disable connection by default

**File:** `mobile/hooks/useLiveRoomParticipants.ts`  
**Line 52:**
```typescript
const { enabled = false } = options;
```

#### Hotfix Patch 2: Add enabled to deps

**File:** `mobile/hooks/useLiveRoomParticipants.ts`  
**Line 375:**
```typescript
}, [enabled]);
```

#### Hotfix Patch 3: Pass enabled={false} from App.tsx

**File:** `mobile/App.tsx`  
**Line 192:**
```typescript
<LiveRoomScreen enabled={false} />
```

**Result:** App will launch, show fake login, show empty live room (no connection). Users see tiles but no video. Stable but not functional.

---

### Proper Fix (Full Navigation Implementation)

#### Phase 1: Auth Foundation

| # | Task | File | Priority |
|---|------|------|----------|
| 1.1 | Create Supabase client for mobile | `mobile/lib/supabase.ts` | P0 |
| 1.2 | Create useAuth hook (session management) | `mobile/hooks/useAuth.ts` | P0 |
| 1.3 | Create AuthScreen with real login | `mobile/screens/AuthScreen.tsx` | P0 |
| 1.4 | Add session persistence to SecureStore | `mobile/hooks/useAuth.ts` | P0 |

#### Phase 2: Profile Foundation

| # | Task | File | Priority |
|---|------|------|----------|
| 2.1 | Create useProfile hook | `mobile/hooks/useProfile.ts` | P0 |
| 2.2 | Create CreateProfileScreen | `mobile/screens/CreateProfileScreen.tsx` | P0 |
| 2.3 | Add profile completion check | `mobile/hooks/useProfile.ts` | P0 |

#### Phase 3: Navigation Structure

| # | Task | File | Priority |
|---|------|------|----------|
| 3.1 | Create HomeDashboardScreen | `mobile/screens/HomeDashboardScreen.tsx` | P0 |
| 3.2 | Refactor App.tsx with navigation state | `mobile/App.tsx` | P0 |
| 3.3 | Add "Enter Live" button with gate | `mobile/screens/HomeDashboardScreen.tsx` | P0 |
| 3.4 | Conditional render LiveRoomScreen | `mobile/App.tsx` | P0 |

#### Phase 4: LiveKit Fixes

| # | Task | File | Priority |
|---|------|------|----------|
| 4.1 | Default enabled to false | `mobile/hooks/useLiveRoomParticipants.ts` | P0 |
| 4.2 | Add enabled to useEffect deps | `mobile/hooks/useLiveRoomParticipants.ts` | P0 |
| 4.3 | Add disconnect on enabled=false | `mobile/hooks/useLiveRoomParticipants.ts` | P0 |
| 4.4 | Pass enabled only when user navigates | `mobile/App.tsx` | P0 |

#### Phase 5: Cleanup & Polish

| # | Task | File | Priority |
|---|------|------|----------|
| 5.1 | Remove fake login UI | `mobile/App.tsx` | P1 |
| 5.2 | Add loading states for gates | `mobile/App.tsx` | P1 |
| 5.3 | Add logout functionality | `mobile/screens/HomeDashboardScreen.tsx` | P1 |
| 5.4 | Add back button from LiveRoom | `mobile/screens/LiveRoomScreen.tsx` | P1 |

---

## E) Acceptance Criteria

### ✅ DONE when ALL of the following are true:

#### 1. App Launch Safety
- [ ] App can be cold-started without any network calls to LiveKit
- [ ] No tokens are fetched during app initialization
- [ ] Console shows NO `[ROOM]` or `[TOKEN]` logs on launch

#### 2. Authentication Gate
- [ ] Unauthenticated users see AuthScreen only
- [ ] Cannot navigate past AuthScreen without valid Supabase session
- [ ] Session persists across app restarts (SecureStore)

#### 3. Profile Gate
- [ ] Users without profile are redirected to CreateProfileScreen
- [ ] Users with incomplete profile (no username OR no DOB) go to CreateProfileScreen
- [ ] Profile data is saved to Supabase `profiles` table

#### 4. Home Dashboard
- [ ] HomeDashboard is the default destination after successful auth + profile
- [ ] HomeDashboard does NOT mount any LiveKit components
- [ ] HomeDashboard does NOT call `useLiveRoomParticipants`

#### 5. Live Room Access
- [ ] LiveRoom is only reachable via explicit "Enter Live" button
- [ ] Button is on HomeDashboard (or equivalent explicit navigation)
- [ ] `useLiveRoomParticipants` only called with `enabled={true}` when LiveRoom is active
- [ ] Navigating away from LiveRoom disconnects from LiveKit

#### 6. No Hidden Auto-Connect
- [ ] `useLiveRoomParticipants` default `enabled` is `false`
- [ ] `enabled` is in useEffect dependency array
- [ ] No other hooks/effects fetch LiveKit tokens
- [ ] No other hooks/effects call `room.connect()`

### Test Script

```
1. Fresh app install
2. Launch app → Should see AuthScreen, NO LiveKit logs
3. Enter invalid credentials → Should show error, stay on AuthScreen
4. Enter valid credentials → Should navigate based on profile state
5. If no profile → Should see CreateProfileScreen
6. Complete profile → Should navigate to HomeDashboard
7. On HomeDashboard → Should see home content, NO LiveKit logs
8. Tap "Enter Live" → Should navigate to LiveRoom, SEE LiveKit logs
9. Tap Back → Should return to HomeDashboard, LiveKit disconnects
10. Force-quit and reopen → Should go directly to HomeDashboard (session persisted)
```

---

## Summary Checklist

### Immediate Hotfix (3 changes)
- [ ] `useLiveRoomParticipants.ts:52` → `enabled = false`
- [ ] `useLiveRoomParticipants.ts:375` → `}, [enabled]);`
- [ ] `App.tsx:192` → `enabled={false}`

### Proper Fix (13 files)
- [ ] `mobile/lib/supabase.ts` (NEW)
- [ ] `mobile/hooks/useAuth.ts` (NEW)
- [ ] `mobile/hooks/useProfile.ts` (NEW)
- [ ] `mobile/screens/AuthScreen.tsx` (NEW)
- [ ] `mobile/screens/CreateProfileScreen.tsx` (NEW)
- [ ] `mobile/screens/HomeDashboardScreen.tsx` (NEW)
- [ ] `mobile/screens/ProfileSettingsScreen.tsx` (NEW, optional)
- [ ] `mobile/hooks/useLiveRoomParticipants.ts` (MODIFY)
- [ ] `mobile/screens/LiveRoomScreen.tsx` (MODIFY - add back button)
- [ ] `mobile/App.tsx` (MAJOR REFACTOR)

---

*Spec Complete - Ready for Implementation*



