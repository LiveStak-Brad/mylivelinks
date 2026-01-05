## Crash Evidence Checklist

> Use this checklist **before** reporting any mobile crash. Capture all three data streams so we can correlate timeline, native stack, and JS errors.

### 1. Metro Bundler Output (JS stack)
1. From repo root run `cd mobile && npx expo start --dev-client`.
2. In a second terminal, start the dev build (Expo Go is **not** acceptable) or connect the installed EAS dev build so it attaches to Metro.
3. Reproduce the crash.
4. Copy the entire Metro terminal output, including:
   - The exact command you ran
   - Any red screen stack trace
   - Timestamped logs/breadcrumbs (APP_START, ENV_LOADED, etc.)
5. Save to `logs/mobile/<date>-metro.txt` (create directory if needed) and attach/upload with your report.

### 2. Android `adb logcat`
1. Connect the crashing Android device via USB with developer mode enabled.
2. Run `adb devices` to confirm it is detected.
3. Clear prior logs: `adb logcat -c`.
4. Start capture: `adb logcat --pid=$(adb shell pidof -s com.mylivelinks.app) -v time > logs/mobile/<date>-android.log`.
   - If PID is not known yet, temporarily use `adb logcat | tee logs/mobile/<date>-android.log` and filter later.
5. Launch the dev build, reproduce the crash, then stop the capture (Ctrl+C).
6. Annotate the log file with approximate crash timestamp and which screen you were on.

### 3. iOS Device Logs (Console.app / log stream)
1. Plug in the iOS device.
2. Open **Console.app** (or use `log stream --predicate 'process == "MyLiveLinks"' --info`).
3. In Console, select the device, filter by `process:MyLiveLinks` (or the bundle id `com.mylivelinks.app`).
4. Clear the current log view.
5. Launch the dev build and reproduce the crash.
6. Immediately select all visible entries (⌘A) and **File → Save** as `logs/mobile/<date>-ios.log`.
   - If using `log stream`, redirect stdout: `log stream --predicate 'process == "MyLiveLinks"' --style syslog > logs/mobile/<date>-ios.log`.
7. Capture at least 10 seconds before the splash screen and 10 seconds after the crash.

### Upload / Attachments
- Zip the three files (Metro, Android, iOS) plus any screenshots of red screens.
- Name the archive `crash-evidence-<date>-<device>.zip`.
- Attach to the investigation ticket or upload to the shared drive, then link it in the crash report.

Following this checklist ensures we always have actionable evidence before attempting a rebuild.
