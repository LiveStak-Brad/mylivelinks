# 🎨 Visual Guide: Facebook & Instagram Style Redesign

## Quick Visual Reference for Implementation

This is a companion document to `FACEBOOK_INSTAGRAM_FEED_REDESIGN_SPEC.md` that provides visual examples and quick-reference mockups.

---

## 📸 Instagram Grid - Photos/Videos Tab

### Desktop Layout (1024px+)
```
┌─────────────────────────────────────────────────────────────────┐
│                         Profile Header                           │
│                      (existing component)                        │
├─────────────────────────────────────────────────────────────────┤
│  [Info] [Feed] [Photos] ← Active Tab                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │          │  │  ▶️       │  │          │    3 columns         │
│  │  Photo   │  │  Video   │  │  Photo   │    Equal width       │
│  │          │  │          │  │          │    Square (1:1)      │
│  └──────────┘  └──────────┘  └──────────┘    12px gap          │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │          │  │          │  │          │                      │
│  │  Photo   │  │  Photo   │  │  Video   │                      │
│  │          │  │          │  │  ▶️       │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │          │  │          │  │          │                      │
│  │  Photo   │  │  Photo   │  │  Photo   │                      │
│  │          │  │          │  │          │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                  │
│                    [Load More]                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 640px)
```
┌────────────────────────────┐
│      Profile Header        │
├────────────────────────────┤
│ [Info][Feed][Photos]       │
├────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐     │
│  │    │ │ ▶️  │ │    │     │  3 cols
│  │Pic │ │Vid │ │Pic │     │  4px gap
│  └────┘ └────┘ └────┘     │  Square
│                            │
│  ┌────┐ ┌────┐ ┌────┐     │
│  │    │ │    │ │    │     │
│  │Pic │ │Pic │ │Pic │     │
│  └────┘ └────┘ └────┘     │
│                            │
│  ┌────┐ ┌────┐ ┌────┐     │
│  │    │ │ ▶️  │ │    │     │
│  │Pic │ │Vid │ │Pic │     │
│  └────┘ └────┘ └────┘     │
│                            │
│       [Load More]          │
│                            │
└────────────────────────────┘
```

### Tile Hover State (Desktop)
```
Before Hover:
┌──────────────┐
│              │
│              │
│    Photo     │
│              │
│              │
└──────────────┘

