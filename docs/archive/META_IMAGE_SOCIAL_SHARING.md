# Meta Image Social Sharing Setup ✅

## Summary
Implemented the new MyLiveLinks meta image (`mylivelinksmeta.png`) for social media sharing across the platform.

## Image Added
**File:** `public/mylivelinksmeta.png`

**Specifications:**
- **Size:** 1200x630px (optimal for Open Graph/Twitter Cards)
- **Content:** MyLiveLinks branding with coins and tagline "Share your links, Make Posts, Go Live, Get Paid!"
- **Format:** PNG with vibrant gradient background

---

## Meta Tags Implementation

### 1. Root Layout (Default for All Pages)
**File:** `app/layout.tsx`

**Added Meta Tags:**
```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="MyLiveLinks" />
<meta property="og:title" content="MyLiveLinks - One link. Every live." />
<meta property="og:description" content="Share your links, make posts, go live, and get paid! Join the MyLiveLinks community." />
<meta property="og:image" content="/mylivelinksmeta.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="MyLiveLinks - One link. Every live." />
<meta name="twitter:description" content="Share your links, make posts, go live, and get paid! Join the MyLiveLinks community." />
<meta name="twitter:image" content="/mylivelinksmeta.png" />
```

**Applies To:**
- Home page (`/`)
- Feed page (`/feed`)
- Live page (`/live`)
- Rooms page (`/rooms`)
- Messages, Notifications, Wallet, Settings, etc.
- Any page without custom metadata

---

### 2. Profile Pages (Custom OG Images)
**File:** `app/[username]/page.tsx`

**Behavior:**
- ✅ **With Avatar:** Uses dynamically generated OG image with user's avatar and watermark
  - API: `/api/og/profile?avatar={url}&username={username}`
- ✅ **Without Avatar:** Falls back to `/mylivelinksmeta.png` (updated from missing `og-default.png`)

**Result:**
- User profiles show personalized preview images when shared
- Generic MyLiveLinks branding shown if no avatar exists

---

## Social Platform Preview

When someone shares a MyLiveLinks link:

### **Facebook / Discord / LinkedIn**
- Shows: MyLiveLinks logo, coins graphic, tagline
- Size: 1200x630px
- Card Type: Large image

### **Twitter / X**
- Shows: Same image as above
- Card Type: `summary_large_image`

### **iMessage / WhatsApp / Telegram**
- Shows: Same image (via Open Graph tags)

---

## Pages Using Default Meta Image

✅ Home page  
✅ Feed  
✅ Live / Live Central  
✅ Rooms  
✅ Messages  
✅ Notifications  
✅ Wallet  
✅ Settings  
✅ Gifter Levels  
✅ Coin Packs  
✅ Any other generic pages

---

## Pages Using Custom Meta Images

✅ **Profile Pages** (`/@username`)
- Uses generated OG image with user avatar
- Fallback: `/mylivelinksmeta.png`

✅ **Live Rooms** (if user shares while streaming)
- Will inherit default meta image
- Future: Could generate custom room preview

---

## Testing Social Sharing

### Facebook Debugger
https://developers.facebook.com/tools/debug/
- Paste: `https://www.mylivelinks.com`
- Click "Scrape Again" to refresh cache

### Twitter Card Validator
https://cards-dev.twitter.com/validator
- Paste: `https://www.mylivelinks.com`
- View preview

### LinkedIn Post Inspector
https://www.linkedin.com/post-inspector/
- Paste: `https://www.mylivelinks.com`
- Check preview

---

## Next Steps (Optional)

1. **Custom Live Room OG Images:**
   - Generate dynamic images for active live rooms
   - Show grid of current streamers

2. **Feed Post Previews:**
   - Individual post sharing with post content preview

3. **App Store Screenshots:**
   - Use similar branding style for mobile app store listings

---

**Status:** ✅ Complete, ready for deployment

