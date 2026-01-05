# Environment Variable Audit

**Date:** Jan 4, 2026  
**Scope:** All `EXPO_PUBLIC_*` vars accessed during startup  
**Method:** Code grep + usage analysis

---

## Environment Variables Inventory

| Variable | Purpose | Used In (Startup Path) | Default/Fallback | Crash Risk if Missing |
|----------|---------|------------------------|------------------|-----------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `lib/supabase.ts:10` | `https://example.supabase.co` | ✅ **NO** — Fallback provided |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `lib/supabase.ts:11` | `public-anon-key-not-set` | ✅ **NO** — Fallback provided |
| `EXPO_PUBLIC_API_URL` | Web API base URL | `lib/api.ts:14` | `https://www.mylivelinks.com` | ✅ **NO** — Fallback provided |
| `EXPO_PUBLIC_DEBUG_LIVE` | Debug logging flag | `lib/deviceId.ts:12`, `lib/mobileIdentity.ts:12`, etc. | `undefined` (falsy) | ✅ **NO** — Defaults to off |
| `EXPO_PUBLIC_DEBUG_ENV_BOOT` | Boot-time debug logs | `index.js:7` | `undefined` (falsy) | ✅ **NO** — Defaults to off |
| `EXPO_PUBLIC_ADMIN_PROFILE_IDS` | Admin user IDs | `hooks/topbar/useTopBarState.ts:58` | Empty list | ✅ **NO** — Defaults to empty array |
| `EXPO_PUBLIC_ADMIN_EMAILS` | Admin emails | `hooks/topbar/useTopBarState.ts:62` | Empty list | ✅ **NO** — Defaults to empty array |
| `EXPO_PUBLIC_DEBUG_LIVEKIT` | LiveKit debug logs | `hooks/useViewerHeartbeat.ts:60` | `undefined` (falsy) | ✅ **NO** — Defaults to off |

---

## Detailed Analysis by Variable

### 1. EXPO_PUBLIC_SUPABASE_URL

**File:** `mobile/lib/supabase.ts`

```typescript
const supabaseUrl = getRuntimeEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRuntimeEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Log missing env vars but DON'T crash the app
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE] Missing environment variables:');
  if (!supabaseUrl) console.error('  - EXPO_PUBLIC_SUPABASE_URL is not set');
  if (!supabaseAnonKey) console.error('  - EXPO_PUBLIC_SUPABASE_ANON_KEY is not set');
  console.error('[SUPABASE] App will run in offline mode. Auth features will not work.');
  logStartupBreadcrumb('SUPABASE_ENV_MISSING', {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
  });
} else {
  logStartupBreadcrumb('SUPABASE_INIT', {
    host: (() => {
      try {
        return new URL(supabaseUrl).host;
      } catch {
        return 'invalid-url';
      }
    })(),
  });
}

const safeSupabaseUrl = supabaseUrl ?? 'https://example.supabase.co';
const safeSupabaseAnonKey = supabaseAnonKey ?? 'public-anon-key-not-set';

export const supabase = createClient(safeSupabaseUrl, safeSupabaseAnonKey, {
  // ...
});
```

**Access pattern:**
- **When:** Module eval (before any component mounts)
- **How:** Via `getRuntimeEnv()` helper (checks `process.env` then `Constants.expoConfig.extra`)
- **Fallback:** Uses dummy URL/key if undefined
- **Crash risk:** ✅ **NONE** — `createClient()` accepts any string; offline mode enabled via `supabaseConfigured` flag

**Guard effectiveness:** ✅ **EXCELLENT** — Logs error, sets flag, app continues

---

### 2. EXPO_PUBLIC_SUPABASE_ANON_KEY

**Same as above** (paired with `EXPO_PUBLIC_SUPABASE_URL`)

**Crash risk:** ✅ **NONE**

---

### 3. EXPO_PUBLIC_API_URL

**File:** `mobile/lib/api.ts`

```typescript
function getApiBaseUrl() {
  const raw = getRuntimeEnv('EXPO_PUBLIC_API_URL') || 'https://www.mylivelinks.com';
  return raw.replace(/\/+$/, '');
}
```

**Access pattern:**
- **When:** First API call (post-mount, never during startup)
- **How:** Via `getRuntimeEnv()` helper
- **Fallback:** Defaults to `https://www.mylivelinks.com`
- **Crash risk:** ✅ **NONE** — String manipulation on fallback value; API calls happen async

**Used in:**
- `lib/api.ts:14` (API helper)
- `screens/ReferralsLeaderboardScreen.tsx:27`
- `components/ReferralLeaderboardPreview.tsx:56`
- `components/ReferralProgress.tsx:63`
- `screens/WalletScreen.tsx:87`
- `components/RoomsCarousel.tsx:53`
- `hooks/useActiveViewerCount.ts:6`
- `hooks/useFeatureFlags.ts:14`
- `hooks/useLiveRoomParticipants.ts:30`

