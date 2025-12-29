# Files Changed — Mobile Profile Section Titles Fix

## Summary
Fixed "floating title" issue by moving all section titles INSIDE their card containers to match web parity.

## Files Modified (9 total)

### 1. `mobile/components/profile/MusicSection.tsx`
- Added `sectionCard` wrapper
- Moved title inside card
- Updated styles: container, sectionCard, header, scrollContent, emptyState

### 2. `mobile/components/profile/ShowsSection.tsx`
- Added `sectionCard` wrapper
- Moved "Shows & Events" title inside card
- Updated styles for proper containment

### 3. `mobile/components/profile/MerchSection.tsx`
- Added `sectionCard` wrapper
- Moved "Merchandise" title inside card
- Updated styles for consistency

### 4. `mobile/components/profile/ClipsSection.tsx`
- Added `sectionCard` wrapper
- Moved "Clips" title inside card
- Updated styles

### 5. `mobile/components/profile/PortfolioSection.tsx`
- Added `sectionCard` wrapper
- Moved "Portfolio" title inside card
- Updated styles

### 6. `mobile/components/profile/BusinessInfoSection.tsx`
- Moved "Business Info" title inside existing card structure
- Updated header to be inside card
- Added padding adjustments

### 7. `mobile/components/profile/ScheduleSection.tsx`
- Added `sectionCard` wrapper
- Moved "Stream Schedule" title inside card
- Updated styles for list container

### 8. `mobile/components/profile/FeaturedSection.tsx`
- Added `sectionCard` wrapper
- Moved "Featured" title inside card
- Updated styles

### 9. `mobile/components/profile/VideoPlaylistPlayer.tsx`
- Added `sectionCard` wrapper (affects MusicVideos, ComedySpecials, VlogReels)
- Moved playlist title inside card
- Updated container and header styles
- Added playerCard margin adjustment

## Pattern Applied

### JSX Structure
```tsx
<View style={styles.container}>
  <View style={styles.sectionCard}>
    <View style={styles.header}>
      <Text style={styles.title}>Title</Text>
      {/* Action buttons */}
    </View>
    {/* Content */}
  </View>
</View>
```

### Style Pattern
```typescript
container: {
  paddingVertical: 20,
  paddingHorizontal: 16,
},
sectionCard: {
  backgroundColor: theme.colors.surfaceCard,
  opacity: cardOpacity,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: theme.colors.border,
  shadowColor: cardShadow.color,
  shadowOffset: cardShadow.offset,
  shadowOpacity: cardShadow.opacity,
  shadowRadius: cardShadow.radius,
  elevation: cardShadow.elevation,
  overflow: 'hidden',
},
header: {
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 12,
  // ... rest of header styles
},
```

## Verification
✅ All section titles are now inside their cards  
✅ Web parity achieved  
✅ Visual hierarchy restored  
✅ No floating labels remaining

