# NOTIES actionUrl spec (canonical)

This document defines the canonical `actionUrl` formats emitted/consumed for notifications (“Noties”), and how they map to existing routes on web + mobile.

## Goals

- Provide a single, deterministic mapping for both web + mobile.
- Keep `actionUrl` values *portable*: they may be a relative path (`/wallet`), a site URL (`https://mylivelinks.com/wallet`), or a mobile deep-link (`mylivelinks://wallet`).
- Avoid leaking private data via `actionUrl` query parameters.

## Notie types currently emitted

Observed in the codebase (web + mobile noties providers):

- `follow`
- `live`
- `gift`
- `purchase`
- `conversion`
- `mention`
- `comment`
- `level_up`
- `system`

## Canonical actionUrl formats

### Profile

- Canonical: `/<username>`
- Also accepted:
  - `/u/<username>`
  - `/p/<username>`
  - `https://mylivelinks.com/<username>`
  - `mylivelinks://<username>` (treated as `/<username>`)

Mapping:

- Web: `/<username>` (profile page)
- Mobile: `MainTabs -> Profile` with `{ username }`

Currently emitted:

- `follow`: `/${username}`
- `gift`: `/${username}`

### Live

- Canonical: `/live`
- Also accepted: `https://mylivelinks.com/live`, `mylivelinks://live`

Mapping:

- Web: `/live`
- Mobile: `RootStack -> Rooms` (rooms/live hub)

Currently emitted:

- `live`: `/live`

### Wallet

- Canonical: `/wallet`
- Also accepted: `https://mylivelinks.com/wallet`, `mylivelinks://wallet`

Mapping:

- Web: `/wallet`
- Mobile: `RootStack -> Wallet`

Currently emitted:

- `purchase`: `/wallet`
- `conversion`: `/wallet`

### My Analytics

- Canonical: `/me/analytics`
- Also accepted: `https://mylivelinks.com/me/analytics`, `mylivelinks://me/analytics`

Mapping:

- Web: `/me/analytics`
- Mobile: `RootStack -> MyAnalytics`

### Rooms

- Canonical: `/rooms`
- Also accepted: `https://mylivelinks.com/rooms`, `mylivelinks://rooms`

Mapping:

- Web: `/rooms`
- Mobile: `RootStack -> Rooms`

### Messages

- Canonical: `/messages`
- Also accepted: `https://mylivelinks.com/messages`, `mylivelinks://messages`

Mapping:

- Web: `/messages`
- Mobile: `MainTabs -> Messages`

### Noties

- Canonical: `/noties`
- Also accepted: `https://mylivelinks.com/noties`, `mylivelinks://noties`

Mapping:

- Web: `/noties`
- Mobile: `MainTabs -> Noties`

### Gifter Levels

- Canonical: `/gifter-levels`
- Also accepted: `https://mylivelinks.com/gifter-levels`, `mylivelinks://gifter-levels`

Mapping:

- Web: `/gifter-levels`
- Mobile: not currently implemented as a dedicated screen; recommended fallback is opening in system browser.

### Settings: Profile

- Canonical: `/settings/profile`
- Also accepted: `https://mylivelinks.com/settings/profile`, `mylivelinks://settings/profile`

Mapping:

- Web: `/settings/profile`
- Mobile: not currently implemented as a dedicated screen; recommended fallback is opening in system browser.

## Resolver contract

Shared resolver signature (web + mobile):

- `resolveNotieAction(actionUrl: string) -> { route: string, params: Record<string,string> } | null`

The resolver must:

- Normalize relative, absolute-site, and mobile deep-link URLs.
- Return `null` for unknown/unhandled URLs.
- Treat non-mylivelinks domains as `route: external`.

## Mobile navigation contract

Mobile uses the resolver output and maps it to existing navigation targets:

- `profile` -> `Profile` tab `{ username }`
- `wallet` -> `Wallet` (stack)
- `my_analytics` -> `MyAnalytics` (stack)
- `rooms` / `live` -> `Rooms` (stack)
- `messages` -> `MainTabs.Messages`
- `feed` -> `MainTabs.Feed`
- `noties` -> `MainTabs.Noties`
- `external` -> open in system browser
