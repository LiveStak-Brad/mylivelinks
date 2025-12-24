# Device and Session Identifiers - Mobile

## Summary

Mobile token requests now include stable device and session identifiers for multi-device session tracking.

## Implementation

### 1. Stable Device ID

**File**: `mobile/lib/deviceId.ts`

**Storage**: SecureStore (persists across app reinstalls)  
**Key**: `mylivelinks_device_id`  
**Format**: UUID v4  
**Lifetime**: Forever (until manually cleared)

```typescript
export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync('mylivelinks_device_id');
  if (existing) return existing;
  
  const newDeviceId = generateUUID();
  await SecureStore.setItemAsync('mylivelinks_device_id', newDeviceId);
  return newDeviceId;
}
```

**Fallback**: If SecureStore fails, generates session-only UUID.

### 2. Session ID

**Generated**: Once per room connection  
**Format**: UUID v4  
**Lifetime**: Single connection (new UUID on reconnect)

```typescript
export function generateSessionId(): string {
  return generateUUID();
}
```

### 3. Token Request Body

**Updated**: `mobile/hooks/useLiveRoomParticipants.ts` - `fetchToken()`

```typescript
{
  // New contract fields
  "roomName": "live_central",  // MUST match web constant
  "userId": "<mobile identity>",
  "displayName": "Mobile User",
  "deviceType": "mobile",
  "deviceId": "<stable UUID>",
  "sessionId": "<per-connection UUID>",
  "role": "viewer",
  
  // Legacy fields (backwards compatibility)
  "participantName": "Mobile User",
  "canPublish": false,
  "canSubscribe": true,
  "participantMetadata": {
    "platform": "mobile",
    "deviceType": "mobile",
    "deviceId": "<stable UUID>",
    "sessionId": "<per-connection UUID>"
  }
}
```

## Debug Logging

When `EXPO_PUBLIC_DEBUG_LIVE=1`:

```
[DEVICE] Retrieved existing ID: abc12345...
[SESSION] Generated new ID: def67890...
[TOKEN] Requesting token: {
  identity: 'mobile-1...',
  deviceType: 'mobile',
  deviceId: 'abc12345...',
  sessionId: 'def67890...',
  role: 'viewer'
}
[TOKEN] Fetched successfully: {
  urlPrefix: 'wss://...',
  tokenLength: 542,
  deviceType: 'mobile',
  deviceId: 'abc12345...',
  sessionId: 'def67890...',
  role: 'viewer'
}
```

## Use Cases

### Multi-Device Tracking
- Same user on multiple devices → different deviceIds
- Server can track which devices are active
- Useful for analytics and session management

### Session Management
- Each connection gets unique sessionId
- Server can distinguish between:
  - Same device, multiple sessions (app restart)
  - Same device, same session (reconnect)
  - Different devices, same user

### Analytics
- Device type breakdown (mobile vs web)
- Session duration tracking
- Reconnection patterns

## Backwards Compatibility

Token request includes both:
- **New contract**: `deviceType`, `deviceId`, `sessionId`, `role`
- **Legacy fields**: `participantName`, `canPublish`, `canSubscribe`, `participantMetadata`

Server can support both old and new mobile clients.

## Testing

### Test 1: Device ID Persistence
1. Launch app → Note device ID in logs
2. Kill app completely
3. Relaunch app
4. **Verify**: Same device ID

### Test 2: Session ID Uniqueness
1. Connect to room → Note session ID
2. Disconnect and reconnect
3. **Verify**: Different session ID

### Test 3: Token Request
1. Enable debug mode (`EXPO_PUBLIC_DEBUG_LIVE=1`)
2. Launch app and connect
3. **Verify**: Logs show deviceType, deviceId, sessionId, role

## Files Modified

```
mobile/
├── lib/
│   └── deviceId.ts                       # NEW - Device/session ID management
└── hooks/
    └── useLiveRoomParticipants.ts        # Updated token request
```

## What Was NOT Changed

✅ Selection engine integration (untouched)  
✅ joinedAt cache (untouched)  
✅ Gestures/grid mounting (untouched)  
✅ Room connection logic (only token request changed)  

## Commit Message

```
Mobile: add device/session identifiers to token request

- Create deviceId module with SecureStore persistence
- Generate stable device ID (UUID) on first launch
- Generate session ID (UUID) per room connection
- Update token request to include:
  - deviceType: "mobile"
  - deviceId: stable UUID
  - sessionId: per-connection UUID
  - role: "viewer"
- Add debug logging for device/session IDs
- Maintain backwards compatibility with legacy fields
- No changes to selection engine, gestures, or grid mounting
```

## Status: ✅ COMPLETE

Mobile token requests now include device and session identifiers for multi-device tracking. All existing functionality preserved.

