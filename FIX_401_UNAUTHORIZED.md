# Fix: 401 Unauthorized / Invalid Token

## What the Error Means

The console shows:
- `401 (Unauthorized)` from LiveKit
- "could not establish signal connection: invalid token"

This means:
✅ Token IS being generated  
❌ But LiveKit rejects it because API key/secret don't match

## Root Cause

The API key/secret in Vercel don't match your LiveKit project `mylivelinkscom-8p3lhypp.livekit.cloud`.

## Solution: Verify API Credentials Match

### Step 1: Check Your LiveKit Dashboard

1. Go to your LiveKit dashboard
2. Make sure you're in the project: **mylivelinkscom-8p3lhypp**
3. Go to **Settings** → **API Keys**
4. You should see:
   - **Server URL:** `wss://mylivelinkscom-8p3lhypp.livekit.cloud`
   - **API Key:** (starts with something like `APIVT...`)
   - **API Secret:** (long string)

### Step 2: Verify in Vercel

1. Go to Vercel → Your Project → Settings → Environment Variables
2. For each variable, click to edit and verify:

**LIVEKIT_URL:**
- Should be: `wss://mylivelinkscom-8p3lhypp.livekit.cloud`
- Must match exactly what's in LiveKit dashboard

**LIVEKIT_API_KEY:**
- Should start with the same prefix as in LiveKit dashboard
- Must be the EXACT key for project `mylivelinkscom-8p3lhypp`

**LIVEKIT_API_SECRET:**
- Should match the EXACT secret from LiveKit dashboard
- Must be for the same project

### Step 3: Common Issues

**Issue 1: Wrong Project**
- You might have multiple LiveKit projects
- Make sure you're copying credentials from `mylivelinkscom-8p3lhypp` project

**Issue 2: Multiple API Keys**
- LiveKit allows multiple API keys per project
- Make sure you're using the key that matches the secret
- Or create a new key/secret pair and use both

**Issue 3: Key/Secret Mismatch**
- API key and secret must be from the same key pair
- Can't mix key from one pair with secret from another

### Step 4: Create New API Key Pair (Recommended)

If unsure which key/secret to use:

1. Go to LiveKit dashboard → Settings → API Keys
2. Click **"Create API Key"**
3. Give it a name (e.g., "Vercel Production")
4. Copy the **API Key** and **API Secret** shown
5. Update Vercel with these NEW values
6. Wait for auto-deploy (or manually redeploy)

### Step 5: Verify After Update

1. Check browser console - should see "Token generated successfully"
2. Check Vercel function logs - should show the API key prefix
3. Try going live again

## Quick Checklist

- [ ] In LiveKit dashboard, confirmed project is `mylivelinkscom-8p3lhypp`
- [ ] Copied API Key from LiveKit dashboard
- [ ] Copied API Secret from LiveKit dashboard (same key pair)
- [ ] Copied Server URL from LiveKit dashboard
- [ ] Updated all 3 variables in Vercel
- [ ] Verified values match LiveKit dashboard exactly
- [ ] All 3 environments checked (Production, Preview, Development)
- [ ] Waited for auto-deploy (or manually redeployed)
- [ ] Tested again

## Still Not Working?

1. **Create a fresh API key pair** in LiveKit dashboard
2. **Update all 3 variables** in Vercel with the new values
3. **Wait for deploy** (or manually redeploy)
4. **Test again**

The 401 error means LiveKit doesn't recognize your API credentials. Creating a new key pair and updating Vercel should fix it.






