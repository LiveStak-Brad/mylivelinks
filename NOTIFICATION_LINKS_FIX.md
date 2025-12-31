# Fix: Live Notification Links Should Go to Solo Stream

## Problem

When you go live on **Solo Live** (`/live/host`), followers receive notifications that take them to `/live` (group live room) instead of `/live/CannaStreams` (your solo stream page).

## Root Cause

The push notification system (likely Expo push notifications or Supabase Realtime) is sending a hardcoded link to `/live` when someone goes live, regardless of whether they're streaming in solo or group mode.

## Solution

The notification payload needs to include the **streamer's username** and **streaming_mode** so the notification can link to:
- **Solo streams**: `/live/{username}` (e.g., `/live/CannaStreams`)
- **Group streams**: `/live` (group room)

## Where to Fix

### Mobile App Deep Linking (Already Configured ✅)

`mobile/app.json` already has deep linking set up:
```json
{
  "pathPrefix": "/live"
}
```

This means URLs like `mylivelinks.com/live/CannaStreams` will open the mobile app correctly.

### Notification System (Needs Fix ❌)

The notification system is **NOT in this codebase**. It's likely:

1. **Expo Push Notification Service** - External service that sends push notifications
2. **Supabase Edge Function** - Server-side function triggered when `profiles.is_live` changes
3. **Database Trigger** - PostgreSQL trigger that fires when stream status changes
4. **Third-party notification service** (OneSignal, Firebase Cloud Messaging, etc.)

### What Needs to Change

Wherever the notification is sent, update the payload to include:

**Current (Incorrect)**:
```typescript
{
  title: "CannaStreams is live!",
  body: "Tap to watch the stream",
  data: {
    url: "/live"  // ❌ Always goes to group room
  }
}
```

**Fixed (Correct)**:
```typescript
{
  title: "CannaStreams is live!",
  body: "Tap to watch the stream",
  data: {
    url: streaming_mode === 'solo' 
      ? `/live/${username}`  // ✅ Goes to solo stream
      : `/live`              // ✅ Goes to group room
  }
}
```

## Temporary Workaround

Until the notification system is fixed, you can:

1. **Update Your Bio/Profile** to say "Streaming at mylivelinks.com/live/CannaStreams"
2. **Share Link Manually** - The share button in Solo Host Stream already uses the correct URL:
   ```typescript
   // mobile/screens/SoloHostStreamScreen.tsx line 394
   url: `https://www.mylivelinks.com/live/${encodeURIComponent(currentUser.username)}`
   ```
3. **Direct Followers** to follow the correct link in your social media posts

## Files to Check

### If Using Expo Push Notifications:
- Look for `expo-notifications` package usage
- Check for `sendPushNotificationAsync` calls
- Search for where notifications are triggered when `is_live` changes

### If Using Database Triggers:
- Check `supabase/migrations` for triggers on `profiles` or `live_streams` tables
- Look for functions that call external notification APIs
- Search for `pg_notify` or `NOTIFY` commands

### If Using Supabase Realtime:
- Check mobile app for Realtime subscriptions to `profiles` table
- Look for `.on('postgres_changes', ...)` listeners
- The mobile app code might be constructing the notification URL itself

## Database Changes Already Applied ✅

The database now has `streaming_mode` column in `live_streams` table:
- Solo streams: `streaming_mode = 'solo'`
- Group streams: `streaming_mode = 'group'`

This data can be used by the notification system to determine the correct link.

## Query to Get Notification Data

When sending notifications, use this query to get the correct information:

```sql
SELECT 
  p.username,
  p.display_name,
  ls.streaming_mode,
  CASE 
    WHEN ls.streaming_mode = 'solo' THEN '/live/' || p.username
    ELSE '/live'
  END as notification_url
FROM profiles p
JOIN live_streams ls ON ls.profile_id = p.id
WHERE p.is_live = true
  AND ls.live_available = true;
```

## Next Steps

1. **Identify where notifications are sent** (likely outside this codebase)
2. **Update notification payload** to use the correct URL based on `streaming_mode`
3. **Test both modes**:
   - Solo live → notification should go to `/live/CannaStreams`
   - Group live → notification should go to `/live`

---

**Note**: The actual notification service code is not in this repository. You'll need to check:
- Expo push notification dashboard/service
- Supabase Edge Functions (if deployed separately)
- Any third-party notification services configured for your app
