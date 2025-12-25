# Image Assets Directory

Place all static images here for the MyLiveLinks web app.

## Folder Structure

```
images/
├── gifts/          ← Gift type icons (rose.png, heart.png, etc.)
├── badges/         ← Gifter level badges (level-0.png, level-5.png, etc.)
├── avatars/        ← Default avatars (default-avatar.png)
└── ui/             ← UI elements (live-indicator.svg, etc.)
```

## How to Use

Reference images in your code like this:

```tsx
// From public folder (Next.js serves automatically)
<img src="/images/gifts/rose.png" alt="Rose" />
<img src="/images/badges/level-5.png" alt="Diamond Gifter" />
```

## Image Requirements

### Gift Icons
- Size: 64x64px or 128x128px
- Format: PNG or SVG (SVG preferred)
- Naming: lowercase, hyphenated (rose.png, heart.png)

### Badge Icons
- Size: 32x32px or 64x64px
- Format: PNG or SVG
- Naming: level-0.png, level-1.png, etc.

### Avatars
- Size: 200x200px or 400x400px
- Format: PNG or JPG
- Naming: default-avatar.png

## Database Integration

Store image URLs in database for flexibility:

```sql
-- Gift types
UPDATE gift_types SET icon_url = '/images/gifts/rose.png' WHERE name = 'Rose';

-- Gifter levels
UPDATE gifter_levels SET badge_icon_url = '/images/badges/level-5.png' WHERE level = 5;
```

Components will automatically use these URLs from the database.










