# COMPREHENSIVE WEB LAG AUDIT - ALL SOURCES

**Date:** 2026-01-18  
**Status:** ACTIVE LAG STILL PRESENT after Phase 2 timer removal  
**Scope:** ALL potential lag sources in web live streaming

---

## EXECUTIVE SUMMARY

After removing timer storms (Phase 2), lag persists. This audit identifies ALL remaining performance bottlenecks beyond timers.

---

## CATEGORY 1: REACT RE-RENDER STORMS ⚠️ CRITICAL

### 1.1 LiveRoom State Cascade
**FILE:** `components/LiveRoom.tsx`

**Problem:** Multiple state updates trigger cascading re-renders across 12 tiles

**Evidence:**
- Line 143: `setLiveStreamers()` triggers re-render of all tiles
- Line 129-138: `setGridSlots()` triggers re-render of all tiles
- Line 1573-1644: Deep comparison logic attempts to prevent re-renders BUT:
  - Still creates new array reference when data changes
  - Viewer count changes trigger full re-render
  - Live status changes trigger full re-render

**Impact:** 
- Each `liveStreamers` update = 12 Tile components re-render
- Each `gridSlots` update = 12 Tile components re-render
- Realtime events (INSERT/UPDATE on live_streams) trigger these updates

**Frequency:**
- Every heartbeat (20s) can trigger presence updates
- Every viewer join/leave triggers state update
- Every live status change triggers state update

**SEVERITY:** 🔴 CRITICAL - With 12 tiles, each state update causes 12 component re-renders

---

### 1.2 StreamChat Re-Render on Every Message
**FILE:** `components/StreamChat.tsx`

**Problem:** Every chat message triggers full component re-render

**Evidence:**
- Line 49: `messages` state array
- Line 224-230: BroadcastChannel updates trigger `setMessages()` with map operation
- Line 47: Console log on EVERY render: `[STREAMCHAT] 🎬 StreamChat rendered`
- Line 50: Console log on EVERY render: `[STREAMCHAT] 📊 Current messages in state`

**Impact:**
- Every chat message = full StreamChat re-render
- Every gift = full StreamChat re-render
- Every chat settings update = full StreamChat re-render
- With active chat, this is 5-20 re-renders per minute

**SEVERITY:** 🟡 MEDIUM - Chat is not in critical path but adds overhead

---

### 1.3 ViewerList Re-Render on Heartbeat Updates
**FILE:** `components/ViewerList.tsx`

**Problem:** Heartbeat updates trigger re-renders even when skipped

**Evidence:**
- Line 209-250: UPDATE event handler
- Line 227-229: Skip logic checks if only timestamp changed
- Line 217-249: BUT still calls `setViewers()` with map operation
- Line 242-246: Re-sorts array even when skipping meaningful changes

**Optimization Present:** Line 227-229 attempts to skip heartbeat-only updates
**Issue:** Still processes the update and creates new array reference

**SEVERITY:** 🟡 MEDIUM - Partially optimized but still has overhead

---

### 1.4 Tile ResizeObserver Firing on Every Resize
**FILE:** `components/Tile.tsx`

**Problem:** ResizeObserver triggers state update on every tile resize

**Evidence:**
- Line 102-119: ResizeObserver on EVERY tile
- Line 112: `setGiftOverlayScale()` called on every resize
- With 12 tiles, window resize = 12 state updates

**Impact:**
- Window resize = 12 Tile re-renders
- Fullscreen toggle = 12 Tile re-renders
- Grid layout change = 12 Tile re-renders

**SEVERITY:** 🟡 MEDIUM - Only during resize, but adds overhead

---

## CATEGORY 2: NETWORK OVERHEAD ⚠️ HIGH

### 2.1 Realtime Subscription Overhead
**FILE:** `components/LiveRoom.tsx`, `ViewerList.tsx`, `StreamChat.tsx`, `Tile.tsx`

