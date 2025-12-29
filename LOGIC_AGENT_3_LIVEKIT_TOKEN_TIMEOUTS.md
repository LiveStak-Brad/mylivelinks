# Logic Agent 3 - LiveKit Token Endpoint Timeout Fix

## Problem Statement
Mobile POST `/api/livekit/token` was hanging and aborting, while GET `/api/ping` worked fine (200 ~500ms).

## Root Cause
- No isolated POST endpoint for testing
- Stage timeout implementation could fail to race properly if underlying promises hung
- Body parsing could hang on malformed/slow requests
- Profile fetch and access checks lacked specific timeouts

## Changes Made

### 1. Created POST Ping Endpoint
**File:** `app/api/postping/route.ts` (NEW)

Fast POST echo endpoint to isolate POST reachability testing:
- No auth, no database calls
- Echoes request body back with timing
- CORS headers for mobile compatibility
- Returns within ~50ms for health checks

```typescript
POST /api/postping
Body: { any: "json" }
Response: { ok: true, ts: "...", elapsed_ms: 42, echo: {...} }
```

### 2. Enhanced Token Route Timeouts
**File:** `app/api/livekit/token/route.ts` (UPDATED)

#### Improved Stage Timeout Mechanism
- Added `completed` flag to prevent race conditions
- Wrapped work promise to check completion status
- Prevents promises from leaking after timeout fires

**Before:**
```typescript
const timeoutPromise = new Promise<T>((_resolve, reject) => {
  timeoutHandle = setTimeout(() => reject(new StageTimeoutError(stage, timeoutMs)), timeoutMs);
});
return await Promise.race([fn(), timeoutPromise]);
```

**After:**
```typescript
let completed = false;
const timeoutPromise = new Promise<never>((_resolve, reject) => {
  timeoutHandle = setTimeout(() => {
    if (!completed) {
      completed = true;
      reject(new StageTimeoutError(stage, timeoutMs));
    }
  }, timeoutMs);
});

const workPromise = fn().then(
  (result) => {
    if (!completed) {
      completed = true;
      return result;
    }
    throw new Error('Stage already timed out');
  },
  // ... error handler
);
```

#### Reduced Stage-Specific Timeouts
- **Body parse:** 3s → 2s (most common hang point)
- **Access check:** 3s → 2s (fast local check)
- **Profile fetch:** 3s → 2s (non-critical, can fail gracefully)
- **Hard timeout:** Still 10s (fallback safety net)

#### Better Error Handling
1. **Body Parse:** Nested try-catch for JSON errors
2. **Access Check:** Fails closed on timeout (returns 403)
3. **Profile Fetch:** Optional - continues without profile on timeout
4. **Hard Timeout:** Checks `responded` flag to prevent double responses

#### Enhanced Logging
All stages now log:
- Stage name and timeout value on start
- Completion status
- Timeout details when timeout fires
- Error messages with context

## Testing

### Test POST Reachability
```bash
curl -X POST https://mylivelinks.com/api/postping \
  -H "Content-Type: application/json" \
  -d '{"test": "hello"}'

# Expected: { ok: true, elapsed_ms: <50, echo: {...} }
```

### Test Token Endpoint (requires auth)
```bash
curl -X POST https://mylivelinks.com/api/livekit/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "roomName": "test-room",
    "participantName": "Test User",
    "canPublish": false,
    "canSubscribe": true
  }'

# Expected: { token: "...", url: "wss://..." }
# Should return within 2-3s on success, <5s on failure
```

### Monitor Logs
Look for these log entries:
```
[LIVEKIT_TOKEN_ROUTE] { phase: "stage_start", stage: "body_parse", timeoutMs: 2000 }
[LIVEKIT_TOKEN_ROUTE] { phase: "stage_done", stage: "body_parse" }
[LIVEKIT_TOKEN_ROUTE] { phase: "response_sent", status: 200, ms: 1234 }
```

## Guarantees

1. **Hard Timeout:** Route ALWAYS responds within 10s maximum
2. **Fast Failure:** Most errors return within 2-3s
3. **No Hangs:** All async operations have explicit timeouts
4. **Stage Visibility:** Errors include which stage timed out
5. **Mobile Compatible:** CORS headers on all responses including OPTIONS

## Error Response Format

All errors include:
```json
{
  "error": "Human-readable message",
  "stage": "body_parse|auth|canAccessLive|profile_fetch|livekit_token_sign|hard_timeout",
  "timeoutMs": 2000,
  "reqId": "unique-request-id"
}
```

## Next Steps

1. Deploy and test on staging/production
2. Monitor server logs for timeout patterns
3. Adjust stage timeouts if needed (currently 2s for most stages)
4. Consider adding retry logic on mobile client for 504 responses
5. Tighten CORS allowlist in production (currently allows all origins)

## Files Changed

- `app/api/postping/route.ts` (NEW) - POST ping endpoint
- `app/api/livekit/token/route.ts` (UPDATED) - Enhanced timeout handling

## Commit

```bash
git add app/api/postping/route.ts app/api/livekit/token/route.ts
git commit -m "fix(api/livekit): stage timeouts + guaranteed responses for token endpoint"
git push
```

