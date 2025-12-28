# MOBILE_UI_PARITY_GAP_REPORT.md

## 1) Summary

### Scope
- **Mobile app only (Expo)** UI parity vs web for every navigation entry point: tabs, menus, buttons, modals, overflow menus, and “dead taps”.
- **UI-only** changes: screens, routing, placeholder UI, empty states, and safe navigation wiring. No new backend/RPC implementations beyond stubs/TODOs.

### Totals (this audit)
- **Total items checked**: 92
- **✅ Matches web**: 71
- **🟡 Partial**: 17
- **❌ Missing**: 4

### Top 10 blockers (highest-impact remaining gaps)
1. **Bottom nav parity mismatch** (web has **Rooms** in bottom nav; mobile bottom tabs include **Profile** instead) — 🟡
2. **Referral leaderboard rows are not tappable** (web rows link to profile) — 🟡
3. **No full/paginated referral leaderboard list** (mobile shows preview-only) — 🟡
4. **Referrals “full leaderboard” lacks tap-to-profile and pagination** — 🟡
5. **Messages/DM deep-link behavior is partial vs web** (web supports direct-open DM; mobile now supports open-by-userId, but needs stronger routing conventions) — 🟡
6. **Noties action routing coverage is heuristic** (works for common internal routes; needs complete mapping for future notie types) — 🟡
7. **Profile “Create Your Free Profile” CTA routing is simplistic** (routes to Auth/signup; should match exact web onboarding intent) — 🟡
8. **Legacy/unused mobile screens/components exist** (`ProfileFeedScreen`, `ProfilePhotosScreen`, `BottomNav` component) — 🟡 (mobile-only extras; don’t delete)
9. **LiveRoom OptionsMenu parity relies on fallbacks** (needs explicit route map and additional menu actions if web expands) — 🟡
10. **Profile-type “edit/add section” flows are UI-stubbed** (web has richer management flows; mobile needs placeholder routes per section) — ❌ / 🟡 (depending on section)

---

## 2) Inventory (A — Build an inventory)

### A1) Registered mobile routes (React Navigation)

#### Root stack (`mobile/App.tsx`)
- `Gate`
- `Auth`
- `CreateProfile`
- `MainTabs`
- `Rooms`
- `Wallet`
- `Transactions`
- `MyAnalytics`
- `EditProfile`
- `RoomRules`
- `HelpFAQ`
- `BlockedUsers`
- `ReportUser`
- `Theme`
- `Referrals` ✅ *(added in this pass)*
- `ReferralsLeaderboard` ✅ *(added in this pass)*
- `OwnerPanel`
- `ModerationPanel`
- `AdminApplications`
- `AdminGifts`
- `ProfileRoute`

#### Bottom tabs (`mobile/navigation/MainTabs.tsx`)
- `Home`
- `Feed`
- `Profile` *(mobile-only tab; web uses user menu profile entry instead)*
- `Messages`
- `Noties`

---

### A2) Interactive menu items / entry points (mobile)

#### Global header (`mobile/components/ui/GlobalHeader.tsx`)
- **Trophy** → opens `LeaderboardModal`
- **Video icon** → navigates to `Rooms`
- **Logo** → navigates to `Home`
- **Avatar** → opens `UserMenu`

#### UserMenu (avatar dropdown) (`mobile/components/UserMenu.tsx`)
- View Profile
- Edit Profile
- Wallet
- Analytics
- Transactions
- **Referrals** ✅ *(added entry point)*
- Apply for a Room
- Room Rules
- Help / FAQ
- Report a User
- Blocked Users
- Theme toggle
- Logout
- Admin-only: Owner Panel, Moderation Panel, Approve Room Applications, Manage Gift Types / Coin Packs ✅ *(added in this pass)*

#### Bottom nav (tabs) (`mobile/navigation/MainTabs.tsx`)
- Home
- Feed
- Profile
- Messages
- Noties

