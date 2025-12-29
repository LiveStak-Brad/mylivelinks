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

## Environment Configuration

### API Base URL

**Mobile apps must configure the API base URL to work on physical devices (not localhost).**

#### Development vs Production

| Environment | Base URL | Usage |
|-------------|----------|-------|
| **Development** | `https://mylivelinks.com` | Local dev with Expo Go |
| **Preview** | `https://mylivelinks.com` | TestFlight/Internal builds |
| **Production** | `https://mylivelinks.com` | App Store builds |

#### Environment Variable Setup

**Mobile (EAS Build)** - Configured in `mobile/eas.json`:
```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://mylivelinks.com",
        "EXPO_PUBLIC_DEBUG_LIVE": "1"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://mylivelinks.com",
        "EXPO_PUBLIC_DEBUG_LIVE": "0"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://mylivelinks.com",
        "EXPO_PUBLIC_DEBUG_LIVE": "0"
      }
    }
  }
}
```

**Mobile Code** - Uses environment variable with fallback:
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://mylivelinks.com';
const TOKEN_ENDPOINT = `${API_BASE_URL}/api/livekit/token`;
```

**Important Notes:**
- ✅ **Never use `localhost` or `127.0.0.1` in mobile builds** - physical devices can't reach localhost
- ✅ **Use production URL for all builds** - ensures token endpoint is always reachable
- ✅ **CORS is enabled on API routes** - mobile apps can make requests from any origin
- ✅ **Fallback is built-in** - if env var is missing, defaults to production URL

#### Local Development Options

If you need to test against a local Next.js server (e.g., `http://192.168.1.10:3000`):

1. **Find your local machine's IP address:**
   ```bash
   # macOS/Linux
   ipconfig getifaddr en0
   
   # Windows
   ipconfig
   ```

2. **Set environment variable in mobile app:**
   ```typescript
   // For Expo Go development only
   const API_BASE_URL = __DEV__ 
     ? 'http://192.168.1.10:3000'  // Your local IP
     : 'https://mylivelinks.com';
   ```

3. **Update Next.js to allow connections:**
   ```bash
   # Run Next.js on all network interfaces
   npm run dev -- -H 0.0.0.0
   ```

**⚠️ Warning:** Local IP testing only works on the same WiFi network and is not recommended for production builds.

---

## Token Endpoint

### API Endpoint
```
POST https://mylivelinks.com/api/livekit/token
```

**CORS Support:** ✅ Enabled for mobile requests

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
  "userId": "<USER_ID_OR_ANON_ID>",
  "displayName": "<DISPLAY_NAME>",
  "deviceType": "mobile",
  "deviceId": "<STABLE_DEVICE_UUID>",
  "sessionId": "<PER_CONNECTION_UUID>",
  "role": "viewer",
  "canPublish": false,
  "canSubscribe": true
}
```

**Field Descriptions:**
- `roomName`: Must be `"live_central"` (hardcoded constant)
- `participantName`: Display name for UI (legacy, still required)
- `userId`: Supabase user UUID or anonymous ID
- `displayName`: User-friendly name for UI
- `deviceType`: `"web"` or `"mobile"` (required for device-scoped identity)
- `deviceId`: Stable UUID per device/install (stored in device storage)
- `sessionId`: Unique UUID per connection attempt (generated fresh each time)
- `role`: `"viewer"` or `"publisher"` (viewers don't publish)
- `canPublish`: Set to `true` only for streamers
- `canSubscribe`: Always `true` for viewing streams

**Device-Scoped Identity:**
The server builds the LiveKit identity as:
```
u_<userId>:<deviceType>:<deviceId>:<sessionId>
```

This allows the same user account to:
- Stream on web (`u_123:web:abc:xyz`)
- View on mobile (`u_123:mobile:def:uvw`)
- Without identity collisions or reconnect loops

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
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Get or create device ID (stable per install)
let deviceId = await AsyncStorage.getItem('mylivelinks_device_id');
if (!deviceId) {
  deviceId = uuidv4();
  await AsyncStorage.setItem('mylivelinks_device_id', deviceId);
}

// Generate session ID (unique per connection)
const sessionId = uuidv4();

const response = await fetch('https://mylivelinks.com/api/livekit/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAccessToken}`, // if authenticated
  },
  body: JSON.stringify({
    roomName: 'live_central',
    participantName: userId || deviceId,
    userId: userId || `anon-${deviceId}`,
    displayName: userDisplayName || 'Mobile Viewer',
    deviceType: 'mobile',
    deviceId: deviceId,
    sessionId: sessionId,
    role: isStreamer ? 'publisher' : 'viewer',
    canPublish: isStreamer,
    canSubscribe: true,
  }),
});

const { token: livekitToken, url: wsUrl } = await response.json();
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

