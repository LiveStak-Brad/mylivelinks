# Referral Entry Points - Test & Demo Guide

## Testing the Implementation

### 1. Test on Home Page

**URL:** `http://localhost:3000/` (or your dev server)

**What to look for:**
- After logging in, scroll down below the hero banner
- You should see a purple-pink-orange gradient card
- Title: "Build Your Network"
- Click "Get My Invite Link" - should reveal a link section
- Click copy button - should copy link to clipboard
- Should show success state (green checkmark)

**Visibility Test:**
- Logged OUT: Card should NOT be visible
- Logged IN: Card SHOULD be visible

### 2. Test on Profile Page (Owner View)

**URL:** `http://localhost:3000/[your-username]`

**What to look for:**
- Navigate to your own profile
- Click "Info" tab if not already there
- Top of the content should show "Referral Network" card
- Should see stats: "12 Joined", "8 Active"
- Should see rank badge: "#247"
- Progress bar showing 67%
- Two buttons: "Share Link" and "View Details"

**Visibility Test:**
- YOUR profile: Module SHOULD be visible
- OTHER user's profile: Module should NOT be visible

### 3. Responsive Testing

**Desktop (> 1024px):**
- Open browser to full width
- All features should be visible
- Buttons side-by-side
- Plenty of spacing

**Tablet (640px - 1024px):**
- Resize browser to ~800px width
- Layout should adjust smoothly
- Text should remain readable

**Mobile (< 640px):**
- Resize browser to ~375px width (iPhone SE)
- Content should stack vertically
- Buttons should be full-width
- Text should not overflow
- Touch targets should be easy to tap

### 4. Theme Testing

**Light Theme:**
- Toggle theme to light
- Card backgrounds should be light/white
- Text should be dark for contrast
- Borders should be subtle gray

**Dark Theme:**
- Toggle theme to dark
- Card backgrounds should be dark
- Text should be light/white
- Borders should be darker gray

### 5. Interaction Testing

**Copy Button:**
1. Click "Get My Invite Link"
2. Click the copy icon (📋)
3. Should see checkmark (✓)
4. Paste in notepad - should see referral link
5. After 2 seconds, icon should revert to 📋

**Share Button:**
1. On mobile device, click "Share Link"
2. Should open native share sheet
3. On desktop, should copy to clipboard

**View Details Button:**
1. Click "View Details"
2. Should navigate to `/referrals` page
3. (Page doesn't exist yet - expected 404)

### 6. Edge Cases

**Long Username:**
- Test with username > 20 characters
- Should truncate properly in link display

**No JavaScript:**
- Disable JS in browser
- Components should fail gracefully (no errors)

**Slow Connection:**
- Throttle network in DevTools
- Components should render without flash of unstyled content

## Screenshot Checklist

Take screenshots of:
- [ ] Home page with ReferralCard (desktop)
- [ ] Home page with ReferralCard (mobile)
- [ ] ReferralCard with invite link expanded
- [ ] Profile page with ReferralProgressModule (desktop)
- [ ] Profile page with ReferralProgressModule (mobile)
- [ ] Light theme version
- [ ] Dark theme version
- [ ] Copy button success state
- [ ] Hover states on buttons

## Performance Testing

Open DevTools → Performance:
1. Record page load
2. Check component render time
3. Should be < 16ms for 60fps
4. No layout shifts
5. No excessive re-renders

Open DevTools → Lighthouse:
1. Run accessibility audit
2. Should score 95+ on accessibility
3. No contrast issues
4. No missing alt text

## Browser Testing

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)

## Console Checks

Open DevTools → Console:
- [ ] No errors on page load
- [ ] No errors on interaction
- [ ] No warnings about dependencies
- [ ] No CORS issues

## Known Issues / Expected Behavior

1. **"View Details" leads to 404:**
   - Expected - `/referrals` page not created yet
   - Will be implemented in Phase 2

2. **Mock data is hardcoded:**
   - Expected - no backend integration yet
   - All users see same numbers (12/8/247)

3. **Referral link is demo:**
   - Expected - using `demo123` code
   - Will be replaced with real unique codes

4. **No loading states:**
   - Expected - no API calls yet
   - Will add spinners when integrating backend

## Quick Fixes

If something doesn't work:

**Component not showing:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

**Styling broken:**
```bash
# Rebuild Tailwind
npm run build
```

**TypeScript errors:**
```bash
# Check types
npx tsc --noEmit
```

## Success Criteria

✅ Both components render without errors  
✅ Responsive on all screen sizes  
✅ Copy functionality works  
✅ Share functionality works (mobile)  
✅ Proper visibility (logged-in / owner-only)  
✅ Theme support (light/dark)  
✅ No console errors  
✅ Smooth animations  
✅ Professional appearance  
✅ Readable text at all sizes  

## Demo Script

**For showcasing to stakeholders:**

> "I'd like to show you our new referral system. First, on the home page, logged-in users now see this beautiful 'Build Your Network' card. Notice the premium gradient design - purple to pink to orange. Users can click 'Get My Invite Link' and immediately get their unique referral link with easy copy functionality.
>
> Now on the profile page - notice this is only visible to the profile owner - we have a detailed referral progress module. It shows how many people have joined (12), how many are active (8), and their rank compared to other referrers (#247 out of 1,853). There's a visual progress bar showing the active conversion rate at 67%.
>
> Users can quickly share their link or view more details. The design respects the user's profile customization - see how it uses their accent color throughout. And it's fully responsive - watch as I resize the browser... everything adapts beautifully for mobile.
>
> The language is intentionally non-committal - we say 'top referrers unlock perks' with an eyes emoji, not making specific promises. It's premium and professional, not spammy. Currently using mock data, ready for backend integration."

## Next Steps After Testing

1. ✅ Verify all functionality works
2. 📸 Take screenshots for documentation
3. 📝 Document any bugs found
4. 🎨 Get design approval from stakeholders
5. 🔌 Plan backend API integration
6. 🚀 Deploy to staging environment
7. 👥 Gather user feedback
8. 🔄 Iterate based on feedback

---

**Happy Testing!** 🧪🎉

