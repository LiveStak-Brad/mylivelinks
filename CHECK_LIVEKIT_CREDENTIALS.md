# Check LiveKit Credentials - Quick Guide

## The "Invalid Token" Error Usually Means:

**Your LiveKit credentials are not set correctly in Vercel.**

## Step-by-Step Fix:

### 1. Open Your `.env.local` File
You have it open in Cursor. Look for these 3 lines:
```
LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

### 2. Copy These Values
Copy the **exact** values (including any `wss://` prefix)

### 3. Go to Vercel
1. Visit https://vercel.com/dashboard
2. Click your project (`mylivelinks`)
3. Click **Settings** → **Environment Variables**

### 4. Add/Update Each Variable

For each variable (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`):

1. Click **"Add New"** (or edit if it exists)
2. **Key:** Enter the variable name exactly (e.g., `LIVEKIT_URL`)
3. **Value:** Paste the value from your `.env.local`
4. **IMPORTANT:** Check all 3 boxes:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
5. Click **"Save"**

### 5. Verify Format

**LIVEKIT_URL should:**
- Start with `wss://` (WebSocket Secure)
- Example: `wss://your-project.livekit.cloud`
- NOT: `https://your-project.livekit.cloud` (though code converts it)

**LIVEKIT_API_KEY should:**
- Be a string (usually starts with letters/numbers)
- Usually 20+ characters long

**LIVEKIT_API_SECRET should:**
- Be a string (usually longer than API key)
- Usually 40+ characters long

### 6. Redeploy

After adding/updating variables:
1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on latest deployment
3. Click **"Redeploy"**
4. Wait 2-5 minutes

### 7. Test Again

After redeploy:
1. Refresh your site
2. Try going live or viewing a stream
3. Check browser console (F12) for errors

## Still Not Working?

### Check Browser Console:
1. Press F12
2. Go to **Console** tab
3. Look for errors like:
   - "LiveKit credentials not configured"
   - "Failed to connect to room: invalid token"
   - "Error getting LiveKit token"

### Check Vercel Function Logs:
1. Go to Vercel → Your Project → Deployments
2. Click latest deployment
3. Go to **Functions** tab
4. Click on `/api/livekit/token`
5. Check logs for errors

### Common Issues:

**Issue:** "LiveKit URL not configured"
- **Fix:** Add `LIVEKIT_URL` to Vercel environment variables

**Issue:** "LiveKit API Key not configured"  
- **Fix:** Add `LIVEKIT_API_KEY` to Vercel environment variables

**Issue:** "LiveKit API Secret not configured"
- **Fix:** Add `LIVEKIT_API_SECRET` to Vercel environment variables

**Issue:** "Invalid token" (but credentials are set)
- **Fix:** Check that API key and secret match your LiveKit dashboard
- **Fix:** Make sure URL format is correct (`wss://...`)
- **Fix:** Redeploy after adding variables

## Quick Checklist:

- [ ] All 3 variables added to Vercel
- [ ] All 3 environments checked (Production, Preview, Development)
- [ ] Values match your `.env.local` exactly
- [ ] `LIVEKIT_URL` starts with `wss://`
- [ ] Redeployed after adding variables
- [ ] Checked browser console for errors
- [ ] Checked Vercel function logs

## Need Help?

Share:
1. Browser console errors (screenshot or copy/paste)
2. Vercel function logs (from `/api/livekit/token`)
3. Whether you've added the 3 variables to Vercel








