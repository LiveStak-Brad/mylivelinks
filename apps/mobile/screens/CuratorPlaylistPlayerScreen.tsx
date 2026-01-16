import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../theme/useTheme';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = (SCREEN_WIDTH * 9) / 16;

interface PlaylistItem {
  id: string;
  youtube_url: string;
  youtube_video_id: string;
  title: string | null;
  author: string | null;
  thumbnail_url: string;
  duration_seconds: number | null;
  position: number;
}

interface PlaylistData {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  visibility: string;
  category: string;
  subcategory: string | null;
  thumbnail_url: string | null;
  items: PlaylistItem[];
}

interface CuratorProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

type RouteParams = {
  playlistId: string;
  username: string;
  startIndex?: number;
};

export default function CuratorPlaylistPlayerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const params = route.params as RouteParams;
  const { playlistId, username, startIndex = 0 } = params || {};

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [curator, setCurator] = useState<CuratorProfile | null>(null);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  const loadPlaylist = useCallback(async () => {
    if (!playlistId || !username) {
      setError('Missing playlist information');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get curator profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('username', username)
        .single();

      if (!profile) {
        setError('Curator not found');
        setLoading(false);
        return;
      }

      setCurator(profile);

      // Get playlist with items
      const { data: playlistData, error: playlistError } = await supabase.rpc(
        'get_playlist_with_items',
        { p_playlist_id: playlistId }
      );

      if (playlistError) throw playlistError;

      if (!playlistData) {
        setError('Playlist not found');
        setLoading(false);
        return;
      }

      setPlaylist(playlistData);
    } catch (err: any) {
      console.error('Failed to load playlist:', err);
      setError(err.message || 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  }, [playlistId, username]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const currentItem = playlist?.items?.[currentIndex] ?? null;

  const goToItem = (index: number) => {
    setCurrentIndex(index);
    setShowQueue(false);
  };

  const openOnYouTube = () => {
    if (currentItem) {
      // Open YouTube in browser
      const url = `https://www.youtube.com/watch?v=${currentItem.youtube_video_id}`;
      // Using Linking would require import, for now just log
      console.log('Open YouTube:', url);
    }
  };

  const renderQueueItem = ({ item, index }: { item: PlaylistItem; index: number }) => {
    const isActive = index === currentIndex;
    return (
      <Pressable
        onPress={() => goToItem(index)}
        style={[
          styles.queueItem,
          { backgroundColor: isActive ? colors.accent + '20' : colors.surface },
        ]}
      >
        <View style={styles.queueThumbContainer}>
          <Image
            source={{ uri: item.thumbnail_url }}
            style={styles.queueThumb}
          />
          {isActive && (
            <View style={styles.queuePlayingOverlay}>
              <Ionicons name="play" size={16} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.queuePosition}>
            <Text style={styles.queuePositionText}>{index + 1}</Text>
          </View>
        </View>
        <View style={styles.queueInfo}>
          <Text
            style={[
              styles.queueTitle,
              { color: isActive ? colors.accent : colors.text },
            ]}
            numberOfLines={2}
          >
            {item.title || 'Untitled'}
          </Text>
          {item.author && (
            <Text style={[styles.queueAuthor, { color: colors.mutedText }]} numberOfLines={1}>
              {item.author}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.playerArea, { backgroundColor: '#000' }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </View>
    );
  }

  if (error || !playlist) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <SafeAreaView style={styles.errorContainer}>
          <Ionicons name="list" size={64} color={colors.mutedText} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {error || 'Playlist not found'}
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.mutedText }]}>
            The playlist you're looking for doesn't exist or is private.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.errorBtn, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.errorBtnText}>Go Back</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  if (playlist.items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <SafeAreaView style={styles.errorContainer}>
          <Ionicons name="list" size={64} color={colors.mutedText} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Empty Playlist</Text>
          <Text style={[styles.errorSubtitle, { color: colors.mutedText }]}>
            This playlist doesn't have any videos yet.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.errorBtn, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.errorBtnText}>Go Back</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Video Player Area */}
      <View style={[styles.playerArea, { backgroundColor: '#000' }]}>
        <SafeAreaView edges={['top']} style={styles.playerHeader}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
          </Pressable>
          
          {/* Curator Badge - CURATOR MODE */}
          <View style={styles.curatorBadge}>
            <Ionicons name="person" size={12} color="#FFFFFF" />
            <Text style={styles.curatorBadgeText}>
              Curator: {curator?.display_name || username}
            </Text>
          </View>
          
          <Pressable
            onPress={() => setShowQueue(true)}
            style={styles.queueBtn}
          >
            <Ionicons name="list" size={24} color="#FFFFFF" />
          </Pressable>
        </SafeAreaView>

        {currentItem && (
          <WebView
            source={{
              uri: `https://www.youtube.com/embed/${currentItem.youtube_video_id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
            }}
            style={styles.webview}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
          />
        )}
      </View>

      {/* Content Info - NO GIFTING UI (Curator Mode) */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={[styles.contentScrollInner, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
          {currentItem?.title || 'Untitled Video'}
        </Text>

        {/* Curator Info */}
        <Pressable
          onPress={() => navigation.navigate('ProfileViewScreen', { username })}
          style={styles.curatorRow}
        >
          <View style={[styles.curatorAvatar, { backgroundColor: colors.border }]}>
            {curator?.avatar_url ? (
              <Image source={{ uri: curator.avatar_url }} style={styles.curatorAvatarImg} />
            ) : (
              <Ionicons name="person" size={16} color={colors.mutedText} />
            )}
          </View>
          <View>
            <Text style={[styles.curatorName, { color: colors.text }]}>
              {curator?.display_name || username}
            </Text>
            <Text style={[styles.curatorLabel, { color: colors.mutedText }]}>
              Curated playlist
            </Text>
          </View>
        </Pressable>

        {/* Actions - NO GIFT BUTTON (Curator Mode) */}
        <View style={[styles.actionsRow, { borderColor: colors.border }]}>
          {/* Open on YouTube */}
          <Pressable
            onPress={openOnYouTube}
            style={[styles.youtubeBtn, { backgroundColor: '#FF0000' }]}
          >
            <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
            <Text style={styles.youtubeBtnText}>Open on YouTube</Text>
          </Pressable>

          {/* Share */}
          <Pressable
            onPress={() => {}}
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Share</Text>
          </Pressable>
        </View>

        {/* Playlist Info */}
        <View style={[styles.playlistInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.playlistInfoHeader}>
            <Ionicons name="list" size={18} color={colors.accent} />
            <Text style={[styles.playlistTitle, { color: colors.text }]}>
              {playlist.title}
            </Text>
            <Text style={[styles.playlistProgress, { color: colors.mutedText }]}>
              {currentIndex + 1} / {playlist.items.length}
            </Text>
          </View>
          {playlist.description && (
            <Text style={[styles.playlistDescription, { color: colors.mutedText }]} numberOfLines={3}>
              {playlist.description}
            </Text>
          )}
        </View>

        {/* Mini Queue Preview */}
        <Pressable
          onPress={() => setShowQueue(true)}
          style={[styles.queuePreview, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.queuePreviewTitle, { color: colors.text }]}>
            Playlist Queue
          </Text>
          <View style={styles.queuePreviewRight}>
            <Text style={[styles.queuePreviewCount, { color: colors.mutedText }]}>
              {playlist.items.length} videos
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </View>
        </Pressable>
      </ScrollView>

      {/* Queue Bottom Sheet */}
      {showQueue && (
        <Pressable
          style={styles.queueOverlay}
          onPress={() => setShowQueue(false)}
        >
          <Pressable
            style={[styles.queueSheet, { backgroundColor: colors.bg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.queueHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.queueHeaderTitle, { color: colors.text }]}>
                Playlist Queue
              </Text>
              <Pressable onPress={() => setShowQueue(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={playlist.items}
              keyExtractor={(item) => item.id}
              renderItem={renderQueueItem}
              contentContainerStyle={styles.queueList}
              showsVerticalScrollIndicator={false}
            />
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  playerArea: {
    width: '100%',
    height: VIDEO_HEIGHT + 60,
  },
  playerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  curatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(147, 51, 234, 0.8)',
  },
  curatorBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  queueBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  errorBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  contentScroll: { flex: 1 },
  contentScrollInner: { padding: 16, gap: 16 },

  videoTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },

  curatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  curatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  curatorAvatarImg: {
    width: 40,
    height: 40,
  },
  curatorName: {
    fontSize: 15,
    fontWeight: '700',
  },
  curatorLabel: {
    fontSize: 12,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  youtubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  youtubeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  playlistInfo: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  playlistInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playlistTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  playlistProgress: {
    fontSize: 13,
    fontWeight: '600',
  },
  playlistDescription: {
    fontSize: 13,
    lineHeight: 18,
  },

  queuePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  queuePreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  queuePreviewRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  queuePreviewCount: {
    fontSize: 13,
    fontWeight: '600',
  },

  queueOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  queueSheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  queueHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  queueList: {
    padding: 12,
    gap: 8,
  },
  queueItem: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 12,
    gap: 12,
  },
  queueThumbContainer: {
    position: 'relative',
  },
  queueThumb: {
    width: 120,
    height: 68,
    borderRadius: 8,
  },
  queuePlayingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queuePosition: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
  },
  queuePositionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  queueInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  queueAuthor: {
    fontSize: 12,
    marginTop: 4,
  },
});
