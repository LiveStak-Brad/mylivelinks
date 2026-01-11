import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

type FeedRow = {
  post_id: string;
  text_content: string | null;
  media_url: string | null;
  created_at: string;
  author_id: string;
  author_username: string | null;
  author_avatar_url: string | null;
  comment_count?: number | null;
  likes_count?: number | null;
  views_count?: number | null;
};

type FeedPost = {
  post_id: string;
  author_profile_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
  created_at: string;
  text_content: string;
  media_url: string | null;
  comment_count: number;
  likes_count: number;
  views_count: number;
};

type ReactionType = 'love' | 'haha' | 'wow' | 'sad' | 'fire';
const REACTIONS: ReactionType[] = ['love', 'haha', 'wow', 'sad', 'fire'];
const REACTION_EMOJI: Record<ReactionType, string> = {
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  fire: '🔥',
};

function ReactionPickerModal({
  visible,
  currentReaction,
  onClose,
  onSelect,
  onClear,
}: {
  visible: boolean;
  currentReaction: ReactionType | null;
  onClose: () => void;
  onSelect: (reaction: ReactionType) => void;
  onClear: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.reactionModalBackdrop} onPress={onClose}>
        <Pressable style={styles.reactionModalCard} onPress={() => {}}>
          <Text style={styles.reactionModalTitle}>React</Text>
          <View style={styles.reactionRow}>
            {REACTIONS.map((r) => {
              const selected = currentReaction === r;
              return (
                <Pressable
                  key={r}
                  accessibilityRole="button"
                  onPress={() => onSelect(r)}
                  style={[styles.reactionChip, selected ? styles.reactionChipSelected : null]}
                >
                  <Text style={styles.reactionChipEmoji}>{REACTION_EMOJI[r]}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.reactionModalActionsRow}>
            <Pressable accessibilityRole="button" onPress={onClear} style={styles.reactionActionBtn}>
              <Text style={styles.reactionActionText}>Remove</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.reactionActionBtn}>
              <Text style={styles.reactionActionText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Button({
  label,
  variant = 'primary',
  iconName,
}: {
  label: string;
  variant?: 'primary' | 'outline';
  iconName?: React.ComponentProps<typeof Feather>['name'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.buttonBase,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonOutline,
        pressed && styles.buttonPressed,
      ]}
    >
      {iconName ? (
        <Feather
          name={iconName}
          size={16}
          color="#FFFFFF"
        />
      ) : null}
      <Text style={variant === 'primary' ? styles.buttonPrimaryText : styles.buttonOutlineText}>
        {label}
      </Text>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function formatFeedTimestamp(createdAt: string) {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';

  const date = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
  return `${date} • ${time}`;
}

function getMediaKindFromUrl(url: string): 'image' | 'video' {
  const clean = url.split('?')[0] ?? url;
  if (/\.(mp4|mov|m4v|webm|m3u8)$/i.test(clean)) return 'video';
  if (/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(clean)) return 'image';
  // Default to image if unknown (RN Image can still render many CDN urls without extensions)
  return 'image';
}

function looksLikeHttpUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function resolvePublicStorageUrl(bucket: string, maybeUrlOrPath: string | null): string | null {
  if (!maybeUrlOrPath) return null;
  const raw = String(maybeUrlOrPath).trim();
  if (!raw) return null;
  if (looksLikeHttpUrl(raw)) return raw;

  // Accept either `path/to/file` or `/path/to/file` or `bucket/path/to/file`
  const needle = `${bucket}/`;
  const idx = raw.indexOf(needle);
  const path = (idx >= 0 ? raw.slice(idx + needle.length) : raw).replace(/^\/+/, '');
  if (!path) return null;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ? String(data.publicUrl) : null;
}

function FeedPostCard({
  post,
  isLiked,
  userReaction,
  mediaAspectRatio,
  onPressProfile,
  onOpenReactionPicker,
  onPressComment,
  onPressReactions,
  onVideoReadyAspectRatio,
}: {
  post: FeedPost;
  isLiked: boolean;
  userReaction: ReactionType | null;
  mediaAspectRatio: number | null;
  onPressProfile: () => void;
  onOpenReactionPicker: () => void;
  onPressComment: () => void;
  onPressReactions: () => void;
  onVideoReadyAspectRatio: (aspectRatio: number) => void;
}) {
  const [avatarError, setAvatarError] = useState(false);

  const initial = (post.author_display_name || post.author_username || '?')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const timestamp = formatFeedTimestamp(post.created_at);
  const kind = post.media_url ? getMediaKindFromUrl(post.media_url) : null;
  const ratio = mediaAspectRatio && Number.isFinite(mediaAspectRatio) && mediaAspectRatio > 0 ? mediaAspectRatio : null;
  const mediaContainerStyle = ratio
    ? [styles.mediaContainer, { aspectRatio: ratio }]
    : [styles.mediaContainer, styles.mediaContainerFallback];

  const avatarUrl = resolvePublicStorageUrl('avatars', post.author_avatar_url);
  const mediaUrl = resolvePublicStorageUrl('post-media', post.media_url);

  return (
    <View style={styles.feedPost}>
      <View style={styles.postHeaderRow}>
        <Pressable accessibilityRole="button" onPress={onPressProfile} style={styles.avatar}>
          {avatarUrl && !avatarError ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={(e) => {
                console.warn('[feed] avatar failed to load', {
                  postId: post.post_id,
                  authorId: post.author_profile_id,
                  url: avatarUrl,
                  error: (e as any)?.nativeEvent?.error,
                });
                setAvatarError(true);
              }}
              accessibilityLabel="Profile photo"
            />
          ) : (
            <Text style={styles.avatarText}>{initial || '•'}</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onPressProfile}
          style={styles.postHeaderTextCol}
        >
          <Text style={styles.postAuthorName}>{post.author_display_name}</Text>
          <Text style={styles.postTimestamp}>{timestamp}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" style={styles.iconButton}>
          <Feather name="more-horizontal" size={18} color={stylesVars.mutedText} />
        </Pressable>
      </View>

      {post.text_content?.trim() ? (
        <View style={styles.postBody}>
          <Text style={styles.postContent}>{post.text_content}</Text>
        </View>
      ) : null}

      {mediaUrl ? (
        <View style={mediaContainerStyle}>
          {kind === 'video' ? (
            <Video
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay={false}
              isMuted={false}
              onReadyForDisplay={(evt) => {
                const w = evt?.naturalSize?.width;
                const h = evt?.naturalSize?.height;
                if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
                  onVideoReadyAspectRatio(w / h);
                }
              }}
            />
          ) : (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode="cover"
              accessibilityLabel="Feed media"
              onError={(e) => {
                console.warn('[feed] post media failed to load', {
                  postId: post.post_id,
                  url: mediaUrl,
                  error: (e as any)?.nativeEvent?.error,
                });
              }}
            />
          )}
        </View>
      ) : null}

      <View style={styles.postActionsRow}>
        <Pressable
          accessibilityRole="button"
          style={styles.actionButton}
          onPress={onOpenReactionPicker}
        >
          {userReaction ? (
            <View style={styles.reactionEmojiWrap}>
              <Text style={styles.reactionEmoji} accessibilityLabel="Reaction">
                {REACTION_EMOJI[userReaction]}
              </Text>
            </View>
          ) : (
            <Feather name="heart" size={18} color={isLiked ? '#EF4444' : stylesVars.mutedText} />
          )}
          <Text style={styles.actionButtonText}>Like</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.actionButton} onPress={onPressComment}>
          <Feather name="message-circle" size={18} color={stylesVars.mutedText} />
          <Text style={styles.actionButtonText}>Comment</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.actionButton}>
          <Feather name="gift" size={18} color={stylesVars.mutedText} />
          <Text style={styles.actionButtonText}>Gift</Text>
        </Pressable>
      </View>

      <View style={styles.reactionsRow}>
        <Pressable accessibilityRole="button" onPress={onPressReactions}>
          <Text style={styles.reactionsTextClickable}>{post.likes_count} reactions</Text>
        </Pressable>
        <View style={styles.viewsRow}>
          <Feather name="eye" size={14} color={stylesVars.mutedText} />
          <Text style={styles.viewsText}>{post.views_count.toLocaleString()} views</Text>
        </View>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const PAGE_SIZE = 20;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<{ before_created_at: string; before_id: string } | null>(
    null
  );
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [likedByPostId, setLikedByPostId] = useState<Record<string, boolean>>({});
  const [userReactionByPostId, setUserReactionByPostId] = useState<Record<string, ReactionType | null>>({});
  const [mediaAspectRatios, setMediaAspectRatios] = useState<Record<string, number>>({});
  const [likeMode, setLikeMode] = useState<'unknown' | 'toggle' | 'insertOnly'>('unknown');
  const [reactionPickerPostId, setReactionPickerPostId] = useState<string | null>(null);
  const [reactionsModalPostId, setReactionsModalPostId] = useState<string | null>(null);
  const [reactionsModalData, setReactionsModalData] = useState<Array<{
    profile_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    reaction_type: string;
  }>>([]);
  const [reactionsModalLoading, setReactionsModalLoading] = useState(false);

  const inFlightRef = useRef(false);
  const trackedViewsRef = useRef<Set<string>>(new Set());

  const mergeUniquePosts = useCallback((prev: FeedPost[], next: FeedPost[]) => {
    if (next.length === 0) return prev;
    const seen = new Set(prev.map((p) => p.post_id));
    const merged = [...prev];
    for (const p of next) {
      if (seen.has(p.post_id)) continue;
      seen.add(p.post_id);
      merged.push(p);
    }
    return merged;
  }, []);

  const fetchUserLikesForPosts = useCallback(
    async (postIds: string[]) => {
      if (!user || postIds.length === 0) return;
      try {
        // Prefer canonical batch RPC if present (matches web schema docs)
        const { data, error: rpcError } = await supabase.rpc('rpc_get_user_post_likes', {
          p_profile_id: user.id,
          p_post_ids: postIds,
        });

        if (!rpcError && Array.isArray(data)) {
          const likedIds = new Set((data as any[]).map((r) => String(r.post_id)));
          setLikedByPostId((prev) => {
            const next = { ...prev };
            for (const id of postIds) next[id] = likedIds.has(id);
            return next;
          });
          // Note: this RPC doesn't include reaction_type; try direct table lookup next.
        }

        // Try to load reaction_type if the schema supports it; otherwise fallback to boolean likes.
        const { data: rowsWithType, error: rowsWithTypeErr } = await supabase
          .from('post_likes')
          .select('post_id, reaction_type')
          .eq('profile_id', user.id)
          .in('post_id', postIds);

        if (!rowsWithTypeErr && Array.isArray(rowsWithType)) {
          const likedIds = new Set(rowsWithType.map((r: any) => String(r.post_id)));
          setLikedByPostId((prev) => {
            const next = { ...prev };
            for (const id of postIds) next[id] = likedIds.has(id);
            return next;
          });

          setUserReactionByPostId((prev) => {
            const next = { ...prev };
            for (const row of rowsWithType as any[]) {
              const pid = String(row.post_id);
              const rt = row.reaction_type ? String(row.reaction_type) : null;
              next[pid] = REACTIONS.includes(rt as ReactionType) ? (rt as ReactionType) : null;
            }
            return next;
          });
          return;
        }

        const { data: rows } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('profile_id', user.id)
          .in('post_id', postIds);

        const likedIds = new Set((rows ?? []).map((r: any) => String(r.post_id)));
        setLikedByPostId((prev) => {
          const next = { ...prev };
          for (const id of postIds) next[id] = likedIds.has(id);
          return next;
        });
      } catch (e) {
        console.warn('[feed] failed to load user like state:', e);
      }
    },
    [user]
  );

  const fetchFeedPage = useCallback(
    async ({ reset }: { reset: boolean }) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setError(null);

      try {
        if (reset) {
          setRefreshing(posts.length > 0);
          setLoadingInitial(posts.length === 0);
        } else {
          setLoadingMore(true);
        }

        const beforeCreatedAt = reset ? null : cursor?.before_created_at ?? null;
        const beforeId = reset ? null : cursor?.before_id ?? null;

        const { data, error: rpcError } = await supabase.rpc('get_public_feed', {
          p_limit: PAGE_SIZE,
          p_before_created_at: beforeCreatedAt,
          p_before_id: beforeId,
          p_username: null,
        });

        if (rpcError) throw new Error(rpcError.message);

        const rows = (data ?? []) as unknown as FeedRow[];
        const mapped: FeedPost[] = rows.map((r) => ({
          post_id: String(r.post_id),
          author_profile_id: String(r.author_id),
          author_username: String(r.author_username ?? ''),
          author_display_name: String(r.author_username ?? ''),
          author_avatar_url: r.author_avatar_url ? String(r.author_avatar_url) : null,
          created_at: String(r.created_at),
          text_content: String(r.text_content ?? ''),
          media_url: r.media_url ? String(r.media_url) : null,
          comment_count: Number(r.comment_count ?? 0),
          likes_count: Number(r.likes_count ?? 0),
          views_count: Number(r.views_count ?? 0),
        }));

        const last = mapped[mapped.length - 1];
        const nextCursor = last ? { before_created_at: last.created_at, before_id: last.post_id } : null;

        if (reset) {
          setPosts(mapped);
        } else {
          setPosts((prev) => mergeUniquePosts(prev, mapped));
        }
        setCursor(nextCursor);

        await fetchUserLikesForPosts(mapped.map((p) => p.post_id));
      } catch (e: any) {
        setError(e?.message ? String(e.message) : 'Failed to load feed');
      } finally {
        inFlightRef.current = false;
        setLoadingInitial(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [PAGE_SIZE, cursor?.before_created_at, cursor?.before_id, fetchUserLikesForPosts, mergeUniquePosts, posts.length]
  );

  useEffect(() => {
    fetchFeedPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safely derive image aspect ratios from the actual media (no DB guessing).
  // We resolve raw media_url paths to full public URLs before measuring.
  useEffect(() => {
    let cancelled = false;

    const urlsToMeasure = posts
      .map((p) => p.media_url)
      .filter((u): u is string => Boolean(u))
      .filter((u) => getMediaKindFromUrl(u) === 'image')
      .filter((u) => mediaAspectRatios[u] == null);

    if (urlsToMeasure.length === 0) return;

    for (const rawUrl of urlsToMeasure) {
      const resolvedUrl = resolvePublicStorageUrl('post-media', rawUrl);
      if (!resolvedUrl) continue;

      Image.getSize(
        resolvedUrl,
        (w, h) => {
          if (cancelled) return;
          if (!w || !h) return;
          const ratio = w / h;
          if (!Number.isFinite(ratio) || ratio <= 0) return;
          // Key by the original raw URL so FeedPostCard can look it up by media_url
          setMediaAspectRatios((prev) => (prev[rawUrl] != null ? prev : { ...prev, [rawUrl]: ratio }));
        },
        () => {
          // Keep fallback sizing if we can't measure.
        }
      );
    }

    return () => {
      cancelled = true;
    };
  }, [posts, mediaAspectRatios]);

  const handleSetReaction = useCallback(
    async (postId: string, reaction: ReactionType) => {
      if (!user) return;

      const postIndex = posts.findIndex((p) => p.post_id === postId);
      if (postIndex < 0) return;

      const wasLiked = Boolean(likedByPostId[postId]);
      const prevReaction = userReactionByPostId[postId] ?? null;
      const nextReaction = reaction;

      // Insert-only mode can't unlike; keep UI stable.
      // It also can't store reaction types; we'll still let the user pick and apply locally, but only first-like will persist.
      if (likeMode === 'insertOnly' && wasLiked) {
        setUserReactionByPostId((m) => ({ ...m, [postId]: nextReaction }));
        return;
      }

      const prevPosts = posts;
      const prevLiked = likedByPostId;
      const prevReactions = userReactionByPostId;

      // Optimistic UI:
      // - If not liked yet: set liked + reaction and increment count by 1.
      // - If already liked: update reaction only (count unchanged) until server responds.
      if (!wasLiked) {
        setLikedByPostId((m) => ({ ...m, [postId]: true }));
        setUserReactionByPostId((m) => ({ ...m, [postId]: nextReaction }));
        setPosts((prev) =>
          prev.map((p) => (p.post_id === postId ? { ...p, likes_count: p.likes_count + 1 } : p))
        );
      } else {
        // Switching reaction: update local emoji immediately, count unchanged.
        setUserReactionByPostId((m) => ({ ...m, [postId]: nextReaction }));
      }

      try {
        // Prefer web-like toggle RPC (supports unlike + reactions). Fallback to insert-only RPC if missing.
        const { data, error: toggleErr } = await supabase.rpc('rpc_post_like_toggle', {
          p_post_id: postId,
          p_profile_id: user.id,
          p_reaction_type: nextReaction,
        });

        if (!toggleErr && Array.isArray(data) && data.length > 0) {
          if (likeMode !== 'toggle') setLikeMode('toggle');
          const result: any = data[0];
          setLikedByPostId((m) => ({ ...m, [postId]: Boolean(result.is_liked) }));
          const rt = result.user_reaction ? String(result.user_reaction) : null;
          setUserReactionByPostId((m) => ({
            ...m,
            [postId]: REACTIONS.includes(rt as ReactionType) ? (rt as ReactionType) : null,
          }));
          setPosts((prev) =>
            prev.map((p) => (p.post_id === postId ? { ...p, likes_count: Number(result.likes_count ?? p.likes_count) } : p))
          );
          return;
        }

        if (toggleErr && /does not exist/i.test(toggleErr.message)) {
          if (likeMode !== 'insertOnly') setLikeMode('insertOnly');
          // If we were trying to unlike (no optimistic change), just no-op.
          if (wasLiked) return;

          const { data: likeData, error: likeErr } = await supabase.rpc('rpc_like_post', {
            p_post_id: postId,
            p_profile_id: user.id,
          });
          if (likeErr) throw new Error(likeErr.message);
          if (Array.isArray(likeData) && likeData.length > 0) {
            const r: any = likeData[0];
            setLikedByPostId((m) => ({ ...m, [postId]: Boolean(r.is_liked) }));
            // Insert-only backend can't store reaction type; keep the optimistic reaction locally.
            setPosts((prev) =>
              prev.map((p) => (p.post_id === postId ? { ...p, likes_count: Number(r.likes_count ?? p.likes_count) } : p))
            );
          }
          return;
        }

        if (toggleErr) throw new Error(toggleErr.message);
      } catch (e: any) {
        // Rollback on error
        setPosts(prevPosts);
        setLikedByPostId(prevLiked);
        setUserReactionByPostId(prevReactions);
        setError(e?.message ? String(e.message) : 'Failed to like post');
      }
    },
    [likedByPostId, likeMode, posts, user, userReactionByPostId]
  );

  const handleClearReaction = useCallback(
    async (postId: string) => {
      if (!user) return;
      if (likeMode !== 'toggle') return;
      const wasLiked = Boolean(likedByPostId[postId]);
      if (!wasLiked) return;

      const prevPosts = posts;
      const prevLiked = likedByPostId;
      const prevReactions = userReactionByPostId;

      try {
        const { data, error } = await supabase.rpc('rpc_post_like_toggle', {
          p_post_id: postId,
          p_profile_id: user.id,
          p_reaction_type: null,
        });

        if (error) throw new Error(error.message);
        if (Array.isArray(data) && data.length > 0) {
          const result: any = data[0];
          setLikedByPostId((m) => ({ ...m, [postId]: Boolean(result.is_liked) }));
          const rt = result.user_reaction ? String(result.user_reaction) : null;
          setUserReactionByPostId((m) => ({
            ...m,
            [postId]: REACTIONS.includes(rt as ReactionType) ? (rt as ReactionType) : null,
          }));
          setPosts((prev) =>
            prev.map((p) => (p.post_id === postId ? { ...p, likes_count: Number(result.likes_count ?? p.likes_count) } : p))
          );
        }
      } catch (e: any) {
        setPosts(prevPosts);
        setLikedByPostId(prevLiked);
        setUserReactionByPostId(prevReactions);
        setError(e?.message ? String(e.message) : 'Failed to update reaction');
      }
    },
    [likeMode, likedByPostId, posts, user, userReactionByPostId]
  );

  const trackFeedPostView = useCallback(async (postId: string) => {
    if (!postId) return;
    if (trackedViewsRef.current.has(postId)) return;
    trackedViewsRef.current.add(postId);

    try {
      const { error: rpcErr } = await supabase.rpc('rpc_track_content_view', {
        p_content_type: 'feed_post',
        p_content_id: postId,
        p_view_source: 'mobile',
        p_view_type: 'viewport',
        p_viewer_fingerprint: null,
      });

      if (rpcErr) {
        console.warn('[feed] view tracking failed', { postId, error: rpcErr.message });
      }
    } catch (e) {
      console.warn('[feed] view tracking exception', { postId, error: e });
    }
  }, []);

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 2000,
  });

  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: Array<{ isViewable?: boolean; item?: FeedPost }> }) => {
      for (const v of viewableItems) {
        if (!v?.isViewable) continue;
        const postId = v?.item?.post_id;
        if (postId) void trackFeedPostView(postId);
      }
    }
  );

  // Fetch reactions for a post
  const fetchPostReactions = useCallback(async (postId: string) => {
    setReactionsModalPostId(postId);
    setReactionsModalLoading(true);
    setReactionsModalData([]);

    try {
      const { data, error: rpcErr } = await supabase.rpc('rpc_get_post_reactions', {
        p_post_id: postId,
        p_limit: 50,
        p_offset: 0,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      setReactionsModalData(
        (data ?? []).map((r: any) => ({
          profile_id: String(r.profile_id),
          username: String(r.username ?? ''),
          display_name: String(r.display_name ?? r.username ?? ''),
          avatar_url: r.avatar_url ? String(r.avatar_url) : null,
          reaction_type: String(r.reaction_type ?? 'love'),
        }))
      );
    } catch (e: any) {
      console.warn('[feed] failed to fetch reactions:', e);
    } finally {
      setReactionsModalLoading(false);
    }
  }, []);

  // Reactions modal component
  const ReactionsModal = useMemo(() => {
    if (!reactionsModalPostId) return null;

    return (
      <Modal
        visible={Boolean(reactionsModalPostId)}
        transparent
        animationType="slide"
        onRequestClose={() => setReactionsModalPostId(null)}
      >
        <Pressable
          style={styles.reactionsModalBackdrop}
          onPress={() => setReactionsModalPostId(null)}
        >
          <View style={styles.reactionsModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.reactionsModalHeader}>
              <Text style={styles.reactionsModalTitle}>Reactions</Text>
              <Pressable onPress={() => setReactionsModalPostId(null)}>
                <Feather name="x" size={20} color={stylesVars.mutedText} />
              </Pressable>
            </View>

            {reactionsModalLoading ? (
              <View style={styles.reactionsModalLoading}>
                <ActivityIndicator size="small" color={stylesVars.primary} />
                <Text style={styles.reactionsModalLoadingText}>Loading...</Text>
              </View>
            ) : reactionsModalData.length === 0 ? (
              <View style={styles.reactionsModalEmpty}>
                <Text style={styles.reactionsModalEmptyText}>No reactions yet</Text>
              </View>
            ) : (
              <FlatList
                data={reactionsModalData}
                keyExtractor={(item) => item.profile_id}
                style={styles.reactionsModalList}
                renderItem={({ item }) => {
                  const avatarUrl = resolvePublicStorageUrl('avatars', item.avatar_url);
                  const emoji = REACTION_EMOJI[item.reaction_type as ReactionType] ?? '❤️';
                  return (
                    <View style={styles.reactionsModalRow}>
                      <View style={styles.reactionsModalAvatar}>
                        {avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            style={styles.reactionsModalAvatarImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.reactionsModalAvatarText}>
                            {(item.display_name || item.username || '?').slice(0, 1).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.reactionsModalUserInfo}>
                        <Text style={styles.reactionsModalDisplayName}>{item.display_name}</Text>
                        <Text style={styles.reactionsModalUsername}>@{item.username}</Text>
                      </View>
                      <Text style={styles.reactionsModalEmoji}>{emoji}</Text>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    );
  }, [reactionsModalPostId, reactionsModalLoading, reactionsModalData]);

  const header = useMemo(() => {
    return (
      <View style={styles.container}>
        {/* Header (web: /feed) */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderTitleRow}>
            <Feather name="rss" size={18} color={stylesVars.primary} />
            <Text style={styles.pageTitle}>Public Feed</Text>
          </View>
          <Text style={styles.pageSubtitle}>Discover posts from the community</Text>
        </View>

        {/* MLL PRO hero (web: components/mll-pro/MllProHero.tsx) */}
        <Card style={styles.proHeroCard}>
          <View style={styles.proHeroRow}>
            <View style={styles.proHeroTextCol}>
              <Text style={styles.proHeroTitle}>
                MLL PRO is where top streamers build real communities.
              </Text>
              <Text style={styles.proHeroBody}>
                Get recognized across the app, featured placement when live, and help grow the
                platform by bringing your community with you. No contracts. No quotas. Just quality
                + intent.
              </Text>
              <View style={styles.proHeroButtonsRow}>
                <Button label="Apply for MLL PRO" variant="primary" />
                <Button label="What is MLL PRO?" variant="outline" />
              </View>
            </View>
            <View style={styles.proBadgePlaceholder} accessibilityLabel="MLL PRO Badge">
              <MaterialCommunityIcons name="shield-star" size={26} color="#FFFFFF" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
        </Card>

        {/* Link or Nah promo (web: components/link/LinkOrNahPromoCard.tsx) */}
        <Card style={styles.linkOrNahCard}>
          <View style={styles.linkOrNahTopRow}>
            <Pressable accessibilityRole="button" style={styles.linkOrNahDismiss}>
              <Feather name="x" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.linkOrNahRow}>
            <View style={styles.linkOrNahIconCol}>
              <View style={styles.linkOrNahSparkleBadge}>
              <MaterialCommunityIcons name={'sparkles' as any} size={14} color="#FFFFFF" />
              </View>
              <View style={styles.linkOrNahIconBox}>
                <MaterialCommunityIcons name="link-variant" size={22} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.linkOrNahTextCol}>
              <Text style={styles.linkOrNahTitle}>Link or Nah</Text>
              <Text style={styles.linkOrNahBody}>Swipe to connect. Mutual links only. No DMs.</Text>
              <View style={styles.linkOrNahCtaRow}>
                <Button label="Try It" variant="primary" iconName="arrow-right" />
                <Text style={styles.linkOrNahMicroCopy}>No messages unless you both link</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Feed composer (mobile placeholder mirroring web copy) */}
        <Card>
          <Text style={styles.cardSectionTitle}>Create a post</Text>

          <View style={styles.composerRow}>
            <View style={styles.composerAvatar}>
              <Text style={styles.composerAvatarText}>✦</Text>
            </View>
            <View style={styles.composerInput}>
              <Text style={styles.composerPlaceholder}>Share something with the community...</Text>
              <Feather name="lock" size={16} color={stylesVars.mutedText} />
            </View>
          </View>

          <Divider />

          <View style={styles.composerActionsRow} accessibilityRole="tablist">
            <View style={styles.composerAction}>
              <Feather name="image" size={18} color={stylesVars.mutedText} />
              <Text style={styles.composerActionText}>Photo</Text>
            </View>
            <View style={styles.composerAction}>
              <Feather name="video" size={18} color={stylesVars.mutedText} />
              <Text style={styles.composerActionText}>Video</Text>
            </View>
            <View style={styles.composerAction}>
              <Feather name="smile" size={18} color={stylesVars.mutedText} />
              <Text style={styles.composerActionText}>Feeling</Text>
            </View>
          </View>

          <View style={styles.comingSoonRow} accessibilityRole="text">
            <View style={styles.comingSoonChip}>
              <MaterialCommunityIcons name={'sparkles' as any} size={14} color={stylesVars.primary} />
              <Text style={styles.comingSoonText}>Post creation coming soon</Text>
            </View>
          </View>
        </Card>

        {error && posts.length === 0 ? (
          <Card>
            <Pressable accessibilityRole="button" onPress={() => fetchFeedPage({ reset: true })}>
              <Text style={styles.inlineErrorTitle}>Couldn’t load feed</Text>
              <Text style={styles.inlineErrorBody}>{error}</Text>
              <Text style={styles.inlineErrorRetry}>Tap to retry</Text>
            </Pressable>
          </Card>
        ) : null}

        {loadingInitial && posts.length === 0 ? (
          <View style={styles.inlineLoadingRow}>
            <ActivityIndicator size="small" color={stylesVars.primary} />
            <Text style={styles.inlineLoadingText}>Loading feed…</Text>
          </View>
        ) : null}
      </View>
    );
  }, [error, fetchFeedPage, loadingInitial, posts.length]);

  const bottomGuard = insets.bottom + 88;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ReactionPickerModal
        visible={Boolean(reactionPickerPostId)}
        currentReaction={reactionPickerPostId ? userReactionByPostId[reactionPickerPostId] ?? null : null}
        onClose={() => setReactionPickerPostId(null)}
        onSelect={(reaction) => {
          const postId = reactionPickerPostId;
          if (!postId) return;
          setReactionPickerPostId(null);
          void handleSetReaction(postId, reaction);
        }}
        onClear={() => {
          const postId = reactionPickerPostId;
          if (!postId) return;
          setReactionPickerPostId(null);
          void handleClearReaction(postId);
        }}
      />
      {ReactionsModal}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.post_id}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomGuard }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        onRefresh={() => fetchFeedPage({ reset: true })}
        refreshing={refreshing}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (loadingMore || loadingInitial) return;
          if (!cursor) return;
          fetchFeedPage({ reset: false });
        }}
        removeClippedSubviews
        windowSize={7}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={stylesVars.primary} />
              <Text style={styles.footerLoadingText}>Loading more…</Text>
            </View>
          ) : error && posts.length > 0 ? (
            <View style={styles.footerError}>
              <Pressable accessibilityRole="button" onPress={() => fetchFeedPage({ reset: false })}>
                <Text style={styles.inlineErrorRetry}>Tap to retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.footerSpacer} />
          )
        }
        viewabilityConfig={viewabilityConfigRef.current}
        onViewableItemsChanged={onViewableItemsChangedRef.current}
        renderItem={({ item }) => (
          <View style={styles.postContainer}>
            <FeedPostCard
              post={item}
              isLiked={Boolean(likedByPostId[item.post_id])}
              userReaction={userReactionByPostId[item.post_id] ?? null}
              mediaAspectRatio={item.media_url ? mediaAspectRatios[item.media_url] ?? null : null}
              onPressProfile={() =>
                navigation.navigate('PublicProfileScreen', {
                  profileId: item.author_profile_id,
                  username: item.author_username,
                })
              }
              onPressComment={() => {
                // No dedicated post comments screen in mobile yet; keep UI intact.
              }}
              onOpenReactionPicker={() => setReactionPickerPostId(item.post_id)}
              onPressReactions={() => fetchPostReactions(item.post_id)}
              onVideoReadyAspectRatio={(ratio) => {
                if (!item.media_url) return;
                setMediaAspectRatios((prev) => (prev[item.media_url!] != null ? prev : { ...prev, [item.media_url!]: ratio }));
              }}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#0F172A',
  mutedText: '#64748B',
  mutedBg: '#F1F5F9',
  primary: '#4F46E5',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  scrollContent: {
    paddingTop: 16,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  // Feed posts go edge-to-edge (no maxWidth), matching Facebook-style mobile behavior
  postContainer: {
    width: '100%',
    paddingHorizontal: 0,
  },
  // Individual feed post wrapper (no card, edge-to-edge media)
  feedPost: {
    backgroundColor: stylesVars.card,
    borderBottomWidth: 1,
    borderBottomColor: stylesVars.border,
    paddingBottom: 10,
    marginBottom: 8,
  },

  pageHeader: {
    marginBottom: 10,
  },
  pageHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: stylesVars.text,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: stylesVars.mutedText,
    marginLeft: 26,
  },

  card: {
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    marginBottom: 14,
  },

  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
    marginVertical: 12,
  },

  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonPrimary: {
    backgroundColor: '#EC4899',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonOutlineText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.9,
  },

  proHeroCard: {
    backgroundColor: '#2E1065',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  proHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  proHeroTextCol: {
    flex: 1,
    gap: 10,
  },
  proHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  proHeroBody: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.82)',
  },
  proHeroButtonsRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 2,
  },
  proBadgePlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  linkOrNahCard: {
    backgroundColor: '#4F46E5',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  linkOrNahTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  linkOrNahDismiss: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkOrNahRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  linkOrNahIconCol: {
    width: 64,
  },
  linkOrNahIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkOrNahSparkleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginLeft: -8,
    marginBottom: -10,
    zIndex: 1,
  },
  linkOrNahTextCol: {
    flex: 1,
    gap: 8,
  },
  linkOrNahTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  linkOrNahBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  linkOrNahCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  linkOrNahMicroCopy: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },

  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: stylesVars.text,
    marginBottom: 10,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: stylesVars.primary,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  composerPlaceholder: {
    flex: 1,
    color: stylesVars.mutedText,
    fontSize: 14,
  },
  composerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  composerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  composerActionText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '700',
  },
  comingSoonRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  comingSoonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
  },
  comingSoonText: {
    fontSize: 12,
    color: stylesVars.text,
    fontWeight: '700',
  },

  mediaContainer: {
    width: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
    marginBottom: 10,
  },
  mediaContainerFallback: {
    height: 300,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaMetaOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaMetaOverlayText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    fontWeight: '800',
    color: stylesVars.mutedText,
  },
  postHeaderTextCol: {
    flex: 1,
    minWidth: 0,
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '800',
    color: stylesVars.text,
  },
  postTimestamp: {
    fontSize: 12,
    color: stylesVars.mutedText,
    marginTop: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBody: {
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    color: stylesVars.text,
  },
  inlineLoadingRow: {
    marginTop: 8,
    marginBottom: 6,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  inlineLoadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: stylesVars.mutedText,
  },
  inlineErrorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: stylesVars.text,
    marginBottom: 6,
  },
  inlineErrorBody: {
    fontSize: 12,
    color: stylesVars.mutedText,
    lineHeight: 18,
  },
  inlineErrorRetry: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
    color: stylesVars.primary,
  },
  footerLoading: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  footerLoadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: stylesVars.mutedText,
  },
  footerError: {
    paddingTop: 6,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpacer: {
    height: 10,
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 10,
    paddingHorizontal: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '700',
  },
  reactionEmojiWrap: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  reactionModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  reactionModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: stylesVars.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    padding: 14,
  },
  reactionModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: stylesVars.text,
    marginBottom: 10,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  reactionChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.mutedBg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionChipSelected: {
    borderColor: stylesVars.primary,
    backgroundColor: '#EEF2FF',
  },
  reactionChipEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  reactionModalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  reactionActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stylesVars.bg,
  },
  reactionActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: stylesVars.text,
  },
  reactionsRow: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactionsText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
  reactionsTextClickable: {
    fontSize: 13,
    color: stylesVars.primary,
    fontWeight: '600',
  },
  // Reactions modal styles
  reactionsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reactionsModalCard: {
    backgroundColor: stylesVars.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  reactionsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: stylesVars.border,
  },
  reactionsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: stylesVars.text,
  },
  reactionsModalLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  reactionsModalLoadingText: {
    fontSize: 14,
    color: stylesVars.mutedText,
  },
  reactionsModalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  reactionsModalEmptyText: {
    fontSize: 14,
    color: stylesVars.mutedText,
  },
  reactionsModalList: {
    maxHeight: 400,
  },
  reactionsModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  reactionsModalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: stylesVars.mutedBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reactionsModalAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  reactionsModalAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: stylesVars.mutedText,
  },
  reactionsModalUserInfo: {
    flex: 1,
  },
  reactionsModalDisplayName: {
    fontSize: 15,
    fontWeight: '600',
    color: stylesVars.text,
  },
  reactionsModalUsername: {
    fontSize: 13,
    color: stylesVars.mutedText,
  },
  reactionsModalEmoji: {
    fontSize: 24,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewsText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
});

