## Search data sources

- `lib/search.ts` contains the shared `fetchSearchResults` helper used by both the dropdown (`GlobalSearchTrigger`) and `/search` pages. It queries Supabase tables:
  - `profiles` for People and Live tabs (columns: `id`, `username`, `display_name`, `avatar_url`, `is_live`, `follower_count`, verification flags, `bio`, `viewer_count`).
  - `posts` for Posts tab (`id`, `text_content`, `created_at`, `media_url`, reaction + comment counts, plus the `profiles` join for author info).
  - `team_feed_posts` for team activity (joined with `teams` + `profiles` so team posts show up alongside global posts).
  - `teams` for Teams tab (`id`, `name`, `slug`, `description`, `icon_url`, `banner_url`, `approved_member_count`).
- Nearby People continues to use the existing `rpc_profiles_nearby` Supabase RPC inside `SearchPage`.
- No additional API routes were created; dropdown and page components call Supabase directly through the shared helper so the data contract stays identical in both experiences.
- Result links resolve to:
  - People → `/${username}` (fallback `/profiles/${id}`)
  - Posts → `/feed?focusPostId={postId}` for global posts or `/teams/{slug}?postId={postId}` for team activity
  - Teams → `/teams/{slug||id}`
  - Live → `/live/{username||id}`

## Manual verification checklist

1. Desktop
   - Open the global search bar, type `cannastreams`, and confirm quick-jump buttons route to `/search`, `/search/people`, `/search/posts`, `/search/teams`, and `/search/live` with the correct `q`/`tab` params.
   - Click a People/Post/Team/Live result and ensure navigation matches the destinations above while the dropdown closes after routing. Posts should now include public feed posts *and* team feed activity.
2. Mobile web
   - Open the header search overlay, type a term, and confirm live suggestions are tappable (recents, quick jumps, and inline results).
   - Verify the overlay closes after routing and body scroll lock is released.
