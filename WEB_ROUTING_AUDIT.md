# Web Routing Audit Report

**Date:** December 28, 2025  
**Agent:** Web UI + Routing Builder  
**Status:** ✅ AUDIT COMPLETE — Missing Routes Identified

---

## Executive Summary

The web application has a robust routing structure with most primary navigation destinations properly implemented. This audit identified **4 missing pages** that are referenced but either don't exist or render incomplete experiences.

---

## Navigation Structure Map

### Top-Level Navigation (GlobalHeader)

| Nav Item | Route | Status | Notes |
|----------|-------|--------|-------|
| Home | `/` | ✅ EXISTS | Landing page with search, carousels, referral |
| Feed | `/feed` | ✅ EXISTS | Social feed with posts |
| Rooms | `/rooms` | ✅ EXISTS | Rooms listing page |
| Live Streams | `/live` | ✅ EXISTS | Live room grid (owner-only gated) |
| Trophy (Leaderboard) | `/leaderboards` | ✅ EXISTS | Dedicated leaderboards page |
| Messages | `/messages` | ✅ EXISTS | Direct messages |
| Noties | `/noties` | ✅ EXISTS | Notifications |

### Bottom Navigation (Mobile)

| Nav Item | Route | Status |
|----------|-------|--------|
| Home | `/` | ✅ EXISTS |
| Feed | `/feed` | ✅ EXISTS |
| Rooms | `/rooms` | ✅ EXISTS |
| Messages | `/messages` | ✅ EXISTS |
| Noties | `/noties` | ✅ EXISTS |

### User Menu Destinations

| Menu Item | Route | Status | Notes |
|-----------|-------|--------|-------|
| View Profile | `/[username]` | ✅ EXISTS | Dynamic profile pages |
| Edit Profile | `/settings/profile` | ✅ EXISTS | Profile editor |
| Wallet | `/wallet` | ✅ EXISTS | Coins & diamonds management |
| Analytics | `/me/analytics` | ✅ EXISTS | User analytics dashboard |
| Composer | `/composer` | ✅ EXISTS | Projects list page |

---

## Missing Routes Identified

### 🔴 P1 — Critical User Flow Gaps

| # | Route | Referenced From | Expected Behavior | Current State |
|---|-------|-----------------|-------------------|---------------|
| 1 | `/composer/new` | `/composer` page "New Project" button | Opens project creation page/modal | **404 - Does not exist** |
| 2 | `/composer/[projectId]` | `/composer` page project cards | Opens project editor/details | **404 - Does not exist** |
| 3 | `/me` (layout wrapper) | `/me/analytics` parent | Layout wrapper for `/me/*` routes | **Missing — renders as parent-only** |

### 🟡 P2 — Minor Gaps (Already Functional)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 4 | `/[username]/feed` | ✅ EXISTS | User's feed posts |
| 5 | `/[username]/photos` | ✅ EXISTS | User's photo gallery |
| 6 | `/apply` | ✅ EXISTS | Room application form |
| 7 | `/join` | ✅ EXISTS | Waitlist signup |
| 8 | `/gifter-levels` | ✅ EXISTS | Public gifter tiers explainer |

---

## Admin Routes (Owner-Only)

| Route | Status | Notes |
|-------|--------|-------|
| `/owner` | ✅ EXISTS | Owner dashboard (complex) |
| `/owner/analytics` | ✅ EXISTS | Owner analytics |
| `/owner/rooms` | ✅ EXISTS | Rooms management |
| `/owner/rooms/[roomId]` | ✅ EXISTS | Individual room editor |
| `/owner/rooms/new` | ✅ EXISTS | Create new room |
| `/owner/templates` | ✅ EXISTS | Room templates |
| `/owner/templates/[templateId]` | ✅ EXISTS | Template editor |
| `/owner/templates/new` | ✅ EXISTS | Create template |
| `/owner/users/[profileId]/analytics` | ✅ EXISTS | User analytics (admin view) |
| `/admin/applications` | ✅ EXISTS | Review room applications |
| `/admin/gifts` | ✅ EXISTS | Gift types & coin packs management |
| `/admin/moderation` | ✅ EXISTS | Reports & user moderation |

---

