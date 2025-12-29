'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Upload, X, Globe, Users, Lock, Heart } from 'lucide-react';
import { Button, Card, Modal, Textarea } from '@/components/ui';
import { FeedPostCard } from './FeedPostCard';
import PostMedia from './PostMedia';
import SafeRichText from '@/components/SafeRichText';
import GiftModal from '@/components/GiftModal';
import { createClient } from '@/lib/supabase';
import { uploadPostMedia } from '@/lib/storage';
import { PHOTO_FILTER_PRESETS, type PhotoFilterId, getPhotoFilterPreset } from '@/lib/photoFilters';

type FeedAuthor = {
  id: string;
  username: string;
  avatar_url: string | null;
};

type FeedPost = {
  id: string;
  text_content: string;
  media_url: string | null;
  created_at: string;
  author: FeedAuthor;
  comment_count: number;
  gift_total_coins: number;
};

type FeedComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  text_content: string;
  created_at: string;
  like_count: number;
  reply_count: number;
  is_liked_by_current_user: boolean;
  author: FeedAuthor;
  replies?: FeedComment[];
};

type FeedResponse = {
  posts: FeedPost[];
  nextCursor: { before_created_at: string; before_id: string } | null;
  limit: number;
};

type PublicFeedClientProps = {
  username?: string;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
};

function formatDateTime(value: string) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  } catch {
    return value;
  }
}

