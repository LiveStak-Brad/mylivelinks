# Environment Variables Guide

## Setup

**Copy the example file**:
```bash
cd mobile
cp ENV_EXAMPLE.md .env.example
```

**Create your local `.env`** (never commit this):
```bash
cd mobile
touch .env
```

**Add to `.env`**:
```bash
# MyLiveLinks Mobile - Environment Variables

# API Base URL (must match your deployed web app)
EXPO_PUBLIC_API_URL=https://mylivelinks.com

# Debug Mode (1 = enabled, 0 = disabled)
EXPO_PUBLIC_DEBUG_LIVE=1
```

## Environment Variable Rules

### EXPO_PUBLIC_* Prefix

**All client-side vars MUST use `EXPO_PUBLIC_*` prefix**:
- ✅ `EXPO_PUBLIC_API_URL` - Bundled into app at build time
- ✅ `EXPO_PUBLIC_DEBUG_LIVE` - Available to client code
- ❌ `API_URL` - NOT accessible in client code
- ❌ `SECRET_KEY` - NEVER use EXPO_PUBLIC_ for secrets

**Why?**
- Expo only bundles vars with `EXPO_PUBLIC_` prefix into the client app
- These vars are **NOT secret** - they're visible in compiled JavaScript
- Only use for client-safe values (URLs, feature flags, etc.)

### What Mobile Needs

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `EXPO_PUBLIC_API_URL` | Web API base URL | `https://mylivelinks.com` | Yes |
| `EXPO_PUBLIC_DEBUG_LIVE` | Enable debug logs | `0` | No |

### What Mobile Does NOT Need

Mobile **never** sees these (server-side only):
- ❌ `LIVEKIT_API_KEY` - Server generates tokens
- ❌ `LIVEKIT_API_SECRET` - Server generates tokens
- ❌ `DATABASE_URL` - Server handles DB
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Server-side auth

**Security Flow**:
1. Mobile requests token from `/api/livekit/token`
2. Server validates request (optional auth)
3. Server generates LiveKit token using API key/secret (server-side)
4. Server returns token + LiveKit URL to mobile
5. Mobile uses token to connect to LiveKit

## Environment-Specific Values

### Local Development (Simulator)

```bash
# .env (local simulator)
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_DEBUG_LIVE=1
```

Works for iOS Simulator because simulator shares Mac's localhost.

### Local Development (Physical Device)

**Problem**: Physical device can't access `localhost:3000`

**Solution**: Use ngrok to expose localhost:

```bash
# In web project terminal
cd .. # Go to web root
npx ngrok http 3000
# Copy ngrok URL (e.g., https://abc123.ngrok.io)
```

```bash
# mobile/.env (physical device)
EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
EXPO_PUBLIC_DEBUG_LIVE=1
```

### Staging/Production

```bash
# .env (staging)
EXPO_PUBLIC_API_URL=https://staging.mylivelinks.com
EXPO_PUBLIC_DEBUG_LIVE=1
```

```bash
# .env (production)
EXPO_PUBLIC_API_URL=https://mylivelinks.com
EXPO_PUBLIC_DEBUG_LIVE=0
```

## Build Profile Overrides

**`eas.json` can override `.env` values**:

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_DEBUG_LIVE": "1",
        "EXPO_PUBLIC_API_URL": "https://mylivelinks.com"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_DEBUG_LIVE": "0",
        "EXPO_PUBLIC_API_URL": "https://mylivelinks.com"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_DEBUG_LIVE": "0",
        "EXPO_PUBLIC_API_URL": "https://mylivelinks.com"
      }
    }
  }
}
```

**Priority**: `eas.json` > `.env` > defaults

## Accessing in Code

```typescript
// ✅ Correct - using EXPO_PUBLIC_ prefix
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const debugMode = process.env.EXPO_PUBLIC_DEBUG_LIVE === '1';

// ❌ Wrong - no EXPO_PUBLIC_ prefix (will be undefined)
const apiUrl = process.env.API_URL; // undefined!
```

## Troubleshooting

### "Failed to fetch token"

**Symptom**: Mobile can't connect to LiveKit room

**Check**:
1. Is `EXPO_PUBLIC_API_URL` correct?
   ```typescript
   console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
   ```
2. Is web server running and accessible?
   ```bash
   curl https://your-api-url.com/api/livekit/token
   # Should return 405 (POST required) or auth error
   ```
3. If using ngrok, is tunnel still active?
   ```bash
   # Ngrok tunnels expire - restart if needed
   npx ngrok http 3000
   ```

### Environment vars not updating

**Symptom**: Changed `.env` but app still uses old values

**Solutions**:
1. **Clear Metro cache**:
   ```bash
   cd mobile
   npx expo start -c
   ```
2. **Rebuild app** (for EAS builds):
   ```bash
   npx eas build --platform ios --profile development --clear-cache
   ```
3. **Restart Expo dev server**:
   ```bash
   # Kill server (Ctrl+C)
   npx expo start
   ```

### Debug logs not appearing

**Symptom**: `EXPO_PUBLIC_DEBUG_LIVE=1` but no logs

**Check**:
1. Is var actually set?
   ```typescript
   console.log('Debug mode:', process.env.EXPO_PUBLIC_DEBUG_LIVE);
   ```
2. Did you restart dev server after changing `.env`?
3. Is code using correct env var?
   ```typescript
   const DEBUG = process.env.EXPO_PUBLIC_DEBUG_LIVE === '1';
   if (DEBUG) {
     console.log('[DEBUG] ...');
   }
   ```

## Required Server Configuration

Mobile app expects these API endpoints:

### 1. POST /api/livekit/token

**Request**:
```json
{
  "roomName": "live_central",
  "userId": "<mobile-identity>",
  "displayName": "Mobile User",
  "deviceType": "mobile",
  "deviceId": "<stable-uuid>",
  "sessionId": "<per-connection-uuid>",
  "role": "viewer"
}
```

**Response**:
```json
{
  "token": "<livekit-jwt-token>",
  "url": "wss://your-livekit-server.com"
}
```

**Server Requirements**:
- Validate request (optional auth)
- Generate LiveKit JWT token using `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` (server-side)
- Return token + LiveKit server URL
- Handle CORS for mobile origins (if using custom domain)

### 2. Future Endpoints

These will be needed for full functionality:
- `POST /api/auth/login` - User authentication
- `GET /api/user/profile` - User profile data
- `POST /api/chat/send` - Send chat messages
- `POST /api/gifts/send` - Send gifts
- `GET /api/economy/balance` - Get coin/diamond balance

## Security Checklist

- [ ] Never commit `.env` file (should be in `.gitignore`)
- [ ] Never use `EXPO_PUBLIC_*` for secrets or API keys
- [ ] Server validates all mobile API requests
- [ ] LiveKit tokens generated server-side only
- [ ] API endpoints use HTTPS in production
- [ ] CORS configured correctly for mobile origins

## Status

- ✅ `eas.json` configured with env vars for all profiles
- ✅ `ENV_EXAMPLE.md` created with full documentation
- ✅ `.env` in `.gitignore` (not committed)
- ✅ Server token endpoint documented
- ✅ Build profiles override env vars correctly

---

**Last Updated**: 2025-12-24  
**Expo SDK**: 50  
**Build System**: EAS Build






