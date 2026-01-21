# LiveKit MCP Server Integration

## What is MCP?

**Model Context Protocol (MCP)** is a standard that allows AI assistants (like Cursor) to connect to external data sources and tools. LiveKit provides a free MCP server that gives AI assistants direct access to LiveKit documentation.

## Why We Added This

- **Reduce hallucinations**: AI gets accurate, up-to-date LiveKit API info instead of guessing
- **Faster debugging**: Search LiveKit docs directly while coding without leaving Cursor
- **Parity work**: Quickly reference client SDK behaviors across web/mobile
- **No runtime changes**: This is tooling only - does not affect app behavior

---

## Installation in Cursor

### Step 1: Open Cursor Settings

1. Open Cursor
2. Go to **Settings** (gear icon or `Ctrl/Cmd + ,`)
3. Navigate to **MCP** section

### Step 2: Add LiveKit Docs Server

Click "Add MCP Server" or edit the JSON config manually with:

```json
{
  "livekit-docs": {
    "url": "https://docs.livekit.io/mcp"
  }
}
```

### Step 3: Verify It's Working

After adding, you should see `livekit-docs` listed under your MCP servers in Cursor settings.

**Test query**: Ask Cursor Agent:
> "Using the LiveKit docs MCP, explain the Room connect lifecycle"

If configured correctly, the agent will fetch information directly from LiveKit's documentation.

---

## Example Queries for MyLiveLinks Development

These are common LiveKit topics relevant to our codebase:

### Room Connection Lifecycle
> "Search LiveKit docs for Room connect and disconnect events"

Useful for: `BattleGridWrapper.tsx`, `SoloHostStream.tsx`, `SoloStreamViewer.tsx`

### Track Publish/Unpublish
> "How do I publish and unpublish local tracks in livekit-client?"

Useful for: Solo stream publishing, battle room transitions

### Reconnect Strategies
> "What reconnect options does LiveKit provide for mobile/PWA?"

Useful for: Mobile app stability, PWA resilience

### Autoplay & playsInline Issues
> "How to handle autoplay restrictions in LiveKit web client?"

Useful for: Viewer-side video playback issues

### Bandwidth & Adaptive Streaming
> "Search LiveKit docs for adaptive streaming and bandwidth estimation"

Useful for: Quality optimization, mobile data usage

### Participant Events
> "What events fire when a participant joins or leaves a LiveKit room?"

Useful for: Battle pairing, cohost sessions, viewer counts

### Token Generation
> "How should I generate access tokens for LiveKit rooms?"

Useful for: `/api/livekit/token/route.ts`

---

## Key LiveKit Files in This Repo

| File | Purpose |
|------|---------|
| `app/api/livekit/token/route.ts` | Token generation for room access |
| `app/api/livekit/webhook/route.ts` | LiveKit webhook handling |
| `components/battle/BattleGridWrapper.tsx` | Multi-host LiveKit room management |
| `components/SoloHostStream.tsx` | Solo host publishing |
| `components/SoloStreamViewer.tsx` | Viewer-side subscription |
| `lib/livekit-constants.ts` | Shared LiveKit configuration |
| `apps/mobile/` | React Native LiveKit integration |

---

## Safety Note

> **This is tooling only.** Adding the LiveKit MCP server does not change any runtime behavior of the web or mobile apps. It only enables AI assistants to search LiveKit documentation while you code.

---

## Additional Resources

- [LiveKit MCP Server Docs](https://docs.livekit.io/intro/mcp-server/)
- [LiveKit Client SDK (JavaScript)](https://docs.livekit.io/client-sdk-js/)
- [LiveKit React Native SDK](https://docs.livekit.io/client-sdk-react-native/)
- [LiveKit Server SDK](https://docs.livekit.io/server-sdk/)

---

## Troubleshooting

### MCP Server Not Appearing
- Restart Cursor after adding the configuration
- Ensure the URL is exactly: `https://docs.livekit.io/mcp`

### Agent Not Using LiveKit Docs
- Explicitly mention "LiveKit docs" or "LiveKit MCP" in your query
- Example: "Using LiveKit docs, explain..."

### Windows-Specific Issues
- If using npx-based MCP servers, you may need `cmd /c` prefix
- The LiveKit Docs MCP is HTTP-based, so no npx issues apply
