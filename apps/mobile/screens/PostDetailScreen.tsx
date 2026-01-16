import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';
import { brand, darkPalette, lightPalette } from '../theme/colors';
import FeedCommentsModal from '../components/feed/FeedCommentsModal';
import WatchGiftModal from '../components/watch/WatchGiftModal';
import ShareModal from '../components/ShareModal';
import ReportModal from '../components/ReportModal';
import MllProBadge from '../components/shared/MllProBadge';
import TopLeaderBadge from '../components/shared/TopLeaderBadge';
import { useTopLeaders, getLeaderType } from '../hooks/useTopLeaders';

const API_BASE_URL = 'https://www.mylivelinks.com';

type RouteParams = {
  postId: string;
};

type PostData = {
  id: string;
  text_content: string | null;
  media_url: string | null;
  feeling_emoji: string | null;
  feeling_label: string | null;
  created_at: string;
  visibility: string;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_mll_pro: boolean;
  };
  comment_count: number;
  likes_count: number;
  views_count: number;
};

type ReactionType = 'love' | 'haha' | 'wow' | 'sad' | 'fire';
const REACTIONS: ReactionType[] = ['love', 'haha', 'wow', 'sad', 'fire'];
const REACTION_ICONS: Record<ReactionType, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  love: 'heart',
  haha: 'emoticon-happy-outline',
  wow: 'emoticon-excited-outline',
  sad: 'emoticon-cry-outline',
  fire: 'fire',
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getMediaKindFromUrl(url: string): 'image' | 'video' {
  const lower = url.toLowerCase();
  if (/(\.mp4|\.webm|\.mov|\.m4v)(\?|$)/i.test(lower)) return 'video';
  return 'image';
}

function looksLikeHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function resolvePublicStorageUrl(bucket: string, maybeUrlOrPath: string | null | undefined): string | null {
  const raw = String(maybeUrlOrPath ?? '').trim();
  if (!raw) return null;
  if (looksLikeHttpUrl(raw)) return raw;

  const needle = `${bucket}/`;
  const idx = raw.indexOf(needle);
  const path = (idx >= 0 ? raw.slice(idx + needle.length) : raw).replace(/^\/+/, '');
  if (!path) return null;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ? String(data.publicUrl) : null;
}

