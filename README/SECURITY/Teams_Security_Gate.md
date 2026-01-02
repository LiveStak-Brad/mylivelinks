# Teams Security Gate

This document is the canonical security/RLS contract for the Teams backend. It pairs the authoritative spec (verbatim) with implementation-ready checklists, mappings to current repo objects, and verification instructions.

---

## 0. Authoritative Security Gate Spec (Verbatim)

```
## Teams Security Gate (RLS/RBAC Audit Artifact)

### 1) Threat Model (Teams)
- **Non-member:** Attempts to read team-only data, enumerate teams, or spam join requests.  
- **Requested-but-not-approved:** Seeks premature access to content, roster, or presence; may spam or replay requests.  
- **Member:** Legitimate but may scrape data, abuse gifting pool, or leak private content.  
- **Moderator:** Elevated actions (ban/mute, approve) could be abused for privilege escalation or censorship beyond scope.  
- **Admin:** Full control; risk is compromised admin accounts demoting others or draining pools.  
- **Banned user:** Attempts re-entry, data access, or revenge (gift fraud, spam).  
- **Compromised client:** Authenticated but malicious; must not bypass server enforcement.  
- **Assets:** `team_membership roster`, `private feed + threads`, `team live rooms + chat`, `team pool gift splits + ledger impact`, `presence snapshots`, `audit logs (for forensics)`.

### 2) Canonical Access Rules (LOCKED “MUST” Statements)
A) **Team discovery + home**  
- Must expose only: team name, slug, avatar, public stats (member count), join policy.  
- Must hide: feed content, presence roster, pool balances, audit trail until membership approved.  
- Must rate-limit non-member discovery to prevent enumeration.

B) **Membership requests + approvals**  
- Must require auth.uid().  
- Must allow `INSERT` join request only once per user/team until resolved.  
- Must allow approvals/denials solely by team admins/mods (mods cannot add admins).  
- Must auto-link approvals into `team_members` with `status='approved'` and role derived from approver action.  
- Must log every state change in `team_audit_events`.

C) **Team feed posts/comments/reactions**  
- Must allow read/write only for approved members.  
- Must enforce per-row `team_id` binding between content tables and user membership.  
- Must prevent cross-team ID reuse (no selecting by guessed post UUID).  
- Must hide deleted/flagged posts unless admin/mod.  
- Must limit reaction insert/update to once per user per post.

D) **Threads + replies**  
- Same membership scope as feed; replies must inherit parent `team_id`.  
- Must prohibit editing/deleting others’ content except moderators/admins.  
- Must ensure pagination queries filter by membership first, then team_id.

E) **Team live rooms (live_streams)**  
- Must require team-approved membership for viewing/participating.  
- Must bind `live_streams.team_id` to team membership; no generic stream IDs.  
- Must restrict chat send/receive to members; moderators can mute.  
- Must ensure non-members cannot discover stream metadata beyond “team live happening” flag (optional).  
- Must enforce LiveKit/LV tokens minted via SECURITY DEFINER RPC that validates team membership and ban status.

F) **Team identity & chat style**  
- Must allow viewing of theme/styling only to members, except minimal branding on discovery page.  
- Must restrict edits to admins (mods may adjust limited settings if explicitly allowed).  
- Must ensure style assets (images, emotes) live in private storage bucket with signed URLs scoped per member.

G) **Team pool gifts (active snapshot + ledger)**  
- Must require approved membership to contribute.  
- Must ensure creator share, team pool share computed server-side; client cannot set amounts.  
- Must record ledger entries via SECURITY DEFINER RPC verifying request_id uniqueness, membership, ban status, and balance sufficiency.  
- Must allow only admins/mods to withdraw team pool or disburse; log all transfers.  
- Must prevent non-members from viewing detailed pool contributions; allow aggregate balance only if policy states.

H) **Admin panel capabilities**  
- Must be accessible only to admins; moderators get a reduced subset.  
- Must require fresh auth (re-check role per request).  
- Must deny moderators from changing admin roles or deleting team.  
- Must ensure admin demotion is only possible by another admin; last admin cannot demote self without assigning successor.

I) **Audit visibility + retention**  
- Must record join events, role changes, bans, gifting transactions, live-room moderation.  
- Must make audit logs readable only by admins (mods can read moderation events relevant to them).  
- Must retain immutable history; deletions require security review RPC that only admins can trigger and writes to an append-only ledger.

### 3) Required RLS Policy Shapes (Table-by-Table Checklist)
(Use PostgreSQL RLS semantics; `auth.uid()` is the session user ID. Assume `team_members` has `user_id`, `team_id`, `status`, `role`.)

**Table: `teams`**  
- SELECT: allow all auth users to read public metadata columns. Deny anon. Hide sensitive columns (invite code, private settings) via column-level policies or security definer views (only members).  
- INSERT: admins via controlled RPC only. No direct client insert.  
- UPDATE: only admins of that team; require check `auth.uid()` is admin row in `team_members`.  
- DELETE: owner-only via RPC with double confirmation.  
- Security definer RPC notes: ensure creation binds creator as admin and seeds audit.

**`team_members` (status: requested/approved/banned/left)**  
- SELECT: user can view their own row plus rows of approved members if they’re approved; allow admins to view all statuses.  
- INSERT: only via join approval RPC (non-members insert `requested` for themselves).  
- UPDATE: status/role changes only by admins/mods; role elevating to admin limited to admins. Users can update preferences on their own membership row only (via column-specific policy).  
- DELETE: members can remove themselves; admins can remove others. Banned cannot delete.  
- RPC: enforce idempotent request handling; check duplicates.

**`team_join_requests`**  
- SELECT: requester can see their own pending request; admins/mods can see all for their team.  
- INSERT: any authed user once per team until resolved.  
- UPDATE: only admins/mods to approve/deny (status + notes).  
- DELETE: requester can cancel; admins can purge processed requests.  
- RPC: when approving, must transactionally insert into `team_members` and delete request.

**`team_roles` (if separate)**  
- SELECT: limited to admins.  
- INSERT/UPDATE/DELETE: only admin RPC; no direct client access.  
- RPC: enforce canonical role set (admin/mod/member) and non-empty admin set.

**`team_posts`, `team_comments`, `team_reactions`**  
- SELECT: require membership; join on `team_members` with `status='approved'`. Moderators/admins can read flagged content.  
- INSERT: allowed for approved members; check `auth.uid()` not muted/banned.  
- UPDATE: only creator for edit window; moderators/admins beyond that.  
- DELETE: creator (soft delete) or moderators/admins.  
- RPC: reaction toggles must ensure unique `(post_id, user_id)`; apply row-level locking.

**`team_threads`, `team_thread_replies`**  
- Same as feed; include parent-binding check (reply must reference thread with same team_id).  
- SELECT: membership filter.  
- INSERT: approved members.  
- UPDATE/DELETE: author or moderator/admin.  
- RPC: thread creation ensures `team_id` binding from parent post if thread is derived.

**`team_live_rooms` (live stream metadata)**  
- SELECT: approved members; optionally show minimal status to non-members if team flagged as discoverable (only `team_id` + `live_now`).  
- INSERT/UPDATE: only admins or authorized live producers via RPC; must verify `live_streams` row belongs to team.  
- DELETE: admins end stream; auto-clean when live ends.  
- RPC: token minting must assert `auth.uid()` is approved member and not banned/muted; map `live_stream_id` to team_id.

**`team_presence` (heartbeats)**  
- SELECT: only admins/mods can query raw rows; members may read aggregated counts but never full roster.  
- INSERT/UPDATE: approved members only; TTL enforced server-side.  
- DELETE: automatic TTL purge; manual delete admin-only.  
- RPC: presence snapshot exposures must aggregate counts, not raw data.

**`team_pool_gifts`, `team_pool_gift_splits`**  
- SELECT: contributors can view their own contributions; admins can view full details; members see aggregate totals only (via view).  
- INSERT: via SECURITY DEFINER gifting RPC after membership + balance checks.  
- UPDATE: only system (e.g., marking fulfilled) via RPC.  
- DELETE: never direct; archival only.  
- RPC: enforce request_id uniqueness, ledger linking, team_id binding, creator share vs pool share formulas.

**`moderation_queue` (team scoped)**  
- SELECT: moderators/admins only.  
- INSERT: triggered automatically when flagged content arrives.  
- UPDATE: assigned moderator can resolve; admins override.  
- DELETE: admins only after resolution.  
- RPC: ensures queue entries link to content rows with same team_id.

**`team_emotes`**  
- SELECT: members only; non-members see none.  
- INSERT/UPDATE/DELETE: admins or designated asset managers.  
- RPC: asset upload ensures storage path uses team namespace and signed URLs.

**`team_audit_events`**  
- SELECT: admins; optionally compliance role.  
- INSERT: SECURITY DEFINER triggers only; no client writes.  
- DELETE: never; retention enforced.

### 4) SECURITY DEFINER RPC RULES (Mandatory Assertions)
- `auth.uid()` MUST exist; reject anon or service role without explicit allow list.  
- Assert `team_id` parameter is bound to caller’s approved membership (status check).  
- For role-gated actions, assert `role IN ('admin','moderator')` as required; moderators cannot escalate roles or transfer ownership.  
- For live-stream actions, verify `live_streams.team_id = team_id` before issuing tokens or commands.  
- Before any action, check `team_members.status != 'banned'` and `ban_expires_at` if applies.  
- For gifting/pool transfers, require unique `request_id`, confirm ledger entries inserted within same transaction, and take advisory lock on `(team_id, request_id)` to ensure idempotency.  
- For presence updates, enforce TTL and membership check; drop stale rows before insert to prevent spoofed rosters.  
- Always `RAISE EXCEPTION` on failure; never silently ignore invalid input.  
- Log security-sensitive attempts into `team_audit_events`.

### 5) Privacy / Data Minimization
- **Non-members can see:** team name, slug, avatar, public description, member count range, discovery tags, whether team accepts requests.  
- **Non-members cannot see:** detailed roster, posts, threads, live chat, gifting balances, presence roster, audit logs.  
- **Members can see:** full feed, thread content, live chat, aggregate team pool totals, list of online members only if team opts in (default off).  
- **Only admins/mods can see:** pending requests, banned list, detailed presence logs, audit events, gifting contribution breakdowns, moderation queue.  
- **Presence roster exposure:** never show raw data outside admin tools; aggregated counts only for members.  
- **Profiles interaction:** when showing member card, fetch via RLS view exposing limited fields (display name, avatar, verified badge). No contact info or cross-team data.

### 6) Abuse / Fraud Scenarios (Top 12 + Mitigation)
1. **Forging membership approval:** Require admin/mod role check; store `approved_by` and log event.  
2. **Role escalation by moderator:** Policy forbids moderators from assigning admin role; RPC asserts `role='admin'` for admin promotions.  
3. **Gifting split manipulation:** Amounts computed server-side; RPC ignores client-sent splits; ledger cross-check ensures sums match pack value.  
4. **Presence spoofing to farm rewards:** Require approved membership, unique session keys, TTL enforcement, and audit unusual heartbeat frequency.  
5. **Replay `request_id` for double credit:** Unique constraint on `request_id`; RPC uses advisory lock and idempotent insert.  
6. **Scraping membership list by non-member:** RLS denies roster SELECT; discovery endpoints return counts only.  
7. **Enumerating team slugs to probe privacy:** Rate-limit slug lookups; only minimal metadata returned; fail closed on private teams.  
8. **Posting as another user:** INSERT uses `auth.uid()` only; server ignores `user_id` input.  
9. **Moderator banning admin:** RLS and RPC forbid moderators altering admin roles or banning admins; escalate to admin-only action.  
10. **Demoting last admin:** RPC checks there will remain ≥1 admin; prevents self-demotion without successor.  
11. **Leaking live chat via RPC:** Chat fetch RPC requires membership and team_id binding; logs every download; tokens expire quickly.  
12. **Ledger tampering via direct insert:** Deny INSERT on ledger tables; only SECURITY DEFINER RPC writes after validating membership, pack price, and balances.

Detection: audit logs record actor, target, context; anomaly jobs flag repeated failures, large gift transfers, role churn. Prevention: strict RLS, RPC assertions, advisory locks, unique constraints, per-team rate limits.

### 7) Acceptance Tests (Executable SQL Test Plan)
_Prepare fixtures:_  
- Users: `admin_user`, `mod_user`, `member_user`, `request_user`, `banned_user`, `non_member`.  
- Team `T1` with statuses: admin, mod, approved member, banned.  
- Live stream `L1` linked to `T1`.  
- Pool gift entries & ledger rows.

_Test matrix (examples)_  
1. **Team discovery:**  
   - `SET ROLE authenticated;` `SELECT * FROM teams WHERE id=T1;` expect minimal columns for `non_member`.  
   - Attempt to fetch hidden columns -> expect error.  
2. **Join request:**  
   - `INSERT INTO team_join_requests(team_id, user_id)` as `request_user` once -> success.  
   - Second insert -> unique violation.  
3. **Approve request:**  
   - As `mod_user`, call `approve_request(T1, request_user)` -> inserts membership status=approved, role=member.  
   - As member, same RPC -> expect permission error.  
4. **Feed read/write:**  
   - `SELECT * FROM team_posts WHERE team_id=T1;` as `non_member` -> deny.  
   - As `member_user` -> rows visible.  
   - Insert post as `member_user` -> success; as `request_user` (pending) -> deny.  
5. **Threads:**  
   - Reply referencing post from another team -> RPC rejects mismatched `team_id`.  
6. **Live room token:**  
   - As `member_user`, call `mint_team_live_token(T1, L1)` -> success.  
   - As `non_member` or banned -> reject.  
7. **Presence query:**  
   - `SELECT * FROM team_presence WHERE team_id=T1;` as `member_user` -> deny; as `admin_user` -> allowed.  
8. **Team pool gift:**  
   - Call `team_pool_gift_purchase(T1, pack_id, request_id='abc')` as member -> success.  
   - Replay same request -> no duplicate ledger entries (check counts).  
   - Attempt with fabricated split -> RPC ignores client values.  
9. **Role escalation:**  
   - Moderator tries `promote_to_admin(T1, member_user)` -> reject.  
10. **Admin demotion:**  
    - Admin attempts to demote self when only admin -> reject.  
11. **Audit visibility:**  
    - `SELECT * FROM team_audit_events` as member -> deny; as admin -> allowed.  
12. **Moderation queue:**  
    - Member selects queue -> deny; moderator -> allowed.  
13. **Emotes storage:**  
    - Non-member fetch -> deny.  
14. **Ledger direct insert:**  
    - `INSERT INTO ledger_entries ...` as client -> deny via RLS.  
15. **Team presence spoof:**  
    - `INSERT INTO team_presence` as non-member -> deny; as member -> success with TTL enforced (check expiry job).  

Document expected PASS/FAIL outcome for each step before approving PR.

### 8) PR Review Gate (PASS/FAIL Blockers — any failure rejects PR)
1. Any team-private table SELECTable by non-members.  
2. Membership approvals executable by non-admin/mod.  
3. Moderator able to grant admin role.  
4. Team pool gift RPC missing request_id uniqueness enforcement.  
5. Presence table readable by regular members or non-members.  
6. Live stream tokens minted without verifying team membership.  
7. `team_members` updates allow changing `user_id`/`team_id` directly from client.  
8. Gifting RPC accepts client-provided split or amount without server validation.  
9. Ledger tables (or `ledger_entries`) allow client INSERT/UPDATE.  
10. `team_posts`/`threads` allow cross-team access by guessing IDs.  
11. `team_join_requests` readable globally (leaks roster).  
12. Banned users able to rejoin or access content due to missing status checks.  
13. Audit logs missing or writable by non-system roles.  
14. No enforcement that at least one admin remains.  
15. Live chat history fetch RPC does not confirm team membership per request.  
16. Team presence API exposes raw roster to non-admin roles.  
17. Moderation queue operations lack role checks per action.  
18. Team emote storage accessible without signed URLs/membership checks.  
19. `team_pool_gift_splits` deletable by contributors (should be immutable).  
20. SECURITY DEFINER RPCs fail to raise explicit errors on invalid state (silent no-op).  
```

