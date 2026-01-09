# GLOBAL SEARCH QA CHECKLIST

**Date:** 2026-01-09  
**Tester:** _____________  
**Environment:** _____________

---

## ✅ PHASE 1: UI VALIDATION

### **Header Layout (Mobile & Desktop)**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Desktop: Hamburger visible | ☰ button on far left | ⬜ PASS / ⬜ FAIL | |
| Desktop: Logo after hamburger | Logo immediately after ☰ | ⬜ PASS / ⬜ FAIL | |
| Desktop: Search input visible | Full input bar in center | ⬜ PASS / ⬜ FAIL | |
| Desktop: Search input grows | Takes available space (flex-1) | ⬜ PASS / ⬜ FAIL | |
| Desktop: Nav icons visible | Home, Feed, Teams, etc. | ⬜ PASS / ⬜ FAIL | |
| Desktop: Profile pic on right | Avatar/menu on far right | ⬜ PASS / ⬜ FAIL | |
| Mobile: Hamburger visible | ☰ button on far left | ⬜ PASS / ⬜ FAIL | |
| Mobile: Logo after hamburger | Logo left-aligned (not centered) | ⬜ PASS / ⬜ FAIL | |
| Mobile: Search input visible | Full input bar (not icon) | ⬜ PASS / ⬜ FAIL | |
| Mobile: Search input stretches | Takes middle space (flex-1) | ⬜ PASS / ⬜ FAIL | |
| Mobile: Profile pic on right | Avatar on far right | ⬜ PASS / ⬜ FAIL | |
| Mobile: No nav icon overlap | Search doesn't cover other elements | ⬜ PASS / ⬜ FAIL | |

### **Search Input Focus Behavior**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Click search input (desktop) | Input gains focus, cursor appears | ⬜ PASS / ⬜ FAIL | |
| Click search input (mobile) | Input gains focus, keyboard opens | ⬜ PASS / ⬜ FAIL | |
| Type in search input | Characters appear immediately | ⬜ PASS / ⬜ FAIL | |
| Press Cmd/Ctrl+K | Search input gains focus | ⬜ PASS / ⬜ FAIL | |
| Press "/" key | Search input gains focus | ⬜ PASS / ⬜ FAIL | |
| Press Escape | Dropdown closes (if open) | ⬜ PASS / ⬜ FAIL | |

### **Browser Compatibility**

| Browser | Desktop | Mobile | PWA Mode | Notes |
|---------|---------|--------|----------|-------|
| Chrome | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | |
| Firefox | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | N/A | |
| Safari | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | |
| Edge | ⬜ PASS / ⬜ FAIL | N/A | N/A | |

### **Safe Area / Notch Handling**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| iPhone with notch | Header doesn't overlap notch | ⬜ PASS / ⬜ FAIL | |
| Android with punch-hole | Header doesn't overlap camera | ⬜ PASS / ⬜ FAIL | |
| PWA fullscreen mode | Header respects safe areas | ⬜ PASS / ⬜ FAIL | |

---

## ✅ PHASE 2: FUNCTIONAL TESTING (Search Accuracy)

### **Profile Search**

| Test Query | Expected Result | Status | Notes |
|------------|----------------|--------|-------|
| "canna" | Profiles with "canna" in username/display_name | ⬜ PASS / ⬜ FAIL | |
| Exact username (e.g. "brad") | Exact match appears first | ⬜ PASS / ⬜ FAIL | |
| Partial username (e.g. "bra") | Matches "brad", "braden", etc. | ⬜ PASS / ⬜ FAIL | |
| Display name (e.g. "John") | Matches display_name field | ⬜ PASS / ⬜ FAIL | |
| Case insensitive (e.g. "CANNA") | Same results as "canna" | ⬜ PASS / ⬜ FAIL | |
| Special chars (e.g. "@brad") | Handles @ symbol gracefully | ⬜ PASS / ⬜ FAIL | |
| Empty search | Shows "Search anything" state | ⬜ PASS / ⬜ FAIL | |
| No matches (e.g. "zzzzzz") | Shows "No matches yet" state | ⬜ PASS / ⬜ FAIL | |

### **Post Search**

