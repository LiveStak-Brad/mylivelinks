# Fix: Deploying to Wrong Vercel Project

## Issue
Deployments are going to `mylivelinks-udoz` instead of `mylivelinks`.

## Solution: Check Which Project is Connected

### Step 1: Check Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Look at your projects list
3. You should see:
   - `mylivelinks-udoz` (wrong one)
   - `mylivelinks` (correct one)

### Step 2: Check Which Project is Connected to GitHub

1. Click on **`mylivelinks`** (the correct one)
2. Go to **Settings** → **Git**
3. Check: Is `LiveStak-Brad/mylivelinks` connected?
4. If not connected, click **"Connect Git Repository"** and select it

### Step 3: Disconnect Wrong Project (if needed)

1. Click on **`mylivelinks-udoz`** (wrong one)
2. Go to **Settings** → **Git**
3. If it's connected to `LiveStak-Brad/mylivelinks`, click **"Disconnect"**
4. This will stop auto-deployments to the wrong project

### Step 4: Verify Correct Project

1. Go back to **`mylivelinks`** (correct one)
2. Make sure `LiveStak-Brad/mylivelinks` is connected
3. Check **Settings** → **Environment Variables**
4. Make sure all LiveKit variables are set here (not in udoz project)

## Quick Fix

**Option 1: Disconnect Wrong Project**
- Go to `mylivelinks-udoz` → Settings → Git → Disconnect
- This stops deployments to the wrong project

**Option 2: Delete Wrong Project** (if you don't need it)
- Go to `mylivelinks-udoz` → Settings → General → Delete Project

**Option 3: Make Sure Correct Project is Connected**
- Go to `mylivelinks` → Settings → Git
- Make sure `LiveStak-Brad/mylivelinks` is connected
- If not, connect it

## After Fixing

1. Push a new commit (or wait for next push)
2. Check Vercel dashboard - deployments should go to `mylivelinks` (not `mylivelinks-udoz`)
3. Your live site should use the correct project with correct environment variables

## Why This Happened

You likely have two Vercel projects:
- `mylivelinks-udoz` - Old/wrong project
- `mylivelinks` - Correct project

Both might be connected to the same GitHub repo, so Vercel deploys to both. You need to disconnect the wrong one.

