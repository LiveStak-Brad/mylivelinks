# Mobile App Dependencies - Complete Setup

## ✅ All Dependencies Installed (Ready for Rebuild)

### Core Dependencies
- **@expo/vector-icons** ^15.0.3 - Icon library
- **@livekit/react-native** ^2.9.6 - Live streaming & video calling
- **livekit-client** ^2.16.1 - LiveKit client SDK
- **@supabase/supabase-js** ^2.90.1 - Backend & real-time
- **expo** ~54.0.31 - Expo SDK
- **expo-dev-client** ~6.0.20 - Development client
- **react** 19.1.0 - React framework
- **react-native** 0.81.5 - React Native

### Navigation
- **@react-navigation/bottom-tabs** ^7.9.0
- **@react-navigation/native** ^7.1.26
- **@react-navigation/native-stack** ^7.9.0
- **react-native-gesture-handler** ^2.30.0
- **react-native-safe-area-context** ^5.6.2
- **react-native-screens** ^4.19.0

### Messaging Features
- **expo-image-picker** ^17.0.10 - Photo upload in DMs
- **expo-clipboard** ^8.0.8 - Copy/paste functionality

### Live Streaming & Calling
- **expo-camera** ^17.0.10 - Camera access & preview
- **expo-audio** ^1.1.1 - Audio playback (replaces expo-av)
- **expo-video** ^3.0.15 - Video playback (replaces expo-av)
- **expo-av** ^16.0.8 - Legacy audio/video (keeping for compatibility)

### Notifications & Push
- **expo-notifications** ^0.32.16 - Push notifications
- **expo-device** ^8.0.10 - Device info for push tokens

### Wallet & Monetization
- **expo-linking** ^8.0.11 - Deep linking for payment returns
- **expo-web-browser** ^15.0.10 - In-app browser for Stripe Connect

### Media & Files
- **expo-file-system** ^19.0.21 - File downloads & caching
- **expo-sharing** ^14.0.8 - Share content to other apps

### Location & Social
- **expo-location** ^19.0.8 - Location services for dating/nearby

### UI & Animations
- **react-native-reanimated** ^4.2.1 - Animations
- **react-native-worklets-core** ^1.6.2 - Worklets for animations
- **expo-haptics** ^15.0.8 - Haptic feedback
- **expo-status-bar** ~3.0.9 - Status bar styling

### Storage
- **@react-native-async-storage/async-storage** ^2.2.0 - Local storage

### Custom Modules
- **mll-video-filters** file:packages/mll-video-filters - Custom video filters

## Features Coverage

### ✅ Messaging
- Photo upload (expo-image-picker)
- Gift sending (Supabase + API)
- Real-time messages (Supabase realtime)
- Copy/paste (expo-clipboard)

### ✅ Live Streaming
- WebRTC streaming (@livekit/react-native)
- Camera access (expo-camera)
- Audio/video playback (expo-audio, expo-video)
- Custom video filters (mll-video-filters)

### ✅ Voice/Video Calling
- 1:1 calls (LiveKit)
- Group calls (LiveKit)
- Push notifications (expo-notifications)
- Camera/mic access (expo-camera, built into LiveKit)

### ✅ Wallet & Monetization
- Deep linking for payments (expo-linking)
- Stripe Connect onboarding (expo-web-browser)
- Coin balance display (Supabase)
- Transaction history (Supabase)

### ✅ Social Features
- Location services (expo-location)
- Share content (expo-sharing)
- File downloads (expo-file-system)

### ✅ Notifications
- Push notifications (expo-notifications)
- Device tokens (expo-device)
- Deep linking (expo-linking)

## Native Modules Requiring Rebuild

The following packages require native code and need a rebuild:
1. **expo-image-picker** - Photo library access
2. **expo-camera** - Camera access
3. **expo-notifications** - Push notifications
4. **expo-location** - Location services
5. **expo-audio** - Audio playback
6. **expo-video** - Video playback
7. **expo-file-system** - File system access
8. **expo-sharing** - Share functionality
9. **expo-device** - Device info

## Rebuild Command

```bash
cd apps/mobile
npx expo run:ios
```

This will:
1. Run `expo prebuild` to generate native iOS project
2. Install all native modules (CocoaPods)
3. Build and install the app on iOS device/simulator
4. Start Metro bundler

## Post-Rebuild Verification

After rebuild, verify these features work:
- [ ] Photo upload in messages
- [ ] Camera access for live streaming
- [ ] Push notifications
- [ ] Location services (if using dating features)
- [ ] Audio/video playback
- [ ] File downloads
- [ ] Share functionality

## Notes

- **expo-av** is deprecated but kept for backward compatibility
- **expo-audio** and **expo-video** are the new replacements
- All Expo SDK 54 compatible packages
- No additional rebuilds needed after this one
- LiveKit handles WebRTC internally, no additional packages needed

## Total Dependencies: 44

All dependencies are now installed and ready for a single rebuild.
