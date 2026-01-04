# MyLiveLinks Site Facts

_Generated at 2026-01-04T20:28:39.565Z_

## MyLiveLinks Homepage

- Source: https://www.mylivelinks.com/
- Type: remote

### Summary
Share your links, make posts, go live, and get paid! Join the MyLiveLinks community.

### Key Facts
- Share your links, make posts, go live, and get paid! Join the MyLiveLinks community.

## Platform Features

- Source: https://www.mylivelinks.com/features
- Type: remote

### Summary
Share your links, make posts, go live, and get paid! Join the MyLiveLinks community.

### Key Facts
- Share your links, make posts, go live, and get paid! Join the MyLiveLinks community.

## Creator Programs

- Source: https://www.mylivelinks.com/creators
- Type: remote

### Summary
Share your links, make posts, go live, and get paid! Join the MyLiveLinks community.

### Key Facts
- Share your links, make posts, go live, and get paid! Join the MyLiveLinks community.

## Repository README

- Source: README.md
- Type: local
- Headings:
  - (1) MyLiveLinks - Group Live Streaming Platform
  - (2) Overview
  - (2) Core Features
  - (3) 🎥 Group Live Room
  - (3) 📺 Demand-Based Publishing (Cost-Efficient)
  - (3) 💰 Monetization
  - (3) 🏆 Leaderboards
  - (3) 👤 Profiles
  - (2) Database Schema
  - (3) Key Production Features
  - (3) Key Tables
  - (2) Coin Packs
  - (2) Architecture Highlights
  - (3) Supabase Auth Integration
  - (3) Ledger-Based Coin System
  - (3) Demand-Based Publishing Flow
  - (3) Purchase Idempotency
  - (3) Revenue Split
  - (2) Tech Stack Requirements
  - (3) Frontend
  - (3) Backend
  - (3) Live Video
  - (2) Database Setup
  - (3) Prerequisites
  - (3) Installation
  - (3) Verification
  - (2) Critical RPC Functions
  - (3) update_coin_balance_via_ledger()
  - (3) process_coin_purchase()
  - (3) process_gift()
  - (3) update_publish_state_from_viewers()
  - (3) cleanup_stale_viewers()
  - (2) Version 1 Requirements
  - (2) Production Checklist
  - (2) Important Notes
  - (2) Support

### Summary
One link. Every live. MyLiveLinks is a production-grade, monetized, enterprise-scale web platform for group live streaming.

### Key Facts
- 12 video boxes always visible (6×2 grid)
- All users share one global room
- Heavy chat presence
- Competitive, fast-moving environment
- Streamers marked "live-available" when pressing "Go Live"
- Video/audio publishes only when viewers are watching
- When last viewer leaves → unpublish
- Streamer remains live-available
- Eliminates wasted minutes and reduces idle costs
- Coin System : Purchase-only coins (never earned for free)

## Developer README

- Source: README_DEV.md
- Type: local
- Headings:
  - (1) MyLiveLinks - Development Guide
  - (2) Profile + Login MVP
  - (2) Environment Variables
  - (3) Required for Supabase (when enabled):
  - (3) Optional:
  - (2) Database Setup
  - (2) Mock Mode
  - (2) Features
  - (3) Login Page ( /login )
  - (3) Public Profile ( /[username] )
  - (3) Profile Settings ( /settings/profile )
  - (2) Media Handling
  - (2) Database Tables Used
  - (2) Testing
  - (2) Notes

### Summary
This MVP includes: /login - Authentication page (email + password) /[username] - Public profile page (Linktree-style)

### Key Facts
- /login - Authentication page (email + password)
- /[username] - Public profile page (Linktree-style)
- /settings/profile - Profile editing page (owner only)
- Block 1 : database_schema.sql - Main schema
- Block 2 : schema_extensions_coins_diamonds.sql - Extensions
- Block 3 : seed_owner_and_data.sql - Owner account & seed data
- Block 4 : withdrawal_system.sql - Withdrawal system
- Block 5 : blocking_system.sql - Blocking system
- Block 6 : pinned_posts_schema.sql - Pinned posts table
- All database queries return empty/mock data

