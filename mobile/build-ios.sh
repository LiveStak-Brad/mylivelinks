#!/bin/bash
# P0: iOS Build Script - Bypasses Apple Capability Sync
# This script MUST be used for all iOS builds to prevent capability sync failures.
# DO NOT run 'eas build' directly - always use this script.

PROFILE="${1:-development}"

echo "🔧 Setting EXPO_NO_CAPABILITY_SYNC=1 to bypass Apple capability sync..."
export EXPO_NO_CAPABILITY_SYNC=1

echo "🚀 Starting EAS build for iOS ($PROFILE profile)..."
eas build --profile "$PROFILE" --platform ios --non-interactive

if [ $? -eq 0 ]; then
    echo "✅ Build submitted successfully!"
else
    echo "❌ Build failed"
    exit 1
fi
