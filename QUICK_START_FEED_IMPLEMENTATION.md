# 🚀 Quick Start Implementation Guide for Logic Agent

## Overview
This is your step-by-step implementation guide for the Facebook/Instagram style feed redesign. Follow these steps in order.

---

## 📚 Required Reading (5 minutes)

1. **Main Spec:** `FACEBOOK_INSTAGRAM_FEED_REDESIGN_SPEC.md` (full specification)
2. **Visual Guide:** `FEED_REDESIGN_VISUAL_GUIDE.md` (visual reference)
3. **This Guide:** Step-by-step implementation instructions

---

## 🎯 Implementation Order (7-Day Plan)

**NOTE:** Days 1-2 focus on UI-only changes (media sizing, grid crop). Backend (likes, database) is optional and can be deferred.

### Day 1-2: UI Foundation (Media Sizing + Grid Crop) - NO BACKEND REQUIRED

#### Step 1.1: Create Shared PostMedia Component (UI ONLY)
```sql
-- File: sql/add_post_likes_system.sql

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, profile_id)
);

CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_profile_id ON post_likes(profile_id);

-- Enable RLS
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view likes"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING (auth.uid() = profile_id);

-- Update posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_posts_like_count ON posts(like_count);
CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type);

-- Trigger to update like_count on posts
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_like_count_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

COMMENT ON TABLE post_likes IS 'Tracks which users liked which posts';
```

**Run this (OPTIONAL - backend):**
1. Go to Supabase Dashboard → SQL Editor
2. Paste the SQL above
3. Execute
4. Verify tables created: `post_likes`, `posts` updated

#### Step 3.2: Create Like API Endpoint (OPTIONAL)
```typescript
// File: app/api/posts/[postId]/like/route.ts

import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const supabase = createClient();
  const { postId } = params;

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('profile_id', user.id)
      .maybeSingle();

    let liked = false;

    if (existingLike) {
      // Unlike
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('profile_id', user.id);
      liked = false;
    } else {
      // Like
      await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          profile_id: user.id
        });
      liked = true;
    }

    // Get updated like count
    const { data: post } = await supabase
      .from('posts')
      .select('like_count')
      .eq('id', postId)
      .single();

    return NextResponse.json({
      liked,
      likeCount: post?.like_count || 0
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}
```

#### Step 3.3: Update Existing Feed API (OPTIONAL)
```typescript
// File: app/api/feed/route.ts
// MODIFY existing endpoint to include like data

// In the posts query, add:
const { data: posts } = await supabase
  .from('posts')
  .select(`
    id,
    text_content,
    media_url,
    media_type,
    like_count,
    created_at,
    author:profiles!posts_author_id_fkey (
      id,
      username,
      avatar_url
    )
  `)
  // ... rest of query

// After fetching posts, add isLikedByCurrentUser:
if (user) {
  const postIds = posts.map(p => p.id);
  const { data: userLikes } = await supabase
    .from('post_likes')
    .select('post_id')
    .in('post_id', postIds)
    .eq('profile_id', user.id);

  const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);
  
  posts.forEach(post => {
    post.isLikedByCurrentUser = likedPostIds.has(post.id);
  });
}
```

**Test APIs:**
```bash
# Test like endpoint
curl -X POST http://localhost:3000/api/posts/1/like \
  -H "Cookie: YOUR_SESSION_COOKIE"

# Test feed endpoint
curl http://localhost:3000/api/feed?username=testuser
```

---

### Day 2: Continue Instagram Grid (Photos Tab) - UI ONLY

#### Step 2.1: Create InstagramGrid Component
```typescript
// File: components/photos/InstagramGrid.tsx

'use client';

import { useState } from 'react';
import InstagramTile from './InstagramTile';
import type { MediaItem } from './types';

interface InstagramGridProps {
  items: MediaItem[];
  isLoading: boolean;
  onItemClick: (item: MediaItem, index: number) => void;
  emptyState?: {
    icon: React.ReactNode;
    title: string;
    description: string;
  };
}

export default function InstagramGrid({
  items,
  isLoading,
  onItemClick,
  emptyState
}: InstagramGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 dark:bg-gray-800 animate-pulse rounded"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="mb-4 text-gray-400 dark:text-gray-600">
          {emptyState.icon}
        </div>
        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          {emptyState.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm">
          {emptyState.description}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
      {items.map((item, index) => (
        <InstagramTile
          key={item.id}
          item={item}
          onClick={() => onItemClick(item, index)}
        />
      ))}
    </div>
  );
}
```

