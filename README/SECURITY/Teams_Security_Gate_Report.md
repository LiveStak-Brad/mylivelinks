# Teams Security Gate Report

This audit compares the canonical Teams Security Gate spec against the current repo (`c:\mylivelinks.com`) and the executable acceptance tests in `supabase/migrations/20260102_teams_security_gate_acceptance_tests.sql`.

## 1. Current Implementation Snapshot

| Area | What exists in repo today |
| --- | --- |
| Live rooms | `supabase/migrations/20260102_team_live_rooms_backend.sql` defines helper functions (`team_role_rank`, `team_is_approved_member`, `team_has_min_role`, `team_assert_ready`), tables `team_live_rooms` / `team_live_sessions`, chat column extensions, RLS policies, and SECURITY DEFINER RPCs (`rpc_get_team_live_rooms`, `rpc_get_team_live_now`, `rpc_start_team_live`, `rpc_end_team_live`, `rpc_validate_team_live_join`). |
| Team gifting | `supabase/migrations/20260102_team_pool_gifts.sql` defines `team_pool_gifts`, `team_pool_gift_splits`, select-only RLS policies, and SECURITY DEFINER RPCs `rpc_send_team_pool_gift` & `rpc_get_team_pool_status`. |
| Verification harness | `supabase/migrations/20260102_team_live_rooms_verification.sql` (scratch) exercises live-room RPCs and chat scoping. |
| Acceptance tests | New script `supabase/migrations/20260102_teams_security_gate_acceptance_tests.sql` codifies the gate checklist with PASS/FAIL/SKIP outputs (currently skips most feed/membership scenarios because schema objects are absent). |

Everything else referenced in the spec (team discovery, memberships, join requests, feed/posts, presence, audit, admin tooling, moderation queue, emotes, storage policies, ledger hardening) is not represented in the tracked migrations.

## 2. Gap Analysis

### P0 Blockers (must be fixed before merging any Teams backend PR)
1. `teams` table schema + RLS absent from migrations; functions assume it exists but it is not tracked.  
2. `team_members` table schema missing; without it, role/status checks (`team_is_approved_member`) have no persisted source of truth.  
3. `team_join_requests`, `team_audit_events`, `team_posts`, `team_comments`, `team_reactions`, `team_threads`, `team_thread_replies`, `team_presence`, `team_pool gift admin withdrawals`, `moderation_queue`, `team_emotes` tables are all absent.  
4. SECURITY DEFINER RPCs for membership approvals, join requests, role changes, presence snapshot, audit logging, admin panel operations do not exist.  
5. Helper assertions referenced by `rpc_send_team_pool_gift` (`rpc_assert_team_member_approved`, `rpc_assert_team_live_binding`, `rpc_get_active_team_members_snapshot`) are missing, so gifting currently fails closed and cannot satisfy the MUST rules.  
6. Ledger protections for team pool gifts rely on missing helper RPCs; idempotency path cannot run.  
7. No audit logging mechanism (`team_audit_events`) to record membership changes, gifting events, or live moderation actions.  
8. No RLS/permissions for discovery/home, feed, threads, presence, or gifts beyond the partial pool snapshot.  
9. No protections enforcing “last admin” or moderator escalation limits because there is no membership management RPC.  
10. Privacy/Data minimization matrix cannot be satisfied without roster, presence, and audit schemas.

### P1 Required Before Enabling Teams Feature Flag
1. Moderation queue schema + RLS for per-team enforcement.  
2. Storage + RLS for team identity assets/emotes/chat themes.  
3. Presence aggregation RPCs and TTL jobs tied to `team_presence`.  
4. Admin surfaces (panel tables/views) with RBAC gating, including rate-limited discovery endpoints.  
5. Member transparency toggles for pool gifts (optional policies currently commented out).  
6. Migration-backed seeding for helper functions to ensure `team_is_approved_member` cannot silently fail when schema mismatches.

### P2 Hardening / Nice-to-have (post-launch)
1. Rate-limiting slug discovery + join attempts (API/service layer).  
2. Additional telemetry/audit hooks for repeated failures (e.g., repeated forbidden errors).  
3. Automated anomaly detection on `team_pool_gifts` ledger entries.  
4. Storage bucket policies for team assets + signed URL expirations.  
5. Background jobs to prune stale live sessions/presence rows and emit audit events.

## 3. Acceptance Test Status

- Script path: `supabase/migrations/20260102_teams_security_gate_acceptance_tests.sql`.  
- Behavior: seeds fixture identities, runs live-room tests, and skips tables/RPCs that do not yet exist.  
- Current expected output: PASS for live-room RBAC + chat scoping; SKIP for feed/membership/presence/gifting tests citing missing objects.  
- Action: once missing tables land, extend the script (replace SKIP with concrete assertions) before merging.

## 4. Gate Verdict

**RESULT: FAIL (P0).**  
The repository lacks the foundational tables, RLS policies, SECURITY DEFINER RPCs, and audit controls mandated by the Teams Security Gate spec. Only the team live-room slice and partial gifting schema exist; every other surface is absent, so the acceptance tests cannot run and the PR cannot be approved. Ship the missing schema/RPC layers, re-run the SQL harness, and update this report to PASS once all P0 blockers are resolved.