export default function PublicFeedClient({ username, cardStyle, borderRadiusClass = 'rounded-xl' }: PublicFeedClientProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<FeedResponse['nextCursor']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [composerText, setComposerText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const composerInFlightRef = useRef(false);
  const [composerMediaFile, setComposerMediaFile] = useState<File | null>(null);
  const [composerMediaPreviewUrl, setComposerMediaPreviewUrl] = useState<string | null>(null);
  const [composerMediaKind, setComposerMediaKind] = useState<'image' | 'video' | null>(null);
  const [composerPhotoFilterId, setComposerPhotoFilterId] = useState<PhotoFilterId>('original');
  const [composerVisibility, setComposerVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const shouldShowComposer = !username || (currentUsername && currentUsername === username);

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, FeedComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
  
  // Reply state
  const [activeReplyTo, setActiveReplyTo] = useState<string | null>(null); // commentId being replied to
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>>({}); // Show/hide replies

  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [giftTargetPost, setGiftTargetPost] = useState<FeedPost | null>(null);

  const loadFeed = useCallback(async (mode: 'replace' | 'append') => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const cursor = mode === 'append' ? nextCursor : null;
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (username) params.set('username', username);
      if (cursor?.before_created_at) params.set('before_created_at', cursor.before_created_at);
      if (cursor?.before_id) params.set('before_id', cursor.before_id);

      const res = await fetch(`/api/feed?${params.toString()}`);
      const json = (await res.json()) as any;

      if (!res.ok) {
        setLoadError(json?.error || 'Failed to load feed');
        return;
      }

      const data = json as FeedResponse;

      setPosts((prev) => (mode === 'append' ? [...prev, ...(data.posts || [])] : data.posts || []));
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  }, [nextCursor, username]);

  useEffect(() => {
    let canceled = false;
    const loadMe = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) return;
        if (!data?.user) return;
        if (canceled) return;

        setCurrentUserId(data.user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', data.user.id)
          .maybeSingle();

        if (canceled) return;
        if (profile && typeof (profile as any).username === 'string') {
          setCurrentUsername(String((profile as any).username));
        }
      } catch {
        // ignore
      }
    };

    void loadMe();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    void loadFeed('replace');
  }, [loadFeed]);

  const exportFilteredImage = useCallback(
    async (file: File, cssFilter: string, filterId: PhotoFilterId): Promise<File> => {
      if (cssFilter === 'none') return file;

      const localUrl = URL.createObjectURL(file);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('Failed to load image'));
          el.src = localUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        ctx.filter = cssFilter;
        ctx.drawImage(img, 0, 0);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Failed to export image'))),
            'image/jpeg',
            0.92
          );
        });

        const baseName = file.name.replace(/\.[^.]+$/, '');
        const nextName = `${baseName}-${filterId}.jpg`;
        return new File([blob], nextName, { type: blob.type || 'image/jpeg' });
      } finally {
        URL.revokeObjectURL(localUrl);
      }
    },
    []
  );

  const createPost = useCallback(async () => {
    if (!currentUserId) {
      setLoadError('Please log in to post.');
      return;
    }

    const text = composerText.trim();
    if (!text && !composerMediaFile) return;

    if (composerInFlightRef.current) return;
    composerInFlightRef.current = true;

    if (composerMediaFile && !currentUserId) {
      setLoadError('Please log in to upload media.');
      composerInFlightRef.current = false;
      return;
    }

    setIsPosting(true);
    try {
      let mediaUrl: string | null = null;
      if (composerMediaFile && currentUserId) {
        const fileToUpload =
          composerMediaKind === 'image'
            ? await exportFilteredImage(
                composerMediaFile,
                getPhotoFilterPreset(composerPhotoFilterId).cssFilter,
                composerPhotoFilterId
              )
            : composerMediaFile;
        mediaUrl = await uploadPostMedia(currentUserId, fileToUpload);
      }

      const safeTextContent = text.length ? text : ' ';

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text_content: safeTextContent, 
          media_url: mediaUrl,
          visibility: composerVisibility 
        }),
      });

      const json = (await res.json()) as any;

      if (!res.ok) {
        setLoadError(json?.error || 'Failed to create post');
        return;
      }

      setComposerText('');
      if (composerMediaPreviewUrl) URL.revokeObjectURL(composerMediaPreviewUrl);
      setComposerMediaFile(null);
      setComposerMediaPreviewUrl(null);
      setComposerMediaKind(null);
      setComposerPhotoFilterId('original');
      setComposerVisibility('public');
      await loadFeed('replace');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsPosting(false);
      composerInFlightRef.current = false;
    }
  }, [composerMediaFile, composerMediaKind, composerMediaPreviewUrl, composerPhotoFilterId, composerText, currentUserId, exportFilteredImage, loadFeed]);

  const onComposerFileChange = useCallback((file: File | null) => {
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setLoadError('Please select an image or video file');
      return;
    }

    const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setLoadError(isVideo ? 'Video must be 50MB or less' : 'Image must be 10MB or less');
      return;
    }

    if (composerMediaPreviewUrl) URL.revokeObjectURL(composerMediaPreviewUrl);
    setComposerMediaFile(file);
    setComposerMediaKind(isVideo ? 'video' : 'image');
    setComposerPhotoFilterId('original');
    setComposerMediaPreviewUrl(URL.createObjectURL(file));
  }, [composerMediaPreviewUrl]);

  const clearComposerMedia = useCallback(() => {
    if (composerMediaPreviewUrl) URL.revokeObjectURL(composerMediaPreviewUrl);
    setComposerMediaFile(null);
    setComposerMediaPreviewUrl(null);
    setComposerMediaKind(null);
    setComposerPhotoFilterId('original');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [composerMediaPreviewUrl]);

  const toggleComments = useCallback(
    async (postId: string) => {
      setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));

      const alreadyLoaded = Array.isArray(commentsByPost[postId]);
      if (alreadyLoaded) return;

      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/comments?limit=10`);
        const json = (await res.json()) as any;

        if (!res.ok) {
          setLoadError(json?.error || 'Failed to load comments');
          return;
        }

        const rows = (json?.comments ?? []) as FeedComment[];
        setCommentsByPost((prev) => ({ ...prev, [postId]: rows }));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load comments');
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
      }
    },
    [commentsByPost]
  );

  const submitComment = useCallback(async (postId: string) => {
    const text = String(commentDrafts[postId] || '').trim();
    if (!text) return;

    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_content: text }),
      });

      const json = (await res.json()) as any;

      if (!res.ok) {
        setLoadError(json?.error || 'Failed to create comment');
        return;
      }

      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));

      const created = json?.comment;
      if (created) {
        setCommentsByPost((prev) => {
          const existing = prev[postId] ?? [];
          const newComment: FeedComment = {
            id: String(created.id),
            post_id: String(created.post_id),
            parent_comment_id: null,
            text_content: String(created.text_content ?? ''),
            created_at: String(created.created_at),
            like_count: 0,
            reply_count: 0,
            is_liked_by_current_user: false,
            author: { id: '', username: 'You', avatar_url: null },
            replies: [],
          };
          const next: FeedComment[] = [...existing, newComment];
          return { ...prev, [postId]: next };
        });
      }

      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p))
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to create comment');
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  }, [commentDrafts]);

  const toggleCommentLike = useCallback(async (commentId: string, postId: string) => {
    if (!currentUserId) return;

    const currentComments = commentsByPost[postId] || [];
    
    // Find comment (could be top-level or reply)
    let comment: FeedComment | undefined;
    let isReply = false;
    let parentCommentId: string | undefined;

    for (const c of currentComments) {
      if (c.id === commentId) {
        comment = c;
        break;
      }
      if (c.replies) {
        const reply = c.replies.find((r) => r.id === commentId);
        if (reply) {
          comment = reply;
          isReply = true;
          parentCommentId = c.id;
          break;
        }
      }
    }

    if (!comment) return;

    const wasLiked = comment.is_liked_by_current_user;
    const newLikedState = !wasLiked;

    // Optimistic UI update
    setCommentsByPost((prev) => {
      const comments = prev[postId] || [];
      const updated = comments.map((c) => {
        if (isReply && c.id === parentCommentId) {
          // Update reply within parent comment
          return {
            ...c,
            replies: c.replies?.map((r) =>
              r.id === commentId
                ? {
                    ...r,
                    is_liked_by_current_user: newLikedState,
                    like_count: newLikedState ? r.like_count + 1 : Math.max(0, r.like_count - 1),
                  }
                : r
            ),
          };
        } else if (c.id === commentId) {
          // Update top-level comment
          return {
            ...c,
            is_liked_by_current_user: newLikedState,
            like_count: newLikedState ? c.like_count + 1 : Math.max(0, c.like_count - 1),
          };
        }
        return c;
      });
      return { ...prev, [postId]: updated };
    });

    // Call API
    try {
      const method = newLikedState ? 'POST' : 'DELETE';
      const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/like`, {
        method,
      });

      if (!res.ok) {
        // Revert on error
        setCommentsByPost((prev) => {
          const comments = prev[postId] || [];
          const reverted = comments.map((c) => {
            if (isReply && c.id === parentCommentId) {
              return {
                ...c,
                replies: c.replies?.map((r) =>
                  r.id === commentId
                    ? {
                        ...r,
                        is_liked_by_current_user: wasLiked,
                        like_count: wasLiked ? r.like_count + 1 : Math.max(0, r.like_count - 1),
                      }
                    : r
                ),
              };
            } else if (c.id === commentId) {
              return {
                ...c,
                is_liked_by_current_user: wasLiked,
                like_count: wasLiked ? c.like_count + 1 : Math.max(0, c.like_count - 1),
              };
            }
            return c;
          });
          return { ...prev, [postId]: reverted };
        });
      }
    } catch (err) {
      console.error('Failed to toggle comment like:', err);
      // Revert on error
      setCommentsByPost((prev) => {
        const comments = prev[postId] || [];
        const reverted = comments.map((c) => {
          if (isReply && c.id === parentCommentId) {
            return {
              ...c,
              replies: c.replies?.map((r) =>
                r.id === commentId
                  ? {
                      ...r,
                      is_liked_by_current_user: wasLiked,
                      like_count: wasLiked ? r.like_count + 1 : Math.max(0, r.like_count - 1),
                    }
                  : r
              ),
            };
          } else if (c.id === commentId) {
            return {
              ...c,
              is_liked_by_current_user: wasLiked,
              like_count: wasLiked ? c.like_count + 1 : Math.max(0, c.like_count - 1),
            };
          }
          return c;
        });
        return { ...prev, [postId]: reverted };
      });
    }
  }, [commentsByPost, currentUserId]);

  const submitReply = useCallback(async (parentCommentId: string, postId: string) => {
    const text = String(replyDrafts[parentCommentId] || '').trim();
    if (!text) return;

    setReplySubmitting((prev) => ({ ...prev, [parentCommentId]: true }));
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_content: text, parent_comment_id: parentCommentId }),
      });

      const json = (await res.json()) as any;

      if (!res.ok) {
        setLoadError(json?.error || 'Failed to create reply');
        return;
      }

      setReplyDrafts((prev) => ({ ...prev, [parentCommentId]: '' }));
      setActiveReplyTo(null);

      const created = json?.comment;
      if (created) {
        setCommentsByPost((prev) => {
          const existing = prev[postId] ?? [];
          const newReply: FeedComment = {
            id: String(created.id),
            post_id: String(created.post_id),
            parent_comment_id: String(parentCommentId),
            text_content: String(created.text_content ?? ''),
            created_at: String(created.created_at),
            like_count: 0,
            reply_count: 0,
            is_liked_by_current_user: false,
            author: { id: '', username: 'You', avatar_url: null },
            replies: [],
          };

          // Add reply to parent comment
          const updated = existing.map((c) =>
            c.id === parentCommentId
              ? {
                  ...c,
                  reply_count: (c.reply_count || 0) + 1,
                  replies: [...(c.replies || []), newReply],
                }
              : c
          );

          return { ...prev, [postId]: updated };
        });

        // Expand replies to show the new reply
        setExpandedReplies((prev) => ({ ...prev, [parentCommentId]: true }));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to create reply');
    } finally {
      setReplySubmitting((prev) => ({ ...prev, [parentCommentId]: false }));
    }
  }, [replyDrafts]);

  const openGiftModal = useCallback((post: FeedPost) => {
    setGiftTargetPost(post);
    setGiftModalOpen(true);
  }, []);

  const handleGiftSent = useCallback(() => {
    if (giftTargetPost) {
      // Refresh feed to show updated coin count
      void loadFeed('replace');
    }
  }, [giftTargetPost, loadFeed]);

  return (
    <div className="space-y-4">
      {loadError && (
        <Card className="p-4 border border-destructive/30 bg-destructive/5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">{loadError}</div>
            <Button variant="outline" size="sm" onClick={() => loadFeed('replace')} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      <Card className={`overflow-hidden backdrop-blur-sm ${borderRadiusClass}`} style={cardStyle}>
        <div className="p-4 sm:p-5 space-y-3">
          <div className="text-sm font-medium text-foreground">Create a post</div>
          {shouldShowComposer ? (
            <>
              <Textarea
                textareaSize="md"
                placeholder="Share something with the community..."
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                disabled={isPosting}
              />

              {composerMediaPreviewUrl && composerMediaKind && (
                <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20">
                  {composerMediaKind === 'video' ? (
                    <video src={composerMediaPreviewUrl} controls className="w-full h-auto block" />
                  ) : (
                    <img
                      src={composerMediaPreviewUrl}
                      alt="Selected media"
                      className="w-full h-auto block"
                      style={{ filter: getPhotoFilterPreset(composerPhotoFilterId).cssFilter }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={clearComposerMedia}
                    className="absolute top-2 right-2 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background/80 backdrop-blur border border-border text-xs"
                    disabled={isPosting}
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              )}

              {composerMediaPreviewUrl && composerMediaKind === 'image' && (
                <div className="flex items-center gap-2 overflow-x-auto pt-1">
                  {PHOTO_FILTER_PRESETS.map((preset) => {
                    const selected = preset.id === composerPhotoFilterId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setComposerPhotoFilterId(preset.id)}
                        disabled={isPosting}
                        className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                          selected
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-background/60 text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => onComposerFileChange(e.target.files?.[0] ?? null)}
                    disabled={isPosting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPosting}
                    leftIcon={<Upload className="w-4 h-4" />}
                  >
                    Add photo/video
                  </Button>

                  {/* Visibility Selector */}
                  <div className="relative">
                    <select
                      value={composerVisibility}
                      onChange={(e) => setComposerVisibility(e.target.value as 'public' | 'friends' | 'private')}
                      disabled={isPosting}
                      className="appearance-none pl-8 pr-8 py-1.5 rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      {composerVisibility === 'public' && <Globe className="w-4 h-4 text-muted-foreground" />}
                      {composerVisibility === 'friends' && <Users className="w-4 h-4 text-muted-foreground" />}
                      {composerVisibility === 'private' && <Lock className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </div>
                <Button onClick={createPost} disabled={isPosting || (!composerText.trim() && !composerMediaFile)} isLoading={isPosting}>
                  Post
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">This feed is view-only.</div>
          )}
        </div>
      </Card>

      {posts.length === 0 && !isLoading ? (
        <Card className={`p-6 backdrop-blur-sm ${borderRadiusClass}`} style={cardStyle}>
          <div className="text-sm text-muted-foreground">No posts yet.</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isExpanded = !!expandedComments[post.id];
            const comments = commentsByPost[post.id] || [];
            const isCommentsLoading = !!commentsLoading[post.id];
            const isVideo = !!post.media_url && /(\.mp4|\.webm|\.mov|\.m4v)(\?|$)/i.test(post.media_url);

            return (
              <div key={post.id} className="space-y-0">
                <FeedPostCard
                  authorName={post.author.username}
                  authorUsername={post.author.username}
                  authorAvatarUrl={post.author.avatar_url}
                  content={post.text_content}
                  timestamp={post.created_at}
                  media={
                    post.media_url ? (
                      <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                        <PostMedia mediaUrl={post.media_url} mediaType={isVideo ? 'video' : 'photo'} mode="feed" alt="Post media" />
                      </div>
                    ) : undefined
                  }
                  coinCount={post.gift_total_coins}
                  onLike={() => {
                    // TODO: Implement like functionality when backend is ready
                  }}
                  onComment={() => void toggleComments(post.id)}
                  onGift={() => openGiftModal(post)}
                  onProfileClick={() => {
                    window.location.href = `/${post.author.username}`;
                  }}
                  className={`backdrop-blur-sm ${borderRadiusClass}`}
                  style={cardStyle}
                />

                {isExpanded && (
                  <Card className={`overflow-hidden backdrop-blur-sm border-t-0 rounded-t-none ${borderRadiusClass}`} style={cardStyle}>
                    <div className="border-t border-border p-4 space-y-3">
                      {isCommentsLoading ? (
                        <div className="text-sm text-muted-foreground">Loading comments...</div>
                      ) : (
                        <div className="space-y-4">
                          {comments.map((c) => (
                            <div key={c.id} className="space-y-2">
                              {/* Main Comment */}
                              <div className="flex items-start gap-3">
                                {/* Profile Picture */}
                                <Link href={`/${c.author.username}`} className="flex-shrink-0">
                                  <img
                                    src={c.author.avatar_url || '/no-profile-pic.png'}
                                    alt={`${c.author.username}'s avatar`}
                                    className="w-8 h-8 rounded-full object-cover hover:opacity-80 transition-opacity"
                                    onError={(e) => {
                                      e.currentTarget.src = '/no-profile-pic.png';
                                    }}
                                  />
                                </Link>

                                {/* Comment Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="bg-muted rounded-2xl px-3 py-2">
                                    <Link 
                                      href={`/${c.author.username}`} 
                                      className="text-sm font-semibold text-foreground hover:underline"
                                    >
                                      {c.author.username}
                                    </Link>
                                    <div className="text-sm text-foreground whitespace-pre-wrap mt-0.5">
                                      <SafeRichText text={c.text_content} className="whitespace-pre-wrap" />
                                    </div>
                                  </div>

                                  {/* Comment Actions */}
                                  <div className="flex items-center gap-3 px-3 mt-1">
                                    <button
                                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition group"
                                      onClick={() => void toggleCommentLike(c.id, post.id)}
                                    >
                                      <Heart 
                                        className={`w-3.5 h-3.5 transition ${
                                          c.is_liked_by_current_user 
                                            ? 'fill-primary text-primary' 
                                            : 'group-hover:fill-primary/20'
                                        }`}
                                      />
                                      <span className={c.is_liked_by_current_user ? 'text-primary' : ''}>
                                        {c.like_count > 0 ? c.like_count : 'Like'}
                                      </span>
                                    </button>
                                    <button
                                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                                      onClick={() => setActiveReplyTo(activeReplyTo === c.id ? null : c.id)}
                                    >
                                      Reply
                                    </button>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDateTime(c.created_at)}
                                    </span>
                                  </div>

                                  {/* Reply Input */}
                                  {activeReplyTo === c.id && (
                                    <div className="mt-2 pl-3 space-y-2">
                                      <Textarea
                                        textareaSize="sm"
                                        placeholder={`Reply to ${c.author.username}...`}
                                        value={replyDrafts[c.id] || ''}
                                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                        disabled={!!replySubmitting[c.id]}
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setActiveReplyTo(null);
                                            setReplyDrafts((prev) => ({ ...prev, [c.id]: '' }));
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => void submitReply(c.id, post.id)}
                                          disabled={!!replySubmitting[c.id] || !String(replyDrafts[c.id] || '').trim()}
                                          isLoading={!!replySubmitting[c.id]}
                                        >
                                          Reply
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Nested Replies */}
                              {c.replies && c.replies.length > 0 && (
                                <div className="ml-11 space-y-2">
                                  {/* View Replies Toggle */}
                                  {!expandedReplies[c.id] && (
                                    <button
                                      className="text-xs font-semibold text-primary hover:underline"
                                      onClick={() => setExpandedReplies((prev) => ({ ...prev, [c.id]: true }))}
                                    >
                                      View {c.replies.length} {c.replies.length === 1 ? 'reply' : 'replies'}
                                    </button>
                                  )}

                                  {expandedReplies[c.id] && (
                                    <>
                                      <button
                                        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                                        onClick={() => setExpandedReplies((prev) => ({ ...prev, [c.id]: false }))}
                                      >
                                        Hide replies
                                      </button>
                                      {c.replies.map((reply) => (
                                        <div key={reply.id} className="flex items-start gap-3">
                                          {/* Reply Profile Picture */}
                                          <Link href={`/${reply.author.username}`} className="flex-shrink-0">
                                            <img
                                              src={reply.author.avatar_url || '/no-profile-pic.png'}
                                              alt={`${reply.author.username}'s avatar`}
                                              className="w-7 h-7 rounded-full object-cover hover:opacity-80 transition-opacity"
                                              onError={(e) => {
                                                e.currentTarget.src = '/no-profile-pic.png';
                                              }}
                                            />
                                          </Link>

                                          {/* Reply Content */}
                                          <div className="flex-1 min-w-0">
                                            <div className="bg-muted rounded-2xl px-3 py-2">
                                              <Link 
                                                href={`/${reply.author.username}`} 
                                                className="text-sm font-semibold text-foreground hover:underline"
                                              >
                                                {reply.author.username}
                                              </Link>
                                              <div className="text-sm text-foreground whitespace-pre-wrap mt-0.5">
                                                <SafeRichText text={reply.text_content} className="whitespace-pre-wrap" />
                                              </div>
                                            </div>

                                            {/* Reply Actions */}
                                            <div className="flex items-center gap-3 px-3 mt-1">
                                              <button
                                                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition group"
                                                onClick={() => void toggleCommentLike(reply.id, post.id)}
                                              >
                                                <Heart 
                                                  className={`w-3.5 h-3.5 transition ${
                                                    reply.is_liked_by_current_user 
                                                      ? 'fill-primary text-primary' 
                                                      : 'group-hover:fill-primary/20'
                                                  }`}
                                                />
                                                <span className={reply.is_liked_by_current_user ? 'text-primary' : ''}>
                                                  {reply.like_count > 0 ? reply.like_count : 'Like'}
                                                </span>
                                              </button>
                                              <span className="text-xs text-muted-foreground">
                                                {formatDateTime(reply.created_at)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}

                          <div className="pt-2 space-y-2">
                            <Textarea
                              textareaSize="sm"
                              placeholder="Write a comment..."
                              value={commentDrafts[post.id] || ''}
                              onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              disabled={!!commentSubmitting[post.id]}
                            />
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => void submitComment(post.id)}
                                disabled={!!commentSubmitting[post.id] || !String(commentDrafts[post.id] || '').trim()}
                                isLoading={!!commentSubmitting[post.id]}
                              >
                                Comment
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            );
          })}

          {nextCursor && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => void loadFeed('append')} disabled={isLoading} isLoading={isLoading}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      {giftModalOpen && giftTargetPost && (
        <GiftModal
          recipientId={giftTargetPost.author.id}
          recipientUsername={giftTargetPost.author.username}
          onGiftSent={handleGiftSent}
          onClose={() => {
            setGiftModalOpen(false);
            setGiftTargetPost(null);
          }}
        />
      )}
    </div>
  );
}