export default function PostDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { user } = useAuth();
  const { mode, colors } = useTheme();

  const { postId } = route.params || {};

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interaction state
  const [isLiked, setIsLiked] = useState(false);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Modal state
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  const stylesVars = useMemo(() => ({
    bg: colors.bg,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
    mutedText: (colors as any).subtleText ?? colors.mutedText,
    mutedBg: mode === 'dark' ? darkPalette.slate800 : lightPalette.slate100,
    primary: (brand as any).primary ?? brand.pink,
    onPrimary: mode === 'dark' ? darkPalette.slate100 : lightPalette.white,
  }), [colors, mode]);

  const styles = useMemo(() => createStyles(stylesVars), [stylesVars]);

  const loadPost = useCallback(async () => {
    if (!postId) {
      setError('No post ID provided');
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/post/${postId}`, { headers });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Post not found');
        }
        throw new Error('Failed to load post');
      }

      const data = await response.json();
      setPost(data);
      setLikesCount(data.likes_count || 0);
      setError(null);

      // Check if user has liked this post
      if (user?.id) {
        const { data: likeData } = await supabase
          .from('post_likes')
          .select('reaction_type')
          .eq('post_id', postId)
          .eq('profile_id', user.id)
          .maybeSingle();

        if (likeData) {
          setIsLiked(true);
          setUserReaction(likeData.reaction_type as ReactionType || 'love');
        }
      }

      // Track view
      await supabase.rpc('rpc_track_content_view', {
        p_content_type: 'feed_post',
        p_content_id: postId,
        p_view_source: 'mobile',
        p_view_type: 'page_load',
        p_referral_source: 'shared_link',
      }).catch(() => {});

    } catch (err: any) {
      console.error('[PostDetailScreen] Load error:', err);
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId, user?.id]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPost();
  }, [loadPost]);

  const handleLike = useCallback(async (reactionType: ReactionType = 'love') => {
    if (!user?.id || !postId) return;

    const wasLiked = isLiked;
    const prevReaction = userReaction;
    const prevCount = likesCount;

    // Optimistic update
    if (wasLiked && reactionType === prevReaction) {
      setIsLiked(false);
      setUserReaction(null);
      setLikesCount(prev => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setUserReaction(reactionType);
      if (!wasLiked) setLikesCount(prev => prev + 1);
    }
    setShowReactionPicker(false);

    try {
      if (wasLiked && reactionType === prevReaction) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('profile_id', user.id);
      } else {
        await supabase.from('post_likes').upsert({
          post_id: postId,
          profile_id: user.id,
          reaction_type: reactionType,
        }, { onConflict: 'post_id,profile_id' });
      }
    } catch (err) {
      // Revert on error
      setIsLiked(wasLiked);
      setUserReaction(prevReaction);
      setLikesCount(prevCount);
    }
  }, [user?.id, postId, isLiked, userReaction, likesCount]);

  const handleDelete = useCallback(async () => {
    if (!user?.id || !post) return;
    if (post.author.id !== user.id) return;

    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error: deleteErr } = await supabase
              .from('posts')
              .delete()
              .eq('id', postId)
              .eq('author_id', user.id);

            if (deleteErr) throw new Error(deleteErr.message);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete post');
          }
        },
      },
    ]);
  }, [user?.id, post, postId, navigation]);

  const navigateToProfile = useCallback(() => {
    if (!post?.author) return;
    navigation.navigate('ProfileViewScreen', {
      profileId: post.author.id,
      username: post.author.username,
    });
  }, [post, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={stylesVars.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={stylesVars.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={stylesVars.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={stylesVars.mutedText} />
          <Text style={styles.errorText}>{error || 'Post not found'}</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const avatarUrl = resolvePublicStorageUrl('avatars', post.author.avatar_url);
  const mediaUrl = resolvePublicStorageUrl('post-media', post.media_url);
  const mediaKind = mediaUrl ? getMediaKindFromUrl(mediaUrl) : null;
  const isOwnPost = user?.id === post.author.id;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={stylesVars.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
        <Pressable onPress={() => setShowOverflowMenu(true)} style={styles.menuButton}>
          <Feather name="more-horizontal" size={24} color={stylesVars.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={stylesVars.primary} />
        }
      >
        {/* Post Card */}
        <View style={styles.postCard}>
          {/* Author Header */}
          <Pressable onPress={navigateToProfile} style={styles.authorRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {(post.author.display_name || post.author.username || '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.authorInfo}>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName}>{post.author.display_name || post.author.username}</Text>
                {post.author.is_mll_pro && <MllProBadge size="sm" />}
                <PostLeaderBadge profileId={post.author.id} />
                {post.feeling_emoji && post.feeling_label && (
                  <Text style={styles.feelingText}>
                    {' '}is feeling {post.feeling_emoji} {post.feeling_label}
                  </Text>
                )}
              </View>
              <Text style={styles.timestamp}>@{post.author.username} · {formatTimestamp(post.created_at)}</Text>
            </View>
          </Pressable>

          {/* Content */}
          {post.text_content ? (
            <Text style={styles.textContent}>{post.text_content}</Text>
          ) : null}

          {/* Media */}
          {mediaUrl && mediaKind === 'image' && (
            <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
          )}
          {mediaUrl && mediaKind === 'video' && (
            <Video
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.COVER}
              useNativeControls
              shouldPlay={false}
            />
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <Text style={styles.statText}>{likesCount} reactions</Text>
            <Text style={styles.statText}>{post.comment_count} comments</Text>
            <Text style={styles.statText}>{post.views_count.toLocaleString()} views</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleLike(userReaction || 'love')}
              onLongPress={() => setShowReactionPicker(true)}
            >
              {userReaction ? (
                <MaterialCommunityIcons
                  name={REACTION_ICONS[userReaction]}
                  size={20}
                  color={stylesVars.primary}
                />
              ) : (
                <Feather name="heart" size={20} color={isLiked ? stylesVars.primary : stylesVars.mutedText} />
              )}
              <Text style={[styles.actionText, isLiked && { color: stylesVars.primary }]}>Like</Text>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={() => setShowCommentsModal(true)}>
              <Feather name="message-circle" size={20} color={stylesVars.mutedText} />
              <Text style={styles.actionText}>Comment</Text>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={() => setShowGiftModal(true)}>
              <Feather name="gift" size={20} color="#A855F7" />
              <Text style={[styles.actionText, { color: '#A855F7' }]}>Gift</Text>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={() => setShowShareModal(true)}>
              <Feather name="share" size={20} color={stylesVars.mutedText} />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Reaction Picker */}
      {showReactionPicker && (
        <Pressable style={styles.reactionPickerOverlay} onPress={() => setShowReactionPicker(false)}>
          <View style={styles.reactionPicker}>
            {REACTIONS.map((r) => (
              <Pressable key={r} onPress={() => handleLike(r)} style={styles.reactionOption}>
                <MaterialCommunityIcons
                  name={REACTION_ICONS[r]}
                  size={28}
                  color={userReaction === r ? stylesVars.primary : stylesVars.text}
                />
              </Pressable>
            ))}
          </View>
        </Pressable>
      )}

      {/* Overflow Menu */}
      {showOverflowMenu && (
        <Pressable style={styles.menuOverlay} onPress={() => setShowOverflowMenu(false)}>
          <View style={styles.menuContainer}>
            {isOwnPost && (
              <Pressable style={styles.menuItem} onPress={() => { setShowOverflowMenu(false); handleDelete(); }}>
                <Feather name="trash-2" size={20} color="#EF4444" />
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete Post</Text>
              </Pressable>
            )}
            {!isOwnPost && (
              <Pressable style={styles.menuItem} onPress={() => { setShowOverflowMenu(false); setShowReportModal(true); }}>
                <Feather name="flag" size={20} color="#EF4444" />
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Report Post</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      )}

      {/* Modals */}
      <FeedCommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        postId={postId}
        authorUsername={post.author.username}
      />

      <WatchGiftModal
        visible={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        recipientId={post.author.id}
        recipientUsername={post.author.username}
        recipientDisplayName={post.author.display_name || post.author.username}
        recipientAvatarUrl={post.author.avatar_url}
        postId={postId}
      />

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={`https://www.mylivelinks.com/post/${postId}`}
        shareText={post.text_content || `Check out this post by @${post.author.username}`}
        shareThumbnail={mediaUrl || avatarUrl}
        shareContentType="photo"
      />

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType="post"
        reportedPostId={postId}
        reportedUserId={post.author.id}
      />
    </SafeAreaView>
  );
}

function createStyles(vars: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: vars.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: vars.border,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: vars.text,
    },
    menuButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      fontSize: 16,
      color: vars.mutedText,
      marginTop: 16,
      textAlign: 'center',
    },
    errorButton: {
      marginTop: 24,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: vars.primary,
      borderRadius: 8,
    },
    errorButtonText: {
      color: vars.onPrimary,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    postCard: {
      backgroundColor: vars.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: vars.border,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    avatarPlaceholder: {
      backgroundColor: vars.mutedBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      fontSize: 20,
      fontWeight: '700',
      color: vars.mutedText,
    },
    authorInfo: {
      flex: 1,
      marginLeft: 12,
    },
    authorNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    authorName: {
      fontSize: 16,
      fontWeight: '700',
      color: vars.text,
    },
    feelingText: {
      fontSize: 14,
      color: vars.mutedText,
    },
    timestamp: {
      fontSize: 13,
      color: vars.mutedText,
      marginTop: 2,
    },
    textContent: {
      fontSize: 16,
      color: vars.text,
      lineHeight: 22,
      marginBottom: 12,
    },
    media: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 12,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: vars.border,
    },
    statText: {
      fontSize: 13,
      color: vars.mutedText,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: vars.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '600',
      color: vars.mutedText,
    },
    reactionPickerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    reactionPicker: {
      flexDirection: 'row',
      backgroundColor: vars.card,
      borderRadius: 24,
      padding: 12,
      gap: 16,
    },
    reactionOption: {
      padding: 8,
    },
    menuOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    menuContainer: {
      backgroundColor: vars.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingVertical: 16,
      paddingBottom: 32,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    menuItemText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
}

function PostLeaderBadge({ profileId }: { profileId?: string }) {
  const leaders = useTopLeaders();
  const leaderType = getLeaderType(profileId, leaders);
  if (!leaderType) return null;
  return <TopLeaderBadge type={leaderType} size="sm" />;
}
