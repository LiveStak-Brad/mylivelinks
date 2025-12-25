# 🎯 TESTING: Social Share Previews

## Quick Test URLs

After deployment, test these tools:

### 1. Facebook Sharing Debugger
https://developers.facebook.com/tools/debug/

**Test with:**
```
https://www.mylivelinks.com/CannaStreams-Owner
```

### 2. Twitter Card Validator  
https://cards-dev.twitter.com/validator

**Test with:**
```
https://www.mylivelinks.com/CannaStreams-Owner
```

### 3. Direct OG Image Test
Open in browser:
```
https://www.mylivelinks.com/api/og?username=CannaStreams-Owner&displayName=Brad&bio=Live%20streaming%20and%20content%20creator&avatarUrl=YOUR_AVATAR_URL
```

## Expected Results

### Facebook Preview Should Show:
- ✅ Your circular profile photo (180px, white border)
- ✅ Display name in large text
- ✅ @username handle
- ✅ Your bio (first 120 chars)
- ✅ Purple gradient background
- ✅ "🔥 Follow me on MyLiveLinks" button
- ✅ MyLiveLinks.com branding at bottom
- ✅ Image dimensions: 1200×630px

### Twitter Preview Should Show:
- ✅ Large image card (summary_large_image)
- ✅ Same beautiful design as Facebook
- ✅ Title: "[Name] is on MyLiveLinks! 🔥"
- ✅ Description with bio

## If Preview Doesn't Show

### Common Issues:

**1. Cache Issues**
- Click "Scrape Again" in Facebook Debugger
- Wait 5 minutes and try again
- Clear browser cache

**2. Avatar Not Loading**
- Make sure avatar_url is public
- Check if Supabase Storage URLs are accessible
- Try with a direct image URL

**3. Metadata Not Found**
- Verify deployment completed
- Check Vercel deployment logs
- Ensure page is server-rendered (not client-only)

## Real-World Tests

### After Debugger Tests Pass:

**1. Facebook Post**
- Create a new Facebook post
- Paste your profile URL
- Verify beautiful preview appears
- Share to timeline

**2. Twitter Tweet**
- Create a new tweet
- Paste your profile URL
- Verify large image card appears
- Tweet it

**3. iMessage (iOS)**
- Send your URL to yourself
- Tap the link
- Verify preview appears inline
- Should show your photo!

**4. Instagram DM**
- Send URL to a friend in Instagram DM
- Preview should appear when tapped

**5. Discord**
- Paste URL in any channel
- Embed should appear automatically
- Shows your full profile card

## Success Criteria

✅ **SHIP IT when all these pass:**

1. Facebook Debugger shows no errors
2. Twitter Validator shows large image card
3. Real Facebook post displays preview
4. Real Twitter tweet displays card
5. iMessage shows preview
6. Discord embed works

## Performance Checks

**Speed Test:**
- First load: Should generate in <1 second
- Cached load: Should return in <100ms
- Check Vercel function logs for any errors

**Image Quality:**
- Zoom in on preview - text should be crisp
- Profile photo should be clear
- Gradient should be smooth
- No pixelation or artifacts

## Troubleshooting Commands

```bash
# Check if API route is accessible
curl https://www.mylivelinks.com/api/og?username=test

# Check profile metadata
curl https://www.mylivelinks.com/CannaStreams-Owner | grep "og:"

# Verify package is installed
npm list @vercel/og
```

## Next Steps After Testing

1. ✅ Test with your own profile
2. ✅ Test with 3-5 different user profiles
3. ✅ Share on your personal socials to verify
4. ✅ Ask beta users to test and report back
5. ✅ Monitor Vercel function logs for errors
6. ✅ Announce the feature to all users
7. ✅ Create tutorial video showing how it works

---

**Status**: ⏳ Awaiting deployment + testing  
**ETA to Production**: Deployed, needs manual verification  
**Impact**: 🚀 GAME CHANGER for growth

