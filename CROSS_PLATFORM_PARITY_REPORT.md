# MyLiveLinks Cross-Platform Parity Report

**Audit Date:** January 14, 2026  
**Platforms:** Web (Next.js) ↔ Mobile (React Native/Expo)  
**Reference:** Web is authoritative

---

## Legend

- ✅ **Fully Matched** — Web = Mobile behavior
- ⚠️ **Exists but Differs** — Feature exists on both, behavior differs
- ❌ **Exists Only on One Platform** — Missing on one platform

---

## 1. User Flows

### 1.1 Signup

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Email/password signup | ✅ | Supabase auth | Supabase auth | None | — |
| Confirm password field | ⚠️ | Required | Not present | Mobile users may set weak passwords | Low |
| Username during signup | ⚠️ | Optional (login page toggle) | Not collected | Mobile users must set in onboarding | Low |
| OAuth (Google/Apple/Facebook/Twitch) | ⚠️ | Functional buttons | Buttons present but disabled | Mobile users cannot use social login | **High** |
| Referral code handling | ✅ | `?ref=` param processed | `?ref=` param processed | None | — |

### 1.2 Onboarding

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Username selection | ✅ | Step 1 | Present | None | — |
| Age verification (DOB) | ✅ | Step 2 with MM/DD/YYYY | Present | None | — |
| Profile details (display name, bio) | ✅ | Step 3 | Present | None | — |
| Terms acceptance | ✅ | Step 4 | Present | None | — |
| Adult content disclaimer | ✅ | Conditional (18+) | Present | None | — |
| Progress indicator | ✅ | 4-step bar | 4-step dots | None | — |
| Post-onboarding redirect | ✅ | → /watch | → Watch tab | None | — |

### 1.3 Feed

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Public feed display | ✅ | PublicFeedClient | FeedScreen with Supabase | None | — |
| Post composer | ⚠️ | "Coming soon" locked | Full composer modal | Web users cannot post | Medium |
| Like posts | ✅ | Functional | Functional | None | — |
| Comment on posts | ✅ | Comments modal | FeedCommentsModal | None | — |
| Share posts | ✅ | Share modal | ShareModal | None | — |
| Gift on posts | ✅ | Gift modal | WatchGiftModal | None | — |
| Report posts | ✅ | Report modal | ReportModal | None | — |
| MLL Pro badge display | ✅ | Present | Present | None | — |
| Feelings/mood on posts | ✅ | Supported | Supported | None | — |

### 1.4 Profile

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| View own profile | ✅ | /me or /@username | ProfileScreen → ProfileViewScreen | None | — |
| View other profiles | ✅ | /@username | ProfileViewScreen | None | — |
| Profile tabs (Info/Feed/Media/etc) | ✅ | ProfileTabBar | ProfileTabBar | None | — |
| Follow/unfollow | ✅ | API call | API call | None | — |
| Follower/following counts | ✅ | Displayed | Displayed | None | — |
| Friends count | ✅ | Displayed | Displayed | None | — |
| Social media links | ✅ | SocialMediaBar | SocialMediaBar | None | — |
| Top supporters section | ✅ | TopSupportersSection | TopSupportersSection | None | — |
| Top friends section | ✅ | TopFriendsSection | TopFriendsSection | None | — |
| Streaming stats | ✅ | Conditional display | Conditional display | None | — |
| Live indicator banner | ✅ | LiveIndicatorBanner | LiveIndicatorBanner | None | — |
| Profile type badge | ✅ | Displayed | Displayed | None | — |

---

## 2. Live Experience

