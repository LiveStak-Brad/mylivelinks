# LiveKit "Invalid Token" Troubleshooting

## Common Causes

### 1. Wrong LiveKit Credentials in Vercel

**Check:**
- Go to Vercel → Your Project → Settings → Environment Variables
- Verify these are set correctly:
  - `LIVEKIT_URL` - Should be your LiveKit server URL (e.g., `wss://your-project.livekit.cloud`)
  - `LIVEKIT_API_KEY` - Your LiveKit API key
  - `LIVEKIT_API_SECRET` - Your LiveKit API secret

**Fix:**
- Make sure all 3 variables are set for **Production**, **Preview**, and **Development**
- Copy exact values from your LiveKit dashboard
- Redeploy after adding/changing variables

### 2. Wrong URL Format

**Check:**
- `LIVEKIT_URL` should start with `wss://` (WebSocket Secure)
- Example: `wss://your-project.livekit.cloud`
- NOT: `https://your-project.livekit.cloud` (though the code will convert it)

**Fix:**
- Update `LIVEKIT_URL` in Vercel to use `wss://` format
- Redeploy

### 3. API Key/Secret Mismatch

**Check:**
- The `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` must match
- They must be from the same LiveKit project

**Fix:**
- Go to LiveKit dashboard
- Copy the exact API key and secret
- Update in Vercel
- Redeploy

### 4. Token Expiration

**Check:**
- Tokens are generated with 6-hour expiration
- If you're testing for a long time, you might need to refresh

**Fix:**
- Refresh the page to get a new token
- Or log out and log back in

### 5. Environment Variables Not Set

**Check:**
- Open browser console (F12)
- Look for errors like "LiveKit credentials not configured"

**Fix:**
- Add all environment variables to Vercel
- Make sure they're set for all environments
- Redeploy

## How to Debug

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for errors starting with "Failed to connect" or "Invalid token"
   - Check the Network tab for `/api/livekit/token` requests

2. **Check Vercel Logs:**
   - Go to Vercel → Your Project → Deployments
   - Click on latest deployment
   - Check "Functions" tab for `/api/livekit/token` logs
   - Look for errors or warnings

3. **Verify Environment Variables:**
   - In Vercel logs, you should see:
     - "Token generated successfully for: ..."
     - If you see "LiveKit credentials not configured", variables aren't set

4. **Test Token Generation:**
   - The API should return `{ token: "...", url: "wss://..." }`
   - If it returns an error, check the error message

## Quick Fix Checklist

- [ ] `LIVEKIT_URL` is set in Vercel (all 3 environments)
- [ ] `LIVEKIT_API_KEY` is set in Vercel (all 3 environments)
- [ ] `LIVEKIT_API_SECRET` is set in Vercel (all 3 environments)
- [ ] All variables match your LiveKit dashboard
- [ ] Redeployed after adding/changing variables
- [ ] User is logged in (authentication required)
- [ ] Browser console shows no other errors

## Still Not Working?

1. **Check LiveKit Dashboard:**
   - Verify your project is active
   - Check if there are any usage limits
   - Verify API key/secret are correct

2. **Test with curl:**
   ```bash
   curl -X POST https://your-site.vercel.app/api/livekit/token \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
     -d '{"roomName":"test","participantName":"test"}'
   ```

3. **Contact Support:**
   - Share browser console errors
   - Share Vercel function logs
   - Share LiveKit dashboard screenshot (without secrets)









