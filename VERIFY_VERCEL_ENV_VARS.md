# Verify Vercel Environment Variables Are Set Correctly

## Since It Worked Locally But Not on Vercel

Your `.env.local` file has the correct values. The issue is likely:
1. Values got truncated when copying
2. Extra spaces added
3. Not checked for all environments
4. Not redeployed after adding

## Step-by-Step Verification

### Step 1: Check Each Variable in Vercel

Go to Vercel → Your Project → Settings → Environment Variables

For each of these 3 variables, click to edit and verify:

#### LIVEKIT_URL
- **Should be:** `wss://mylivelinks...` (full URL from your `.env.local`)
- **Check:** No extra spaces before/after
- **Check:** Starts with `wss://` (not `https://`)
- **Check:** Full URL is there (not truncated)

#### LIVEKIT_API_KEY
- **Should be:** `APIVTKuy8ZttB...` (full key from your `.env.local`)
- **Check:** No extra spaces
- **Check:** Complete key (usually 20+ characters)

#### LIVEKIT_API_SECRET
- **Should be:** `pZyjfqL7ed...` (full secret from your `.env.local`)
- **Check:** No extra spaces
- **Check:** Complete secret (usually 40+ characters)

### Step 2: Verify All Environments Are Checked

For EACH variable, make sure these 3 boxes are checked:
- ✅ Production
- ✅ Preview
- ✅ Development

### Step 3: Compare with `.env.local`

Open your `.env.local` file and compare character-by-character:

1. Copy the FULL value from `.env.local` (including everything after the `=`)
2. Go to Vercel and edit the variable
3. Make sure the value matches EXACTLY (no extra spaces, no truncation)

### Step 4: Common Copy/Paste Issues

**Issue 1: Truncated Values**
- When copying, make sure you get the ENTIRE value
- API keys/secrets are long - don't cut them off

**Issue 2: Extra Spaces**
- Don't add spaces before/after the value
- Copy exactly as it appears in `.env.local`

**Issue 3: Missing Characters**
- Some editors might hide long values
- Make sure you see the complete value

### Step 5: After Fixing - Redeploy

**CRITICAL:** After adding/fixing variables:
1. Go to Deployments tab
2. Click three dots (⋯) on latest deployment
3. Click "Redeploy"
4. Wait 2-5 minutes

## Quick Test

After redeploying, check the browser console (F12):
- If you see "LiveKit credentials not configured" → Variables aren't set
- If you see "Token generated successfully" → Variables are set, but might be wrong
- If you see "invalid token" → Variables are set but don't match LiveKit dashboard

## Still Not Working?

1. **Double-check LiveKit Dashboard:**
   - Go to LiveKit dashboard → Settings → API Keys
   - Copy the EXACT values shown there
   - Compare with what's in Vercel

2. **Check Vercel Function Logs:**
   - Go to Vercel → Deployments → Latest → Functions → `/api/livekit/token`
   - Look for logs showing the credential check
   - See if it says "LiveKit credentials check: ..."

3. **Verify URL Format:**
   - In LiveKit dashboard, what's the Server URL?
   - It should match your `LIVEKIT_URL` in Vercel
   - Usually looks like: `wss://your-project.livekit.cloud`

## Most Common Issue

**The API key/secret in Vercel don't match your LiveKit dashboard.**

Even if they're copied from `.env.local`, if `.env.local` has old/wrong values, Vercel will have wrong values too.

**Solution:** Copy fresh values from LiveKit dashboard → API Keys section.

