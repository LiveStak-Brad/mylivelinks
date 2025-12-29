# ROOMS SCREEN - WEB → MOBILE PARITY CHECKLIST

## Web Reference Analysis (app/rooms/page.tsx)

### Layout Structure
- [x] Page header with Video icon + "Live Rooms" title
- [x] Subtitle: "Discover and join live streaming rooms"
- [x] Search bar with Search icon
- [x] "Live Now" filter button with pulsing dot
- [x] Room count badge with Users icon
- [x] Grid layout: 1 col mobile, 2 col sm, 3 col lg, 4 col xl
- [x] Gap-4 spacing between cards

### Room Card Design
- [x] Aspect ratio: video (16:9)
- [x] Thumbnail image with fallback gradient + Video icon
- [x] LIVE badge: red-600 bg, white text, pulsing dot, top-left
- [x] Viewer count badge: black/70 bg, white text, Users icon, top-right
- [x] Hover effects: shadow-lg, translate-y-1, scale-105 on image
- [x] Card content padding: p-4
- [x] Room title: font-semibold, line-clamp-1
- [x] Description: text-sm, muted, line-clamp-2
- [x] Category + tags badges at bottom
- [x] Tap opens: `/rooms/${room.slug}`

### States
- [x] Loading: 8 skeleton cards in grid
- [x] Empty (no filters): "No rooms found" with EmptyState component
- [x] Empty (with Live filter): "No rooms are live right now"
- [x] Empty (with search): "Try adjusting your search or filters"
- [x] Coming Soon card: when no rooms and no filters/search

### Data & Filtering
- [x] Fetch from `rooms` table with `is_published: true`
- [x] Sort: is_live DESC, viewer_count DESC
- [x] Filter: Live Only toggle
- [x] Search: display_name, description, category, tags
- [x] Fields: id, slug, display_name, description, thumbnail_url, is_live, viewer_count, category, tags

### Interaction
- [x] Tap room card → navigate to room detail/viewer
- [x] Search input → filter results instantly
- [x] Live Now button → toggle filter
- [x] Clear Filters action when empty with filters applied

## Mobile Implementation Plan

### New Files
1. `mobile/screens/RoomsScreen.tsx` - Main rooms list screen
2. `mobile/components/rooms/RoomCard.tsx` - Individual room card component

### Navigation
- Add "Rooms" to RootStackParamList
- Add Stack.Screen for Rooms in App.tsx
- Add "Rooms" button to HomeDashboardScreen
- Room card tap → Navigate to room viewer (future: RoomViewerScreen)

### Mobile-Specific Adaptations
- FlatList with 2-column grid (numColumns=2) for mobile
- Pull-to-refresh support
- Optimized images (use expo-image or react-native fast-image)
- Loading states use ActivityIndicator + skeleton placeholders
- Search uses TextInput with search icon
- Filter button styled for touch (min 44px tap target)

### UI Parity Requirements
✅ **Match exactly:**
- Card aspect ratio and content layout
- LIVE badge design and position
- Viewer count badge design
- Title/description text hierarchy
- Empty state copy and icons
- Search placeholder text
- Filter button label and behavior

❌ **Do NOT add:**
- Features not in web version
- Different sorting/filtering options
- New room creation UI
- Long-press menus or context actions

## Acceptance Criteria
- [ ] Visual match: Mobile rooms grid looks identical to web at-a-glance
- [ ] All card fields present: thumbnail, LIVE badge, viewer count, title, description, category
- [ ] Search works identically to web
- [ ] Live filter works identically to web
- [ ] Loading state shows skeleton cards like web
- [ ] Empty states show correct copy based on filters
- [ ] Tap navigation works (even if viewer screen is placeholder)
- [ ] No "Rooms disabled" or "Live disabled" messages



