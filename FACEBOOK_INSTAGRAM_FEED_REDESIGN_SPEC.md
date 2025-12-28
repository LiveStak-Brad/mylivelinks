# Facebook & Instagram Style Feed/Photos Redesign Specification

## 📋 Executive Summary

This document provides a complete specification for redesigning the **Photos/Videos** and **Posts/Feed** sections to match Facebook and Instagram's familiar UI patterns. The goal is instant user familiarity through proven social media design patterns.

**Key Changes:**
- Photos/Videos: Instagram-style square grid layout (like Instagram profile)
- Posts/Feed: Facebook-style vertical timeline with full engagement (like, comment, gift)
- Consistent gifting system across all contexts (messages, live, posts, comments)
- Professional, mobile-first responsive design

---

## 🎯 Design Goals

1. **Instant Familiarity**: Users should feel at home immediately
2. **Visual Consistency**: Match FB/IG patterns users know and love
3. **Engagement**: Easy access to like, comment, and gift features
4. **Responsive**: Perfect on mobile, tablet, and desktop
5. **Performance**: Fast loading with proper image optimization

---

## 📸 Section 1: Photos/Videos Tab

### Visual Reference: Instagram Profile Grid

**Layout Pattern:**
- 3-column responsive grid (3 on desktop, 3 on tablet, 3 on mobile)
- Square tiles (1:1 aspect ratio) - Instagram style
- Consistent gaps between tiles
- Hover effects showing engagement counts
- Video tiles have play icon overlay

### Design Specifications

#### Grid Layout
```
Desktop (1024px+):     3 columns, 12px gap
Tablet (640-1024px):   3 columns, 8px gap
Mobile (<640px):       3 columns, 4px gap
```

#### Individual Tile Specs
```
Aspect Ratio:  1:1 (square)
Corner Radius: 4px (subtle, Instagram-like)
Hover Effect:  Dark overlay (rgba(0,0,0,0.3)) with stats
Border:        None (clean look)
Object Fit:    cover (fills entire square)
```

#### Tile Overlay (on hover/tap)
```
Top-left:     ❤️ Like count
Top-right:    💬 Comment count
Bottom-right: 🎁 Gift total (coins)
Center:       Large view icon for photos, ▶️ for videos
```

#### Image Optimization
```
Thumbnail Size:  400x400px (square)
Full Size:       1080x1080px (Instagram standard)
Format:          WebP with JPEG fallback
Quality:         85% (balance size/quality)
Lazy Loading:    Yes (IntersectionObserver)
```

### Component Structure

**File:** `components/photos/InstagramGrid.tsx` (NEW)

```typescript
interface InstagramGridProps {
  items: MediaItem[];
  isLoading: boolean;
  onItemClick: (item: MediaItem, index: number) => void;
  emptyState?: EmptyStateConfig;
}

interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  thumbnailUrl: string;
  fullSizeUrl: string;
  caption?: string;
  likeCount: number;
  commentCount: number;
  giftTotalCoins: number;
  createdAt: string;
}
```

**Visual Elements:**
- Grid container with responsive columns
- Each tile: square container, lazy-loaded image/video thumbnail
- Video indicator: play icon (▶️) in bottom-left corner
- Hover overlay: semi-transparent dark background
- Stats overlay: heart icon + count, comment icon + count, gift icon + coins
- Loading state: animated skeleton squares
- Empty state: Instagram-style empty state with icon

---

## 📰 Section 2: Posts/Feed Tab

### Visual Reference: Facebook News Feed

**Layout Pattern:**
- Vertical scrolling timeline
- Card-based posts with rounded corners
- Full-width on mobile, centered column on desktop
- Each post is a self-contained card

### Design Specifications

#### Post Card Layout
```
Desktop Max Width:  680px (Facebook standard)
Mobile:            Full width with padding
Card Padding:      16px (desktop), 12px (mobile)
Card Border:       1px solid border-color
Corner Radius:     12px (modern, friendly)
Gap Between Posts: 16px
Background:        White (light mode), #242526 (dark mode)
```

