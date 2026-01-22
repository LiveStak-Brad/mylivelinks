# Mobile Solo View Parity Plan

## 1. Current Source of Truth
- `/components/SoloStreamViewer.tsx` - Primary Solo viewer component. Contains LiveKit viewer logic, overlay layout, chat panel, and mobile/desktop conditionals.
- `/app/live/[username]/page.tsx` - Route for Solo viewer. Applies `stream-view-mode` on `body` to hide global chrome.
- `/hooks/useIsMobileWeb.ts` - Mobile web detection (width <= 900 and coarse pointer or mobile UA).
- `/styles/mobile-web-live-parity.css` - Defines `.mobile-live-container` and `.mobile-live-v3` (fixed full-screen, 100svh/100dvh, touch-action lock, overscroll lock).
- `/app/globals.css` - Imports the mobile live parity stylesheet and defines `stream-view-mode` to hide header/nav and force black body background.
- `/components/StreamChat.tsx` - Chat UI used by Solo viewer. Includes touch-pan-y scroll and input overlay.

Mobile-specific conditionals already present:
- `SoloStreamViewer`: `containerClass` uses `useIsMobileWeb` to toggle `mobile-live-container mobile-live-v3` vs `min-h-screen bg-black overflow-hidden`.
- Back button uses `lg:hidden` (mobile-only).
- Viewer count placement uses `lg:` classes vs `left-[65%]` on small screens.
- Top gifter bubbles in the action row use `hidden md:flex`.
- Volume control uses `hidden md:flex`.
- Offline UI uses `hidden md:block` vs `md:hidden` branches.
- Safe-area top insets are applied via `env(safe-area-inset-top)` inline styles.

CSS/layout/JS affecting video sizing or orientation:
- `SoloStreamViewer`: `videoAspectRatio` is set from `loadedmetadata`, and `isPortraitVideo` controls `objectFit` (`contain` vs `cover`).
- `SoloStreamViewer`: `video` class list uses `lg:` overrides for width/height (`lg:h-full lg:w-auto` or `lg:w-full lg:h-auto`).
- `.mobile-live-container` in `mobile-web-live-parity.css` applies fixed layout, `height: 100svh/100dvh`, and `touch-action: none`.

## 2. Desktop Solo Viewer Behavior (Observed)
- Layout: `/live/[username]` renders `SoloStreamViewer` with `min-h-screen bg-black overflow-hidden`. `stream-view-mode` hides the global header and bottom nav.
- Video: Viewer connects to LiveKit room `solo_${profile_id}` when the stream is live; remote host video attaches to `<video>` and audio to `<audio>`.
  - Aspect ratio detection drives `objectFit`: portrait uses `contain`, landscape uses `cover`.
  - Desktop uses `lg:` sizing rules: portrait resolves to auto width + full height, landscape resolves to full width + auto height.
- Overlays and stacking:
  - Base video element.
  - Top and bottom gradient overlays (`z-[15]`).
  - Top row with streamer info and action buttons (`z-20`).
  - Viewer count badge centered at the top (`z-50`).
  - Gift animations and guest overlays above the video.
  - Chat panel fixed to bottom, height `40vh` (`z-20`).
  - Volume control overlay bottom-left (visible on md+).
  - Stream-ended overlay full-screen (`z-50`) with a 5s redirect to `/liveTV`.
- Viewer lifecycle:
  - Loads streamer profile and live stream ID; sets up viewer count (realtime + polling) and heartbeat.
  - Connects to LiveKit once per mount; attaches tracks; retries playback on stalls.
  - Subscribes to live_streams updates to detect stream end and restarts.
  - On stream end, disconnects, shows end overlay, then redirects after countdown.
  - On visibility change/pagehide, disconnects and re-routes to rejoin.

## 3. Mobile PWA Constraints
- Mobile viewport height changes with browser chrome. `.mobile-live-container` uses 100svh/100dvh, while the viewer uses `h-screen`.
- Safe-area insets for notch and home indicator exist. Top overlays already use `env(safe-area-inset-top)`; bottom overlays do not.
- Touch-only input (no hover). Chat scrolling relies on `touch-pan-y` and default touch-action handling.
- `playsInline` is used on video/audio to keep playback inline on mobile browsers.
- Orientation changes resize the viewport; `useIsMobileWeb` is width- and pointer-based.

## 4. Parity Gap Analysis
1. Container layout and scroll lock
   - Difference: Desktop uses `min-h-screen bg-black overflow-hidden`; mobile uses `mobile-live-container mobile-live-v3` with fixed positioning and touch-action lock.
   - Source: `components/SoloStreamViewer.tsx` (`containerClass`), `styles/mobile-web-live-parity.css` (`.mobile-live-container`).
   - Parity impact: Mobile layout flow and scrolling differ from desktop.
   - Fix type: layout/CSS scoping or conditional class changes.

2. Video sizing rules across breakpoints
   - Difference: Desktop applies `lg:` width/height overrides; mobile stays `w-full h-full`.
   - Source: `components/SoloStreamViewer.tsx` video `className`.
   - Parity impact: Portrait/landscape framing differs.
   - Fix type: CSS/class logic.

3. Viewer count placement
   - Difference: Desktop centers viewer count at top; mobile uses `left-[65%]`.
   - Source: `components/SoloStreamViewer.tsx` viewer count container.
   - Parity impact: Overlay position differs.
   - Fix type: layout/positioning.

4. Back button visibility
   - Difference: Back button is mobile-only (`lg:hidden`), not shown on desktop.
   - Source: `components/SoloStreamViewer.tsx` top row.
   - Parity impact: Extra overlay element on mobile.
   - Fix type: conditional rendering/visibility.

