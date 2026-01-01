# Link or Nah - Quick Start Guide

## 🚀 Start Testing in 3 Steps

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Open in Browser
Navigate to: `http://localhost:3000/link-or-nah`

### 3. Test the Flow

#### A) First Visit (Setup)
1. Click **"Edit Link Profile"**
2. Toggle **"Enable Link or Nah"** to ON
3. Fill in your info:
   - Display name: "Your Name"
   - Username: "@yourname"
   - Bio: "Your networking bio"
   - Location: "Los Angeles, CA" (optional)
4. Add photos (paste image URLs):
   - `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800`
5. Select 3-4 interest tags (e.g., Music, Business, Tech)
6. Click **"Save Profile"**

#### B) Swipe Experience
1. Click **"Start Swiping"** from landing page
2. You'll see 5 candidate profiles
3. For each card:
   - Tap on photo to see more photos
   - Click info icon (top right) for full profile
   - Click **"Nah"** to pass
   - Click **"Link"** to connect
4. Watch for **Mutual Modal** (20% chance per "Link")
   - If it appears, you matched!
   - Options: Follow, Message (placeholder), Keep Swiping
5. After 5 swipes, you'll see "No More Profiles"
6. Click **"Start Over"** to reset (test mode)

#### C) View Your Mutuals
1. Click **"Mutuals"** tab
2. See list of connections (starts with 2 mock mutuals)
3. Click **"View"** or **"Message"** (placeholders)

#### D) Adjust Settings
1. Click **"Settings"** tab
2. Toggle visibility ON/OFF
3. Update location and filters
4. Try enabling **Dating Mode** (optional):
   - Toggle ON
   - Enter age, preferences, age range
   - See how dating info only shows if both users enable it

---

## 🎨 Features to Test

### Networking First (Default)
- ✅ No dating language by default
- ✅ Focus on "Link", "Connect", "Mutuals"
- ✅ Interest tags emphasize business/creative
- ✅ Age is hidden unless both users enable dating

### Dating Mode (Optional)
- ✅ Clearly marked as "Optional"
- ✅ Separate section with pink gradient
- ✅ Age only appears if BOTH users have it enabled
- ✅ Separate dating bio field
- ✅ Dating preferences (looking for, age range)

### Privacy
- ✅ Location is optional text field (no GPS)
- ✅ Swipe decisions are private
- ✅ Visibility toggle (show/hide profile)
- ✅ Dating info hidden unless mutual opt-in

### UI Polish
- ✅ Smooth transitions
- ✅ 3D card stack effect
- ✅ Photo carousels
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Vector icons (no emoji)
- ✅ Loading states
- ✅ Empty states with CTAs

---

## 📱 Test on Mobile

### Desktop Browser
1. Open DevTools (F12)
2. Click device emulation icon
3. Select iPhone or Android device
4. Test swipe gestures

### Physical Device
1. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Visit: `http://YOUR_IP:3000/link-or-nah`
3. Test touch interactions

---

## 🔧 Mock Data Included

### 5 Candidate Profiles
1. **Alex Rivera** - Music producer (networking)
2. **Jordan Lee** - Fitness coach (dating enabled)
3. **Taylor Morgan** - Tech founder (networking)
4. **Sam Chen** - Streamer (networking)
5. **Casey Brooks** - Fashion blogger (dating enabled)

### 2 Starting Mutuals
1. **Riley Johnson** - Photographer
2. **Morgan Davis** - Entrepreneur

### 18 Interest Tags
Music, Gaming, Fitness, Business, Travel, Food, Art, Tech, Fashion, Sports, Movies, Books, Photography, Crypto, NFTs, Streaming, Content Creation, Networking

---

## 🎯 What to Look For

### Good UX
- Cards should swipe smoothly
- Modals should animate in/out
- No jarring transitions
- Loading states show appropriately
- Buttons have hover effects

### Correct Behavior
- Dating info only shows on Jordan & Casey (they have it enabled)
- Mutual modal appears randomly (20% on "Link")
- Profile saves successfully
- Settings persist after save
- Navigation works between all pages

### Responsive Design
- Mobile: Single column, full-width cards
- Desktop: Max-width containers, centered
- Navigation scrolls horizontally on small screens

---

## 🐛 Known Limitations (By Design)

### UI Only - No Real Backend
- All data is mock/local
- Resets on page refresh
- API stubs simulate delays
- 20% mutual chance is random

### Placeholders
- Messages feature (coming soon page)
- Follow button (alert only)
- View profile (alert only)
- Delete profile (alert only)

### Photo Upload
- Uses URL input for demo
- Logic Agent will add proper upload

---

## 📝 Quick Test Checklist

- [ ] Landing page loads
- [ ] Can navigate to all 6 pages
- [ ] Profile editor saves data
- [ ] Swipe cards advance on "Link" or "Nah"
- [ ] Info modal opens and closes
- [ ] Mutual modal appears (try 5-10 swipes)
- [ ] Mutuals list shows connections
- [ ] Messages shows "coming soon" page
- [ ] Settings saves preferences
- [ ] Dating mode toggles work
- [ ] Dark mode works (if enabled)
- [ ] Mobile responsive (resize browser)

---

## 🎉 Success Criteria

If you can complete these, the feature is working:

1. ✅ Create a Link profile with photos and tags
2. ✅ Swipe through all 5 candidates
3. ✅ Get at least one mutual (try "Start Over" if needed)
4. ✅ View your mutuals list
5. ✅ Change settings and see them persist
6. ✅ Toggle dating mode ON and see age fields appear

---

## 🔗 All Routes

| Route | Purpose |
|-------|---------|
| `/link-or-nah` | Landing page |
| `/link-or-nah/swipe` | Swipe experience |
| `/link-or-nah/profile` | Edit profile |
| `/link-or-nah/mutuals` | View mutuals |
| `/link-or-nah/messages` | Messages (placeholder) |
| `/link-or-nah/settings` | Settings |

---

## 💡 Pro Tips

1. **Reset swipe history**: Settings > Danger Zone > "Reset Swipe History"
2. **Test dating mode**: Both users need it enabled to see age
3. **Photo URLs**: Use any valid image URL for testing
4. **Interest tags**: Select at least 3 for better card display
5. **Mutual testing**: Click "Start Over" to see candidates again

---

**Ready to test! 🚀**

Start at: `http://localhost:3000/link-or-nah`