On Hover:
┌──────────────┐
│❤️ 42  💬 12  │  ← Stats overlay
│              │     rgba(0,0,0,0.3)
│      👁️      │  ← View icon (enlarged)
│    VIEW      │     Centered
│              │
│    🎁 120    │  ← Gifts (bottom-right)
└──────────────┘
```

---

## 📰 Facebook Feed - Posts/Feed Tab

### Desktop Feed Card (680px max-width)
```
┌──────────────────────────────────────────────────────────┐
│  ┌──┐                                                ⋯  │ ← Post Header
│  │ A│  John Doe                                         │   60px height
│  └──┘  2 hours ago                                      │   Avatar: 40px
├──────────────────────────────────────────────────────────┤
│                                                          │
│  This is my post text content. It can be multiple       │ ← Text Content
│  lines and preserves formatting. Emojis work too! 🎉   │   15px font
│                                                          │   line-height 1.4
├──────────────────────────────────────────────────────────┤
│                                                          │
│                                                          │
│                    [PHOTO/VIDEO]                         │ ← Media
│                   max-height 600px                       │   Full width
│                   aspect-ratio preserved                 │   Rounded 8px
│                                                          │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  ❤️ 42 likes · 💬 12 comments · 🎁 120 coins           │ ← Engagement Bar
│                                                          │   13px font
├──────────────────────────────────────────────────────────┤
│        ❤️ Like        │    💬 Comment    │   🎁 Gift   │ ← Action Buttons
│                       │                  │              │   44px height
└──────────────────────────────────────────────────────────┘   Even spacing
```

### Mobile Feed Card
```
┌────────────────────────────┐
│ ┌┐                      ⋯  │ ← Compact header
│ └┘ John Doe · 2h           │   40px avatar
├────────────────────────────┤
│                            │
│ Post text here...          │ ← Text 14px
│                            │
├────────────────────────────┤
│                            │
│       [PHOTO]              │ ← Full width
│                            │
├────────────────────────────┤
│ ❤️ 42 · 💬 12 · 🎁 120   │ ← Compact stats
├────────────────────────────┤
│ ❤️ │ 💬 │ 🎁              │ ← Icons only
│Like│Cmnt│Gift             │   on mobile
└────────────────────────────┘
```

### Comments Expanded View
```
┌──────────────────────────────────────────────────────────┐
│        ❤️ Like        │    💬 Comment    │   🎁 Gift   │
├──────────────────────────────────────────────────────────┤
│  ┌──┐                                              🎁   │ ← Comment
│  │ A│  Jane Smith                                       │   Item
│  └──┘  Great photo! Love it! ❤️                         │
│        2 hours ago                                      │
├──────────────────────────────────────────────────────────┤
│  ┌──┐                                              🎁   │ ← Another
│  │ B│  Mike Johnson                                     │   Comment
│  └──┘  Amazing work! 👏                                 │
│        1 hour ago                                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │ ← Add Comment
│  │ Write a comment...                             │    │   Auto-expand
│  └────────────────────────────────────────────────┘    │   textarea
│                                                [Send]   │
└──────────────────────────────────────────────────────────┘
```

---

## 🎁 Gift System - Universal Modal

### Desktop Gift Modal (Centered)
```
                    ┌────────────────────────────────────────┐
                    │  🎁 Send Gift to @johndoe         ✕   │
                    ├────────────────────────────────────────┤
                    │  Your Coins: 💰 1,250                 │
                    ├────────────────────────────────────────┤
                    │  ┌────┐ ┌────┐ ┌────┐ ┌────┐         │
                    │  │🌹  │ │❤️  │ │⭐  │ │💎  │         │
                    │  │Rose│ │Hrt │ │Star│ │Dmd │         │
                    │  │ 50 │ │100 │ │250 │ │500 │         │
                    │  └────┘ └────┘ └────┘ └────┘         │
                    │  ┌────┐ ┌────┐ ┌────┐ ┌────┐         │
                    │  │👑  │ │🔥  │ │🚀  │ │🦄  │         │
                    │  │Crwn│ │Fire│ │Rock│ │Uni │         │
                    │  │1000│ │2500│ │5000│ │10K │         │
                    │  └────┘ └────┘ └────┘ └────┘         │
                    │  (scrollable grid)                     │
                    ├────────────────────────────────────────┤
                    │  Selected: 💎 Diamond                 │
                    │  💰 500 coins → ✨ 500 diamonds       │
                    ├────────────────────────────────────────┤
                    │     [Cancel]    [🎁 Send Gift]        │
                    └────────────────────────────────────────┘
```

### Mobile Gift Modal (Bottom Sheet)
```
┌────────────────────────────┐
│                            │
│  🎁 Send Gift to @johndoe  │ ← Slides up from
│  Your Coins: 💰 1,250      │   bottom on mobile
├────────────────────────────┤
│ ┌──┐┌──┐┌──┐┌──┐          │
│ │🌹││❤️││⭐││💎│          │ ← 4 columns
│ │50││100││250││500│        │   Square tiles
│ └──┘└──┘└──┘└──┘          │
│ ┌──┐┌──┐┌──┐┌──┐          │
│ │👑││🔥││🚀││🦄│          │
│ │1K││2.5K││5K││10K│        │
│ └──┘└──┘└──┘└──┘          │
├────────────────────────────┤
│ Selected: 💎 Diamond      │
│ 💰 500 → ✨ 500 💎        │
├────────────────────────────┤
│ [Cancel]  [🎁 Send Gift]  │
└────────────────────────────┘
```

---

## 🎨 Color Reference

### Light Mode Colors
```
Background:     #FFFFFF  ███████████
Card BG:        #FFFFFF  ███████████
Border:         #E4E6EB  ███████████
Text Primary:   #050505  ███████████
Text Secondary: #65676B  ███████████
Hover BG:       #F2F3F5  ███████████
Like Red:       #F44336  ███████████
Gift Purple:    #9333EA  ███████████
Link Blue:      #0866FF  ███████████
```

### Dark Mode Colors
```
Background:     #18191A  ███████████
Card BG:        #242526  ███████████
Border:         #3E4042  ███████████
Text Primary:   #E4E6EB  ███████████
Text Secondary: #B0B3B8  ███████████
Hover BG:       #3A3B3C  ███████████
Like Red:       #F44336  ███████████
Gift Purple:    #A855F7  ███████████
Link Blue:      #3B9EFF  ███████████
```

---

## 📐 Spacing System

### Component Spacing (Desktop)
```
Post Card Padding:      16px ├──────┤
Gap Between Posts:      16px      ↕
Section Gaps:           16px      ↕
Header Height:          60px ┌────┐ 60px
Action Button Height:   44px ├────┤ 44px
Avatar Size:            40px ┌──┐ 40x40
```

### Component Spacing (Mobile)
```
Post Card Padding:      12px ├───┤
Gap Between Posts:      16px     ↕
Section Gaps:           12px     ↕
Header Height:          60px ┌──┐ 60px
Action Button Height:   44px ├──┤ 44px
Avatar Size:            32px ┌┐ 32x32
```

---

## 📱 Responsive Breakpoints

### Grid Columns by Screen Size
```
Mobile (<640px):
┌────┐┌────┐┌────┐    3 columns, 4px gap
│    ││    ││    │
└────┘└────┘└────┘

