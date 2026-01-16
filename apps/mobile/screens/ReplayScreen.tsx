import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { getReplayBannerUrl } from '../lib/replayBannerCache';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';
import VideoPlayerModal, { VideoItem } from '../components/VideoPlayerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category filter chips
const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'music_video', label: 'Music' },
  { id: 'podcast', label: 'Podcasts' },
  { id: 'series_episode', label: 'Series' },
  { id: 'movie', label: 'Movies' },
  { id: 'education', label: 'Education' },
  { id: 'comedy_special', label: 'Comedy' },
  { id: 'vlog', label: 'Vlogs' },
];

type FilterType = 'popular' | 'new';
type TabType = 'replay' | 'playlists';

interface ReplayItem {
  id: string;
  title: string;
  description: string | null;
  item_type: string;
  media_url: string | null;
  thumb_url: string | null;
  artwork_url: string | null;
  duration_seconds: number | null;
  views_count: number;
  created_at: string;
  owner_profile_id: string;
  owner_username: string;
  owner_display_name: string | null;
  owner_avatar_url: string | null;
  youtube_id?: string;
}

function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/i);
  return match?.[1] || null;
}

function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return `${views}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export default function ReplayScreen() {
  const navigation = useNavigation<any>();
  const { session, user } = useAuth();
  const { colors, isDark } = useTheme();
  
  const [activeTab, setActiveTab] = useState<TabType>('replay');
  const [filter, setFilter] = useState<FilterType>('popular');
  const [category, setCategory] = useState('all');
  const [items, setItems] = useState<ReplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Video player modal state
  const [playerVisible, setPlayerVisible] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);

  const loadBanner = useCallback(async () => {
    if (bannerLoaded) return; // Don't reload if already loaded
    try {
      const url = await getReplayBannerUrl();
      setBannerUrl(url);
      setBannerLoaded(true);
    } catch (err) {
      console.error('Failed to load banner:', err);
      setBannerLoaded(true);
    }
  }, [bannerLoaded]);

  const loadContent = useCallback(async () => {
    try {
      const rpcName = filter === 'popular' ? 'get_replay_feed_popular' : 'get_replay_feed_new';
      const { data, error } = await supabase.rpc(rpcName, { p_limit: 50 });
      
      if (error) {
        console.error('Failed to load replay feed:', error);
      } else if (data) {
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to load replay content:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadBanner();
  }, [loadBanner]);

  useEffect(() => {
    setIsLoading(true);
    loadContent();
  }, [loadContent]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadContent();
  };

  // Filter items by category and search
  const filteredByCategory = category === 'all' 
    ? items 
    : items.filter(item => item.item_type === category);
  const displayItems = searchQuery.trim() 
    ? filteredByCategory.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner_display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredByCategory;

  const handleVideoPress = (item: ReplayItem, index: number) => {
    setSelectedVideoIndex(index);
    setPlayerVisible(true);
  };
  
  // Convert ReplayItem[] to VideoItem[] for VideoPlayerModal
  const playerVideoItems: VideoItem[] = useMemo(() => {
    return displayItems.map(item => {
      const youtubeId = item.youtube_id || (item.media_url ? extractYoutubeId(item.media_url) : null);
      return {
        id: item.id,
        youtubeVideoId: youtubeId || '',
        youtubeUrl: item.media_url || '',
        title: item.title || null,
        author: item.owner_display_name || item.owner_username || null,
        thumbnailUrl: item.thumb_url || item.artwork_url || null,
      };
    });
  }, [displayItems]);

  const handleCreatorStudio = () => {
    navigation.navigate('CreatorStudioHomeScreen');
  };

  const handlePlaylists = () => {
    navigation.navigate('ReplayPlaylistsScreen');
  };

  const renderVideoCard = ({ item, index }: { item: ReplayItem; index: number }) => {
    const youtubeId = item.media_url ? extractYoutubeId(item.media_url) : null;
    const thumbnail = item.thumb_url || item.artwork_url || (youtubeId ? getYoutubeThumbnail(youtubeId) : null);
    const duration = formatDuration(item.duration_seconds);

    return (
      <Pressable 
        style={styles.videoCard}
        onPress={() => handleVideoPress(item, index)}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumb]}>
              <Ionicons name="play-circle" size={40} color="#fff" />
            </View>
          )}
          {duration ? (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{duration}</Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View style={styles.videoInfo}>
          <Pressable 
            style={styles.avatarContainer}
            onPress={() => navigation.navigate('Profile', { username: item.owner_username })}
          >
            {item.owner_avatar_url ? (
              <Image source={{ uri: item.owner_avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={14} color="#999" />
              </View>
            )}
          </Pressable>
          <View style={styles.textContainer}>
            <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title || 'Untitled'}
            </Text>
            <Text style={[styles.videoMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.owner_display_name || item.owner_username} • {formatViews(item.views_count)} views • {formatTimeAgo(item.created_at)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Banner */}
      {bannerUrl ? (
        <View style={styles.bannerWrapper}>
          <View style={styles.bannerContainer}>
            <Image
              source={{ uri: bannerUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>
        </View>
      ) : null}

      {/* Filter Rows */}
      <View style={styles.filterRowsContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search Replay..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Row 1: Popular / New Toggle */}
        <View style={styles.filterRow}>
        <Pressable
          style={[
            styles.filterButton,
            { flex: 1 },
            filter === 'popular' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('popular')}
        >
          <Text style={[
            styles.filterButtonText,
            filter === 'popular' && styles.filterButtonTextActive,
          ]}>
            Popular
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.filterButton,
            { flex: 1 },
            filter === 'new' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('new')}
        >
          <Text style={[
            styles.filterButtonText,
            filter === 'new' && styles.filterButtonTextActive,
          ]}>
            New
          </Text>
        </Pressable>
        </View>

        {/* Row 2: Category Chips (Scrollable) */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryRow}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryChip,
                category === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={[
                styles.categoryChipText,
                category === cat.id && styles.categoryChipTextActive,
              ]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Row 3: Creator Studio / REPLAY / Playlists */}
        <View style={styles.tabRow}>
          <Pressable style={[styles.creatorStudioButton, { flex: 1 }]} onPress={handleCreatorStudio}>
            <Text style={styles.creatorStudioText}>+Creator Studio</Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, styles.tabButtonGradient, { flex: 1 }]}
            onPress={() => setActiveTab('replay')}
          >
            <Text style={styles.tabButtonTextActive}>REPLAY</Text>
          </Pressable>

          <Pressable
            style={[styles.playlistsButton, { flex: 1 }]}
            onPress={handlePlaylists}
          >
            <Feather name="list" size={14} color={colors.textSecondary} />
            <Text style={[styles.playlistsText, { color: colors.textSecondary }]}>Playlists</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="tv-outline" size={60} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {category === 'all' ? 'No videos yet' : `No ${CATEGORIES.find(c => c.id === category)?.label || 'videos'} yet`}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Be the first to upload content!
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        renderItem={renderVideoCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
      )}
      
      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={playerVisible}
        onClose={() => setPlayerVisible(false)}
        videos={playerVideoItems}
        initialIndex={selectedVideoIndex}
        playlistTitle="Replay"
        currentUserId={user?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  // Header
  headerContainer: {
    paddingBottom: 16,
    gap: 12,
  },

  // Banner
  bannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 4,
  },
  bannerContainer: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },

  // Filter rows container
  filterRowsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  // Row 1: Popular / New
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#ec4899',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },

  // Row 2: Categories
  categoryRow: {
    marginHorizontal: -16,
  },
  categoryContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#ec4899',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#fff',
  },

  // Row 3: Tabs
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorStudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ec4899',
    backgroundColor: '#fff',
  },
  creatorStudioText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ec4899',
  },
  tabButton: {
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {},
  tabButtonGradient: {
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 8,
    textAlign: 'center',
  },
  tabButtonTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  playlistsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  playlistsText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Video Card
  videoCard: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumb: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  videoInfo: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  avatarContainer: {},
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  videoMeta: {
    fontSize: 13,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