**Active Subscriptions per Live Room:**
1. `room-presence-count-updates` (LiveRoom) - presence count tracking
2. `live-streams-updates` (LiveRoom) - streamer status changes
3. `room-presence-{roomId}` (ViewerList) - viewer list updates
4. `live-streams-viewer-{roomId}` (ViewerList) - live status for viewers
5. `chat-messages-{liveStreamId}` (StreamChat) - chat messages
6. `profiles-{profileId}` (StreamChat) - profile updates
7. `live-stream-{liveStreamId}` (Tile × 12) - stream status per tile
8. `gifts:recipient:{streamerId}` (Tile × 12) - gift animations per tile

**Total Active Channels:** ~28 channels (2 global + 2 ViewerList + 2 StreamChat + 24 Tile)

**Problem:** Each channel maintains WebSocket connection and processes events

**Evidence:**
- LiveRoom:1197-1306: live_streams subscription
- LiveRoom:978-993: room_presence subscription
- ViewerList:147-252: room_presence subscription (singleton but still active)
- ViewerList:255-298: live_streams subscription
- StreamChat:761-834: profiles subscription
- StreamChat:425-496: chat_messages subscription
- Tile:1043-1071: live_streams subscription (×12)
- Tile:1074-1160: gifts subscription (×12)

**SEVERITY:** 🔴 CRITICAL - 28 active WebSocket channels processing events

---

### 2.2 Redundant Profile/Status Queries
**FILE:** `components/LiveRoom.tsx`

**Problem:** Multiple queries for same data during load

**Evidence:**
- Line 1398-1426: Queries `active_viewers` for EACH streamer (Promise.all but still N queries)
- Line 1475-1503: Queries `active_viewers` again for waiting streamers
- Line 1535-1563: Queries `active_viewers` again for own stream
- Line 1441-1447: Queries `gifter_statuses` for all streamers

**Impact:** With 12 streamers:
- 12 `active_viewers` count queries
- 1 `gifter_statuses` query (batched, good)
- All on initial load

**SEVERITY:** 🟡 MEDIUM - Only on load, but adds latency

---

### 2.3 ViewerList Time-Based Query Still Present
**FILE:** `components/ViewerList.tsx`

**Problem:** Still using `Date.now()` filter in query

**Evidence:**
- Line 352: `.gt('last_seen_at', new Date(Date.now() - 90000).toISOString())`

**Impact:** Query results change over time even without new data

**SEVERITY:** 🟡 MEDIUM - 90s threshold is reasonable but still time-based

---

## CATEGORY 3: LIVEKIT CONFIGURATION ⚠️ HIGH

### 3.1 Adaptive Streaming Enabled
**FILE:** `components/LiveRoom.tsx`

**Problem:** Adaptive streaming causes quality switching lag

**Evidence:**
- Line 451: `adaptiveStream: true`
- Line 452: `dynacast: true`

**What This Does:**
- LiveKit dynamically adjusts video quality based on bandwidth
- Switches between simulcast layers (180p, 360p)
- Each switch causes brief video stutter/freeze

**Impact:** With 12 tiles:
- Each tile can switch quality independently
- Bandwidth fluctuations cause cascading quality switches
- User sees "rotating lag" as different tiles adjust

**SEVERITY:** 🔴 CRITICAL - This is likely the PRIMARY cause of rotating lag

---

### 3.2 Simulcast Layers
**FILE:** `components/LiveRoom.tsx`

**Problem:** Two simulcast layers = 2× encoding CPU load

**Evidence:**
- Line 461-464: Two layers (h180, h360)
- Publisher encodes BOTH layers simultaneously
- Each layer requires separate encoding pass

**Impact:**
- Publishing = 2× CPU usage for video encoding
- Viewing 12 streams = receiving 12 separate streams
- Total bandwidth = 12 streams × selected layer bitrate

**SEVERITY:** 🔴 CRITICAL - CPU bottleneck for publishers

---

### 3.3 Video Bitrate Too High
**FILE:** `components/LiveRoom.tsx`

**Problem:** 1.2 Mbps per stream is high for 360p

**Evidence:**
- Line 466: `videoBitrate: 1_200_000` (1.2 Mbps)
- Standard 360p bitrate: 500-800 kbps
- With 12 streams: 12 × 1.2 Mbps = 14.4 Mbps download