---

## 1. Implementation Checklist Overview

- Treat the spec above as a contract. Every “MUST” item is mandatory and is translated below into reviewable checks.  
- When implementing Teams backend features, link PR diffs back to the relevant checklist entries to prove compliance.  
- Use the SQL harness at `supabase/migrations/20260102_teams_security_gate_acceptance_tests.sql` for automated PASS/FAIL feedback; extend it when new tables ship.

---

## 2. Threat Model Alignment

| Actor | Capabilities to enforce | Review Focus |
| --- | --- | --- |
| Non-member / requested | Only discovery metadata; zero access to content, roster, presence, gifts | Verify RLS denies `SELECT` on every team-scoped table when `auth.uid()` lacks approved membership |
| Member | Normal posting, gifting, viewing aggregates | Ensure RLS filters by `team_members.status='approved'`; check RPC uses `team_is_approved_member` |
| Moderator | Same as member plus moderation actions (approve/deny, mute, remove content) | Confirm RPCs enforce `team_has_min_role(...,'moderator')` and cannot escalate to admin |
| Admin | Full team management within team boundary | Ensure admin RPCs always log to `team_audit_events` and respect “last admin” rule |
| Banned user | Cannot read/write anything team-scoped | All tables’ policies must filter `status<>'banned'`; RPCs must explicitly check ban lists |
| Compromised client | Authenticated but malicious | All mutating endpoints must be SECURITY DEFINER RPCs with idempotency + validation |

