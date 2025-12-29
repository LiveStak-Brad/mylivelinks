# Comment Likes - Visual Implementation Guide

## Before vs After

### BEFORE (Screenshot provided by user):
```
┌─────────────────────────────────────────┐
│  🙍 akgal420                            │
│  Dec 29 • 12:24 PM                      │
│                                         │
│  Hey hey everyone                       │
│                                         │
│  [Photo of user]                        │
│                                         │
│  ♡ Like    🎁 Gift    💬 Comment       │
└─────────────────────────────────────────┘
│  @CannaStreams                          │  <- Just username
│  12/29/2025, 3:01:03 PM                │  <- Timestamp
│  Welcome!                               │  <- Comment text
│                                         │
│  Write a comment...                     │
│  [Comment]                              │
└─────────────────────────────────────────┘
```

### AFTER (New implementation):
```
┌─────────────────────────────────────────┐
│  🙍 akgal420                            │
│  Dec 29 • 12:24 PM                      │
│                                         │
│  Hey hey everyone                       │
│                                         │
│  [Photo of user]                        │
│                                         │
│  ♡ Like    🎁 Gift    💬 Comment       │
└─────────────────────────────────────────┘
│  [👤]  @CannaStreams  3:01 PM    ♥ 5  │  <- Avatar + Username + Time + Like Count + Heart
│        Welcome!                         │  <- Indented comment text
│                                         │
│  [👤]  @OtherUser  4:15 PM        ♡    │  <- Another comment (not liked)
│        Nice post!                       │
│                                         │
│  Write a comment...                     │
│  [Comment]                              │
└─────────────────────────────────────────┘
```

## Component Breakdown

### Comment Item Structure

```
┌────────────────────────────────────────────────┐
│ [Avatar] | Username + Timestamp           | ♥  │
│          | Comment text content...         | 5  │
└────────────────────────────────────────────────┘
  32x32px    Flex: 1                         Like
  Rounded    Bold username, muted time       Button
```

### Web (Desktop) Layout
```
┌────────────────────────────────────────────────────────┐
│  [👤]  CannaStreams  •  3:01 PM              ♥ 5      │
│  32px  Welcome to the community!             16px     │
│                                                        │
│  [👤]  JaneDoe  •  4:30 PM                   ♡        │
│  32px  Great to see you here!                16px     │
│        └─ Hover to see like button ─────────┘         │
└────────────────────────────────────────────────────────┘
```

