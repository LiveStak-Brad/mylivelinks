# Final Fix for "Invalid Token" - Step by Step

## You've Verified:
✅ Credentials copied from LiveKit dashboard  
✅ Credentials copied to `.env.local`  
✅ Credentials copied to Vercel  
✅ Values are correct

## But Still Getting "Invalid Token"

This usually means one of these:

### Issue 1: Not Redeployed After Adding Variables ⚠️ MOST COMMON

**CRITICAL:** Vercel doesn't use new environment variables until you redeploy!

**Fix:**
1. Go to Vercel → Your Project → Deployments
2. Click the **three dots** (⋯) on the **latest** deployment
3. Click **"Redeploy"**
4. Wait 2-5 minutes for deployment to complete
5. Try going live again

### Issue 2: Variables Not Checked for All Environments

**Check:**
1. Go to Vercel → Settings → Environment Variables
2. Click on each LiveKit variable
3. Make sure these 3 boxes are ALL checked:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

If any are unchecked, check them and redeploy.

### Issue 3: Token Generation Timing Issue

Sometimes tokens are generated before the room exists. Let me check if there's a timing issue.

### Issue 4: URL Format Issue

Even if `LIVEKIT_URL` is correct, make sure:
- It starts with `wss://` (not `https://`)
- It's the full URL (e.g., `wss://mylivelinks-xxx.livekit.cloud`)
- No trailing slashes

## Quick Test After Redeploy

1. **Open browser console (F12)**
2. **Try going live**
3. **Look for these logs:**
   - "Token generated successfully for: ..."
   - "Connecting to MyLiveLinks room: ..."
   - Any error messages?

4. **Check Network tab:**
   - Look for `/api/livekit/token` request
   - Click on it
   - Check Response - should show `{ "token": "...", "url": "..." }`
   - If you see an error, what does it say?

## Most Likely Solution

**Have you redeployed after adding the variables?**

If not:
1. Go to Vercel → Deployments
2. Click three dots (⋯) → Redeploy
3. Wait for deployment
4. Try again

If yes, and still not working:
1. Check browser console for specific error
2. Check Vercel function logs for `/api/livekit/token`
3. Verify the token is being generated (check Network tab)

## Debug Steps

1. **Check if token is generated:**
   - Browser console should show "Token received: { hasToken: true, url: '...' }"
   - If not, check Network tab for `/api/livekit/token` response

2. **Check if connection is attempted:**
   - Browser console should show "Connecting to MyLiveLinks room: ..."
   - If you see this, the token is generated but LiveKit rejects it

3. **Check Vercel logs:**
   - Go to Vercel → Deployments → Latest → Functions → `/api/livekit/token`
   - Look for "Token generated successfully" or errors

## Still Not Working?

Share:
1. Have you redeployed? (Yes/No)
2. Browser console errors (screenshot or copy/paste)
3. Network tab response from `/api/livekit/token` (what does it return?)