---

## 3. Canonical MUST Rules → Checkable Interpretation

| Surface | Locked Rules (from spec) | How to verify |
| --- | --- | --- |
| Team discovery/home | Non-members only see slug/name/avatar/aggregate stats | RLS on `teams` should expose limited columns via view; acceptance test `T01` (non-member discovery) |
| Membership lifecycle | Auth required, single pending request, approvals logged | Ensure `team_join_requests` table + unique `(team_id,user_id)` + triggers writing to `team_audit_events` |
| Feed/posts/comments/reactions | Approved members only, cross-team binding, moderation override | RLS join with `team_members`; test `T04`/`T05` |
| Threads & replies | Same as feed; parent binding enforcement | Constraint forcing `team_id` equality + RLS |
| Live rooms & chat | Membership gating, role thresholds for go-live, tokens minted via RPC | `team_live_rooms` policies + RPC assertions; tests `T06` + chat policy checks |
| Identity + chat style | Branding visible to members, admin-only edits | Storage bucket policies + `team_emotes`/style tables RLS |
| Team pool gifts | Only approved members contribute, idempotent, server-calculated splits | `rpc_send_team_pool_gift` enforcement + ledger verification + acceptance test `T08` |
| Admin panel | Admin-only surface, moderators limited | RLS on admin tables + RPC checks for “last admin” |
| Audit logs | Append-only, admin-readable | Table `team_audit_events` with RLS + triggers |

