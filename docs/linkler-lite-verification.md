# Linkler Lite Verification Commands

All endpoints run under the Next.js dev server (`npm run dev`) on `http://localhost:3000`. The support + moderation routes require a valid Supabase session token; grab one from `localStorage.getItem('sb-access-token')` in an authenticated browser tab or issue a service token for testing.

## 1. Connectivity Smoke Test

```bash
curl -s http://localhost:3000/api/ai/ping | jq
# target a specific model
curl -s "http://localhost:3000/api/ai/ping?model=llama3.3:latest" | jq
```

**Expected (example):**

```json
{
  "ok": true,
  "model": "llama3.3:latest",
  "ms": 842,
  "error": null
}
```

If Ollama is offline you’ll see `ok: false` with `error: "Ollama request timed out"`.

## 2. Support Intake Ticket

```bash
curl -s -X POST http://localhost:3000/api/support/intake \
  -H "Authorization: Bearer <SUPABASE_SESSION_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My showcase page is stuck on loading.",
    "context": { "screen": "profile", "browser": "edge" }
  }' | jq
```

**Expected (example):**

```json
{
  "ok": true,
  "ticket": {
    "id": "2b2cb0a3-5d6a-4c01-8da8-552206f39d1a",
    "reporter_profile_id": "USER_UUID",
    "status": "open",
    "assigned_to": "OWNER_PROFILE_ID",
    "ai_summary": {
      "summary": "Profile fails to load",
      "category": "profile_loading",
      "severity": "medium",
      "followups": ["Check profile modules", "Verify latest deploy"]
    },
    "created_at": "2025-01-18T05:11:32.133Z"
  },
  "ai": {
    "ok": true,
    "model": "llama3.3:latest",
    "ms": 1198
  }
}
```

Ticket rows are inserted even if `ai.ok` is `false` (you’ll just see `ai.error` populated).

## 3. Moderation Classification

```bash
curl -s -X POST http://localhost:3000/api/moderation/classify \
  -H "Authorization: Bearer <SUPABASE_SESSION_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I am going live with music in 5 minutes!",
    "context": { "surface": "live_post" }
  }' | jq
```

**Expected (example):**

```json
{
  "ok": true,
  "model": "llama-guard3:latest",
  "ms": 623,
  "classification": {
    "labels": ["SAFE"],
    "confidence": 0.91,
    "notes": "General announcement; no policy hits."
  }
}
```

If the guard model flags content you’ll see alternative labels plus its explanatory notes; no enforcement occurs.

## Optional: Companion Chat Sanity

```bash
curl -s -X POST http://localhost:3000/api/support/companion \
  -H "Authorization: Bearer <SUPABASE_SESSION_JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "message": "Got ideas to grow my audience?", "sessionId": "REUSE-UUID" }' | jq
```

Returns the Linkler reply, rate-limit counters, and session ID for reuse.

## 4. UI Sanity (Web + Mobile)

- **Web:** Log in, open the floating Linkler button on Home and on `app/[username]/modern-page`. Confirm both tabs work:
  - Support tab posts to `/api/support/intake` and shows the ticket confirmation banner.
  - Companion tab maintains transcript + cooldowns and the “Send to support” handoff.
- **Mobile:** In the Expo app, verify the Linkler button floats above Home and the user’s own Profile. The panel mirrors the two-tab behavior (support + companion) and enforces cooldowns.

## 5. Owner-Only Prompt + Model Controls

All prompt + model edits use the new `ai_prompts`, `ai_prompt_versions`, and `ai_settings` tables. These checks assume you are connected to the Supabase project via the SQL editor or `psql`.

### a. Non-owner update (should fail)

```sql
-- Simulate a non-owner session UUID before running the write
select set_config('request.jwt.claim.sub', 'NON_OWNER_PROFILE_UUID', false);

update public.ai_prompts
set content_md = content_md || E'\n<!-- should fail -->'
where key = 'linkler_system';
```

**Expected:** `ERROR:  new row violates row-level security policy "ai_prompts_owner_write"`.

Repeat with `update public.ai_settings ...` to see the same denial.

### b. Owner update (should succeed)

```sql
select set_config('request.jwt.claim.sub', '2b4a1178-3c39-4179-94ea-314dd824a818', false);

update public.ai_prompts
set content_md = content_md || E'\n<!-- owner verified -->'
where key = 'linkler_system'
returning key, updated_at, updated_by;
```

**Expected:** One row updates and `updated_by` matches the owner UUID. Run the same pattern for `ai_settings` to log a new version row.

### c. Runtime effect check

1. Edit the prompt via `/admin/linkler` (or the SQL step above) and add a recognizable phrase such as `Linkler internal prompt test`.
2. Immediately call the support intake endpoint (Section 2). The response payload includes `prompt.key` and `prompt.updatedAt`. The minted phrase should now appear inside the AI-generated summary, proving the live runtime picked up the DB copy.
3. Use `/api/ai/ping` to confirm the `models.guard` / `models.assistant` fields match the latest values from `ai_settings`.
