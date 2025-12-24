# Broadcaster Self-View Video Troubleshooting

## Issue: Video Not Showing for Yourself on Web

When you click "Go Live", you should see yourself in the grid just like viewers see you. If your video isn't showing, follow these troubleshooting steps:

---

## Quick Fixes (Try These First)

### 1. **Check Browser Console for Errors**
1. Press `F12` to open Developer Tools
2. Click on the "Console" tab
3. Look for errors containing:
   - `[PUBLISH]` - Publishing issues
   - `[SUB]` - Subscription issues
   - `Failed to attach` - Track attachment issues
   - `Permission denied` - Camera/mic permissions

### 2. **Verify Camera/Microphone Permissions**
- **Chrome/Edge**: Look for camera icon in address bar
- **Firefox**: Look for red dot or camera icon
- Click the icon and ensure permissions are set to "Allow"
- If blocked, you'll need to reset permissions:
  - Chrome: `chrome://settings/content/camera`
  - Firefox: `about:preferences#privacy`

### 3. **Check LiveKit Connection**
Open console and look for these messages:
```
[ROOM] Token received
[ROOM] Room connected
[PUBLISH] Started publishing to LiveKit
[SUB] Found LOCAL participant (self) for tile
[SUB] Attaching LOCAL track to tile
```

If you don't see these messages, there's an issue with the connection.

---

## Common Issues & Solutions

### Issue 1: "Room not connected" Error

**Symptoms:**
- Console shows: `Room not connected. Cannot publish.`
- Go Live button shows "Stop Live" but you're not actually live

**Causes:**
- LiveKit credentials not configured
- Network connection issues
- Token generation failed

**Solutions:**

1. **Verify Environment Variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Check these are set for ALL environments (Production, Preview, Development):
     ```
     LIVEKIT_URL=wss://your-project.livekit.cloud
     LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxx
     LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     ```
   - After updating, **redeploy your site**

2. **Check Network Tab:**
   - Open DevTools → Network tab
   - Look for request to `/api/livekit/token`
   - Status should be `200 OK`
   - Response should have `token` and `url` fields

3. **Clear Browser Cache:**
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Clear "Cached images and files"
   - Reload the page

---

### Issue 2: Video Preview Works, But Goes Black After Clicking "Start Live"

**Symptoms:**
- Camera preview shows in the device selection modal
- After clicking "Start Live", video disappears
- Console shows publishing started but no video track

**Causes:**
- Tracks not being attached to the tile
- LocalTrackPublished event not firing
- Track creation race condition

**Solutions:**

1. **Enable Debug Logging:**
   - Add this to your Vercel environment variables:
     ```
     NEXT_PUBLIC_DEBUG_LIVEKIT=1
     ```
   - Redeploy and try again
   - Check console for detailed logs

2. **Wait for Full Connection:**
   - After clicking "Go Live", wait 5-10 seconds
   - The system has retry logic that checks for tracks every 500ms
   - You should see your video appear within 10 seconds

3. **Refresh and Try Again:**
   - Sometimes the first attempt fails due to timing
   - Click "Stop Live"
   - Wait 5 seconds
   - Click "Go Live" again

---

### Issue 3: Audio Works But No Video (or Vice Versa)

**Symptoms:**
- You can hear yourself but not see yourself
- OR you can see yourself but not hear yourself

**Causes:**
- One track failed to publish
- Device permissions partially granted
- Hardware device issue

**Solutions:**

1. **Check Device Selection:**
   - When the device modal appears, verify both camera AND microphone are selected
   - Try selecting different devices from the dropdowns
   - Look for "Default" devices if available

2. **Check Browser Permissions:**
   - Some browsers grant camera OR microphone separately
   - Try this: `navigator.mediaDevices.getUserMedia({video: true, audio: true})`
   - If it prompts for permissions, allow both

3. **Check Track Publications:**
   - Open console after going live
   - Look for: `Publishing verified: { cameraTracks: 1, microphoneTracks: 1 }`
   - If either is 0, that track failed to publish

---

### Issue 4: Video Shows for a Second Then Disappears

