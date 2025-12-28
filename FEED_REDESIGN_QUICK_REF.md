# 🔖 Quick Reference Card - Feed Redesign

## 📐 Layout Cheat Sheet

### Instagram Grid
```
Mobile:    3 cols, 4px gap
Tablet:    3 cols, 8px gap  
Desktop:   3 cols, 12px gap
Tile:      aspect-ratio: 1/1 (square)
Max Width: 935px (Instagram standard)
```

### Facebook Feed
```
Mobile:    Full width, 8px padding
Tablet:    600px max-width, centered
Desktop:   680px max-width (FB standard)
Card:      16px padding, 12px radius
Gap:       16px between posts
```

---

## 🎨 Color Palette

### Light Mode
```css
Background:     #FFFFFF
Card:           #FFFFFF
Border:         #E4E6EB
Text Primary:   #050505
Text Secondary: #65676B
Hover BG:       #F2F3F5
Like Red:       #F44336
Gift Purple:    #9333EA
Link Blue:      #0866FF
```

### Dark Mode
```css
Background:     #18191A
Card:           #242526
Border:         #3E4042
Text Primary:   #E4E6EB
Text Secondary: #B0B3B8
Hover BG:       #3A3B3C
Like Red:       #F44336
Gift Purple:    #A855F7
Link Blue:      #3B9EFF
```

---

## 📏 Sizing Reference

```
Avatars:           40px circle
Action Buttons:    44px height (min touch)
Icons:             18-20px
Grid Tiles:        Min 100px × 100px
Post Max Height:   600px (media)
Font Author:       15px, weight 600
Font Content:      15px, line-height 1.4
Font Timestamp:    13px
Font Actions:      15px, weight 600
```

---

## 🔌 API Quick Reference

### Like Endpoint
```typescript
POST /api/posts/[postId]/like
Returns: { liked: boolean, likeCount: number }
```

### Feed Endpoint
```typescript
GET /api/feed?username=USER&limit=20
Returns: { 
  posts: Post[], 
  nextCursor: Cursor | null 
}
// Each post includes: isLikedByCurrentUser
```

---

## 🗂️ Component Structure

### Instagram Grid
```
InstagramGrid
├── Grid Container (grid grid-cols-3)
└── InstagramTile (×N)
    ├── Image/Video
    └── Hover Overlay
        ├── Stats (top)
        ├── View Icon (center)
        └── Gift Total (bottom-right)
```

### Facebook Feed
```
FacebookFeedCard
├── Header (60px)
│   ├── Avatar (40px)
│   ├── Name + Time
│   └── More Menu
├── Text Content
├── Media (max 600px)
├── Engagement Bar
│   ├── Likes Count
│   ├── Comments Count
│   └── Gifts Total
├── Action Buttons (44px)
│   ├── Like Button
│   ├── Comment Button
│   └── Gift Button
└── Comments Section (expandable)
```

---

## 🎯 Critical Classes

### Instagram Grid
```jsx
<div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
  <div className="aspect-square overflow-hidden rounded">
    <Image className="object-cover" ... />
  </div>
</div>
```

### Feed Card
```jsx
<div className="bg-white dark:bg-gray-800 rounded-xl 
                border border-gray-200 dark:border-gray-700">
  <div className="p-4">...</div>
</div>
```

### Action Buttons
```jsx
<div className="flex border-t">
  <button className="flex-1 flex items-center justify-center 
                     gap-2 py-2.5 font-semibold
                     hover:bg-gray-50 dark:hover:bg-gray-700">
    <Heart className="w-5 h-5" />
    <span>Like</span>
  </button>
</div>
```

---

## ⚡ Performance Checklist

```
✓ Lazy load images (loading="lazy")
✓ Next/Image for optimization
✓ Optimistic updates (like/comment)
✓ Memoize expensive calculations
✓ Virtual scrolling (if 100+ items)
✓ Debounce API calls
✓ Cache responses
✓ WebP images with fallback
```

---

## 🐛 Common Fixes

### Grid not 3 columns?
```jsx
// Use fixed grid-cols-3, not responsive
className="grid grid-cols-3"  ✅
className="grid grid-cols-1 sm:grid-cols-3"  ❌
```

### Like button laggy?
```typescript
// Use optimistic updates
setIsLiked(!isLiked);  // Immediate
await apiCall();        // Background
```

