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

**Example Usage**:
```tsx
<RoomBanner
  roomKey="live-central"
  roomName="Live Central"
  roomLogoUrl="https://.../room-logos/live-central-logo.png"
  presentedBy="Presented by MyLiveLinks Official"
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
  className="z-50 flex-shrink-0"
/>
```

---

## Banner Styles

### Default
- Room logo on left
- Room title in center
- "Presented by..." on right
- Gradient background

### Minimal
- Room title + logo only
- White/dark mode background
- Compact height

### Card
- Elevated card design
- Shadow/border
- More prominent logo

### Gradient
- Full-width gradient (customizable)
- Logo + title overlay
- Modern, eye-catching

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

- **Format**: PNG with transparent background (preferred) or JPG
- **Size**: 200x200px minimum, 500x500px recommended
- **Aspect Ratio**: Square (1:1) preferred
- **File Size**: Max 5MB
- **Style**: Simple, recognizable at small sizes

### Presenter Text

- **Format**: "Presented by [Name/Brand]"
- **Examples**:
  - "Presented by MyLiveLinks Official"
  - "Presented by DJ Mixer"
  - "Presented by Gaming Central Team"
- **Max Length**: 50 characters

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

