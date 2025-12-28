'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Gift, RefreshCw, Upload, X } from 'lucide-react';
import { Button, Card, Modal, Textarea } from '@/components/ui';
import PostMedia from './PostMedia';
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
  text_content: string;
  created_at: string;
  author: FeedAuthor;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const shouldShowComposer = !username || (currentUsername && currentUsername === username);

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, FeedComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});

  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [giftTarget, setGiftTarget] = useState<
    | { kind: 'post'; postId: string }
    | { kind: 'comment'; commentId: string }
    | null
  >(null);
  const [giftSubmitting, setGiftSubmitting] = useState(false);

  const giftPresets = useMemo(() => [10, 50, 100], []);

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
        body: JSON.stringify({ text_content: safeTextContent, media_url: mediaUrl }),
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
          const next = [...existing, {
            id: String(created.id),
            post_id: String(created.post_id),
            text_content: String(created.text_content ?? ''),
            created_at: String(created.created_at),
            author: { id: '', username: 'You', avatar_url: null },
          }];
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

  const openGiftModal = useCallback((target: { kind: 'post'; postId: string } | { kind: 'comment'; commentId: string }) => {
    setGiftTarget(target);
    setGiftModalOpen(true);
  }, []);

  const sendGift = useCallback(
    async (coins: number) => {
      if (!giftTarget) return;

      setGiftSubmitting(true);
      try {
        const requestId = crypto.randomUUID();

        const endpoint =
          giftTarget.kind === 'post'
            ? `/api/posts/${encodeURIComponent(giftTarget.postId)}/gift`
            : `/api/comments/${encodeURIComponent(giftTarget.commentId)}/gift`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': requestId,
          },
          body: JSON.stringify({ coins }),
        });

        const json = (await res.json()) as any;

        if (!res.ok) {
          setLoadError(json?.error || 'Failed to send gift');
          return;
        }

        if (giftTarget.kind === 'post') {
          setPosts((prev) =>
            prev.map((p) => (p.id === giftTarget.postId ? { ...p, gift_total_coins: (p.gift_total_coins || 0) + coins } : p))
          );
        }

        setGiftModalOpen(false);
        setGiftTarget(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to send gift');
      } finally {
        setGiftSubmitting(false);
      }
    },
    [giftTarget]
  );

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
              <Card key={post.id} className={`overflow-hidden backdrop-blur-sm ${borderRadiusClass}`} style={cardStyle}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">
                        <Link href={`/${post.author.username}`} className="hover:underline">
                          @{post.author.username}
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(post.created_at)}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openGiftModal({ kind: 'post', postId: post.id })} leftIcon={<Gift className="w-4 h-4" />}>
                      Gift
                    </Button>
                  </div>

                  <div className="text-foreground whitespace-pre-wrap">{post.text_content}</div>

                  {post.media_url && (
                    <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                      <PostMedia mediaUrl={post.media_url} mediaType={isVideo ? 'video' : 'photo'} mode="feed" alt="Post media" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>{post.gift_total_coins} coins gifted</div>
                    <button
                      className="flex items-center gap-2 hover:text-foreground transition-colors"
                      onClick={() => void toggleComments(post.id)}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comment_count} comments</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-3">
                    {isCommentsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading comments...</div>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((c) => (
                          <div key={c.id} className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground">
                                <Link href={`/${c.author.username}`} className="hover:underline">
                                  @{c.author.username}
                                </Link>
                              </div>
                              <div className="text-xs text-muted-foreground">{formatDateTime(c.created_at)}</div>
                              <div className="text-sm text-foreground whitespace-pre-wrap mt-1">{c.text_content}</div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openGiftModal({ kind: 'comment', commentId: c.id })}
                              leftIcon={<Gift className="w-4 h-4" />}
                            >
                              Gift
                            </Button>
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
                )}
              </Card>
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

      <Modal
        isOpen={giftModalOpen}
        onClose={() => {
          if (giftSubmitting) return;
          setGiftModalOpen(false);
          setGiftTarget(null);
        }}
        title="Send a gift"
        description="Choose an amount of coins to send"
        size="sm"
      >
        <div className="grid grid-cols-3 gap-2">
          {giftPresets.map((amt) => (
            <Button key={amt} variant="outline" onClick={() => void sendGift(amt)} disabled={giftSubmitting} isLoading={giftSubmitting}>
              {amt}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