#### Post Structure (Top to Bottom)

**1. Post Header**
```
Layout:      Flexbox, space-between
Left Side:   Avatar (40px circle) + Username + Timestamp
Right Side:  "..." More options menu
Height:      60px
Avatar:      40x40px circle, 2px border
Username:    Font-size 15px, font-weight 600
Timestamp:   Font-size 13px, color muted
```

**2. Post Content**
```
Text:        Font-size 15px, line-height 1.4
Max Lines:   No limit (full text visible)
Whitespace:  Pre-wrap (preserves formatting)
Padding:     12px 0
```

**3. Media Display**
```
Photos:      Full-width, max-height 600px, object-fit cover
Videos:      Full-width, max-height 600px, native controls
Aspect:      Preserve original (not forced square)
Border:      Subtle 1px border
Radius:      8px (slightly rounded)
Background:  Black for letterboxing
```

**4. Engagement Bar (Below Media)**
```
Layout:       Flexbox, space-between
Left:         Like count, Comment count, Gift coins
Right:        n/a (or share count future)
Font Size:    13px
Color:        Muted text
Padding:      8px 0
Border Top:   1px solid border-color
```

**5. Action Buttons**
```
Layout:       Flexbox, evenly distributed
Buttons:      Like, Comment, Gift
Spacing:      Equal distribution across width
Height:       44px (touch-friendly)
Border Top:   1px solid border-color
Icons:        18px, aligned with text
Font Size:    15px, font-weight 600
Hover:        Background color change (subtle)
Active:       Icon color change (blue for like, etc.)
```

**Action Button Details:**
```
Like Button:
  Icon: ❤️ (outline when not liked, filled when liked)
  Color: Gray (default), Red (#F44336) when liked
  Text: "Like"
  
Comment Button:
  Icon: 💬 (speech bubble)
  Color: Gray
  Text: "Comment"
  Action: Expands comment section below
  
Gift Button:
  Icon: 🎁 (gift box)
  Color: Gray (default), Purple when hovered
  Text: "Gift"
  Action: Opens gift modal (same as live/messages)
```

**6. Comments Section (Expanded)**
```
Layout:       Vertical list
Padding:      12px 16px
Border Top:   1px solid border-color
Background:   Slightly different shade (FB style)
Max Height:   400px (scrollable if more)
```

### Component Structure

**File:** `components/feed/FacebookFeedCard.tsx` (NEW)

```typescript
interface FeedPost {
  id: string;
  author: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  textContent: string;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video';
  likeCount: number;
  isLikedByCurrentUser: boolean;
  commentCount: number;
  giftTotalCoins: number;
  createdAt: string;
}

interface FacebookFeedCardProps {
  post: FeedPost;
  currentUserId?: string;
  onLike: (postId: string) => Promise<void>;
  onComment: (postId: string) => void;
  onGift: (postId: string, recipientId: string) => void;
  onLoadComments: (postId: string) => Promise<Comment[]>;
}
```

---

## 💝 Section 3: Unified Gift System

### Design Requirement
The gift modal and experience must be **identical** across all contexts:
- Live stream tiles
- Messages/DMs
- Posts (feed)
- Comments on posts

### Gift Modal Specifications

**Current Implementation:** `components/GiftModal.tsx` (KEEP THIS)

**Integration Points:**
1. **Live Stream:** Already integrated via `Tile.tsx`
2. **Messages:** Already integrated via `MessageComposer.tsx`
3. **Posts (NEW):** Add gift button to `FacebookFeedCard`
4. **Comments (NEW):** Add gift button to each comment

**Props Required:**
```typescript
interface GiftModalProps {
  recipientId: string;
  recipientUsername: string;
  contextType: 'live' | 'message' | 'post' | 'comment';
  contextId?: string; // postId or commentId for tracking
  onGiftSent: () => void;
  onClose: () => void;
}
```

