# Image Assets Guide for MyLiveLinks

## Standard Next.js Structure

For a Next.js app, place all static images in the `public` folder at the root of your project:

```
mylivelinks.com/
├── public/                    ← Put all images here
│   ├── images/
│   │   ├── gifts/            ← Gift icons
│   │   ├── avatars/          ← User avatars (if storing locally)
│   │   ├── badges/           ← Gifter level badges
│   │   └── ui/               ← UI elements (buttons, icons, etc.)
│   └── favicon.ico
├── frontend/
│   └── components/
└── ...
```

---

## Recommended Folder Structure

### Option 1: Organized by Type (Recommended)

```
public/
├── images/
│   ├── gifts/                 ← Gift type icons
│   │   ├── rose.png
│   │   ├── heart.png
│   │   ├── star.png
│   │   ├── diamond.png
│   │   └── ...
│   ├── badges/                ← Gifter level badges
│   │   ├── level-0.png
│   │   ├── level-1.png
│   │   ├── level-5.png
│   │   └── ...
│   ├── avatars/               ← Default avatars (if not using CDN)
│   │   └── default-avatar.png
│   └── ui/                    ← UI elements
│       ├── live-indicator.svg
│       ├── mute-icon.svg
│       └── ...
└── favicon.ico
```

### Option 2: Flat Structure (Simpler)

```
public/
├── gifts/
│   ├── rose.png
│   ├── heart.png
│   └── ...
├── badges/
│   ├── level-0.png
│   └── ...
└── favicon.ico
```

---

## How to Reference Images in Code

### In React Components (Next.js)

```tsx
// ✅ CORRECT: Reference from public folder
<img src="/images/gifts/rose.png" alt="Rose" />
<img src="/images/badges/level-5.png" alt="Diamond Gifter" />

// ❌ WRONG: Don't use relative paths like ../public/
<img src="../public/images/gifts/rose.png" /> // Won't work!
```

### In GiftModal Component

```tsx
// frontend/components/GiftModal.tsx
{gift.icon_url ? (
  <img 
    src={gift.icon_url}  // This comes from database (gift_types.icon_url)
    alt={gift.name} 
    className="w-12 h-12 mx-auto mb-1" 
  />
) : (
  // Fallback to local image
  <img 
    src="/images/gifts/default-gift.png" 
    alt={gift.name} 
    className="w-12 h-12 mx-auto mb-1" 
  />
)}
```

### In GifterBadge Component

```tsx
// frontend/components/GifterBadge.tsx
{badgeIconUrl ? (
  <img 
    src={badgeIconUrl}  // From database (gifter_levels.badge_icon_url)
    alt={badgeName}
    className="w-4 h-4"
  />
) : (
  // Fallback to local badge image
  <img 
    src={`/images/badges/level-${level}.png`}
    alt={badgeName}
    className="w-4 h-4"
  />
)}
```

---

## Database vs Local Images

### Option A: Store URLs in Database (Recommended)

**For Gift Types:**
```sql
-- Update gift_types table with icon URLs
UPDATE gift_types 
SET icon_url = '/images/gifts/rose.png' 
WHERE name = 'Rose';

UPDATE gift_types 
SET icon_url = '/images/gifts/heart.png' 
WHERE name = 'Heart';
```

**For Gifter Levels:**
```sql
-- Update gifter_levels table with badge URLs
UPDATE gifter_levels 
SET badge_icon_url = '/images/badges/level-5.png' 
WHERE level = 5;
```

**Benefits:**
- Easy to update without code changes
- Can use CDN URLs later
- Flexible (can mix local and remote images)

### Option B: Hardcode in Components

```tsx
// Simple mapping in component
const giftIcons: Record<string, string> = {
  'Rose': '/images/gifts/rose.png',
  'Heart': '/images/gifts/heart.png',
  'Star': '/images/gifts/star.png',
};
```

**Benefits:**
- No database queries needed
- Type-safe
- Faster for small sets

---

## Image Naming Conventions

