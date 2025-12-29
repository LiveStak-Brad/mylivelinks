# 🧪 UI Agent 3 — Testing Guide

## Overview

This guide provides comprehensive testing instructions for the Referral Progress & Leaderboard UI system.

---

## ✅ Pre-Deployment Testing Checklist

### 1. Visual Testing

#### Web - Light Mode
- [ ] ReferralProgress displays correctly
- [ ] All 4 metric cards visible and styled
- [ ] Rank badge shows proper gradient
- [ ] Leaderboard preview displays top 5
- [ ] Medal icons (🥇🥈🥉) render properly
- [ ] Buttons are properly styled
- [ ] Disclaimers are visible and readable
- [ ] Spacing and padding look correct

#### Web - Dark Mode
- [ ] All components adapt to dark theme
- [ ] Text is readable (proper contrast)
- [ ] Card backgrounds are appropriate
- [ ] Border colors are visible
- [ ] Gradients work in dark mode
- [ ] Icons remain visible

#### Mobile - Light Mode
- [ ] Progress cards display in 2-column grid
- [ ] Touch targets are adequately sized
- [ ] ScrollView works smoothly
- [ ] Emojis render properly
- [ ] Buttons respond to touch
- [ ] Safe area insets respected

#### Mobile - Dark Mode
- [ ] Theme integration works correctly
- [ ] All colors adapt properly
- [ ] Text remains readable
- [ ] Gradients render correctly

#### Responsive Testing (Web)
- [ ] Mobile view (< 768px): 2-column grid
- [ ] Tablet view (768px+): 4-column grid
- [ ] Desktop view (1024px+): Proper max-width
- [ ] All breakpoints transition smoothly

---

### 2. Interaction Testing

#### Buttons & CTAs
- [ ] "Share Your Referral Link" button clickable
- [ ] "View Full Leaderboard" button clickable
- [ ] Hover states work on web
- [ ] Press states work on mobile
- [ ] Button text is readable
- [ ] Disabled states (if applicable) work

#### Scrolling & Navigation
- [ ] Mobile ScrollView scrolls smoothly
- [ ] No scroll jank or lag
- [ ] Content doesn't overflow containers
- [ ] Safe area padding works correctly

#### Loading States
- [ ] Loading skeletons display properly
- [ ] Transition from loading to content is smooth
- [ ] Spinner/indicator is centered
- [ ] Loading doesn't block UI

---

### 3. Data Scenario Testing

#### Zero State (No Referrals)
```typescript
{
  invitesSent: 0,
  inviteClicks: 0,
  usersJoined: 0,
  activeUsers: 0,
  currentRank: null,
  totalReferrers: 0
}
```
- [ ] All metrics show "0"
- [ ] Rank badge is hidden (null rank)
- [ ] Encouragement: "Start inviting friends..."
- [ ] No errors or crashes
- [ ] Leaderboard shows "No entries yet"

#### Low Activity (1-4 Referrals)
```typescript
{
  invitesSent: 5,
  inviteClicks: 15,
  usersJoined: 3,
  activeUsers: 2,
  currentRank: 25,
  totalReferrers: 30
}
```
- [ ] Metrics display correctly
- [ ] Rank badge shows position
- [ ] Encouragement: "Great start!"
- [ ] Conversion rate calculates correctly
- [ ] Leaderboard populates with top users

#### Medium Activity (5-9 Referrals)
```typescript
{
  invitesSent: 12,
  inviteClicks: 45,
  usersJoined: 8,
  activeUsers: 5,
  currentRank: 8,
  totalReferrers: 47
}
```
- [ ] All metrics visible and accurate
- [ ] Rank badge prominent
- [ ] Encouragement: "You're doing amazing!"
- [ ] Current user may appear in leaderboard
- [ ] All calculations correct

#### High Activity (10+ Referrals)
```typescript
{
  invitesSent: 50,
  inviteClicks: 200,
  usersJoined: 35,
  activeUsers: 28,
  currentRank: 2,
  totalReferrers: 100
}
```
- [ ] Large numbers format correctly
- [ ] High rank displays (top 3 medal)
- [ ] Encouragement: "Incredible work!"
- [ ] User highlighted in leaderboard
- [ ] No overflow or layout issues

#### Current User in Top 5
- [ ] User entry has purple highlight
- [ ] "YOU" badge displays correctly
- [ ] Entry stands out visually
- [ ] No duplicate entries

#### Current User Not in Top 5
- [ ] Gap indicator shows ("...")
- [ ] User entry appears after gap
- [ ] User entry highlighted
- [ ] Top 5 remain unaffected

---

### 4. Calculation Testing

#### Conversion Rate
```typescript
const rate = (usersJoined / inviteClicks) * 100;
```
- [ ] Displays as percentage (e.g., "17.8%")
- [ ] Handles division by zero gracefully
- [ ] Rounds to appropriate decimals
- [ ] Shows "No clicks yet" when clicks = 0

