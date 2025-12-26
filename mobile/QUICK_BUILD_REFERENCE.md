# Quick Build Reference Card

Fast reference for common build operations.

---

## 🚀 Build Commands

```bash
# Preview build (TestFlight-ready)
cd mobile && npx eas build --platform ios --profile preview

# Production build (App Store)
cd mobile && npx eas build --platform ios --profile production

# Development build (debug)
cd mobile && npx eas build --platform ios --profile development
```

---

## 🧪 Testing Commands

```bash
# Run in simulator (local dev)
cd mobile && npx expo start --ios

# Check build status
npx eas build:list

# View specific build
npx eas build:view [build-id]
```

---

## 📋 Pre-Build Checklist

- [ ] `app.json` version updated
- [ ] Web server accessible at API URL
- [ ] LiveKit credentials valid on server
- [ ] Both web and mobile use `live_central` room

---

## ✅ Post-Install Test

1. **Launch app** → Should load without crash
2. **Check connection** → Debug logs show "Connected successfully"
3. **Web→Mobile** → Web goes live, mobile sees stream in 2 seconds
4. **Stability** → No reconnect loops for 2 minutes
5. **Gestures** → Long-press, double-tap, swipes all work

---

## 🔧 Environment Variables

```bash
# mobile/eas.json profiles
development:  DEBUG_LIVE=1, API_URL=https://mylivelinks.com
preview:      DEBUG_LIVE=0, API_URL=https://mylivelinks.com
production:   DEBUG_LIVE=0, API_URL=https://mylivelinks.com
```

---

## ⚠️ Critical Constants

**Room Name** (MUST match web):
- Web: `'live_central'` (from `lib/livekit-constants.ts`)
- Mobile: `'live_central'` (from `hooks/useLiveRoomParticipants.ts`)

**Token Endpoint**:
- `POST /api/livekit/token`
- Body: `{ roomName, userId, deviceType, deviceId, sessionId, role }`
- Response: `{ token, url }`

---

## 📝 Quick Smoke Test

```bash
# 1. Install build on device
# 2. Launch app
# 3. Verify grid shows (4x3, 12 tiles)
# 4. Check logs: [LIVEKIT] Connected successfully
# 5. Open web, go live
# 6. Verify mobile shows stream within 2 seconds
# 7. Wait 2 minutes, no reconnect loops
# 8. Test gestures: long-press, double-tap, swipes
```

---

## 🆘 Common Issues

**"Failed to fetch token"**
→ Check `EXPO_PUBLIC_API_URL` in build profile

**"Reconnect loop"**
→ Check LiveKit rate limits, token expiry

**"Video doesn't render"**
→ Enable debug mode, check "track subscribed" logs

**"Room name mismatch"**
→ Verify both web and mobile use `'live_central'`

---

## 📚 Full Documentation

- `BUILD_RUNBOOK.md` - Complete build guide
- `BUILD_SMOKE_TEST.md` - Detailed test checklist
- `BUILD_READINESS_SUMMARY.md` - Readiness overview
- `ENV_EXAMPLE.md` - Environment variable guide

---

**Status**: ✅ Ready for TestFlight  
**Last Updated**: 2025-12-24





