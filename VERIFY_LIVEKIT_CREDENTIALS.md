# Verify LiveKit Credentials Match

The "invalid token" error means LiveKit is rejecting your token. This usually means the API key/secret in Vercel don't match your LiveKit project.

## Step 1: Check Your LiveKit Dashboard

1. Go to https://cloud.livekit.io/
2. Click on your project (should be `mylivelinkscom-8p3lhypp` or similar)
3. Go to **Settings** → **Keys**
4. Copy:
   - **Server URL** (should be `wss://mylivelinkscom-8p3lhypp.livekit.cloud`)
   - **API Key** (starts with `AP...`)
   - **API Secret** (long string)

## Step 2: Check Your Local `.env.local`

Open `.env.local` and verify:
- `LIVEKIT_URL` matches the Server URL from LiveKit dashboard
- `LIVEKIT_API_KEY` matches the API Key from LiveKit dashboard
- `LIVEKIT_API_SECRET` matches the API Secret from LiveKit dashboard

## Step 3: Check Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Click on your `mylivelinks` project
3. Go to **Settings** → **Environment Variables**
4. Verify these match your LiveKit dashboard:
   - `LIVEKIT_URL` - Should be `wss://mylivelinkscom-8p3lhypp.livekit.cloud`
   - `LIVEKIT_API_KEY` - Should start with `AP...` and match LiveKit dashboard
   - `LIVEKIT_API_SECRET` - Should match LiveKit dashboard exactly

## Step 4: Check Vercel Function Logs

After redeploying, check what Vercel is actually using:

1. Go to Vercel dashboard → Your project → **Deployments**
2. Click on the latest deployment
3. Click **Functions** tab
4. Find `/api/livekit/token`
5. Click on it to see logs
6. Look for: `"LiveKit credentials check:"` log
7. Compare:
   - `urlFull` - Should match your LiveKit Server URL
   - `apiKeyPrefix` - First 15 chars should match your LiveKit API Key
   - `apiSecretPrefix` - First 15 chars should match your LiveKit API Secret

## Step 5: If They Don't Match

1. **Update Vercel Environment Variables:**
   - Go to Settings → Environment Variables
   - Edit each one to match your LiveKit dashboard exactly
   - Make sure **Production**, **Preview**, and **Development** are all checked
   - Click **Save**

2. **Redeploy:**
   - Go to Deployments
   - Click the 3 dots on latest deployment → **Redeploy**

## Common Issues

- **URL mismatch:** Make sure `LIVEKIT_URL` starts with `wss://` (not `https://`)
- **API Key mismatch:** The key in Vercel must be the EXACT same as LiveKit dashboard
- **API Secret mismatch:** The secret in Vercel must be the EXACT same as LiveKit dashboard
- **Wrong project:** Make sure you're copying credentials from the correct LiveKit project

## After Fixing

1. Wait for Vercel to redeploy (usually 1-2 minutes)
2. Try "Go Live" again
3. Check browser console (F12) for detailed error messages
4. If still failing, check Vercel function logs to see what credentials it's using