### Images slow?
```jsx
<Image 
  loading="lazy"
  quality={85}
  sizes="..."
/>
```

### Touch targets small?
```jsx
// Ensure 44px minimum height
className="py-2.5"  ✅  (44px with text)
className="py-1"    ❌  (too small)
```

---

## 🎨 Hover States

### Grid Tile
```jsx
onMouseEnter={() => setHovered(true)}
onMouseLeave={() => setHovered(false)}

{isHovered && (
  <div className="absolute inset-0 bg-black/40">
    // Stats overlay
  </div>
)}
```

### Like Button
```jsx
className={`transition-colors ${
  isLiked 
    ? 'text-red-500' 
    : 'hover:bg-gray-50'
}`}
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile first */
default:      < 640px
sm:           640px+
md:           768px+
lg:           1024px+
xl:           1280px+

/* Usage */
<div className="gap-1 sm:gap-2 md:gap-3">
```

---

## 🔧 TypeScript Types

```typescript
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
```

---

## ⚙️ State Management

### Like State
```typescript
const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser);
const [likeCount, setLikeCount] = useState(post.likeCount);

const handleLike = async () => {
  // Optimistic update
  setIsLiked(!isLiked);
  setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  
  // API call
  try {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
  } catch {
    // Revert on error
    setIsLiked(isLiked);
    setLikeCount(likeCount);
  }
};
```

---

## 🎁 Gift Modal Integration

```typescript
// Import
import GiftModal from '@/components/GiftModal';

// State
const [giftModalOpen, setGiftModalOpen] = useState(false);
const [giftRecipient, setGiftRecipient] = useState<{
  id: string;
  username: string;
} | null>(null);

// Handler
const handleGift = (postId: string, recipientId: string) => {
  const post = posts.find(p => p.id === postId);
  setGiftRecipient({
    id: recipientId,
    username: post.author.username
  });
  setGiftModalOpen(true);
};

// Render
{giftModalOpen && giftRecipient && (
  <GiftModal
    recipientId={giftRecipient.id}
    recipientUsername={giftRecipient.username}
    onGiftSent={() => {
      setGiftModalOpen(false);
      loadFeed('replace');
    }}
    onClose={() => setGiftModalOpen(false)}
  />
)}
```

---

## ✅ Daily Checklist

### Day 1: Database & API
- [ ] Run SQL migrations
- [ ] Create like endpoint
- [ ] Update feed endpoint
- [ ] Test with curl

### Day 2-3: Instagram Grid
- [ ] Create InstagramGrid.tsx
- [ ] Create InstagramTile.tsx
- [ ] Add hover overlays
- [ ] Test responsive

### Day 4-5: Facebook Feed
- [ ] Create FacebookFeedCard.tsx
- [ ] Implement like button
- [ ] Add comment expansion
- [ ] Integrate gift modal

### Day 6: Gift Integration
- [ ] Update GiftModal props
- [ ] Add gift to posts
- [ ] Add gift to comments

### Day 7: Polish
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Accessibility
- [ ] Deploy

---

## 🚀 Deploy Checklist

```bash
# Build
npm run build

# Test build
npm run start

# Lint
npm run lint

# Lighthouse audit
# Target: > 90 all scores

# Deploy
git push origin main
# Vercel auto-deploys
```

---

## 📊 Success Metrics

```
Engagement:
- Like rate: +40%
- Comment rate: +30%
- Gift rate: +25%

Performance:
- Page load: < 2s
- First Paint: < 1s
- LCP: < 2.5s
- CLS: < 0.1

Quality:
- Lighthouse: > 90
- Error rate: < 1%
- Mobile friendly: Yes
```

---

## 🔗 Quick Links

```
Main Spec:      FACEBOOK_INSTAGRAM_FEED_REDESIGN_SPEC.md
Visual Guide:   FEED_REDESIGN_VISUAL_GUIDE.md
Implementation: QUICK_START_FEED_IMPLEMENTATION.md
Handoff:        FEED_REDESIGN_HANDOFF.md
```

---

**Print this card and keep it visible while implementing!**

---

**Version:** 1.0  
**Updated:** Dec 27, 2025  
**Project:** MyLiveLinks Feed Redesign

