# iOS Launch Crash Fix — Build Instructions

## Problem
iOS standalone/TestFlight builds were crashing immediately on launch due to:
- Missing native plugin config in `app.json`
- LiveKit/WebRTC modules loading at app startup (before native init complete)
- SecureStore calls at module scope
- Unhandled async rejection in splash screen hide
- Large startup images (2048×2732) causing memory pressure

## Solution Applied
All fixes applied in one commit to address root causes.

## Build Instructions (Required)

### For EAS Builds

```bash
cd mobile
eas build --platform ios --profile preview --clear-cache
```

**Important**: Always use `--clear-cache` after native config changes to ensure clean rebuild.

### For Local Prebuild (if used)

```bash
cd mobile
npx expo prebuild --clean --platform ios
```

## What Changed

### 1. Native Plugins Configured (`mobile/app.json`)
Added required Expo config plugins:
- `expo-dev-client` - Dev client support
- `expo-secure-store` - Native secure storage

Note: `react-native-reanimated/plugin` is already correctly configured in `babel.config.js` (Babel plugin, not Expo config plugin)

### 2. LiveKit Lazy-Loaded (`mobile/App.tsx`)
- `LiveRoomScreen` now uses `React.lazy()` + dynamic import
- LiveKit/WebRTC modules not touched until user taps "Enter Live Room"
- Wrapped in `Suspense` with loading fallback

### 3. SecureStore Made Safe (`mobile/lib/deviceId.ts`, `mobile/lib/mobileIdentity.ts`)
- Lazy-load SecureStore via dynamic import
- In-memory cache + fallback if SecureStore fails
- No module-scope SecureStore calls

### 4. Splash Hide Fixed (`mobile/App.tsx`)
- No longer `await` inside animation callback
- Moved to separate `useEffect` with try/catch
- Non-fatal if hide fails

### 5. Random Seed Safe (`mobile/hooks/useLiveRoomParticipants.ts`)
- Initialize with in-memory default immediately
- Hydrate from SecureStore in background
- Non-fatal if SecureStore unavailable

## Verification

After building, test:
1. ✅ Cold start 5 times → no crash
2. ✅ Splash shows → login shows
3. ✅ Tap "Enter Live Room" → loading indicator → LiveKit connects
4. ✅ Video renders in tiles
5. ✅ App stable for 2+ minutes

## Expected Boot Logs (with `EXPO_PUBLIC_DEBUG_LIVE=1`)

```
[SPLASH] preventAutoHide OK
[Animation completes]
[SPLASH] hideAsync OK
[Login screen renders]
[User taps "Enter Live Room"]
[Loading Live Room...]
[DEVICE] Retrieved existing ID: abc12345...
[IDENTITY] Retrieved existing: mobile-xyz...
[SEED] Loaded from SecureStore: 1234567890
[TOKEN] Requesting token...
[ROOM] Connecting to: { url: 'wss://...', room: 'live_central' }
[ROOM] Connected: { participants: 0 }
```

## Rollback (if needed)

```bash
git revert HEAD
```

Then rebuild with `--clear-cache`.

