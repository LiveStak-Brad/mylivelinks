# TestFlight Setup Checklist

## Prerequisites for `eas submit`

### 1. Apple Developer Account
- [ ] Have an Apple Developer account ($99/year)
- [ ] Account is in good standing
- [ ] Can access https://developer.apple.com

### 2. App Store Connect Setup
- [ ] Login to https://appstoreconnect.apple.com
- [ ] Create new app for `com.mylivelinks.app`
- [ ] Note the App Store Connect App ID

### 3. Bundle Identifier
- [ ] `com.mylivelinks.app` registered in Apple Developer portal
- [ ] Associated with your team

---

## Running `eas submit`

### First Time (Interactive)
```bash
npx eas submit --platform ios --profile development
```

EAS will ask:
1. **Apple ID**: Your developer account email
2. **App-specific password**: Create at appleid.apple.com
3. **ASC App ID**: From App Store Connect

### Subsequent Times
Once configured, just run:
```bash
npx eas submit --platform ios
```

---

## Creating App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Security → App-Specific Passwords
4. Generate new password
5. Name it "EAS Submit"
6. Copy the password (you'll need it once)

---

## Finding ASC App ID

1. Go to https://appstoreconnect.apple.com
2. My Apps → MyLiveLinks
3. URL will be: `...apps/XXXXXXXXXX/...`
4. The `XXXXXXXXXX` is your ASC App ID

---

## Alternative: Manual Upload

If `eas submit` fails, you can:
1. Download `.ipa` from EAS dashboard
2. Open Xcode → Window → Devices and Simulators
3. Drag `.ipa` to your connected iPhone

---

## After Submit

1. Check App Store Connect → TestFlight
2. Build will process (5-10 minutes)
3. Once "Ready to Test", invite yourself
4. Install TestFlight app on iPhone
5. Install MyLiveLinks from TestFlight

---

## Status: ⏳ Waiting for Build

Once development build completes, run:
```bash
npx eas submit --platform ios --profile development
```




