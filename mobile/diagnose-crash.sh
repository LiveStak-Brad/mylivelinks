#!/bin/bash
# Mobile App Crash Diagnostic Script
# Run this to capture crash logs

echo "================================"
echo "Mobile Crash Diagnostic Tool"
echo "================================"
echo ""

# Check platform
echo "What platform are you testing?"
echo "1) Android (physical device)"
echo "2) Android (emulator)"
echo "3) iOS (physical device)"
echo "4) iOS (simulator)"
echo ""
read -p "Enter number (1-4): " platform

echo ""
echo "================================"
echo "Step 1: Verify .env file"
echo "================================"
cd mobile

if [ ! -f ".env" ]; then
    echo "❌ ERROR: .env file not found!"
    exit 1
fi

echo "✅ .env file exists"
echo ""
echo "Contents:"
cat .env | grep "EXPO_PUBLIC"
echo ""

# Check for required vars
if ! grep -q "EXPO_PUBLIC_SUPABASE_URL" .env; then
    echo "❌ ERROR: EXPO_PUBLIC_SUPABASE_URL missing!"
    exit 1
fi

if ! grep -q "EXPO_PUBLIC_SUPABASE_ANON_KEY" .env; then
    echo "❌ ERROR: EXPO_PUBLIC_SUPABASE_ANON_KEY missing!"
    exit 1
fi

echo "✅ Required environment variables present"
echo ""

# Capture logs based on platform
echo "================================"
echo "Step 2: Capture Crash Logs"
echo "================================"

if [ "$platform" = "1" ] || [ "$platform" = "2" ]; then
    echo "Android selected - Setting up logcat..."
    echo ""
    echo "Please follow these steps:"
    echo ""
    echo "1. In a NEW terminal, run:"
    echo "   adb logcat -c"
    echo "   adb logcat *:S ReactNative:V ReactNativeJS:V Expo:V AndroidRuntime:E"
    echo ""
    echo "2. Launch the app"
    echo "3. When it crashes, copy the crash logs and paste them here"
    echo ""
    echo "4. Look for lines containing:"
    echo "   - FATAL EXCEPTION"
    echo "   - ReactNativeJS"
    echo "   - Error:"
    echo ""
    
elif [ "$platform" = "3" ] || [ "$platform" = "4" ]; then
    echo "iOS selected - Checking for crash logs..."
    echo ""
    echo "Please follow these steps:"
    echo ""
    echo "1. Open Console.app (or Xcode > Window > Devices & Simulators > View Device Logs)"
    echo "2. Launch the app"
    echo "3. When it crashes, look for the crash report"
    echo "4. Copy the crash report and paste it here"
    echo ""
    echo "OR in terminal:"
    echo "   xcrun simctl spawn booted log stream --level debug | grep -i 'expo\\|react'"
    echo ""
fi

echo "================================"
echo "Step 3: Check Metro Bundler"
echo "================================"
echo ""
echo "In your Metro terminal (where you ran 'npx expo start --clear'),"
echo "do you see any RED error messages?"
echo ""
echo "Common errors to look for:"
echo "- 'Cannot find module'"
echo "- 'Invariant Violation'"
echo "- 'TypeError'"
echo "- 'ReferenceError'"
echo ""
echo "If yes, copy those error messages."
echo ""

echo "================================"
echo "Next Steps"
echo "================================"
echo "Please provide:"
echo "1. Device crash logs (from Step 2)"
echo "2. Metro bundler errors (from Step 3)"
echo "3. Exact behavior (splash shows for how long? any error message?)"
echo ""