**Gift Button Visual Spec:**
```
Size:         44px height (touch-friendly)
Icon:         🎁 18px
Text:         "Gift" (15px, font-weight 600)
Color:        Gray (default)
Hover Color:  Purple (#9333EA)
Active Color: Purple gradient
Border:       None (flat button)
```

---

## 💙 Section 4: Like & Comment System

### Database Schema Requirements

**New Table: `post_likes`**
```sql
CREATE TABLE post_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, profile_id)
);

CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_profile_id ON post_likes(profile_id);
```

**Update Existing `posts` Table:**
```sql
ALTER TABLE posts ADD COLUMN like_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN media_type VARCHAR(20); -- 'photo' or 'video'
CREATE INDEX idx_posts_media_type ON posts(media_type);
```

**Existing `post_comments` Table:** Already exists, ensure it has:
```sql
-- Verify structure:
id, post_id, author_id, text_content, created_at
-- Add if missing:
ALTER TABLE post_comments ADD COLUMN like_count INTEGER DEFAULT 0;
```

### API Endpoints Required

**POST `/api/posts/[postId]/like`**
- Toggle like/unlike
- Returns: `{ liked: boolean, likeCount: number }`

**GET `/api/posts/[postId]`**
- Returns: Full post details including `isLikedByCurrentUser`

**POST `/api/posts/[postId]/comments`**
- Create comment (ALREADY EXISTS)

**GET `/api/posts/[postId]/comments`**
- Load comments with pagination (ALREADY EXISTS)

**POST `/api/posts/[postId]/gift`**
- Send gift to post author (ALREADY EXISTS)

**POST `/api/comments/[commentId]/gift`**
- Send gift to comment author (ALREADY EXISTS)

---

## 🎨 Section 5: Responsive Design Breakpoints

### Mobile First Approach

**Mobile (<640px):**
```css
.instagram-grid {
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.feed-container {
  padding: 8px;
}

.post-card {
  padding: 12px;
  border-radius: 8px;
}

.action-buttons {
  font-size: 14px;
}
```

**Tablet (640px - 1024px):**
```css
.instagram-grid {
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.feed-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 12px;
}

.post-card {
  padding: 16px;
  border-radius: 12px;
}
```

**Desktop (1024px+):**
```css
.instagram-grid {
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 935px; /* Instagram standard */
  margin: 0 auto;
}

.feed-container {
  max-width: 680px; /* Facebook standard */
  margin: 0 auto;
  padding: 16px;
}

.post-card {
  padding: 16px;
  border-radius: 12px;
}
```

---

## 🔧 Section 6: Implementation Checklist

### Phase 1: Database & API Setup ✅
- [ ] Create `post_likes` table
- [ ] Update `posts` table schema
- [ ] Create `/api/posts/[postId]/like` endpoint
- [ ] Update existing post APIs to include `isLikedByCurrentUser`
- [ ] Test all endpoints

### Phase 2: Photos/Videos Tab 📸
- [ ] Create `components/photos/InstagramGrid.tsx`
- [ ] Create `components/photos/InstagramTile.tsx`
- [ ] Create `components/photos/TileOverlay.tsx`
- [ ] Update `ProfilePhotosClient.tsx` to use InstagramGrid
- [ ] Implement lazy loading for images
- [ ] Add video play icon overlay
- [ ] Add hover/tap stats overlay
- [ ] Test responsive grid on all breakpoints

### Phase 3: Feed Tab 📰
- [ ] Create `components/feed/FacebookFeedCard.tsx`
- [ ] Create `components/feed/PostHeader.tsx`
- [ ] Create `components/feed/PostActionButtons.tsx`
- [ ] Create `components/feed/PostCommentsSection.tsx`
- [ ] Implement like functionality
- [ ] Integrate gift modal for posts
- [ ] Integrate gift modal for comments
- [ ] Update `PublicFeedClient.tsx` to use FacebookFeedCard
- [ ] Test engagement features (like, comment, gift)
- [ ] Test responsive layout on all breakpoints

