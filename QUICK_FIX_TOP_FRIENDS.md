# 🎯 QUICK FIX - Top Friends Not Showing Customization

## The Problem
You can save settings, but they don't show on your profile because:
- ❌ Database columns don't exist yet (need to create them)
- ❌ RPC function in database is old version (need to update it)

## The Solution (2 SQL Scripts)

### 🔥 STEP 1: Go to Supabase Dashboard → SQL Editor

### 🔥 STEP 2: Copy & Run This FIRST:

```sql
-- Add the 4 new columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_top_friends BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS top_friends_title TEXT DEFAULT 'Top Friends',
  ADD COLUMN IF NOT EXISTS top_friends_avatar_style TEXT DEFAULT 'square' CHECK (top_friends_avatar_style IN ('circle', 'square')),
  ADD COLUMN IF NOT EXISTS top_friends_max_count INTEGER DEFAULT 8 CHECK (top_friends_max_count >= 1 AND top_friends_max_count <= 8);

SELECT 'Step 1 Complete! ✅' as status;
```

### 🔥 STEP 3: Copy & Run This SECOND:

**Open the file:** `sql/update_profile_bundle_top_friends.sql`

Copy the ENTIRE contents and run it in Supabase SQL Editor.

(It's too long to paste here - it's the RPC function update)

### 🔥 STEP 4: Test It!

1. **Clear browser cache**: Ctrl+Shift+R (hard refresh)
2. Go to **Settings → Profile**
3. Change **Top Friends** settings:
   - Title: "Top G's"  
   - Style: Circle
   - Max: 6
4. Click **"Save All Changes"**
5. Go to your profile
6. **Hard refresh again**: Ctrl+Shift+R
7. **Changes should now appear!** 🎉

---

## Why This Fixes It

**Before:**
- Settings page saves → Database rejects (columns don't exist)
- Profile loads → RPC function doesn't return fields
- Result: Nothing changes ❌

**After:**
- Settings page saves → ✅ Columns exist, data saves
- Profile loads → ✅ RPC returns fields  
- Result: Customization works! ✅

---

## Verification Query

After running both scripts, verify with:

```sql
-- Check your actual saved settings
SELECT 
  username,
  show_top_friends,
  top_friends_title,
  top_friends_avatar_style,
  top_friends_max_count
FROM profiles
WHERE username = 'YOUR_USERNAME_HERE';
```

Replace `YOUR_USERNAME_HERE` with your actual username.

---

## 🚨 Important
You MUST run BOTH SQL scripts in your Supabase database. The code is already pushed to GitHub, but **SQL migrations don't auto-run** - you have to manually execute them.

File locations:
1. `sql/add_top_friends_customization.sql` (or use the quick version above)
2. `sql/update_profile_bundle_top_friends.sql` (MUST run this one!)

