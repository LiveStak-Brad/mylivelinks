# Messenger Photos Fix - Mobile View

## Issue
Photos were not displaying in the messenger/messages interface on mobile devices. When avatar images failed to load (due to broken URLs, CORS issues, or missing files), the page would show broken image icons instead of graceful fallbacks.

## Root Cause
The avatar display logic in the messenger components was using a simple conditional rendering pattern that didn't handle image loading errors. When avatar URLs from the database were broken or failed to load:

1. **ConversationList.tsx**: Conversation avatars showed broken images
2. **MessageThread.tsx**: Thread header avatars showed broken images  
3. **FriendsList.tsx**: Friend avatars showed broken images

## Solution
Implemented graceful fallback handling with `onError` handlers on all avatar images. The fix includes:

### Pattern Used
```tsx
{conversation.recipientAvatar ? (
  <img
    src={conversation.recipientAvatar}
    alt={conversation.recipientUsername}
    className="w-12 h-12 rounded-full object-cover bg-muted"
    onError={(e) => {
      // Hide broken image and show fallback
      e.currentTarget.style.display = 'none';
      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
      if (fallback) fallback.style.display = 'flex';
    }}
  />
) : null}
<div 
  className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg"
  style={{ display: conversation.recipientAvatar ? 'none' : 'flex' }}
>
  {(conversation.recipientDisplayName || conversation.recipientUsername).charAt(0).toUpperCase()}
</div>
```

### Key Improvements

1. **Always Render Fallback**: Both the `<img>` and fallback `<div>` are always rendered, with visibility controlled by inline styles

2. **Error Handling**: When an image fails to load:
   - Hide the broken image with `display: none`
   - Show the fallback div with the user's initial

3. **No Avatar Case**: When `avatar_url` is null/undefined:
   - Don't render the `<img>` element
   - Show the fallback div immediately

4. **Visual Consistency**: Added `bg-muted` background to images for better loading states

## Files Modified

- **components/messages/ConversationList.tsx**
  - Fixed conversation row avatars (line ~118-137)

- **components/messages/MessageThread.tsx**
  - Fixed thread header avatar (line ~213-233)

- **components/messages/FriendsList.tsx**
  - Fixed friend avatars in horizontal layout (line ~316-329)
  - Fixed friend avatars in vertical layout (line ~369-382)

- **components/im/IMChatWindow.tsx**
  - Fixed minimized avatar bubble (line ~148-163)
  - Fixed header avatar (line ~205-219)
  - Fixed empty state avatar (line ~269-276)

## Testing
Test on mobile devices or mobile view (< 768px width):

1. **Open Messages Modal**: Click the messages icon
2. **Check Conversation List**: All user avatars should display (either photo or initial)
3. **Open a Thread**: Thread header should show recipient avatar (either photo or initial)
4. **Check Friends List**: All friend avatars should display correctly
5. **Test Broken URLs**: If avatar URLs are broken, users should see colored circles with initials instead of broken image icons

## Benefits

- ✅ No more broken image icons
- ✅ Graceful degradation when images fail to load
- ✅ Better UX on slow connections
- ✅ Handles missing avatar URLs properly
- ✅ Works on all screen sizes (desktop and mobile)
- ✅ Maintains visual consistency across the messenger

## Related Components
This pattern can be applied to other components that display user avatars if similar issues are encountered:

- `components/Chat.tsx` (global chat)
- `components/MiniProfile.tsx` (profile modals)
- `components/Tile.tsx` (live stream tiles)
- `components/ViewerList.tsx` (viewer sidebar)
- `components/UserMenu.tsx` (user menu dropdown)

