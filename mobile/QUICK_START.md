# Quick Start Guide - MyLiveLinks Mobile

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- iOS Simulator (Mac) or Android Emulator
- OR Expo Go app on physical device

## Installation (2 minutes)

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# (Optional) Enable debug mode
echo "EXPO_PUBLIC_DEBUG_LIVE=1" > .env
```

## Run the App (30 seconds)

```bash
# Start Expo dev server
npm start
```

Then choose your platform:
- Press **`i`** for iOS Simulator
- Press **`a`** for Android Emulator  
- Scan QR code with **Expo Go** app on your phone

## What You'll See

1. **Black screen with 12 empty tiles** (4 across × 3 down)
2. **"Available" placeholders** in each tile
3. **Debug pill** in bottom-left (if debug mode enabled)

## Try the Swipes

- **Swipe UP** from anywhere → Chat overlay appears from bottom
- **Swipe DOWN** from anywhere → Viewers/Leaderboards overlay appears from top
- **Swipe RIGHT** from anywhere → Menu overlay slides in from right
- **Swipe LEFT** from anywhere → Stats overlay slides in from left

## Dismiss Overlays

- **Chat**: Swipe DOWN or tap outside
- **Viewers**: Swipe UP or tap outside
- **Menu**: Swipe LEFT or tap X button
- **Stats**: Swipe RIGHT or tap X button

## Verify Stability

1. Open any overlay
2. **Notice**: Grid stays visible behind (doesn't disappear)
3. Close overlay
4. **Notice**: Grid didn't flicker or reload
5. Try opening different overlays
6. **Notice**: Only one overlay open at a time

✅ If all of the above works, the scaffolding is working correctly!

## Debug Mode

With `EXPO_PUBLIC_DEBUG_LIVE=1` in `.env`, you'll see a small pill showing:

```
Overlay: chat | Tiles: 0 | 🔴
```

This shows:
- **Overlay**: Current active overlay (or `none`)
- **Tiles**: Number of participants (currently 0)
- **Status**: 🟢 connected / 🔴 disconnected

## Test with Mock Data (Optional)

To see the grid with mock participants:

1. Open `mobile/hooks/useLiveRoomParticipants.ts`
2. Find the commented lines in `useEffect`:
   ```typescript
   // Uncomment to test with mock data:
   // setParticipants(mockParticipants);
   // setIsConnected(true);
   ```
3. Uncomment those lines
4. Save and reload app
5. You should see 2 tiles with "Streamer1" and "Streamer2"

## Troubleshooting

### "Expo command not found"
```bash
npm install -g expo-cli
```

### "Metro bundler error"
```bash
# Clear cache and restart
npm start -- --clear
```

### "Gestures not working"
- Make sure you're swiping on the grid area (not on an overlay)
- Swipe with some velocity (not too slow)
- Check that no overlay is already open

### "Overlays not showing"
- Check console for errors
- Verify `expo-blur` is installed
- Try on different device (blur may not work on all Android devices)

### "Grid keeps remounting"
- This shouldn't happen! If it does, check that Grid12 is not inside a conditional render
- Look for `{condition && <Grid12 />}` patterns (there shouldn't be any)

## Next Steps

### For UI Development
- Customize overlay styles in `mobile/overlays/*.tsx`
- Modify tile layout in `mobile/components/live/Tile.tsx`
- Add more UI state in `mobile/state/liveRoomUI.ts`

### For Streaming Integration
- Replace `mobile/hooks/useLiveRoomParticipants.ts` with real LiveKit logic
- Add video track rendering in `mobile/components/live/Tile.tsx`
- Connect to Supabase for real-time data

### For Feature Development
- Add navigation (React Navigation)
- Implement purchase flows
- Add authentication
- Build profile screens

## File Structure Reference

```
mobile/
├── App.tsx                    # Start here - entry point
├── screens/
│   └── LiveRoomScreen.tsx     # Main screen logic
├── components/
│   └── live/
│       ├── Grid12.tsx         # Grid layout
│       └── Tile.tsx           # Tile UI
├── overlays/
│   ├── ChatOverlay.tsx        # Swipe up
│   ├── ViewersLeaderboardsOverlay.tsx  # Swipe down
│   ├── MenuOverlay.tsx        # Swipe right
│   └── StatsOverlay.tsx       # Swipe left
├── state/
│   └── liveRoomUI.ts          # State management
└── hooks/
    └── useLiveRoomParticipants.ts  # Streaming hook
```

## Common Commands

```bash
# Start dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Type check
npm run type-check

# Lint (if configured)
npm run lint

# Clear cache
npm start -- --clear
```

## Resources

- **Expo Docs**: https://docs.expo.dev
- **React Native Docs**: https://reactnative.dev
- **Reanimated Docs**: https://docs.swmansion.com/react-native-reanimated
- **Gesture Handler Docs**: https://docs.swmansion.com/react-native-gesture-handler

## Need Help?

1. Check `mobile/README.md` for detailed setup
2. Read `mobile/IMPLEMENTATION_GUIDE.md` for architecture
3. Review `mobile/ARCHITECTURE_DIAGRAM.md` for visual diagrams
4. Look at inline code comments

## Success Criteria ✅

You're ready to develop when:
- [ ] App launches without errors
- [ ] All 4 swipe gestures work
- [ ] Overlays appear/disappear smoothly
- [ ] Grid stays mounted (doesn't flicker)
- [ ] Only one overlay open at a time
- [ ] Debug pill shows correct state

**Estimated time to success: 5 minutes** ⏱️

