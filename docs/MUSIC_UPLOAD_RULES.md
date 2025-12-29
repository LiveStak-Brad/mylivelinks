# Music Upload Rules (Tracks)

This document defines the **canonical Supabase Storage conventions** for profile music tracks so web + mobile can generate **stable URLs** and keep media organized.

## Bucket

- **Bucket**: `profile-media` (canonical bucket already used for profile media uploads)

## Canonical paths

Use these stable paths (track IDs are UUIDs from `public.profile_music_tracks.id`):

- **Track audio**: `profile-media/{profile_id}/music/tracks/{track_id}/audio`
- **Track cover art**: `profile-media/{profile_id}/music/tracks/{track_id}/cover`

Notes:
- `{profile_id}` is the profile’s UUID (`public.profiles.id`).
- `{track_id}` is the track row UUID (`public.profile_music_tracks.id`).
- Re-uploads should overwrite the same path (stable URLs; no “random” filenames).

## Public vs signed URLs

The current codebase commonly uses **public URLs**:

- `supabase.storage.from('profile-media').getPublicUrl(path)`

If you switch the bucket/policies to require signed access, use:

- `supabase.storage.from('profile-media').createSignedUrl(path, expiresInSeconds)`

The playlist players expect a usable `audio_url` (either a public URL or a signed URL you refresh as needed).




