# Artist Gifting Test Plan

## Pre-Testing Setup

### Required Accounts:
1. **Artist Account** - Profile with `profile_type = 'musician'`
   - Has uploaded music tracks
   - Has uploaded music videos (or YouTube videos)
   - Has coins available for testing (optional)

2. **Fan Account** - Regular user account
   - Has sufficient coin balance for testing (at least 100 coins)
   - Different from Artist Account

### Test Data Needed:
- At least 2-3 music tracks in artist's profile
- At least 1-2 music videos in artist's profile
- Multiple gift types available in database
- Valid coin balances

---

## Test Cases

### TC-1: Music Player Gift Button Visibility

**Objective:** Verify gift button appears correctly on music player

**Steps:**
1. Log in as Fan Account
2. Navigate to Artist's profile (e.g., `/@artistusername`)
3. Scroll to Music section (or click Music tab)
4. Wait for music player to load

**Expected:**
- ✅ Music player displays with tracks
- ✅ Gift button (🎁) visible in controls row
- ✅ Gift button positioned after Previous/Play/Next buttons
- ✅ Button has gradient pink-to-purple styling
- ✅ Button shows hover effect when moused over

**Pass/Fail:** ____

---

### TC-2: Music Player Gift Button - Owner View

**Objective:** Verify gift button does NOT appear for profile owner

**Steps:**
1. Log in as Artist Account
2. Navigate to own profile
3. Go to Music section

