# Mobile Profile Parity - Complete Implementation Plan

## Executive Summary

**Current State**: Mobile profile is a basic stub showing only avatar, name, bio, counts, and basic stats. Web profile is a fully-featured, customizable system with profile types, tabs, sections, customization, and rich content.

**Goal**: Achieve 100% feature parity between mobile and web profiles, ensuring users can customize and view profiles identically on both platforms.

**Scope**: 8 phases, 40+ components/screens, full profile type system implementation

---

## Critical Gap Analysis

### Missing from Mobile (vs Web Screenshot)

1. **Top Friends Section** - MySpace-style friend showcase (visible in screenshot)
2. **Referral Network** - Progress tracking, active conversions, share link
3. **Music Showcase** - Audio player with tracks (visible in screenshot)
4. **Social Media Bar** - 12 platform icons (Instagram/Twitter/etc - visible in screenshot)
5. **Profile Tabs** - Info/Feed/Photos/Videos/Music/Events (visible in screenshot)
6. **Profile Type System** - Different layouts per type (creator/streamer/musician/comedian/business)
7. **Customization** - Background images, colors, fonts, card styling
8. **Module Toggles** - Show/hide sections via enabled_modules
9. **Top Supporters/Streamers** - Gifter leaderboards with badges
10. **Profile Type Features** - Music tracks, events, portfolio, business info
11. **Settings/Edit** - Comprehensive profile editing with customization controls
12. **Advanced Badges** - MLL PRO, Gifter tiers, Streak counter, Global ranks

---

## Implementation Phases

### PHASE 1: Architecture & Config
Create mobile profile type config system, extend ProfileData types, set up component structure

**Files to Create**:
- `apps/mobile/config/profileTypeConfig.ts` - Port from web
- `apps/mobile/types/profile.ts` - Extended ProfileData interface
- `apps/mobile/components/profile/` - Section components folder

**Key Tasks**:
- Define 5 profile types with tabs/sections/actions
- Extend ProfileData with all web fields (40+ new fields)
- Create helper functions: getEnabledTabs, isSectionEnabled

### PHASE 2: Core Sections
Implement high-priority visible sections

**Components to Create**:
- `TopFriendsSection.tsx` + `TopFriendsManagerScreen.tsx`
- `ReferralNetworkSection.tsx`
- `SocialMediaBar.tsx`
- `TopSupportersSection.tsx` + `TopStreamersSection.tsx`

**API Integration**:
- GET /api/profile/top-friends
- POST /api/profile/top-friends
- Existing referral endpoints
- Profile data already includes top_supporters/top_streamers

### PHASE 3: Profile Tabs System
Implement tabbed navigation

**Components to Create**:
- `ProfileTabBar.tsx` - Horizontal scrollable tabs
- `InfoTab.tsx` - All sections
- `FeedTab.tsx` - User posts
- `PhotosTab.tsx` - Photo grid
- `VideosTab.tsx` - Video grid
- `MusicTab.tsx` - Music player
- `EventsTab.tsx` - Events list
- `ProductsTab.tsx` - Portfolio/products

**Logic**:
- Tab visibility based on profile_type + enabled_tabs
- Active tab state management
- Conditional content rendering

### PHASE 4: Profile Type Features
Implement content management for each type

**Musician**:
- `MusicShowcaseSection.tsx` + `MusicTrackEditorScreen.tsx`
- `MusicVideosSection.tsx` + editor
- `UpcomingEventsSection.tsx` + `EventEditorScreen.tsx`

**Comedian**:
- `ComedySpecialsSection.tsx` + editor

**Business**:
- `PortfolioSection.tsx` + `PortfolioEditorScreen.tsx`
- `BusinessInfoSection.tsx` + editor

**Streamer**:
- `ScheduleSection.tsx` + editor

**APIs**:
- GET/POST /api/profile/music/tracks
- GET/POST /api/profile/music/videos
- RPC get_profile_events, upsert_profile_event
- GET/POST /api/profile/comedy/specials
- RPC get_profile_portfolio, upsert_profile_portfolio_item
- GET/POST /api/profile/business

### PHASE 5: Customization System
Apply visual customization to profile view

**Updates to ProfileViewScreen.tsx**:
- Background image/gradient rendering
- Overlay layer (opacity)
- Dynamic card colors, opacity, border radius
- Font preset application
- Accent/button/text color application
- Custom links section title

**Visual Elements**:
- Absolute positioned background Image
- Semi-transparent overlay View
- Dynamic StyleSheet generation based on customization fields

### PHASE 6: Settings/Edit Profile
Comprehensive profile editing screens

