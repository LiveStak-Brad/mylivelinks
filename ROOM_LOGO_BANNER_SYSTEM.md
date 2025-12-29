# Room Logo & Banner System

## Overview

The Room Logo & Banner System replaces the static "BETA/TESTING - NO CASH VALUE" banner with **auto-generated room-specific banners** that include:

- **Room Logo** (custom image per room)
- **Room Title** (e.g., "Live Central")
- **Presented By** (e.g., "Presented by MyLiveLinks Official" or owner/admin name)

---

## Database Schema

### New Fields in `coming_soon_rooms` (Room Instances)

| Field | Type | Description |
|-------|------|-------------|
| `room_logo_url` | TEXT | URL to room logo image for banner display |
| `presented_by` | TEXT | Presenter text (e.g., "Presented by MyLiveLinks Official") |
| `banner_style` | TEXT | Visual style: 'default', 'minimal', 'card', 'gradient' (default: 'default') |

### New Fields in `room_templates`

| Field | Type | Description |
|-------|------|-------------|
| `default_room_logo_url` | TEXT | Default logo URL for rooms created from this template |
| `default_presented_by` | TEXT | Default presenter text for rooms created from this template |
| `default_banner_style` | TEXT | Default banner style (default: 'default') |

### Storage Bucket

- **Bucket**: `room-logos`
- **Public**: Yes (logos are publicly accessible)
- **Upload**: Owners and admins only
- **Path format**: `room-logos/{room-key}-logo.{ext}`

---

## Room Builder Integration

### Creating a Room (Owner Panel)

1. **Navigate to** `/owner/rooms/new`
2. **Fill in basic info**:
   - Room Name (e.g., "Live Central")
   - Room Key (e.g., "live-central")
   - Description
3. **Upload Room Logo**:
   - Click "Upload Room Logo" button
   - Select image (PNG, JPG, SVG recommended)
   - Logo is uploaded to `room-logos` bucket
4. **Set Presenter**:
   - Enter "Presented By" text (e.g., "MyLiveLinks Official")
   - Or leave blank for owner's name
5. **Choose Banner Style** (future enhancement)

### Editing a Room

1. **Navigate to** `/owner/rooms/[roomId]`
2. **Appearance Tab**:
   - Upload new room logo
   - Update "Presented By" text
   - Change banner style
3. **Save Changes**

---

## Special Case: Live Central

**Live Central** is the app-owned main room:

- **Room Key**: `live-central`
- **Room Name**: `Live Central`
- **Presented By**: `Presented by MyLiveLinks Official`
- **Logo**: Custom-designed "Live Central" logo (to be created)

### Setting Up Live Central Logo

1. Design logo for Live Central
2. Upload to `/owner/rooms/live-central` (Appearance tab)
3. Or run SQL:
   ```sql
   UPDATE coming_soon_rooms
   SET 
       room_logo_url = 'https://your-supabase-url/storage/v1/object/public/room-logos/live-central-logo.png',
       presented_by = 'Presented by MyLiveLinks Official',
       banner_style = 'default'
   WHERE room_key = 'live-central';
   ```

---

## Frontend Components

### 1. RoomBanner Component (NEW)

**Location**: `components/RoomBanner.tsx`

Displays the room-specific banner instead of the static "BETA/TESTING" text.

**Props**:
```tsx
interface RoomBannerProps {
  roomKey?: string;
  roomName?: string;
  roomLogoUrl?: string | null;
  presentedBy?: string | null;
  bannerStyle?: 'default' | 'minimal' | 'card' | 'gradient';
  className?: string;
}
```

**Design Requirements**:
- **Height**: `py-1.5` (24px total) - MUST be compact
- **Logo**: 20px × 20px max
- **Font**: `text-xs` (12px)
- **Layout**: Horizontal flex with space-between
- **Responsive**: Hide "Presented by" on mobile (<640px)

**Example Implementation**:
```tsx
<div className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-between py-1.5 px-4 text-xs z-50 flex-shrink-0">
  {/* Left: Logo + Title */}
  <div className="flex items-center gap-2">
    {roomLogoUrl && (
      <img 
        src={roomLogoUrl} 
        alt={`${roomName} logo`}
        className="w-5 h-5 object-contain"
      />
    )}
    <span className="font-semibold">{roomName || 'Live Central'}</span>
  </div>
  
  {/* Right: Presented By (hidden on mobile) */}
  {presentedBy && (
    <span className="hidden sm:block opacity-90">
      {presentedBy}
    </span>
  )}
</div>
```

