# Options & Mixer Buttons Implementation

## Summary
Added two distinct buttons to the right controller column of the mobile LiveRoom screen:
1. **Options Button** - Opens OptionsModal
2. **Mixer Button** - Opens MixerModal (12-slot volume control)

## Changes Made

### 1. Created MixerModal Component (`mobile/components/MixerModal.tsx`)
- 12-slot volume mixer with sliders
- Local state management (volumes[12], default 1.0)
- Exposes `onChange(slotIndex, value)` callback for external logic
- Custom slider implementation using react-native-gesture-handler
- Theme-aware styling matching existing modal patterns
- Reset button to restore all volumes to 100%

### 2. Updated OptionsMenu Component (`mobile/components/OptionsMenu.tsx`)
- Added support for external control via `visible` and `onClose` props
- Maintains backward compatibility (can still be used standalone with trigger button)
- Controlled/uncontrolled mode based on whether `visible` prop is provided
- Only shows trigger button when used in uncontrolled mode

### 3. Updated LiveRoomScreen (`mobile/screens/LiveRoomScreen.tsx`)

#### Imports Added:
```typescript
import { OptionsMenu } from '../components/OptionsMenu';
import { MixerModal } from '../components/MixerModal';
```

#### State Added:
```typescript
const [showOptionsModal, setShowOptionsModal] = useState(false);
const [showMixerModal, setShowMixerModal] = useState(false);
```

#### Handlers Added:
```typescript
handleOptionsPress() // Opens OptionsModal
handleMixerPress()   // Opens MixerModal
handleMixerChange(slotIndex, value) // Logs mixer changes, ready for LiveKit integration
```

#### Right Column Layout (Top to Bottom):
1. **Options** (⚙️) - Gold color
2. **Gift** (🎁) - Pink color
3. **Spacer** (flex)
4. **PiP** (text) - Purple color
5. **Spacer** (flex)
6. **Mixer** (text "Mix") - Green color
7. **Share** (↗) - Green color

#### Modals Rendered:
- OptionsMenu with `visible={showOptionsModal}`
- MixerModal with `visible={showMixerModal}`

## Design Constraints Met
✅ Did NOT touch Grid12 or Tile components  
✅ Did NOT change column widths/padding/gutter  
✅ Used existing right controller container  
✅ Text labels used (Options emoji, "Mix" text)  
✅ MixerModal uses local state only  
✅ onChange callback exposed for future LiveKit integration  

## UI Layout
```
RIGHT COLUMN (80px width):
┌─────────────┐
│   Options ⚙️ │ <- Top (gold)
│   Gift 🎁   │ <- 
│             │
│    (flex)   │
│             │
│    PiP      │ <- Middle (purple text)
│             │
│    (flex)   │
│             │
│    Mix      │ <- (green text)
│   Share ↗   │ <- Bottom (green)
└─────────────┘
```

## Future Integration
The `handleMixerChange` callback is ready to wire LiveKit audio track volumes:
```typescript
const handleMixerChange = useCallback((slotIndex: number, value: number) => {
  // TODO: Wire LiveKit audio track volume control
  if (DEBUG) console.log(`[MIXER] Slot ${slotIndex} → ${Math.round(value * 100)}%`);
}, []);
```

## Testing Notes
- Options button opens the full OptionsMenu modal
- Mixer button opens the 12-slot audio mixer
- Both modals can be closed via backdrop tap or close button
- Mixer reset button restores all volumes to 100%
- No linting errors introduced
- All existing functionality preserved

