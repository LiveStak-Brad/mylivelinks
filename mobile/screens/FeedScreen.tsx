import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { Button, Input, PageShell, PageHeader } from '../components/ui';
import { useFeed, type FeedPost } from '../hooks/useFeed';
import type { MainTabsParamList } from '../types/navigation';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getAvatarSource } from '../lib/defaultAvatar';
import { Modal } from '../components/ui/Modal';
import { PHOTO_FILTER_PRESETS, type PhotoFilterId } from '../lib/photoFilters';
import { Cool, Grayscale, Sepia, Warm, Contrast as ContrastFilter, cleanExtractedImagesCache } from 'react-native-image-filter-kit';

type Props = BottomTabScreenProps<MainTabsParamList, 'Feed'>;

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

  const canPost = (composerText.trim().length > 0 || !!mediaUrl) && !composerLoading && !mediaUploading;
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
        let ImagePicker: any = null;
        try {
          // Use require() instead of dynamic import() because some TS configs disallow import().
          // This also avoids compile-time module resolution errors when the dependency isn't installed yet.
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          ImagePicker = require('expo-image-picker');
        } catch {
          Alert.alert(
            'Uploader not installed',
            "Install expo-image-picker in the mobile app to enable photo/video uploads."
          );
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

        if (result?.canceled) return;
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
        console.error('[Feed] pickMedia error:', e);
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

  const formatDateTime = useCallback((value: string) => {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  }, []);

  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => {
      const avatarUri = resolveMediaUrl(item.author?.avatar_url ?? null);
      const mediaUri = resolveMediaUrl(item.media_url ?? null);
      return (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Image source={getAvatarSource(avatarUri)} style={styles.avatarImage} />
            <View style={styles.postMeta}>
              <Text style={styles.author} numberOfLines={1}>
                {item.author?.username || 'Unknown'}
              </Text>
              <Text style={styles.timestamp} numberOfLines={1}>
                {formatDateTime(item.created_at)}
              </Text>
            </View>

            <View style={styles.metrics}>
              <Text style={styles.metricText}>💬 {item.comment_count ?? 0}</Text>
              <Text style={styles.metricText}>🎁 {item.gift_total_coins ?? 0}</Text>
            </View>
          </View>

          {!!item.text_content && (
            <Text style={styles.contentText}>{String(item.text_content)}</Text>
          )}

          {!!mediaUri && (
            <View style={styles.mediaWrap}>
              <Image source={{ uri: mediaUri }} style={styles.mediaImage} resizeMode="cover" />
            </View>
          )}
        </View>
      );
    },
    [formatDateTime]
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
    timestamp: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    metrics: {
      alignItems: 'flex-end',
      gap: 2,
    },
    metricText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    contentText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 22,
    },
    mediaWrap: {
      marginTop: 12,
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
  });
}

export default FeedScreen;