**All usages:** Post-mount, async, guarded with fallback

**Crash risk:** ✅ **NONE**

---

### 4. EXPO_PUBLIC_DEBUG_LIVE

**Files:**
- `lib/deviceId.ts:12`
- `lib/mobileIdentity.ts:12`
- `screens/LiveRoomScreen.tsx:39`
- `components/live/Tile.tsx:21`
- `state/liveRoomUI.ts:11`
- `lib/livekit-constants.ts:29`

**Pattern:**
```typescript
const DEBUG = getRuntimeEnv('EXPO_PUBLIC_DEBUG_LIVE') === '1';

if (DEBUG) {
  console.log('[DEBUG] ...');
}
```

**Access pattern:**
- **When:** Module eval or component render
- **How:** String comparison (`=== '1'`)
- **Fallback:** `undefined === '1'` → `false`
- **Crash risk:** ✅ **NONE** — Boolean result, safe in conditionals

---

### 5. EXPO_PUBLIC_DEBUG_ENV_BOOT

**File:** `mobile/index.js:7`

```javascript
const envBootDebug =
  typeof process !== 'undefined' && process?.env ? process.env.EXPO_PUBLIC_DEBUG_ENV_BOOT === '1' : false;

if (envBootDebug) {
  console.log('[ENV_BOOT]', {
    EXPO_PUBLIC_API_URL: typeof process !== 'undefined' && process?.env ? process.env.EXPO_PUBLIC_API_URL : undefined,
    SUPABASE_URL:
      typeof process !== 'undefined' && process?.env && process.env.EXPO_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
  });
}
```

**Access pattern:**
- **When:** Module eval (earliest possible)
- **How:** Direct `process.env` access with type guards
- **Fallback:** `false` if `process` unavailable
- **Crash risk:** ✅ **NONE** — Logging only

---

### 6. EXPO_PUBLIC_ADMIN_PROFILE_IDS

**File:** `hooks/topbar/useTopBarState.ts:58`

```typescript
export function getAdminProfileIds(): string[] {
  return parseEnvList(getRuntimeEnv('EXPO_PUBLIC_ADMIN_PROFILE_IDS') ?? getRuntimeEnv('NEXT_PUBLIC_ADMIN_PROFILE_IDS'));
}
```

**Access pattern:**
- **When:** Hook execution (post-mount)
- **How:** Via `getRuntimeEnv()`, fallback to `NEXT_PUBLIC_*` (web compat)
- **Fallback:** `parseEnvList(undefined)` → empty array
- **Crash risk:** ✅ **NONE** — Post-mount, defaults to empty

---

### 7. EXPO_PUBLIC_ADMIN_EMAILS

**File:** `hooks/topbar/useTopBarState.ts:62`

```typescript
export function getAdminEmails(): string[] {
  return parseEnvList(getRuntimeEnv('EXPO_PUBLIC_ADMIN_EMAILS') ?? getRuntimeEnv('NEXT_PUBLIC_ADMIN_EMAILS')).map((s) => s.toLowerCase());
}
```

**Same as above** — post-mount, defaults to empty array

**Crash risk:** ✅ **NONE**

---

### 8. EXPO_PUBLIC_DEBUG_LIVEKIT

**File:** `hooks/useViewerHeartbeat.ts:60`

```typescript
const DEBUG = getRuntimeEnv('EXPO_PUBLIC_DEBUG_LIVEKIT') === '1';

if (DEBUG) {
  console.log('[HEARTBEAT] ...');
}
```

**Access pattern:**
- **When:** Hook execution (post-mount, only in Live screens)
- **How:** String comparison
- **Fallback:** `undefined === '1'` → `false`
- **Crash risk:** ✅ **NONE**

---

## getRuntimeEnv Helper Analysis

**File:** `mobile/lib/env.ts`

```typescript
export function getRuntimeEnv(key: string): string | undefined {
  try {
    const procEnv = typeof process !== 'undefined' ? (process as any)?.env : undefined;
    const fromProcess = procEnv ? procEnv[key] : undefined;
    if (typeof fromProcess === 'string' && fromProcess.length > 0) return fromProcess;
  } catch {
    // ignore
  }

  try {
    const fromExtra = expoExtra?.[key];
    if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra;
  } catch {
    // ignore
  }

  return undefined;
}
```