### Phase 4: Gift System Integration 🎁
- [ ] Update `GiftModal.tsx` to accept `contextType` prop
- [ ] Add gift tracking for posts
- [ ] Add gift tracking for comments
- [ ] Ensure gift animations work in feed context
- [ ] Test gift flow from post → gift modal → confirmation
- [ ] Test gift flow from comment → gift modal → confirmation

### Phase 5: Polish & Testing ✨
- [ ] Add loading skeletons (Instagram-style)
- [ ] Add empty states (Facebook-style)
- [ ] Add error states
- [ ] Test dark mode compatibility
- [ ] Optimize images (WebP, lazy load)
- [ ] Add accessibility (ARIA labels, keyboard nav)
- [ ] Test on real devices (iOS, Android)
- [ ] Performance audit (Lighthouse)

---

## 🎭 Section 7: Visual Design Tokens

### Colors

**Light Mode:**
```
Background:       #FFFFFF
Card Background:  #FFFFFF
Border:          #E4E6EB (Facebook gray)
Text Primary:    #050505
Text Secondary:  #65676B
Hover BG:        #F2F3F5
Like Red:        #F44336
Gift Purple:     #9333EA
Link Blue:       #0866FF (Facebook blue)
```

**Dark Mode:**
```
Background:       #18191A
Card Background:  #242526
Border:          #3E4042
Text Primary:    #E4E6EB
Text Secondary:  #B0B3B8
Hover BG:        #3A3B3C
Like Red:        #F44336 (same)
Gift Purple:     #A855F7
Link Blue:       #3B9EFF
```

### Typography

**Post Author Name:**
```
Font Family:  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
Font Size:    15px
Font Weight:  600 (semibold)
Line Height:  1.3
```

**Post Content:**
```
Font Family:  Same as system
Font Size:    15px
Font Weight:  400 (regular)
Line Height:  1.4
Color:        Text Primary
```

**Timestamps:**
```
Font Size:    13px
Font Weight:  400
Color:        Text Secondary
```

**Action Buttons:**
```
Font Size:    15px
Font Weight:  600
Color:        Text Secondary (default)
Hover Color:  Text Primary
```

### Spacing

**Component Spacing:**
```
Post Card Padding:     16px (desktop), 12px (mobile)
Section Gaps:          16px
Between Posts:         16px
Header Height:         60px
Action Button Height:  44px
```

**Internal Spacing:**
```
Avatar to Text:        12px
Text to Media:         12px
Media to Engagement:   12px
Engagement to Actions: 8px
Actions to Comments:   0 (no gap, border only)
```

---

## 🔍 Section 8: User Interactions

### Instagram Grid Interactions

**On Desktop:**
```
Hover:      Show overlay with stats + view icon
Click:      Open lightbox/viewer with full image
Keyboard:   Arrow keys navigate, Esc closes
```

**On Mobile:**
```
Tap:        Open lightbox/viewer immediately
No hover:   Overlay not needed (stats in viewer)
Swipe:      Navigate between images in viewer
```

### Feed Card Interactions

**Like Button:**
```
Click/Tap:     Toggle like state
Visual:        Heart icon fills with color
Animation:     Subtle scale animation (1.0 → 1.2 → 1.0)
Sound:         Optional subtle click (muted by default)
Optimistic:    Update UI immediately, sync in background
```

**Comment Button:**
```
Click/Tap:     Expand/collapse comments section
Animation:     Smooth height transition (200ms)
Focus:         Auto-focus comment input when expanded
Loading:       Show spinner while loading comments
```

**Gift Button:**
```
Click/Tap:     Open gift modal
Modal:         Slide up from bottom (mobile), center (desktop)
Backdrop:      Semi-transparent black (rgba(0,0,0,0.5))
Close:         Click backdrop, X button, or Esc key
```

### Comment Interactions

**Add Comment:**
```
Input:         Auto-expanding textarea
Placeholder:   "Write a comment..."
Submit:        Enter key (desktop), Send button (always visible)
Optimistic:    Add comment immediately, sync in background
```