**Hover State:**
- Like button fades in when hovering over comment row
- Becomes pink (#ec4899) on hover
- Already-liked comments show filled heart always

### Mobile Layout
```
┌──────────────────────────────────┐
│  [👤]  CannaStreams  3:01 PM  ♥  │
│        Welcome to the           5 │
│        community!                 │
│                                   │
│  [👤]  JaneDoe  4:30 PM       ♡   │
│        Great to see              │
│        you here!                  │
│                                   │
│  ┌────────────────────────────┐  │
│  │ Write a comment...         │  │
│  └────────────────────────────┘  │
│              [Post Button]        │
└──────────────────────────────────┘
```

**Touch Interaction:**
- Tap avatar or username to go to profile
- Tap heart to like/unlike
- Heart fills immediately (optimistic update)
- Disabled state shown during API call

## Color Palette

### Light Mode:
- **Avatar Background:** `rgba(255,255,255,0.06)`
- **Username:** Text Primary (Dark)
- **Timestamp:** Text Secondary (Gray)
- **Comment Text:** Text Primary (Dark)
- **Like Icon (inactive):** Text Secondary (Gray)
- **Like Icon (active):** `#ec4899` (Pink 600)
- **Like Count:** Text Secondary (Gray)
- **Hover Background:** `rgba(236,72,153,0.05)` (Pink 50)

### Dark Mode:
- **Avatar Background:** `rgba(255,255,255,0.06)`
- **Username:** Text Primary (Light)
- **Timestamp:** Text Secondary (Gray)
- **Comment Text:** Text Primary (Light)
- **Like Icon (inactive):** Text Secondary (Gray)
- **Like Icon (active):** `#f9a8d4` (Pink 400)
- **Like Count:** Text Secondary (Gray)
- **Hover Background:** `rgba(236,72,153,0.1)` (Pink 950/30)

## Animation States

### Like Button Interaction Flow:

1. **Default State (Not Liked)**
   ```
   Icon: ♡ (outline heart)
   Color: Gray/Secondary
   Opacity: 0 (web - hover to show)
   ```

2. **Hover State (Not Liked)**
   ```
   Icon: ♡ (outline heart)
   Color: Pink (#ec4899)
   Opacity: 1
   Background: Pink tint
   ```

3. **Clicked → Liked**
   ```
   Icon: ♡ → ♥ (fills)
   Color: Gray → Pink
   Count: n → n+1
   Scale: 1.0 → 1.1 → 1.0 (bounce)
   ```

4. **Already Liked State**
   ```
   Icon: ♥ (filled heart)
   Color: Pink (#ec4899)
   Opacity: 1 (always visible)
   ```

5. **Clicked → Unliked**
   ```
   Icon: ♥ → ♡ (empties)
   Color: Pink → Gray
   Count: n → n-1
   Scale: 1.0 → 0.9 → 1.0
   ```

## Typography

### Web:
- **Username:** 13px, font-weight: 700 (bold)
- **Timestamp:** 11px, font-weight: 400
- **Comment Text:** 13px, font-weight: 400, line-height: 18px
- **Like Count:** 11px, font-weight: 500

### Mobile:
- **Username:** 13sp, font-weight: 900
- **Timestamp:** 11sp, font-weight: 400
- **Comment Text:** 13sp, font-weight: 400, line-height: 18sp
- **Like Count:** 11sp, font-weight: 700

## Spacing

### Comment Item:
- **Padding:** 12px (top/bottom), 16px (left/right)
- **Gap between avatar and content:** 10-12px
- **Gap between comments:** 12px
- **Avatar size:** 32x32px
- **Avatar border-radius:** 16px (50%)

### Like Button:
- **Padding:** 6px (mobile), 1.5px (web)
- **Icon size:** 16px
- **Gap between count and icon:** 4px

## Accessibility (Web)

```html
<!-- Example markup -->
<button
  onClick={handleLike}
  aria-label="Like comment by CannaStreams"
  aria-pressed={isLiked}
  disabled={isLoading}
>
  <HeartIcon aria-hidden="true" />
  {likeCount > 0 && <span aria-label={`${likeCount} likes`}>{likeCount}</span>}
</button>
```

## Mobile-Specific Considerations

1. **Touch Targets:** 44x44pt minimum (iOS guidelines)
2. **Keyboard Handling:** Dismisses on tap outside
3. **Scroll Behavior:** Maintains position when expanding comments
4. **Loading States:** Spinner or disabled state during operations
5. **Error Handling:** Alert dialogs for user feedback

## Performance Optimizations

1. **Denormalized Counts:** `like_count` column prevents N+1 queries
2. **Optimistic Updates:** UI responds immediately
3. **Batch Loading:** Single query to check all liked comments
4. **Memoization:** React.useCallback for expensive operations
5. **Lazy Loading:** Comments load only when expanded

## Database Query Efficiency

### Before (N+1 problem):
```sql
-- For each comment, query likes separately
SELECT * FROM post_comments WHERE post_id = ?;
SELECT COUNT(*) FROM comment_likes WHERE comment_id = ?; -- N times!
```

### After (Optimized):
```sql
-- Single query with denormalized count
SELECT *, like_count FROM post_comments WHERE post_id = ?;

-- Batch check for user's likes
SELECT comment_id FROM comment_likes 
WHERE profile_id = ? AND comment_id IN (?, ?, ...);
```

## API Response Format

```json
{
  "comments": [
    {
      "id": "12345",
      "post_id": "post-uuid",
      "text_content": "Welcome!",
      "created_at": "2025-12-29T15:01:03.000Z",
      "like_count": 5,
      "is_liked": true,
      "author": {
        "id": "user-uuid",
        "username": "CannaStreams",
        "avatar_url": "https://..."
      }
    }
  ],
  "limit": 10
}
```

## Testing Matrix

| Feature | Web | Mobile | Status |
|---------|-----|--------|--------|
| Avatar display | ✅ | ✅ | Complete |
| Username click → profile | ✅ | ✅ | Complete |
| Timestamp formatting | ✅ | ✅ | Complete |
| Like button toggle | ✅ | ✅ | Complete |
| Like count display | ✅ | ✅ | Complete |
| Optimistic updates | ✅ | ✅ | Complete |
| Loading states | ✅ | ✅ | Complete |
| Error handling | ✅ | ✅ | Complete |
| Dark mode support | ✅ | ✅ | Complete |
| Hover effects | ✅ | N/A | Complete |
| Touch interactions | N/A | ✅ | Complete |

---

## Summary

The implementation successfully matches the Instagram/modern social media comment pattern with:
- ✅ User avatars on comments
- ✅ Clickable usernames
- ✅ Visible like buttons with counts
- ✅ Smooth interactions and animations
- ✅ Full web and mobile parity
- ✅ Optimized performance
- ✅ Clean, maintainable code

