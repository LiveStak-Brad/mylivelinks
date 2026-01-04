# Linkler Lite UI Wiring Plan

## Surfaces & Entry Points

- **Floating Linkler button** lives in the shared top-level layout so both the home feed (`app/page.tsx`) and the user's own profile (`components/ProfileHeader.tsx` once loaded) render it. Reuse the existing floating action pattern (same z-index as `components/GlobalHeader.tsx` modals) and display `linkler.png` inside a circular button with a subtle glow when unread tickets exist.
- Respect feature flags via `useFeatureFlags` so the button can be toggled remotely. When hidden, no background polling or AI calls should occur (prevents unsolicited responses).
- Place the button near the lower-right corner on desktop and above the tab bar on mobile web. Use CSS vars already defined in `styles/globals.css` for spacing so it matches the rest of the floating controls.

## Panel Structure

- Open a lightweight panel component under `components/support/LinklerPanel.tsx`. Keep it mounted but hidden to preserve chat state.
- Header: Linkler avatar, title (“Need a hand?”), short subtitle (“Choose support or companion mode”). Include an always-visible `Send to human support` link anchored to the right; clicking it focuses the Support tab immediately.
- Provide two equal-width CTA buttons at the top of the panel:
  1. **Report / Get Support** → toggles the Support Intake tab.
  2. **Chat with Linkler** → toggles the Companion Chat tab.
- Tabs share the same textarea + send button component (`components/support/MessageComposer.tsx`). Add optional pill to show “Human reviewed” copy referencing moderation guidelines.

## Support Intake Tab

1. Textarea (minimum 3 lines) with placeholder “Describe the issue…”.
2. Secondary field for optional context JSON (collapsible `<details>` if advanced users want to add extra metadata).
3. Send button posts to `POST /api/linkler/support`. Disable button until textarea has >3 characters.
4. After successful submission:
   - Show inline confirmation (ticket ID + timestamp).
   - Provide CTA “View status” that links to `/support` (future) or copies the ticket ID.
   - Clear textarea but keep context collapsed.
5. Failure states:
   - Display toast with backend `error` string.
   - Keep drafts intact so user can retry without retyping.

## Companion Chat Tab

- Message composer + conversation list (simple bubble layout stored in local state). Messages read from `/api/linkler/companion` response.
- Respect the cooldown returned by the API and show a subtle countdown (“Hang on a sec… 4s”) while the send button is disabled.
- Each Linkler reply includes optional arrays:
  - `exposureTips[]` → render as inline bullet list.
  - `featureIdeas[]` → render as tappable chips linking to relevant pages (feed, live, referrals).
- Always display a subtle inline prompt under Linkler responses: “Need more help? Send to human support” hooking the Support tab button so the handoff is one click away.
- Conversation state should persist per `sessionId` (store in React state + `localStorage`). When panel opens, reuse the latest session until the user explicitly clears.

## Anti-spam / Safety

- UI enforces cooldown by reading `cooldownSeconds` from the API response. When disabled, show tooltip explaining the wait.
- No background polling—Linkler never sends messages on its own. Only respond immediately after the user presses send (mirrors the backend contract).

## Ticket Confirmation + Hand-off

- After Support tab submission, surface a toast “Ticket sent to the owner team”. Include the ticket ID and “Copied!” button (auto-copies to clipboard via `navigator.clipboard`).
- In Companion tab, add a secondary button “Escalate to support” below the transcript. Clicking it switches to Support tab and pre-fills the latest chat transcript into the textarea (just copy text).
- Both flows should reuse a shared `useLinklerSupport` hook that stores:
  - Active tab (`'support' | 'companion'`)
  - Session ID
  - Pending request state
  - Last ticket ID (for confirmation banner)

## Future Moderation Hook

- When content creators submit new posts/chats, server code should call `POST /api/moderation/classify` before storing content. UI only needs to display a “Content is auto-checked via Linkler Guard” footnote near creation forms—no enforcement or blocking actions client-side.