**Gift on Comment:**
```
Each Comment:  Has own gift button (smaller, icon only on mobile)
Modal:         Same gift modal, different recipient
Context:       Shows comment author as recipient
```

---

## 📊 Section 9: Performance Targets

### Loading Performance
```
Initial Feed Load:     < 1.5s
Subsequent Posts:      < 500ms
Image Load (thumb):    < 300ms
Image Load (full):     < 1s
Like Action:           < 100ms (optimistic)
Comment Submit:        < 200ms (optimistic)
Gift Modal Open:       < 100ms
```

### Bundle Size Targets
```
Instagram Grid:        < 15KB (gzipped)
Facebook Feed Card:    < 25KB (gzipped)
Gift Modal:            Already optimized
Total Tab Load:        < 50KB (gzipped, excluding images)
```

### Image Optimization
```
Thumbnail Format:      WebP (with JPEG fallback)
Thumbnail Size:        400x400px max
Full Size:             1080x1080px max (photos)
                       1920x1080px max (videos)
Compression:           85% quality
Lazy Loading:          IntersectionObserver (2 screens ahead)
CDN:                   Supabase Storage with CDN
```

---

## 🧪 Section 10: Testing Requirements

### Unit Tests
- [ ] InstagramGrid renders correctly
- [ ] FacebookFeedCard renders correctly
- [ ] Like button toggles state
- [ ] Comment submission works
- [ ] Gift modal opens with correct recipient
- [ ] Responsive grid adapts to screen size

### Integration Tests
- [ ] Load posts from API
- [ ] Like post updates count
- [ ] Comment on post updates count
- [ ] Send gift from post
- [ ] Send gift from comment
- [ ] Images lazy load correctly

### E2E Tests (Critical Flows)
- [ ] User browses Instagram grid
- [ ] User opens image in lightbox
- [ ] User navigates between images
- [ ] User likes a post
- [ ] User comments on a post
- [ ] User gifts post author
- [ ] User gifts comment author
- [ ] Mobile responsive behavior

### Visual Regression Tests
- [ ] Instagram grid layout (3 breakpoints)
- [ ] Feed card layout (3 breakpoints)
- [ ] Dark mode compatibility
- [ ] Hover states
- [ ] Loading states
- [ ] Empty states

---

## 🚀 Section 11: Deployment Plan

### Phase 1: Backend (Day 1)
1. Run database migrations (post_likes table)
2. Deploy API endpoints
3. Test endpoints with Postman
4. Verify RLS policies

### Phase 2: Photos Tab (Day 2-3)
1. Deploy InstagramGrid component
2. Update ProfilePhotosClient
3. Test on staging
4. Monitor performance
5. Deploy to production

### Phase 3: Feed Tab (Day 4-5)
1. Deploy FacebookFeedCard component
2. Update PublicFeedClient
3. Test on staging
4. Monitor performance
5. Deploy to production

### Phase 4: Gift Integration (Day 6)
1. Update GiftModal for new contexts
2. Test gift flow in posts
3. Test gift flow in comments
4. Deploy to production

### Phase 5: Polish & Monitor (Day 7)
1. Fix any reported bugs
2. Monitor analytics
3. Gather user feedback
4. Plan improvements

---

## 📱 Section 12: Mobile Considerations

### Touch Targets
```
Minimum Size:      44x44px (iOS/Android guideline)
Like Button:       44px height, full width third
Comment Button:    44px height, full width third
Gift Button:       44px height, full width third
Grid Tiles:        Min 100px per side (33% width on mobile)
```

### Gestures
```
Instagram Grid:
  - Tap to open
  - Swipe left/right in viewer
  - Pinch to zoom in viewer
  
Feed:
  - Tap to like (double-tap future enhancement)
  - Tap comment button to expand
  - Tap gift button for modal
  - Pull to refresh feed
```

### Mobile-Specific Features
```
- Bottom sheet for gift modal (instead of centered modal)
- Native sharing API integration
- Haptic feedback on like (if supported)
- Optimized image sizes for mobile data
- Reduced animations on low-end devices
```

---

## 🎯 Success Metrics