#### Step 2.2: Create InstagramTile Component
```typescript
// File: components/photos/InstagramTile.tsx

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Gift, Play } from 'lucide-react';
import type { MediaItem } from './types';

interface InstagramTileProps {
  item: MediaItem;
  onClick: () => void;
}

export default function InstagramTile({ item, onClick }: InstagramTileProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative aspect-square cursor-pointer overflow-hidden rounded group bg-gray-100 dark:bg-gray-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Media */}
      {item.type === 'video' ? (
        <video
          src={item.thumbnailUrl}
          className="w-full h-full object-cover"
          preload="metadata"
        />
      ) : (
        <Image
          src={item.thumbnailUrl}
          alt={item.caption || 'Photo'}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 33vw, 300px"
        />
      )}

      {/* Video indicator */}
      {item.type === 'video' && (
        <div className="absolute bottom-2 right-2 bg-black/60 rounded-full p-1">
          <Play className="w-4 h-4 text-white" fill="white" />
        </div>
      )}

      {/* Hover overlay */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity">
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-white text-sm font-semibold">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" fill="white" />
              {item.likeCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" fill="white" />
              {item.commentCount || 0}
            </span>
          </div>
          
          <div className="text-white">
            <div className="text-4xl mb-2">👁️</div>
            <div className="text-sm font-semibold">VIEW</div>
          </div>

          <div className="absolute bottom-2 right-2 text-white text-sm font-semibold flex items-center gap-1">
            <Gift className="w-4 h-4" />
            {item.giftTotalCoins || 0}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Step 2.3: Create Types File
```typescript
// File: components/photos/types.ts