Tablet (640-1024px):
┌──────┐┌──────┐┌──────┐    3 columns, 8px gap
│      ││      ││      │
└──────┘└──────┘└──────┘

Desktop (1024px+):
┌────────┐┌────────┐┌────────┐    3 columns, 12px gap
│        ││        ││        │     max-width: 935px
└────────┘└────────┘└────────┘
```

### Feed Width by Screen Size
```
Mobile:
├──────────────────────┤
│    Full Width        │  Padding: 8px
├──────────────────────┤

Tablet:
    ├───────────────┤
    │  Max 600px    │      Centered
    ├───────────────┤

Desktop:
        ├─────────┤
        │ Max 680px│          Centered (FB standard)
        ├─────────┤
```

---

## 🎯 Touch Targets (Mobile)

### Minimum Touch Sizes (iOS/Android Guidelines)
```
Action Buttons:
├────────────────────┤ 44px minimum
│    ❤️ Like         │ height
├────────────────────┤

Grid Tiles:
┌──────────┐
│          │ Min 100x100px
│  Photo   │ (33% width - gap)
│          │
└──────────┘

Gift Button (in comment):
┌────┐
│ 🎁 │ 32x32px minimum
└────┘
```

---

## 🌊 Animation Timing Reference

### Like Button Animation
```
Frame 1 (0ms):     ♡     Scale: 1.0    Gray
Frame 2 (50ms):    ♡     Scale: 1.1    Gray
Frame 3 (100ms):   ❤️    Scale: 1.2    Red (filled)
Frame 4 (200ms):   ❤️    Scale: 1.1    Red
Frame 5 (300ms):   ❤️    Scale: 1.0    Red (final)
```

### Comment Section Expand
```
Collapsed:  Height: 0px     Opacity: 0
            ├──────────────┤

Expanding:  Height: auto    Opacity: 0.5
(100ms)     ├──────────────┤
            │              │

Expanded:   Height: auto    Opacity: 1.0
(200ms)     ├──────────────┤
            │   Comments   │
            │   Comments   │
            │   [Input]    │
            └──────────────┘
```

---

## 🔤 Typography Scale

### Font Sizes (Mobile vs Desktop)
```
Post Author:
Mobile:   14px  John Doe
Desktop:  15px  John Doe

Post Content:
Mobile:   14px  This is my post text...
Desktop:  15px  This is my post text...

Timestamp:
Mobile:   12px  2 hours ago
Desktop:  13px  2 hours ago

Action Buttons:
Mobile:   14px  Like
Desktop:  15px  Like