## Auth & Onboarding Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/login` | ✅ EXISTS | Email/password login + signup toggle |
| `/signup` | ✅ EXISTS | Redirects to login |
| `/onboarding` | ✅ EXISTS | 4-step profile setup wizard |

---

## Deep-Link Routes

| Route | Status | Purpose |
|-------|--------|---------|
| `/invite/[username]` | ✅ EXISTS | Referral link handler |
| `/p/[username]` | ✅ EXISTS | Profile share redirect |
| `/u/[username]/analytics` | ✅ EXISTS | User analytics (shareable) |

---

## Required Implementations

### 1. `/composer/new` — New Project Page

**Priority:** P1  
**Type:** New page creation

**Requirements:**
- Empty state or form for creating new composer project
- Fields:
  - Project title (text input)
  - Project type (video type selector - comedy special, vlog, music video, etc.)
  - Optional description
- "Create" button → redirects to `/composer/[newProjectId]`
- "Cancel" button → returns to `/composer`

**Design Notes:**
- Match existing app design system
- Use `PageShell`, `Card`, `Button`, `Input` components
- Placeholder data OK — no backend wiring yet
- Show clear "Coming Soon — Project creation" message

---

### 2. `/composer/[projectId]` — Project Editor Page

**Priority:** P1  
**Type:** New dynamic page

**Requirements:**
- Project header (title, status, last edited)
- Placeholder editor interface:
  - "Project details" section
  - "Timeline / Editor" section (clearly placeholder)
  - "Publish settings" section
- Action buttons:
  - "Save Draft"
  - "Publish" (disabled with "Coming Soon" tooltip)
  - "Delete Project"
  - "Back to Projects"

**Design Notes:**
- Full-page editor layout
- Clear indication this is UI scaffolding
- No video upload/editing logic yet
- Should feel "real" but with placeholders labeled

---

### 3. `/me` — Layout Wrapper

**Priority:** P1  
**Type:** New layout file

**Requirements:**
- Create `app/me/layout.tsx`
- Wrap `/me/analytics` and future `/me/*` routes
- Side navigation for:
  - "Analytics" (current)
  - "Settings" (placeholder link)
  - "Privacy" (placeholder link)
- Or: Top tab navigation if preferred
- Consistent with app design system

**Design Notes:**
- Match pattern from `/owner/layout.tsx` if it exists
- Mobile-responsive
- Clear active state indicators

---

## Implementation Strategy

### Phase 1: Create Missing Pages (This Sprint)
1. Create `/composer/new` page
2. Create `/composer/[projectId]` page
3. Create `/me/layout.tsx` wrapper
4. Verify all routes resolve (no 404s)

### Phase 2: Polish & Testing
1. Test navigation flows end-to-end
2. Verify mobile responsiveness
3. Check dark mode compatibility
4. Verify accessible keyboard navigation

---

## Files to Create

| File Path | Type | Purpose |
|-----------|------|---------|
| `app/composer/new/page.tsx` | New | Project creation page |
| `app/composer/[projectId]/page.tsx` | New | Project editor |
| `app/me/layout.tsx` | New | Layout wrapper for user settings |

---

## Existing Robust Routes (Reference)

✅ **Profile System:** `/[username]` with sections (feed, photos)  
✅ **Settings:** `/settings/profile`, `/settings/username`  
✅ **Monetization:** `/wallet` with purchase flow  
✅ **Live Streaming:** `/live` with full LiveRoom implementation  
✅ **Feed:** `/feed` with posts, comments, gifts  
✅ **Analytics:** `/me/analytics` with 7 tabs  
✅ **Admin:** Complete admin panel suite  
✅ **Leaderboards:** Dedicated `/leaderboards` page  
✅ **Gifter System:** `/gifter-levels` explainer page  

---

## Summary

| Category | Count |
|----------|-------|
| **Total Routes Audited** | 40+ |
| **Existing & Functional** | 37 |
| **Missing (P1)** | 3 |
| **Completion Rate** | 92.5% |

**Verdict:** Web routing structure is robust. Only 3 critical routes missing (all composer-related + layout wrapper). All primary navigation destinations exist and render properly.

---

*Generated by Web UI + Routing Builder Agent*

