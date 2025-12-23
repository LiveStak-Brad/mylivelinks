# Branding Assets Directory

Branding assets for MyLiveLinks including logos, banners, and theme-specific versions.

## Folder Structure

```
branding/
├── logo/
│   ├── logo-light.svg          ← Light mode logo
│   ├── logo-dark.svg           ← Dark mode logo
│   ├── logo-light.png          ← PNG fallback (light)
│   ├── logo-dark.png           ← PNG fallback (dark)
│   ├── logo-icon.svg           ← Icon-only version (favicon)
│   └── logo-icon.png           ← Icon PNG (favicon)
├── banner/
│   ├── banner-light.jpg        ← Light mode banner
│   ├── banner-dark.jpg         ← Dark mode banner
│   ├── hero-light.jpg          ← Hero section (light)
│   └── hero-dark.jpg           ← Hero section (dark)
├── favicon/
│   ├── favicon.ico              ← Main favicon
│   ├── favicon-16x16.png       ← 16x16 favicon
│   ├── favicon-32x32.png       ← 32x32 favicon
│   ├── apple-touch-icon.png    ← iOS home screen icon
│   └── android-chrome-192x192.png
└── theme/
    ├── light/
    │   ├── background-pattern.svg
    │   └── accent-gradient.svg
    └── dark/
        ├── background-pattern.svg
        └── accent-gradient.svg
```

## Usage in Code

### Logo Component (Auto Theme Detection)

```tsx
// components/BrandLogo.tsx
import Image from 'next/image';
import { useTheme } from 'next-themes';

export default function BrandLogo({ size = 200 }) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  return (
    <Image
      src={isDark ? '/branding/logo/logo-dark.svg' : '/branding/logo/logo-light.svg'}
      alt="MyLiveLinks"
      width={size}
      height={size}
      priority
    />
  );
}
```

### Banner Component

```tsx
// components/HeroBanner.tsx
import { useTheme } from 'next-themes';

export default function HeroBanner() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  return (
    <div 
      className="hero-banner"
      style={{
        backgroundImage: `url(${isDark ? '/branding/banner/banner-dark.jpg' : '/branding/banner/banner-light.jpg'})`
      }}
    />
  );
}
```

### Favicon Setup (next.config.js)

```js
module.exports = {
  // ... other config
  async headers() {
    return [
      {
        source: '/branding/favicon/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### HTML Head (app/layout.tsx or _document.tsx)

```tsx
<Head>
  <link rel="icon" href="/branding/favicon/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="/branding/favicon/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/branding/favicon/favicon-16x16.png" />
  <link rel="apple-touch-icon" href="/branding/favicon/apple-touch-icon.png" />
</Head>
```

## File Naming Convention

- **Light mode**: `-light` suffix (logo-light.svg, banner-light.jpg)
- **Dark mode**: `-dark` suffix (logo-dark.svg, banner-dark.jpg)
- **Icon only**: `-icon` suffix (logo-icon.svg)
- **Sizes**: Include dimensions in filename if multiple sizes (logo-32x32.png)

## Recommended Sizes

### Logos
- **Full logo**: 200-400px width (SVG preferred)
- **Icon only**: 32x32px, 64x64px, 128x128px
- **Favicon**: 16x16px, 32x32px, 48x48px

### Banners
- **Hero banner**: 1920x1080px (16:9) or 1920x600px
- **Header banner**: 1920x200px
- **Mobile banner**: 800x600px

### Favicons
- **favicon.ico**: 16x16, 32x32, 48x48 (multi-size ICO)
- **PNG favicons**: 16x16, 32x32
- **Apple touch icon**: 180x180px
- **Android chrome**: 192x192px, 512x512px

## Theme Detection

Use Next.js theme detection:

```tsx
import { useTheme } from 'next-themes';

const { theme, resolvedTheme } = useTheme();
const isDark = resolvedTheme === 'dark';

// Use isDark to select correct asset
const logoPath = isDark ? '/branding/logo/logo-dark.svg' : '/branding/logo/logo-light.svg';
```

## CDN for Production

For production, upload to CDN and reference:

```tsx
const LOGO_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL || '';
const logoPath = `${LOGO_BASE_URL}/branding/logo/logo-${isDark ? 'dark' : 'light'}.svg`;
```






