# Profile Section Components - Quick Reference

## Import

```typescript
import {
  FeaturedSection,
  ScheduleSection,
  ClipsSection,
  MusicSection,
  ShowsSection,
  ProductsOrServicesSection,
  PressKitSection,
  type FeaturedItem,
  type ScheduleItem,
  type ClipItem,
  type MusicItem,
  type ShowItem,
  type ProductOrServiceItem,
  type PressKitItem,
} from '@/mobile/components/profile';
```

---

## Component Matrix

| Component | Profile Types | Layout | Key Features |
|-----------|---------------|--------|--------------|
| **FeaturedSection** | All | Horizontal scroll | Video/Link/Post types, thumbnails |
| **ScheduleSection** | Streamer | Vertical list | Day/time, recurring badge |
| **ClipsSection** | Streamer, Comedian | Horizontal scroll | Play button, duration, views |
| **MusicSection** | Musician | Horizontal scroll | Album art, streaming links |
| **ShowsSection** | Musician, Comedian | Horizontal scroll | Venue, tickets, status |
| **ProductsOrServicesSection** | Business | Horizontal scroll | Price, availability, category |
| **PressKitSection** | Musician | Vertical list | Download, file types |

---

## Mock Data Examples

### FeaturedItem
```typescript
const mockFeatured: FeaturedItem[] = [
  {
    id: '1',
    title: 'Epic Gaming Session',
    description: 'My best Valorant gameplay',
    thumbnail_url: 'https://example.com/thumb.jpg',
    type: 'video',
  },
];
```

### ScheduleItem
```typescript
const mockSchedule: ScheduleItem[] = [
  {
    id: '1',
    title: 'Chill Gaming Stream',
    day_of_week: 'Monday',
    time: '8:00 PM EST',
    description: 'Playing indie games and chatting',
    recurring: true,
  },
];
```

### ClipItem
```typescript
const mockClips: ClipItem[] = [
  {
    id: '1',
    title: 'Insane 5K Ace!',
    thumbnail_url: 'https://example.com/clip.jpg',
    duration: '0:45',
    views: 12500,
    created_at: '2024-12-20',
  },
];
```

### MusicItem
```typescript
const mockMusic: MusicItem[] = [
  {
    id: '1',
    title: 'Midnight Dreams',
    artist: 'The Band',
    album: 'Night Sessions',
    cover_url: 'https://example.com/cover.jpg',
    duration: '3:45',
    streaming_links: {
      spotify: 'https://spotify.com/...',
      apple_music: 'https://music.apple.com/...',
    },
  },
];
```

### ShowItem
```typescript
const mockShows: ShowItem[] = [
  {
    id: '1',
    title: 'Summer Tour 2024',
    venue: 'The Blue Note',
    location: 'New York, NY',
    date: 'Dec 31, 2024',
    time: '9:00 PM',
    poster_url: 'https://example.com/poster.jpg',
    ticket_link: 'https://tickets.com/...',
    status: 'upcoming',
  },
];
```

### ProductOrServiceItem
```typescript
const mockProducts: ProductOrServiceItem[] = [
  {
    id: '1',
    name: 'Premium Consulting Package',
    description: '1-on-1 business strategy session',
    price: '$299',
    image_url: 'https://example.com/product.jpg',
    category: 'Services',
    link: 'https://example.com/book',
    availability: 'available',
  },
];
```

### PressKitItem
```typescript
const mockPressKit: PressKitItem[] = [
  {
    id: '1',
    title: 'Official Bio',
    type: 'bio',
    file_url: 'https://example.com/bio.pdf',
    description: 'Extended artist biography',
    file_size: '245 KB',
    file_type: 'PDF',
  },
];
```

---

## Usage Pattern

```typescript
function ProfileScreen() {
  const [isOwner, setIsOwner] = useState(true);
  
  return (
    <ScrollView>
      {/* Profile Header (Agent 1) */}
      
      <FeaturedSection
        items={mockFeatured}
        isOwner={isOwner}
        onAdd={() => console.log('Add featured')}
        onEdit={(item) => console.log('Edit', item)}
        onDelete={(id) => console.log('Delete', id)}
      />
      
      <ScheduleSection
        items={mockSchedule}
        isOwner={isOwner}
        onAdd={() => console.log('Add schedule')}
        onEdit={(item) => console.log('Edit', item)}
        onDelete={(id) => console.log('Delete', id)}
      />
      
      {/* More sections... */}
    </ScrollView>
  );
}
```

---

## Empty State Behavior

### For Owners
- Shows dashed border card with emoji
- Title: "No [Content] Yet"
- Description explaining the section
- CTA button: "Add [Content]"

### For Visitors
- Section is **completely hidden** when `items.length === 0`
- No empty state shown
- Clean profile experience

---

## Styling Notes

- All components use `useThemeMode()` hook
- Supports light and dark themes automatically
- Consistent card shadows via `theme.elevations.card`
- Mobile-optimized touch targets
- Smooth press animations

---

## Profile Type Mapping

### Streamer Profile
- ✅ FeaturedSection
- ✅ ScheduleSection
- ✅ ClipsSection

### Musician Profile
- ✅ FeaturedSection
- ✅ MusicSection
- ✅ ShowsSection
- ✅ PressKitSection

### Comedian Profile
- ✅ FeaturedSection
- ✅ ClipsSection
- ✅ ShowsSection

### Business Profile
- ✅ FeaturedSection
- ✅ ProductsOrServicesSection

---

## Callback Handlers

All callbacks are optional (`?`), allowing progressive enhancement:

```typescript
// Minimal implementation
<FeaturedSection items={items} isOwner={false} />

// Full implementation
<FeaturedSection
  items={items}
  isOwner={true}
  onAdd={handleAdd}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

---

## Testing Checklist

- [ ] Empty state displays for owner
- [ ] Empty state hidden for visitor
- [ ] Add button appears for owner
- [ ] Edit/Delete buttons appear on items for owner
- [ ] Visitor sees content only
- [ ] Horizontal scroll works smoothly
- [ ] Cards render with proper shadows
- [ ] Theme switching works (light/dark)
- [ ] All callbacks fire correctly
- [ ] TypeScript types are correct

---

**Ready for Integration** ✅




