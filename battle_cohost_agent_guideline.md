# Battle + Cohost Agent Guideline

Purpose
- Provide a single, consistent implementation guide for the cohost/battle
  system across web and mobile.
- Ensure the system supports multiple hosts (up to 9 now, 12 later) without
  disconnects or invite dead-ends.
- Prevent duplicated or conflicting logic and RPC drift.

Scope
- Web app (Next.js) components and hooks
- API routes and LiveKit token gating
- Supabase schema, RPCs, and realtime
- Mobile app parity (React Native)

Current Architecture (what exists now)
Web
- UI entry points: SoloHostStream uses CoHostInviteModal and BattleInviteModal.
- Session state: useBattleSession (hooks/useBattleSession.ts) with realtime
  subscriptions to live_sessions, live_session_participants, battle_scores.
- Grid rendering: BattleGridWrapper and MultiHostGrid.
- Battle scoring: /api/battle/score, useBattleScores, battle_scores table.

Server
- LiveKit token gating: /app/api/livekit/token/route.ts.
- Battle APIs: /app/api/battle/start, /accept, /score, /boost.
- LiveKit webhook cleanup: /app/api/livekit/webhook/route.ts.

Database
- Core tables in supabase/migrations:
  - live_sessions, live_session_invites, battle_pool, battle_scores.
- Multi-host tables and updates exist only in /sql scripts:
  - live_session_participants and updated RPCs.

Mobile
- Host UI has placeholder Battle/CoHost sheets only (apps/mobile/components).
- No session logic, invites, or LiveKit room switching for cohost/battle.

Audit Findings (blockers and conflicts)
P0 Blockers
1) Room naming mismatch (web vs LiveKit token gate)
   - Client uses getSessionRoomName => "session_<id>" (lib/battle-session.ts).
   - Token gate only allows "battle_<id>" or "cohost_<id>"
     (app/api/livekit/token/route.ts).
   - Result: session rooms can be rejected outright.

2) Publish permission only checks host_a/host_b and status active/cooldown
   - LiveKit token gate does not check live_session_participants.
   - Extra cohosts (3rd, 4th, ...) cannot publish and may be dropped.
   - battle_ready/battle_active are not allowed by status gate, so battle
     transitions can block reconnects or new joins.

3) Status mismatch in battle APIs
   - /api/battle/score and /api/battle/boost only accept status "active".
   - New flow uses "battle_active".
   - Result: gifts and boosts can silently fail after battle starts.

4) Multi-host schema is not in migrations
   - live_session_participants and updated RPCs are only in /sql files.
   - If not applied, participants array is missing, and multi-host UI logic
     cannot function.

P1 Functional Gaps
5) Multi-host battle scoring is two-sided only
   - BattleSide is A/B only (types/battle.ts).
   - battle_scores stores points_a/points_b only.
   - /api/battle/score assigns side via host_a/host_b only.
   - Free-for-all (3+ participants) cannot score correctly.

6) Conflicting RPC definitions across scripts
   - rpc_send_invite, rpc_respond_to_invite, rpc_send_battle_invite_from_cohost,
     rpc_accept_battle_invite_from_cohost, rpc_get_active_session_for_host are
     defined in multiple files with different logic (migrations vs /sql).
   - Capacity limits differ (9 vs 12 vs none), invite cleanup differs (delete vs
     update).
   - The active logic depends on whichever SQL ran last.

7) Capacity mismatch in UI vs grid
   - CoHostInviteModal uses MAX_SLOTS = 12.
   - MultiHostGrid hard caps to 9 and slices participants.
   - Result: participants can join but never show.

8) Mobile is UI-only for cohost/battle
   - Mobile host sheets are placeholders; no invite or session flow.
   - Cross-platform parity does not exist yet.

P2 Cleanup / Unused
9) IncomingInviteSheet is unused
   - Not referenced anywhere; replaced by IncomingBattleRequestStack.

Root Cause for "3rd host kicked on battle start" (likely)
- When battle starts, session status changes to battle_ready or battle_active.
- LiveKit token gate only allows publish for host_a/host_b and status active or
  cooldown.
- Extra participants are blocked from publishing or reconnecting.
- Result: 3rd host loses publishing or is never allowed to join.

Decision Points (choose one path and standardize)
1) Room name strategy
   Option A: Use battle_<id> / cohost_<id> and change client to match.
   Option B: Use session_<id> for all phases and update token gate + webhook.
   Recommendation: Pick one and standardize everywhere (client, token gate,
   webhook, docs).

2) Battle start flow
   Option A: Invite-based battle start from cohost (existing /api/battle/start).
   Option B: Ready-up flow (rpc_start_battle_ready + rpc_set_battle_ready).
   Recommendation: Choose one, remove or hide the other.

3) Participant source of truth
   - live_session_participants should be the authoritative list for session
     membership and publish permissions.
   - host_a/host_b should be legacy only for backwards compatibility.

Implementation Guidelines (must follow)
Database
- Promote live_session_participants into official migrations.
- Update live_sessions status constraint to include:
  pending, active, battle_ready, battle_active, cooldown, ended.
- Ensure rpc_get_active_session_for_host returns participants and ready_states.
- Enforce a single capacity rule:
  - Now: max 9 participants (grid limit).
  - Future: max 12 participants (when 12-grid is ready).

LiveKit Token Gate
- Accept the chosen room name prefix (session_ or battle_/cohost_).
- Publish permission should check live_session_participants, not just host_a/b.
- Allow battle_ready and battle_active statuses for session publishes.
- Keep viewer tokens unrestricted (subscribe only).

APIs
- /api/battle/score and /api/battle/boost must accept battle_active.
- Side assignment must use live_session_participants if multi-host battle
  is supported. If not, enforce 1v1 only at battle start.

Client
- BattleGridWrapper should use the chosen battle start flow only.
- If battle is 1v1 only, block battle_ready for participant_count > 2.
- If multi-host battle is supported, update:
  - BattleSide type (A..I or dynamic teams)
  - battle_scores schema (JSON map or per-team rows)
  - BattleGridWrapper overlays and score UI for more than two teams.

Mobile Parity
- Implement useBattleSession-equivalent on mobile.
- Add invite flows and LiveKit room switching.
- Ensure mobile uses the same room naming and token flows as web.

Step-by-Step Fix Path (recommended order)
1) Pick room naming convention and update:
   - lib/battle-session getSessionRoomName
   - /api/livekit/token room gate
   - /api/livekit/webhook session room parsing
2) Promote multi-host schema and RPCs into migrations.
3) Update LiveKit publish gate to use live_session_participants and allow new
   statuses.
4) Normalize session statuses across client and server.
5) Decide battle start flow and delete or disable the other.
6) Set capacity to 9 everywhere (UI, RPCs, grid) until 12-grid is ready.
7) Add mobile implementation once web flow is stable.

Testing Checklist (minimum)
- Invite cohost (web): 2 users join, both publish, no disconnect.
- Add 3rd host to cohost: all 3 publish and show in grid.
- Start battle: no one disconnects, status transitions are visible.
- Gifts during battle: score updates on both sides.
- Cooldown ends: session persists and returns to cohost.
- Mobile: view a cohost session, verify no token gate failures.

Files to Review When Modifying
- lib/battle-session.ts
- hooks/useBattleSession.ts
- components/battle/BattleGridWrapper.tsx
- app/api/livekit/token/route.ts
- app/api/livekit/webhook/route.ts
- app/api/battle/score/route.ts
- app/api/battle/boost/route.ts
- supabase/migrations/*battle* and /sql/APPLY_* scripts
