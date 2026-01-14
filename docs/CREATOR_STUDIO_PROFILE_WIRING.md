# Creator Studio → Profile Wiring

## Overview

This document describes how Creator Studio content is wired into profile pages.

## Canonical Routes

| Content Type | Route Pattern | Example |
|--------------|---------------|---------|
| Music (audio) | `/[username]/music/[id]` | `/CannaStreams/music/abc123` |
| Music Video | `/[username]/music-video/[id]` | `/CannaStreams/music-video/abc123` |
| Podcast | `/[username]/podcast/[id]` | `/CannaStreams/podcast/abc123` |
| Movie | `/[username]/movie/[id]` | `/CannaStreams/movie/abc123` |
| Education | `/[username]/education/[id]` | `/CannaStreams/education/abc123` |
| Series Episode | `/[username]/series/[seriesSlug]/[episodeSlug]` | `/CannaStreams/series/my-show/ep1` |

## Source of Truth

| Content Type | Primary Table | RPC |
|--------------|---------------|-----|
| All Creator Studio | `creator_studio_items` | `get_public_creator_studio_items` |
| Legacy Music Videos | `profile_music_videos` | `get_music_videos` |
| Legacy Music Tracks | `profile_music_tracks` | `get_music_tracks` |

## Required Filters

All public-facing queries MUST include:
- `status = 'ready'` - Only show published content
- `visibility = 'public'` - Only show public content
- `owner_profile_id = [profile_id]` - Scope to profile owner

## Profile Tab → Data Source Mapping

| Profile Tab | Data Source | Component |
|-------------|-------------|-----------|
| `videos` (musician) | `profile_music_videos` + `creator_studio_items` (music_video) | `MusicVideos.tsx` |
| `music` | `profile_music_tracks` | `MusicShowcase.tsx` |
| `podcasts` | `creator_studio_items` (podcast) | `CreatorStudioSection.tsx` |
| `movies` | `creator_studio_items` (movie) | `CreatorStudioSection.tsx` |
| `series` | `creator_studio_items` (series_episode) | `CreatorStudioSection.tsx` |
| `education` | `creator_studio_items` (education) | `CreatorStudioSection.tsx` |

## Integration Checklist

Before deploying changes to Creator Studio/profile wiring:

- [ ] Canonical routes exist for all content types
- [ ] Routes query `creator_studio_items` with `status='ready'` and `visibility='public'`
- [ ] Profile sections use `useCreatorStudioItems` hook or direct RPC
- [ ] Items have navigation to canonical routes (not inline-only)
- [ ] `npm run build` passes
- [ ] Manual test: click item → URL changes → player loads

## Key Files

- `hooks/useCreatorStudioItems.ts` - Data fetching hook
- `components/profile/sections/CreatorStudioSection.tsx` - Generic section component
- `components/profile/sections/MusicVideos.tsx` - Music videos with legacy fallback
- `components/profile/sections/VideoPlaylistPlayer.tsx` - Inline player with navigation
- `app/[username]/music-video/[slug]/page.tsx` - Canonical route example
- `supabase/migrations/20260114_creator_studio_v1.sql` - Schema + RPCs

## Migration Notes

The `MusicVideos` component currently reads from BOTH:
1. Creator Studio items (`creator_studio_items` where `item_type='music_video'`)
2. Legacy items (`profile_music_videos`)

Creator Studio items appear first, deduped by title. Legacy items are kept for backward compatibility until explicit migration.
