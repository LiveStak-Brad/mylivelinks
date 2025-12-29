# CRASH FIX: Missing Environment Variables

## Problem
The mobile app crashes immediately (splash screen then closes) because it's missing Supabase environment variables.

## Root Cause
The `mobile/lib/supabase.ts` file tries to create a Supabase client at module initialization time, and throws an error if the environment variables are missing. This happens **before** React even starts, causing an immediate crash.

## Solution

### Step 1: Create `.env` file in mobile directory

```bash
cd mobile
```

Create a new file called `.env` with the following content:

```env
# Supabase Configuration (REQUIRED)
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url-here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# API Base URL
EXPO_PUBLIC_API_URL=https://mylivelinks.com

# Debug Mode
EXPO_PUBLIC_DEBUG_LIVE=1
```

### Step 2: Get Your Supabase Credentials

Your web app already has these credentials. Find them in one of these locations:

**Option A: From your web `.env.local` file:**
```bash
# In the ROOT directory (not mobile/), look for .env.local
# Copy these values:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Option B: From Vercel dashboard:**
1. Go to https://vercel.com
2. Open your mylivelinks.com project
3. Go to Settings → Environment Variables
4. Look for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Option C: From Supabase dashboard:**
1. Go to https://supabase.com
2. Open your project
3. Go to Settings → API
4. Copy:
   - Project URL → `EXPO_PUBLIC_SUPABASE_URL`
   - anon/public key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Update mobile/.env

Replace the placeholder values in `mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2MjYxMjM0NTYsImV4cCI6MTk0MTY5OTQ1Nn0.xxxxxx
EXPO_PUBLIC_API_URL=https://mylivelinks.com
EXPO_PUBLIC_DEBUG_LIVE=1
```

### Step 4: Clear cache and restart

```bash
cd mobile
npx expo start -c
```

The `-c` flag clears the Metro bundler cache to ensure new environment variables are loaded.

### Step 5: Verify

The app should now:
1. ✅ Show splash screen
2. ✅ Navigate to auth/gate screen (not crash)
3. ✅ Allow sign-in/sign-up

Check the console for confirmation:
```
[SUPABASE] Client initialized successfully
[AUTH] Bootstrap starting...
```

## For Local Development

If you're testing on a **simulator**:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

If you're testing on a **physical device**, you need to use ngrok:
```bash
# In a separate terminal, from the ROOT directory:
npx ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Then in mobile/.env:
EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
```

## Why the Web and Mobile Use Different Prefixes

- **Web (Next.js)**: Uses `NEXT_PUBLIC_*` prefix
  - Example: `NEXT_PUBLIC_SUPABASE_URL`
- **Mobile (Expo)**: Uses `EXPO_PUBLIC_*` prefix
  - Example: `EXPO_PUBLIC_SUPABASE_URL`

Both frameworks require these prefixes to bundle environment variables into the client-side code.

## Code Changes Applied

To prevent future crashes, the following files were updated to handle missing environment variables gracefully:

1. `mobile/lib/supabase.ts` - Now logs a warning instead of throwing
2. `mobile/hooks/useAuth.ts` - Handles null Supabase client
3. `mobile/hooks/useProfile.ts` - Handles null Supabase client

This means the app will run in "offline mode" if env vars are missing, but it won't crash.

## Verification Checklist

- [ ] Created `mobile/.env` file
- [ ] Added Supabase URL and anon key
- [ ] Restarted Expo with `npx expo start -c`
- [ ] App launches without crashing
- [ ] Gate/Auth screen appears
- [ ] Can sign in/sign up (if you have credentials)

---

**Last Updated**: 2025-12-26  
**Issue**: Missing environment variables causing immediate crash  
**Status**: ✅ Fixed with graceful fallback + setup instructions