**Screens to Create**:
- `CustomizeProfileScreen.tsx` - Colors, fonts, backgrounds
- `ManageModulesScreen.tsx` - Toggle sections on/off
- `ManageTabsScreen.tsx` - Toggle tabs on/off
- `SocialMediaLinksScreen.tsx` - 12 platform inputs

**Updates to SettingsProfileScreen.tsx**:
- Profile type selector
- Navigation to new screens
- Hide streaming stats toggle
- Links section title input

**APIs**:
- POST /api/profile/customize
- Direct Supabase updates for enabled_modules, enabled_tabs, social links

### PHASE 7: Advanced Features
Badges, ranks, indicators

**Components to Create**:
- `ProfileBadges.tsx` - MLL PRO, Gifter tiers, Streak, Ranks
- `LiveIndicatorBanner.tsx` - Prominent LIVE banner
- `GenderReminderCard.tsx` - Dating match prompt
- `ProfileStatsSection.tsx` - Enhanced stats card

**Integration**:
- Fetch gifter_statuses from API
- Display streak_days, gifter_rank, streamer_rank
- Show badges inline with name in hero

### PHASE 8: Testing & Polish
Verify complete parity

**Test Matrix**:
- Test all 5 profile types
- Test own profile vs other profiles
- Test all customization options
- Test all sections show/hide correctly
- Test all tabs render correctly
- Test all profile type features
- Verify visual parity with web screenshot

---

## File Structure

```
apps/mobile/
├── config/
│   └── profileTypeConfig.ts (NEW)
├── types/
│   └── profile.ts (NEW)
├── components/
│   └── profile/ (NEW FOLDER)
│       ├── TopFriendsSection.tsx
│       ├── ReferralNetworkSection.tsx
│       ├── SocialMediaBar.tsx
│       ├── TopSupportersSection.tsx
│       ├── TopStreamersSection.tsx
│       ├── MusicShowcaseSection.tsx
│       ├── MusicVideosSection.tsx
│       ├── UpcomingEventsSection.tsx
│       ├── ComedySpecialsSection.tsx
│       ├── PortfolioSection.tsx
│       ├── BusinessInfoSection.tsx
│       ├── ScheduleSection.tsx
│       ├── ProfileTabBar.tsx
│       ├── ProfileBadges.tsx
│       ├── LiveIndicatorBanner.tsx
│       ├── GenderReminderCard.tsx
│       ├── ProfileStatsSection.tsx
│       └── tabs/
│           ├── InfoTab.tsx
│           ├── FeedTab.tsx
│           ├── PhotosTab.tsx
│           ├── VideosTab.tsx
│           ├── MusicTab.tsx
│           ├── EventsTab.tsx
│           └── ProductsTab.tsx
└── screens/
    ├── ProfileViewScreen.tsx (MAJOR UPDATE)
    ├── SettingsProfileScreen.tsx (UPDATE)
    ├── TopFriendsManagerScreen.tsx (NEW)
    ├── CustomizeProfileScreen.tsx (NEW)
    ├── ManageModulesScreen.tsx (NEW)
    ├── ManageTabsScreen.tsx (NEW)
    ├── SocialMediaLinksScreen.tsx (NEW)
    ├── MusicTrackEditorScreen.tsx (NEW)
    ├── EventEditorScreen.tsx (NEW)
    ├── PortfolioEditorScreen.tsx (NEW)
    └── [other editors as needed]
```

---

## Estimated Effort

- **Phase 1**: 4-6 hours (config + types)
- **Phase 2**: 8-10 hours (4 major sections)
- **Phase 3**: 10-12 hours (tab system + 7 tabs)
- **Phase 4**: 12-15 hours (profile type features + editors)
- **Phase 5**: 6-8 hours (customization rendering)
- **Phase 6**: 10-12 hours (4 new screens + updates)
- **Phase 7**: 6-8 hours (badges + indicators)
- **Phase 8**: 4-6 hours (testing + fixes)

**Total**: 60-77 hours (1.5-2 weeks full-time)

---

## Success Criteria

1. ✅ All 5 profile types render correctly with type-specific sections
2. ✅ All tabs work and show correct content
3. ✅ All sections can be toggled on/off via settings
4. ✅ Profile customization (colors/fonts/backgrounds) works
5. ✅ All profile type features (music/events/portfolio) work
6. ✅ Settings screens allow full profile configuration
7. ✅ Badges, ranks, and indicators display correctly
8. ✅ Mobile profile matches web screenshot exactly
9. ✅ No regressions in existing functionality
10. ✅ All navigation works (profile links, edit buttons, etc.)

---

## Next Steps

**Immediate Action**: Start Phase 1
1. Create profileTypeConfig.ts
2. Extend ProfileData types
3. Set up component folder structure
4. Update ProfileViewScreen to use config system

This is a comprehensive, production-ready plan that will achieve 100% parity with web profiles.
