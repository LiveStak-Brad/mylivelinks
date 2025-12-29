# Debug Self-Video Issue

## Step 1: Open Browser Console

1. Navigate to your site: https://yourdomain.com/live
2. Press `F12` to open Developer Tools
3. Click the **Console** tab
4. Clear any existing logs (click the 🚫 icon)

## Step 2: Go Live

1. Click **"Go Live"** button
2. Select your camera and microphone  
3. Click **"Start Live"**

## Step 3: Check Console Logs

### Look for these messages (in order):

#### ✅ **Token & Connection:**
```
[TOKEN] Requesting token: { ... }
[TOKEN] fetched token { hasToken: true, hasUrl: true }
[ROOM] Token received
[ROOM] Room connected
```
**If you DON'T see these:** LiveKit connection failed. Check environment variables.

#### ✅ **Publishing:**
```
[PUBLISH] GoLive clicked
Creating tracks with options: { hasAudioDevice: true, hasVideoDevice: true }
Requesting tracks...
Tracks created: { count: 2, types: ['video', 'audio'] }
Publishing tracks to shared room...
Publishing track: video
Publishing track: audio
Publishing verified: { cameraTracks: 1, microphoneTracks: 1 }
[PUBLISH] Started publishing to LiveKit
Started publishing to LiveKit
```
**If you DON'T see these:** Publishing failed. Note the error message.

#### ✅ **Slot Assignment:**
```
Loading streamer for viewer: <your-id> <stream-id> 1
Added streamer to slot: 1 <your-username>
```
**If you DON'T see this:** You weren't added to slot 1.

#### ✅ **Tile Subscription:**
```
[SUB] subscribe attempt { slotIndex: 1, streamerId: '<your-id>', isCurrentUser: false/true }
[SUB] Found LOCAL participant (self) for tile: { slotIndex: 1, streamerId: '<your-id>' }
[SUB] Attaching LOCAL track to tile: { slotIndex: 1, kind: "video" }
[SUB] Attaching LOCAL track to tile: { slotIndex: 1, kind: "audio" }
```
**If you DON'T see these:** Tile isn't finding your local tracks.

## Step 4: Check Room State

After going live, run this in console:

```javascript
// Copy and paste this into the console
console.log('=== ROOM STATE ===');
console.log('Room:', window.sharedRoom || 'Not found');
console.log('Local Participant:', window.sharedRoom?.localParticipant);
console.log('Published Tracks:', 
  Array.from(window.sharedRoom?.localParticipant?.trackPublications?.values() || [])
    .map(p => ({ 
      kind: p.track?.kind, 
      source: p.source, 
      sid: p.trackSid,
      hasTrack: !!p.track 
    }))
);
console.log('Local Participant Identity:', window.sharedRoom?.localParticipant?.identity);
```

**Expected output:**
```
Published Tracks: [
  { kind: "video", source: "camera", sid: "TR_xxx", hasTrack: true },
  { kind: "audio", source: "microphone", sid: "TR_yyy", hasTrack: true }
]
```

## Step 5: Check Tile State

After going live, run this:

```javascript
// Find your tile (slot 1)
const tiles = document.querySelectorAll('[data-slot-index="1"]');
console.log('Slot 1 Tiles:', tiles.length);

// Check video element
const videoEl = document.querySelector('[data-slot-index="1"] video');
console.log('Video Element:', videoEl);
console.log('Video srcObject:', videoEl?.srcObject);
console.log('Video tracks:', videoEl?.srcObject?.getTracks?.());
console.log('Video readyState:', videoEl?.readyState);
console.log('Video paused:', videoEl?.paused);
```

**Expected output:**
```
Video Element: <video>
Video srcObject: MediaStream
Video tracks: [VideoTrack, AudioTrack]
Video readyState: 4 (HAVE_ENOUGH_DATA)
Video paused: false
```

## Common Issues & What They Mean

### Issue 1: No `[PUBLISH]` Logs
**Problem:** Publishing never started
**Check:**
- Did the device modal show your camera preview?
- Did you see any errors when clicking "Start Live"?
- Check for: `Permission denied` or `NotAllowedError`

**Solution:** Camera permissions blocked. Reset browser permissions.

---

### Issue 2: Publishing logs show but no `[SUB]` logs
**Problem:** Tile isn't trying to subscribe
**Check:**
- Is there a tile in slot 1?
- Does it show your username?
- Run: `document.querySelector('[data-slot-index="1"]')`

**Solution:** You weren't added to the grid. Check `ensureUserInSlot1` logic.

---

### Issue 3: `[SUB]` shows but NOT "Found LOCAL participant"
**Problem:** Tile is looking for remote participant instead of local
**Check:**
- What is `streamerId` in the `[SUB]` log?
- What is `window.sharedRoom?.localParticipant?.identity`?
- Do they match?

**Solution:** Identity mismatch. The `streamerId` prop doesn't match your actual participant identity.

---

### Issue 4: "Found LOCAL participant" but NO "Attaching LOCAL track"
**Problem:** Local participant found but has no published tracks
**Check:**
- Run the "Check Room State" script above
- Look at `Published Tracks` - should have 2 items
- If empty, tracks weren't published

**Solution:** Publishing didn't actually work. Check for errors in publishing phase.

---

### Issue 5: "Attaching LOCAL track" shows but video is still black
**Problem:** Track attached but video element not rendering
**Check:**
- Run the "Check Tile State" script above
- Check `Video srcObject` - should be `MediaStream`, not `null`
- Check `Video readyState` - should be `4`
- Check `Video paused` - should be `false`

**Solution:** 
- If `srcObject` is null: Track attachment failed
- If `readyState` is 0-3: Video is loading, wait a few seconds
- If `paused` is true: Video element not auto-playing

---

## Step 6: Enable Debug Mode

If still not working, enable full debug logging:

1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Add: `NEXT_PUBLIC_DEBUG_LIVEKIT=1`
4. Redeploy
5. Try again and check console for detailed `[DEBUG]` logs

---

## Step 7: Report Issue

If you've tried everything and it's still not working, gather:

1. **Browser & Version:** (e.g., Chrome 120, Firefox 121)
2. **Console Logs:** Copy ALL console output from Step 2
3. **Room State:** Output from Step 4
4. **Tile State:** Output from Step 5
5. **Any Errors:** Red error messages in console

Share this info for further debugging.

---

## Quick Test Script

Run this after going live to get all diagnostic info at once:

```javascript
console.log('=== DIAGNOSTIC REPORT ===');
console.log('1. Room Connected:', !!window.sharedRoom);
console.log('2. Room State:', window.sharedRoom?.state);
console.log('3. Local Participant Identity:', window.sharedRoom?.localParticipant?.identity);
console.log('4. Published Tracks:', 
  Array.from(window.sharedRoom?.localParticipant?.trackPublications?.values() || [])
    .map(p => ({ kind: p.track?.kind, source: p.source, hasTrack: !!p.track }))
);
console.log('5. Slot 1 Exists:', !!document.querySelector('[data-slot-index="1"]'));
console.log('6. Video Element:', !!document.querySelector('[data-slot-index="1"] video'));
console.log('7. Video srcObject:', document.querySelector('[data-slot-index="1"] video')?.srcObject);
console.log('8. Video Playing:', !document.querySelector('[data-slot-index="1"] video')?.paused);
console.log('=== END REPORT ===');
```

Copy the output and check for `false` or `null` values - those indicate the problem.