## docs/linkler-lite-ui-plan.md

- Source: docs\linkler-lite-ui-plan.md
- Type: local
- Headings:
  - (1) Linkler Lite UI Wiring Plan
  - (2) Surfaces & Entry Points
  - (2) Panel Structure
  - (2) Support Intake Tab
  - (2) Companion Chat Tab
  - (2) Anti-spam / Safety
  - (2) Ticket Confirmation + Hand-off
  - (2) Future Moderation Hook

### Summary
Floating Linkler button lives in the shared top-level layout so both the home feed ( app/page.tsx ) and the user's own profile ( components/ProfileHeader.tsx once loaded) render it. Reuse the existing floating action pattern (same z-index as components/GlobalHeader.tsx modals) and display linkler.png inside a circular button with a subtle glow when unread tickets exist. Respect feature flags via useFeatureFlags so the button can be toggled remotely.

### Key Facts
- Floating Linkler button lives in the shared top-level layout so both the home feed ( app/page.tsx ) and the user's own profile ( components/ProfileHeader.tsx once loaded) render it. Reuse the existing floating action pattern (same z-index as components/GlobalHeader.tsx modals) and display linkler.png inside a circular button with a subtle glow when unread tickets exist.
- Respect feature flags via useFeatureFlags so the button can be toggled remotely. When hidden, no background polling or AI calls should occur (prevents unsolicited responses).
- Place the button near the lower-right corner on desktop and above the tab bar on mobile web. Use CSS vars already defined in styles/globals.css for spacing so it matches the rest of the floating controls.
- Open a lightweight panel component under components/support/LinklerPanel.tsx . Keep it mounted but hidden to preserve chat state.
- Header: Linkler avatar, title (“Need a hand?”), short subtitle (“Choose support or companion mode”). Include an always-visible Send to human support link anchored to the right; clicking it focuses the Support tab immediately.
- Provide two equal-width CTA buttons at the top of the panel: Report / Get Support → toggles the Support Intake tab. Chat with Linkler → toggles the Companion Chat tab.
- Report / Get Support → toggles the Support Intake tab.
- Chat with Linkler → toggles the Companion Chat tab.
- Tabs share the same textarea + send button component ( components/support/MessageComposer.tsx ). Add optional pill to show “Human reviewed” copy referencing moderation guidelines.
- Textarea (minimum 3 lines) with placeholder “Describe the issue…”.

## docs/linkler-lite-verification.md

- Source: docs\linkler-lite-verification.md
- Type: local
- Headings:
  - (1) Linkler Lite Verification Commands
  - (2) 1. Infrastructure guard (no public leakage)
  - (2) 2. Support intake ticket ( /api/linkler/support )
  - (2) 3. Rate-limit & cooldown proofs
  - (2) 4. Kill switch ( LINKLER_ENABLED=false )
  - (2) 5. Moderation classification
  - (2) 6. Companion chat sanity ( /api/linkler/companion )
  - (2) 7. UI sanity (web + mobile)
  - (2) 8. Owner-only prompt + model controls
  - (3) a. Non-owner update (should fail)
  - (3) b. Owner update (should succeed)
  - (3) c. Runtime effect check
  - (2) 9. Admin & Owner diagnostics card

### Summary
All endpoints run under the Next.js dev server ( npm run dev ) on http://localhost:3000 . The Linkler APIs require a valid Supabase session token; grab one from localStorage.getItem('sb-access-token') in an authenticated browser tab (owner profile for the admin-only routes) or issue a service token for testing. /api/ollama/* and /api/ai/ping are now owner-gated; public calls must fail.

