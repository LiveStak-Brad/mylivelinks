@echo off
REM Aggressive cache clear for mobile app
echo ================================
echo Mobile App - Aggressive Cache Clear
echo ================================
echo.

cd mobile

echo [1/5] Stopping Metro...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/5] Clearing Metro cache...
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo [3/5] Clearing Watchman...
watchman watch-del-all 2>nul

echo [4/5] Clearing temp files...
if exist %TEMP%\metro-* del /q %TEMP%\metro-*
if exist %TEMP%\haste-map-* del /q %TEMP%\haste-map-*
if exist %TEMP%\react-* del /q %TEMP%\react-*

echo [5/5] Starting Metro with --clear...
echo.
echo ================================
echo Starting Expo (this will take a moment)
echo ================================
echo.

npx expo start --clear --reset-cache

echo.
echo If the app still crashes, please tell me:
echo 1. Android or iOS?
echo 2. Physical device or emulator/simulator?





