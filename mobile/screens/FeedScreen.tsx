import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';

import { Button, Input, PageShell, PageHeader, Modal } from '../components/ui';
import { useFeed, type FeedPost } from '../hooks/useFeed';
import type { MainTabsParamList } from '../types/navigation';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getAvatarSource } from '../lib/defaultAvatar';
import { PHOTO_FILTER_PRESETS, type PhotoFilterId } from '../lib/photoFilters';
import { Cool, Grayscale, Sepia, Warm, Contrast as ContrastFilter, cleanExtractedImagesCache } from 'react-native-image-filter-kit';

type Props = BottomTabScreenProps<MainTabsParamList, 'Feed'>;

type GiftType = {
  id: number;
  name: string;
  coin_cost: number;
  emoji?: string;
};

type FeedComment = {
  id: string;
  post_id: string;
  text_content: string;
  created_at: string;
  like_count: number;
  is_liked: boolean;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
};

export function FeedScreen({ navigation }: Props) {
  const { posts, nextCursor, isLoading, error, refresh, loadMore } = useFeed();
  const { fetchAuthed } = useFetchAuthed();
  const { user } = useAuthContext();
  const [composerText, setComposerText] = useState('');
  const [composerLoading, setComposerLoading] = useState(false);
  const composerInFlightRef = useRef(false);
  const [mediaLocalUri, setMediaLocalUri] = useState<string | null>(null);
  const [mediaMimeType, setMediaMimeType] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [pendingPhotoMime, setPendingPhotoMime] = useState<string | null>(null);
  const [selectedFilterId, setSelectedFilterId] = useState<PhotoFilterId>('original');
  const [extractEnabled, setExtractEnabled] = useState(false);
  const pendingResolveRef = useRef<((uri: string) => void) | null>(null);
  const pendingRejectRef = useRef<((err: Error) => void) | null>(null);

  // Gift Modal State
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [giftTargetPost, setGiftTargetPost] = useState<FeedPost | null>(null);
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [giftSubmitting, setGiftSubmitting] = useState(false);

  // Comments State
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, FeedComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [commentLikeLoading, setCommentLikeLoading] = useState<Record<string, boolean>>({});

  const canPost = (composerText.trim().length > 0 || !!mediaUrl) && !composerLoading && !mediaUploading;
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Load gift types on mount
  const loadGiftTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gift_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (!error && data) {
        setGiftTypes(data);
      }
    } catch (e) {
      console.error('[Feed] Failed to load gift types:', e);
    }
  }, []);

  useEffect(() => {
    void loadGiftTypes();
  }, [loadGiftTypes]);

  const uploadPostMedia = useCallback(
    async (uri: string, mime: string | null): Promise<string> => {
      const profileId = user?.id;
      if (!profileId) {
        throw new Error('Not signed in');
      }

      const extFromMime = mime?.includes('/') ? mime.split('/')[1] : null;
      const ext = String(extFromMime || 'jpg')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 8);
      const filePath = `${profileId}/feed/${Date.now()}.${ext || 'jpg'}`;

      const blob = await fetch(uri).then((r) => r.blob());
      const { error: uploadError } = await supabase.storage.from('post-media').upload(filePath, blob, {
        contentType: mime || undefined,
        upsert: false,
      });
      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        throw new Error('Failed to get media URL');
      }
      return publicUrl;
    },
    [user?.id]
  );

  const pickMedia = useCallback(
    async (kind: 'photo' | 'video') => {
      try {
        if (
          typeof ImagePicker.requestMediaLibraryPermissionsAsync !== 'function' ||
          typeof ImagePicker.launchImageLibraryAsync !== 'function'
        ) {
          console.log('[Feed] pickMedia error: expo-image-picker unavailable');
          Alert.alert('Upload unavailable', 'Media picker is not available on this device.');
          return;
        }

        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm?.granted) {
          Alert.alert('Permission required', 'Please allow photo library access.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            kind === 'photo'
              ? ImagePicker.MediaTypeOptions.Images
              : ImagePicker.MediaTypeOptions.Videos,
          quality: 0.9,
          allowsEditing: false,
        });

        if (!result || result.canceled) return;
        const asset = Array.isArray(result?.assets) ? result.assets[0] : null;
        const uri = typeof asset?.uri === 'string' ? asset.uri : null;
        if (!uri) return;

        const mime = typeof asset?.mimeType === 'string' ? asset.mimeType : null;

        if (kind === 'photo') {
          setPendingPhotoUri(uri);
          setPendingPhotoMime(mime);
          setSelectedFilterId('original');
          setFilterModalVisible(true);
          return;
        }

        setMediaLocalUri(uri);
        setMediaMimeType(mime);

        setMediaUploading(true);
        try {
          const uploadedUrl = await uploadPostMedia(uri, mime);
          setMediaUrl(uploadedUrl);
        } finally {
          setMediaUploading(false);
        }
      } catch (e: any) {
        const message = String(e?.message || e || 'Failed to open media picker');
        console.log('[Feed] pickMedia error:', message);
        Alert.alert('Upload failed', message);
      }
    },
    [uploadPostMedia]
  );

  const exportFilteredPhotoUri = useCallback(
    async (uri: string, filterId: PhotoFilterId): Promise<string> => {
      if (filterId === 'original') return uri;

      return new Promise<string>((resolve, reject) => {
        pendingResolveRef.current = resolve;
        pendingRejectRef.current = reject;
        setExtractEnabled(true);
      });
    },
    []
  );

  const onExtracted = useCallback(
    (nextUri: string) => {
      try {
        setExtractEnabled(false);
        const resolve = pendingResolveRef.current;
        pendingResolveRef.current = null;
        pendingRejectRef.current = null;
        if (resolve) resolve(nextUri);
      } catch (e) {
        console.error('[Feed] onExtracted error:', e);
      }
    },
    []
  );

  const onExtractError = useCallback((message: string) => {
    setExtractEnabled(false);
    const reject = pendingRejectRef.current;
    pendingResolveRef.current = null;
    pendingRejectRef.current = null;
    if (reject) reject(new Error(message));
  }, []);

  const attachFilteredPhoto = useCallback(async () => {
    const uri = pendingPhotoUri;
    if (!uri) {
      setFilterModalVisible(false);
      return;
    }
    const mime = pendingPhotoMime;

    setMediaUploading(true);
    try {
      let uriToUpload = uri;
      try {
        uriToUpload = await exportFilteredPhotoUri(uri, selectedFilterId);
      } catch (e: any) {
        throw new Error(String(e?.message || e || 'Failed to export filtered photo'));
      }

      setMediaLocalUri(uriToUpload);
      setMediaMimeType(mime || 'image/jpeg');

      const uploadedUrl = await uploadPostMedia(uriToUpload, mime || 'image/jpeg');
      setMediaUrl(uploadedUrl);
      setFilterModalVisible(false);

      try {
        cleanExtractedImagesCache();
      } catch {
        // ignore
      }
    } finally {
      setMediaUploading(false);
      setPendingPhotoUri(null);
      setPendingPhotoMime(null);
      setExtractEnabled(false);
    }
  }, [exportFilteredPhotoUri, pendingPhotoMime, pendingPhotoUri, selectedFilterId, uploadPostMedia]);

  const openGiftModal = useCallback((post: FeedPost) => {
    setGiftTargetPost(post);
    setSelectedGift(null);
    setGiftModalVisible(true);
  }, []);

  const sendGift = useCallback(async () => {
    if (!selectedGift || !giftTargetPost) return;

    setGiftSubmitting(true);
    try {
      const requestId = crypto.randomUUID();
      
      const res = await fetchAuthed('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: giftTargetPost.author.id,
          coinsAmount: selectedGift.coin_cost,
          giftTypeId: selectedGift.id,
          requestId,
        }),
      });

      if (!res.ok) {
        Alert.alert('Error', res.message || 'Failed to send gift');
        return;
      }

      Alert.alert('Success', `Sent ${selectedGift.name} to ${giftTargetPost.author.username}!`);
      setGiftModalVisible(false);
      setGiftTargetPost(null);
      setSelectedGift(null);
      
      // Refresh feed to show updated coin count
      await refresh();
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e || 'Failed to send gift'));
    } finally {
      setGiftSubmitting(false);
    }
  }, [selectedGift, giftTargetPost, fetchAuthed, refresh]);

  const toggleComments = useCallback(
    async (postId: string) => {
      setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));

      const alreadyLoaded = Array.isArray(commentsByPost[postId]);
      if (alreadyLoaded) return;

      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await fetchAuthed(`/api/posts/${encodeURIComponent(postId)}/comments?limit=10`);

        if (!res.ok) {
          Alert.alert('Error', res.message || 'Failed to load comments');
          return;
        }

        const rows = (res.data?.comments ?? []) as FeedComment[];
        setCommentsByPost((prev) => ({ ...prev, [postId]: rows }));
      } catch (err: any) {
        Alert.alert('Error', String(err?.message || err || 'Failed to load comments'));
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
      }
    },
    [commentsByPost, fetchAuthed]
  );

  const submitComment = useCallback(
    async (postId: string) => {
      const text = String(commentDrafts[postId] || '').trim();
      if (!text) return;

      setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await fetchAuthed(`/api/posts/${encodeURIComponent(postId)}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text_content: text }),
        });

        if (!res.ok) {
          Alert.alert('Error', res.message || 'Failed to create comment');
          return;
        }

        setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));

        // Reload comments
        await toggleComments(postId);
        if (!expandedComments[postId]) {
          setExpandedComments((prev) => ({ ...prev, [postId]: true }));
        }
      } catch (err: any) {
        Alert.alert('Error', String(err?.message || err || 'Failed to create comment'));
      } finally {
        setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
      }
    },
    [commentDrafts, fetchAuthed, toggleComments, expandedComments]
  );

  const toggleCommentLike = useCallback(
    async (commentId: string, postId: string, currentlyLiked: boolean) => {
      if (!user) {
        Alert.alert('Login Required', 'Please log in to like comments.');
        return;
      }

      setCommentLikeLoading((prev) => ({ ...prev, [commentId]: true }));
      try {
        const method = currentlyLiked ? 'DELETE' : 'POST';
        const res = await fetchAuthed(`/api/comments/${encodeURIComponent(commentId)}/like`, {
          method,
        });

        if (!res.ok && res.status !== 409) {
          Alert.alert('Error', res.message || 'Failed to update like');
          return;
        }

        // Optimistically update the UI
        setCommentsByPost((prev) => {
          const comments = prev[postId] || [];
          const updated = comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  is_liked: !currentlyLiked,
                  like_count: currentlyLiked ? Math.max(0, c.like_count - 1) : c.like_count + 1,
                }
              : c
          );
          return { ...prev, [postId]: updated };
        });
      } catch (err: any) {
        Alert.alert('Error', String(err?.message || err || 'Failed to update like'));
      } finally {
        setCommentLikeLoading((prev) => ({ ...prev, [commentId]: false }));
      }
    },
    [user, fetchAuthed]
  );

  const formatDateTime = useCallback((value: string) => {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const day = d.getDate();
      
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
      
      return `${month} ${day} • ${hours}:${minutesStr} ${ampm}`;
    } catch {
      return value;
    }
  }, []);

  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => {
      const avatarUri = resolveMediaUrl(item.author?.avatar_url ?? null);
      const mediaUri = resolveMediaUrl(item.media_url ?? null);
      const isExpanded = !!expandedComments[item.id];
      const comments = commentsByPost[item.id] || [];
      const isCommentsLoading = !!commentsLoading[item.id];
      
      return (
        <View>
          <View style={styles.postCard}>
            {/* New Header: Avatar + Username + Date/Time */}
            <Pressable
              style={styles.postHeader}
              onPress={() => {
                const username = item.author?.username;
                if (username) {
                  navigation.navigate('Profile', { username });
                }
              }}
            >
              <Image source={getAvatarSource(avatarUri)} style={styles.avatarImage} />
              <View style={styles.postMeta}>
                <Text style={styles.authorBold} numberOfLines={1}>
                  {item.author?.username || 'Unknown'}
                </Text>
                <Text style={styles.timestamp} numberOfLines={1}>
                  {formatDateTime(item.created_at)}
                </Text>
              </View>
            </Pressable>

            {!!item.text_content && (
              <Text style={styles.contentText}>{String(item.text_content)}</Text>
            )}

            {!!mediaUri && (
              <View style={styles.mediaWrap}>
                <Image source={{ uri: mediaUri }} style={styles.mediaImage} resizeMode="cover" />
              </View>
            )}

            {/* New Engagement Bar: Like | Gift | Coin Count | Comments */}
            <View style={styles.engagementBar}>
              <Pressable style={styles.engagementButton}>
                <Text style={styles.engagementIcon}>♡</Text>
                <Text style={styles.engagementLabel}>Like</Text>
              </Pressable>

              <Pressable 
                style={styles.engagementButton}
                onPress={() => openGiftModal(item)}
              >
                <Text style={styles.giftIcon}>🎁</Text>
                <Text style={styles.giftLabel}>Gift</Text>
              </Pressable>

              {(item.gift_total_coins ?? 0) > 0 && (
                <View style={styles.coinCount}>
                  <Text style={styles.coinIcon}>🪙</Text>
                  <Text style={styles.coinText}>{item.gift_total_coins ?? 0}</Text>
                </View>
              )}

              <Pressable 
                style={styles.engagementButton}
                onPress={() => void toggleComments(item.id)}
              >
                <Text style={styles.engagementIcon}>💬</Text>
                <Text style={styles.engagementLabel}>Comment</Text>
              </Pressable>
            </View>
          </View>

          {/* Comments Section */}
          {isExpanded && (
            <View style={styles.commentsSection}>
              {isCommentsLoading ? (
                <Text style={styles.commentsLoadingText}>Loading comments...</Text>
              ) : (
                <>
                  {comments.map((c) => (
                    <View key={c.id} style={styles.commentItem}>
                      {/* Comment Avatar */}
                      <Pressable
                        onPress={() => {
                          if (c.author.username) {
                            navigation.navigate('Profile', { username: c.author.username });
                          }
                        }}
                      >
                        <Image 
                          source={getAvatarSource(resolveMediaUrl(c.author.avatar_url))} 
                          style={styles.commentAvatar}
                        />
                      </Pressable>

                      {/* Comment Content */}
                      <View style={styles.commentContent}>
                        <Pressable
                          onPress={() => {
                            if (c.author.username) {
                              navigation.navigate('Profile', { username: c.author.username });
                            }
                          }}
                        >
                          <Text style={styles.commentUsername}>{c.author.username}</Text>
                        </Pressable>
                        <Text style={styles.commentTimestamp}>{formatDateTime(c.created_at)}</Text>
                        <Text style={styles.commentText}>{c.text_content}</Text>
                      </View>

                      {/* Comment Like Button */}
                      <View style={styles.commentLikeContainer}>
                        {c.like_count > 0 && (
                          <Text style={styles.commentLikeCount}>{c.like_count}</Text>
                        )}
                        <Pressable
                          onPress={() => void toggleCommentLike(c.id, item.id, c.is_liked)}
                          disabled={!!commentLikeLoading[c.id]}
                          style={[
                            styles.commentLikeButton,
                            commentLikeLoading[c.id] && styles.commentLikeButtonDisabled,
                          ]}
                        >
                          <Text style={[styles.commentLikeIcon, c.is_liked && styles.commentLikeIconActive]}>
                            {c.is_liked ? '♥' : '♡'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}

                  {/* Comment Input */}
                  <View style={styles.commentInputContainer}>
                    <Input
                      placeholder="Write a comment..."
                      value={commentDrafts[item.id] || ''}
                      onChangeText={(text) => setCommentDrafts((prev) => ({ ...prev, [item.id]: text }))}
                      style={styles.commentInput}
                      multiline
                    />
                    <Button
                      title={commentSubmitting[item.id] ? 'Posting...' : 'Post'}
                      onPress={() => void submitComment(item.id)}
                      disabled={!!commentSubmitting[item.id] || !String(commentDrafts[item.id] || '').trim()}
                      loading={!!commentSubmitting[item.id]}
                      style={styles.commentSubmitButton}
                    />
                  </View>
                </>
              )}
            </View>
          )}
        </View>
      );
    },
    [
      expandedComments,
      commentsByPost,
      commentsLoading,
      commentDrafts,
      commentSubmitting,
      commentLikeLoading,
      formatDateTime,
      navigation,
      styles,
      openGiftModal,
      toggleComments,
      toggleCommentLike,
      submitComment,
    ]
  );

  const renderComposer = useMemo(() => {
    return (
      <View style={styles.composerCard}>
        <Input
          placeholder="What's happening?"
          value={composerText}
          onChangeText={setComposerText}
          multiline
          style={styles.composerInput}
        />

        <View style={styles.mediaActionsRow}>
          <Pressable
            onPress={() => void pickMedia('photo')}
            disabled={composerLoading || mediaUploading}
            style={({ pressed }) => [
              styles.mediaActionButton,
              pressed && !(composerLoading || mediaUploading) ? styles.mediaActionButtonPressed : null,
            ]}
          >
            <Text style={styles.mediaActionIcon}>📷</Text>
            <Text style={styles.mediaActionText}>Photo</Text>
          </Pressable>

          <Pressable
            onPress={() => void pickMedia('video')}
            disabled={composerLoading || mediaUploading}
            style={({ pressed }) => [
              styles.mediaActionButton,
              pressed && !(composerLoading || mediaUploading) ? styles.mediaActionButtonPressed : null,
            ]}
          >
            <Text style={styles.mediaActionIcon}>🎥</Text>
            <Text style={styles.mediaActionText}>Video</Text>
          </Pressable>

          {(mediaUploading || mediaUrl) && (
            <View style={styles.mediaStatusPill}>
              <Text style={styles.mediaStatusText}>{mediaUploading ? 'Uploading…' : 'Attached'}</Text>
            </View>
          )}
        </View>

        {!!mediaLocalUri && !mediaMimeType?.startsWith('video/') && (
          <View style={styles.composerPreviewWrap}>
            <Image source={{ uri: mediaLocalUri }} style={styles.composerPreviewImage} resizeMode="cover" />
            <Pressable
              onPress={() => {
                setMediaLocalUri(null);
                setMediaMimeType(null);
                setMediaUrl(null);
              }}
              style={({ pressed }) => [styles.removeMediaButton, pressed ? styles.removeMediaButtonPressed : null]}
            >
              <Text style={styles.removeMediaText}>Remove</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.composerActions}>
          <Button
            title={composerLoading ? 'Posting…' : 'Post'}
            onPress={() => {
              void (async () => {
                const text = composerText.trim();
                if ((!text && !mediaUrl) || composerLoading || mediaUploading) return;
                if (composerInFlightRef.current) return;
                composerInFlightRef.current = true;
                setComposerLoading(true);
                try {
                  const res = await fetchAuthed('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text_content: text, media_url: mediaUrl }),
                  });
                  if (!res.ok) {
                    console.error('[Feed] create post failed:', res.message);
                    return;
                  }
                  setComposerText('');
                  setMediaLocalUri(null);
                  setMediaMimeType(null);
                  setMediaUrl(null);
                  await refresh();
                } finally {
                  setComposerLoading(false);
                  composerInFlightRef.current = false;
                }
              })();
            }}
            disabled={!canPost}
            loading={composerLoading}
            style={styles.postButton}
          />
        </View>

        <Modal
          visible={filterModalVisible}
          onRequestClose={() => {
            if (mediaUploading) return;
            setFilterModalVisible(false);
            setPendingPhotoUri(null);
            setPendingPhotoMime(null);
            setSelectedFilterId('original');
            setExtractEnabled(false);
          }}
        >
          <View style={styles.filterModalContent}>
            <Text style={styles.filterTitle}>Filters</Text>

            {!!pendingPhotoUri && (
              <View style={styles.filterPreviewWrap}>
                {selectedFilterId === 'original' ? (
                  <Image source={{ uri: pendingPhotoUri }} style={styles.filterPreviewImage} resizeMode="cover" />
                ) : selectedFilterId === 'bw' ? (
                  <Grayscale
                    image={<Image source={{ uri: pendingPhotoUri }} style={styles.filterPreviewImage} resizeMode="cover" />}
                    extractImageEnabled={extractEnabled}
                    onExtractImage={(ev: { nativeEvent: { uri: string } }) => onExtracted(ev.nativeEvent.uri)}
                    onFilteringError={(ev: { nativeEvent: { message: string } }) => onExtractError(ev.nativeEvent.message)}
                  />
                ) : selectedFilterId === 'sepia' ? (
                  <Sepia
                    image={<Image source={{ uri: pendingPhotoUri }} style={styles.filterPreviewImage} resizeMode="cover" />}
                    extractImageEnabled={extractEnabled}
                    onExtractImage={(ev: { nativeEvent: { uri: string } }) => onExtracted(ev.nativeEvent.uri)}
                    onFilteringError={(ev: { nativeEvent: { message: string } }) => onExtractError(ev.nativeEvent.message)}
                  />
                ) : selectedFilterId === 'cool' ? (
                  <Cool
                    image={<Image source={{ uri: pendingPhotoUri }} style={styles.filterPreviewImage} resizeMode="cover" />}
                    extractImageEnabled={extractEnabled}
                    onExtractImage={(ev: { nativeEvent: { uri: string } }) => onExtracted(ev.nativeEvent.uri)}
                    onFilteringError={(ev: { nativeEvent: { message: string } }) => onExtractError(ev.nativeEvent.message)}
                  />
                ) : selectedFilterId === 'warm' ? (
                  <Warm
                    image={<Image source={{ uri: pendingPhotoUri }} style={styles.filterPreviewImage} resizeMode="cover" />}
                    extractImageEnabled={extractEnabled}
                    onExtractImage={(ev: { nativeEvent: { uri: string } }) => onExtracted(ev.nativeEvent.uri)}
                    onFilteringError={(ev: { nativeEvent: { message: string } }) => onExtractError(ev.nativeEvent.message)}
                  />
                ) : (
                  <ContrastFilter
                    amount={1.2}
                    image={<Image source={{ uri: pendingPhotoUri }} style={styles.filterPreviewImage} resizeMode="cover" />}
                    extractImageEnabled={extractEnabled}
                    onExtractImage={(ev: { nativeEvent: { uri: string } }) => onExtracted(ev.nativeEvent.uri)}
                    onFilteringError={(ev: { nativeEvent: { message: string } }) => onExtractError(ev.nativeEvent.message)}
                  />
                )}
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {PHOTO_FILTER_PRESETS.map((preset) => {
                const selected = preset.id === selectedFilterId;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => {
                      if (mediaUploading) return;
                      setSelectedFilterId(preset.id);
                    }}
                    style={[styles.filterPill, selected ? styles.filterPillSelected : null]}
                  >
                    <Text style={[styles.filterPillText, selected ? styles.filterPillTextSelected : null]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.filterActions}>
              <Pressable
                onPress={() => {
                  if (mediaUploading) return;
                  setFilterModalVisible(false);
                  setPendingPhotoUri(null);
                  setPendingPhotoMime(null);
                  setSelectedFilterId('original');
                  setExtractEnabled(false);
                }}
                style={({ pressed }) => [styles.filterActionButton, pressed ? styles.filterActionButtonPressed : null]}
              >
                <Text style={styles.filterActionText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (mediaUploading) return;
                  void attachFilteredPhoto();
                }}
                style={({ pressed }) => [styles.filterActionPrimary, pressed ? styles.filterActionButtonPressed : null]}
              >
                <Text style={styles.filterActionPrimaryText}>{mediaUploading ? 'Attaching…' : 'Attach'}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }, [attachFilteredPhoto, canPost, composerLoading, composerText, extractEnabled, fetchAuthed, filterModalVisible, mediaLocalUri, mediaMimeType, mediaUploading, mediaUrl, onExtractError, onExtracted, pendingPhotoUri, pickMedia, refresh, selectedFilterId, styles]);

  const keyExtractor = useCallback((item: FeedPost) => item.id, []);

  const onEndReached = useCallback(() => {
    if (isLoading) return;
    if (!nextCursor) return;
    void loadMore();
  }, [isLoading, loadMore, nextCursor]);

  return (
    <PageShell 
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={() => navigation.navigate('Home')}
      onNavigateToProfile={(username) => {
        navigation.navigate('Profile', { username });
      }}
      onNavigateToRooms={() => navigation.getParent?.()?.navigate?.('Rooms')}
    >
      {/* Page Header: Activity icon + Feed */}
      <PageHeader icon="activity" iconColor="#ec4899" title="Feed" />

      <FlatList
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={renderComposer}
        ListEmptyComponent={
          error ? (
            <View style={styles.stateContainer}>
              <Text style={styles.stateTitle}>Something went wrong</Text>
              <Text style={styles.stateSubtitle}>{error}</Text>
              <Button title="Retry" onPress={() => void refresh()} style={styles.stateButton} />
            </View>
          ) : isLoading ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color="#5E9BFF" />
            </View>
          ) : (
            <View style={styles.stateContainer}>
              <Text style={styles.stateTitle}>No posts yet</Text>
              <Text style={styles.stateSubtitle}>When posts are shared, they’ll appear here.</Text>
              <Button title="Refresh" onPress={() => void refresh()} style={styles.stateButton} />
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading && posts.length === 0}
            onRefresh={() => void refresh()}
            tintColor="#5E9BFF"
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          isLoading && posts.length > 0 ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color="#5E9BFF" />
            </View>
          ) : nextCursor ? (
            <Pressable style={styles.loadMoreButton} onPress={() => void loadMore()}>
              <Text style={styles.loadMoreText}>Load more</Text>
            </Pressable>
          ) : (
            <View style={styles.footerSpacer} />
          )
        }
      />
      
      {/* Gift Modal */}
      <Modal
        visible={giftModalVisible}
        onRequestClose={() => {
          if (giftSubmitting) return;
          setGiftModalVisible(false);
          setGiftTargetPost(null);
          setSelectedGift(null);
        }}
      >
        <View style={styles.giftModalContent}>
          <Text style={styles.giftModalTitle}>
            Send Gift to {giftTargetPost?.author?.username || 'User'}
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.giftGrid}
          >
            {giftTypes.map((gift) => {
              const isSelected = selectedGift?.id === gift.id;
              return (
                <Pressable
                  key={gift.id}
                  onPress={() => setSelectedGift(gift)}
                  style={[
                    styles.giftItem,
                    isSelected ? styles.giftItemSelected : null,
                  ]}
                >
                  <Text style={styles.giftEmoji}>{gift.emoji || '🎁'}</Text>
                  <Text style={styles.giftName} numberOfLines={1}>{gift.name}</Text>
                  <Text style={styles.giftCost}>{gift.coin_cost} 🪙</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedGift && (
            <View style={styles.selectedGiftInfo}>
              <Text style={styles.selectedGiftEmoji}>{selectedGift.emoji || '🎁'}</Text>
              <View style={styles.selectedGiftDetails}>
                <Text style={styles.selectedGiftName}>{selectedGift.name}</Text>
                <Text style={styles.selectedGiftCost}>{selectedGift.coin_cost} coins</Text>
              </View>
            </View>
          )}

          <View style={styles.giftModalActions}>
            <Pressable
              onPress={() => {
                if (giftSubmitting) return;
                setGiftModalVisible(false);
                setGiftTargetPost(null);
                setSelectedGift(null);
              }}
              style={({ pressed }) => [
                styles.giftModalCancelButton,
                pressed ? styles.giftModalButtonPressed : null,
              ]}
            >
              <Text style={styles.giftModalCancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!selectedGift || giftSubmitting) return;
                void sendGift();
              }}
              disabled={!selectedGift || giftSubmitting}
              style={({ pressed }) => [
                styles.giftModalSendButton,
                (!selectedGift || giftSubmitting) && styles.giftModalSendButtonDisabled,
                pressed && !giftSubmitting ? styles.giftModalButtonPressed : null,
              ]}
            >
              <Text style={styles.giftModalSendText}>
                {giftSubmitting ? 'Sending...' : 'Send Gift'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    listContent: {
      paddingTop: 16,
      paddingBottom: 40,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    separator: {
      height: 12,
    },

    composerCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    composerInput: {
      minHeight: 44,
      paddingTop: 12,
      paddingBottom: 12,
      textAlignVertical: 'top',
    },
    mediaActionsRow: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    mediaActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    mediaActionButtonPressed: {
      opacity: 0.85,
    },
    mediaActionIcon: {
      fontSize: 14,
    },
    mediaActionText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    mediaStatusPill: {
      marginLeft: 'auto',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(94,155,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(94,155,255,0.30)',
    },
    mediaStatusText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    composerPreviewWrap: {
      marginTop: 12,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardAlt,
    },
    composerPreviewImage: {
      width: '100%',
      height: 200,
    },
    removeMediaButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    removeMediaButtonPressed: {
      opacity: 0.85,
    },
    removeMediaText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
    },
    composerActions: {
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    postButton: {
      paddingHorizontal: 24,
    },

    filterModalContent: {
      gap: 12,
    },
    filterTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    filterPreviewWrap: {
      width: '100%',
      height: 240,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardAlt,
    },
    filterPreviewImage: {
      width: '100%',
      height: '100%',
    },
    filterRow: {
      paddingVertical: 6,
      gap: 8,
    },
    filterPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardAlt,
    },
    filterPillSelected: {
      backgroundColor: 'rgba(94,155,255,0.22)',
      borderColor: 'rgba(94,155,255,0.55)',
    },
    filterPillText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    filterPillTextSelected: {
      color: theme.colors.textPrimary,
    },
    filterActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 2,
    },
    filterActionButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterActionPrimary: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: 'rgba(94,155,255,0.28)',
      borderWidth: 1,
      borderColor: 'rgba(94,155,255,0.55)',
    },
    filterActionButtonPressed: {
      opacity: 0.85,
    },
    filterActionText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '900',
    },
    filterActionPrimaryText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '900',
    },

    postCard: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 16,
      marginHorizontal: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#5E9BFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    avatarLetter: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
    },
    postMeta: {
      flex: 1,
      marginLeft: 12,
    },
    author: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    authorBold: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    timestamp: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    contentText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 12,
    },
    mediaWrap: {
      marginTop: 12,
      marginBottom: 12,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    mediaImage: {
      width: '100%',
      height: 220,
    },
    engagementBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: 8,
      paddingTop: 8,
      gap: 4,
    },
    engagementButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      borderRadius: 8,
    },
    engagementIcon: {
      fontSize: 18,
      color: theme.colors.textSecondary,
    },
    engagementLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    giftIcon: {
      fontSize: 18,
    },
    giftLabel: {
      color: '#a855f7',
      fontSize: 12,
      fontWeight: '700',
    },
    coinCount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    coinIcon: {
      fontSize: 16,
    },
    coinText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '900',
      textShadowColor: 'rgba(168, 85, 247, 0.5)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 4,
    },

    stateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 12,
    },
    stateTitle: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'center',
    },
    stateSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 20,
    },
    stateButton: {
      marginTop: 4,
      paddingHorizontal: 28,
    },

    footerLoading: {
      paddingVertical: 18,
    },
    loadMoreButton: {
      alignSelf: 'center',
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity * 0.8,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: Math.max(2, cardShadow.elevation - 2),
    },
    loadMoreText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    footerSpacer: {
      height: 12,
    },

    // Gift Modal Styles
    giftModalContent: {
      gap: 16,
    },
    giftModalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'center',
    },
    giftGrid: {
      gap: 12,
      paddingVertical: 8,
    },
    giftItem: {
      width: 80,
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardAlt,
    },
    giftItemSelected: {
      borderColor: '#a855f7',
      backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    giftEmoji: {
      fontSize: 32,
      marginBottom: 4,
    },
    giftName: {
      color: theme.colors.textPrimary,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    giftCost: {
      color: '#a855f7',
      fontSize: 11,
      fontWeight: '900',
      marginTop: 2,
    },
    selectedGiftInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(168, 85, 247, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    selectedGiftEmoji: {
      fontSize: 36,
    },
    selectedGiftDetails: {
      flex: 1,
    },
    selectedGiftName: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    selectedGiftCost: {
      color: '#a855f7',
      fontSize: 13,
      fontWeight: '800',
      marginTop: 2,
    },
    giftModalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    giftModalCancelButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    giftModalCancelText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '900',
    },
    giftModalSendButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: '#a855f7',
      alignItems: 'center',
    },
    giftModalSendButtonDisabled: {
      opacity: 0.5,
    },
    giftModalSendText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '900',
    },
    giftModalButtonPressed: {
      opacity: 0.85,
    },

    // Comments Section Styles
    commentsSection: {
      backgroundColor: theme.colors.cardSurface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 16,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      marginTop: -8,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: theme.colors.border,
    },
    commentsLoadingText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 12,
    },
    commentItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 12,
    },
    commentAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    commentContent: {
      flex: 1,
      minWidth: 0,
    },
    commentUsername: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '900',
      marginBottom: 2,
    },
    commentTimestamp: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      marginBottom: 4,
    },
    commentText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    commentLikeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    commentLikeCount: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    commentLikeButton: {
      padding: 6,
      borderRadius: 8,
    },
    commentLikeButtonDisabled: {
      opacity: 0.5,
    },
    commentLikeIcon: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    commentLikeIconActive: {
      color: '#ec4899',
    },
    commentInputContainer: {
      marginTop: 8,
      gap: 8,
    },
    commentInput: {
      minHeight: 40,
      paddingTop: 8,
      paddingBottom: 8,
    },
    commentSubmitButton: {
      alignSelf: 'flex-end',
      paddingHorizontal: 20,
    },
  });
}

export default FeedScreen;