Engagement Stats:
Mobile:   12px  ❤️ 42 likes
Desktop:  13px  ❤️ 42 likes
```

---

## 🎭 State Variations

### Action Button States
```
Default (Not Liked):
┌──────────────┐
│   ♡ Like     │  Gray text (#65676B)
└──────────────┘  Outline heart

Hover:
┌──────────────┐
│   ♡ Like     │  Darker text (#050505)
└──────────────┘  Light gray BG

Active (Liked):
┌──────────────┐
│   ❤️ Like    │  Red text (#F44336)
└──────────────┘  Filled heart

Disabled:
┌──────────────┐
│   ♡ Like     │  Light gray (50% opacity)
└──────────────┘  Cursor not-allowed
```

### Loading States
```
Grid Loading:
┌────────┐┌────────┐┌────────┐
│░░░░░░░░││░░░░░░░░││░░░░░░░░│  Animated shimmer
│░░░░░░░░││░░░░░░░░││░░░░░░░░│  Gray skeleton
└────────┘└────────┘└────────┘

Post Loading:
┌──────────────────────────┐
│ ░░░ ░░░░░░░░░░        │  Skeleton card
│ ░░░░░░░░░░░░░░        │  with animated
│ ░░░░░░░░░░░░░░        │  pulse effect
│ ░░░░░░░░░░░░          │
└──────────────────────────┘
```

---

## 🚨 Error & Empty States

### Empty Grid State
```
┌──────────────────────────────┐
│                              │
│          📷                  │  Icon: 40px
│                              │
│     No photos yet            │  Title: 18px bold
│                              │
│  Photos will appear here     │  Subtitle: 14px
│  when posted to the feed.    │  muted
│                              │
│      [Post a Photo]          │  CTA button
│                              │
└──────────────────────────────┘
```

### Empty Feed State
```
┌──────────────────────────────┐
│                              │
│          📰                  │
│                              │
│    No posts yet              │
│                              │
│  Be the first to share       │
│  something with the          │
│  community!                  │
│                              │
│      [Create Post]           │
│                              │
└──────────────────────────────┘
```

### Error State
```
┌──────────────────────────────┐
│  ⚠️ Failed to load posts     │  Red border
│                              │  Light red BG
│  Something went wrong.       │
│  Please try again.           │
│                              │
│  [Retry]  [Report Issue]    │
└──────────────────────────────┘
```

---

## 🔄 Interaction Flows

### Flow 1: Like a Post
```
1. User sees post
   ┌────────────────┐
   │   ♡ Like       │
   └────────────────┘

2. User clicks/taps
   ┌────────────────┐
   │   ♡ → ❤️       │  Animate
   └────────────────┘

3. Optimistic update
   ┌────────────────┐
   │   ❤️ Like      │  Immediately
   └────────────────┘

4. API call (background)
   Server: ✅ Success

5. Final state
   ┌────────────────┐
   │   ❤️ Like      │  Confirmed
   └────────────────┘
   ❤️ 43 likes (updated)
```

### Flow 2: Gift a Post
```
1. User clicks Gift button
   │   🎁 Gift      │
   
2. Modal opens
   ┌──────────────┐
   │ Send Gift to │
   │  @username   │
   └──────────────┘
   
3. User selects gift
   │   [💎 500]   │ ← Selected
   
4. User confirms
   │ [Send Gift]  │ ← Click
   
5. API processing
   │ Sending... ⏳ │
   
6. Success + Close
   Modal closes
   Feed updates:
   🎁 120 → 🎁 620 coins
```

### Flow 3: View Photo in Grid
```
1. User hovers tile (desktop)
   ┌────────────┐
   │ ❤️ 42  💬 12│  Overlay
   │     👁️     │  appears
   │   🎁 120   │
   └────────────┘
   
2. User clicks
   │  Click!    │
   
3. Lightbox opens
   ┌──────────────────────────┐
   │          ✕               │  Full screen
   │                          │  overlay
   │       [PHOTO]            │
   │      Full Size           │
   │                          │
   │  ❤️ Like │ 💬 │ 🎁      │  Actions
   └──────────────────────────┘
   
4. Navigate
   ← Previous  |  Next →
```

---

## 📊 Component Hierarchy

### Instagram Grid Component Tree
```
ProfilePhotosClient
├── InstagramGrid
│   ├── GridContainer
│   │   ├── InstagramTile (×N)
│   │   │   ├── TileImage/TileVideo
│   │   │   └── TileOverlay (hover)
│   │   │       ├── EngagementStats
│   │   │       └── ViewIcon
│   │   └── LoadingSkeletons
│   └── EmptyState
└── MediaViewerModal
    ├── FullSizeMedia
    ├── MediaInfo
    ├── ActionButtons
    │   ├── LikeButton
    │   ├── CommentButton
    │   └── GiftButton
    └── CommentsSection
```

### Facebook Feed Component Tree
```
PublicFeedClient
├── FeedContainer
│   ├── PostComposer (if owner)
│   │   ├── TextArea
│   │   ├── MediaUpload
│   │   └── SubmitButton
│   └── FeedList
│       ├── FacebookFeedCard (×N)
│       │   ├── PostHeader
│       │   │   ├── Avatar
│       │   │   ├── UserInfo
│       │   │   └── OptionsMenu
│       │   ├── PostContent
│       │   │   ├── TextContent
│       │   │   └── MediaContent
│       │   ├── EngagementBar
│       │   ├── PostActionButtons
│       │   │   ├── LikeButton
│       │   │   ├── CommentButton
│       │   │   └── GiftButton
│       │   └── CommentsSection (expandable)
│       │       ├── CommentsList
│       │       │   ├── CommentItem (×N)
│       │       │   │   ├── CommentHeader
│       │       │   │   ├── CommentText
│       │       │   │   └── GiftButton (mini)
│       │       └── AddComment
│       │           ├── CommentInput
│       │           └── SendButton
│       └── LoadMoreButton
└── GiftModal (shared)
```

---

## ✅ Implementation Checklist Visual

### Phase 1: Database ✅
```
[ ] Create post_likes table
    ├── id, post_id, profile_id, created_at
    └── Indexes + RLS policies
    
[ ] Update posts table
    ├── Add like_count column
    ├── Add media_type column
    └── Add indexes
    
[ ] Create API endpoints
    ├── POST /api/posts/[postId]/like
    └── GET /api/posts/[postId] (with like status)
```

### Phase 2: Instagram Grid 📸
```
[ ] Create InstagramGrid.tsx
    └── Grid layout + responsive

[ ] Create InstagramTile.tsx
    └── Square tile + lazy load

[ ] Create TileOverlay.tsx
    └── Hover stats + icons

[ ] Update ProfilePhotosClient.tsx
    └── Use new InstagramGrid

[ ] Test on all breakpoints
    ├── Mobile (< 640px)
    ├── Tablet (640-1024px)
    └── Desktop (1024px+)
```

### Phase 3: Facebook Feed 📰
```
[ ] Create FacebookFeedCard.tsx
    └── Post card structure

[ ] Create PostHeader.tsx
    └── Avatar + username + time

[ ] Create PostActionButtons.tsx
    └── Like, Comment, Gift buttons

[ ] Create PostCommentsSection.tsx
    └── Expandable comments

[ ] Implement like functionality
    └── Optimistic updates

[ ] Integrate gift modal
    └── Post + comment contexts

[ ] Update PublicFeedClient.tsx
    └── Use new FacebookFeedCard
```

---

## 🎯 Success Criteria

### Visual Polish Checklist
```
✓ Instagram grid looks identical to Instagram profile
✓ Feed cards look similar to Facebook posts
✓ Dark mode works perfectly
✓ Hover states smooth and polished
✓ Loading states look professional
✓ Empty states are helpful
✓ Error states are clear
✓ Animations are smooth (60fps)
✓ Touch targets are 44px+ on mobile
✓ Responsive on all screen sizes
```

### Functional Checklist
```
✓ Like button toggles correctly
✓ Like count updates instantly
✓ Comment section expands/collapses
✓ Comments load and display
✓ New comments submit successfully
✓ Gift modal opens from posts
✓ Gift modal opens from comments
✓ Gift system works identically everywhere
✓ Images lazy load properly
✓ Videos play inline
✓ Infinite scroll works
✓ Pull to refresh works (mobile)
```

---

## 📱 Final Mobile Preview
```
┌────────────────────────┐
│  [←]  Profile      [⚙] │ ← Header
├────────────────────────┤
│    ┌──────────┐        │
│    │ Avatar   │        │ ← Profile
│    └──────────┘        │   Info
│    John Doe            │
│    @johndoe            │
├────────────────────────┤
│ [Info][Feed][Photos]   │ ← Tabs
├────────────────────────┤
│                        │
│  IF PHOTOS TAB:        │
│  ┌────┐┌────┐┌────┐   │
│  │Pic ││Pic ││Pic │   │
│  └────┘└────┘└────┘   │
│                        │
│  IF FEED TAB:          │
│  ┌──────────────────┐ │
│  │ Post Card        │ │
│  │ ┌┐ Name · 2h     │ │
│  │ └┘              │ │
│  │ Text...         │ │
│  │ [Photo]         │ │
│  │ ❤️ 💬 🎁        │ │
│  └──────────────────┘ │
│                        │
└────────────────────────┘
```

---

**Visual Guide Complete! ✨**

Pair this with `FACEBOOK_INSTAGRAM_FEED_REDESIGN_SPEC.md` for implementation.

