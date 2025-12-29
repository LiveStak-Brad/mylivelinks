# 🔍 Top Friends - Complete Debug Guide

Since you've run all the SQL, let's debug step by step to find where it's breaking.

## Step 1: Verify Database Has Data

Run this in **Supabase SQL Editor** (replace `YOUR_USERNAME` with your actual username):

```sql
SELECT 
  username,
  show_top_friends,
  top_friends_title,
  top_friends_avatar_style,
  top_friends_max_count
FROM profiles
WHERE username = 'YOUR_USERNAME';
```

**Expected Result:**
- `show_top_friends`: `true` or `false`
- `top_friends_title`: Your custom title (e.g., "Top G's")
- `top_friends_avatar_style`: `'circle'` or `'square'`
- `top_friends_max_count`: A number between 1-8

**If these are NULL or default values**, the save isn't working. Go to Step 2.
**If these show your custom values**, the save IS working. Go to Step 3.

---

## Step 2: If Data is NOT Saved - Debug Save Process

1. Open browser console (F12) on Settings page
2. Make a change to Top Friends settings
3. Click "Save All Changes"
4. Check console for errors
5. Check Network tab → Find the `profiles` request → Check if the fields are in the payload

---

## Step 3: If Data IS Saved - Debug API Response

On your profile page:

1. Open browser console (F12)
2. Paste this code and run it:

```javascript
fetch('/api/profile/YOUR_USERNAME/bundle')
  .then(res => res.json())
  .then(data => {
    console.log('=== Top Friends Debug ===');
    console.log('show_top_friends:', data?.profile?.show_top_friends);
    console.log('top_friends_title:', data?.profile?.top_friends_title);
    console.log('top_friends_avatar_style:', data?.profile?.top_friends_avatar_style);
    console.log('top_friends_max_count:', data?.profile?.top_friends_max_count);
    
    if (data?.profile?.show_top_friends === undefined) {
      console.error('❌ RPC not returning show_top_friends!');
    } else {
      console.log('✅ API returning fields correctly');
    }
  });
```

**If fields are `undefined`**, the RPC function isn't returning them. Go to Step 4.
**If fields show correct values**, the API is working. Go to Step 5.

---

## Step 4: Fix RPC Function

The RPC might not have been updated. Run this query to check:

```sql
-- Check if RPC has the new fields
SELECT prosrc FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'get_profile_bundle'
LIMIT 1;
```

Search the output for `show_top_friends`. 

**If NOT found**, run the ENTIRE contents of `sql/update_profile_bundle_top_friends.sql` again in SQL Editor.

After running it, test Step 3 again.

---

## Step 5: If API Works - Debug Component

If the API returns the data but the UI doesn't show it:

1. On your profile, open React DevTools
2. Find the `TopFriendsDisplay` component
3. Check its props:
   - `showTopFriends`
   - `topFriendsTitle`
   - `topFriendsAvatarStyle`
   - `topFriendsMaxCount`

**If props are correct but UI is wrong**, there's a render logic issue.
**If props are undefined**, the parent isn't passing them correctly.

---

## Step 6: Clear ALL Caches

Sometimes aggressive caching causes issues:

1. **Hard refresh**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Clear browser cache**:
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cached images and files"
   - Time range: "Last hour"
3. **Try incognito/private window**
4. **Restart browser completely**

---

## Step 7: Check for Type Mismatches

In browser console on your profile:

```javascript
// Check what types the component is receiving
const props = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?._rendererProps;
console.log('TopFriendsDisplay props:', props);
```

---

## Quick Fix Attempts

### Fix 1: Force Defaults in Component
Temporarily add console logs to `components/profile/TopFriendsDisplay.tsx`:

```typescript
console.log('TopFriends Props:', {
  showTopFriends,
  topFriendsTitle,
  topFriendsAvatarStyle,
  topFriendsMaxCount
});
```

### Fix 2: Check Profile Data
In `app/[username]/modern-page.tsx` around line 1128, add:

```typescript
console.log('Profile data for TopFriends:', {
  show_top_friends: profile.show_top_friends,
  top_friends_title: profile.top_friends_title,
  top_friends_avatar_style: profile.top_friends_avatar_style,
  top_friends_max_count: profile.top_friends_max_count
});
```

---

## What to Tell Me

Run the steps above and tell me:
1. **Step 1 result**: Are the values in the database?
2. **Step 3 result**: Is the API returning them?
3. **Step 5 result**: Are the props being passed to the component?
4. **Any console errors?**

This will tell me exactly where it's breaking! 🔍