**Example Usage**:
```tsx
<RoomBanner
  roomKey="live-central"
  roomName="Live Central"
  roomLogoUrl="https://.../room-logos/live-central-logo.png"
  presentedBy="MyLiveLinks Official"
  bannerStyle="default"
/>
```

### 2. LogoUploader Component (NEW)

**Location**: `components/owner/LogoUploader.tsx`

Drag-and-drop uploader for room logos (similar to `BannerUploader`).

**Features**:
- Preview with transparent background support
- Max file size: 5MB
- Formats: PNG, JPG, SVG, WEBP
- Auto-resize/optimize

### 3. Updated RoomForm

**Location**: `components/owner/RoomForm.tsx`

**New Fields**:
```tsx
room_logo_url: string | null;
presented_by: string;
banner_style: string;
```

**New Form Section**:
```tsx
<div className="space-y-4">
  <h3 className="text-lg font-semibold">Banner Branding</h3>
  
  {/* Logo Upload */}
  <LogoUploader
    currentUrl={formData.room_logo_url}
    onUpload={(url) => handleChange('room_logo_url', url)}
    onClear={() => handleChange('room_logo_url', null)}
    roomKey={formData.room_key}
  />
  
  {/* Presented By */}
  <div className="space-y-2">
    <label className="block text-sm font-medium">
      Presented By
    </label>
    <Input
      value={formData.presented_by}
      onChange={(e) => handleChange('presented_by', e.target.value)}
      placeholder="e.g., MyLiveLinks Official or your name"
    />
    <p className="text-xs text-muted-foreground">
      Leave blank to use your profile name
    </p>
  </div>
  
  {/* Banner Style */}
  <div className="space-y-2">
    <label className="block text-sm font-medium">
      Banner Style
    </label>
    <select
      value={formData.banner_style}
      onChange={(e) => handleChange('banner_style', e.target.value)}
      className="..."
    >
      <option value="default">Default</option>
      <option value="minimal">Minimal</option>
      <option value="card">Card</option>
      <option value="gradient">Gradient</option>
    </select>
  </div>
</div>
```

### 4. Updated LiveRoom

**Location**: `components/LiveRoom.tsx`

**Replace** (lines 2702-2705):
```tsx
{/* Beta/Testing Banner */}
<div className="bg-yellow-500 text-black text-center py-2 px-4 text-sm font-semibold z-50 flex-shrink-0">
  <span className="inline-block">BETA/TESTING - NO CASH VALUE</span>
</div>
```

**With**:
```tsx
{/* Room Banner */}
<RoomBanner
  roomKey={currentRoomKey}
  roomName={currentRoomName}
  roomLogoUrl={currentRoomLogoUrl}
  presentedBy={currentPresentedBy}
  bannerStyle={currentBannerStyle}
/>
```

**Also Update Header** (line 2708):

**From**:
```tsx
<header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 z-50 relative pb-2 lg:pb-8">
```

**To**:
```tsx
<header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 z-50 relative pb-1 lg:pb-4">
```

**Changes**:
- Reduced `pb-2` → `pb-1` (saves 4px on mobile)
- Reduced `lg:pb-8` → `lg:pb-4` (saves 16px on desktop)
- This accommodates the new compact room banner

---

## Banner Styles

**⚠️ IMPORTANT: All banner styles MUST remain compact to preserve screen space for the live grid.**

### Default (Recommended)
- **Height**: `py-1.5` (24px total)
- **Layout**: Horizontal flex - Logo (left) | Room Title (center) | Presented By (right)
- **Logo Size**: 20px × 20px
- **Font**: text-xs (12px)
- **Background**: Gradient or solid color
- **Padding**: px-4

### Minimal
- **Height**: `py-1` (20px total)
- **Layout**: Room title + small logo only
- **Logo Size**: 16px × 16px
- **Font**: text-xs (12px)
- **Background**: White/dark mode background
- **Use case**: Maximum screen space

### Card
- **Height**: `py-2` (32px total)
- **Layout**: Slightly elevated with subtle shadow
- **Logo Size**: 24px × 24px
- **Font**: text-sm (14px)
- **Background**: Card color with border
- **Use case**: Branded rooms