**Symptoms:**
- Video flashes briefly then goes black
- Console shows repeated subscribe/unsubscribe messages
- Grid keeps reloading

**Causes:**
- Infinite loop in realtime subscriptions (should be fixed now)
- Object reference instability
- Heartbeat cleanup triggering too often

**Solutions:**

1. **This Should Be Fixed:**
   - The code has been updated to handle this issue
   - The local participant track listener now properly persists

2. **If Still Happening:**
   - Check console for repeated messages like:
     ```
     [SUB] Track unsubscribed
     [SUB] Track subscribed
     ```
   - This indicates a deeper issue with LiveKit state management

3. **Clear Application Data:**
   - DevTools → Application tab → Storage → Clear site data
   - Reload the page
   - Try going live again

---

### Issue 5: "Permission Denied" or "NotAllowedError"

**Symptoms:**
- Modal shows error: "Failed to access camera/microphone"
- Console shows: `DOMException: Permission denied`

**Causes:**
- Browser permissions blocked
- Camera/mic in use by another app
- Hardware access restricted

**Solutions:**

1. **Reset Browser Permissions:**
   - **Chrome/Edge:**
     - Click lock icon in address bar
     - Click "Reset permissions"
     - Reload page and allow when prompted
   
   - **Firefox:**
     - Click "i" icon in address bar
     - Find "Use the Camera" and "Use the Microphone"
     - Set both to "Allow"

2. **Close Other Apps Using Camera:**
   - Zoom, Teams, Skype, OBS, etc.
   - Even other browser tabs can block access
   - Restart browser if necessary

3. **Check System Settings:**
   - **Windows:** Settings → Privacy → Camera/Microphone
   - **Mac:** System Preferences → Security & Privacy → Camera/Microphone
   - Ensure browser has access

---

## Advanced Debugging

### Enable Full Debug Logging

Add these environment variables in Vercel:
```bash
NEXT_PUBLIC_DEBUG_LIVEKIT=1
```

Then check console for detailed logs showing:
- `[ROOM]` - Room connection state
- `[PUBLISH]` - Publishing attempts and results
- `[SUB]` - Track subscriptions
- `[DEBUG]` - Detailed track attachment info

### Check Local Participant State

Open console and run:
```javascript
// After going live, inspect the room
console.log('Local Participant:', room.localParticipant);
console.log('Published Tracks:', 
  Array.from(room.localParticipant.trackPublications.values())
    .map(p => ({ kind: p.track?.kind, source: p.source, sid: p.trackSid }))
);
```

Expected output:
```javascript
Published Tracks: [
  { kind: "video", source: "camera", sid: "TR_xxxx" },
  { kind: "audio", source: "microphone", sid: "TR_yyyy" }
]
```

### Check Tile Subscription

After going live, check if your tile is trying to subscribe:
```javascript
// Find your tile in the grid (usually slot 1)
// Check console for logs like:
[SUB] Found LOCAL participant (self) for tile: { slotIndex: 1, ... }
[SUB] Attaching LOCAL track to tile: { slotIndex: 1, kind: "video" }
[SUB] Attaching LOCAL track to tile: { slotIndex: 1, kind: "audio" }
```

If you DON'T see "Attaching LOCAL track", the tile isn't finding your published tracks.

---

## The Fix Applied

The issue was in `components/Tile.tsx`. The code was:

**Before (BROKEN):**
```typescript
if (sharedRoom.localParticipant && sharedRoom.localParticipant.identity === streamerId) {
  // ... attach local tracks ...
  return; // ❌ This returned BEFORE setting up event listeners
}
```

**After (FIXED):**
```typescript
if (sharedRoom.localParticipant && sharedRoom.localParticipant.identity === streamerId) {
  // ... attach local tracks ...
  isLocalParticipant = true;
  // ✅ DON'T return yet - we need to set up listeners
}

// If we already handled local participant, skip remote check
if (isLocalParticipant) {
  return foundParticipant;
}

// ... continue to set up event listeners ...

// ✅ NEW: Listen for local track publications
sharedRoom.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
```

