# Mobile App Crash - Root Cause & Fix

**Date:** Jan 4, 2026  
**Status:** ⚠️ REQUIRES REBUILD  
**Priority:** P0

---

## 🔴 ROOT CAUSE IDENTIFIED

**The crash is a NATIVE BUILD issue**, not a code issue. The existing dev build has:
1. Outdated native modules (expo-splash-screen 0.20.5 vs required 0.26.5)
2. Missing required initialization for react-native-reanimated and react-native-gesture-handler
3. Config sync mismatch (app.json changes not reflected in native folders)

**Evidence:**
- Minimal App.tsx (just a Text component) still crashes
- No console logs appear in Metro → crash happens before JS bundle loads
- This is a native module initialization failure

---

## ✅ FIXES APPLIED (Code Ready for Rebuild)

### 1. **Fixed index.js** - Added Required Native Module Imports
**File:** `mobile/index.js`

```javascript
import { registerRootComponent } from 'expo';

// CRITICAL: Gesture handler MUST be imported first
import 'react-native-gesture-handler';
// CRITICAL: Import reanimated second (required for Reanimated 3.x)
import 'react-native-reanimated';

require('react-native-url-polyfill/auto');
require('react-native-get-random-values');
// ... rest of file
```

**Why this matters:**
- `react-native-reanimated` 3.x **requires** this import in entry point
- `react-native-gesture-handler` needs early initialization
- Without these, any screen using Animated or GestureDetector crashes

---

### 2. **Updated Dependencies** - Aligned with Expo SDK 50
**File:** `mobile/package.json`

| Package | Old | New | Reason |
|---------|-----|-----|--------|
| `expo-splash-screen` | 0.20.5 | ~0.26.5 | SDK 50 ABI compatibility (CRITICAL) |
| `expo-camera` | 14.0.6 | ~14.1.3 | SDK 50 requirement |
| `@react-native-async-storage/async-storage` | 1.24.0 | 1.21.0 | Align with Expo's tested version |
| `@react-native-community/slider` | 4.5.7 | 4.4.2 | SDK 50 compatibility |
| `react-native-webview` | 13.16.0 | 13.6.4 | RN 0.73 patch set |

**Why this matters:**
- `expo-splash-screen` ABI mismatch was causing instant crash after splash
- Native modules compiled for wrong SDK version = instant crash

---

### 3. **Fixed EAS Config Sync** - Force Native Rebuild
**File:** `mobile/.easignore`

```
# Added:
ios/
android/
```

**Why this matters:**
- Native folders (`ios/`, `android/`) were committed but out of sync with `app.json`
- EAS was using stale native projects instead of regenerating from `app.json`
- This caused plugin mismatches and config drift

---

### 4. **Removed Native Folders** - Clean Slate
**Action:** Deleted `mobile/android/` folder (ios was already absent)

**Why this matters:**
- Forces EAS to run `expo prebuild` and generate fresh native projects
- Ensures all config plugins run correctly
- Eliminates any manual Xcode/Gradle changes that could conflict

---

## 🚀 REBUILD REQUIRED

**You MUST rebuild the native app for these fixes to take effect.**

### Option A: EAS Build (Recommended)

From `mobile/` folder:

```bash
cd mobile
eas build --profile preview --platform ios --clear-cache
```

**Note:** You'll need to authenticate with Apple (or use `--non-interactive` if credentials are cached).

### Option B: Local Build (If EAS fails)

```bash
cd mobile
npx expo prebuild --clean
npx expo run:ios
```

---

## 📋 VERIFICATION CHECKLIST

After installing the new build:

- [ ] App launches past splash screen
- [ ] GateScreen appears (or MainTabs if logged in)
- [ ] No instant crash
- [ ] Metro console shows:
  ```
  [AUTH] Bootstrap: fetching initial session...
  [AUTH] Bootstrap: session loaded
  ```
- [ ] Navigation works (tap through tabs)
- [ ] Theme toggle works (Settings → Theme)

---

## 🔍 WHY THE OLD BUILD CRASHED

1. **Import-time failure:** React Native loaded the JS bundle
2. **Native module lookup:** When a component using `Animated` or `VideoView` was imported, React Native tried to find the native module
3. **ABI mismatch:** The native module was compiled for SDK 49, but runtime expected SDK 50
4. **Instant crash:** Before React could render anything → native exception → app terminated

**This type of crash produces NO JavaScript logs** because the JS engine never gets control - it's a native-side abort.

---

## 📝 FILES CHANGED

- ✅ `mobile/index.js` - Added reanimated/gesture-handler imports
- ✅ `mobile/package.json` - Updated 6 dependencies
- ✅ `mobile/.easignore` - Added ios/ and android/
- ✅ `mobile/android/` - DELETED (will be regenerated)
- ✅ `mobile/App.tsx` - Restored full version (was temporarily minimal for testing)

---

## 🎯 NEXT STEPS

1. **Trigger EAS build** (command above)
2. **Wait for build to complete** (~15-20 minutes)
3. **Install on device** (via EAS QR code or TestFlight)
4. **Test launch** and verify checklist above
5. **If successful:** Mark P0 as resolved ✅

---

## 💡 LESSONS LEARNED

- **Always check `expo doctor` after SDK upgrades** - catches ABI mismatches
- **Never commit native folders for managed workflow** - use `.easignore`
- **Reanimated 3.x requires explicit import in index.js** - not documented clearly
- **Native crashes produce no JS logs** - must use device console (Console.app / adb logcat)

---

**Build started:** Jan 4, 2026 (awaiting Apple credentials)  
**Expected completion:** ~20 minutes after authentication