5. Volume control visibility
   - Difference: Volume slider hidden on mobile (`hidden md:flex`).
   - Source: `components/SoloStreamViewer.tsx` volume control block.
   - Parity impact: Desktop control missing on mobile.
   - Fix type: UI visibility.

6. Offline state layout
   - Difference: Desktop shows centered offline message + avatar; mobile shows full-screen avatar image.
   - Source: `components/SoloStreamViewer.tsx` offline branch with `md` conditionals.
   - Parity impact: Different offline behavior.
   - Fix type: conditional rendering/layout.

7. Top gifter bubbles visibility/placement
   - Difference: Action-row gifter bubbles hidden on mobile; absolute gifter cluster may overflow on small widths.
   - Source: `components/SoloStreamViewer.tsx` top gifter sections.
   - Parity impact: Overlay set and ordering differ.
   - Fix type: layout/visibility adjustments.

8. Bottom safe-area handling for chat
   - Difference: Desktop has full visible chat panel; mobile chat panel has no safe-area bottom padding.
   - Source: `components/SoloStreamViewer.tsx` chat panel wrapper.
   - Parity impact: Chat input/messages can be obscured by the home indicator.
   - Fix type: CSS inset/padding.

## 5. Step-by-Step Implementation Plan
1. Normalize the container class to the desktop baseline on mobile
   - Goal: Make the Solo viewer container use the same base layout behavior on mobile and desktop.
   - Files: `components/SoloStreamViewer.tsx`.
   - Scope limits: Only adjust container class selection and related imports. Do not edit LiveKit logic, battle/cohost logic, or shared mobile layout CSS used by other screens.
   - Expected outcome: Mobile uses the same outer container classes as desktop; fixed positioning and touch-action lock from `.mobile-live-container` no longer affect Solo viewer.
   - Verify: On a mobile viewport, `/live/[username]` fills the screen without unexpected scroll or white gaps; modals still appear above the viewer.

2. Apply desktop video sizing rules across all breakpoints
   - Goal: Match desktop crop/letterbox behavior for portrait vs landscape video on mobile.
   - Files: `components/SoloStreamViewer.tsx`.
   - Scope limits: Only change the `video` element `className` and sizing logic. Do not change LiveKit track attachment or `objectFit` logic.
   - Expected outcome: Portrait video uses the same width/height behavior as desktop (auto width, full height). Landscape video uses the same width/height behavior as desktop (full width, auto height).
   - Verify: Compare portrait and landscape streams on desktop vs mobile; framing should match.

3. Align viewer count placement with desktop
   - Goal: Center the viewer count badge at the top on mobile, matching desktop.
   - Files: `components/SoloStreamViewer.tsx`.
   - Scope limits: Only adjust the viewer count container classes/position. Do not change the button behavior or modal wiring.
   - Expected outcome: Viewer count appears top-center on both desktop and mobile, respecting safe-area top inset.
   - Verify: Resize to mobile width; the count badge remains centered and does not overlap the streamer info bubble.

4. Match overlay visibility to desktop (back button, volume control, offline state)
   - Goal: Remove mobile-only overlays and expose desktop-only overlays where feasible.
   - Files: `components/SoloStreamViewer.tsx`.
   - Scope limits: No changes to battle/cohost logic, chat behavior, or modal content. Only adjust `md`/`lg` visibility classes and conditional branches for these elements.
   - Expected outcome:
     - Back button is not shown on mobile (matching desktop).
     - Volume control appears on mobile (same as desktop).
     - Offline state uses the same centered avatar + text layout on mobile and desktop.
   - Verify:
     - Mobile view shows no back button.
     - Volume slider is visible and functional.
     - Offline state matches desktop presentation.

5. Match top gifter overlay visibility and placement
   - Goal: Ensure the same gifter bubbles appear on mobile as on desktop and maintain the same stacking order.
   - Files: `components/SoloStreamViewer.tsx` (and only if needed, scoped spacing adjustments in an existing stylesheet).
   - Scope limits: Do not introduce new layout components or change gifter data logic. Only adjust visibility classes and spacing to prevent overlap.
   - Expected outcome: Mobile shows the same gifter bubbles that desktop shows, with no missing sections.
   - Verify: On a stream with top gifters, confirm that the gifter bubbles appear in the same two locations as desktop without covering the viewer count or streamer info.

6. Add bottom safe-area padding to the chat panel
   - Goal: Prevent the chat panel/input from being obscured by the mobile home indicator while keeping the desktop layout unchanged.
   - Files: `components/SoloStreamViewer.tsx` (chat panel wrapper) and/or `app/globals.css` (safe-area utility already present).
   - Scope limits: Only add safe-area padding to the chat wrapper; do not change chat message rendering or input behavior.
   - Expected outcome: On mobile, the chat panel bottom edge clears the safe-area inset; desktop looks unchanged.
   - Verify: On iOS/PWA, chat input and the bottom of the chat panel remain fully visible.

7. Manual parity verification
   - Goal: Confirm no behavioral regressions in viewer lifecycle or overlays.
   - Files: None (verification only).
   - Scope limits: Do not change code while verifying; document any remaining gaps for follow-up.
   - Expected outcome: Mobile and desktop show identical Solo viewer behavior for video fit, overlays, chat, and stream end flow.
   - Verify: Connect to a live stream, rotate device, background/foreground the tab, and allow the stream to end; confirm behavior matches desktop.

## 6. Explicit Non-Goals
- No battle, cohost, or group streaming logic changes.
- No backend or LiveKit token logic changes.
- No refactors of LiveRoom or MobileWebWatchLayout.
- No new UI redesigns or layout re-architecture.
- No new dependencies or design system changes.
