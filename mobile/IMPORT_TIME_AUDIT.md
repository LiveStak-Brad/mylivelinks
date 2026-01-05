## Import-Time Crash Audit (App Start)

Date: Jan 4, 2026  
Scope: `App.tsx`, entry index, critical providers/hooks that run before the first screen renders.

### Files Reviewed

| File | Notes |
| --- | --- |
| `mobile/index.js` | Minimal polyfills (`TextEncoder`, LiveKit `registerGlobals`). No network, guarded by feature flags. |
| `mobile/App.tsx` | Now wrapped in `SafeAppBoundary` with breadcrumb logging. Providers mount only after `ThemeProvider` renders. |
| `mobile/lib/supabase.ts` | Creates client at import time but uses fallback URL/key and logs when env missing. No longer throws due to missing env; breadcrumbs emit `SUPABASE_ENV_MISSING`. |
| `mobile/lib/env.ts` | Pure helpers; now emits `ENV_LOADED` breadcrumb for visibility. |
| `mobile/lib/livekit-constants.ts` | Only reads env for debug flag; no device APIs. |
| `mobile/hooks/useAuth.ts` | All SecureStore / network calls happen inside `useEffect`. No synchronous calls at import. |
| `mobile/hooks/useLiveRoomParticipants.ts` | Heavy logic gated by `options.enabled`; no code runs until hook invoked by Live screen. |
| `mobile/contexts/ThemeContext.tsx` | SecureStore reads happen inside `useEffect` after mount; returns default theme synchronously to avoid layout delay. |

### Findings

1. **Supabase client** — only module that touches native API (SecureStore) at import. Risk is mitigated by storing adapters without awaiting SecureStore. Missing env vars no longer throw; we log and run in offline mode.
2. **LiveKit globals** — `registerGlobals()` executes once in `index.js`. This is required before `AppRegistry` and does not call network APIs. Caught exceptions would surface via new global error handler.
3. **Linking referral handler** — `Linking.getInitialURL()` awaited only when Navigation container requests it.

### Result

No import-time network/IO remains that can throw synchronously. Any future addition must:
- Avoid `await` at module scope.
- Use the breadcrumb logger to prove when the code runs.
- Fail closed (log + fallback) instead of throwing before the root view renders.
