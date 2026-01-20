# WEB LIVE LAG - A/B TESTING GUIDE

**Date:** 2026-01-18  
**Status:** READY FOR TESTING  
**Goal:** Verify adaptive streaming impact on rotating lag

---

## CHANGES COMPLETED ✅

### 1. A/B Toggle Implementation
**File:** `components/LiveRoom.tsx`

Added query parameter support for testing three LiveKit configurations:

```typescript
// Query param ?lk=A|B|C controls adaptive streaming
const [livekitMode, setLivekitMode] = useState<'A' | 'B' | 'C'>('C');

// Mode A: adaptiveStream=true, dynacast=true (original behavior)
// Mode B: adaptiveStream=true, dynacast=false (adaptive without dynacast)
// Mode C: adaptiveStream=false, dynacast=false (fixed quality - current default)
```

**Lines Changed:** 115-125, 461-470

### 2. Console Logs Removed
**Files:**
- `app/room/[slug]/page.tsx` - 3 logs removed
- `components/ViewerList.tsx` - 3 logs removed
- `components/StreamChat.tsx` - Already cleaned (previous session)
- `components/Tile.tsx` - DEBUG_LIVEKIT gated (only in dev mode)

### 3. Tile Memoization
**File:** `components/Tile.tsx:1650-1672`

Wrapped Tile component with `React.memo` to prevent unnecessary re-renders.

### 4. Reduced Bitrate
**File:** `components/LiveRoom.tsx:467`

Reduced from 1.2 Mbps to 600 kbps (50% bandwidth reduction).

---

## TESTING INSTRUCTIONS

### Test URLs

Open each URL in a **new incognito window** to avoid cache:

1. **Mode A (Adaptive + Dynacast):**
   ```
   http://localhost:3000/room/live-central?lk=A
   ```

2. **Mode B (Adaptive Only):**
   ```
   http://localhost:3000/room/live-central?lk=B
   ```

3. **Mode C (Fixed Quality - Default):**
   ```
   http://localhost:3000/room/live-central?lk=C
   ```

### Test Procedure (Per Mode)

1. **Open DevTools** (F12)
2. **Clear cache** (Right-click refresh → Empty Cache and Hard Reload)
3. **Open Performance tab** → Click Record
4. **Open Network tab** → Filter to WS (WebSocket)
5. **Wait 60 seconds** with 3+ active cameras
6. **Stop Performance recording**
7. **Record metrics** (see below)

### Metrics to Capture

#### Network Tab
- **Total Bandwidth:** Check WS frames, calculate avg bytes/sec
- **Frame Rate:** Count WS frames in 10 seconds, multiply by 6
- **Quality Switches:** Look for sudden bandwidth changes

#### Performance Tab
- **Frame Drops:** Summary → Frames → Dropped frames %
- **Long Tasks:** Look for red bars >50ms
- **Memory:** Check for growth over 60 seconds

#### Visual Observation
- **Rotating Lag:** Does one camera lag, then another, then another?
- **Stutter Frequency:** How often do you see brief freezes?
- **Quality Consistency:** Does video quality stay stable?

---

## EXPECTED RESULTS

### Mode A (Adaptive + Dynacast)
- **Bandwidth:** Variable (switches between layers)
- **Rotating Lag:** LIKELY - this is the suspected cause
- **Quality:** Switches between 180p and 360p
- **CPU:** Higher (encoding 2 layers)

### Mode B (Adaptive Only)
- **Bandwidth:** Variable but less switching
- **Rotating Lag:** POSSIBLE - adaptive still active
- **Quality:** Switches within 360p bitrate range
- **CPU:** Medium (encoding 1 layer)

### Mode C (Fixed Quality)
- **Bandwidth:** Stable ~7.2 Mbps (600 kbps × 12)
- **Rotating Lag:** NONE - this is the fix
- **Quality:** Consistent 360p
- **CPU:** Lower (encoding 1 layer, no switching)

---

## REPORT TEMPLATE

After testing all 3 modes, fill out:

```markdown
# A/B Test Results - [Your Name] - [Date]

## Test Environment
- Browser: [Chrome/Firefox/Safari]
- Connection: [WiFi/Ethernet/Mobile]
- Bandwidth: [Speed test result]
- Active Cameras: [Number]

## Mode A Results (adaptive=true, dynacast=true)
- Bandwidth: ___ Mbps avg
- Frame drops: ___% 
- Rotating lag: YES / NO
- Long tasks: ___ ms avg
- Notes: ___

## Mode B Results (adaptive=true, dynacast=false)
- Bandwidth: ___ Mbps avg
- Frame drops: ___% 
- Rotating lag: YES / NO
- Long tasks: ___ ms avg
- Notes: ___

## Mode C Results (adaptive=false, dynacast=false)
- Bandwidth: ___ Mbps avg
- Frame drops: ___% 
- Rotating lag: YES / NO
- Long tasks: ___ ms avg
- Notes: ___

## Conclusion
Best performing mode: [A/B/C]
Reason: ___
Recommendation: ___
```

---

## CURRENT DEFAULT

The system currently defaults to **Mode C** (adaptive=false, dynacast=false) based on previous lag fixes.

If Mode A or B performs better in your testing, we can change the default.

---

## NEXT: SUBSCRIPTION CONSOLIDATION

After A/B testing confirms the best mode, the next optimization is:

**Consolidate Realtime Subscriptions:**
- Current: 24 tile-level channels (12 live_streams + 12 gifts)
- Target: 2 room-level channels (1 live_streams + 1 gifts)
- Reduction: 92%

This requires:
1. Add room-level subscriptions in LiveRoom
2. Batch state commits (50ms debounce)
3. Fan out updates via props
4. Remove per-tile subscriptions

**Estimated Impact:** Further 20-30% reduction in event processing overhead.

