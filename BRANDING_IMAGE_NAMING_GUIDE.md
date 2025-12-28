# Branding Image Naming Guide

## Auto-Detection System

The system automatically detects and uses your images based on **filename patterns** and **image dimensions**. Just name your files correctly and drop them in the right folders!

---

## Naming Convention

### Logos

```
✅ CORRECT Naming:
- logo-light.svg          ← Light mode logo
- logo-dark.svg           ← Dark mode logo
- logo-icon-light.svg     ← Light mode icon
- logo-icon-dark.svg      ← Dark mode icon
- logo-icon.svg           ← Icon (any theme)
- logo.png                ← Fallback (any theme)

❌ WRONG Naming:
- mylogo.svg              ← Missing "logo" keyword
- light-logo.svg          ← Wrong order
```

### Banners

```
✅ CORRECT Naming:
- banner-light.jpg        ← Light mode banner
- banner-dark.jpg         ← Dark mode banner
- hero-light.jpg          ← Light mode hero
- hero-dark.jpg           ← Dark mode hero

❌ WRONG Naming:
- header-banner.jpg       ← Missing theme suffix
- light-banner.jpg        ← Wrong order
```

### Favicons

```
✅ CORRECT Naming:
- favicon.ico             ← Main favicon
- favicon-16x16.png       ← 16x16 favicon
- favicon-32x32.png       ← 32x32 favicon
- apple-touch-icon.png    ← iOS icon
- android-chrome-192x192.png
```

---

## File Placement

### Folder Structure

```
public/
└── branding/
    ├── logo/
    │   ├── logo-light.svg      ← Put here
    │   ├── logo-dark.svg       ← Put here
    │   ├── logo-icon.svg       ← Put here
    │   └── logo.png            ← Fallback
    │
    ├── banner/
    │   ├── banner-light.jpg    ← Put here
    │   ├── banner-dark.jpg     ← Put here
    │   ├── hero-light.jpg      ← Put here
    │   └── hero-dark.jpg       ← Put here
    │
    └── favicon/
        ├── favicon.ico         ← Put here
        └── apple-touch-icon.png
```

---

## Detection Rules

### By Filename

The system detects image purpose from filename:

| Pattern | Detected As |
|---------|-------------|
| Contains `logo` | Logo |
| Contains `logo` + `icon` | Icon |
| Contains `banner` | Banner |
| Contains `hero` | Hero section |
| Contains `favicon` | Favicon |
| Contains `icon` | Icon |

### By Theme

| Pattern | Detected Theme |
|---------|----------------|
| `-light` or `_light` | Light mode |
| `-dark` or `_dark` | Dark mode |
| No theme suffix | Any theme (fallback) |

### By Dimensions (Auto-detected)

| Dimensions | Detected As |
|------------|-------------|
| ≤ 512x512, square | Favicon/Icon |
| ≤ 180x180, square | Favicon |
| Width > 3× height, height < 500 | Banner |
| Width > 1000, height > 500, 1.2-2.5 ratio | Hero |
| 100-2000px width, reasonable ratio | Logo |

---

## Examples

### Example 1: Logo Files

**Files you create:**
```
public/branding/logo/
├── logo-light.svg        (200x60)
├── logo-dark.svg         (200x60)
├── logo-icon-light.svg   (32x32)
└── logo-icon-dark.svg    (32x32)
```

**System automatically:**
- Uses `logo-light.svg` in light mode
- Uses `logo-dark.svg` in dark mode
- Uses `logo-icon-*.svg` when `iconOnly={true}`

### Example 2: Banner Files

**Files you create:**
```
public/branding/banner/
├── banner-light.jpg      (1920x200)
├── banner-dark.jpg       (1920x200)
├── hero-light.jpg        (1920x1080)
└── hero-dark.jpg         (1920x1080)
```

**System automatically:**
- Uses `banner-*.jpg` for header banners
- Uses `hero-*.jpg` for hero sections
- Switches theme based on user preference

### Example 3: Mixed Formats

**Files you create:**
```
public/branding/logo/
├── logo-light.svg
├── logo-light.png        ← PNG fallback
├── logo-dark.svg
└── logo-dark.png         ← PNG fallback
```

**System automatically:**
- Tries SVG first
- Falls back to PNG if SVG fails
- Handles errors gracefully

---

## Usage in Components

### Smart Logo Component

```tsx
import SmartBrandLogo from '@/components/SmartBrandLogo';

// Automatically uses logo-light.svg or logo-dark.svg
<SmartBrandLogo size={150} />

// Automatically uses logo-icon-light.svg or logo-icon-dark.svg
<SmartBrandLogo size={32} iconOnly />
```

### Smart Banner Component

```tsx
import SmartBanner from '@/components/SmartBanner';

// Automatically uses banner-light.jpg or banner-dark.jpg
<SmartBanner type="banner" height="200px" />

// Automatically uses hero-light.jpg or hero-dark.jpg
<SmartBanner type="hero" height="600px" />
```

---

## Supported File Formats

| Format | Supported | Preferred For |
|--------|-----------|---------------|
| SVG | ✅ Yes | Logos, icons |
| PNG | ✅ Yes | Logos, icons, favicons |
| JPG | ✅ Yes | Banners, hero images |
| ICO | ✅ Yes | Favicons |
| WebP | ✅ Yes | All (if Next.js configured) |

---

## Fallback Behavior

1. **Theme fallback:**
   - If dark version missing → uses light version
   - If light version missing → uses any version

2. **Format fallback:**
   - If SVG missing → tries PNG
   - If PNG missing → tries JPG

3. **Type fallback:**
   - If icon missing → uses full logo
   - If hero missing → uses banner

---

## Quick Checklist

When adding images, ensure:

- [ ] Filename contains type keyword (`logo`, `banner`, `hero`, `icon`, `favicon`)
- [ ] Theme suffix included (`-light`, `-dark`) or omitted for universal
- [ ] Files placed in correct folder (`/branding/logo/`, `/branding/banner/`, etc.)
- [ ] File format appropriate (SVG for logos, JPG for banners)
- [ ] Dimensions match intended use (see detection rules above)

---

## Testing

After adding images:

1. **Check light mode:** Switch to light theme, verify correct images load
2. **Check dark mode:** Switch to dark theme, verify correct images load
3. **Check fallbacks:** Temporarily rename one file, verify fallback works
4. **Check sizes:** Verify images display at correct sizes

---

## Summary

✅ **Just name files correctly** (`logo-light.svg`, `banner-dark.jpg`, etc.)  
✅ **Put them in the right folders** (`/branding/logo/`, `/branding/banner/`)  
✅ **System auto-detects** theme, type, and format  
✅ **Components handle everything** automatically  

No manual configuration needed - just drop files and name them correctly!