#### Home (`mobile/screens/HomeDashboardScreen.tsx`)
- Search result row → Profile
- “View My Profile” CTA → Profile
- “Browse Rooms” CTA → Rooms ✅ *(wired in this pass)*
- Header actions via `PageShell` → profile/wallet/rooms/apply/etc (settings + analytics wired) ✅

#### Feed (`mobile/screens/FeedScreen.tsx`)
- Composer: Photo / Video pickers
- Filter modal: apply filter + attach
- Post button
- Pagination: Load more
- Empty/error states: Refresh/Retry

#### Rooms (`mobile/screens/RoomsScreen.tsx`)
- Enter Live Central
- LiveRoom controller buttons (within LiveRoom): Exit, Go Live, Options, Gift, PiP, Mixer, Share
- Overlays: chat/viewers/menu/stats/gift (swipe gestures)

#### Messages (`mobile/screens/MessagesScreen.tsx`)
- Search
- Conversation row → open thread
- Thread composer: Send
- Deep-link open-by-userId param ✅ *(added in this pass)*

#### Noties (`mobile/screens/NotiesScreen.tsx`)
- Mark all read
- Notie row → mark read + navigate to actionUrl ✅ *(wired in this pass)*

#### Profile (`mobile/screens/ProfileScreen.tsx`)
- Follow / Message / Share / Analytics(Stats) buttons
- Social icons
- Connections expand + tabs
- Connection row → profile navigation ✅ *(wired in this pass)*
- Links list → opens URL
- Footer CTA (“Create Your Free Profile”) → auth/signup routing ✅ *(wired in this pass)*

#### Referrals ✅ *(new screens)*
- `Referrals` screen: open InviteLinkModal; view leaderboard
- `ReferralsLeaderboard` screen: preview + TODO for full list

---

## 3) Cross-reference vs web (B — Parity checks)

Legend:
- ✅ Matches web
- 🟡 Partial
- ❌ Missing

### Notes on “web reference”
Web references are either:
- Known routes (e.g. `/wallet`, `/me/analytics`, `/rooms`, `/messages`, `/noties`)
- Known components (e.g. `components/BottomNav.tsx`, `components/LeaderboardModal.tsx`, `components/OptionsMenu.tsx`, `components/UserMenu.tsx`)

---

## 4) Parity table (Required)

> This table lists **remaining gaps** after this UI pass (the punch list for Logic + follow-up UI).

| Feature / Page | Mobile status | Web reference | What’s missing | Mobile file(s) to touch | Route name | Logic hookup needed | Priority |
|---|---|---|---|---|---|---|---|
| Bottom nav “Rooms” placement | 🟡 | `components/BottomNav.tsx` (Rooms in bottom nav) | Mobile puts Rooms in **top header icon** + root route; bottom tabs include **Profile** instead | `mobile/navigation/MainTabs.tsx`, `mobile/components/ui/GlobalHeader.tsx`, `mobile/types/navigation.ts` | `MainTabs` | None | P1 |
| Referral leaderboard row tap → profile | 🟡 | Web leaderboard entries link to `/${username}` | Mobile referral leaderboard preview rows are **not tappable** | `mobile/components/ReferralLeaderboardPreview.tsx`, `mobile/screens/ReferralsLeaderboardScreen.tsx` | `ReferralsLeaderboard` | None | P1 |
| Full referral leaderboard list | 🟡 | Web referrals leaderboard has full list (API exists) | Mobile “full leaderboard” is still preview-style; needs pagination + full list UI | `mobile/screens/ReferralsLeaderboardScreen.tsx`, `mobile/hooks/*` | `ReferralsLeaderboard` | `GET /api/referrals/leaderboard?range=&limit=&offset=` (or cursor) | P1 |
| Referrals: share flow canonicalization | 🟡 | Web invite/referral UX (invite page + join link) | Ensure “Share your referral link” always uses canonical link rules (username vs ref code) | `mobile/components/InviteLinkModal.tsx`, `mobile/lib/referrals.ts` | `Referrals` | `rpc('get_or_create_referral_code')` already used; confirm consistency | P2 |
| Messages: open DM by username (not just userId) | 🟡 | Web supports opening DMs by username (e.g. query param) | Mobile deep-link currently supports `openUserId`; needs mapping username → userId (or alternate route param) | `mobile/screens/MessagesScreen.tsx`, `mobile/hooks/useMessages.ts` | `Messages` | TODO(LOGIC): add endpoint/RPC to resolve username→profile_id | P1 |
| Noties: complete actionUrl routing map | 🟡 | Web noties routes to many destinations | Mobile handles common actionUrl paths; needs a complete mapping as new notie types ship | `mobile/screens/NotiesScreen.tsx` | `Noties` | None (routing only) | P2 |
| Profile “Create Your Free Profile” CTA intent | 🟡 | Web CTA may route to `/signup` or onboarding | Mobile routes to `Auth` (and browser fallback). Needs exact parity copy + route flow | `mobile/screens/ProfileScreen.tsx` | `Profile` | None | P2 |
| Profile-type section management (edit/add) | ❌ | Web profile-type sections have edit/add flows | Mobile renders sections but lacks section-specific “manage” screens/modals | `mobile/screens/ProfileScreen.tsx`, `mobile/components/profile/*` | (new routes) | TODO(LOGIC): per-section data fetch/save RPCs | P0 |