### Key Facts
- Web: Log in, open the floating Linkler button on Home and on app/[username]/modern-page . Confirm both tabs work: Support tab posts to /api/linkler/support and shows the ticket confirmation banner or the 503/429 messaging when applicable. Companion tab maintains transcript + cooldowns and the “Send to support” handoff while targeting /api/linkler/companion .
- Support tab posts to /api/linkler/support and shows the ticket confirmation banner or the 503/429 messaging when applicable.
- Companion tab maintains transcript + cooldowns and the “Send to support” handoff while targeting /api/linkler/companion .
- Mobile: In the Expo app, verify the Linkler button floats above Home and the user’s own Profile. The panel mirrors the two-tab behavior (support + companion) and enforces cooldowns against /api/linkler/* .
- Edit the prompt via /admin/linkler (or the SQL step above) and add a recognizable phrase such as Linkler internal prompt test .
- Immediately call the support intake endpoint (Section 2). The response payload includes prompt.key and prompt.updatedAt . The minted phrase should now appear inside the AI-generated summary, proving the live runtime picked up the DB copy.
- Use /api/ai/ping (authenticated as the owner) to confirm the models.guard / models.assistant fields match the latest values from ai_settings .
- Sign in as the owner and open /admin/linkler . The Linkler Status card should appear above the editor with: Health ( online / offline ) and the latest latency in milliseconds. Kill switch indicator ( Enabled vs Disabled ). 24h usage counts for support tickets and companion chats. The most recent AI error message, or “No AI errors recorded.”
- Health ( online / offline ) and the latest latency in milliseconds.
- Kill switch indicator ( Enabled vs Disabled ).

## docs/Linkler_System.md

- Source: docs\Linkler_System.md
- Type: local
- Headings:
  - (2) 1. Identity Definition
  - (2) 2. Tone & Communication Rules
  - (2) 3. Hard Constraints (Non-Negotiable)
  - (2) 4. Knowledge Scope (What Linkler Knows)
  - (2) 5. Uncertainty Handling
  - (2) 6. Support & Escalation Rules
  - (2) 7. Safety & Trust Boundaries
  - (2) 8. Canonical Response Pattern
  - (2) 9. Example User Questions & Model-Perfect Responses
  - (2) 10. Version Lock
  - (2) 11. Runtime Configuration (Environment Variables)

### Summary
You are Linkler, MyLiveLinks’ in-app assistant and first-contact guide for members using the real product experience. You exist to explain how current features behave, point out limitations, and keep people oriented without inventing anything that is not live in the app. Treat the user as the account holder interacting with the logged-in product experience; never impersonate other users or staff.

### Key Facts
- You are Linkler, MyLiveLinks’ in-app assistant and first-contact guide for members using the real product experience.
- You exist to explain how current features behave, point out limitations, and keep people oriented without inventing anything that is not live in the app.
- Treat the user as the account holder interacting with the logged-in product experience; never impersonate other users or staff.
- Human support owns account reviews, policy calls, and manual fixes; you only triage, explain, and escalate with the approved language below.
- Keep responses under 90 words unless summarizing multiple steps; prefer 2 short sentences.
- Write in calm, plain language with neutral empathy (no hype, no slang, no emojis).
- Vary sentence length between 8–16 words; avoid bullet lists unless the user explicitly asks.
- Mirror the user’s terminology when it matches product names (LiveTV, Teams, Wallet, Link, Noties).
- Ask at most one clarifying question when a necessary detail is missing; otherwise proceed with the best verified guidance.
- Never sound legalistic, robotic, sarcastic, or like a policy enforcer.

## docs/Linkler_Training.md

- Source: docs\Linkler_Training.md
- Type: local
- Headings:
  - (2) 1. Mission & Identity
  - (2) 2. Personality & Tone
  - (2) 3. What Linkler Can Do
  - (2) 4. What Linkler Cannot Do
  - (2) 5. Behavioral Guardrails & “Don’t Guess” Rules
  - (2) 6. AI-First Support Flow
  - (2) 7. Sensitive Issue Routing & Escalation Triggers
  - (2) 8. Navigation Map & Common FAQs
  - (3) Home & Live
  - (3) Teams
  - (3) Feed & Posts
  - (3) Wallet & Gifting
  - (3) Messaging
  - (3) Link (Dating & Auto-Link)
  - (3) Search & Noties
  - (3) Profile & Settings
  - (2) 9. Troubleshooting Scripts (Use verbatim + customize specifics)
  - (2) 10. Response Templates
  - (2) 11. Safety & Trust Handling
  - (2) 12. Version Scope & References

### Summary
Linkler is the in-app companion for real, logged-in MyLiveLinks members. Primary job: describe the product exactly as it works today, orient people with on-screen menus/buttons, and surface when rollout is limited. Linkler triages; human support owns account reviews, policy calls, billing, safety, and any irreversible actions.

### Key Facts
- Linkler is the in-app companion for real, logged-in MyLiveLinks members.
- Primary job: describe the product exactly as it works today, orient people with on-screen menus/buttons, and surface when rollout is limited.
- Linkler triages; human support owns account reviews, policy calls, billing, safety, and any irreversible actions.
- Calm, plain language with neutral empathy; no hype, slang, jokes, or emojis.
- Default to two short sentences (8–16 words each) under 90 total words.
- Mirror UI names exactly (LiveTV, Teams, Wallet, Noties, Link, Live Central).
- Ask one clarifying question only when a factual answer is blocked.
- Acknowledge friction (“I get why that feels stuck”) and immediately steer to guidance.
- Explain current behavior of live features, Teams, Feed, Wallet, Link, Messaging, Search, Notifications, and Profile settings.
- Guide navigation using only visible UI affordances (banners, icons, profile menu, buttons, tabs).

## docs/MUSIC_UPLOAD_RULES.md

- Source: docs\MUSIC_UPLOAD_RULES.md
- Type: local
- Headings:
  - (1) Music Upload Rules (Tracks)
  - (2) Bucket
  - (2) Canonical paths
  - (2) Public vs signed URLs

### Summary
This document defines the canonical Supabase Storage conventions for profile music tracks so web + mobile can generate stable URLs and keep media organized. Bucket : profile-media (canonical bucket already used for profile media uploads) Use these stable paths (track IDs are UUIDs from public.profile_music_tracks.id ):

### Key Facts
- Bucket : profile-media (canonical bucket already used for profile media uploads)
- Track audio : profile-media/{profile_id}/music/tracks/{track_id}/audio
- Track cover art : profile-media/{profile_id}/music/tracks/{track_id}/cover
- {profile_id} is the profile’s UUID ( public.profiles.id ).
- {track_id} is the track row UUID ( public.profile_music_tracks.id ).
- Re-uploads should overwrite the same path (stable URLs; no “random” filenames).
- supabase.storage.from('profile-media').getPublicUrl(path)
- supabase.storage.from('profile-media').createSignedUrl(path, expiresInSeconds)
- This document defines the canonical Supabase Storage conventions for profile music tracks so web + mobile can generate stable URLs and keep media organized.
- Use these stable paths (track IDs are UUIDs from public.profile_music_tracks.id ):

## docs/NOTIES_ACTIONURL_SPEC.md

- Source: docs\NOTIES_ACTIONURL_SPEC.md
- Type: local
- Headings:
  - (1) NOTIES actionUrl spec (canonical)
  - (2) Goals
  - (2) Notie types currently emitted
  - (2) Canonical actionUrl formats
  - (3) Profile
  - (3) Live
  - (3) Wallet
  - (3) My Analytics
  - (3) Rooms
  - (3) Messages
  - (3) Noties
  - (3) Gifter Levels
  - (3) Settings: Profile
  - (2) Resolver contract
  - (2) Mobile navigation contract

### Summary
This document defines the canonical actionUrl formats emitted/consumed for notifications (“Noties”), and how they map to existing routes on web + mobile. Provide a single, deterministic mapping for both web + mobile. Keep actionUrl values portable : they may be a relative path ( /wallet ), a site URL ( https://mylivelinks.com/wallet ), or a mobile deep-link ( mylivelinks://wallet ).

### Key Facts
- Provide a single, deterministic mapping for both web + mobile.
- Keep actionUrl values portable : they may be a relative path ( /wallet ), a site URL ( https://mylivelinks.com/wallet ), or a mobile deep-link ( mylivelinks://wallet ).
- Avoid leaking private data via actionUrl query parameters.
- follow
- live
- gift
- purchase
- conversion
- mention
- comment

## docs/search-data-sources.md

- Source: docs\search-data-sources.md
- Type: local
- Headings:
  - (2) Search data sources
  - (2) Manual verification checklist

### Summary
lib/search.ts contains the shared fetchSearchResults helper used by both the dropdown ( GlobalSearchTrigger ) and /search pages. It queries Supabase tables: profiles for People and Live tabs (columns: id , username , display_name , avatar_url , is_live , follower_count , verification flags, bio , viewer_count ).

### Key Facts
- lib/search.ts contains the shared fetchSearchResults helper used by both the dropdown ( GlobalSearchTrigger ) and /search pages. It queries Supabase tables: profiles for People and Live tabs (columns: id , username , display_name , avatar_url , is_live , follower_count , verification flags, bio , viewer_count ). posts for Posts tab ( id , text_content , created_at , media_url , reaction + comment counts, plus the profiles join for author info). team_feed_posts for team activity (joined with teams + profiles so team posts show up alongside global posts). teams for Teams tab ( id , name , slug , description , icon_url , banner_url , approved_member_count ).
- profiles for People and Live tabs (columns: id , username , display_name , avatar_url , is_live , follower_count , verification flags, bio , viewer_count ).
- posts for Posts tab ( id , text_content , created_at , media_url , reaction + comment counts, plus the profiles join for author info).
- team_feed_posts for team activity (joined with teams + profiles so team posts show up alongside global posts).
- teams for Teams tab ( id , name , slug , description , icon_url , banner_url , approved_member_count ).
- Nearby People continues to use the existing rpc_profiles_nearby Supabase RPC inside SearchPage .
- No additional API routes were created; dropdown and page components call Supabase directly through the shared helper so the data contract stays identical in both experiences.
- Result links resolve to: People → /${username} (fallback /profiles/${id} ) Posts → /feed?focusPostId={postId} for global posts or /teams/{slug}?postId={postId} for team activity Teams → /teams/{slug||id} Live → /live/{username||id}
- People → /${username} (fallback /profiles/${id} )
- Posts → /feed?focusPostId={postId} for global posts or /teams/{slug}?postId={postId} for team activity

## docs/TEAMS_LAUNCH_SPEC.md

- Source: docs\TEAMS_LAUNCH_SPEC.md
- Type: local
- Headings:
  - (1) Teams Feature Launch Specification
  - (2) Overview
  - (2) 1. CURRENT STATE
  - (3) 1.1 UI Components (COMPLETE)
  - (3) 1.2 Database Schema (COMPLETE)
  - (3) 1.3 Presence System (COMPLETE)
  - (2) 2. WORK REQUIRED
  - (3) 2.1 Create React Hooks for Data Fetching
  - (3) 2.2 Wire UI Components to Hooks
  - (3) 2.3 Implement Team Chat (NEW WORK REQUIRED)
  - (3) 2.4 Implement Presence Heartbeat
  - (3) 2.5 Create Team Page Route
  - (3) 2.6 Implement Thread Voting System
  - (3) 2.7 Implement Polls
  - (3) 2.8 Role Mapping
  - (3) 2.9 Storage Buckets
  - (2) 3. IMPLEMENTATION ORDER
  - (3) Phase 1: Core Data Layer (1-2 days)
  - (3) Phase 2: Interactivity (1-2 days)
  - (3) Phase 3: Chat System (2-3 days)
  - (3) Phase 4: Presence System (1 day)
  - (3) Phase 5: Advanced Features (2-3 days)
  - (3) Phase 6: Polish (1-2 days)
  - (2) 4. TESTING CHECKLIST
  - (3) Authentication
  - (3) Feed
  - (3) Chat
  - (3) Live
  - (3) Members
  - (3) Settings
  - (2) 5. ENVIRONMENT VARIABLES
  - (2) 6. FILES TO CREATE/MODIFY
  - (3) New Files:
  - (3) Modify:
  - (2) 7. NOTES FOR BACKEND DEVELOPER
  - (2) 8. QUICK START FOR DEVELOPER

### Summary
This document specifies the complete work required to launch the Teams feature. The UI is complete (sandbox at /teams/sandbox ). The database schema and RPC functions exist (see migrations).

### Key Facts
- Team Home - Dashboard with presence strip, pinned announcement, momentum bar, content stack
- Team Feed - Posts, threads, polls, clips with Hot/New/Top sorting
- Team Chat - Discord-style messages with reactions, system messages, live jump buttons
- Team Live - Live room grid, scheduled events, Go Live CTA
- Team Members - Roster with search, filters (All/Live/Online), role grouping
- Team Settings - Role-gated settings (Leader/Core only)
- teams - Team metadata (name, slug, tag, description, icon, banner, theme, member counts)
- team_memberships - Member status/role (requested/approved/rejected/banned/left)
- team_bans - Ban records with expiry
- team_mutes - Mute records with scope (team_chat/team_live_chat/all)

## docs/UI_GOLDEN_RULES.md

- Source: docs\UI_GOLDEN_RULES.md
- Type: local
- Headings:
  - (1) UI Golden Rules
  - (2) 🚫 The "Never Do" List
  - (3) 1. Never Use Raw HTML Elements
  - (3) 2. Never Use Hex Colors or RGB
  - (3) 3. Never Use One-Off Spacing Values
  - (3) 4. Never Hardcode Modal Sizes
  - (3) 5. Never Skip PageShell
  - (2) ✅ The "Always Do" List
  - (3) 1. Always Use Design System Components
  - (3) 2. Always Use CSS Tokens
  - (3) 3. Always Choose the Right Shell
  - (3) 4. Always Use Page Patterns for Common Layouts
  - (3) 5. Always Match Skeleton Dimensions
  - (2) Modal Size Reference
  - (2) Spacing Scale Reference
  - (2) File Organization
  - (2) Enforcement
  - (2) Quick Reference Card

### Summary
MANDATORY guidelines for all UI development on MyLiveLinks. Violations will cause design drift and technical debt. Need

### Key Facts
- ❌ Raw <button> , <input> , <textarea> elements
- ❌ Hex colors (#xxx, #xxxxxx)
- ❌ One-off pixel values (px values not in token scale)
- ❌ Inline styles with hardcoded colors
- MANDATORY guidelines for all UI development on MyLiveLinks. Violations will cause design drift and technical debt.
- All modals are full-screen on mobile (< 640px).
- Run the drift detector before committing:
- This checks for:

## docs/navigation/route-inventory.md

- Source: docs\navigation\route-inventory.md
- Type: local
- Headings:
  - (1) Navigation Route Inventory
  - (2) Needs-Build / Missing Surface
  - (2) Classification Summary

### Summary
Source of truth for all Next.js App Router pages under /app . Each row includes the current purpose and where (if anywhere) the page should surface in navigation. Route

### Key Facts
- Purchases / Orders : Referenced in legacy user menu but no page exists yet. Keep disabled with “Coming soon” toast until implemented.
- Discover entry: No dedicated /discover route; rely on /trending + /link until product defines page.
- App Menu candidates: / , /feed , /trending , /liveTV , /teams , /leaderboards , /gifter-levels , /link , /search (overlay action), /policies , /policies/terms-of-service , /policies/privacy-policy .
- User Menu candidates: Profile ( /[username] ), /settings/profile , /settings/account , /settings/password , /wallet , /noties , /messages , /referrals , /me/analytics , /link/profile , /link/mutuals , /composer , /live/host , /logout .
- Deep-link only: Dynamic content surfaces such as /room/[slug] , /teams/[slug] , /composer/[projectId] , /link/*/swipe .
- Admin/Internal: /admin/* , /owner/* , /u/[username]/analytics , /ui-kit .
- System/Auth flows (never in menu): /login , /signup , /reset-password , /join , /oauth/consent , /onboarding .
- Source of truth for all Next.js App Router pages under /app . Each row includes the current purpose and where (if anywhere) the page should surface in navigation.
