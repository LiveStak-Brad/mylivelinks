# AGENT OPERATING SYSTEM — WINDOWS

# LOGIC AGENT E — Storage + Signed URL Pattern for Clip Playback

**Scope:** Storage path conventions + signed URL retrieval only

**Foundation (locked):** `supabase/migrations/20251228_composer_core_tables_phase1.sql` (commit `fdd3f56`)

---

## Deliverables

### 1) Storage bucket decision

- **Bucket:** `clips`
- **Public:** `false` (private bucket)

Rationale:
- `public.clips.visibility` supports `public/unlisted/private`, so clip media cannot safely live in an always-public bucket.
- A private bucket + signed URLs provides one consistent playback contract for web and mobile.

### 2) Storage path convention

Within bucket `clips`, object keys are standardized to:

- `clips/{clip_id}/source.mp4`
- `clips/{clip_id}/thumb.jpg`

### 3) Playback URL retrieval (single contract for web + mobile)

Because Postgres RPCs cannot generate Supabase Storage signed URLs directly (no `create_signed_url` SQL function in this repo), playback URL retrieval is implemented as an API route.

- **Endpoint:** `GET /api/clips/{clip_id}/playback`
- **Alias endpoint (RPC-shaped):** `GET /api/get_clip_playback?p_clip_id={clip_id}`
- **Auth:** optional (RLS-enforced)
  - Public + ready clips are readable due to existing RLS on `public.clips`.
  - Private/unlisted clips are only readable by the producer due to existing RLS.

**Response JSON:**
- `asset_url` (string | null)
- `thumbnail_url` (string | null)
- `status` (string | null)

Behavior:
- If the clip is `visibility='public'` and `status='ready'` and `public.clips.asset_url` + `public.clips.thumbnail_url` are already populated, the endpoint returns those directly.
- Otherwise it returns short-lived signed URLs for `clips/{clip_id}/source.mp4` + `thumb.jpg`.

---

## Files changed

- `supabase/migrations/20251228_clips_storage_contract_phase1.sql`
- `app/api/clips/[clipId]/playback/route.ts`
- `app/api/get_clip_playback/route.ts`
- `LOGIC_AGENT_E_COMPLETE.md`

## Status

Complete. Commit pushed.
