# Quick Start: Testing Modern Profile System

## 🚀 5-Minute Setup

### 1. Run Database Migration (2 minutes)

Open **Supabase SQL Editor** and run:

```bash
# Copy the entire contents of profile_system_schema.sql and execute
```

**Verify it worked:**
```sql
-- Should return rows
SELECT * FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'profile_bg_url';
```

### 2. Start Development Server (1 minute)

```bash
npm run dev
```

### 3. Test Basic Profile (2 minutes)

Visit: `http://localhost:3000/{your-username}`

**What you should see:**
- ✅ Profile loads with avatar, name, bio
- ✅ Follower/following/friends counts
- ✅ Links section (if you have links)
- ✅ Stats card showing zeros (if no streams yet)
- ✅ Empty states for supporters/streamers

---

## ✅ Essential Tests (10 minutes)

### Test 1: View Profile
- [ ] Navigate to `/{username}`
- [ ] Verify profile loads without errors
- [ ] Check console for API errors (should be none)

### Test 2: Customize Profile
- [ ] Go to Settings → Profile
- [ ] Scroll to "Profile Customization"
- [ ] Change accent color (pick any color)
- [ ] Click "Save Customization"
- [ ] Return to your profile
- [ ] Verify accent color changed on buttons/widgets

### Test 3: Follow/Unfollow
- [ ] Create two test accounts (or use existing)
- [ ] User A visits User B's profile
- [ ] Click "Follow" button
- [ ] Verify button changes to "Following"
- [ ] User B visits User A's profile
- [ ] Click "Follow" button
- [ ] Verify button changes to "Friends" (mutual)

### Test 4: Add Links
- [ ] Go to Settings → Profile
- [ ] Add a new link:
   - Title: "Twitter"
   - URL: "https://twitter.com"
   - Icon: "🐦"
- [ ] Save
- [ ] Visit your profile
- [ ] Verify link appears
- [ ] Click link, verify it opens in new tab

### Test 5: Followers Modal
- [ ] Follow at least 1 user
- [ ] Visit your profile
- [ ] Click on "Following" count
- [ ] Verify modal opens with list
- [ ] Click on a user in list
- [ ] Verify navigates to their profile

---

## 🐛 Common Issues & Fixes

### Issue: Profile data not loading
**Fix:**
```typescript
// Check browser console for error
// Most likely: RPC function doesn't exist
// Run profile_system_schema.sql again
```

### Issue: Customization not saving
**Fix:**
```typescript
// Check Supabase table:
SELECT profile_bg_url, card_color, accent_color 
FROM profiles 
WHERE id = '{your-user-id}';

// If NULL, check RLS policies:
SELECT * FROM profiles WHERE id = auth.uid(); -- Should return your row
```

### Issue: Follow button not working
**Fix:**
```typescript
// Check if you're logged in:
const { data: { user } } = await supabase.auth.getUser();
console.log(user); // Should not be null

// Check RPC function exists:
SELECT * FROM information_schema.routines 
WHERE routine_name = 'toggle_follow';
```

### Issue: 404 on profile page
**Fix:**
```typescript
// Verify username exists:
SELECT username FROM profiles WHERE username = '{test-username}';

// Check Next.js file exists:
// app/[username]/page.tsx should export from modern-page.tsx
```

---

## 📊 Database Quick Checks

### Check Profile Customization
```sql
SELECT 
  username,
  accent_color,
  card_color,
  font_preset,
  links_section_title
FROM profiles
WHERE username = '{your-username}';
```

### Check Follows
```sql
-- Your followers
SELECT COUNT(*) FROM follows 
WHERE followee_id = (SELECT id FROM profiles WHERE username = '{your-username}');

-- Who you're following
SELECT COUNT(*) FROM follows 
WHERE follower_id = (SELECT id FROM profiles WHERE username = '{your-username}');
```

### Check Links
```sql
SELECT title, url, icon, click_count 
FROM user_links 
WHERE profile_id = (SELECT id FROM profiles WHERE username = '{your-username}')
ORDER BY display_order;
```

---

## 🎯 Success Checklist

After running all tests, you should have:

- [x] Profile page loads successfully
- [x] Customization saves and applies
- [x] Follow/unfollow works
- [x] Friends detection works (mutual follow)
- [x] Links display correctly
- [x] Link clicks tracked
- [x] Modals open for followers/following/friends
- [x] No console errors
- [x] No 404 errors
- [x] Responsive on mobile

**If all checked:** ✅ **SYSTEM READY FOR PRODUCTION!**

---

## 🚀 Deploy to Production

Once all tests pass:

```bash
# 1. Commit changes
git add .
git commit -m "feat: implement modern profile system"

# 2. Push to main
git push origin main

# 3. Vercel auto-deploys
# Monitor deployment at vercel.com

# 4. Run migration on production Supabase
# Copy profile_system_schema.sql to production SQL editor
# Execute

# 5. Test production profile
# Visit https://your-domain.com/{your-username}
```

---

## 📞 Need Help?

**Check these files:**
- `PROFILE_SYSTEM_TESTING.md` - Full testing guide
- `PROFILE_SYSTEM_COMPLETE.md` - Implementation summary
- Browser console - API errors
- Supabase logs - Query errors

**Common commands:**
```bash
# Restart dev server
npm run dev

# Check TypeScript errors
npm run type-check

# Check linting
npm run lint

# View Supabase logs
# Go to Supabase Dashboard → Logs
```

---

**🎉 You're ready to go!** Start with Test 1 and work through the checklist. Each test takes ~2 minutes. Total time: **~10 minutes** to verify everything works!

