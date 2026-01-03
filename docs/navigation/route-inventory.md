# Navigation Route Inventory

Source of truth for all Next.js App Router pages under `/app`. Each row includes the current purpose and where (if anywhere) the page should surface in navigation.

| Route | Exists? | Purpose | Menu placement | Access rules | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | yes | Authenticated home hub (teams, rooms, referrals CTA) | App | Auth | Landing for logged-in users; redirects to `/login` if unauthenticated |
| `/admin` | yes | Legacy admin shell | Admin/Internal | Admin | Hide from menus; only owner accounts should access |
| `/admin/applications` | yes | Review creator/team applications | Admin/Internal | Admin | Staff-only |
| `/admin/gifts` | yes | Gift catalog admin | Admin/Internal | Admin | Staff-only |
| `/admin/moderation` | yes | Moderation console | Admin/Internal | Admin | Staff-only |
| `/apply` | yes | Submit live room ideas | Neither (CTA only) | Auth | Linked from internal CTAs; not general navigation |
| `/composer` | yes | Creator project workspace | User | Auth | Add to user menu under Creator Tools |
| `/composer/new` | yes | New composer project wizard | Deep link only | Auth | Entered from Composer page |
| `/composer/[projectId]` | yes | Edit composer project | Deep link only | Auth | Routed from composer lists |
| `/feed` | yes | Chronological content feed | App | Auth | Include in App menu |
| `/gifter-levels` | yes | Explains gifter tiers | App | Auth | Include in App menu alongside Leaderboards |
| `/invite/[username]` | yes | Personal invite landing page | Deep link only | Public | Shared externally; no menu |
| `/join` | yes | Redirects to `/signup` (ref aware) | Neither | Public | No standalone UI |
| `/leaderboards` | yes | Global rankings | App | Auth | Include in App menu |
| `/link` | yes | Link or Nah hub (entry to modes) | App | Auth | Include; sub-routes reached from hub |
| `/link/auto/swipe` | yes | Auto-Link swipe flow | Deep link only | Auth | Button inside Link hub |
| `/link/dating` | yes | Dating hub marketing | App | Auth | Secondary CTA; accessible from Link hub, not main menu |
| `/link/dating/matches` | yes | Dating matches | Deep link only | Auth | Accessed from dating hub |
| `/link/dating/profile` | yes | Dating profile setup | User | Auth | Account-specific, reachable from Link hub/User menu |
| `/link/dating/swipe` | yes | Dating swipe deck | Deep link only | Auth | CTA only |
| `/link/mutuals` | yes | List of mutual connections | User | Auth | Good candidate for user menu (“Mutuals”) |
| `/link/profile` | yes | Link persona setup | User | Auth | Add under user/creator tools |
| `/link/regular` | yes | Manual swipe overview | Deep link only | Auth | Hub CTA |
| `/link/regular/swipe` | yes | Manual swipe deck | Deep link only | Auth | CTA |
| `/link/settings` | yes | Link preferences | User | Auth | Add under user settings |
| `/live` | yes | Redirect to `/room/live-central` | Neither | Auth | Legacy alias; keep hidden |
| `/live/host` | yes | Solo go-live flow | User | Auth | Add to user menu for creators (“Go Live”) |
| `/live/[username]` | yes | Legacy profile-based live route | Deep link only | Public | Linked from profiles |
| `/liveTV` | yes | Live TV browse (streams + rooms) | App | Auth | Primary live destination, App menu |
| `/login` | yes | Login screen | Neither | Public | Accessible via header button/User menu when logged out |
| `/me/analytics` | yes | Creator analytics dashboard | User | Auth | Add to user menu (“Analytics”) |
| `/messages` | yes | Full inbox experience | User | Auth | User menu (messages already in header, but keep) |
| `/noties` | yes | Notifications center | User | Auth | Add to user menu (“Notifications”) |
| `/oauth/consent` | yes | OAuth consent dialog | System | Public | Never in menu |
| `/onboarding` | yes | New-user onboarding flow | System | Auth | Accessed via redirect; hide |
| `/owner` | yes | Owner control center | Admin/Internal | Admin | Staff only |
| `/owner/analytics` | yes | Owner analytics | Admin/Internal | Admin | Staff only |
| `/owner/feature-flags` | yes | Feature flag dashboard | Admin/Internal | Admin | Staff only |
| `/owner/live-ops` | yes | Live ops command center | Admin/Internal | Admin | Staff only |
| `/owner/referrals` | yes | Owner referral data | Admin/Internal | Admin | Staff only |
| `/owner/reports` | yes | Reporting suite | Admin/Internal | Admin | Staff only |
| `/owner/revenue` | yes | Revenue analytics | Admin/Internal | Admin | Staff only |
| `/owner/roles` | yes | Staff role management | Admin/Internal | Admin | Staff only |
| `/owner/rooms` | yes | Owner rooms list | Admin/Internal | Admin | Staff only |
| `/owner/rooms/new` | yes | Create owner-managed room | Admin/Internal | Admin | Staff only |
| `/owner/rooms/[roomId]` | yes | Owner room detail | Admin/Internal | Admin | Staff only |
| `/owner/settings` | yes | Owner settings | Admin/Internal | Admin | Staff only |
| `/owner/templates` | yes | Broadcast templates | Admin/Internal | Admin | Staff only |
| `/owner/templates/new` | yes | Create template | Admin/Internal | Admin | Staff only |
| `/owner/templates/[templateId]` | yes | Template detail | Admin/Internal | Admin | Staff only |
| `/owner/users` | yes | User directory | Admin/Internal | Admin | Staff only |
| `/owner/users/[profileId]/analytics` | yes | User analytics (owner) | Admin/Internal | Admin | Staff only |
| `/p/[username]` | yes | Lightweight public profile | Deep link only | Public | Linked externally |
| `/policies` | yes | Policy index | App | Public | App menu entry (“Help & Safety”) |
| `/policies/[id]` | yes | Specific policy (terms/privacy/etc.) | App | Public | App menu relies on slugs like `/policies/terms-of-service` |
| `/referrals` | yes | User referral dashboard | User | Auth | Add to user menu (growth) |
| `/reset-password` | yes | Password reset flow | Neither | Public | Linked from auth screens |
| `/room/[slug]` | yes | Live room viewer | Deep link only | Public | Opened from cards; no menu |
| `/rooms` | yes | Redirect to `/liveTV` | Neither | Public | Legacy alias; keep hidden |
| `/search` | yes | Full search surface | App (overlay) | Auth | Trigger via Search entry (opens overlay) |
| `/search/live` | yes | Search live streams | Deep link only | Auth | Tab inside search |
| `/search/people` | yes | Search people tab | Deep link only | Auth | Tab |
| `/search/posts` | yes | Search posts tab | Deep link only | Auth | Tab |
| `/search/teams` | yes | Search teams tab | Deep link only | Auth | Tab |
| `/settings/account` | yes | Account status & deletion | User | Auth | Add to user menu (“Account Settings”) |
| `/settings/email` | yes | Email management | User | Auth | Maybe grouped under Settings (deep link) |
| `/settings/password` | yes | Password updates | User | Auth | Use as Login & Security link |
| `/settings/profile` | yes | Profile editing | User | Auth | Default settings entry |
| `/settings/username` | yes | Username change | User | Auth | Secondary settings deep link |
| `/signup` | yes | Signup flow | Neither | Public | Linked from landing CTA |
| `/teams` | yes | Teams hub | App | Auth | Include in App menu |
| `/teams/invite/[inviteId]` | yes | Invite landing | Deep link only | Public | Accessed from share links |
| `/teams/room/[slug]` | yes | Team specific room viewer | Deep link only | Auth | Accessed via team UI |
| `/teams/setup` | yes | Team creation wizard | User | Auth | Exposed via Teams CTA, not menu |
| `/teams/[slug]` | yes | Team detail page | Deep link only | Auth | Linked from teams list |
| `/teams/[slug]/admin` | yes | Team admin dashboard | User | Auth | Visible to admins via CTA |
| `/trending` | yes | Trending live list | App | Auth | App menu |
| `/u/[username]/analytics` | yes | Analytics for other creators (mod?) | Admin/Internal | Admin | Debug-only |
| `/ui-kit` | yes | Internal design system showroom | Admin/Internal | Public | Keep hidden; dev utility |
| `/wallet` | yes | Wallet & coins | User | Auth | Must stay in user menu |
| `/[username]` | yes | Main public profile | Deep link only | Public | Reached via search/profile cards |
| `/[username]/feed` | yes | User feed tab | Deep link only | Public | Secondary profile tab |
| `/[username]/photos` | yes | User photos tab | Deep link only | Public | Secondary profile tab |