---

## 5) UI Fix pass (C — What was fixed in this rollout)

### ✅ Navigation / dead-tap fixes
- **Wallet / Apply** now always work from menus (fallback routing + browser open).
- **Profile connections list** rows now navigate to the tapped user’s profile.
- **Home header actions** now route to existing screens (`EditProfile`, `MyAnalytics`) instead of TODO stubs.
- **Noties actionUrl** now routes to common internal destinations or opens browser.
- **“Message” button on profiles** now opens Messages and auto-opens the conversation via `openUserId` param.
- **Messages thread view** now uses the global header (`useNewHeader`) for parity consistency.

### ✅ Referrals surfaced
- Added **Referrals** screen + entry point in `UserMenu`.
- Added **ReferralsLeaderboard** screen as a placeholder home for full leaderboard work.

---

## 6) New UI artifacts created (Required)

### New screens
- `mobile/screens/ReferralsScreen.tsx`
- `mobile/screens/ReferralsLeaderboardScreen.tsx`

### Route additions
- Root stack:
  - `Referrals`
  - `ReferralsLeaderboard`

### Updated navigation params
- `MainTabsParamList.Messages` now supports `{ openUserId?: string }` for deep-linking into a DM thread.

---

## 7) Logic Punch List (Required — grouped, with exact file targets)

### Profile Types / Section Management (P0)
- **Add section edit/add flows per profile type** in `mobile/screens/ProfileScreen.tsx` and the relevant section components in `mobile/components/profile/*`.
  - TODO(LOGIC): define per-section data model + RPCs/endpoints (e.g. music tracks, events, products).

### Referrals (P1/P2)
- **Full referral leaderboard list + pagination + tap-to-profile** in `mobile/screens/ReferralsLeaderboardScreen.tsx`.
  - TODO(LOGIC): confirm pagination contract for `GET /api/referrals/leaderboard` (cursor vs offset).
- **Referral leaderboard row tap** support in `mobile/components/ReferralLeaderboardPreview.tsx`.
  - TODO(LOGIC): decide route target: `Profile` tab vs `ProfileRoute` stack.

### Messages (P1)
- **Open DM by username** (web parity) in `mobile/screens/MessagesScreen.tsx`.
  - TODO(LOGIC): add resolver `username -> profile_id` (RPC or endpoint) and then call `setActiveConversationId(profile_id)`.

### Noties (P2)
- **Complete actionUrl routing coverage** in `mobile/screens/NotiesScreen.tsx`.
  - TODO(LOGIC): define a canonical mapping for all notie types/actionUrls produced by backend.

### Admin (P2)
- If web adds additional admin actions to OptionsMenu, mirror them in mobile in:
  - `mobile/components/UserMenu.tsx`
  - `mobile/components/OptionsMenu.tsx`



