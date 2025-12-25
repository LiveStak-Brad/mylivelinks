# Agent 1 Deliverables - Web LiveKit Stability for Mobile

## ✅ Mission Complete

Web LiveKit integration is now stable and ready for mobile clients to connect and view streams.

---

## 1. Shared Room Name Constant

### File: `lib/livekit-constants.ts`

```typescript
export const LIVEKIT_ROOM_NAME = 'live_central' as const;
```

**Usage:**
- Web uses this constant for all room connections
- Mobile should use the same value: `"live_central"`
- **DO NOT CHANGE** without coordinating mobile app updates

**Also Exported:**
- `DEBUG_LIVEKIT` - Debug flag (set `NEXT_PUBLIC_DEBUG_LIVEKIT=1`)
- `TOKEN_ENDPOINT` - `/api/livekit/token`
- `VIDEO_PRESETS` - HD/SD quality settings
- `ROOM_OPTIONS` - Connection options

---

## 2. Token Endpoint Documentation

### Endpoint
```
POST https://mylivelinks.com/api/livekit/token
```

### Request
```json
{
  "roomName": "live_central",
  "participantName": "<USER_ID_OR_DEVICE_ID>",
  "canPublish": true,
  "canSubscribe": true
}
```

### Response
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "url": "wss://mylivelinks-xxxxxxxxx.livekit.cloud"
}
```

**Full Documentation:** See `INTEGRATION_MOBILE.md`

---

## 3. Debug Logging (NEXT_PUBLIC_DEBUG_LIVEKIT=1)

When debug mode is enabled, the following logs appear:

### Token Request
```
[TOKEN] Requesting token: {
  endpoint: '/api/livekit/token',
  roomName: 'live_central',
  identity: '2b4a1178-3c39-4179-94ea-314dd824a818',
  canPublish: true,
  canSubscribe: true
}
```

### Token Received
```
[TOKEN] fetched token {
  identity: '2b4a1178-3c39-4179-94ea-314dd824a818',
  room: 'live_central',
  hasToken: true,
  hasUrl: true,
  tokenLength: 487
}
```

### Room Created
```
[ROOM] created {
  roomInstanceId: 1,
  room: 'live_central',
  timestamp: '2024-12-24T12:34:56.789Z'
}
```

### Room Connected
```
[ROOM] connected {
  room: 'live_central',
  identity: '2b4a1178-3c39-4179-94ea-314dd824a818',
  roomState: 'connected',
  localParticipantSid: 'PA_DGMbZ8yuys6z',
  remoteParticipantsCount: 0,
  canPublish: true,
  canSubscribe: true
}
```

### Go Live Clicked
```
[PUBLISH] GoLive clicked {
  reason: 'user action',
  roomConnected: true,
  roomState: 'connected'
}
```

### After Publish
```
[PUBLISH] after publish pubs: {
  video: 1,
  audio: 1,
  total: 2
}
```

---

## 4. Stability Guarantees

### ✅ Single Room Instance
- Only ONE `Room` instance created per client session
- Tracked via `roomInstanceIdRef`
- Logs show `roomInstanceId: 1` (never increments unless page reload)

### ✅ Stable Identity
- Web uses Supabase user UUID as identity
- Anonymous users get stable device ID from localStorage
- Same user = same identity across reconnections

### ✅ Publishing Independence
- Publishing triggered ONLY by "Go Live" button
- Does NOT depend on:
  - Viewer count
  - Database `is_published` flag
  - Tile selection
  - Grid state changes
- Tracks remain published until "Stop Live" clicked

### ✅ No Grid-Driven Remounts
- Grid changes do NOT cause room disconnection
- Tile rerenders do NOT unpublish tracks
- Subscription depends only on participant presence

---

## 5. Acceptance Tests

### Test 1: Web Alone
```
✅ Go Live → publications become >0 and remain
✅ Check console: [PUBLISH] after publish pubs: {video: 1, audio: 1}
✅ Tracks stay published during grid changes
```

### Test 2: Web + Second Web Tab
```
✅ Tab 1: Go Live
✅ Tab 2: Opens /live
✅ Tab 2 sees remote participant
✅ Tab 2 receives video/audio tracks
✅ Both tabs remain connected
```

### Test 3: No Publish/Unpublish Loops
```
✅ Go Live once
✅ Change sort mode (Randomize, Most Viewed, etc.)
✅ Close/open tiles
✅ Tracks remain published (no flapping)
✅ Console shows NO repeated [PUBLISH] logs
```

---

## 6. Mobile Integration Steps

### Step 1: Install LiveKit SDK
```bash
# iOS
pod 'LiveKit'

# Android
implementation 'io.livekit:livekit-android:2.x.x'

# React Native
npm install @livekit/react-native
```

### Step 2: Get Token
```typescript
const response = await fetch('https://mylivelinks.com/api/livekit/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomName: 'live_central',
    participantName: userId,
    canPublish: false,  // viewers don't publish
    canSubscribe: true,
  }),
});

const { token, url } = await response.json();
```

### Step 3: Connect to Room
```typescript
const room = new Room();
await room.connect(url, token);

room.on('participantConnected', (participant) => {
  console.log('Participant joined:', participant.identity);
});

room.on('trackSubscribed', (track, publication, participant) => {
  if (track.kind === 'video') {
    // Attach video track to UI
  }
});
```

### Step 4: Test
1. Web user goes live
2. Mobile connects to room
3. Mobile sees web participant
4. Mobile receives video/audio tracks
5. ✅ Success!

---

## 7. Files Modified/Created

### Created
- ✅ `lib/livekit-constants.ts` - Shared constants
- ✅ `INTEGRATION_MOBILE.md` - Full mobile integration guide
- ✅ `AGENT_1_DELIVERABLES.md` - This file

### Modified
- ✅ `components/LiveRoom.tsx` - Use constants, add debug logs
- ✅ `hooks/useLiveKitPublisher.ts` - Add publish debug logs

---

## 8. Environment Variables Required

### Web (Already Set)
```
LIVEKIT_URL=wss://mylivelinks-xxxxxxxxx.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_DEBUG_LIVEKIT=1  (optional, for debugging)
```

### Mobile (To Be Set)
```
LIVEKIT_URL=wss://mylivelinks-xxxxxxxxx.livekit.cloud
LIVEKIT_ROOM_NAME=live_central
API_BASE_URL=https://mylivelinks.com
```

---

## 9. Next Steps for Mobile Team

1. ✅ Read `INTEGRATION_MOBILE.md` for full integration guide
2. ✅ Use `LIVEKIT_ROOM_NAME = "live_central"` constant
3. ✅ Implement token fetching from `/api/livekit/token`
4. ✅ Connect to room using LiveKit SDK
5. ✅ Subscribe to remote participants
6. ✅ Test with web client

---

## 10. Support

For questions or issues:
- Check `INTEGRATION_MOBILE.md` for detailed examples
- Review debug logs with `NEXT_PUBLIC_DEBUG_LIVEKIT=1`
- Verify token endpoint returns valid token
- Ensure room name is exactly `"live_central"`

---

**Status: ✅ COMPLETE - Web is stable and ready for mobile integration**



