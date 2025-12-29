# 🚀 QUICK FIX: Top Friends Customization Not Working

## Problem
You save Top Friends settings (title, avatar style, max count) but they don't appear on your profile. Everything reverts to defaults.

## Root Cause
Database migration files exist in the repo but **were not applied to your Supabase database**.

---

## ⚡ 5-MINUTE FIX

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com
2. Select your project
3. Click "SQL Editor" in left sidebar

### Step 2: Apply Column Migration
1. Open file: `sql/add_top_friends_customization.sql` (in your project)
2. Copy the ENTIRE contents
3. Paste into Supabase SQL Editor
4. Click "Run" (bottom right)
5. ✅ Should see "Success. No rows returned"

### Step 3: Update RPC Function
1. Open file: `sql/update_profile_bundle_top_friends.sql` (in your project)
2. Copy the ENTIRE contents (all ~245 lines)
3. Paste into Supabase SQL Editor
4. Click "Run"
5. ✅ Should see "Success. No rows returned"

### Step 4: Verify Fix
1. In Supabase SQL Editor, run this (replace YOUR_USERNAME):
```sql
SELECT username, show_top_friends, top_friends_title, top_friends_avatar_style, top_friends_max_count
FROM profiles
WHERE username = 'YOUR_USERNAME';
```
2. ✅ Should see NULL values (or your old values if you saved before)

### Step 5: Re-save Your Settings
1. Go to https://mylivelinks.com/settings/profile
2. Scroll to "Top Friends Customization"
3. Change any setting (title, avatar style, etc.)
4. Click "Save All Changes" at top
5. ✅ Should see "Profile saved successfully!"

### Step 6: Check Your Profile
1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Visit your profile: https://mylivelinks.com/@YOUR_USERNAME
3. ✅ Top Friends section should now show your custom settings!

---

## 🧪 Verify It Worked

### Test 1: Database Check
```sql
SELECT show_top_friends, top_friends_title, top_friends_avatar_style, top_friends_max_count
FROM profiles
WHERE username = 'YOUR_USERNAME';
```
**Expected**: Your custom values (not NULL)

### Test 2: API Check
Open browser console (F12), paste this:
```javascript
fetch('/api/profile/YOUR_USERNAME/bundle')
  .then(r => r.json())
  .then(d => {
    console.log('Show Top Friends:', d.profile.show_top_friends);
    console.log('Title:', d.profile.top_friends_title);
    console.log('Avatar Style:', d.profile.top_friends_avatar_style);
    console.log('Max Count:', d.profile.top_friends_max_count);
  });
```
**Expected**: Your custom values (not undefined)

### Test 3: Visual Check
1. Visit profile
2. Scroll to Top Friends section
3. Check title matches what you set
4. Check avatars are circle or square (as you set)
5. Check only N friends show (N = your max count setting)

---

## 🐛 Still Not Working?

### Problem: SQL gives error "column already exists"
**Solution**: Column migration was already applied, skip Step 2, do Steps 3-6 only

### Problem: SQL gives error "permission denied"
**Solution**: Make sure you're the project owner in Supabase, or have admin access

### Problem: Settings save but still show defaults
**Causes**:
1. Browser cache - Hard refresh (Ctrl+Shift+R)
2. Service worker - Open DevTools > Application > Service Workers > Unregister
3. API cache - Wait 30 seconds and refresh
4. Wrong username - Make sure you're checking YOUR profile not someone else's

### Problem: Can't find the SQL files
**Location**: Both files are in the `sql/` folder at project root:
- `sql/add_top_friends_customization.sql`
- `sql/update_profile_bundle_top_friends.sql`

---

## 📋 What Each Migration Does

### `add_top_friends_customization.sql`
Adds 4 new columns to `profiles` table:
- `show_top_friends` (boolean, default true)
- `top_friends_title` (text, default 'Top Friends')  
- `top_friends_avatar_style` (text, default 'square')
- `top_friends_max_count` (integer, default 8)

**Safe to run**: Uses `ADD COLUMN IF NOT EXISTS` - won't error if columns already exist

### `update_profile_bundle_top_friends.sql`
Updates `get_profile_bundle` function to:
- SELECT the 4 new Top Friends columns
- Use COALESCE to provide defaults if values are NULL
- Return them in the JSON bundle sent to your profile page

**Safe to run**: Uses `CREATE OR REPLACE FUNCTION` - safe to run multiple times

---

## 🎯 Summary

**Time**: 5 minutes  
**Risk**: None (safe migrations)  
**Impact**: Top Friends customization will work  
**Rollback**: Not needed (columns just get defaults)

After fix:
- ✅ Settings save
- ✅ Settings persist in database  
- ✅ Settings returned by API
- ✅ Settings display on profile

---

## 💡 Future Prevention

Before assuming a feature doesn't work:
1. Check if SQL migration files exist in `sql/` folder
2. Check if they've been run in Supabase (query `information_schema.columns`)
3. Run them if needed
4. THEN test the feature

**Pro tip**: Keep a log of which migrations you've applied!

---

Need help? Check the full audit report: `PROFILE_SETTINGS_COMPREHENSIVE_AUDIT_REPORT.md`