---

## 4. Table-by-Table RLS Checklist & Repo Mapping

Each entry summarizes required policies plus the current repo state (as of this audit). “Status” describes whether the object exists in-mono; gaps must be closed before PASS.

### `teams`
- **Spec requirements:** Authenticated discovery view only; CRUD via admin RPC.
- **Repo status:** `public.teams` table not defined anywhere in repo migrations. Treated as P0 blocker.  
- **Verification:** `SELECT to_regclass('public.teams');` should not be `NULL`. RLS policies must exist in `pg_policies`.

### `team_members`
- **Spec requirements:** Status + role columns enforced by RLS; only admins/mods manage roles.
- **Repo status:** Table definition absent; functions (`team_is_approved_member`) assume it exists, but no schema tracked. P0.  
- **Verification:** `SELECT attname FROM pg_attribute WHERE attrelid='public.team_members'::regclass;` should show `role` + `status`.

### `team_join_requests`
- **Spec requirements:** Unique pending request per user/team; admin/mod review only.
- **Repo status:** Missing. P0.  
- **Verification:** Table + RLS policies + SECURITY DEFINER approval RPC.

### `team_roles` (if separate)  
- **Spec requirements:** Admin-only management of canonical role set.  
- **Repo status:** Missing. P2 unless architecture requires dedicated table.