### Engagement Metrics
```
Target Increases:
- Like rate:      +40% (from easier access)
- Comment rate:   +30% (from familiar UX)
- Gift rate:      +25% (from consistent placement)
- Time on page:   +50% (from addictive scroll)
- Return visits:  +35% (from better experience)
```

### Performance Metrics
```
Targets:
- Page Load:      < 2s (Lighthouse)
- First Paint:    < 1s
- Time to Interactive: < 2.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
```

### User Satisfaction
```
Target:
- Net Promoter Score (NPS): > 50
- User satisfaction: > 4.5/5.0
- Task completion rate: > 95%
- Error rate: < 1%
```

---

## 🔗 References & Resources

### Design Inspiration
- Facebook Web (facebook.com) - Feed layout
- Instagram Web (instagram.com) - Grid layout
- Instagram App - Mobile interactions
- Facebook App - Mobile interactions

### Technical Resources
- [Facebook Design Resources](https://design.facebook.com/)
- [Instagram Brand Assets](https://about.instagram.com/brand)
- [React Intersection Observer](https://github.com/thebuilder/react-intersection-observer)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)

### Accessibility Guidelines
- [WCAG 2.1 AA Compliance](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Mobile Accessibility](https://www.w3.org/WAI/standards-guidelines/mobile/)

---

## ✅ Final Checklist for Logic Agent

### Before You Start
- [ ] Read entire specification document
- [ ] Review existing codebase structure
- [ ] Set up local development environment
- [ ] Access Supabase database console
- [ ] Review current GiftModal implementation

### Implementation Order
1. Database migrations (post_likes table)
2. API endpoints (/api/posts/[postId]/like)
3. InstagramGrid component
4. FacebookFeedCard component
5. Integration with existing pages
6. Testing & bug fixes
7. Performance optimization
8. Production deployment

### Quality Gates
- [ ] All TypeScript types properly defined
- [ ] No console errors or warnings
- [ ] Lighthouse score > 90
- [ ] All interactions work on mobile
- [ ] Dark mode works perfectly
- [ ] Gift system consistent across contexts
- [ ] Loading states implemented
- [ ] Error states handled gracefully
- [ ] Accessibility audit passed

---

## 🎨 Figma-Style Component Specs

### InstagramGrid Tile (Square)
```
┌─────────────────────┐
│                     │
│                     │  Image/Video fills entire square
│       IMAGE         │  aspect-ratio: 1/1
│                     │  object-fit: cover
│                     │
└─────────────────────┘

On Hover:
┌─────────────────────┐
│ ❤️ 42    💬 12    │  Dark overlay (30% black)
│                     │  Stats in corners
│         👁️          │  View icon in center
│       VIEW          │  (▶️ for videos)
│                     │
│           🎁 120    │  Gift total bottom-right
└─────────────────────┘
```

### FacebookFeedCard Structure
```
┌───────────────────────────────────┐
│ ┌─┐ John Doe · 2 hours ago    ⋯  │ ← Header
│ └─┘                               │
├───────────────────────────────────┤
│ Check out this amazing photo I    │ ← Text Content
│ took today! #photography #art     │
├───────────────────────────────────┤
│                                   │
│          [PHOTO/VIDEO]            │ ← Media
│                                   │
├───────────────────────────────────┤
│ ❤️ 42 likes · 💬 12 comments ·   │ ← Engagement Stats
│ 🎁 120 coins                      │
├───────────────────────────────────┤
│   ❤️ Like   │  💬 Comment │ 🎁 Gift │ ← Action Buttons
└───────────────────────────────────┘

If Comments Expanded:
├───────────────────────────────────┤
│ ┌─┐ Jane Smith                 🎁 │ ← Individual Comment
│ └─┘ Great photo! Love it! ❤️     │
│     2 hours ago                   │
│                                   │
│ ┌─────────────────────────────┐  │ ← Add Comment
│ │ Write a comment...          │  │
│ └─────────────────────────────┘  │
│                          [Send]   │
└───────────────────────────────────┘
```

---

## 🎁 Gift Modal (Existing - Reference)

**Current Implementation:** `components/GiftModal.tsx`

**Visual Specs:**
```
┌─────────────────────────────────────┐
│  🎁 Send Gift to @username      ✕  │
├─────────────────────────────────────┤
│  Your Coins: 💰 1,250              │
├─────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │🌹  │ │❤️  │ │⭐  │ │💎  │      │  Gift Grid
│  │Rose│ │Heart│ │Star │ │Diam│     │  (4 columns)
│  │50 │ │100 │ │250 │ │500 │      │
│  └────┘ └────┘ └────┘ └────┘      │
│  ... (more gifts, scrollable)       │
├─────────────────────────────────────┤
│  Selected: 💎 Diamond              │  Selected Gift
│  💰 500 coins → ✨ 500 diamonds    │  Preview
├─────────────────────────────────────┤
│    [Cancel]        [🎁 Send Gift]  │
└─────────────────────────────────────┘
```

**Integration Points:**
- Tile (live stream) ✅ Already working
- Messages ✅ Already working
- Feed Post (NEW) - Add gift button
- Post Comment (NEW) - Add gift button per comment

---

## 🎬 Animation Specifications

### Like Button Animation
```
On Click:
1. Scale: 1.0 → 1.2 (100ms ease-out)
2. Scale: 1.2 → 1.0 (200ms ease-in-out)
3. Color: gray → red (simultaneous)
4. Icon: outline → filled (simultaneous)
```

### Comment Section Expand
```
Height: 0 → auto (200ms ease-in-out)
Opacity: 0 → 1 (200ms ease-in-out)
Delay: 0ms
```

### Gift Modal Open
```
Mobile (bottom sheet):
  Transform: translateY(100%) → translateY(0)
  Duration: 300ms
  Easing: ease-out
  
Desktop (center modal):
  Opacity: 0 → 1
  Scale: 0.9 → 1.0
  Duration: 200ms
  Easing: ease-out
```

### Grid Tile Hover
```
Overlay Opacity: 0 → 1 (150ms ease-in)
Icon Scale: 0.8 → 1.0 (150ms ease-out)
```

---

## 📝 Code Style Guidelines

### Component Naming
```
InstagramGrid.tsx           ✅ (descriptive, purpose-clear)
FacebookFeedCard.tsx        ✅ (clear which platform style)
PostHeader.tsx              ✅ (generic sub-component)
PostActionButtons.tsx       ✅ (clear purpose)
TileOverlay.tsx            ✅ (clear context)
```

### Props Naming
```
onLike                     ✅ (action handler)
onCommentClick             ✅ (specific action)
isLikedByCurrentUser       ✅ (boolean flag, descriptive)
likeCount                  ✅ (number, clear)
post                       ✅ (entity object)
```

### CSS Class Naming (Tailwind)
```
.instagram-grid            ✅ (BEM-style prefix)
.feed-card                 ✅ (component name)
.feed-card__header         ✅ (BEM element)
.feed-card__header--large  ✅ (BEM modifier)
```

---

## 🏁 Conclusion

This specification provides everything needed to implement a professional, Facebook/Instagram-style feed and photos experience. The design prioritizes:

1. **User Familiarity** - Patterns users already know
2. **Consistency** - Unified gift system across all contexts
3. **Performance** - Fast, responsive, optimized
4. **Mobile-First** - Touch-friendly, gesture-enabled
5. **Accessibility** - WCAG compliant, keyboard navigable

**Next Steps for Logic Agent:**
1. Review this entire document
2. Start with database migrations
3. Build components in order (Grid → Feed → Integration)
4. Test thoroughly at each phase
5. Deploy incrementally

**Estimated Timeline:** 5-7 days for full implementation

**Questions?** Refer back to this document. All decisions are documented.

---

**Document Version:** 1.0  
**Created:** December 27, 2025  
**Last Updated:** December 27, 2025  
**Author:** AI Design Agent  
**For:** Logic Implementation Agent

