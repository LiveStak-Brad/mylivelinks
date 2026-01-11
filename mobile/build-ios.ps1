# P0: iOS Build Script - Bypasses Apple Capability Sync
# This script MUST be used for all iOS builds to prevent capability sync failures.
# DO NOT run 'eas build' directly - always use this script.

param(
    [string]$Profile = "development"
)

Write-Host "🔧 Setting EXPO_NO_CAPABILITY_SYNC=1 to bypass Apple capability sync..." -ForegroundColor Cyan
$env:EXPO_NO_CAPABILITY_SYNC = "1"

Write-Host "🚀 Starting EAS build for iOS ($Profile profile)..." -ForegroundColor Green
eas build --profile $Profile --platform ios --non-interactive

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build submitted successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