**Safety features:**
1. Double try/catch (won't throw even if `process` is undefined)
2. Type guards (`typeof process !== 'undefined'`)
3. Returns `undefined` if not found (safe fallback value)

**Crash risk:** ✅ **NONE** — Cannot throw

---

## Environment Variable Sources

### Build Time (EAS)

**File:** `mobile/eas.json`

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_DEBUG_LIVE": "1",
        "EXPO_PUBLIC_API_URL": "https://www.mylivelinks.com",
        "EXPO_PUBLIC_SUPABASE_URL": "https://dfiyrmqobjfsdsgklweg.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJ..."
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_DEBUG_LIVE": "0",
        "EXPO_PUBLIC_API_URL": "https://www.mylivelinks.com",
        "EXPO_PUBLIC_SUPABASE_URL": "https://dfiyrmqobjfsdsgklweg.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJ..."
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_DEBUG_LIVE": "0",
        "EXPO_PUBLIC_API_URL": "https://www.mylivelinks.com",
        "EXPO_PUBLIC_SUPABASE_URL": "https://dfiyrmqobjfsdsgklweg.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJ..."
      }
    }
  }
}
```

**Also duplicated in:** `mobile/app.json:82-87` (for local dev)

**Result:** All required vars are set for every build profile

---

## Crash Risk Matrix

| Variable | Timing | Guarded? | Fallback | Crash if Missing? | Evidence |
|----------|--------|----------|----------|-------------------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Module eval | ✅ Yes | Dummy URL | ✅ **NO** | Lines 28-29 of `supabase.ts` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Module eval | ✅ Yes | Dummy key | ✅ **NO** | Lines 28-29 of `supabase.ts` |
| `EXPO_PUBLIC_API_URL` | Post-mount | ✅ Yes | Production URL | ✅ **NO** | Line 14 of `api.ts` |
| `EXPO_PUBLIC_DEBUG_LIVE` | Module eval | ✅ Yes | `false` | ✅ **NO** | Comparison returns boolean |
| `EXPO_PUBLIC_DEBUG_ENV_BOOT` | Module eval | ✅ Yes | `false` | ✅ **NO** | Type guards + default |
| `EXPO_PUBLIC_ADMIN_PROFILE_IDS` | Post-mount | ✅ Yes | `[]` | ✅ **NO** | `parseEnvList` returns array |
| `EXPO_PUBLIC_ADMIN_EMAILS` | Post-mount | ✅ Yes | `[]` | ✅ **NO** | `parseEnvList` returns array |
| `EXPO_PUBLIC_DEBUG_LIVEKIT` | Post-mount | ✅ Yes | `false` | ✅ **NO** | Comparison returns boolean |

---

## Validation: Are All Env Vars Defined in Build Profiles?

### Development Profile

✅ **YES** — All required vars present in `eas.json:16-20`

### Preview Profile

✅ **YES** — All required vars present in `eas.json:31-35`

### Production Profile

✅ **YES** — All required vars present in `eas.json:46-50`

---

## Scenarios: What Happens If...

### Scenario 1: EXPO_PUBLIC_SUPABASE_URL is Missing

**Trigger:** Build without env var  
**Code path:** `lib/supabase.ts:10-35`

**What happens:**
1. `getRuntimeEnv('EXPO_PUBLIC_SUPABASE_URL')` returns `undefined`
2. `supabaseConfigured` set to `false`
3. Fallback: `safeSupabaseUrl = 'https://example.supabase.co'`
4. Supabase client created with dummy URL
5. `useAuth` hook checks `supabaseConfigured` (line 34 of `useAuth.ts`):
   ```typescript
   if (!supabaseConfigured) {
     console.warn('[AUTH] Supabase client not initialized - running in offline mode');
     setLoading(false);
     return;
   }
   ```
6. **Result:** App launches, auth disabled, user sees GateScreen/login prompt

**Crash:** ✅ **NO**

---

### Scenario 2: EXPO_PUBLIC_API_URL is Missing

**Trigger:** Build without env var  
**Code path:** `lib/api.ts:14`

**What happens:**
1. `getRuntimeEnv('EXPO_PUBLIC_API_URL')` returns `undefined`
2. Fallback: `|| 'https://www.mylivelinks.com'`
3. **Result:** App uses production API (safe default)

**Crash:** ✅ **NO**

---

### Scenario 3: All Debug Flags Missing

**Trigger:** Build without debug vars  
**Code path:** Various debug conditional checks

**What happens:**
1. All `DEBUG` constants evaluate to `false`
2. Debug logs disabled
3. **Result:** Production behavior (no verbose logging)

**Crash:** ✅ **NO**

---

## Conclusion

**Total env vars:** 8  
**Crash-capable if missing:** 0  
**Fallback strategies present:** 8/8  
**Guard coverage:** 100%

**Primary findings:**
1. All env vars have safe defaults or fallbacks
2. `getRuntimeEnv()` helper cannot throw (double try/catch)
3. All required vars defined in `eas.json` for all profiles
4. Supabase fallback enables "offline mode" instead of crashing

**Recommendation:** ✅ **NO CHANGES NEEDED** — Environment handling is already production-safe.

**Secondary recommendation:** Add `logStartupBreadcrumb('ENV_LOADED', { ... })` to show which vars were loaded (already implemented in recent hardening).
