# iOS Build Runbook - MyLiveLinks Mobile

Complete guide to building and testing the mobile app for iOS.

---

## Prerequisites

### Required Software
- **Node.js** 18+ and npm
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI**: `npm install -g eas-cli`
- **Xcode** 14+ (Mac only, for local builds/simulator)
- **iOS Simulator** or physical iOS device (iOS 13+)

### Required Accounts
- **Expo Account**: Sign up at [expo.dev](https://expo.dev)
- **Apple Developer Account**: Required for TestFlight/App Store (preview/production builds)

### Initial Setup (One-Time)

1. **Install dependencies**:
   ```bash
   cd mobile
   npm install
   ```

2. **Login to Expo**:
   ```bash
   npx eas login
   ```

3. **Configure EAS**:
   ```bash
   npx eas build:configure
   ```
   This creates/updates `eas.json` with build profiles.

4. **Copy environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

---

## Build Profiles

The app has three build profiles (defined in `eas.json`):

### 1. Development Build
- **Purpose**: Local development with debug logging
- **Distribution**: Internal (simulator or device)
- **Features**: Development client, debug logs enabled
- **Env**: `EXPO_PUBLIC_DEBUG_LIVE=1`

### 2. Preview Build
- **Purpose**: Internal testing (TestFlight-like)
- **Distribution**: Internal (Ad Hoc or TestFlight)
- **Features**: Release configuration, debug logs disabled
- **Env**: `EXPO_PUBLIC_DEBUG_LIVE=0`

### 3. Production Build
- **Purpose**: App Store release
- **Distribution**: Store (App Store Connect)
- **Features**: Release configuration, optimized
- **Env**: `EXPO_PUBLIC_DEBUG_LIVE=0`

---

## Build Commands

### Development Build (Simulator)

**For iOS Simulator (fastest for local dev)**:
```bash
cd mobile
npx expo start --ios
```

This uses Expo Go or a development build. Great for quick iteration.

**To create a development build with custom native code**:
```bash
cd mobile
npx eas build --platform ios --profile development
```

Download the `.tar.gz`, extract, and install in simulator:
```bash
tar -xvzf build-xyz.tar.gz
xcrun simctl install booted MyLiveLinks.app
xcrun simctl launch booted com.mylivelinks.app
```

### Preview Build (TestFlight or Device)

**For internal testing (TestFlight or Ad Hoc)**:
```bash
cd mobile
npx eas build --platform ios --profile preview
```

**What happens**:
1. Uploads code to EAS servers
2. Builds on cloud infrastructure
3. Creates signed `.ipa` file
4. Provides download link

**To install**:
- Download `.ipa` from EAS dashboard
- Use Apple Configurator or TestFlight to install on device
- Or submit to TestFlight: `npx eas submit --platform ios --profile preview`

### Production Build (App Store)

**For App Store submission**:
```bash
cd mobile
npx eas build --platform ios --profile production
```

**Submit to App Store**:
```bash
npx eas submit --platform ios --profile production
```

---

## Local Development Workflow

### Option 1: Expo Go (Quickest)
```bash
cd mobile
npx expo start
```
- Scan QR code with Expo Go app on iOS device
- **Limitation**: Can't use custom native modules (LiveKit requires dev build)

### Clean Restart (Required After `.env` Changes)

Expo reads `EXPO_PUBLIC_*` environment variables at **bundle time**. If you change `mobile/.env`, you must restart Metro with cache cleared so the new values are embedded.

1. **Stop Metro**:
   - In the terminal running Expo/Metro, press `Ctrl+C`

2. **Start with a clean cache**:
   ```bash
   cd mobile
   npx expo start -c
   ```

3. **If using a Dev Client (recommended for LiveKit)**:
   - Quit the app on the device/simulator completely
   - Relaunch the dev client and reconnect to the Metro server
   - If it still shows old values, do a full rebuild:
     - iOS (Mac): `npx expo run:ios` or rebuild from Xcode
     - Android: `npx expo run:android`

4. **Verify env loaded (temporary log)**:
   - In Metro logs / device logs you should see:
     - `[ENV_BOOT]` with `EXPO_PUBLIC_API_URL: "https://mylivelinks.com"`

### Option 2: iOS Simulator (Mac Only)
```bash
cd mobile
npx expo start --ios
```
- Opens in iOS Simulator automatically
- **Limitation**: No camera/mic access, but can test video playback

### Option 3: Physical Device (Custom Development Build)
```bash
# Build once
npx eas build --platform ios --profile development

# Install on device via TestFlight or Apple Configurator
# Then start dev server:
npx expo start --dev-client
```
- Best for testing camera/mic and full LiveKit features
- Requires Apple Developer account

---

## Environment Variables for Different Environments

### Local Development (with Physical Device)

If testing on a physical device, your computer's `localhost` won't work. Use ngrok:

```bash
# In web project terminal (separate from mobile)
cd ..  # Go to web root
npx ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and update `mobile/.env`:
```bash
EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
EXPO_PUBLIC_DEBUG_LIVE=1
```

### Staging/Production

Update `mobile/eas.json` build profiles to point to your deployed API:
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://mylivelinks.com"
      }
    }
  }
}
```

---

## Build Smoke Test Checklist

After installing any build, run through this checklist:

### 1. App Launch
- [ ] App launches without crash
- [ ] Splash screen displays
- [ ] Main screen loads (4x3 grid visible)

### 2. Room Connection
- [ ] App connects to LiveKit room
- [ ] No console errors (if debug build)
- [ ] Connection status shows "connected"

### 3. Video Rendering
- [ ] If streamers are live, their video appears in tiles
- [ ] Video plays smoothly (no freezing)
- [ ] Video fills tile correctly (no stretching)

### 4. Stability Test (2 Minutes)
- [ ] App remains connected for 2 minutes
- [ ] No reconnection loops (check debug logs)
- [ ] No memory leaks or crashes
- [ ] Participant list stays stable

### 5. Gesture Tests
- [ ] Long-press enters edit mode
- [ ] Double-tap enters focus mode
- [ ] Swipe gestures show overlays
- [ ] All gestures exit cleanly

### 6. Multi-Participant Test
- [ ] Open web app in browser
- [ ] Publish stream from web (go live)
- [ ] Mobile app shows web stream within 2 seconds
- [ ] Video renders correctly
- [ ] Audio plays (if not muted)

### 7. Device/Session Tracking
- [ ] Check debug logs for device ID (if debug build)
- [ ] Verify device ID persists across app restarts
- [ ] Verify session ID changes on reconnect

---

## Same Account Web→Mobile Test

This is the critical integration test to verify web and mobile work together.

### Setup
1. **Web**: Open browser to `https://mylivelinks.com/live`
2. **Mobile**: Launch mobile app
3. **Both**: Use same LiveKit room (`live_central`)

### Test Steps

**Step 1: Mobile Viewer → Web Publisher**
1. Mobile: Launch app, connect to room
2. Mobile: Verify empty grid (no streamers yet)
3. Web: Click "Go Live" button, enable camera
4. Web: Verify publishing (video preview shows)
5. Mobile: Within 2 seconds, see web stream appear in grid
6. Mobile: Video renders and plays smoothly
7. Mobile: Double-tap to focus, verify audio plays

**Step 2: Multiple Web Publishers**
1. Web: Open 12+ tabs, each with different account
2. Web: Each tab goes live
3. Mobile: Verify 12 tiles fill with video
4. Mobile: Selection engine chooses 12 without thrashing
5. Mobile: Verify no reconnect loops

**Step 3: Publisher Disconnect**
1. Web: Stop streaming in one tab
2. Mobile: Tile becomes empty within 2 seconds
3. Mobile: No crash or reconnect loop
4. Mobile: Selection engine refills if other streamers available

**Step 4: Mobile Reconnect**
1. Mobile: Kill app completely
2. Mobile: Relaunch app
3. Mobile: Verify connects to same room
4. Mobile: Verify same device ID in logs (persisted)
5. Mobile: Verify new session ID in logs (fresh connection)
6. Web: Verify mobile doesn't appear as duplicate participant

### Expected Results
- ✅ Mobile sees web streams within 2 seconds
- ✅ Video renders correctly (no black screens)
- ✅ Audio plays when unmuted
- ✅ No reconnect loops
- ✅ Selection engine stable (no thrashing)
- ✅ Device ID persists across restarts
- ✅ Session ID fresh on each connect

### Common Issues

**Mobile doesn't see web stream**
- Check: Are they in the same room? (both should log `live_central`)
- Check: Is web actually publishing? (check web console for tracks)
- Check: Does mobile have correct API URL? (check `.env` or `eas.json`)

**Video shows black screen**
- Check: Is web stream actually sending video? (check web preview)
- Check: Does mobile log "track subscribed"? (check debug logs)
- Check: Try focus mode (double-tap) to force video element creation

**Reconnect loop**
- Check: Is mobile hitting rate limits? (check LiveKit dashboard)
- Check: Are tokens valid? (check token expiry time)
- Check: Is server responding? (check API logs)

---

## Troubleshooting

### Build Fails

**Error: "Provisioning profile not found"**
- Solution: Run `npx eas credentials` to configure iOS credentials
- Ensure Apple Developer account is linked

**Error: "Duplicate bundle identifier"**
- Solution: Change `ios.bundleIdentifier` in `app.json`
- Must be unique across App Store

**Error: "EAS CLI version mismatch"**
- Solution: Update EAS CLI: `npm install -g eas-cli`

### Build Succeeds But Won't Install

**Error: "Untrusted Developer"**
- Solution: iOS Settings → General → Device Management → Trust developer

**Error: "App is damaged"**
- Solution: Reinstall from TestFlight or rebuild with correct provisioning

### Runtime Issues

**Error: "Failed to fetch token"**
- Check: Is `EXPO_PUBLIC_API_URL` correct?
- Check: Is web server running and accessible?
- Check: Does `/api/livekit/token` endpoint work? (test with curl)

**Video doesn't render**
- Enable debug mode: `EXPO_PUBLIC_DEBUG_LIVE=1`
- Check logs for "track subscribed" events
- Verify LiveKit room connection: "Connected successfully"

**Selection engine thrashing**
- Check logs for "[SELECTION]" events
- Verify random seed is persisted (should see "Loaded random seed")
- Verify `joinedAt` is stable (should see first-seen timestamps)

---

## Release Checklist

Before submitting to TestFlight or App Store:

### Pre-Build
- [ ] Update version in `app.json` (e.g., `1.0.1` → `1.0.2`)
- [ ] Set `EXPO_PUBLIC_DEBUG_LIVE=0` in production profile
- [ ] Update `EXPO_PUBLIC_API_URL` to production URL
- [ ] Test all gestures in debug build
- [ ] Run smoke test checklist
- [ ] Run web→mobile integration test

### Build
- [ ] Run: `npx eas build --platform ios --profile production`
- [ ] Wait for build to complete (check EAS dashboard)
- [ ] Download `.ipa` and archive locally

### Submit
- [ ] Run: `npx eas submit --platform ios --profile production`
- [ ] Or upload `.ipa` manually via App Store Connect
- [ ] Fill in release notes
- [ ] Submit for review

### Post-Submit
- [ ] Monitor crash reports in App Store Connect
- [ ] Test TestFlight build on multiple devices
- [ ] Verify no LiveKit reconnect loops in production
- [ ] Check analytics for session duration

---

## Quick Reference

### Most Common Commands

```bash
# Local dev (simulator)
cd mobile && npx expo start --ios

# Preview build (TestFlight)
cd mobile && npx eas build --platform ios --profile preview

# Production build (App Store)
cd mobile && npx eas build --platform ios --profile production

# Submit to TestFlight
cd mobile && npx eas submit --platform ios

# Check build status
npx eas build:list

# View build logs
npx eas build:view [build-id]
```

### Files to Check Before Building

1. `mobile/eas.json` - Build profiles and env vars
2. `mobile/app.json` - App metadata and version
3. `mobile/.env` - Local env vars (not used in cloud builds)
4. `mobile/package.json` - Dependencies and scripts

### Environment Variables by Profile

| Profile | DEBUG_LIVE | API_URL | Distribution |
|---------|-----------|---------|--------------|
| development | 1 | configurable | internal |
| preview | 0 | production | internal |
| production | 0 | production | store |

---

## Support

**EAS Build Issues**: https://docs.expo.dev/build/introduction/  
**LiveKit Issues**: https://docs.livekit.io/  
**Expo Forums**: https://forums.expo.dev/  

**Internal Docs**:
- `mobile/ARCHITECTURE_DIAGRAM.md` - System architecture
- `mobile/LIVEKIT_INTEGRATION.md` - LiveKit integration details
- `mobile/DEVICE_SESSION_IDS.md` - Device/session tracking
- `mobile/MOBILE_COMPLETE_STATUS.md` - Implementation status

---

**Last Updated**: 2025-12-24  
**Expo SDK**: 50  
**iOS Target**: 13.0+  
**Build System**: EAS Build







