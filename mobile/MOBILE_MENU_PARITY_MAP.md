# MOBILE MENU PARITY MAP

| Menu | Item | WEB target | WEB state (enabled/disabled/modal) | Role gate | MOBILE target | MOBILE state | Notes |
|------|------|------------|-------------------------------------|----------|--------------|--------------|------|
| UserMenu | View Profile | `/${username}` | enabled (navigate) | logged-in | `ProfileRoute` | enabled (navigate) | Uses `profiles.username` from Supabase. |
| UserMenu | Edit Profile | `/settings/profile` | enabled (navigate) | logged-in | `EditProfile` | enabled (navigate) | Mobile screen saves `profiles.display_name` + `profiles.bio`. |
| UserMenu | Wallet | `/wallet` | enabled (navigate) | logged-in | `Wallet` | enabled (navigate) | Mobile already uses `/api/wallet` via `fetchAuthed`. |
| UserMenu | Analytics | `/me/analytics` | enabled (navigate) | logged-in | `MyAnalytics` | enabled (navigate) | Mobile uses `/api/user-analytics?range=30d`. |
| UserMenu | Theme | theme toggle (`ThemeToggle`) | enabled (inline toggle) | none | `Theme` | enabled (navigate) | Mobile stores selection in SecureStore (UI-only). |
| UserMenu | Logout | logout | enabled (action) | logged-in | Gate/Auth reset | enabled (action) | Mobile calls `supabase.auth.signOut()`. |
| OptionsMenu | My Profile | `/${currentUsername}` | enabled (navigate) | logged-in | `ProfileRoute` | enabled (navigate) | Uses current user `profiles.username`. |
| OptionsMenu | Edit Profile | `/settings/profile` | enabled (navigate) | logged-in | `EditProfile` | enabled (navigate) | Same destination as UserMenu. |
| OptionsMenu | Wallet | Wallet modal (`WalletModal`) | modal | logged-in | `Wallet` | enabled (navigate) | Mobile uses screen instead of modal. |
| OptionsMenu | My Gifts / Transactions | Transactions modal (`TransactionsModal`) | modal | logged-in | `Transactions` | enabled (navigate) | Mobile uses screen instead of modal (`/api/transactions`). |
| OptionsMenu | Apply for a Room | `/apply` | enabled (navigate) | none | External link to `/apply` | enabled (link) | Mobile uses `Linking.openURL`. |
| OptionsMenu | Room Rules | Room rules modal (`RoomRulesModal`) | modal | none | `RoomRules` | enabled (navigate) | Mobile screen mirrors web copy. |
| OptionsMenu | Help / FAQ | Help modal (`HelpFAQModal`) | modal | none | `HelpFAQ` | enabled (navigate) | Mobile screen mirrors web FAQ copy. |
| OptionsMenu | Mute All Tiles | local toggle | enabled (toggle) | none | in-menu toggle | enabled (toggle) | Currently local-only state (not persisted). |
| OptionsMenu | Autoplay Tiles | local toggle | enabled (toggle) | none | in-menu toggle | enabled (toggle) | Currently local-only state (not persisted). |
| OptionsMenu | Show Preview Mode Labels | local toggle | enabled (toggle) | none | in-menu toggle | enabled (toggle) | Currently local-only state (not persisted). |
| OptionsMenu | Report a User | report modal (`ReportModal`, type `user`) | modal | logged-in | `ReportUser` | enabled (navigate) | Mobile submits to `content_reports` via Supabase (mirrors `/api/reports/create`). |
| OptionsMenu | Blocked Users | blocked users modal (`BlockedUsersModal`) | modal | logged-in | `BlockedUsers` | enabled (navigate) | Mobile uses `blocks` table + `unblock_user` RPC fallback. |
| OptionsMenu (Admin) | 👑 Owner Panel | `/owner` | enabled (navigate) | admin/owner | `OwnerPanel` | enabled (navigate) | Mobile loads `/api/admin/overview` (read-only). |
| OptionsMenu (Admin) | Moderation Panel | `/admin/moderation` | enabled (navigate) | admin/owner | `ModerationPanel` | enabled (navigate) | Mobile loads `/api/admin/reports` (read-only). |
| OptionsMenu (Admin) | Approve Room Applications | `/admin/applications` | enabled (navigate) | admin/owner | `AdminApplications` | enabled (navigate) | Mobile loads `/api/admin/applications` (read-only). |
| OptionsMenu (Admin) | Manage Gift Types / Coin Packs | `/admin/gifts` | enabled (navigate) | admin/owner | `AdminGifts` | enabled (navigate) | Mobile loads `/api/admin/gifts` (read-only). |
| OptionsMenu (Admin) | End ALL streams | POST `/api/admin/end-streams` | enabled (action) | admin/owner | POST `https://mylivelinks.com/api/admin/end-streams` | enabled (action) | Already wired. |
| ProfileScreen | Overflow/… menu | N/A | N/A | N/A | N/A | N/A | No overflow menu currently present on mobile `ProfileScreen`. |