| Test Query | Expected Result | Status | Notes |
|------------|----------------|--------|-------|
| Keyword in post text (e.g. "live") | Posts containing "live" | ⬜ PASS / ⬜ FAIL | |
| Multiple words (e.g. "live drops") | Posts with both words | ⬜ PASS / ⬜ FAIL | |
| Emoji in search (e.g. "🔥") | Posts with that emoji | ⬜ PASS / ⬜ FAIL | |
| Punctuation (e.g. "what?") | Handles punctuation correctly | ⬜ PASS / ⬜ FAIL | |
| Author name in post | Posts by that author | ⬜ PASS / ⬜ FAIL | |
| Team post keyword | Team posts with keyword | ⬜ PASS / ⬜ FAIL | |

### **Team Search**

| Test Query | Expected Result | Status | Notes |
|------------|----------------|--------|-------|
| Team name (e.g. "canna") | Teams with "canna" in name | ⬜ PASS / ⬜ FAIL | |
| Team description keyword | Teams with keyword in description | ⬜ PASS / ⬜ FAIL | |
| Partial team name | Matches partial names | ⬜ PASS / ⬜ FAIL | |

### **Live Search**

| Test Query | Expected Result | Status | Notes |
|------------|----------------|--------|-------|
| "canna" (if live) | Live profiles matching "canna" | ⬜ PASS / ⬜ FAIL | |
| Any username (if live) | Only shows if is_live=true | ⬜ PASS / ⬜ FAIL | |

### **Typeahead Dropdown**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Type 3 characters | Dropdown appears with results | ⬜ PASS / ⬜ FAIL | |
| Shows recent searches | Recent section populated | ⬜ PASS / ⬜ FAIL | |
| Shows live results | People/Posts/Teams sections | ⬜ PASS / ⬜ FAIL | |
| Click result in dropdown | Navigates to result | ⬜ PASS / ⬜ FAIL | |
| Press Enter | Navigates to search page | ⬜ PASS / ⬜ FAIL | |
| Loading state | Shows skeleton loaders | ⬜ PASS / ⬜ FAIL | |
| Error state | Shows error message | ⬜ PASS / ⬜ FAIL | |

---

## ✅ PHASE 3: ROUTING VALIDATION

### **Profile Routing**

| Test | Expected URL | Status | Notes |
|------|-------------|--------|-------|
| Click profile from typeahead | `/{username}` or `/profiles/{id}` | ⬜ PASS / ⬜ FAIL | |
| Click profile from search page | `/{username}` or `/profiles/{id}` | ⬜ PASS / ⬜ FAIL | |
| Profile page loads | Shows profile content | ⬜ PASS / ⬜ FAIL | |

### **Team Routing**

| Test | Expected URL | Status | Notes |
|------|-------------|--------|-------|
| Click team from typeahead | `/teams/{slug}` | ⬜ PASS / ⬜ FAIL | |
| Click team from search page | `/teams/{slug}` | ⬜ PASS / ⬜ FAIL | |
| Team page loads | Shows team content | ⬜ PASS / ⬜ FAIL | |

### **Post Routing**

| Test | Expected URL | Status | Notes |
|------|-------------|--------|-------|
| Click global post | `/feed?focusPostId={id}` | ⬜ PASS / ⬜ FAIL | |
| Click team post | `/teams/{slug}?postId={id}` | ⬜ PASS / ⬜ FAIL | |
| Post is highlighted/focused | Post appears in view | ⬜ PASS / ⬜ FAIL | |

### **Live Routing**

| Test | Expected URL | Status | Notes |
|------|-------------|--------|-------|
| Click live profile | `/live/{username}` or `/live/{id}` | ⬜ PASS / ⬜ FAIL | |
| Live stream loads | Stream player appears | ⬜ PASS / ⬜ FAIL | |

---

## ✅ PHASE 4: REGRESSION CHECKS

### **Page Refresh**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Search, then refresh page | Search still works | ⬜ PASS / ⬜ FAIL | |
| Search results persist | Same results after refresh | ⬜ PASS / ⬜ FAIL | |
| URL params preserved | Query string intact | ⬜ PASS / ⬜ FAIL | |

### **Authentication State**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Search while logged out | Search works | ⬜ PASS / ⬜ FAIL | |
| Login, then search | Search still works | ⬜ PASS / ⬜ FAIL | |
| Logout, then search | Search still works | ⬜ PASS / ⬜ FAIL | |

### **Cross-Page Search**

| Page | Search Works | Status | Notes |
|------|-------------|--------|-------|
| `/` (Home) | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | |
| `/feed` | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | |
| `/teams` | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | |
| `/livetv` | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | |
| `/{username}` (Profile) | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | |
| `/search` (Search page) | ⬜ PASS / ⬜ FAIL | ⬜ PASS / ⬜ FAIL | |

