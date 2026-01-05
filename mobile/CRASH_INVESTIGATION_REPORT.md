# Mobile App Crash Investigation Report
**Date:** 2026-01-04  
**Build:** #41 (after fixes)  
**Status:** STILL CRASHING

---

## 🔴 CRASH SYMPTOMS

1. **Instant crash** after splash screen (~0.2 seconds)
2. **No Metro connection** - JS bundle not requested
3. **No console output** - Metro shows nothing
4. **Even minimal App.tsx crashes** - confirmed native crash

---

## 🔍 CRASH EVIDENCE FROM LOGS

### From iOS Crash Log (Build #40):
```
Exception: EXC_CRASH (SIGABRT)
Termination: abort() called
Faulting Thread: com.facebook.react.ExceptionsManagerQueue

Last Exception Backtrace:
- objc_exception_throw
- FBSceneManager (React Native Scene Manager)
- UIScene / applyPolicyDelta (iOS Scene APIs)
```

### Error Messages Seen:
- `"Cannot call a class as a function"` (Hermes JS engine)
- `"unhandled js exception"` (ExceptionsManager)
- `FBSceneManager` crash
- `UIScene` / `applyPolicyDelta` crash
- `com.mylivelinks.app is not a metrickit client` (harmless warning)

---

## 🛠️ FIXES ATTEMPTED

### Native Configuration Changes (`app.json`):
1. ✅ Removed `expo-splash-screen` plugin
2. ✅ Added `UIApplicationSupportsMultipleScenes: false`
3. ✅ Added `UIApplicationSceneManifest` with scene disabling
4. ✅ Aligned all dependency versions with Expo SDK 50
5. ✅ Added `.easignore` for `ios/` and `android/`

### JavaScript Changes:
1. ✅ Added global error handler in `index.js` (ErrorUtils)
2. ✅ Added try/catch around App.tsx import
3. ✅ Added LiveKit registerGlobals() guard
4. ✅ Fixed provider order (ThemeProvider → SafeAreaProvider)
5. ✅ Added startup instrumentation (breadcrumbs, error boundaries)

