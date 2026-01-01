import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';

import { Button, Input, PageShell, PageHeader, Modal } from '../components/ui';
import { LegalFooter } from '../components/LegalFooter';
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

  // Like State - Track which posts current user has liked
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [likesLoading, setLikesLoading] = useState<Set<string>>(new Set());

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

  // Load which posts the current user has liked (for current batch)
  const loadLikedPostsForBatch = useCallback(async (postIds: string[]) => {
    if (!user?.id || postIds.length === 0) return;
    
    try {
      const { data, error } = await supabase.rpc('rpc_get_user_post_likes', {
        p_profile_id: user.id,
        p_post_ids: postIds,
      });

      if (!error && data) {
        const likedIds = data.map((row: { post_id: string }) => row.post_id);
        setLikedPostIds((prev) => {
          const updated = new Set(prev);
          likedIds.forEach((id: string) => updated.add(id));
          return updated;
        });
      }
    } catch (e) {
      console.error('[Feed] Failed to load liked posts:', e);
    }
  }, [user?.id]);

  // Load liked posts when posts change (only for new posts)
  const prevPostIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentPostIds = new Set(posts.map((p) => p.id));
    const newPostIds: string[] = [];
    
    currentPostIds.forEach((id) => {
      if (!prevPostIdsRef.current.has(id)) {
        newPostIds.push(id);
      }
    });

    if (newPostIds.length > 0) {
      void loadLikedPostsForBatch(newPostIds);
    }

    prevPostIdsRef.current = currentPostIds;
  }, [posts, loadLikedPostsForBatch]);

  useEffect(() => {
    void loadGiftTypes();
  }, [loadGiftTypes]);

  // Handle like button press
  const handleLike = useCallback(async (post: FeedPost) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to like posts');
      return;
    }

    const postId = post.id;
    const alreadyLiked = likedPostIds.has(postId);

    if (alreadyLiked) {
      // Already liked - no action (design: like-only, no unlike)
      return;
    }

    // Optimistic update
    setLikedPostIds((prev) => new Set(prev).add(postId));
    setLikesLoading((prev) => new Set(prev).add(postId));

    try {
      const { data, error } = await supabase.rpc('rpc_like_post', {
        p_post_id: postId,
        p_profile_id: user.id,
      });

      if (error) {
        // Revert optimistic update
        setLikedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        Alert.alert('Error', 'Failed to like post');
      }
    } catch (e) {
      // Revert optimistic update
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      Alert.alert('Error', 'Failed to like post');
    } finally {
      setLikesLoading((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, [user?.id, likedPostIds]);

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
      const isLiked = likedPostIds.has(item.id);
      const isLiking = likesLoading.has(item.id);
      const displayLikesCount = item.likes_count + (isLiked && !item.likes_count ? 1 : 0);

      return (
        <View style={styles.postCard}>
          {/* Header: Avatar + Username + Date */}
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

          {/* Content */}
          {!!item.text_content && (
            <Text style={styles.contentText}>{String(item.text_content)}</Text>
          )}

          {/* Media */}
          {!!mediaUri && (
            <View style={styles.mediaWrap}>
              <Image source={{ uri: mediaUri }} style={styles.mediaImage} resizeMode="cover" />
            </View>
          )}

          {/* Stats Bar - Like count, Comment count, Coins */}
          {(displayLikesCount > 0 || item.comment_count > 0 || (item.gift_total_coins ?? 0) > 0) && (
            <View style={styles.statsBar}>
              {displayLikesCount > 0 && (
                <Text style={styles.statsText}>
                  ❤️ {displayLikesCount} {displayLikesCount === 1 ? 'like' : 'likes'}
                </Text>
              )}
              {item.comment_count > 0 && (
                <Text style={styles.statsText}>
                  💬 {item.comment_count} {item.comment_count === 1 ? 'comment' : 'comments'}
                </Text>
              )}
              {(item.gift_total_coins ?? 0) > 0 && (
                <Text style={styles.statsText}>
                  🪙 {item.gift_total_coins}
                </Text>
              )}
            </View>
          )}

          {/* Action Buttons - Like, Comment, Gift */}
          <View style={styles.actionsBar}>
            <Pressable 
              style={styles.actionButton}
              onPress={() => handleLike(item)}
              disabled={isLiking || isLiked}
            >
              <Text style={[styles.actionIcon, isLiked && styles.actionIconLiked]}>
                {isLiked ? '❤️' : '♡'}
              </Text>
              <Text style={[styles.actionLabel, isLiked && styles.actionLabelLiked]}>
                Like
              </Text>
            </Pressable>

            <Pressable style={styles.actionButton}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionLabel}>Comment</Text>
            </Pressable>

            <Pressable 
              style={styles.actionButton}
              onPress={() => openGiftModal(item)}
            >
              <Text style={styles.actionIcon}>🎁</Text>
              <Text style={styles.actionLabel}>Gift</Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [formatDateTime, navigation, styles, likedPostIds, likesLoading, handleLike]
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

      <LegalFooter extraBottomPadding={68} />
      
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
    
    // Modern Stats Bar (like Facebook/Instagram)
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingVertical: 8,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: 8,
    },
    statsText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },

    // Modern Action Buttons Bar
    actionsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 4,
      gap: 2,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
    },
    actionIcon: {
      fontSize: 20,
      color: theme.colors.textSecondary,
    },
    actionIconLiked: {
      color: '#ff3b5c',
    },
    actionLabel: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    actionLabelLiked: {
      color: '#ff3b5c',
    },

    // Legacy - can be removed
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
  });
}

export default FeedScreen;