### **PWA Mode**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Search in PWA | Works same as browser | ⬜ PASS / ⬜ FAIL | |
| Offline behavior | Shows appropriate error | ⬜ PASS / ⬜ FAIL | |
| Back online | Search resumes working | ⬜ PASS / ⬜ FAIL | |

---

## ✅ PHASE 5: ERROR HANDLING

### **Network Errors**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Disconnect network, search | Shows error message | ⬜ PASS / ⬜ FAIL | |
| Error message is clear | Not generic "Error" | ⬜ PASS / ⬜ FAIL | |
| Retry button works | Re-attempts search | ⬜ PASS / ⬜ FAIL | |
| Reconnect network | Search works again | ⬜ PASS / ⬜ FAIL | |

### **Empty States**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| No query entered | "Search anything" state | ⬜ PASS / ⬜ FAIL | |
| No results found | "No matches yet" state | ⬜ PASS / ⬜ FAIL | |
| Loading state | Skeleton loaders shown | ⬜ PASS / ⬜ FAIL | |

### **Edge Cases**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Very long query (500+ chars) | Handles gracefully | ⬜ PASS / ⬜ FAIL | |
| SQL injection attempt | Sanitized, no error | ⬜ PASS / ⬜ FAIL | |
| XSS attempt in search | Escaped, no execution | ⬜ PASS / ⬜ FAIL | |
| Rapid typing | Debounced, not excessive queries | ⬜ PASS / ⬜ FAIL | |

---

## ✅ PHASE 6: PERFORMANCE

### **Response Time**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Typeahead response | < 500ms | ⬜ PASS / ⬜ FAIL | Measure: ___ms |
| Full search page load | < 1000ms | ⬜ PASS / ⬜ FAIL | Measure: ___ms |
| Debounce delay | ~250ms | ⬜ PASS / ⬜ FAIL | Measure: ___ms |

### **Result Limits**

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Typeahead shows max 4 per category | Limited results | ⬜ PASS / ⬜ FAIL | |
| Search page shows more results | 5-20 per category | ⬜ PASS / ⬜ FAIL | |
| No pagination (known limitation) | Only shows initial results | ⬜ PASS / ⬜ FAIL | |

---

## 🐛 KNOWN ISSUES / BUGS FOUND

| Issue | Severity | Reproducible | Notes |
|-------|----------|--------------|-------|
| | ⬜ P0 / ⬜ P1 / ⬜ P2 | ⬜ Yes / ⬜ No | |
| | ⬜ P0 / ⬜ P1 / ⬜ P2 | ⬜ Yes / ⬜ No | |
| | ⬜ P0 / ⬜ P1 / ⬜ P2 | ⬜ Yes / ⬜ No | |

**Severity Levels:**
- **P0:** Blocker - Search completely broken
- **P1:** Critical - Major functionality broken
- **P2:** Minor - Edge case or cosmetic issue

---

## 📊 SUMMARY

### **Overall Status**

- ⬜ **PASS** - All critical tests passing
- ⬜ **PASS WITH ISSUES** - Works but has known bugs
- ⬜ **FAIL** - Critical functionality broken

### **Pass Rate**

- Total Tests: ___
- Passed: ___
- Failed: ___
- Pass Rate: ___%

### **Critical Blockers**

1. _______________________________________
2. _______________________________________
3. _______________________________________

### **Recommendations**

1. _______________________________________
2. _______________________________________
3. _______________________________________

---

## 🔧 MINIMAL FIXES NEEDED

### **If Search Returns Empty Results:**

1. Check RLS policies (run `TEST_SEARCH_QUERIES.sql` TEST 2-3)
2. Verify data exists (run `TEST_SEARCH_QUERIES.sql` TEST 1)
3. Test nested relation filters (run `TEST_SEARCH_QUERIES.sql` TEST 6-7)

### **If Typeahead Doesn't Show:**

1. Check console for errors (F12 → Console)
2. Verify `GlobalSearchTrigger` component renders
3. Check if `fetchSearchResults()` is called (Network tab)

### **If Routing Fails:**

1. Check `SearchResultCards.tsx` href generation
2. Verify routes exist in `app/` directory
3. Test direct URL navigation

---

**Tester Signature:** _____________  
**Date Completed:** _____________  
**Environment:** _____________  
**Browser/Device:** _____________
