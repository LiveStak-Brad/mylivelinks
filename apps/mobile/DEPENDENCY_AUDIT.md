# Mobile App Comprehensive Dependency Audit

## Current Dependencies (Installed)
```json
{
  "@expo/vector-icons": "^15.0.3",
  "@livekit/react-native": "^2.9.6",
  "@react-native-async-storage/async-storage": "^2.2.0",
  "@react-navigation/bottom-tabs": "^7.9.0",
  "@react-navigation/native": "^7.1.26",
  "@react-navigation/native-stack": "^7.9.0",
  "@supabase/supabase-js": "^2.90.1",
  "expo": "~54.0.31",
  "expo-av": "^16.0.8",
  "expo-dev-client": "~6.0.20",
  "expo-haptics": "^15.0.8",
  "expo-image-picker": "^17.0.10",
  "expo-status-bar": "~3.0.9",
  "livekit-client": "^2.16.1",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "react-native-gesture-handler": "^2.30.0",
  "react-native-reanimated": "^4.2.1",
  "react-native-safe-area-context": "^5.6.2",
  "react-native-screens": "^4.19.0",
  "react-native-worklets-core": "^1.6.2"
}
```

## Feature Requirements Analysis

### ✅ Messaging (Complete)
- **expo-image-picker** ✅ - Photo upload in DMs
- **@supabase/supabase-js** ✅ - Real-time messaging, storage
- **@react-navigation** ✅ - Navigation to threads

### ✅ Live Streaming (Complete)
- **@livekit/react-native** ✅ - WebRTC for live streaming
- **livekit-client** ✅ - LiveKit client SDK
- **expo-av** ✅ - Audio/video handling (deprecated but still works)
- **react-native-reanimated** ✅ - Animations for overlays
- **expo-haptics** ✅ - Haptic feedback

### ⚠️ Voice/Video Calling (Needs Review)
**Current Status:** LiveKit is already installed for live streaming
- **@livekit/react-native** ✅ - Can be used for 1:1 calls
- **livekit-client** ✅ - Client SDK

**Missing for Enhanced Calling:**
- **expo-camera** ❌ - Camera permissions and preview (if not using LiveKit's built-in)
- **expo-media-library** ❌ - Save recordings (optional)
- **expo-notifications** ❌ - Call notifications (push notifications)

**Decision:** LiveKit handles camera/mic internally. Only need notifications for incoming calls.

### ⚠️ Wallet/Monetization (Missing)
**Web uses:** Stripe, coin balance display, transactions
**Mobile needs:**
- **expo-linking** ❌ - Deep linking for payment returns
- **expo-web-browser** ❌ - In-app browser for Stripe Connect onboarding
- **@stripe/stripe-react-native** ❌ - Native Stripe SDK (if doing native payments)

**Decision:** For MVP, can use web views. Native Stripe SDK optional.

### ⚠️ Media Handling (Partial)
**Current:**
- **expo-image-picker** ✅ - Image selection
- **expo-av** ✅ - Video playback (deprecated)

**Missing:**
- **expo-video** ❌ - New video player (replaces expo-av)
- **expo-audio** ❌ - New audio player (replaces expo-av)
- **expo-file-system** ❌ - File downloads, caching
- **expo-sharing** ❌ - Share media to other apps
- **expo-document-picker** ❌ - Pick documents (if needed)

### ⚠️ Social Features (Missing)
- **expo-contacts** ❌ - Import contacts (if needed)
- **expo-calendar** ❌ - Add events (if needed)
- **expo-location** ❌ - Location services (for dating/nearby)
- **expo-clipboard** ❌ - Copy/paste functionality

### ⚠️ Notifications (Missing)
- **expo-notifications** ❌ - Push notifications
- **expo-device** ❌ - Device info for push tokens

### ⚠️ Analytics/Tracking (Missing)
- **expo-tracking-transparency** ❌ - iOS ATT prompt
- **expo-application** ❌ - App version info

## Recommended Dependencies to Install Now

### High Priority (Install Before Rebuild)
```bash
# Notifications (for calls, messages, etc)
expo-notifications
expo-device

# Deep linking (for payment returns, share links)
expo-linking

# Web browser (for Stripe Connect, OAuth)
expo-web-browser

# File system (for caching, downloads)
expo-file-system

# Sharing (share content to other apps)
expo-sharing

# Clipboard (copy/paste)
expo-clipboard

# New media players (replace deprecated expo-av)
expo-video
expo-audio
```

### Medium Priority (Can add later if needed)
```bash
# Camera (if not using LiveKit's built-in)
expo-camera

# Location (for dating/nearby features)
expo-location

# Contacts (for invite friends)
expo-contacts

# Document picker (for file uploads)
expo-document-picker

# Media library (save photos/videos)
expo-media-library
```

### Low Priority (Optional)
```bash
# Native Stripe (if doing native payments)
@stripe/stripe-react-native

# Calendar (for event scheduling)
expo-calendar

# Tracking transparency (iOS ATT)
expo-tracking-transparency

# Application info (version, build)
expo-application
```

## Installation Command (High Priority Only)

```bash
cd apps/mobile
npm install \
  expo-notifications \
  expo-device \
  expo-linking \
  expo-web-browser \
  expo-file-system \
  expo-sharing \
  expo-clipboard \
  expo-video \
  expo-audio
```

## Notes

1. **expo-av is deprecated** - SDK 54 warning says to use expo-video and expo-audio instead
2. **LiveKit handles camera/mic** - No need for expo-camera unless doing custom camera UI
3. **Stripe native SDK** - Can defer until native payment flows are needed
4. **All Expo packages** - Compatible with Expo 54 dev-client, no rebuild needed after install
5. **Push notifications** - Will need native rebuild for expo-notifications

## Rebuild Required After Installing?

**YES** - Only for:
- `expo-notifications` (requires native modules for push)
- `expo-camera` (if added)
- `expo-location` (if added)

**NO** - These work without rebuild in dev-client:
- `expo-linking` (already in Expo SDK)
- `expo-web-browser`
- `expo-file-system`
- `expo-sharing`
- `expo-clipboard`
- `expo-video`
- `expo-audio`
- `expo-device`

## Final Recommendation

**Install all high-priority dependencies now, then do ONE rebuild to include:**
1. expo-image-picker (already installed)
2. expo-notifications (for push)
3. expo-camera (if needed for custom camera UI)
4. expo-location (if needed for dating/nearby)

This minimizes rebuilds to just ONE more after the current rebuild.