**Expected:**
- ✅ Music player displays with tracks
- ✅ Gift button does NOT appear (owner can't gift themselves)
- ✅ Only Previous/Play/Next buttons visible

**Pass/Fail:** ____

---

### TC-3: Send Gift from Music Player

**Objective:** Complete gift transaction from music player

**Steps:**
1. Log in as Fan Account
2. Navigate to Artist's profile
3. Click Play on a music track
4. Click Gift button (🎁)
5. Verify modal opens
6. Note current coin balance in modal
7. Select a gift (e.g., "Rose" - 10 coins)
8. Click "Send Gift" button
9. Wait for confirmation

**Expected:**
- ✅ Gift modal opens immediately
- ✅ Modal shows available gifts with prices
- ✅ Current coin balance displayed correctly
- ✅ Selected gift highlights when clicked
- ✅ Modal closes after successful send
- ✅ Success message appears (if implemented)
- ✅ Coin balance decreases by gift amount
- ✅ No errors in console

**Pass/Fail:** ____

---

### TC-4: Video Player Gift Button Visibility

**Objective:** Verify gift button appears correctly on video player

**Steps:**
1. Log in as Fan Account
2. Navigate to Artist's profile
3. Click "Videos" tab
4. Wait for video player to load

**Expected:**
- ✅ Video player displays with videos
- ✅ Gift button (🎁) visible below video, in controls
- ✅ Gift button positioned after Previous/Play/Next buttons
- ✅ Button styling matches music player gift button
- ✅ Hover effect works

**Pass/Fail:** ____

---

### TC-5: Send Gift from Video Player

**Objective:** Complete gift transaction from video player

**Steps:**
1. Log in as Fan Account
2. Navigate to Artist's profile → Videos tab
3. Click Play on a video
4. Click Gift button (🎁)
5. Select a gift from modal
6. Confirm send

**Expected:**
- ✅ Gift modal opens
- ✅ Can select and send gift successfully
- ✅ Modal closes after send
- ✅ Balance updates correctly

**Pass/Fail:** ____

---

### TC-6: Insufficient Balance Error

**Objective:** Verify error handling when user has insufficient coins

**Steps:**
1. Log in as Fan Account with low/zero coin balance
2. Navigate to Artist's profile → Music section
3. Click Gift button
4. Try to select expensive gift (more coins than available)

**Expected:**
- ✅ Error message appears: "Insufficient coin balance"
- ✅ Gift is NOT sent
- ✅ Modal remains open
- ✅ User can select cheaper gift or cancel

**Pass/Fail:** ____

---

### TC-7: Multiple Gifts in Succession

**Objective:** Verify can send multiple gifts without issues

**Steps:**
1. Log in as Fan Account (with enough coins for 3-4 gifts)
2. Navigate to Artist's profile → Music section
3. Send gift #1 (e.g., Rose - 10 coins)
4. Wait for confirmation
5. Click gift button again
6. Send gift #2 (e.g., Heart - 20 coins)
7. Repeat for gift #3

**Expected:**
- ✅ Each gift sends successfully
- ✅ Balance updates after each gift
- ✅ No duplicate transactions
- ✅ No errors or freezing
- ✅ Modal opens/closes smoothly each time

**Pass/Fail:** ____

---

### TC-8: Gift Button - Not Logged In

**Objective:** Verify behavior when user is not authenticated

**Steps:**
1. Log out completely
2. Navigate to Artist's profile (as guest)
3. Scroll to Music section
4. Observe gift button

**Expected (two possible behaviors):**
- Option A: ✅ Gift button hidden for unauthenticated users
- Option B: ✅ Gift button visible, but clicking redirects to login

**Actual Behavior:** ____

**Pass/Fail:** ____

---

### TC-9: Backend Validation - Self-Gifting

**Objective:** Verify backend prevents self-gifting even if UI fails

**Steps:**
1. Log in as Artist Account
2. Open browser console
3. Manually trigger gift API call to own profile:
```javascript
fetch('/api/gifts/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    toUserId: '<artist-own-user-id>',
    coinsAmount: 10,
    giftTypeId: 1
  })
})
```

**Expected:**
- ✅ API returns error (400 or 403)
- ✅ Error message: "Cannot gift yourself" or similar
- ✅ No transaction recorded
- ✅ Balance unchanged

**Pass/Fail:** ____

---

### TC-10: Database Verification

**Objective:** Verify gift transactions recorded correctly

**Steps:**
1. Send a gift from Fan to Artist (TC-3 or TC-5)
2. Note the gift type and amount
3. Query database:

```sql
-- Check ledger transactions
SELECT * FROM ledger_transactions
WHERE profile_id IN ('<fan-id>', '<artist-id>')
ORDER BY created_at DESC
LIMIT 10;

-- Check artist earnings
SELECT earnings_balance FROM profiles
WHERE id = '<artist-id>';

-- Check fan balance
SELECT coin_balance FROM profiles
WHERE id = '<fan-id>';
```

**Expected:**
- ✅ Ledger entry exists for fan (type: 'gift_sent', negative amount)
- ✅ Ledger entry exists for artist (type: 'gift_received', positive amount)
- ✅ Artist's `earnings_balance` increased by gift amount
- ✅ Fan's `coin_balance` decreased by gift amount
- ✅ Timestamps match

**Pass/Fail:** ____

---

### TC-11: Mobile Web Responsiveness

**Objective:** Verify gift button works on mobile browsers

**Steps:**
1. Open mobile browser (or use responsive mode)
2. Log in as Fan Account
3. Navigate to Artist's profile
4. Test music player gift button
5. Test video player gift button

**Expected:**
- ✅ Gift button visible on mobile
- ✅ Button is touch-friendly (min 44x44px)
- ✅ Modal adapts to mobile screen
- ✅ Can select and send gift on mobile
- ✅ No layout issues or overlaps

**Pass/Fail:** ____

---

### TC-12: Network Error Handling

**Objective:** Verify graceful handling of network failures

**Steps:**
1. Log in as Fan Account
2. Navigate to Artist's profile → Music
3. Open browser DevTools → Network tab
4. Set network to "Offline" or throttle to "Offline"
5. Click gift button
6. Try to send a gift

**Expected:**
- ✅ Error message appears
- ✅ Message indicates network problem
- ✅ Transaction not recorded
- ✅ Balance unchanged
- ✅ Can retry when network restored

**Pass/Fail:** ____

---

### TC-13: Cross-Browser Compatibility

**Objective:** Verify feature works across major browsers

**Browsers to Test:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Steps for Each Browser:**
1. Log in as Fan Account
2. Navigate to Artist profile
3. Test sending gift from music player
4. Test sending gift from video player

**Expected:**
- ✅ Gift button displays correctly
- ✅ Modal opens and functions
- ✅ Gifts send successfully
- ✅ No console errors
- ✅ Styling looks correct

**Pass/Fail:**
- Chrome: ____
- Firefox: ____
- Safari: ____
- Mobile Safari: ____
- Mobile Chrome: ____

---

## Regression Testing

### Areas to Verify Unchanged:

**Music Player:**
- [ ] Play/pause still works
- [ ] Next/previous track works
- [ ] Playlist dropdown works
- [ ] Track loading works

**Video Player:**
- [ ] Play/pause still works
- [ ] Next/previous video works
- [ ] YouTube videos play correctly
- [ ] Uploaded videos play correctly

**Gifting in Other Areas:**
- [ ] Live stream gifting still works
- [ ] Post gifting still works
- [ ] Comment gifting still works

---

## Performance Testing

### Metrics to Check:
- [ ] Page load time (should not increase significantly)
- [ ] Gift modal open time (< 500ms)
- [ ] Gift send time (< 2 seconds)
- [ ] No memory leaks after multiple gifts
- [ ] No layout shifts when button appears

---

## Accessibility Testing

**Keyboard Navigation:**
- [ ] Can tab to gift button
- [ ] Can press Enter to open modal
- [ ] Can navigate modal with keyboard
- [ ] Can close modal with Escape

**Screen Reader:**
- [ ] Button announces as "Send Gift" or similar
- [ ] Modal content is readable
- [ ] Gift selection is announced

**Visual:**
- [ ] Button visible in high contrast mode
- [ ] Text readable with zoom to 200%
- [ ] Focus indicator visible

---

## Sign-Off

**Tested By:** ___________________
**Date:** ___________________
**Build/Version:** ___________________

**Overall Result:** PASS / FAIL / CONDITIONAL PASS

**Notes:**
_________________________________________
_________________________________________
_________________________________________

**Approved for Deployment:** YES / NO

**Signature:** ___________________