### Gift Icons
- Use lowercase, hyphenated names
- Match gift type names: `rose.png`, `heart.png`, `diamond.png`
- Recommended size: 64x64px or 128x128px (SVG preferred)

### Badge Icons
- Use level numbers: `level-0.png`, `level-1.png`, `level-5.png`
- Or descriptive: `bronze-badge.png`, `diamond-badge.png`
- Recommended size: 32x32px or 64x64px

### Avatar Images
- Usually stored in database (`profiles.avatar_url`)
- Default fallback: `/images/avatars/default-avatar.png`
- Recommended size: 200x200px or 400x400px

---

## Example: Complete Setup

### 1. Create Folder Structure

```bash
mkdir -p public/images/gifts
mkdir -p public/images/badges
mkdir -p public/images/avatars
mkdir -p public/images/ui
```

### 2. Add Images

Place your image files:
- `public/images/gifts/rose.png`
- `public/images/gifts/heart.png`
- `public/images/badges/level-5.png`
- `public/images/avatars/default-avatar.png`

### 3. Update Database (if using Option A)

```sql
-- Update gift types with icon URLs
UPDATE gift_types SET icon_url = '/images/gifts/rose.png' WHERE name = 'Rose';
UPDATE gift_types SET icon_url = '/images/gifts/heart.png' WHERE name = 'Heart';
UPDATE gift_types SET icon_url = '/images/gifts/star.png' WHERE name = 'Star';
UPDATE gift_types SET icon_url = '/images/gifts/diamond.png' WHERE name = 'Diamond';

-- Update gifter levels with badge URLs
UPDATE gifter_levels SET badge_icon_url = '/images/badges/level-0.png' WHERE level = 0;
UPDATE gifter_levels SET badge_icon_url = '/images/badges/level-1.png' WHERE level = 1;
UPDATE gifter_levels SET badge_icon_url = '/images/badges/level-5.png' WHERE level = 5;
```

### 4. Use in Components

```tsx
// GiftModal.tsx - Already handles icon_url from database
<img src={gift.icon_url || '/images/gifts/default-gift.png'} />

// GifterBadge.tsx - Can use database URL or fallback
<img src={badgeIconUrl || `/images/badges/level-${level}.png`} />
```

---

## Next.js Image Optimization

For better performance, use Next.js `Image` component:

```tsx
import Image from 'next/image';

// Instead of <img>
<Image
  src="/images/gifts/rose.png"
  alt="Rose"
  width={64}
  height={64}
  className="mx-auto mb-1"
/>
```

**Benefits:**
- Automatic optimization
- Lazy loading
- Responsive images
- Better performance

---

## CDN Option (Production)

For production, consider using a CDN:

```sql
-- Store CDN URLs in database
UPDATE gift_types 
SET icon_url = 'https://cdn.mylivelinks.com/images/gifts/rose.png' 
WHERE name = 'Rose';
```

**CDN Providers:**
- Cloudflare
- AWS CloudFront
- Vercel Blob Storage
- Supabase Storage

---

## Quick Reference

| Image Type | Location | Database Field | Example Path |
|------------|----------|----------------|--------------|
| Gift Icons | `public/images/gifts/` | `gift_types.icon_url` | `/images/gifts/rose.png` |
| Badge Icons | `public/images/badges/` | `gifter_levels.badge_icon_url` | `/images/badges/level-5.png` |
| User Avatars | `public/images/avatars/` | `profiles.avatar_url` | `/images/avatars/default.png` |
| UI Elements | `public/images/ui/` | N/A | `/images/ui/live-indicator.svg` |

---

## Summary

1. **Create `public/images/` folder** at project root
2. **Organize by type**: `gifts/`, `badges/`, `avatars/`, `ui/`
3. **Reference with `/images/...`** (Next.js serves from `public/`)
4. **Store URLs in database** for flexibility (or hardcode in components)
5. **Use Next.js Image component** for optimization

**Your images will be accessible at:**
- `http://localhost:3000/images/gifts/rose.png`
- `http://localhost:3000/images/badges/level-5.png`