### `team_posts` / `team_comments` / `team_reactions`
- **Spec requirements:** Strict membership filtering; cross-team access impossible.  
- **Repo status:** Missing tables/policies. P0 for delivering feed.  
- **Verification:** Add `USING` policies referencing `team_members`. Acceptance tests `T04`.

### `team_threads` / `team_thread_replies`
- **Spec requirements:** Same as feed + parent binding.  
- **Repo status:** Missing. P1 (needed before enabling threads).

### `team_live_rooms` & `team_live_sessions`
- **Spec requirements:** Membership-gated SELECT; moderators start/stop lives; security-definer RPC tokens.  
- **Repo status:** Implemented in `supabase/migrations/20260102_team_live_rooms_backend.sql` with RLS policies and RPCs (`rpc_get_team_live_rooms`, `rpc_start_team_live`, etc.). Need verification that membership table exists.  
- **Verification:** Acceptance tests `T06`, `T07`, `T10` once memberships wired. Ensure policies reference `team_is_approved_member`.

### `team_presence`
- **Spec requirements:** Admin/mod-only raw rows; aggregated stats only for members.  
- **Repo status:** Table not present. P0 for go-live gating.  
- **Verification:** Table + TTL enforcement function + aggregated view.

### `team_pool_gifts` / `team_pool_gift_splits`
- **Spec requirements:** Insert-only via RPC; select limited to gifter/recipient/admin; idempotency and ledger checks.  
- **Repo status:** Implemented in `supabase/migrations/20260102_team_pool_gifts.sql`. RLS currently allows only admins + individual owners (optional member policy commented out). RPC references missing helper assertions (`rpc_assert_team_member_approved`, `rpc_assert_team_live_binding`, `rpc_get_active_team_members_snapshot`). These functions must be added.  
- **Verification:** Acceptance test `T08` once helper RPCs ship; confirm indexes + unique request_id enforced.