### Build & Cache:
1. ✅ Cleared Metro cache (`--clear`, `--reset-cache`)
2. ✅ Cleared EAS build cache (`--clear-cache`)
3. ✅ Rebuilt native binary (Build #41)
4. ✅ Deleted `node_modules/.cache`

---

## 🤔 REMAINING THEORIES

### Theory 1: Native Module Initialization
**Hypothesis:** A native module (LiveKit, WebRTC, Reanimated, Hermes) is crashing during initialization BEFORE React Native runtime starts.

**Evidence:**
- Even minimal App.tsx crashes
- Metro never receives bundle request
- Crash happens in native thread

**Next Steps:**
- Check Xcode device logs for native crash stack trace
- Look for "dyld: Library not loaded" errors
- Check for code signing / entitlements issues

### Theory 2: Hermes Engine Initialization
**Hypothesis:** Hermes JS engine fails to initialize due to corrupted bytecode or incompatible native bindings.

**Evidence:**
- "Cannot call a class as a function" suggests Hermes transpilation issue
- FBSceneManager might be trying to execute JS too early

**Next Steps:**
- Try disabling Hermes in `app.json` (use JSC instead)
- Check if Hermes version matches React Native version

### Theory 3: Code Signing / Provisioning
**Hypothesis:** Dev client has invalid signature or missing entitlements.

**Evidence:**
- App installs but crashes immediately
- Could be related to SecureStore or other secure APIs

**Next Steps:**
- Check provisioning profile includes all required capabilities
- Verify code signing identity is valid
- Check for "killed: 9" in system logs (signature rejection)

### Theory 4: iOS 18.1 Compatibility
**Hypothesis:** React Native / Expo SDK 50 has compatibility issues with iOS 18.1 (26.1 build 23B85).

**Evidence:**
- User is on iPhone OS 26.1 (very new)
- FBSceneManager / UIScene APIs might have changed

**Next Steps:**
- Check Expo SDK 50 release notes for iOS 18 compatibility
- Try building for iOS 17 target

---

## 📋 DIAGNOSTIC STEPS FOR MACBOOK

### 1. Get FULL Native Crash Log
```bash
# In Xcode:
Window → Devices and Simulators → Select iPhone → View Device Logs
# Look for MyLiveLinks crash with FULL stack trace
```

### 2. Run Dev Build with Xcode Console
```bash
# Open Xcode
# Window → Devices and Simulators
# Select iPhone → Open Console
# Launch app and capture ALL output
# Look for:
# - "dyld: Library not loaded"
# - Native module initialization errors
# - Code signing errors
```

### 3. Check Native Dependencies
```bash
cd mobile/ios
pod install --verbose
# Look for version conflicts or missing dependencies
```

### 4. Try Hermes Disable (Test)
In `app.json`, add:
```json
{
  "expo": {
    "jsEngine": "jsc"
  }
}
```
Then rebuild.

### 5. Check Reanimated/Gesture Handler
These MUST be in specific order in `index.js`:
```javascript
import 'react-native-gesture-handler'; // FIRST
import 'react-native-reanimated';      // SECOND
```
Already correct, but verify native modules are linked.

### 6. Minimal Native Build Test
Create a brand new Expo app:
```bash
npx create-expo-app test-app
cd test-app
npx expo install expo-dev-client
eas build --profile preview --platform ios
```
If THIS crashes too → problem with your Apple Developer account / device
If THIS works → problem with your app's native dependencies

---

## 🔑 KEY FILES TO CHECK

### On MacBook with Xcode:
1. `mobile/ios/Podfile.lock` - Check actual installed versions
2. Xcode device console - Full native crash log
3. iPhone Settings → Privacy → Analytics → Analytics Data → MyLiveLinks-* files
4. `~/Library/Logs/CoreSimulator/` (if testing simulator)

### Native Module Suspects:
- `@livekit/react-native` + WebRTC.framework
- `react-native-reanimated` (requires specific setup)
- `react-native-gesture-handler` (must be first import)
- `expo-secure-store` (uses iOS Keychain)
- `expo-camera` (requires permissions)

---

## 📊 BUILD INFORMATION

### Current Dependencies (after fixes):
```json
"expo": "~50.0.14",
"expo-splash-screen": "~0.26.5",
"react-native": "0.73.6",
"react-native-reanimated": "~3.6.2",
"react-native-gesture-handler": "~2.14.0",
"@livekit/react-native": "^2.5.3"
```

### EAS Build Profile (preview):
```json
{
  "preview": {
    "distribution": "internal",
    "ios": {
      "simulator": false,
      "buildConfiguration": "Release"
    }
  }
}
```

---

## 🎯 RECOMMENDED NEXT ACTIONS (Priority Order)

1. **CRITICAL:** Get native crash log from Xcode device console
   - This will show the ACTUAL native function that's crashing
   - Look for library loading errors

2. **Test:** Disable Hermes (switch to JSC)
   - Add `"jsEngine": "jsc"` to app.json
   - Rebuild

3. **Test:** Remove LiveKit temporarily
   - Comment out LiveKit imports in index.js
   - Remove from package.json
   - Rebuild

4. **Test:** Create minimal Expo app
   - Verify your dev environment is working
   - Isolate if it's your app or your setup

5. **Check:** Expo SDK 50 + iOS 18.1 compatibility
   - Search Expo forums for iOS 18 issues
   - Consider downgrading to Expo SDK 49

---

## 📝 NOTES

- The crash is 100% a **native crash**, not JavaScript
- It happens **before React Native runtime initializes**
- Metro never receives bundle request → JS never executes
- All JS-level fixes are correct but can't prevent a native crash
- The "cannot call a class as a function" error is a **red herring** - it's React Native's error handler trying to report a native crash

**The smoking gun will be in the native crash log from Xcode.**

---

## 🚀 IF ALL ELSE FAILS

Consider these nuclear options:

1. **Downgrade to Expo SDK 49** (stable, more tested)
2. **Switch from `expo-dev-client` to Expo Go** (for development only)
3. **Eject to bare React Native** (if you need more control)
4. **Test on a different iOS device** (rule out device-specific issues)
5. **Contact Expo support** with full native crash log

---

**Good luck on the MacBook, Brad. The native crash log will tell us everything we need to know.** 🔍
