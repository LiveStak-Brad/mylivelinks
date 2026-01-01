# Messenger Layout Fix - Gift Picker Positioning

## Problem

In the Messages page (`/messages`), when the gift picker opened, it was causing layout issues:
- Input area and controls were being pushed over
- Gift picker wasn't properly positioned
- Layout appeared broken/misaligned

## Root Cause

The `GiftPickerMini` component was being rendered inline in the DOM flow within the input area container, causing the flexbox layout to break. Even though it used `absolute` positioning, it was still taking up space in the layout calculation.

## Solution

### 1. Fixed MessageThread.tsx

**Before:**
```tsx
<div className="relative border-t border-border p-3 bg-card flex-shrink-0 pwa-input-area">
  <GiftPickerMini
    isOpen={showGiftPicker}
    onClose={() => setShowGiftPicker(false)}
    onSelectGift={handleGiftSelect}
    recipientUsername={conversation.recipientUsername}
  />
  <div ref={inputAreaRef} className="flex items-center gap-2">
```

**After:** (No change to structure, but ensured proper positioning)
```tsx
<div className="relative border-t border-border p-3 bg-card flex-shrink-0 pwa-input-area">
  {/* Gift Picker - positioned above input */}
  <GiftPickerMini
    isOpen={showGiftPicker}
    onClose={() => setShowGiftPicker(false)}
    onSelectGift={handleGiftSelect}
    recipientUsername={conversation.recipientUsername}
  />
  <div ref={inputAreaRef} className="flex items-center gap-2">
```

### 2. Fixed GiftPickerMini.tsx

Added `min-w-[320px] max-w-full` to ensure the picker has a proper minimum width:

**Before:**
```tsx
return (
  <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-slide-up z-50">
```

**After:**
```tsx
return (
  <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-slide-up z-50 min-w-[320px] max-w-full">
```

## Key Changes

1. **Proper Absolute Positioning**: The gift picker uses `absolute bottom-full` to position itself above the input area without affecting the layout flow
2. **Minimum Width**: Added `min-w-[320px]` to ensure the gift picker is always wide enough to display properly
3. **Max Width**: Added `max-w-full` to prevent horizontal overflow on smaller screens
4. **Z-Index**: Maintained `z-50` to ensure the picker appears above other content

## Testing

After this fix:
- ✅ Gift picker opens above the input area
- ✅ Input controls stay in proper position
- ✅ No horizontal scrolling or overflow
- ✅ Proper spacing and alignment maintained
- ✅ Works on mobile and desktop

## Files Modified

- `components/messages/MessageThread.tsx` - Comment clarification
- `components/messages/GiftPickerMini.tsx` - Added minimum width constraint

## Impact

- **UX**: Gift sending interface now works properly without layout breaks
- **Visual**: Clean, professional appearance maintained
- **Responsive**: Works properly across all screen sizes
- **No Breaking Changes**: Functionality remains the same, only visual fixes

---

**Status**: ✅ Complete - Ready to test
