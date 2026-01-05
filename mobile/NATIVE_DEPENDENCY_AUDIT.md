## Native Dependency Audit — Jan 4, 2026

Source inputs:
- `expo doctor --verbose` (EAS build #1425) — highlighted three blocking checks.
- `mobile/package.json` and `mobile/app.json` (current repo state).
- `xcodelog1425.log` — confirms native targets bundled for Preview build.

### Expo SDK Compatibility Gaps

| Package | Installed | Expo 50 requirement | Risk | Action |
| --- | --- | --- | --- | --- |
| `@expo/config-plugins` | 7.2.5 | ^7.8.0 | Prebuild plugins may not run; new Expo 50 patches missing. | `npx expo install @expo/config-plugins` (brings 7.8.x). |
| `@expo/prebuild-config` | 6.2.6 | ^6.7.0 | EAS config sync may fail; plugins use outdated schema. | `npx expo install @expo/prebuild-config`. |
| `expo-splash-screen` | 0.20.5 | ~0.26.5 | **High** — Expo 50 ships new native module; mismatch can throw native error immediately after splash (observed symptom). | Upgrade via `npx expo install expo-splash-screen@~0.26.5` and rerun `pod install`. |
| `expo-camera` | 14.0.6 | ~14.1.3 | Medium — mismatched iOS pod may fail to link, causing crash when module loads. | Align to Expo requirement; rebuild dev client. |
| `@react-native-async-storage/async-storage` | 1.24.0 | 1.21.0 | Low but could break autolinking on RN 0.73 when native headers differ. | Lock to Expo’s tested version (1.21.0) unless justification. |
| `@react-native-community/slider` | 4.5.7 | 4.4.2 | Low — API compatible but pods differ; align to avoid duplicate symbols. |
| `react-native-webview` | 13.16.0 | 13.6.4 | Medium — React Native 0.73 patch set expects 13.6.x; 13.16 bundles Fabric changes not in dev client. |

### Config Sync Blocker

`expo doctor` also reported:

> “This project contains native project folders but also has native configuration properties in app.json … When the android/ios folders are present, EAS Build will not sync scheme, orientation, icon, … plugins, androidStatusBar.”

Implication: changes to `app.json` (e.g., splash tweaks, plugin additions) will *not* flow into the native projects currently committed under `mobile/ios` and `mobile/android`. We must either:
1. Remove native folders and rely on prebuild each run, **or**
2. Add `/ios` and `/android` to `.easignore` so EAS recreates them, **or**
3. Manually keep Xcode/Gradle settings in sync (error-prone, likely cause of current mismatch).

### Plugin Coverage

| Native module | Package | Config plugin present? | Notes |
| --- | --- | --- | --- |
| Splash screen | `expo-splash-screen` | ✅ (app.json `plugins[expo-splash-screen]`) | Version mismatch noted above. |
| Secure storage | `expo-secure-store` | ✅ | Included plugin. |
| Dev client | `expo-dev-client` | ✅ | Required for custom dev build. |
| LiveKit | `@livekit/react-native` | ⚠️ Autolink only | Uses `registerGlobals` in `index.js`, but no custom plugin needed. Ensure pods updated when bumping. |
| In-app purchases | `react-native-iap` | ⚠️ Missing config | Library expects `withIAP` plugin (adds StoreKit capability). Not currently listed; check if capability is manually enabled in native projects. |
| Camera / microphone | `expo-camera`, `expo-av` | ⚠️ auto | Permissions declared in `app.json`, but plugin absent. Align versions before next build. |
| Notifications / updates | `expo-updates` | (managed) | No plugin customization, uses defaults. |

### Immediate Crash Suspects

1. **`expo-splash-screen` 0.20.x on Expo 50** — release notes warn about “ABI49 compatibility only”. Since our dev build is on SDK 50, the native splash module can crash after hiding the splash (exact behavior observed). No guard rails exist until versions align.
2. **Config plugin version skew** — outdated `@expo/config-plugins` / `@expo/prebuild-config` prevents plugin transforms from running, so iOS/Android projects may still reference removed assets/modules.

### Recommended Remediation Sequence

1. Run `npx expo install expo-splash-screen@~0.26.5 expo-camera expo-splash-screen expo-file-system @react-native-async-storage/async-storage @react-native-community/slider react-native-webview` to align with SDK 50.
2. `npx expo install @expo/config-plugins @expo/prebuild-config`.
3. Decide on native-folder strategy (`.easignore` vs delete). Ensure whichever path we choose matches EAS expectations before next build.
4. After upgrades, clean pods: `cd mobile/ios && rm -rf Pods Podfile.lock && pod install`.
5. Rebuild dev client only after runtime crash is verified resolved locally.