export interface MediaItem {
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

#### Step 2.4: Update ProfilePhotosClient
```typescript
// File: components/photos/ProfilePhotosClient.tsx
// REPLACE the existing PhotoGrid with InstagramGrid

import InstagramGrid from './InstagramGrid';

// In the render:
<InstagramGrid
  items={filteredItems}
  isLoading={isLoading}
  onItemClick={handleItemClick}
  emptyState={emptyState}
/>
```

**Test:**
1. Run dev server: `npm run dev`
2. Navigate to profile photos tab
3. Verify grid layout (3 columns)
4. Verify hover states work
5. Test on mobile (resize browser)

---

### Day 4-5: Facebook Feed (Posts Tab)

#### Step 3.1: Create FacebookFeedCard Component
```typescript
// File: components/feed/FacebookFeedCard.tsx

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Gift, MoreHorizontal } from 'lucide-react';

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
}

export default function FacebookFeedCard({
  post,
  currentUserId,
  onLike,
  onComment,
  onGift
}: FacebookFeedCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    setIsLiking(true);

    try {
      await onLike(post.id);
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    } finally {
      setIsLiking(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Link href={`/${post.author.username}`}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              {post.author.avatarUrl ? (
                <Image
                  src={post.author.avatarUrl}
                  alt={post.author.username}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold">
                  {post.author.username[0].toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div>
            <Link href={`/${post.author.username}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:underline">
              {post.author.displayName || post.author.username}
            </Link>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatTime(post.createdAt)}
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Text Content */}
      {post.textContent && (
        <div className="px-4 pb-3 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
          {post.textContent}
        </div>
      )}

      {/* Media */}
      {post.mediaUrl && (
        <div className="relative">
          {post.mediaType === 'video' ? (
            <video
              src={post.mediaUrl}
              controls
              className="w-full max-h-[600px] object-contain bg-black"
            />
          ) : (
            <div className="relative w-full max-h-[600px]">
              <img
                src={post.mediaUrl}
                alt="Post media"
                className="w-full max-h-[600px] object-contain bg-black"
              />
            </div>
          )}
        </div>
      )}

      {/* Engagement Bar */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span>{likeCount} likes</span>
          <span>{post.commentCount} comments</span>
        </div>
        <div className="flex items-center gap-1">
          <Gift className="w-4 h-4" />
          <span>{post.giftTotalCoins} coins</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-semibold transition-colors ${
            isLiked
              ? 'text-red-500'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Heart
            className="w-5 h-5"
            fill={isLiked ? 'currentColor' : 'none'}
          />
          <span>Like</span>
        </button>
        
        <button
          onClick={() => {
            setCommentsExpanded(!commentsExpanded);
            onComment(post.id);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>
        
        <button
          onClick={() => onGift(post.id, post.author.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors hover:text-purple-500"
        >
          <Gift className="w-5 h-5" />
          <span>Gift</span>
        </button>
      </div>

      {/* Comments Section */}
      {commentsExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
          <div className="text-sm text-gray-500">
            Comments section (implement based on existing comment logic)
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Step 3.2: Update PublicFeedClient to Use New Card
```typescript
// File: components/feed/PublicFeedClient.tsx
// REPLACE existing card rendering with FacebookFeedCard

import FacebookFeedCard from './FacebookFeedCard';
import GiftModal from '../GiftModal';

// Add state for gift modal
const [giftModalOpen, setGiftModalOpen] = useState(false);
const [giftRecipient, setGiftRecipient] = useState<{ id: string; username: string } | null>(null);

// Handle like
const handleLike = async (postId: string) => {
  const response = await fetch(`/api/posts/${postId}/like`, {
    method: 'POST',
  });
  const data = await response.json();
  
  // Update post in state
  setPosts(prev =>
    prev.map(p =>
      p.id === postId
        ? { ...p, isLikedByCurrentUser: data.liked, likeCount: data.likeCount }
        : p
    )
  );
};

// Handle gift
const handleGift = (postId: string, recipientId: string) => {
  const post = posts.find(p => p.id === postId);
  if (post) {
    setGiftRecipient({
      id: recipientId,
      username: post.author.username
    });
    setGiftModalOpen(true);
  }
};

// In render:
<FacebookFeedCard
  post={post}
  currentUserId={currentUserId}
  onLike={handleLike}
  onComment={toggleComments}
  onGift={handleGift}
/>

// Gift modal
{giftModalOpen && giftRecipient && (
  <GiftModal
    recipientId={giftRecipient.id}
    recipientUsername={giftRecipient.username}
    onGiftSent={() => {
      setGiftModalOpen(false);
      // Reload feed to update gift counts
      loadFeed('replace');
    }}
    onClose={() => setGiftModalOpen(false)}
  />
)}
```

**Test:**
1. Navigate to feed tab
2. Verify posts display correctly
3. Test like button (toggle on/off)
4. Test comment button (expand/collapse)
5. Test gift button (opens modal)
6. Test on mobile

---

### Day 6: Gift System Integration

#### Step 4.1: Update GiftModal for Multiple Contexts
```typescript
// File: components/GiftModal.tsx
// ADD new props (keep existing code, just extend interface)

interface GiftModalProps {
  recipientId: string;
  recipientUsername: string;
  slotIndex?: number; // For live streams
  liveStreamId?: number; // For live streams
  contextType?: 'live' | 'message' | 'post' | 'comment'; // NEW
  contextId?: string; // NEW: postId or commentId
  onGiftSent: () => void;
  onClose: () => void;
}

// Rest stays the same - modal already works universally
```

#### Step 4.2: Add Gift Button to Comments
```typescript
// In PostCommentsSection component or wherever comments render:

{comments.map((comment) => (
  <div key={comment.id} className="flex items-start justify-between gap-3 py-2">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <Link href={`/${comment.author.username}`} className="font-semibold text-sm">
          @{comment.author.username}
        </Link>
        <span className="text-xs text-gray-500">
          {formatTime(comment.createdAt)}
        </span>
      </div>
      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
        {comment.textContent}
      </p>
    </div>
    
    {/* Gift button for comment */}
    <button
      onClick={() => onGiftComment(comment.id, comment.author.id)}
      className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors"
      title="Gift this comment"
    >
      <Gift className="w-4 h-4 text-gray-500 hover:text-purple-500" />
    </button>
  </div>
))}
```

**Test:**
1. Send gift from live stream ✅ (already works)
2. Send gift from message ✅ (already works)  
3. Send gift from post (NEW)
4. Send gift from comment (NEW)
5. Verify modal looks identical in all contexts
6. Verify gift animations work everywhere

---

### Day 7: Polish & Testing

#### Step 5.1: Add Loading Skeletons
```typescript
// File: components/feed/FeedCardSkeleton.tsx

export default function FeedCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </div>
      <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 flex justify-between">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
    </div>
  );
}
```

#### Step 5.2: Optimize Images
```typescript
// Use Next.js Image component wherever possible
import Image from 'next/image';

<Image
  src={imageUrl}
  alt="Description"
  width={800}
  height={800}
  className="object-cover"
  loading="lazy"
  quality={85}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 680px, 680px"
/>
```

#### Step 5.3: Add Accessibility
```typescript
// Add ARIA labels and keyboard navigation

<button
  onClick={handleLike}
  aria-label={isLiked ? 'Unlike post' : 'Like post'}
  aria-pressed={isLiked}
  className="..."
>
  <Heart className="..." />
  <span>Like</span>
</button>
```

#### Step 5.4: Performance Testing
```bash
# Run Lighthouse audit
npm run build
npm run start
# Open Chrome DevTools → Lighthouse → Run audit

# Targets:
# - Performance: > 90
# - Accessibility: > 90
# - Best Practices: > 90
# - SEO: > 90
```

#### Step 5.5: Cross-Browser Testing
- [ ] Chrome (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Firefox (desktop)
- [ ] Edge (desktop)

#### Step 5.6: Responsive Testing
- [ ] Mobile (375px - iPhone SE)
- [ ] Mobile (390px - iPhone 12)
- [ ] Mobile (428px - iPhone 14 Pro Max)
- [ ] Tablet (768px - iPad)
- [ ] Desktop (1024px)
- [ ] Desktop (1440px)
- [ ] Desktop (1920px)

---

## 🐛 Common Issues & Solutions

### Issue 1: Grid not displaying 3 columns on mobile
**Solution:** Check Tailwind classes - should be `grid-cols-3` (not responsive)

### Issue 2: Like button not updating immediately
**Solution:** Use optimistic updates (update UI before API call)

### Issue 3: Images loading slowly
**Solution:** Add lazy loading, use Next.js Image component, optimize size

### Issue 4: Dark mode colors wrong
**Solution:** Use dark: prefix for all dark mode styles

### Issue 5: Gift modal not opening
**Solution:** Check GiftModal is imported and state is managed correctly

### Issue 6: Hover overlay not showing on mobile
**Solution:** Mobile doesn't have hover - overlay should show on tap/click instead

### Issue 7: Comments not loading
**Solution:** Check API endpoint, ensure comments are fetched on expand

### Issue 8: Videos not playing
**Solution:** Add `controls` attribute, check video format (MP4 works best)

---

## ✅ Final QA Checklist

### Visual Checklist
- [ ] Instagram grid: 3 columns, square tiles, proper gaps
- [ ] Feed cards: Match Facebook style, rounded corners
- [ ] Dark mode: All colors correct
- [ ] Hover states: Smooth transitions
- [ ] Loading states: Professional skeletons
- [ ] Empty states: Helpful and clear
- [ ] Mobile: Touch targets 44px+
- [ ] Responsive: Works on all screen sizes

### Functional Checklist
- [ ] Like: Toggle works, count updates
- [ ] Comment: Expands/collapses smoothly
- [ ] Gift: Opens modal correctly
- [ ] Gift (comment): Opens with correct recipient
- [ ] Images: Lazy load, optimize
- [ ] Videos: Play inline
- [ ] Navigation: Smooth scrolling
- [ ] Keyboard: Tab navigation works

### Performance Checklist
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No console errors
- [ ] No memory leaks
- [ ] Smooth 60fps animations

### Accessibility Checklist
- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Color contrast WCAG AA compliant
- [ ] Focus indicators visible

---

## 🚀 Deployment Steps

### 1. Pre-deployment
```bash
# Run tests
npm test

# Run linter
npm run lint

# Build production
npm run build

# Test production build locally
npm run start
```

### 2. Database Migration
```bash
# Run SQL migration on production
# (Copy SQL from Step 1.1 to Supabase Dashboard → SQL Editor)
```

### 3. Deploy
```bash
# Commit changes
git add .
git commit -m "feat: Add Facebook/Instagram style feed redesign"

# Push to main (or create PR)
git push origin main

# Vercel will auto-deploy
```

### 4. Post-deployment
- [ ] Verify production build works
- [ ] Test like/comment/gift on production
- [ ] Monitor error logs (Vercel dashboard)
- [ ] Check performance metrics
- [ ] Gather user feedback

---

## 📊 Success Metrics to Track

### Week 1 After Launch
- [ ] Like rate increase
- [ ] Comment rate increase
- [ ] Gift rate increase
- [ ] Time on page increase
- [ ] Bounce rate decrease
- [ ] Error rate < 1%

### Analytics to Monitor
```javascript
// Track engagement events
analytics.track('post_liked', { postId, userId });
analytics.track('post_commented', { postId, userId });
analytics.track('post_gifted', { postId, amount, userId });
analytics.track('photo_viewed', { photoId, userId });
```

---

## 🎉 You're Done!

If you've followed all steps:
1. Database ✅
2. API endpoints ✅
3. Instagram Grid ✅
4. Facebook Feed ✅
5. Gift integration ✅
6. Polish & testing ✅
7. Deployment ✅

**Congratulations!** The redesign is complete. Users now have a familiar, Facebook/Instagram-style experience.

---

## 📞 Need Help?

If stuck, refer back to:
1. `FACEBOOK_INSTAGRAM_FEED_REDESIGN_SPEC.md` - Full specification
2. `FEED_REDESIGN_VISUAL_GUIDE.md` - Visual reference
3. Existing components: `GiftModal.tsx`, `PublicFeedClient.tsx`, `ProfilePhotosClient.tsx`

**Good luck! 🚀**

