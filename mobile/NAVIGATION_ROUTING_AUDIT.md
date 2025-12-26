# Mobile Navigation & Routing Alignment Audit

**Date:** December 26, 2025  
**Agent:** Mobile Navigation & Routing Alignment Agent  
**Status:** 🔴 CRITICAL ISSUES FOUND

---

## Executive Summary

The mobile app **DOES auto-join Live rooms immediately after login** - violating the critical directive. The current mobile flow completely bypasses the intended navigation structure and connects to LiveKit the moment the user clicks "Enter Live Room" on a fake login screen.

---

## Flow Comparison

### ✅ Web Flow (Correct - Target)

```
App Launch
    ↓
Auth Check (middleware.ts)
    ↓
┌─────────────────────────────────────────┐
│ Not logged in?        → /login          │
│ Logged in, no profile → /onboarding     │
│ Profile complete      → / (Home)        │
└─────────────────────────────────────────┘
    ↓
Home Dashboard (/)
    ↓
User explicitly navigates to /live
    ↓
canAccessLive() gate check
    ↓
LiveRoom component (only now connects to LiveKit)
```

### 🔴 Mobile Flow (Current - BROKEN)

```
App Launch
    ↓
Splash Animation
    ↓
"Login" Screen (FAKE - no actual auth!)
    ↓
User clicks "Enter Live Room" button
    ↓
LiveRoomScreen mounts immediately
    ↓
⚠️ AUTO-CONNECTS TO LIVEKIT ⚠️
```

---

## P0 Crash-Causing / Critical Flows

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| **P0-1** | **No real authentication** - Email/password inputs are purely cosmetic. No Supabase auth, no session management. | `App.tsx:134-150` | 🔴 CRITICAL |
| **P0-2** | **No profile check/creation** - Web requires username + DOB before home access. Mobile skips entirely. | `App.tsx` (missing) | 🔴 CRITICAL |
| **P0-3** | **Auto-connects to LiveKit on mount** - `useLiveRoomParticipants` connects immediately when `enabled=true` (default). | `useLiveRoomParticipants.ts:222-375` | 🔴 CRITICAL |
| **P0-4** | **No Home Dashboard** - Mobile goes directly from fake login → live room. No intermediate navigation. | `App.tsx:118-179` | 🔴 CRITICAL |
| **P0-5** | **Token fetched automatically** - LiveKit token is requested without user consent/explicit action. | `useLiveRoomParticipants.ts:95-164, 256` | 🔴 CRITICAL |

---

## Routing Mismatches

### 1. Authentication Flow

| Aspect | Web | Mobile |
|--------|-----|--------|
| Auth Provider | Supabase Auth | ❌ NONE |
| Session Management | Cookie-based with middleware refresh | ❌ NONE |
| Login Redirect | `/login` with `returnUrl` support | N/A |
| Protected Routes | Auth check in each page | ❌ NONE |

**Code Evidence (Mobile App.tsx:151-159):**
```typescript
<TouchableOpacity
  style={styles.loginButton}
  onPress={() => {
    console.log('[NAV] User entering Live Room');
    setShowLiveRoom(true);  // ← No auth check, just state change
  }}
>
  <Text style={styles.loginButtonText}>Enter Live Room</Text>
</TouchableOpacity>
```

### 2. Profile Completion Flow

| Aspect | Web | Mobile |
|--------|-----|--------|
| Profile Check | `profile?.username && profile?.date_of_birth` | ❌ NONE |
| Onboarding | 4-step wizard (`/onboarding`) | ❌ NONE |
| Redirect Logic | Incomplete → onboarding, Complete → home | ❌ NONE |

**Web Onboarding (app/onboarding/page.tsx:77-81):**
```typescript
if (profile?.username && profile?.date_of_birth) {
  router.push('/');  // Profile complete → home
  return;
}
```

### 3. Home Dashboard vs Live Room

| Aspect | Web | Mobile |
|--------|-----|--------|
| Home Screen | Rich dashboard with search, carousels, features | ❌ MISSING |
| Live Access | Explicit navigation via GlobalHeader or button | ❌ Auto-enters |
| Access Gate | `canAccessLive()` function | ❌ NONE |

### 4. GlobalHeader Navigation

| Aspect | Web | Mobile |
|--------|-----|--------|
| Component | `GlobalHeader.tsx` | ❌ MISSING |
| Nav Items | Home, Live Streams (gated) | N/A |
| User Menu | Profile, Settings, Wallet, Logout | ❌ MISSING |
| Notifications | Messages + Noties icons | ❌ MISSING |
| Visibility | Hidden on login/signup/onboarding | N/A |

### 5. Live Room Access Gate

| Aspect | Web | Mobile |
|--------|-----|--------|
| Access Check | `canAccessLive(user)` | ❌ NONE |
| Owner Override | `isLiveOwnerUser()` check | ❌ NONE |
| Launch Flag | `LIVE_LAUNCH_ENABLED` env var | ❌ NONE |

**Web Live Page Gate (app/live/page.tsx:38-44):**
```typescript
if (canAccessLive({ id: user?.id, email: user?.email })) {
  setIsOwner(true);
} else {
  setIsOwner(false);
}
```

---