### `moderation_queue`
- **Spec requirements:** Admin/mod only; tracks per-team actions.  
- **Repo status:** Missing. P1 (needed when moderation UI lands).

### `team_emotes` / theme assets
- **Spec requirements:** Storage-level ACL + RLS restricting SELECT to members.  
- **Repo status:** Missing. P2 until theming backend exists.

### `team_audit_events`
- **Spec requirements:** Append-only log referenced by every privileged action.  
- **Repo status:** Missing. P0 because auditability is part of gate.

---

## 5. SECURITY DEFINER RPC Assertions & Enforcement Points

| RPC / Function | Spec-mandated assertions | Where to enforce |
| --- | --- | --- |
| `rpc_get_team_live_rooms`, `rpc_get_team_live_now`, `rpc_start_team_live`, `rpc_end_team_live`, `rpc_validate_team_live_join` | `auth.uid()` required, membership check, optional role thresholds, team/live binding, `forbidden` errors | Already implemented in `20260102_team_live_rooms_backend.sql`; review for dependency on real `team_members` data before go-live |
| `rpc_send_team_pool_gift` | `auth.uid()` required, membership + team-live binding asserts, advisory lock per request_id, ledger verification, fail-closed on missing helpers | Implemented but currently depends on undefined helper RPCs; add them plus audit logging before acceptance |
| Membership/admin RPCs (join approval, role management, team creation) | Must exist; include ban check, last-admin protection, audit logging | Not in repo → create new SECURITY DEFINER functions consistent with spec |
| Presence snapshot RPCs | Aggregate output only, TTL enforcement, membership gating | Missing; add `rpc_get_active_team_members_snapshot` and call from gating tests |
| Audit log writers | Every privileged action writes to `team_audit_events` via SECURITY DEFINER triggers | Table + triggers missing; add before enabling Teams |