This ensures:
1. Local tracks are attached immediately if they exist
2. Event listeners are set up to catch tracks published AFTER the tile mounts
3. The `LocalTrackPublished` event re-checks for tracks when you go live

---

## Expected Flow When Going Live

### Correct Sequence:
1. Click "Go Live" button
2. Device selection modal appears
3. Camera preview shows (you see yourself)
4. Select camera and microphone
5. Click "Start Live"
6. Modal closes
7. **Publishing starts** (console: `[PUBLISH] Started publishing`)
8. **Tracks attach** (console: `[SUB] Attaching LOCAL track`)
9. **You appear in slot 1** of the grid
10. Button shows "🔴 LIVE"

### Timeline:
- Device preview: **immediate**
- Publishing start: **1-2 seconds** after clicking "Start Live"
- Video appears: **2-5 seconds** after publishing starts
- Total time to see yourself: **3-7 seconds** from clicking "Start Live"

---

## Still Not Working?

If you've tried everything above and still can't see your video:

### 1. Check Browser Compatibility
- **Supported:** Chrome 74+, Firefox 88+, Safari 15+, Edge 88+
- **Not Supported:** Internet Explorer, old mobile browsers

### 2. Try a Different Browser
- Sometimes specific browser versions have WebRTC bugs
- Chrome and Edge (Chromium) work best

### 3. Check LiveKit Dashboard
- Go to https://cloud.livekit.io
- Navigate to your project
- Click "Rooms" → "live_central"
- Check if you appear as a participant
- Verify you have published tracks

### 4. Network Issues
- LiveKit requires WebSocket (WSS) connections
- Some corporate firewalls block WebSockets
- Try from a different network (mobile hotspot, home, etc.)

### 5. Contact Support
If none of the above works, gather this info:
- Browser version (Chrome 119, Firefox 120, etc.)
- Console errors (copy full error messages)
- Network tab screenshot showing `/api/livekit/token` request
- LiveKit dashboard screenshot showing your participant

---

## Testing the Fix

To verify the fix is working:

1. Open the site and navigate to `/live`
2. Open browser console (F12)
3. Click "Go Live"
4. Select your camera and microphone
5. Click "Start Live"
6. Watch the console for these messages:
   ```
   [PUBLISH] Started publishing to LiveKit
   [SUB] Found LOCAL participant (self) for tile: { slotIndex: 1 }
   [SUB] Attaching LOCAL track to tile: { slotIndex: 1, kind: "video" }
   [SUB] Attaching LOCAL track to tile: { slotIndex: 1, kind: "audio" }
   ```
7. You should see yourself in the top-left tile within 5 seconds

**Success Criteria:**
- ✅ Video shows in tile within 5 seconds
- ✅ Audio is working (mute/unmute button responds)
- ✅ No console errors
- ✅ Button shows "🔴 LIVE"

---

## Prevention Tips

To avoid this issue in the future:

1. **Always test in production environment** - Development can behave differently
2. **Keep LiveKit client updated** - Check for updates to `livekit-client` package
3. **Monitor browser console** - Watch for warnings during development
4. **Test on multiple browsers** - Chrome, Firefox, Safari
5. **Test on different devices** - Desktop, laptop, different cameras

---

## Related Files

Files modified to fix this issue:
- `components/Tile.tsx` - Fixed local participant track attachment and event listeners

Related files you might need to check:
- `hooks/useLiveKitPublisher.ts` - Publishing logic
- `components/GoLiveButton.tsx` - Device selection and publishing trigger
- `components/LiveRoom.tsx` - Room connection and grid management
- `lib/livekit-constants.ts` - LiveKit configuration

---

## Summary

**The Problem:** When you went live, your local video tracks were being attached to your tile, but the event listeners weren't being set up because of an early `return` statement. This meant if tracks were published after the tile mounted (which is common), they would never be attached.

**The Solution:** Removed the early return and added a `LocalTrackPublished` event listener that re-checks for tracks whenever the local participant publishes. This ensures your video shows up whether tracks are published before or after the tile mounts.

**Expected Result:** You should now see your own video within 5 seconds of clicking "Start Live", just like viewers see you.