### 2.1 Starting a Live (Host)

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Go Live entry point | ✅ | GoLiveButton | GoLiveScreen (tab) | None | — |
| Stream title input | ✅ | Required | Required | None | — |
| Category selection | ✅ | IRL/Music/Gaming/etc | IRL/Music/Gaming/etc | None | — |
| Audience selection | ✅ | Public/Team | Public/Team | None | — |
| Camera preview | ✅ | LiveKit VideoView | LiveKit VideoView | None | — |
| Camera flip | ✅ | Supported | Supported | None | — |
| Camera filters (brightness/contrast/saturation) | ✅ | Supported | Supported | None | — |
| Soft skin filter | ✅ | Supported | Supported | None | — |
| Mic mute toggle | ✅ | Supported | Supported | None | — |
| Camera disable toggle | ✅ | Supported | Supported | None | — |
| LiveKit room creation | ✅ | /api/livekit/token | /api/livekit/token | None | — |
| live_streams DB record | ✅ | Created on go live | Created on go live | None | — |
| Room presence upsert | ✅ | upsert_room_presence RPC | upsert_room_presence RPC | None | — |

### 2.2 Joining a Live (Viewer)

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| LiveTV discovery | ✅ | /watch or /livetv | LiveTVScreen | None | — |
| Category tabs | ✅ | IRL/Music/Gaming/etc | IRL/Music/Gaming/etc | None | — |
| Join stream | ✅ | Click → SoloStreamViewer | Tap → LiveUserScreen | None | — |
| Video playback | ✅ | LiveKit VideoView | LiveKit VideoView | None | — |
| Viewer count display | ✅ | Real-time from active_viewers | Real-time from active_viewers | None | — |
| active_viewers tracking | ✅ | Inserted on join | Inserted on join | None | — |

### 2.3 Guest/Cohost

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Request to join as guest | ✅ | RequestGuestModal | Not implemented | Mobile viewers cannot request guest | Medium |
| Accept/reject guest requests | ✅ | Host controls | Not implemented | Mobile hosts cannot manage guests | Medium |
| Multi-participant grid | ✅ | MultiHostGrid | Not implemented | Mobile lacks multi-host view | Medium |

### 2.4 Battles

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Start battle | ✅ | BattleControls | Not implemented | Mobile hosts cannot start battles | **High** |
| Battle invites | ✅ | BattleInvitePopup | Not implemented | Mobile hosts cannot invite | **High** |
| Battle viewer UI | ✅ | BattleViewer/BattleGridWrapper | Not implemented | Mobile viewers cannot watch battles | **High** |
| Battle scoring | ✅ | BattleScoreSlider/BattleScoreBar | Not implemented | — | **High** |
| Battle timer | ✅ | BattleTimer | Not implemented | — | **High** |
| Battle top supporters | ✅ | BattleTopSupporters | Not implemented | — | **High** |
| Battle cooldown controls | ✅ | BattleCooldownControls | Not implemented | — | **High** |

### 2.5 Ending Streams

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| End stream button | ✅ | Present | Present | None | — |
| Confirmation dialog | ✅ | Alert | Alert | None | — |
| live_streams ended_at update | ✅ | endLiveStreamRecord | endLiveStreamRecord | None | — |
| Room presence cleanup | ✅ | is_live_available=false | is_live_available=false | None | — |
| LiveKit disconnect | ✅ | room.disconnect() | room.disconnect() | None | — |

### 2.6 Viewer Counts, Gifts, Chat

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Real-time viewer count | ✅ | active_viewers + realtime | active_viewers + realtime | None | — |
| Chat messages | ✅ | chat_messages table + realtime | chat_messages table + realtime | None | — |
| Send chat message | ✅ | StreamChat | ChatOverlay | None | — |
| Gift sending in stream | ✅ | GiftModal | WatchGiftModal | None | — |
| Gift animations | ✅ | CSS animations | Not implemented | Mobile lacks gift animations | Low |
| Top gifters display | ✅ | TopGifterBubbles | TopGifterBubbles | None | — |
| Gifter badges in chat | ✅ | Tier badges | Tier badges | None | — |
| Trending rank display | ✅ | Conditional | Conditional | None | — |
| Leaderboard rank display | ✅ | Conditional | Conditional | None | — |

---

## 3. Economy

