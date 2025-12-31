# Live Avatar Indicator - Test Checklist

## 🧪 Manual Testing Guide

### Before Testing
- [ ] Build the app: `npm run build`
- [ ] Start dev server: `npm run dev`
- [ ] Have 2+ test accounts ready
- [ ] Open browser DevTools (Console + Network tabs)

---

## Test 1: Profile Page (Own Profile)

### Setup:
1. Log in as User A
2. Navigate to your profile: `/{your-username}`

### When NOT Live:
- [ ] Avatar shows normal ring (subtle white)
- [ ] No red ring visible
- [ ] No "LIVE" badge
- [ ] Avatar is NOT clickable (no pointer cursor)
- [ ] No live banner shown

### When Live:
1. Start a stream: Go to `/live` → Start streaming
2. Navigate back to your profile

- [ ] Avatar has strong red ring (6px)
- [ ] Outer ring pulses (animation visible)
- [ ] "LIVE" badge visible at bottom-right of avatar
- [ ] Hover over avatar → scales slightly (1.05x)
- [ ] Avatar is clickable (pointer cursor)
- [ ] Click avatar → navigates to `/live/{username}`
- [ ] Live banner shown at top with "Watch Live" button
- [ ] Banner button navigates to `/live/{username}`

---

## Test 2: Profile Page (Other User's Profile)

### Setup:
1. User A starts streaming
2. Log in as User B
3. Navigate to User A's profile: `/{userA-username}`

### When User A is Live:
- [ ] Avatar has red ring
- [ ] Pulsing animation visible
- [ ] "LIVE" badge visible
- [ ] Avatar is clickable
- [ ] Click avatar → navigates to `/live/{userA-username}`
- [ ] Live banner shows "Watch Live" (if logged in)
- [ ] Banner button navigates to `/live/{userA-username}`

### When User A is NOT Logged In:
- [ ] Banner shows "Login to Watch"
- [ ] Banner button navigates to `/login?returnTo=/{username}`

---

## Test 3: Chat Messages

### Setup:
1. User A starts streaming
2. User B opens `/live` page
3. User A sends chat message

### In Chat:
- [ ] User A's message shows avatar with red ring
- [ ] Ring is visible but subtle (2-3px for `size="sm"`)
- [ ] No "LIVE" badge (showLiveBadge={false})
- [ ] Click avatar → navigates to `/live/{userA-username}`
- [ ] User B's message (not live) shows normal avatar

### Selected Profile:
- [ ] Click username → UserActionCard opens
- [ ] UserActionCard shows `isLive: true` in console
- [ ] "Watch Live" button appears (if implemented in UserActionCard)

---

## Test 4: Viewer List

### Setup:
1. User A starts streaming (actively publishing)
2. User B starts streaming (but not in /live room)
3. User C joins /live room (not streaming)

### In Viewer List:
- [ ] User A: Shows red webcam icon (actively publishing)
- [ ] User A: Webcam icon is draggable to grid
- [ ] User B: Shows avatar with red ring (live but not publishing)
- [ ] User B: Click avatar → navigates to `/live/{userB-username}`
- [ ] User C: Shows normal avatar (not live)
- [ ] User C: Click username → shows profile card

---

## Test 5: User Menu (Top Navigation)

### Setup:
1. Log in as User A
2. Check top-right user menu button

### When NOT Live:
- [ ] Own avatar shows normal ring
- [ ] No red ring
- [ ] Click opens dropdown menu correctly

### When Live:
1. Start streaming
2. Check user menu

- [ ] Own avatar shows red ring
- [ ] Ring pulses
- [ ] No "LIVE" badge (showLiveBadge={false})
- [ ] Click still opens dropdown menu (not navigating away)
- [ ] Menu functions normally (all links work)

---

## Test 6: Real-Time Updates

### Setup:
1. User A opens profile page
2. User B opens User A's profile in another browser/tab

### Test Live Status Updates:
1. User A starts streaming
   - [ ] User A's avatar updates to show red ring (on own profile)
   - [ ] User B sees red ring appear on User A's avatar (on User A's profile)
   - [ ] Both see live banner appear

2. User A ends streaming
   - [ ] User A's avatar returns to normal ring
   - [ ] User B sees red ring disappear
   - [ ] Both see live banner disappear

### Timing:
- [ ] Updates happen within 5-10 seconds (real-time subscription)
- [ ] No page refresh needed

---

## Test 7: Responsive Design

### Desktop (1920×1080):
- [ ] Profile avatar: 128×128px
- [ ] Chat avatars: 32×32px
- [ ] User menu avatar: 40px
- [ ] All rings proportional to avatar size
- [ ] Badges readable

