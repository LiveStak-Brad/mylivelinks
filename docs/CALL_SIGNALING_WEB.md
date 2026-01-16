# Web Call Signaling + RTC Integration

## Overview

1:1 voice/video call system for web using:
- **Signaling**: Supabase `calls` table + realtime subscriptions
- **RTC**: LiveKit (existing provider)
- **Phase 1**: In-app only (no push notifications)

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Caller    │     │  Supabase   │     │   Callee    │
│   Browser   │     │   (calls)   │     │   Browser   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ initiate_call()   │                   │
       │──────────────────>│                   │
       │                   │ realtime INSERT   │
       │                   │──────────────────>│
       │                   │                   │ onIncomingCall
       │                   │                   │
       │                   │   accept_call()   │
       │                   │<──────────────────│
       │ realtime UPDATE   │                   │
       │<──────────────────│                   │
       │                   │                   │
       │     ┌─────────────────────────────────┤
       │     │         LiveKit Room            │
       │     │       (call_<uuid>)             │
       └─────┴─────────────────────────────────┘
```

## Files Changed/Created

### New Files
- `supabase/migrations/20260115_calls_signaling.sql` - Schema + RPCs
- `hooks/useCallSessionWeb.ts` - Main hook for call lifecycle

### Modified Files
- `app/api/livekit/token/route.ts` - Added `call_*` room support
- `hooks/index.ts` - Export new hook

## Database Schema

### `calls` Table
```sql
id UUID PRIMARY KEY
caller_id UUID REFERENCES profiles(id)
callee_id UUID REFERENCES profiles(id)
call_type call_type ('voice' | 'video')
status call_status ('ringing' | 'accepted' | 'declined' | 'missed' | 'busy' | 'ended' | 'failed')
room_name TEXT UNIQUE  -- format: call_<uuid>
created_at TIMESTAMPTZ
answered_at TIMESTAMPTZ
ended_at TIMESTAMPTZ
ended_by UUID
end_reason TEXT
```

### RPC Functions
- `initiate_call(p_callee_id, p_call_type)` - Start a call
- `accept_call(p_call_id)` - Accept incoming call
- `decline_call(p_call_id)` - Decline incoming call
- `end_call(p_call_id, p_reason)` - End active call
- `mark_call_missed(p_call_id)` - Mark as missed (timeout)
- `get_incoming_call()` - Get current incoming call
- `get_active_call()` - Get current active call

## Hook API: `useCallSessionWeb`

```typescript
const {
  // State
  status,           // CallStatus
  activeCall,       // ActiveCall | null
  incomingCall,     // IncomingCall | null
  error,            // Error | null
  room,             // LiveKit Room | null
  remoteParticipant,// RemoteParticipant | null
  isAudioEnabled,   // boolean
  isVideoEnabled,   // boolean
  
  // Actions
  initiateCall,     // (calleeId: string, callType?: CallType) => Promise<boolean>
  acceptCall,       // () => Promise<boolean>
  declineCall,      // () => Promise<boolean>
  endCall,          // (reason?: string) => Promise<boolean>
  toggleAudio,      // () => Promise<void>
  toggleVideo,      // () => Promise<void>
  
  // Computed
  isInCall,         // boolean
  isRinging,        // boolean
  hasIncomingCall,  // boolean
} = useCallSessionWeb({
  onIncomingCall: (call) => { /* show UI */ },
  onCallEnded: (reason) => { /* cleanup */ },
  onError: (error) => { /* handle */ },
  enabled: true,
});
```

## Call Lifecycle

### Initiating a Call (Caller)
1. `initiateCall(calleeId, 'video')` called
2. Status: `idle` → `initiating` → `ringing`
3. DB: `calls` row created with `status='ringing'`
4. 60s timeout starts

### Receiving a Call (Callee)
1. Realtime subscription fires on INSERT
2. `onIncomingCall` callback triggered
3. Status: `idle` → `ringing`
4. UI shows incoming call modal

### Accepting a Call (Callee)
1. `acceptCall()` called
2. Status: `ringing` → `connecting` → `connected`
3. DB: `status='accepted'`, `answered_at` set
4. Both parties connect to LiveKit room `call_<uuid>`

### Declining a Call (Callee)
1. `declineCall()` called
2. Status: `ringing` → `idle`
3. DB: `status='declined'`
4. Caller sees `declined` status via realtime

### Ending a Call (Either Party)
1. `endCall('hangup')` called
2. Status: `connected` → `ending` → `ended` → `idle`
3. DB: `status='ended'`, `ended_at`, `ended_by` set
4. Both parties disconnect from LiveKit
5. Media devices released

## Testing Instructions

### Prerequisites
1. Apply migration: `supabase db push` or run SQL manually
2. Two browser windows (or two different browsers)
3. Two authenticated user accounts

### Test 1: Basic Video Call
1. **User A**: Open app, navigate to User B's profile
2. **User A**: Click "Video Call" button (UI not included - implement separately)
3. **User B**: Should see incoming call notification
4. **User B**: Click "Accept"
5. **Both**: Should see each other's video
6. **Either**: Click "End Call"
7. **Both**: Should return to idle state

### Test 2: Decline Call
1. **User A**: Initiate call to User B
2. **User B**: Click "Decline"
3. **User A**: Should see "Call declined" status
4. **Both**: Should return to idle

### Test 3: Missed Call (Timeout)
1. **User A**: Initiate call to User B
2. **User B**: Do nothing for 60 seconds
3. **User A**: Should see "Call missed" status
4. **Both**: Should return to idle

### Test 4: Busy Status
1. **User A**: Initiate call to User B
2. **User B**: Accept the call
3. **User C**: Try to call User B
4. **User C**: Should see "User is busy" error

### Test 5: Refresh Mid-Call
1. **User A & B**: In active call
2. **User A**: Refresh browser
3. **User A**: Should reconnect to call automatically
4. **Both**: Call should continue

### Test 6: Close Tab Mid-Call
1. **User A & B**: In active call
2. **User A**: Close browser tab
3. **User B**: Should see remote participant disconnect
4. **User B**: Can end call normally

## Edge Cases Handled

| Edge Case | Handling |
|-----------|----------|
| Self-call | Blocked by DB constraint + RPC check |
| Already in call | RPC returns error, UI should prevent |
| Callee busy | RPC checks for active calls, returns "busy" |
| Ring timeout | 60s timeout marks call as "missed" |
| Decline | Updates status, notifies caller via realtime |
| End call | Either party can end, both notified |
| Refresh mid-call | `get_active_call()` on mount reconnects |
| Network disconnect | LiveKit handles reconnection |
| Tab close | Call remains in DB, other party can end |
| Double accept | RPC checks status, rejects if not "ringing" |
| Race conditions | DB constraints + RLS prevent duplicates |

## Security

- **RLS**: Users can only see/modify calls they're part of
- **Token validation**: `/api/livekit/token` verifies call participant via DB
- **CORS**: Token endpoint has strict origin allowlist
- **Auth**: All RPCs require authenticated user

## Future Enhancements (Phase 2+)

- Push notifications for incoming calls
- Call history UI
- Voicemail/missed call notifications
- Group calls (3+ participants)
- Screen sharing during calls
- Call recording (with consent)

---

*Context improved by Giga AI - used main overview for Live Room Management patterns*