### 3.1 Coin Purchase

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| View coin balance | ✅ | profiles.coin_balance | profiles.coin_balance | None | — |
| Coin pack display | ✅ | CoinPurchaseSection | MOBILE_COIN_PACKS grid | None | — |
| Purchase flow | ⚠️ | Stripe Checkout | Native IAP (App Store/Google Play) | Different payment methods | Expected |
| Purchase confirmation | ✅ | Server webhook | confirmPurchaseWithServer | None | — |
| Balance update after purchase | ✅ | Polling/refresh | Polling/refresh | None | — |

### 3.2 Gift Sending

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Gift modal | ✅ | GiftModal | WatchGiftModal | None | — |
| Gift catalog | ✅ | gifts table | gifts table | None | — |
| Send gift to streamer | ✅ | send_gift RPC | send_gift RPC | None | — |
| Gift in DM | ✅ | Supported | Supported | None | — |
| Coin deduction | ✅ | Automatic | Automatic | None | — |
| Diamond credit to recipient | ✅ | Automatic | Automatic | None | — |

### 3.3 Wallet Balances

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Coin balance display | ✅ | profiles.coin_balance | profiles.coin_balance | None | — |
| Diamond balance display | ✅ | profiles.earnings_balance | profiles.earnings_balance | None | — |
| USD equivalent display | ✅ | diamonds/100 | diamonds/100 | None | — |

### 3.4 Cashout

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Cashout UI | ⚠️ | Full inline form | Redirect to web | Mobile users must use web for cashout | Medium |
| Stripe Connect onboarding | ✅ | /api/connect/onboard | Opens web URL | None | — |
| Cashout request | ✅ | /api/cashout/request | Opens web URL | None | — |
| Minimum cashout (10,000 💎) | ✅ | Enforced | Displayed | None | — |
| Progress bar to minimum | ✅ | Displayed | Not displayed | Mobile lacks progress indicator | Low |

### 3.5 Transaction History

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Transaction list | ⚠️ | Full history | Last 5 + "View all" link to web | Mobile has limited history | Low |
| Transaction types | ✅ | All types | All types | None | — |
| Transaction icons | ✅ | Lucide icons | Emoji icons | Visual difference only | — |

### 3.6 Diamond Conversion

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Diamond to coin conversion | ❌ | DiamondConversion component | Not implemented | Mobile users cannot convert diamonds | Medium |

---

## 4. Social Graph

### 4.1 Follow/Unfollow

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Follow from profile | ✅ | /api/profile/follow | /api/profile/follow | None | — |
| Follow from Watch feed | ✅ | follows table insert | follows table insert | None | — |
| Unfollow | ✅ | follows table delete | follows table delete | None | — |
| Optimistic UI update | ✅ | Implemented | Implemented | None | — |
| Relationship states (none/following/friends) | ✅ | Displayed | Displayed | None | — |

### 4.2 Blocking

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Block user | ✅ | block_user RPC | block_user RPC | None | — |
| Unblock user | ✅ | unblock_user RPC | unblock_user RPC | None | — |
| Block from profile | ✅ | OptionsMenu | Block menu modal | None | — |
| Blocked users list | ⚠️ | BlockedUsersModal | BlockedUsersScreen | None | — |
| Block confirmation | ✅ | Alert dialog | Alert dialog | None | — |

### 4.3 Reporting

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Report user | ✅ | ReportModal | ReportModal | None | — |
| Report stream | ✅ | ReportModal | ReportModal | None | — |
| Report chat | ✅ | ReportModal | ReportModal | None | — |
| Report reasons | ✅ | Same categories | Same categories | None | — |
| Report API | ✅ | /api/reports/create | /api/reports/create | None | — |
| Rate limiting | ✅ | Enforced | Enforced | None | — |

### 4.4 Messaging (DMs)

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Inbox/conversation list | ✅ | Messenger component | MessagesScreen | None | — |
| Thread view | ✅ | MessengerThread | IMThreadScreen | None | — |
| Send text message | ✅ | im_messages insert | im_messages insert | None | — |
| Send gift in DM | ✅ | Gift modal | WatchGiftModal | None | — |
| Share content in DM | ✅ | Share modal | ShareModal | None | — |
| Unread count | ✅ | get_im_conversations RPC | get_im_conversations RPC | None | — |
| Real-time updates | ✅ | Supabase realtime | Supabase realtime | None | — |
| Friends strip | ✅ | get_friends_list RPC | get_friends_list RPC | None | — |
| Online status | ✅ | room_presence | room_presence | None | — |
| Report from DM | ✅ | Report button | Report button | None | — |

