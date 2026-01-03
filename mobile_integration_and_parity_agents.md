# 📱 MyLiveLinks — Mobile Integration & Parity

## Agent Execution Guide

## READ THIS FIRST (MANDATORY)

You are working on MyLiveLinks, a single platform with:

- Web app
- Mobile app (in progress)

These are NOT separate products.

All mobile work must match web behavior exactly.

If you do not understand the existing web behavior, stop and ask.

## 1. Core Rule (Non-Negotiable)

Web is the source of truth.
Mobile mirrors web logic 1:1.

You may:

- Adjust layout for mobile
- Use drawers, sheets, stacking
- Optimize for touch

You may NOT:

- Change logic
- Invent new rules
- Remove features
- “Simplify” behavior

If web has it → mobile must have it
If web doesn’t have it → do NOT add it

## 2. Shared Backend (DO NOT DUPLICATE)

All agents must use:

- Same Supabase database
- Same tables
- Same RPCs
- Same RLS policies
- Same LiveKit rooms
- Same monetization ledger

❌ No mobile-only tables
❌ No mobile-only endpoints
❌ No mobile-only business logic

## 3. Live Streaming Rules (CRITICAL)

Live = Highest Priority Feature

Mobile live screens must:

- Look the same as web
- Behave the same as web
- Use the same stream IDs
- Use the same permissions

You are allowed to:

- Stack UI vertically
- Use modals/sheets
- Resize elements

You are NOT allowed to:

- Remove chat
- Remove gifts
- Remove stats
- Change who can publish/view
- Change stream lifecycle

## 4. Navigation Rules

### Bottom Navigation (Mobile)

- Icons only (no text)
- 6 items total
- Similar density to Facebook
- Must not block content

### Top Bar

- Icons only
- Contextual actions
- No duplicate navigation

If a button is hidden, blocked, or unreachable → bug

## 5. Domains & Scope (VERY IMPORTANT)

You will be assigned one domain only.

Examples:

- Mobile Live Viewer
- Mobile Live Host
- Feed
- Messaging
- Teams
- Profiles
- Link / Dating
- Notifications

Rules:

- Do NOT touch other domains
- Do NOT refactor shared components
- Do NOT “fix” things outside your scope

If something blocks you:

➡️ Document it
➡️ Ask before proceeding

## 6. Messaging Rules

### Teens (13–17)

- Text only
- Teen-to-teen only
- No gifts
- No calls
- No video
- No adult interaction

### Adults (18+)

- Full features (as enabled)
- Future voice/video is gated
- Monetization allowed

If you see cross-age access → stop immediately

## 7. Teams (When You Touch Them)

Teams are:

- Creator-owned communities
- Active-member focused
- Not generic groups

Teams must support:

- Team feed (FB-style)
- Team chat (Discord-style)
- Threads (Reddit-style)
- Team badges in live
- Team-only lives
- Admin / Moderator roles

Do NOT:

- Reuse global chat
- Reuse profile feed
- Remove permissions

## 8. Safety & Compliance

Every surface must support:

- Block
- Report
- Mute

Dating surfaces must include:

- Safety disclaimer
- Opt-in only
- No explicit language

If you are unsure → ask Compliance Manager.

## 9. Analytics Expectations

Your feature must:

- Emit meaningful events
- Not silently fail
- Not break live metrics

If something “works visually” but doesn’t track → not done

## 10. How to Work (MANDATORY PROCESS)

Before coding:

- Identify the web equivalent
- Confirm source of truth (table/RPC)
- Confirm permissions
- Confirm UI parity

During work:

- One task only
- Small commits
- Clear comments

After work:

- Verify behavior matches web
- No regressions
- No broken nav
- No hidden buttons

## 11. When to STOP and ASK

You MUST stop if:

- You don’t know which table to use
- You don’t know which RPC to call
- You see multiple similar systems
- You feel tempted to “just add a workaround”

Stopping is correct behavior.

## 12. Definition of Done

A task is DONE when:

- Mobile behavior matches web
- UI is reachable and touch-safe
- Data is correct
- Permissions are correct
- No unrelated changes were made

## Final Reminder

This app is being built to scale.

Bad shortcuts now = painful rewrites later.

If you’re unsure:

➡️ Ask
➡️ Document
➡️ Wait for confirmation

End of Agent Guide
