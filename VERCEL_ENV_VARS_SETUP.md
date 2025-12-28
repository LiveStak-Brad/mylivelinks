# Fix "Mock Mode" - Add Environment Variables to Vercel

## Problem
Your site is showing "mock mode" or "TESTING MODE" because environment variables aren't set in Vercel.

## Solution: Add Environment Variables to Vercel

### Step 1: Go to Vercel Project Settings

1. Go to https://vercel.com/dashboard
2. Click on your project (`mylivelinks`)
3. Click **Settings** tab
4. Click **Environment Variables** in the left sidebar

### Step 2: Add Each Environment Variable

Add these variables one by one. **IMPORTANT:** Select all three environments (Production, Preview, Development) for each variable!

#### Required Variables:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: Your Supabase URL (from your `.env.local`)
   - Environments: ✅ Production ✅ Preview ✅ Development

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: Your Supabase Anon Key (from your `.env.local`)
   - Environments: ✅ Production ✅ Preview ✅ Development

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: Your Supabase Service Role Key (from your `.env.local`)
   - Environments: ✅ Production ✅ Preview ✅ Development

4. **LIVEKIT_URL**
   - Value: Your LiveKit URL (from your `.env.local`)
   - Environments: ✅ Production ✅ Preview ✅ Development

5. **LIVEKIT_API_KEY**
   - Value: Your LiveKit API Key (from your `.env.local`)
   - Environments: ✅ Production ✅ Preview ✅ Development

6. **LIVEKIT_API_SECRET**
   - Value: Your LiveKit API Secret (from your `.env.local`)
   - Environments: ✅ Production ✅ Preview ✅ Development

7. **NEXT_PUBLIC_DISABLE_AUTH**
   - Value: `false` (set to false for production!)
   - Environments: ✅ Production ✅ Preview ✅ Development

### Step 3: How to Add Each Variable

For each variable:
1. Click **"Add New"** button
2. Enter the **Key** (variable name)
3. Enter the **Value** (from your `.env.local`)
4. **Check all three boxes:** Production, Preview, Development
5. Click **"Save"**

### Step 4: Redeploy

After adding all variables:
1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger a new deployment

### Step 5: Verify

1. Wait for deployment to complete (2-5 minutes)
2. Visit your domain
3. The "TESTING MODE" banner should be gone
4. The "BETA/TESTING - NO CASH VALUE" banner will remain (that's intentional)

---

## Quick Checklist

- [ ] Opened Vercel → Project → Settings → Environment Variables
- [ ] Added `NEXT_PUBLIC_SUPABASE_URL` (all 3 environments)
- [ ] Added `NEXT_PUBLIC_SUPABASE_ANON_KEY` (all 3 environments)
- [ ] Added `SUPABASE_SERVICE_ROLE_KEY` (all 3 environments)
- [ ] Added `LIVEKIT_URL` (all 3 environments)
- [ ] Added `LIVEKIT_API_KEY` (all 3 environments)
- [ ] Added `LIVEKIT_API_SECRET` (all 3 environments)
- [ ] Added `NEXT_PUBLIC_DISABLE_AUTH` = `false` (all 3 environments)
- [ ] Redeployed the project
- [ ] Verified site works without "TESTING MODE" banner

---

## Where to Find Your Values

Open your `.env.local` file (the one you have open in Cursor) and copy each value:

```env
NEXT_PUBLIC_SUPABASE_URL=your_value_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_value_here
SUPABASE_SERVICE_ROLE_KEY=your_value_here
LIVEKIT_URL=your_value_here
LIVEKIT_API_KEY=your_value_here
LIVEKIT_API_SECRET=your_value_here
NEXT_PUBLIC_DISABLE_AUTH=false
```

---

## Important Notes

- **Never commit `.env.local`** - It's already in `.gitignore`
- **Always select all 3 environments** (Production, Preview, Development) when adding variables
- **Set `NEXT_PUBLIC_DISABLE_AUTH` to `false`** for production (not `true`)
- **Redeploy after adding variables** - Changes don't apply until you redeploy

---

## Troubleshooting

### Still Showing "TESTING MODE"?
- Check that `NEXT_PUBLIC_DISABLE_AUTH` is set to `false` (not `true`)
- Make sure you redeployed after adding variables
- Check browser console for errors

### Environment Variables Not Working?
- Verify all variables are added to **all 3 environments**
- Check for typos in variable names (case-sensitive!)
- Make sure you redeployed after adding variables

### Site Not Loading?
- Check Vercel deployment logs for errors
- Verify all required variables are set
- Check browser console for specific error messages