---

## 5. Settings & Preferences

### 5.1 Profile Edits

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Edit profile screen | ✅ | /settings/profile | SettingsProfileScreen | None | — |
| Change display name | ✅ | Supported | Supported | None | — |
| Change bio | ✅ | Supported | Supported | None | — |
| Change avatar | ✅ | Supported | Supported | None | — |
| Change banner | ✅ | Supported | Supported | None | — |
| Social media links | ✅ | Supported | Supported | None | — |
| Profile type selection | ✅ | Supported | Supported | None | — |
| Enabled modules | ✅ | Supported | Supported | None | — |

### 5.2 Account Settings

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Change email | ✅ | /settings/email | SettingsEmailScreen | None | — |
| Change password | ✅ | /settings/password | SettingsPasswordScreen | None | — |
| Change username | ✅ | /settings/username | SettingsUsernameScreen | None | — |
| Account overview | ✅ | /settings/account | SettingsAccountScreen | None | — |
| Sign out | ✅ | Supported | Supported | None | — |
| Delete account | ✅ | Supported | Supported | None | — |

### 5.3 Privacy Controls

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Hide streaming stats | ✅ | Profile setting | Profile setting | None | — |
| Show/hide top friends | ✅ | Profile setting | Profile setting | None | — |
| Location visibility | ✅ | Profile setting | Profile setting | None | — |
| Adult content preference | ✅ | user_settings | user_settings | None | — |

### 5.4 Defaults

| Feature | Status | Web | Mobile | User Impact | Launch Severity |
|---------|--------|-----|--------|-------------|-----------------|
| Default landing page | ✅ | /watch | Watch tab | None | — |
| Theme (dark/light) | ✅ | System/manual | System/manual | None | — |
| Initial coin balance | ✅ | 0 | 0 | None | — |
| Initial gifter level | ✅ | 0 | 0 | None | — |

---

## 6. Summary of Critical Gaps

### ❌ Missing on Mobile (Launch Blockers)

| Feature | Severity | Notes |
|---------|----------|-------|
| **Battle system** | **Critical** | No battle UI, invites, scoring, timer, or viewer experience |
| **OAuth login** | **High** | Social login buttons disabled |
| **Guest/cohost requests** | **Medium** | Cannot request or manage guests |

### ⚠️ Behavioral Differences

| Feature | Severity | Notes |
|---------|----------|-------|
| Coin purchase flow | Expected | Web uses Stripe, Mobile uses native IAP |
| Cashout | Medium | Mobile redirects to web |
| Diamond conversion | Medium | Not available on mobile |
| Post composer | Medium | Web locked, Mobile functional |
| Transaction history | Low | Mobile shows limited history |
| Gift animations | Low | Not implemented on mobile |

### ✅ Fully Matched (No Action Needed)

- Signup/login (email/password)
- Onboarding flow
- Profile viewing and editing
- Follow/unfollow/block/report
- Direct messaging
- Live streaming (host solo)
- Gift sending
- Wallet balances
- Chat in streams
- Settings screens

---

## 7. Data Consistency Notes

| Area | Status | Notes |
|------|--------|-------|
| User balances | ✅ | Both platforms read from `profiles.coin_balance` and `profiles.earnings_balance` |
| Follow relationships | ✅ | Both use `follows` table |
| Block relationships | ✅ | Both use `blocks` table via RPCs |
| Messages | ✅ | Both use `im_messages` table |
| Live streams | ✅ | Both use `live_streams` and `active_viewers` tables |
| Gifts | ✅ | Both use `gifts` table |
| Chat | ✅ | Both use `chat_messages` table |
| Transactions | ✅ | Both use `/api/transactions` endpoint |

---

*End of Report*
