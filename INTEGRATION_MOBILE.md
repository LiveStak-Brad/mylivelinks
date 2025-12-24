# Mobile Integration Guide - MyLiveLinks LiveKit

This document specifies the exact integration points for mobile apps (iOS/Android) to connect to MyLiveLinks LiveKit rooms.

## Room Configuration

### Shared Room Name
**Constant**: `live_central`

All clients (web and mobile) connect to this single shared room. This enables:
- Multi-viewer experience
- Real-time participant discovery
- Unified chat and presence

**Environment Variables** (for mobile):
```
LIVEKIT_URL=wss://mylivelinks-xxxxxxxxx.livekit.cloud
LIVEKIT_ROOM_NAME=live_central
```

---

## Token Endpoint

### API Endpoint
```
POST https://mylivelinks.com/api/livekit/token
```

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>  (optional, for authenticated users)
```

### Request Body
```json
{
  "roomName": "live_central",
  "participantName": "<USER_ID_OR_DEVICE_ID>",
  "canPublish": true,
  "canSubscribe": true
}
```

**Field Descriptions:**
- `roomName`: Must be `"live_central"` (hardcoded constant)
- `participantName`: Unique identifier for this client
  - **Authenticated users**: Use Supabase user UUID (e.g., `"2b4a1178-3c39-4179-94ea-314dd824a818"`)
  - **Anonymous users**: Use device-specific ID (e.g., `"device-ios-<UUID>"` or `"device-android-<UUID>"`)
- `canPublish`: Set to `true` if user can stream (streamers)
- `canSubscribe`: Always `true` for viewing streams

### Response (Success)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsUrl": "wss://mylivelinks-xxxxxxxxx.livekit.cloud"
}
```

### Response (Error)
```json
{
  "error": "Invalid room name or missing credentials"
}
```

---

## Mobile Client Connection Flow

### 1. Get LiveKit Token
```typescript
// Example (TypeScript/React Native)
const token = await fetch('https://mylivelinks.com/api/livekit/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAccessToken}`, // if authenticated
  },
  body: JSON.stringify({
    roomName: 'live_central',
    participantName: userId || deviceId,
    canPublish: isStreamer,
    canSubscribe: true,
  }),
});

const { token: livekitToken, wsUrl } = await token.json();
```

### 2. Connect to Room
```typescript
import { Room } from 'livekit-client'; // or native SDK

const room = new Room({
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: {
      width: 1280,
      height: 720,
      frameRate: 30,
    },
  },
});

await room.connect(wsUrl, livekitToken);
console.log('Connected to room:', room.name);
```

### 3. Subscribe to Remote Participants
```typescript
room.on('participantConnected', (participant) => {
  console.log('Participant joined:', participant.identity);
  
  // Subscribe to their tracks
  participant.on('trackSubscribed', (track, publication) => {
    if (track.kind === 'video') {
      // Attach video track to UI
      const videoElement = document.createElement('video');
      track.attach(videoElement);
      videoElement.play();
    } else if (track.kind === 'audio') {
      // Attach audio track
      const audioElement = document.createElement('audio');
      track.attach(audioElement);
      audioElement.play();
    }
  });
});
```

### 4. Publish Local Tracks (Streamers Only)
```typescript
if (isStreamer) {
  const localTracks = await createLocalTracks({
    audio: true,
    video: {
      resolution: {
        width: 1280,
        height: 720,
        frameRate: 30,
      },
    },
  });

  for (const track of localTracks) {
    await room.localParticipant.publishTrack(track);
    console.log('Published track:', track.kind);
  }
}
```

---

## Debug Logging

When `NEXT_PUBLIC_DEBUG_LIVEKIT=1` is set, the web client logs:
- `[ROOM] connected room=<name> identity=<id>`
- `[TOKEN] fetched token identity=<id> room=<name>`
- `[PUBLISH] GoLive clicked`
- `[PUBLISH] after publish pubs: video=<n> audio=<n>`

Mobile clients should implement similar logging for consistency.

---

## Important Notes

### Publishing Stability
- Web publishes **immediately** on "Go Live" (no preview mode)
- Publishing does **NOT** depend on:
  - Viewer count
  - Presence in database
  - Tile selection
  - Grid state
- Tracks remain published until "Stop Live" is clicked

### Identity Requirements
- **Must be unique per client** (UUID recommended)
- **Must be stable across reconnections** (same user = same identity)
- Format: `<uuid>` for authenticated, `device-<platform>-<uuid>` for anonymous

### Room Permissions
- All participants can publish (controlled by token)
- All participants can subscribe
- Room is open (no explicit join required beyond token auth)

### Video Quality
**Recommended settings:**
- Resolution: 1280x720 (720p)
- Frame rate: 30 fps
- Bitrate: Adaptive (handled by LiveKit)

---

## Testing Checklist

### Web → Mobile Viewing
1. ✅ Web user goes live
2. ✅ Mobile joins room
3. ✅ Mobile sees web participant
4. ✅ Mobile receives video/audio tracks
5. ✅ Tracks play smoothly

### Mobile → Web Viewing
1. ✅ Mobile user goes live
2. ✅ Web sees mobile participant
3. ✅ Web receives tracks
4. ✅ Tracks display in grid

### Multi-Viewer
1. ✅ Multiple mobile clients can view same web stream
2. ✅ Multiple web clients can view same mobile stream
3. ✅ No connection drops during UI changes

---

## Troubleshooting

### "No remote participants visible"
- Check token has correct `roomName: "live_central"`
- Verify `canSubscribe: true` in token request
- Ensure room is connected before expecting participants

### "Cannot publish tracks"
- Check token has `canPublish: true`
- Verify `participantName` is unique and valid
- Ensure local tracks are created before publishing

### "Tracks disconnect on grid changes"
- This is a web-only issue (fixed in latest version)
- Mobile should maintain stable connection regardless of web UI state

---

## SDK Versions

**Web**: `livekit-client` ^2.x
**iOS**: `LiveKit-Swift` ^2.x
**Android**: `livekit-android` ^2.x

---

## Contact

For integration support, contact the development team or refer to:
- LiveKit Documentation: https://docs.livekit.io
- MyLiveLinks API Docs: https://mylivelinks.com/docs (coming soon)

