# Publishing Not Starting - Diagnostic Steps

## The Problem

You click "Go Live", see the camera preview in the modal, but after clicking "Start Live":
- Tracks are NOT publishing to LiveKit
- You appear as a "preview" placeholder instead of live
- No video/audio is transmitted

## Most Likely Causes (in order)

### 1. Room Not Connected Before Publishing Attempts
The LiveKit room must be fully connected BEFORE you can publish tracks.

**Check:** Open console and look for:
```
[ROOM] Room connected
Room state: connected
```

**If you DON'T see this:** The room connection is failing.

---

### 2. Device Permissions Not Granted
Browser blocked camera/microphone access.

**Check:** Look for error:
```
DOMException: Permission denied
NotAllowedError: Permission denied by system
```

**Fix:**
1. Click lock/camera icon in address bar
2. Reset permissions
3. Reload and allow when prompted

---

### 3. Tracks Created But Publishing Fails
Tracks are created but fail to publish to the room.

**Check:** Look for:
```
Tracks created: { count: 2, types: ['video', 'audio'] }
Publishing tracks to shared room...
```

Then look for errors after that line.

**Common errors:**
- `Failed to publish track: [reason]`
- `Room disconnected before publishing`
- `Track already published`

---

## Diagnostic Script

### Step 1: Check Room Connection BEFORE Going Live

Open console and run this **BEFORE** clicking "Go Live":

```javascript
console.log('=== PRE-PUBLISH CHECK ===');
console.log('Room exists:', !!window.sharedRoom);
console.log('Room state:', window.sharedRoom?.state);
console.log('Room connected:', window.sharedRoom?.state === 'connected');
console.log('Local participant:', window.sharedRoom?.localParticipant);
console.log('Local participant identity:', window.sharedRoom?.localParticipant?.identity);
console.log('Local participant can publish:', window.sharedRoom?.localParticipant?.permissions?.canPublish);
console.log('=== END PRE-PUBLISH CHECK ===');
```

**Expected output:**
```
Room exists: true
Room state: "connected"
Room connected: true
Local participant identity: "your-user-id"
Local participant can publish: true
```

**If room state is NOT "connected":**
- The issue is room connection, not publishing
- Check LiveKit credentials in Vercel
- Check network/firewall

---

### Step 2: Monitor Publishing Process

Open console, clear logs, then:

1. Click "Go Live"
2. Select camera/mic
3. Click "Start Live"
4. Watch console output

**Look for this sequence:**

```
✅ [PUBLISH] GoLive clicked { reason: ..., roomConnected: true }
✅ Creating tracks with options: { ... }
✅ Requesting tracks...
✅ Tracks created: { count: 2, types: ['video', 'audio'] }
✅ Publishing tracks to shared room...
✅ Publishing track: video
✅ Publishing track: audio
✅ Publishing verified: { cameraTracks: 1, microphoneTracks: 1 }
✅ [PUBLISH] Started publishing to LiveKit
```

**If you see "Room not connected. Cannot publish":**
- Room disconnected between page load and clicking "Start Live"
- Try refreshing page and going live immediately

**If you see "Already publishing, skipping...":**
- Previous session didn't clean up properly
- Refresh page completely
- Clear browser cache

**If tracks create but publishing fails:**
- Check for specific error message
- May be LiveKit server issue
- Check LiveKit dashboard

---

### Step 3: Check Publishing State After "Start Live"

Wait 5 seconds after clicking "Start Live", then run:

```javascript
console.log('=== POST-PUBLISH CHECK ===');
console.log('Room state:', window.sharedRoom?.state);
console.log('Local participant:', window.sharedRoom?.localParticipant);
console.log('Track publications:', window.sharedRoom?.localParticipant?.trackPublications?.size);
console.log('Published tracks:', 
  Array.from(window.sharedRoom?.localParticipant?.trackPublications?.values() || [])
    .map(p => ({
      kind: p.track?.kind,
      source: p.source,
      sid: p.trackSid,
      hasTrack: !!p.track,
      isMuted: p.isMuted,
    }))
);
console.log('=== END POST-PUBLISH CHECK ===');
```

**Expected output:**
```
Room state: "connected"
Track publications: 2
Published tracks: [
  { kind: "video", source: "camera", sid: "TR_xxx", hasTrack: true, isMuted: false },
  { kind: "audio", source: "microphone", sid: "TR_yyy", hasTrack: true, isMuted: false }
]
```

**If Track publications is 0:**
- Publishing never happened
- Check console for errors during Step 2

---

## Common Issues & Fixes

### Issue: "Permission denied" or "NotAllowedError"

**Problem:** Browser permissions blocked

**Fix:**
1. **Chrome/Edge:**
   - Click lock icon → Site settings
   - Camera: Allow
   - Microphone: Allow
   - Reload page

2. **Firefox:**
   - Click "i" icon → Permissions
   - Use Camera: Allow
   - Use Microphone: Allow
   - Reload page

3. **System Level (Windows):**
   - Settings → Privacy → Camera/Microphone
   - Enable for Chrome/Firefox

---

### Issue: Room state is "connecting" or "disconnecting"

**Problem:** Room never finishes connecting

**Check:**
1. LiveKit credentials in Vercel environment variables
2. Network connection / firewall
3. Browser console for WebSocket errors

**Fix:**
1. Verify `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` in Vercel
2. Try different network (mobile hotspot)
3. Disable VPN/proxy
4. Check browser console Network tab for failed WebSocket connections

---

### Issue: Tracks create but publishing fails with "Track already published"

**Problem:** Previous session didn't clean up

**Fix:**
1. Refresh page (F5)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Close and reopen browser
4. Try incognito/private mode

---

### Issue: Publishing works but "you" don't appear in grid

**Problem:** Different issue - tracks ARE published but not displayed

**This is the issue we fixed earlier.** If tracks are publishing (Step 3 shows 2 tracks) but you don't see yourself:
- Run the Tile diagnostic from `DEBUG_SELF_VIDEO.md`
- Check if you're in slot 1
- Check if Tile is finding your local participant

---

## Quick Fix Checklist

Before going live, verify:

- [ ] Browser console open and clear
- [ ] No VPN/proxy active
- [ ] Camera/mic permissions allowed
- [ ] No other apps using camera (Zoom, Teams, etc.)
- [ ] Run Step 1 diagnostic - room should be "connected"
- [ ] LiveKit credentials set in Vercel
- [ ] Recent deployment (no stale code)

Then:
- [ ] Click "Go Live"
- [ ] Camera preview shows in modal (you see yourself)
- [ ] Select correct camera/mic
- [ ] Click "Start Live"
- [ ] Watch console for publishing sequence (Step 2)
- [ ] Wait 5 seconds
- [ ] Run Step 3 diagnostic - should see 2 published tracks

---

## If Still Not Working

Gather this info:

1. **Output from Step 1** (Pre-publish check)
2. **ALL console output** from Step 2 (clicking "Start Live")
3. **Output from Step 3** (Post-publish check)
4. **Browser version** (e.g., Chrome 120)
5. **Any red error messages** in console
6. **Network tab** - screenshot of `/api/livekit/token` request

Share this and I can identify the exact problem.

---

## Emergency Reset

If completely stuck:

```javascript
// Run this in console to force clean state
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then try going live again from fresh state.

