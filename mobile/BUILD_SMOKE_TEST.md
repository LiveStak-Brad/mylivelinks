# Build Smoke Test Checklist

Quick validation checklist to run after installing any build (dev, preview, or production).

---

## 🎯 Test Environment

- [ ] **Build Profile**: ___________ (development / preview / production)
- [ ] **Build Number**: ___________ (from EAS dashboard or Xcode)
- [ ] **iOS Version**: ___________ (device or simulator OS)
- [ ] **Device Model**: ___________ (iPhone 14, iPad Pro, etc.)
- [ ] **Tester Name**: ___________
- [ ] **Date**: ___________

---

## ✅ 1. Installation & Launch

**Goal**: Verify app installs and launches without crashing.

- [ ] App installed successfully from TestFlight/Xcode/EAS
- [ ] App icon appears on home screen
- [ ] Tap app icon
- [ ] Splash screen appears (black background, logo)
- [ ] App transitions to main screen within 3 seconds
- [ ] No crash or freeze during launch

**If Failed**: Check device console logs, reinstall, verify build profile.

---

## ✅ 2. UI Render

**Goal**: Verify main UI elements render correctly.

- [ ] 4x3 grid (12 empty tiles) visible
- [ ] All tiles have grey placeholder background
- [ ] Debug pill visible (if development build)
- [ ] No white screens or blank areas
- [ ] Grid fills screen in landscape orientation

**If Failed**: Check device orientation lock, verify screen dimensions.

---

## ✅ 3. Room Connection

**Goal**: Verify LiveKit room connection succeeds.

- [ ] Check debug logs (if development build): `[LIVEKIT] Connecting to room`
- [ ] Wait up to 5 seconds
- [ ] Debug logs show: `[LIVEKIT] Connected successfully`
- [ ] Debug pill shows: `Connected: true` (if development build)
- [ ] No error messages or toasts
- [ ] No repeated connection attempts (reconnect loop)

**Debug Commands** (if development build):
- Enable debug mode: Verify `EXPO_PUBLIC_DEBUG_LIVE=1` in build profile
- Watch for: `[TOKEN]`, `[LIVEKIT]`, `[DEVICE]`, `[SESSION]` log prefixes

**If Failed**:
- Check: Is `EXPO_PUBLIC_API_URL` correct in build profile?
- Check: Is web server responding at `/api/livekit/token`?
- Check: Are LiveKit credentials valid on server?

---

## ✅ 4. Video Rendering (If Streamers Live)

**Goal**: Verify video renders when participants publish.

### Prerequisites
- At least one web user must be publishing to `live_central` room
- Or use test publisher (see "Web Publisher Test" below)

### Test Steps
- [ ] Web user goes live (publishes video)
- [ ] Mobile: Within 2 seconds, video appears in grid tile
- [ ] Video plays smoothly (no freezing or stuttering)
- [ ] Video fills tile correctly (no black bars or stretching)
- [ ] Audio plays (if tile not muted)
- [ ] Username/avatar appears on tile overlay

**If No Streamers Available**: Skip to "Stability Test" and return later.

**If Failed**:
- Check: Does debug log show "track subscribed"?
- Check: Is web stream actually publishing? (check web console)
- Check: Are web and mobile in same room? (both should log `live_central`)

---

## ✅ 5. Stability Test (2 Minutes)

**Goal**: Verify app remains stable without crashes or reconnects.

- [ ] Start timer: __:__ (current time)
- [ ] Let app run for 2 minutes undisturbed
- [ ] App remains connected (no "Disconnected" state)
- [ ] No reconnection attempts in logs (no repeated `[LIVEKIT] Connecting`)
- [ ] No crashes or freezes
- [ ] Memory usage stable (check Xcode Instruments if available)
- [ ] End timer: __:__ (2 minutes later)

**Debug Logs to Watch** (if development build):
- ✅ Good: Steady state, occasional `[PARTICIPANT]` events
- ❌ Bad: Repeated `[LIVEKIT] Connecting`, `[TOKEN]` fetching, disconnects

**If Failed**:
- Reconnect loop: Check LiveKit rate limits, token expiry, server logs
- Crash: Check device console, memory usage, background tasks

