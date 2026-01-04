# Linkler Lite Verification Commands

All endpoints run under the Next.js dev server (`npm run dev`) on `http://localhost:3000`. The Linkler APIs require a valid Supabase session token; grab one from `localStorage.getItem('sb-access-token')` in an authenticated browser tab (owner profile for the admin-only routes) or issue a service token for testing. `/api/ollama/*` and `/api/ai/ping` are now owner-gated; public calls must fail.

## 1. Infrastructure guard (no public leakage)

```bash
# Public calls must be rejected (401/403) and must NOT include any baseUrl/ngrok fields
curl -i http://localhost:3000/api/ollama/health
curl -i http://localhost:3000/api/ai/ping

# Owner-authenticated ping should succeed without exposing OLLAMA_BASE_URL
curl -s -X GET http://localhost:3000/api/ai/ping \
  -H "Authorization: Bearer <OWNER_SESSION_JWT>" | jq

# Static scan to ensure no client bundle references ngrok URLs
rg -n "ngrok" app components mobile/components
```

Expected unauthenticated responses:

```json
HTTP/1.1 401 Unauthorized
{
  "ok": false,
  "error": "Unauthorized"
}
```

Authenticated `/api/ai/ping` calls return the existing `{ ok, model, ms, prompt, models }` payload but never include `baseUrl`.

## 2. Support intake ticket (`/api/linkler/support`)

```bash
curl -s -X POST http://localhost:3000/api/linkler/support \
  -H "Authorization: Bearer <SUPABASE_SESSION_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My showcase page is stuck on loading.",
    "context": { "screen": "profile", "browser": "edge" }
  }' | jq
```

The response mirrors the previous contract but now includes `retryAfterSeconds` only when the short cooldown (or kill switch) blocks new submissions. Ticket rows are inserted even if `ai.ok` is `false` (you’ll just see `ai.error` populated).

## 3. Cooldown proof

```bash
# Immediate second send should trigger the cooldown window
curl -s -X POST http://localhost:3000/api/linkler/support \
  -H "Authorization: Bearer <SUPABASE_SESSION_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"message":"first attempt"}' | jq
curl -s -X POST http://localhost:3000/api/linkler/support \
  -H "Authorization: Bearer <SUPABASE_SESSION_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"message":"second attempt"}' | jq
```

The second call returns `429` with `{"ok": false, "error": "...", "retryAfterSeconds": <seconds>}` confirming the short cooldown gate.

## 4. Kill switch (`LINKLER_ENABLED=false`)

Start the dev server with the flag disabled, then hit both Linkler endpoints:

```bash
LINKLER_ENABLED=false npm run dev

# In another terminal once the server is up
curl -s -X POST http://localhost:3000/api/linkler/support \
  -H "Authorization: Bearer <SUPABASE_SESSION_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"message":"does this work?"}' | jq

curl -s -X POST http://localhost:3000/api/linkler/companion \
  -H "Authorization: Bearer <SUPABASE_SESSION_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"message":"ping"}' | jq
```

Both calls must return `503` with `{ ok: false, error: "Linkler is temporarily unavailable..." }`, proving the kill switch disables the surfaces without front-end changes.

## 5. Moderation classification

```bash
curl -s -X POST http://localhost:3000/api/moderation/classify \
  -H "Authorization: Bearer <SUPABASE_SESSION_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I am going live with music in 5 minutes!",
    "context": { "surface": "live_post" }
  }' | jq
```

Expected (example):

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

## 6. Companion chat sanity (`/api/linkler/companion`)

```bash
curl -s -X POST http://localhost:3000/api/linkler/companion \
  -H "Authorization: Bearer <SUPABASE_SESSION_JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "message": "Got ideas to grow my audience?", "sessionId": "REUSE-UUID" }' | jq
```

Returns the Linkler reply, session ID for reuse, and the cooldown for the next send. Subsequent rapid sends should return 429 with `retryAfterSeconds` matching the cooldown returned in the previous response.

## 7. UI sanity (web + mobile)

- **Web:** Log in, open the floating Linkler button on Home and on `app/[username]/modern-page`. Confirm both tabs work:
  - Support tab posts to `/api/linkler/support` and shows the ticket confirmation banner or the 503/429 messaging when applicable.
  - Companion tab maintains transcript + cooldowns and the “Send to support” handoff while targeting `/api/linkler/companion`.
- **Mobile:** In the Expo app, verify the Linkler button floats above Home and the user’s own Profile. The panel mirrors the two-tab behavior (support + companion) and enforces cooldowns against `/api/linkler/*`.

## 8. Owner-only prompt + model controls

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
3. Use `/api/ai/ping` (authenticated as the owner) to confirm the `models.guard` / `models.assistant` fields match the latest values from `ai_settings`.

## 9. Admin & Owner diagnostics card

1. Sign in as the owner and open `/admin/linkler`. The **Linkler Status** card should appear above the editor with:
   - Health (`online`/`offline`) and the latest latency in milliseconds.
   - Kill switch indicator (`Enabled` vs `Disabled`).
   - 24h usage counts for support tickets and companion chats.
   - The most recent AI error message, or “No AI errors recorded.”
2. Visit `/owner` and confirm the same card renders under the Linkler Prompt summary.
3. Use the **Refresh** button to confirm the timestamp, usage counts, and health state update on demand.
4. Optionally flip the `linkler_enabled` feature flag off via `/owner/feature-flags`, then refresh the card to see the Kill Switch badge switch to `Disabled`.
