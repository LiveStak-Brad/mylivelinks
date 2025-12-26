# Build Troubleshooting - CocoaPods/Boost Error

## Error Seen
```
Error installing boost
Verification checksum was incorrect
```

## Cause
Transient issue with CocoaPods cache on EAS build servers.

## Solutions (Try in Order)

### Solution 1: Retry with Cache Clear (Recommended)
```bash
npx eas build --platform ios --profile preview --clear-cache
```

### Solution 2: Use Development Profile
Development builds are sometimes more forgiving:
```bash
npx eas build --platform ios --profile development
```

### Solution 3: Wait and Retry
Sometimes EAS server caches are stale. Wait 5-10 minutes and retry:
```bash
npx eas build --platform ios --profile preview
```

### Solution 4: Check EAS Status
Visit: https://status.expo.dev/
If there are active incidents, wait for resolution.

## Expected Result
Build should complete successfully after cache clear.