---

## ✅ 6. Gesture Tests

**Goal**: Verify gesture system works correctly.

### Long-Press (Edit Mode)
- [ ] Long-press on any tile
- [ ] Visual indicator appears (border or scale animation)
- [ ] "Exit Edit Mode" button appears
- [ ] Can drag tile to reorder (tiles swap positions)
- [ ] Tap "Exit Edit Mode" button
- [ ] Visual indicator disappears

### Double-Tap (Focus Mode)
- [ ] Double-tap on any tile with video
- [ ] Tile expands to fill most of screen
- [ ] Other tiles minimize to small strip
- [ ] Audio plays from focused tile only
- [ ] Double-tap again to exit focus mode
- [ ] Grid returns to normal 4x3 layout

### Swipe Gestures
- [ ] Swipe UP: Chat overlay appears (translucent)
- [ ] Swipe DOWN: Viewers/Leaderboards overlay appears
- [ ] Swipe RIGHT: Menu overlay appears
- [ ] Swipe LEFT: Stats overlay appears
- [ ] Each overlay is semi-transparent (can see grid behind)
- [ ] Tap outside overlay to dismiss
- [ ] Grid remains visible and mounted

**If Failed**:
- Check: Is gesture handler installed? (should be in dependencies)
- Check: Are gestures being blocked by another gesture?

---

## ✅ 7. Multi-Participant Test

**Goal**: Verify app handles multiple streamers correctly.

### Prerequisites
- Access to web app at `https://mylivelinks.com/live`
- Multiple test accounts (or one account in multiple browser tabs)