When reviewing PRs, ensure every SECURITY DEFINER function explicitly calls the relevant assertion helper (`team_assert_ready`, `team_is_approved_member`, etc.) and raises clear errors on failure.

---

## 6. Privacy & Data Minimization Matrix

| Data Surface | Non-member | Pending/requested | Approved member | Moderator | Admin |
| --- | --- | --- | --- | --- | --- |
| Team name/slug/avatar | ✅ | ✅ | ✅ | ✅ | ✅ |
| Member roster (full) | ❌ | ❌ | Optional (default ❌) | ✅ | ✅ |
| Feed/posts/comments | ❌ | ❌ | ✅ | ✅ | ✅ |
| Threads/replies | ❌ | ❌ | ✅ | ✅ | ✅ |
| Live room list & chat | ❌ | ❌ | ✅ | ✅ | ✅ |
| Presence roster | ❌ | ❌ | Aggregated counts only (if enabled) | ✅ (raw) | ✅ (raw) |
| Pool gift totals | ❌ | ❌ | Aggregate only | ✅ (detailed) | ✅ (detailed) |
| Pool gift splits | ❌ | ❌ | ❌ | ✅ | ✅ |
| Membership requests queue | ❌ | Own request only | Own request only | ✅ | ✅ |
| Audit log | ❌ | ❌ | ❌ | Moderate-scope entries | ✅ full |

Legend: ✅ allowed, ❌ denied. Use this table when reviewing new policies or endpoints.

---

## 7. Abuse/Fraud Scenario Tracker

| # | Scenario | Required control | Control type | Implementation pointer |
| --- | --- | --- | --- | --- |
| 1 | Forged approvals | Only admins/mods mutate membership; audit `approved_by` | RPC + `team_audit_events` | Missing (P0) |
| 2 | Moderator escalates to admin | Role change RPC enforces `actor_role='admin'` | RPC | Missing (P0) |
| 3 | Gift split tampering | RPC ignores client splits + ledger cross-check | RPC + constraints | Partial via `rpc_send_team_pool_gift`; helper asserts missing |
| 4 | Presence farming | TTL + dedupe + anomaly alerts | Table + RPC | Missing (P0) |
| 5 | `request_id` replay | Unique constraint + advisory lock | Table + RPC | Implemented in `team_pool_gifts` |
| 6 | Roster scraping | RLS denies roster tables | RLS | Not possible yet (no roster table) |
| 7 | Team slug enumeration | Rate limiting + minimal response | API middleware | TODO in API layer |
| 8 | Impersonation posting | Server overwrites `user_id` via `auth.uid()` | RLS + triggers | Ensure feed RPC uses `auth.uid()` directly |
| 9 | Moderator bans admin | RLS ensures only admins change admin roles | RPC | Missing (P0) |
|10 | Last admin demotion | RPC rejects if resulting admin count < 1 | RPC | Missing (P0) |
|11 | Live chat leakage | Chat fetch RPC checks membership | RLS + RPC | `chat_messages` policy partially covers team live scope |
|12 | Ledger tampering | Deny DML outside RPC | RLS on `ledger_entries` + DB grants | Confirm `ledger_entries` denies `authenticated`

---

## 8. Acceptance Test Harness