## Needs-Build / Missing Surface

- `Purchases / Orders`: Referenced in legacy user menu but no page exists yet. Keep disabled with “Coming soon” toast until implemented.
- `Discover` entry: No dedicated `/discover` route; rely on `/trending` + `/link` until product defines page.

## Classification Summary

- **App Menu candidates:** `/`, `/feed`, `/trending`, `/liveTV`, `/teams`, `/leaderboards`, `/gifter-levels`, `/link`, `/search` (overlay action), `/policies`, `/policies/terms-of-service`, `/policies/privacy-policy`.
- **User Menu candidates:** Profile (`/[username]`), `/settings/profile`, `/settings/account`, `/settings/password`, `/wallet`, `/noties`, `/messages`, `/referrals`, `/me/analytics`, `/link/profile`, `/link/mutuals`, `/composer`, `/live/host`, `/logout`.
- **Deep-link only:** Dynamic content surfaces such as `/room/[slug]`, `/teams/[slug]`, `/composer/[projectId]`, `/link/*/swipe`.
- **Admin/Internal:** `/admin/*`, `/owner/*`, `/u/[username]/analytics`, `/ui-kit`.
- **System/Auth flows (never in menu):** `/login`, `/signup`, `/reset-password`, `/join`, `/oauth/consent`, `/onboarding`.