### Test Steps
- [ ] Web: Open browser, go live from 1 account
- [ ] Mobile: Verify 1 video tile appears
- [ ] Web: Open another tab, go live from 2nd account
- [ ] Mobile: Verify 2 video tiles appear
- [ ] Web: Repeat until 12+ accounts are live
- [ ] Mobile: Verify exactly 12 tiles filled (selection engine)
- [ ] Mobile: Verify no thrashing (tiles don't flicker/swap)
- [ ] Web: Stop 1 stream
- [ ] Mobile: Tile empties within 2 seconds
- [ ] Mobile: No crash or reconnect

**If Failed**:
- Thrashing: Check selection engine logs `[SELECTION]`
- Missing videos: Check subscription logs `[SUB]`
- Crash: Check memory usage, video decoder limits

---

## ✅ 8. Device/Session Tracking (Debug Build Only)

**Goal**: Verify device ID persists and session ID is fresh.

### First Launch
- [ ] Check logs: `[DEVICE] Generated new ID: abc12345...`
- [ ] Check logs: `[SESSION] Generated new ID: def67890...`
- [ ] Check logs: `[TOKEN] Requesting token: { deviceType: 'mobile', deviceId: 'abc12345...', sessionId: 'def67890...', role: 'viewer' }`
- [ ] Note device ID: ___________

### Second Launch (After Full App Restart)
- [ ] Kill app completely (swipe up in app switcher)
- [ ] Relaunch app
- [ ] Check logs: `[DEVICE] Retrieved existing ID: abc12345...`
- [ ] Verify device ID matches previous: ___________
- [ ] Check logs: `[SESSION] Generated new ID: xyz12345...`
- [ ] Verify session ID is DIFFERENT from previous

**Expected Behavior**:
- Device ID: **Same** across launches (persisted in SecureStore)
- Session ID: **Different** each launch (generated fresh)

**If Failed**:
- Device ID not persisting: Check SecureStore permissions, device storage
- Session ID not changing: Check UUID generation logic

---

## ✅ 9. Web→Mobile Integration Test

**Goal**: Verify web and mobile work together in same room.

### Test Steps
1. **Setup**:
   - [ ] Mobile: Launch app, verify connected
   - [ ] Web: Open browser to `https://mylivelinks.com/live`
   - [ ] Web: Login (or continue as guest if auth disabled)

2. **Web Publishes**:
   - [ ] Web: Click "Go Live" button
   - [ ] Web: Allow camera/microphone permissions
   - [ ] Web: Verify video preview shows self
   - [ ] Web: Check console logs: `Publishing to room: live_central`

3. **Mobile Receives**:
   - [ ] Mobile: Within 2 seconds, web stream appears in grid
   - [ ] Mobile: Video plays smoothly
   - [ ] Mobile: Double-tap to focus
   - [ ] Mobile: Audio plays from web stream

4. **Verify Same Room**:
   - [ ] Mobile logs: `[ROOM] Connected: { room: 'live_central', ... }`
   - [ ] Web logs: `Room: live_central`
   - [ ] Both should match: **`live_central`**

**If Failed**:
- Different room names: Check constants (web: `lib/livekit-constants.ts`, mobile: `hooks/useLiveRoomParticipants.ts`)
- Mobile doesn't see web: Check token endpoint response, verify web is actually publishing
- Video doesn't render: Check track subscription logs, verify video track exists

---

## ✅ 10. Performance Check

**Goal**: Verify app performs well under load.

- [ ] CPU usage stable (< 50% average on device)
- [ ] Memory usage stable (< 200 MB for viewer mode)
- [ ] No overheating (device not hot to touch)
- [ ] UI remains responsive (no lag on gestures)
- [ ] Video decoding smooth (no dropped frames)

**Tools**:
- Xcode Instruments (if Mac available)
- Device Settings → Battery (check app usage)
- Visual inspection (watch for jank)

**If Failed**:
- High CPU: Check video decoder settings, reduce quality
- High memory: Check for leaks, excessive track subscriptions
- Laggy UI: Check for blocking operations on main thread

---

## 📊 Test Summary

### Pass/Fail Status

| Test | Status | Notes |
|------|--------|-------|
| Installation & Launch | ☐ Pass ☐ Fail | |
| UI Render | ☐ Pass ☐ Fail | |
| Room Connection | ☐ Pass ☐ Fail | |
| Video Rendering | ☐ Pass ☐ Fail ☐ Skip | |
| Stability (2min) | ☐ Pass ☐ Fail | |
| Gesture Tests | ☐ Pass ☐ Fail | |
| Multi-Participant | ☐ Pass ☐ Fail ☐ Skip | |
| Device/Session IDs | ☐ Pass ☐ Fail ☐ Skip | |
| Web→Mobile Integration | ☐ Pass ☐ Fail | |
| Performance | ☐ Pass ☐ Fail | |

### Overall Result

- [ ] **PASS** - Ready for next stage (TestFlight / production)
- [ ] **FAIL** - Issues found, need fixes (see notes below)

### Issues Found

1. ___________________________________________________________
2. ___________________________________________________________
3. ___________________________________________________________

### Notes

________________________________________________________________
________________________________________________________________
________________________________________________________________

---

## 🚀 Web Publisher Test Setup (Optional)

If you don't have a live web publisher, use this quick setup:

```bash
# In web project terminal
cd .. # Go to web root
npm run dev

# Open browser to http://localhost:3000/live
# Click "Go Live"
# Allow camera/microphone
# Verify video preview shows

# Check console for:
# "Publishing to room: live_central"
```

For physical device testing, use ngrok:
```bash
npx ngrok http 3000
# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Update mobile/.env: EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
# Rebuild mobile app with new env var
```

---

## 📝 Next Steps

**If All Tests Pass**:
- Proceed to TestFlight distribution
- Run extended soak test (30+ minutes)
- Test on multiple device models/iOS versions

**If Any Tests Fail**:
- Document issues in bug tracker
- Review relevant documentation (see below)
- Fix and rebuild
- Re-run smoke test

**Documentation**:
- `mobile/BUILD_RUNBOOK.md` - Build commands and troubleshooting
- `mobile/ARCHITECTURE_DIAGRAM.md` - System architecture
- `mobile/LIVEKIT_INTEGRATION.md` - LiveKit integration details
- `mobile/DEVICE_SESSION_IDS.md` - Device/session tracking

---

**Test Template Version**: 1.0  
**Last Updated**: 2025-12-24  
**Required iOS**: 13.0+  
**Required Expo SDK**: 50