**Impact:**
- Bandwidth saturation on slower connections
- Causes buffering and quality drops
- Triggers adaptive streaming switches (see 3.1)

**SEVERITY:** 🔴 CRITICAL - Bandwidth bottleneck

---

## CATEGORY 4: DOM/BROWSER PERFORMANCE ⚠️ MEDIUM

### 4.1 Console Logging in Production
**FILE:** Multiple files

**Problem:** Excessive console.log calls in hot paths

**Evidence:**
- StreamChat.tsx:47,50 - Logs on EVERY render
- LiveRoom.tsx - Multiple DEBUG_LIVEKIT logs
- Tile.tsx - Multiple subscription logs
- ViewerList.tsx:268 - Logs on every live_streams event

**Impact:**
- Console.log is synchronous and blocks main thread
- With 12 tiles + chat + viewer list = 50+ logs per second
- Each log = string formatting + DevTools overhead

**SEVERITY:** 🟡 MEDIUM - Easy fix, measurable impact

---

### 4.2 Video Element Attachment via requestAnimationFrame
**FILE:** `components/Tile.tsx`

**Problem:** Recursive rAF loop for video attachment

**Evidence:**
- Line 864-875: Recursive `requestAnimationFrame` until `videoRef.current` exists
- Runs for EVERY video track change
- With 12 tiles, this is 12 concurrent rAF loops

**Impact:**
- Each rAF loop runs at 60fps until element found
- Typically resolves in 1-2 frames but adds overhead
- With 12 tiles, 12 rAF loops running simultaneously

**SEVERITY:** 🟢 LOW - Short-lived but adds overhead

---

### 4.3 IntersectionObserver on Every Tile
**FILE:** `components/Tile.tsx`

**Problem:** IntersectionObserver for visibility tracking

**Evidence:**
- Line 1019-1032: IntersectionObserver on EVERY tile
- Tracks visibility for heartbeat optimization
- With 12 tiles = 12 active observers

**Impact:**
- Browser must track intersection for 12 elements
- Fires callback on scroll/resize
- Minimal overhead but adds up

**SEVERITY:** 🟢 LOW - Necessary for optimization

---

## CATEGORY 5: STATE MANAGEMENT ISSUES ⚠️ HIGH

### 5.1 LiveStreamers Array Never Cleared
**FILE:** `components/LiveRoom.tsx`

**Problem:** Defensive logic prevents clearing stale streamers

**Evidence:**
- Line 1574-1606: ABSOLUTE GUARD prevents clearing streamers
- Line 1580-1592: Blocks empty array even if legitimate
- Line 1596-1603: Uses ref to keep stale data

**Impact:**
- Stale streamers remain in state
- Tiles continue rendering offline streams
- Memory leak over time

**SEVERITY:** 🟡 MEDIUM - Prevents crashes but causes stale data

---

### 5.2 Grid Layout Hash Comparison
**FILE:** `components/LiveRoom.tsx`

**Problem:** Hash comparison on every save attempt

**Evidence:**
- Line 1976-1980: Creates hash string on every save
- Line 1983-1985: Compares hash to prevent duplicate saves
- Hash includes all slot data (profile_id, isPinned, isMuted)

**Impact:**
- String concatenation and sorting on every save attempt
- With frequent user actions, this runs often
- Minimal overhead but adds up

**SEVERITY:** 🟢 LOW - Good optimization, minimal cost

---

## CATEGORY 6: MEMORY LEAKS 🔴 CRITICAL

### 6.1 Tile Subscriptions Not Cleaned Up
**FILE:** `components/Tile.tsx`

**Problem:** Realtime subscriptions may not be cleaned up properly

**Evidence:**
- Line 1043-1071: `live_streams` subscription per tile
- Line 1074-1160: `gifts` subscription per tile
- Line 1068-1071: Cleanup in useEffect return
- **ISSUE:** If tile unmounts during async operation, cleanup may not fire

**Impact:**
- Orphaned subscriptions continue processing events
- Memory leak grows over time
- With 12 tiles remounting, subscriptions accumulate