## LiveKit Auto-Connect Analysis

### Current Behavior (WRONG)

```
useLiveRoomParticipants.ts:222-375
```

1. `useEffect` with empty deps `[]` runs ONCE on mount
2. Checks `if (!enabled)` to skip, BUT...
3. **BUG:** `enabled` is NOT in deps array, so if it changes, effect won't re-run
4. When `enabled=true` (the default), it:
   - Gets mobile identity
   - Fetches token from API
   - Creates LiveKit Room instance
   - Connects immediately

```typescript
// Line 375 - Empty deps means runs once on mount
}, []); // Empty deps - connect ONCE on mount
```

### Token Fetch Trigger

The token is fetched as soon as `connectToRoom()` is called:

```typescript
// Lines 249-256
const connectToRoom = async () => {
  const identity = await getMobileIdentity();
  const { token, url } = await fetchToken(identity);  // ← AUTO FETCH!
  // ... then connects
}
```

---

## Required Routing Changes

### 🔴 MUST FIX (P0)

1. **Add Real Authentication**
   - Integrate Supabase Auth (like web)
   - Store session in SecureStore
   - Add auth state management hook

2. **Add Profile Check/Onboarding**
   - Check for username + DOB after login
   - Create mobile onboarding flow (can be simplified 2-step)
   - Block live room access until profile complete

3. **Add Home Dashboard Screen**
   - Create `HomeScreen.tsx` with:
     - Welcome message
     - Profile carousel (optional for MVP)
     - Explicit "Enter Live" button
   - This is the default destination after login

4. **Gate LiveRoomScreen Access**
   - Add navigation stack/state machine
   - LiveRoomScreen only accessible from Home
   - Add back button to return to Home

5. **Fix useLiveRoomParticipants Hook**
   - Add `enabled` to useEffect deps
   - Default `enabled` to `false`
   - Only enable when user explicitly enters live room
   - Consider splitting into `useLiveRoomConnection` (imperative) vs `useLiveRoomState` (reactive)

### 🟡 SHOULD FIX (P1)

6. **Add GlobalHeader Equivalent**
   - Tab bar or top nav for: Home, Live, Profile, Settings
   - Match web navigation intent
   - Handle notifications (noties, messages)

7. **Add canAccessLive Gate**
   - Port `canAccessLive()` function to mobile
   - Check `EXPO_PUBLIC_LIVE_LAUNCH_ENABLED`
   - Show "Coming Soon" if not enabled

8. **Add Logout Flow**
   - Clear SecureStore session
   - Clear mobile identity
   - Return to login screen

---

## Proposed Mobile Flow (Target)

```
App Launch
    ↓
Check SecureStore for session
    ↓
┌─────────────────────────────────────────┐
│ No session           → LoginScreen      │
│ Session, no profile  → OnboardingScreen │
│ Profile complete     → HomeScreen       │
└─────────────────────────────────────────┘
    ↓
HomeScreen (default destination)
├── Tab: Home (current)
├── Tab: Live (gated)
├── Tab: Profile
└── Tab: Settings
    ↓
User taps "Live" tab or "Enter Live" button
    ↓
canAccessLive() check
    ├── FALSE → Show "Coming Soon" modal
    └── TRUE  → Navigate to LiveRoomScreen
        ↓
        NOW connect to LiveKit (only here!)
```

---

## File Changes Required

| File | Action | Priority |
|------|--------|----------|
| `mobile/App.tsx` | Add navigation state machine, auth flow | P0 |
| `mobile/screens/LoginScreen.tsx` | NEW - Real auth with Supabase | P0 |
| `mobile/screens/OnboardingScreen.tsx` | NEW - Profile creation | P0 |
| `mobile/screens/HomeScreen.tsx` | NEW - Home dashboard | P0 |
| `mobile/hooks/useLiveRoomParticipants.ts` | Fix deps, default `enabled=false` | P0 |
| `mobile/hooks/useAuth.ts` | NEW - Auth state management | P0 |
| `mobile/lib/supabase.ts` | NEW - Supabase client for mobile | P0 |
| `mobile/components/TabBar.tsx` | NEW - Navigation tabs | P1 |
| `mobile/lib/canAccessLive.ts` | NEW - Live access gate | P1 |

---

## Immediate Hotfix (If Needed Before Full Fix)

If you need to prevent auto-connect IMMEDIATELY without full refactor:

```typescript
// In App.tsx, change:
<LiveRoomScreen enabled={true} />

// To:
<LiveRoomScreen enabled={false} />
```

This will prevent the hook from connecting, but the screen will just show empty tiles. A proper fix requires the navigation refactor above.

---

## Summary

| Category | Status |
|----------|--------|
| Auth Flow | 🔴 Missing entirely |
| Profile Flow | 🔴 Missing entirely |
| Home Dashboard | 🔴 Missing entirely |
| Live Room Gate | 🔴 Missing entirely |
| GlobalHeader Parity | 🔴 Missing entirely |
| Auto-Connect Prevention | 🔴 Currently auto-connects |

**Verdict:** Mobile app requires significant refactor to match web intent. Current implementation is a LiveKit demo, not a proper app with user flows.

---

*Generated by Mobile Navigation & Routing Alignment Agent*