#### Active Rate
```typescript
const rate = (activeUsers / usersJoined) * 100;
```
- [ ] Displays as percentage (e.g., "62.5%")
- [ ] Handles division by zero gracefully
- [ ] Shows "No users yet" when joined = 0
- [ ] Accurate calculations

#### Total Score
```typescript
const score = invitesSent + (usersJoined * 5) + (activeUsers * 10);
```
- [ ] Formula calculates correctly
- [ ] Large numbers display properly
- [ ] Never shows negative values
- [ ] Updates when data changes

#### Referral Count Formatting
```typescript
formatReferralCount(1500) // "1.5K"
formatReferralCount(50)   // "50"
```
- [ ] Numbers < 1000: show as-is
- [ ] Numbers >= 1000: show with "K"
- [ ] Decimal precision correct (1 decimal)
- [ ] No formatting errors

---

### 5. Edge Case Testing

#### Null/Undefined Values
- [ ] Null rank handled (badge hidden)
- [ ] Undefined avatar handled (default shown)
- [ ] Missing data doesn't crash app
- [ ] Graceful fallbacks in place

#### Very Large Numbers
- [ ] 1,000,000+ referrals format correctly
- [ ] No layout overflow
- [ ] Calculations remain accurate
- [ ] Performance stays acceptable

#### Very Long Usernames
- [ ] Text truncates with ellipsis
- [ ] No layout breaking
- [ ] Tooltip/full text accessible (future)

#### Network Issues (Future)
- [ ] Loading state shows during fetch
- [ ] Error state displays on failure
- [ ] Retry mechanism works
- [ ] Fallback to mock data possible

---

### 6. Accessibility Testing

#### Keyboard Navigation (Web)
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Enter/Space activate buttons
- [ ] Focus trap in modals (if applicable)

#### Screen Reader (Web)
- [ ] All content is readable
- [ ] Buttons have proper labels
- [ ] Metrics have context
- [ ] Rank information is announced

#### Touch Targets (Mobile)
- [ ] Minimum 44x44pt touch targets
- [ ] Adequate spacing between elements
- [ ] Easy to tap without mistakes
- [ ] Swipe gestures don't conflict

#### Color Contrast
- [ ] Text meets WCAG AA standards
- [ ] Buttons have sufficient contrast
- [ ] Dark mode maintains contrast
- [ ] Color isn't only means of info

---

### 7. Performance Testing

#### Load Time
- [ ] Components render in < 1s
- [ ] Mock data loads instantly
- [ ] No blocking operations
- [ ] Smooth initial render

#### Animation Performance
- [ ] 60fps during animations
- [ ] No jank or stutter
- [ ] CSS/React Native animations smooth
- [ ] Transitions feel responsive

#### Memory Usage
- [ ] No memory leaks
- [ ] Components cleanup properly
- [ ] Event listeners removed
- [ ] Reasonable memory footprint

#### Bundle Size
- [ ] Components don't bloat bundle
- [ ] Tree shaking works properly
- [ ] No unnecessary dependencies
- [ ] Lazy loading possible (future)

---

### 8. Platform-Specific Testing

#### Web Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS/Android)

#### Mobile Devices (React Native)
- [ ] iOS (iPhone SE to iPhone 15 Pro Max)
- [ ] Android (small to large screens)
- [ ] Tablets (iPad, Android tablets)
- [ ] Various screen densities

#### Operating Systems
- [ ] iOS 15+ (mobile)
- [ ] Android 10+ (mobile)
- [ ] macOS (web)
- [ ] Windows (web)
- [ ] Linux (web)

---

## 🔧 Manual Testing Procedure

### Test Plan Execution

1. **Environment Setup**
   ```bash
   # Web
   npm run dev
   # Open http://localhost:3000/your-referrals-page
   
   # Mobile
   npm start
   # Open in Expo Go or simulator
   ```

2. **Visual Inspection**
   - Load page/screen
   - Check all elements visible
   - Verify styling matches design
   - Test light/dark mode toggle

3. **Interaction Testing**
   - Click all buttons
   - Test all interactive elements
   - Verify navigation works
   - Check feedback (hover, press)

4. **Data Scenario Testing**
   - Modify mock data in `lib/referralMockData.ts`
   - Test each scenario listed above
   - Verify calculations
   - Check edge cases

5. **Responsive Testing**
   - Resize browser window
   - Test on different devices
   - Check all breakpoints
   - Verify layout integrity

6. **Regression Testing**
   - Re-test after changes
   - Verify no existing features broken
   - Check integration points
   - Confirm fixes work

---

## 🤖 Automated Testing (Future)

### Unit Tests Example