**SEVERITY:** 🔴 CRITICAL - Potential memory leak

---

### 6.2 Event Listeners Not Cleaned Up
**FILE:** `components/LiveRoom.tsx`

**Problem:** Window event listeners may not be cleaned up

**Evidence:**
- Line 229: `window.addEventListener('resize', updatePanelMode)`
- Line 230: Cleanup in return
- Line 251: `window.addEventListener('resize', handleResize)`
- Line 252: Cleanup in return

**Verification Needed:** Ensure cleanup fires on unmount

**SEVERITY:** 🟡 MEDIUM - Standard pattern but verify

---

## ROOT CAUSE ANALYSIS

### Primary Lag Sources (Ranked):

1. **🔴 CRITICAL: Adaptive Streaming (3.1)**
   - Causes rotating lag as tiles switch quality
   - Matches user's description: "rotating lag, 1 cam lag then another"
   - **FIX:** Disable adaptive streaming, use fixed quality

2. **🔴 CRITICAL: High Bitrate + Simulcast (3.2, 3.3)**
   - 14.4 Mbps total bandwidth for 12 streams
   - 2× CPU load for encoding simulcast layers
   - **FIX:** Reduce bitrate to 600-800 kbps, consider single layer

3. **🔴 CRITICAL: Re-Render Storms (1.1)**
   - Every state update = 12 Tile re-renders
   - Realtime events trigger frequent updates
   - **FIX:** Memoize Tile component, use React.memo with deep comparison

4. **🔴 CRITICAL: Realtime Subscription Overhead (2.1)**
   - 28 active WebSocket channels
   - Each event processed by multiple handlers
   - **FIX:** Consolidate subscriptions, use module-level singletons

5. **🔴 CRITICAL: Tile Subscription Memory Leak (6.1)**
   - Orphaned subscriptions accumulate
   - Grows worse over time
   - **FIX:** Ensure cleanup with refs and abort controllers

---

## RECOMMENDED FIXES (Priority Order)

### IMMEDIATE (Do First):
1. **Disable Adaptive Streaming** - Line 451: `adaptiveStream: false`
2. **Reduce Video Bitrate** - Line 466: `videoBitrate: 600_000` (600 kbps)
3. **Remove Console Logs** - Strip all console.log from production builds
4. **Memoize Tile Component** - Wrap with React.memo and custom comparison

### HIGH PRIORITY (Do Next):
5. **Single Simulcast Layer** - Remove h180, keep only h360
6. **Fix Subscription Cleanup** - Add abort controllers to all subscriptions
7. **Consolidate Realtime Channels** - Reduce from 28 to ~10 channels
8. **Optimize LiveStreamers Updates** - Prevent unnecessary re-renders

### MEDIUM PRIORITY (Do After):
9. **Remove Time-Based Queries** - ViewerList line 352
10. **Optimize ViewerList Updates** - Skip re-render on heartbeat-only updates
11. **Batch Profile Queries** - Reduce N+1 queries on load

---

## VERIFICATION STEPS

After applying fixes:
1. Open DevTools Performance tab
2. Record 30 seconds with 12 tiles active
3. Check for:
   - Frame drops (should be <5% of frames)
   - Long tasks (should be <50ms)
   - Memory growth (should be flat after initial load)
4. Check Network tab:
   - Total bandwidth usage (should be <8 Mbps with 12 streams)
   - WebSocket frame count (should be <100 frames/minute at idle)
5. Visual test:
   - No rotating lag between cameras
   - Smooth video playback
   - No stuttering on chat messages

---

## CONCLUSION

The lag is caused by a **COMBINATION** of issues:
- **Adaptive streaming** causing quality switches (rotating lag)
- **High bitrate** causing bandwidth saturation
- **Re-render storms** causing UI lag
- **Subscription overhead** causing event processing lag

**Primary Fix:** Disable adaptive streaming and reduce bitrate.  
**Secondary Fix:** Optimize React re-renders with memoization.  
**Tertiary Fix:** Clean up subscriptions and reduce overhead.