### Gradient
- **Height**: `py-2` (32px total)
- **Layout**: Full-width gradient background
- **Logo Size**: 20px × 20px
- **Font**: text-xs (12px)
- **Background**: Custom gradient
- **Use case**: Eye-catching branding

---

## API Updates

### GET `/api/admin/rooms/[id]`

**Response includes**:
```json
{
  "id": "...",
  "room_key": "live-central",
  "name": "Live Central",
  "room_logo_url": "https://.../room-logos/live-central-logo.png",
  "presented_by": "Presented by MyLiveLinks Official",
  "banner_style": "default",
  ...
}
```

### PUT `/api/admin/rooms/[id]`

**Request body includes**:
```json
{
  "room_logo_url": "https://.../room-logos/live-central-logo.png",
  "presented_by": "Presented by MyLiveLinks Official",
  "banner_style": "default"
}
```

---

## Migration Steps

1. **Run SQL Migration**:
   ```bash
   psql -h [supabase-host] -U postgres -f sql/20251228_room_logo_banner_system.sql
   ```

2. **Create Components**:
   - `components/RoomBanner.tsx`
   - `components/owner/LogoUploader.tsx`

3. **Update RoomForm**:
   - Add new fields to `RoomFormData` interface
   - Add logo uploader + presenter fields to form

4. **Update LiveRoom**:
   - Fetch room data from `coming_soon_rooms` table
   - Replace static banner with `<RoomBanner />`

5. **Design & Upload Live Central Logo**:
   - Create logo design
   - Upload via Owner Panel or SQL

---

## Fallback Behavior

If room data is not available:
- **Logo**: Show MyLiveLinks logo
- **Title**: "Live Central"
- **Presented By**: "Presented by MyLiveLinks"
- **Style**: Default

---

## Future Enhancements

- [ ] Animated banner transitions
- [ ] Custom banner colors (beyond gradient)
- [ ] Banner templates library
- [ ] A/B testing for banner effectiveness
- [ ] Banner analytics (impressions, clicks)
- [ ] Seasonal/event-specific banners

---

## Design Guidelines

### Room Logo Specs

- **Format**: PNG with transparent background (preferred) or SVG
- **Source Size**: 200x200px minimum, 500x500px recommended
- **Display Size**: 16-24px (displayed very small in banner)
- **Aspect Ratio**: Square (1:1) REQUIRED
- **File Size**: Max 2MB (smaller is better)
- **Style**: Simple, bold, high contrast - must be recognizable at 20px size
- **Avoid**: Fine details, thin lines, complex text

**Design Tips**:
- Think "app icon" not "poster"
- Test at 20px × 20px before uploading
- Use solid colors or simple gradients
- Avoid photographic images

### Presenter Text

- **Format**: "Presented by [Name/Brand]" or "[Name/Brand]"
- **Examples**:
  - "Presented by MyLiveLinks Official"
  - "MyLiveLinks Official"
  - "DJ Mixer"
  - "Gaming Central"
- **Max Length**: 40 characters (shorter is better)
- **Display**: text-xs (12px), may be hidden on very small screens

### Banner Height Specs

**Current Layout**:
- Testing Mode Banner (if shown): `py-2` (32px)
- **Room Banner**: `py-1.5` to `py-2` (24-32px) ← **MUST STAY COMPACT**
- Header: `min-h-[56px] md:min-h-[70px] lg:min-h-[100px] xl:min-h-[120px]`

**Header Adjustment** (to accommodate banner):
- Reduce header bottom padding from `pb-2 lg:pb-8` to `pb-1 lg:pb-4`
- This saves 4-16px of vertical space
- Logo/controls remain same size

**Total Space Saved**: Approximately 8-20px depending on breakpoint

---

## Testing Checklist

- [ ] Upload room logo via Owner Panel
- [ ] Banner displays correctly in LiveRoom
- [ ] Logo scales properly at different screen sizes
- [ ] "Presented By" text wraps on mobile
- [ ] Fallback works when no logo/presenter set
- [ ] Logo appears in room carousel
- [ ] Multiple rooms with different logos work
- [ ] Banner styles switch correctly
- [ ] Dark mode support

---

## Documentation Files

- **This file**: `ROOM_LOGO_BANNER_SYSTEM.md`
- **Schema**: `sql/20251228_room_logo_banner_system.sql`
- **Room Templates**: `ROOM_TEMPLATES_SYSTEM.md`
- **Room Builder**: See `/owner/rooms` and `/owner/templates`