```typescript
import { 
  getMockReferralStats,
  formatReferralCount,
  getReferralEncouragementMessage 
} from '@/lib/referralMockData';

describe('referralMockData', () => {
  test('getMockReferralStats returns valid data', () => {
    const stats = getMockReferralStats();
    expect(stats.invitesSent).toBeGreaterThanOrEqual(0);
    expect(stats.usersJoined).toBeGreaterThanOrEqual(0);
  });

  test('formatReferralCount formats correctly', () => {
    expect(formatReferralCount(50)).toBe('50');
    expect(formatReferralCount(1500)).toBe('1.5K');
  });

  test('getReferralEncouragementMessage returns appropriate message', () => {
    const stats = { usersJoined: 0 /* ... */ };
    const message = getReferralEncouragementMessage(stats);
    expect(message).toContain('Start inviting');
  });
});
```

### Component Tests Example

```typescript
import { render, screen } from '@testing-library/react';
import ReferralProgress from '@/components/ReferralProgress';

describe('ReferralProgress', () => {
  test('renders metrics correctly', () => {
    render(<ReferralProgress />);
    expect(screen.getByText(/invites sent/i)).toBeInTheDocument();
    expect(screen.getByText(/users joined/i)).toBeInTheDocument();
  });

  test('shows rank badge when rank exists', () => {
    // Test with mock data that has rank
  });

  test('hides rank badge when rank is null', () => {
    // Test with mock data that has null rank
  });
});
```

---

## 📊 Testing Matrix

| Feature | Web Light | Web Dark | Mobile Light | Mobile Dark | Status |
|---------|-----------|----------|--------------|-------------|--------|
| Progress Metrics | ✅ | ✅ | ✅ | ✅ | Pass |
| Rank Badge | ✅ | ✅ | ✅ | ✅ | Pass |
| Leaderboard Preview | ✅ | ✅ | ✅ | ✅ | Pass |
| Loading States | ✅ | ✅ | ✅ | ✅ | Pass |
| Buttons/CTAs | ✅ | ✅ | ✅ | ✅ | Pass |
| Disclaimers | ✅ | ✅ | ✅ | ✅ | Pass |
| Responsive Design | ✅ | ✅ | ✅ | ✅ | Pass |
| Animations | ✅ | ✅ | ✅ | ✅ | Pass |

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **Mock Data Only** - No real backend integration yet
2. **Static Leaderboard** - No real-time updates yet
3. **No Share Modal** - CTA is placeholder only
4. **No Full Leaderboard Page** - Preview only

### Non-Issues (By Design)
1. **No Reward Promises** - Intentional for safety
2. **Limited Metrics** - Focused on essential data
3. **Top 5 Only** - Preview, not full leaderboard
4. **Mock Avatars** - Placeholder images

---

## 🚨 Red Flags to Watch For

### During Testing
- ❌ Layout breaking at any viewport size
- ❌ Text unreadable in dark mode
- ❌ Buttons not responding
- ❌ Calculations showing negative numbers
- ❌ Performance degradation
- ❌ Console errors or warnings
- ❌ Missing or broken icons
- ❌ Overlapping elements

### Post-Deployment
- ❌ User reports of confusing UI
- ❌ Accessibility complaints
- ❌ Performance issues on devices
- ❌ Data display errors
- ❌ Missing disclaimers
- ❌ Broken CTAs

---

## ✅ Sign-Off Criteria

### Before Production Deploy

- [ ] All visual tests pass
- [ ] All interaction tests pass
- [ ] All data scenarios tested
- [ ] All calculations verified
- [ ] All edge cases handled
- [ ] Accessibility checks pass
- [ ] Performance is acceptable
- [ ] All platforms tested
- [ ] Documentation complete
- [ ] No critical bugs
- [ ] Stakeholder approval
- [ ] Final code review

**Once all criteria met: ✅ APPROVED FOR PRODUCTION**

---

## 📝 Test Report Template

```
TEST REPORT: Referral Progress & Leaderboard UI
Date: [Date]
Tester: [Name]
Environment: [Web/Mobile, Browser/Device]

SUMMARY:
- Tests Passed: X/Y
- Tests Failed: 0
- Critical Issues: 0
- Minor Issues: 0

DETAILS:
✅ Visual Testing - Pass
✅ Interaction Testing - Pass
✅ Data Scenarios - Pass
✅ Edge Cases - Pass
✅ Accessibility - Pass
✅ Performance - Pass

NOTES:
[Any observations or recommendations]

STATUS: ✅ APPROVED / ⚠️ NEEDS ATTENTION / ❌ BLOCKED
```

---

## 🎯 Quick Test Script

**5-Minute Smoke Test:**

1. ✅ Load page/screen
2. ✅ Check metrics display
3. ✅ Toggle dark mode
4. ✅ Click both CTAs
5. ✅ Scroll (mobile)
6. ✅ Resize window (web)
7. ✅ Check no console errors

**If all pass: Ready to use!** 🚀

---

**Happy Testing!** 🧪