### Tablet (768×1024):
- [ ] Profile avatar: 128×128px (same as desktop)
- [ ] Chat avatars: 32×32px
- [ ] Layout not broken
- [ ] Touch targets adequate

### Mobile (375×667):
- [ ] Profile avatar: 96×96px
- [ ] Chat avatars: 32×32px
- [ ] User menu avatar: 32px
- [ ] Badges still readable
- [ ] Touch targets at least 44×44px
- [ ] No horizontal scroll

---

## Test 8: Fallbacks & Edge Cases

### No Avatar Image:
- [ ] Shows username initial in colored circle
- [ ] Initial is uppercase
- [ ] Red ring still visible when live
- [ ] Fallback background color uses accent color (profile)
- [ ] Fallback background is gradient (chat/lists)

### Very Long Usernames:
- [ ] Avatar doesn't distort
- [ ] Badge doesn't overlap username
- [ ] Tooltips show full username

### Network Issues:
- [ ] Avatar loads gracefully
- [ ] Fallback avatar shown if image fails
- [ ] No broken image icons

### Auth Edge Cases:
- [ ] Logged out users see live indicators
- [ ] Logged out users can't navigate to streams (redirected to login)
- [ ] New users without profiles show sensible defaults

---

## Test 9: Accessibility

### Keyboard Navigation:
- [ ] Tab to avatar focuses it
- [ ] Enter/Space activates navigation (when clickable)
- [ ] Escape dismisses user menu
- [ ] No keyboard traps

### Screen Readers:
- [ ] Avatar has proper `alt` text
- [ ] Links have descriptive `title` attributes
- [ ] "Watch {name} live" announced when avatar is live
- [ ] Badge text ("LIVE") is readable

### Color Contrast:
- [ ] Red ring visible on light backgrounds
- [ ] Red ring visible on dark backgrounds
- [ ] Badge text readable (white on red)
- [ ] Fallback initials readable

---

## Test 10: Performance

### Load Time:
- [ ] Avatars load quickly
- [ ] No layout shift when avatars load
- [ ] Animations smooth (60fps)

### Memory:
- [ ] Check DevTools → Performance
- [ ] No memory leaks after navigating
- [ ] Animations don't cause high CPU usage

### Network:
- [ ] Check DevTools → Network
- [ ] Avatars cached appropriately
- [ ] No duplicate requests for same avatar
- [ ] Real-time updates don't spam server

---

## Test 11: Cross-Browser Testing

### Chrome/Edge (Chromium):
- [ ] All animations smooth
- [ ] Red ring renders correctly
- [ ] No console errors

### Firefox:
- [ ] Pulsing animation works
- [ ] Ring sizes correct
- [ ] Navigation works

### Safari (Desktop):
- [ ] Animations perform well
- [ ] Rounded corners render properly
- [ ] Image lazy loading works

### Mobile Safari (iOS):
- [ ] Touch targets adequate
- [ ] Hover states don't stick
- [ ] Navigation works
- [ ] Animations smooth

### Mobile Chrome (Android):
- [ ] All features work
- [ ] Performance acceptable
- [ ] No visual glitches

---

## 🐛 Known Issues to Watch For

### Potential Issues:
- [ ] Ring might not be perfectly circular if avatar aspect ratio is wrong
- [ ] Badge might overlap username in tight layouts
- [ ] Pulsing animation might not work in reduced motion mode
- [ ] Real-time updates might delay if Supabase connection drops

### Solutions:
- Ensure avatars are square (1:1 aspect ratio)
- Use `showLiveBadge={false}` in compact layouts
- Respect `prefers-reduced-motion` CSS media query
- Implement reconnection logic for Supabase

---

## ✅ Sign-Off Checklist

### Before Deployment:
- [ ] All tests above passing
- [ ] No console errors
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Tested on 3+ browsers
- [ ] Tested on mobile device
- [ ] Verified with team/stakeholder

### After Deployment:
- [ ] Monitor error logs (Sentry/etc)
- [ ] Check analytics for user engagement
- [ ] Gather user feedback
- [ ] Watch for performance issues

---

## 📊 Success Metrics

### Expected Outcomes:
- ✅ 0 console errors related to LiveAvatar
- ✅ <100ms render time for avatar component
- ✅ 0 layout shifts when avatars load
- ✅ Real-time updates within 10 seconds
- ✅ 100% keyboard accessibility
- ✅ Works on all major browsers

### User Behavior:
- Watch for increased click-through rate on live avatars
- Monitor navigation to `/live/{username}` from profiles
- Track time-to-live-stream from profile page
- Measure user satisfaction with live discovery

---

## 🎉 Ready to Deploy!

Once all checkboxes are ticked, you're good to go! The Live Avatar Indicator is fully functional and ready for production. 🚀
