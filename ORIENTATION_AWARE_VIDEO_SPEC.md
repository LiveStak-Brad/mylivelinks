# Orientation-Aware Video Streaming - Implementation Plan

## Overview
Make video feeds adapt to the camera orientation (portrait vs landscape) on mobile web, so portrait videos display as portrait and landscape as landscape.

## Current Issues
1. Portrait camera feeds show in landscape containers (horizontal bars/cropping)
2. Videos always use `object-cover` which crops portrait content
3. No orientation metadata passed with video streams
4. Device modal preview doesn't adapt to orientation

## Solution

### 1. Detect & Store Camera Orientation
When going live, detect the camera's aspect ratio and store orientation preference.

### 2. Dynamic Video Container Aspect Ratios
Instead of fixed `aspect-video` (16:9), use dynamic aspect ratios based on video dimensions.

### 3. Use `object-contain` for Portrait Videos
- Landscape videos: `object-cover` (fill container, crop edges)
- Portrait videos: `object-contain` (letterbox, show full frame)

### 4. Responsive Tile Sizing
Tiles adapt their aspect ratio to match the video orientation.

## Implementation

### A. Update Tile Component
**File**: `components/Tile.tsx`

**Changes**:
1. Detect video track dimensions using `videoTrack.dimensions`
2. Calculate aspect ratio: `width / height`
3. Apply conditional classes:
   - If `aspectRatio > 1`: landscape → `object-cover`
   - If `aspectRatio < 1`: portrait → `object-contain`

```tsx
const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16/9);
const isPortraitVideo = videoAspectRatio < 1;

// When video track loads
useEffect(() => {
  if (videoTrack) {
    const dimensions = videoTrack.dimensions;
    if (dimensions) {
      const ratio = dimensions.width / dimensions.height;
      setVideoAspectRatio(ratio);
    }
  }
}, [videoTrack]);

// Video element
<video
  className={`w-full h-full ${isPortraitVideo ? 'object-contain' : 'object-cover'} ${isMuted ? 'grayscale' : ''}`}
  ...
/>
```

### B. Update Device Selection Modal
**File**: `components/GoLiveButton.tsx`

**Changes**:
1. Make preview video responsive to orientation
2. Detect current orientation using `useOrientation` hook
3. Adjust preview container aspect ratio

```tsx
import { useOrientation } from '@/hooks/useOrientation';

const { isPortrait } = useOrientation();

// Preview container
<div 
  className="relative w-full bg-black rounded-lg overflow-hidden"
  style={{ 
    aspectRatio: isPortrait ? '9/16' : '16/9',
    minHeight: '180px' 
  }}
>
  <video
    className={`w-full h-full ${isPortrait ? 'object-contain' : 'object-cover'}`}
    ...
  />
</div>
```

### C. Add Orientation Hint
Show a subtle message encouraging landscape mode for better viewing, but allow portrait.

```tsx
{isPortrait && (
  <div className="text-xs text-amber-500 dark:text-amber-400 mt-2 flex items-center gap-1">
    <span>💡</span>
    <span>Tip: Rotate to landscape for wider view (optional)</span>
  </div>
)}
```

### D. Dynamic Camera Constraints
Allow portrait video capture by adjusting media constraints.

```tsx
const getVideoConstraints = (orientation: 'portrait' | 'landscape') => {
  return {
    width: orientation === 'portrait' ? { ideal: 720 } : { ideal: 1280 },
    height: orientation === 'portrait' ? { ideal: 1280 } : { ideal: 720 },
    aspectRatio: orientation === 'portrait' ? 9/16 : 16/9,
  };
};
```

## Benefits
1. ✅ Portrait videos display properly (no cropping/black bars)
2. ✅ Landscape videos display as before (full container)
3. ✅ Users can choose orientation based on content
4. ✅ Better mobile experience
5. ✅ Previews match final output

## Testing Checklist
- [ ] Portrait camera shows in portrait container
- [ ] Landscape camera shows in landscape container
- [ ] Switching orientation updates preview immediately
- [ ] Other viewers see correct orientation
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Desktop viewers see mobile streams correctly

## Files to Modify
1. `components/Tile.tsx` - Add aspect ratio detection & conditional rendering
2. `components/GoLiveButton.tsx` - Make preview orientation-aware
3. `hooks/useLiveKitPublisher.ts` (if needed) - Add orientation metadata

## Next Steps
Ready to implement when you approve!

