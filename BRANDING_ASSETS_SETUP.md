# Branding Assets Setup Guide

## Quick Answer

**Put all branding assets (logos, banners, favicons) in:**

```
mylivelinks.com/
└── public/
    └── branding/
        ├── logo/
        │   ├── logo-light.svg
        │   ├── logo-dark.svg
        │   ├── logo-icon.svg
        │   └── logo-icon.png
        ├── banner/
        │   ├── banner-light.jpg
        │   ├── banner-dark.jpg
        │   ├── hero-light.jpg
        │   └── hero-dark.jpg
        ├── favicon/
        │   ├── favicon.ico
        │   ├── favicon-16x16.png
        │   ├── favicon-32x32.png
        │   └── apple-touch-icon.png
        └── theme/
            ├── light/
            └── dark/
```

---

## Complete Folder Structure

```
public/
├── branding/                    ← ALL BRANDING ASSETS HERE
│   ├── logo/
│   │   ├── logo-light.svg       ← Main logo (light mode)
│   │   ├── logo-dark.svg        ← Main logo (dark mode)
│   │   ├── logo-light.png       ← PNG fallback (light)
│   │   ├── logo-dark.png        ← PNG fallback (dark)
│   │   ├── logo-icon.svg        ← Icon-only version
│   │   ├── logo-icon-dark.svg   ← Icon (dark mode)
│   │   └── logo-icon-light.svg  ← Icon (light mode)
│   │
│   ├── banner/
│   │   ├── banner-light.jpg     ← Header banner (light)
│   │   ├── banner-dark.jpg      ← Header banner (dark)
│   │   ├── hero-light.jpg       ← Hero section (light)
│   │   ├── hero-dark.jpg        ← Hero section (dark)
│   │   └── og-image.jpg         ← Open Graph image (1200x630)
│   │
│   ├── favicon/
│   │   ├── favicon.ico           ← Main favicon (multi-size)
│   │   ├── favicon-16x16.png     ← 16x16 favicon
│   │   ├── favicon-32x32.png     ← 32x32 favicon
│   │   ├── apple-touch-icon.png ← iOS icon (180x180)
│   │   ├── android-chrome-192x192.png
│   │   └── android-chrome-512x512.png
│   │
│   └── theme/
│       ├── light/
│       │   ├── background-pattern.svg
│       │   └── accent-gradient.svg
│       └── dark/
│           ├── background-pattern.svg
│           └── accent-gradient.svg
│
└── images/                       ← Other images (gifts, badges, etc.)
    ├── gifts/
    └── badges/
```

---

## File Requirements

### Logos

| File | Size | Format | Purpose |
|------|------|--------|---------|
| `logo-light.svg` | 200-400px width | SVG | Main logo (light mode) |
| `logo-dark.svg` | 200-400px width | SVG | Main logo (dark mode) |
| `logo-icon.svg` | 32x32px | SVG | Icon-only (favicon) |
| `logo-light.png` | 200-400px width | PNG | Fallback (light) |
| `logo-dark.png` | 200-400px width | PNG | Fallback (dark) |

### Banners

| File | Size | Format | Purpose |
|------|------|--------|---------|
| `banner-light.jpg` | 1920x200px | JPG | Header banner (light) |
| `banner-dark.jpg` | 1920x200px | JPG | Header banner (dark) |
| `hero-light.jpg` | 1920x1080px | JPG | Hero section (light) |
| `hero-dark.jpg` | 1920x1080px | JPG | Hero section (dark) |
| `og-image.jpg` | 1200x630px | JPG | Open Graph (social sharing) |

### Favicons

| File | Size | Format | Purpose |
|------|------|--------|---------|
| `favicon.ico` | 16x16, 32x32, 48x48 | ICO | Main favicon (multi-size) |
| `favicon-16x16.png` | 16x16px | PNG | Small favicon |
| `favicon-32x32.png` | 32x32px | PNG | Standard favicon |
| `apple-touch-icon.png` | 180x180px | PNG | iOS home screen |
| `android-chrome-192x192.png` | 192x192px | PNG | Android icon |
| `android-chrome-512x512.png` | 512x512px | PNG | Android icon (large) |

---

## Usage Examples

### 1. Logo Component (Auto Theme)

```tsx
// components/BrandLogo.tsx
import BrandLogo from '@/components/BrandLogo';

// In your header/navbar
<BrandLogo size={150} />

// Icon-only version
<BrandLogo size={32} iconOnly />
```

### 2. Hero Banner

```tsx
// pages/index.tsx or app/page.tsx
import HeroBanner from '@/components/HeroBanner';

<HeroBanner height="600px" />
```

### 3. Manual Theme Detection

```tsx
import { useTheme } from 'next-themes';

const { resolvedTheme } = useTheme();
const isDark = resolvedTheme === 'dark';

<img 
  src={`/branding/logo/logo-${isDark ? 'dark' : 'light'}.svg`} 
  alt="MyLiveLinks" 
/>
```

---

## Setup Steps

### Step 1: Create Folders

```bash
mkdir -p public/branding/logo
mkdir -p public/branding/banner
mkdir -p public/branding/favicon
mkdir -p public/branding/theme/light
mkdir -p public/branding/theme/dark
```

### Step 2: Add Your Assets

Place your files:
- Logo files → `public/branding/logo/`
- Banner files → `public/branding/banner/`
- Favicon files → `public/branding/favicon/`

### Step 3: Use Components

The components (`BrandLogo.tsx`, `HeroBanner.tsx`) automatically detect theme and use the correct files.

---

## Next.js Configuration

### Update `next.config.js` (Optional)

```js
module.exports = {
  // ... other config
  images: {
    domains: ['cdn.mylivelinks.com'], // If using CDN
  },
};
```

### Update `app/layout.tsx` or `_document.tsx`

```tsx
export const metadata: Metadata = {
  icons: {
    icon: '/branding/favicon/favicon.ico',
    apple: '/branding/favicon/apple-touch-icon.png',
  },
  openGraph: {
    images: ['/branding/banner/og-image.jpg'],
  },
};
```

---

## Theme Provider Setup

If using `next-themes`:

```tsx
// app/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

---

## Quick Reference

| Asset Type | Location | Light Mode | Dark Mode |
|------------|----------|------------|-----------|
| Logo | `/branding/logo/` | `logo-light.svg` | `logo-dark.svg` |
| Banner | `/branding/banner/` | `banner-light.jpg` | `banner-dark.jpg` |
| Hero | `/branding/banner/` | `hero-light.jpg` | `hero-dark.jpg` |
| Favicon | `/branding/favicon/` | `favicon.ico` | (same) |

---

## Summary

✅ **Create:** `public/branding/` folder structure  
✅ **Add:** Logo, banner, favicon files with `-light` and `-dark` suffixes  
✅ **Use:** `BrandLogo` and `HeroBanner` components (auto theme detection)  
✅ **Reference:** Files are accessible at `/branding/logo/logo-light.svg` etc.

Your branding assets will automatically switch between light/dark mode based on user's theme preference!






