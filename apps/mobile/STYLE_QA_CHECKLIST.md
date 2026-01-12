# Mobile Style QA Checklist (Contrast + Consistency)

This checklist is for **sweeps and fixes only**: no new features, no new dependencies, and no new theme systems.

## Light mode contrast rules

- **Body text**: Use theme tokens (`colors.text`, `colors.mutedText`, `colors.subtleText`) on `colors.bg` / `colors.surface` / `colors.surface2`. Avoid raw grays.
- **Minimum contrast intent**:
  - Primary text should be clearly readable at a glance on all surfaces.
  - Muted/subtle text should still be readable (not “washed out”) on `surface2`.
- **Interactive text**: Use `colors.link` (or a brand token) and ensure it’s readable on all backgrounds it appears on.
- **Pressed/selected states**: Use `colors.pressedOverlay` or a theme-aware tinted background; do not rely on hardcoded light-only alphas.

## Dark mode contrast rules

- **No “inverted-only” UI**: Surfaces should feel intentional:
  - `colors.bg` for screen backgrounds
  - `colors.surface` for primary cards/containers
  - `colors.surface2` for raised/secondary containers and inputs
- **No hardcoded white**:
  - No `'#FFFFFF'` / `white` backgrounds for surfaces.
  - Exception: **text-on-brand** (white text on a brand-colored button) is OK.
- **Borders and dividers**: Use `colors.border` (never fixed light borders like `#E5E7EB`).
- **Overlays/modals**: Backdrops must use `colors.overlay`; modal sheets/cards must use `colors.surface` with readable `colors.text`.

## Brand color usage rules

- **Primary brand**: Use `brand.primary` for the main call-to-action and key highlights (sparingly).
- **Secondary brand**: Use `brand.secondary` for secondary emphasis and supporting highlights.
- **Avoid rainbow UI**: Don’t introduce new arbitrary colors; prefer theme semantic tokens (`colors.*`) and the existing `brand.*`.
- **Text on brand**: Ensure strong contrast (typically white text) on brand-filled buttons/chips.

## “No emojis” rule

- **No emoji characters in UI strings**: Titles, buttons, chips, placeholders, empty states, and badges should not contain emojis.
- **Use vector icons instead**: Prefer `@expo/vector-icons` (already in the app) for expressive affordances (reactions, badges, etc.).
- **User-generated content exception**: Do not mutate user content returned from the backend; only remove emojis that are hardcoded in the app UI.

## Media viewer behavior rule

- **Full screen**: Media viewer is presented as a full-screen experience (modal) with an explicit close control.
- **Backdrop**: Use a dark backdrop for media (typically black) with readable controls.
- **Gestures**: Dismiss/close gestures should not conflict with in-media interactions (tap/zoom/scroll).
- **Controls**: Iconography should be vector-based and maintain contrast over media.

