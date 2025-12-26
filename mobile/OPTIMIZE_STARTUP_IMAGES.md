# Optimize Startup Images (Manual Step)

## Problem
Current splash/login images are **2048×2732** (very large) and can cause memory pressure / crash on cold start.

## Solution
Downscale to reduce startup memory footprint while keeping visual quality.

## Required Action

### Option 1: Use ImageMagick (if installed)

```bash
cd mobile/assets

# Downscale splash.png (2048x2732 → 1024x1366)
magick convert splash.png -resize 1024x1366 splash-opt.png
mv splash-opt.png splash.png

# Downscale login.png (2048x2732 → 1024x1366)
magick convert login.png -resize 1024x1366 login-opt.png
mv login-opt.png login.png
```

### Option 2: Use Online Tool

1. Go to https://squoosh.app or https://tinypng.com
2. Upload `mobile/assets/splash.png`
3. Resize to **1024×1366** (50% scale)
4. Download and replace original
5. Repeat for `mobile/assets/login.png`

### Option 3: Use Photoshop / GIMP / Preview

1. Open `mobile/assets/splash.png`
2. Resize to **1024×1366** (bicubic/lanczos)
3. Export as PNG
4. Replace original
5. Repeat for `mobile/assets/login.png`

## Verification

After optimization:
- File sizes should be ~200-400KB each (down from ~550-880KB)
- Visual quality should remain excellent (50% scale is imperceptible on mobile)
- Cold starts will use less memory

## Why This Matters

iOS decodes PNGs into RGBA bitmaps at startup:
- **2048×2732** = ~22MB per image (uncompressed)
- **1024×1366** = ~5.5MB per image (uncompressed)

On older devices or low-memory conditions, the large decode can trigger OOM crash during splash animation.

## Status

⚠️ **Manual step required** - sharp-cli not available in current environment.

Run one of the above methods before next EAS build.