- File: `supabase/migrations/20260102_teams_security_gate_acceptance_tests.sql`.  
- Behavior:
  - Runs in one transaction and ends with `ROLLBACK`.  
  - Seeds fixture users + team only if schemas exist; otherwise prints `SKIP:` notices with explanations.  
  - Simulates auth context via `set_config('request.jwt.claim.sub', ...)`.  
  - Emits `PASS:` / `FAIL:` per test case following the matrix above (with `SKIP:` when dependency missing).  
  - Extend the script whenever new tables become available; never remove existing tests (mark them SKIP until implementable).
- Usage: copy the script into Supabase SQL editor or run via `psql -f`, inspect output, and block PRs that print any `FAIL`.

---

## 9. PR Review Gate (Blocker List + How to Test)

| Blocker | How to test | Status today |
| --- | --- | --- |
| Team-private content readable by anon/non-member | Run acceptance test `T04/T05` once feed tables exist | Blocked (tables missing) |
| Non-admin able to approve membership | Inspect membership RPC + test `T03` | Blocked (RPC missing) |
| Moderator grants admin | Attempt role change RPC as moderator | Blocked |
| Pool gift RPC missing request_id uniqueness | Check constraint + rerun `T08` with duplicate request_id | Pass (constraint exists) |
| Presence table readable by members | Query `team_presence` as member | Blocked (table missing → treat as FAIL) |
| Live tokens minted without membership check | Review `rpc_start_team_live` & `rpc_validate_team_live_join`; run tests once membership table exists | Pending verification |
| Client can mutate `team_members.user_id`/`team_id` | Ensure no direct grants; acceptance test once table tracked | Blocked |
| Gifting RPC accepts client-provided split | Confirm RPC ignores input; already implemented | Pass |
| Ledger entries writable by clients | Check grants (`ALTER DEFAULT PRIVILEGES`) and enforce via tests | Pending verification |
| Cross-team feed reads possible | Attempt ID-guessing queries; acceptance tests | Blocked |
| Join requests leak roster | RLS on `team_join_requests`; acceptance tests | Blocked |
| Banned users retain access | Ensure `status='banned'` filter present across policies | Blocked |
| Missing audit logs | Confirm `team_audit_events` exists + write triggers | Blocked |
| Last admin demotion allowed | Attempt demote self in RPC | Blocked |
| Live chat history RPC missing membership guard | Check `chat_messages` policy + tests | Partially covered |
| Presence roster exposed | `team_presence` view design | Blocked |
| Moderation queue unrestricted | RLS + RPC once table exists | Blocked |
| Team emote storage unprotected | Storage policy review | Blocked |
| Team pool split rows mutable | RLS ensures no UPDATE/DELETE | Need to verify grants |
| SECURITY DEFINER RPCs swallow errors | Review functions for explicit `RAISE EXCEPTION` | Partially covered in live/gift RPCs |

Gate result is PASS only when every blocker row is verified by code + tests.

---

## 10. Repo Object Inventory (as of audit)

- `supabase/migrations/20260102_team_live_rooms_backend.sql` — defines helper functions (`team_role_rank`, `team_is_approved_member`, `team_has_min_role`, etc.), tables `team_live_rooms`, `team_live_sessions`, updates `chat_messages`, and creates RPCs for team live.  
- `supabase/migrations/20260102_team_pool_gifts.sql` — creates `team_pool_gifts`, `team_pool_gift_splits`, RLS policies, and SECURITY DEFINER RPC `rpc_send_team_pool_gift` / `rpc_get_team_pool_status`.  
- `supabase/migrations/20260102_team_live_rooms_verification.sql` — scratch verification script; not a migration but demonstrates expected schema.

Everything else in the spec (team discovery, memberships, threads, presence, audit, moderation, identity) is not yet represented in the repo and is therefore a gating gap.

---

**Action**: Keep this document in sync with implementation progress. Whenever a table/RPC ships, update the checklist, add verification steps, and extend the acceptance tests so that the Teams Security Gate stays enforceable.
