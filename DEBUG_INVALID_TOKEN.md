# Debug "Invalid Token" Error - Step by Step

## Current Error
"Failed to connect to room: could not establish signal connection: invalid token"

This means the LiveKit token is being generated, but LiveKit is rejecting it.

## Step 1: Check Browser Console

1. Open your site
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for these logs:
   - "Getting token for: ..."
   - "Token received: ..."
   - "Connecting to MyLiveLinks room: ..."
   - "LiveKit connection error: ..."

**What to look for:**
- Does it say "Token received: { hasToken: true, url: '...' }"?
- What does the error message say exactly?

## Step 2: Check Network Tab

1. In DevTools, go to **Network** tab
2. Try going live again
3. Look for a request to `/api/livekit/token`
4. Click on it
5. Check:
   - **Status:** Should be 200 (not 401 or 500)
   - **Response:** Should show `{ "token": "...", "url": "..." }`
   - If you see an error, what does it say?

## Step 3: Check Vercel Function Logs

1. Go to https://vercel.com/dashboard
2. Click your project
3. Go to **Deployments** tab
4. Click on latest deployment
5. Go to **Functions** tab
6. Click on `/api/livekit/token`
7. Look for logs that show:
   - "LiveKit credentials check: ..."
   - "Token generated successfully for: ..."
   - Any errors?

## Step 4: Verify LiveKit Credentials in Vercel

**CRITICAL:** The most common issue is wrong credentials.

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Check these 3 variables exist:
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`

3. For each variable:
   - Click to edit it
   - **Verify the value matches your `.env.local` file exactly**
   - Make sure all 3 environments are checked (Production, Preview, Development)

4. **Common mistakes:**
   - ❌ Extra spaces before/after the value
   - ❌ Missing `wss://` prefix on URL
   - ❌ Wrong API key/secret (from different LiveKit project)
   - ❌ Not checked for all environments

## Step 5: Verify LiveKit Dashboard

1. Go to your LiveKit dashboard
2. Check:
   - Is your project active?
   - Copy the **exact** Server URL, API Key, and API Secret
   - Compare with what's in Vercel

## Step 6: Test Token Generation

After verifying credentials, **redeploy**:
1. Go to Vercel → Deployments
2. Click three dots (⋯) on latest deployment
3. Click **"Redeploy"**
4. Wait 2-5 minutes

## Step 7: Check After Redeploy

1. Refresh your site
2. Try going live again
3. Check browser console for new errors
4. Check Network tab for `/api/livekit/token` response

## Most Likely Issues:

### Issue 1: Credentials Not Set
**Symptom:** Browser console shows "LiveKit credentials not configured"
**Fix:** Add all 3 variables to Vercel

### Issue 2: Wrong Credentials
**Symptom:** Token generated but LiveKit rejects it
**Fix:** Verify API key/secret match your LiveKit dashboard exactly

### Issue 3: Wrong URL Format
**Symptom:** Connection fails immediately
**Fix:** Make sure `LIVEKIT_URL` starts with `wss://` (e.g., `wss://your-project.livekit.cloud`)

### Issue 4: Not Redeployed
**Symptom:** Changes don't take effect
**Fix:** Must redeploy after adding/changing environment variables

## Quick Checklist:

- [ ] All 3 LiveKit variables added to Vercel
- [ ] Values match `.env.local` exactly (no extra spaces)
- [ ] All 3 environments checked (Production, Preview, Development)
- [ ] `LIVEKIT_URL` starts with `wss://`
- [ ] Redeployed after adding/changing variables
- [ ] Checked browser console for specific errors
- [ ] Checked Vercel function logs for errors
- [ ] Verified credentials match LiveKit dashboard

## Still Not Working?

Share:
1. Browser console errors (screenshot or copy/paste)
2. Network tab response from `/api/livekit/token` (screenshot)
3. Vercel function logs (from `/api/livekit/token`)
4. Confirmation that all 3 variables are set in Vercel


