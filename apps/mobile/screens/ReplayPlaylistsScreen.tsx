import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { supabase } from '../lib/supabase';
import { getReplayBannerUrl } from '../lib/replayBannerCache';
import { useTheme } from '../theme/useTheme';
import { useAuth } from '../state/AuthContext';
import VideoPlayerModal, { VideoItem } from '../components/VideoPlayerModal';

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

interface PRPItem {
  item_id: string;
  youtube_video_id: string | null;
  title: string | null;
  description: string | null;
  thumb_url: string | null;
  media_url: string | null;
  duration_seconds: number | null;
  views_count: number;
  created_at: string;
  playlist_id: string;
  playlist_title: string | null;
  curator_profile_id: string;
  curator_username: string;
  curator_display_name: string | null;
  curator_avatar_url: string | null;
  first_added_at: string;
  item_type: string;
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

export default function ReplayPlaylistsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [items, setItems] = useState<PRPItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('popular');
  const [category, setCategory] = useState('all');
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
      const { data, error } = await supabase.rpc('get_prp_feed_deduped', { p_limit: 50 });
      
      if (error) {
        console.error('Failed to load PRP feed:', error);
      } else if (data) {
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to load playlists content:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBanner();
  }, [loadBanner]);

  useEffect(() => {
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
        item.curator_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.curator_display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.playlist_title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredByCategory;

  const handleVideoPress = (item: PRPItem, index: number) => {
    setSelectedVideoIndex(index);
    setPlayerVisible(true);
  };
  
  // Convert PRPItem[] to VideoItem[] for VideoPlayerModal
  const playerVideoItems: VideoItem[] = useMemo(() => {
    return displayItems.map(item => ({
      id: item.item_id,
      youtubeVideoId: item.youtube_video_id || '',
      youtubeUrl: item.media_url || '',
      title: item.title || null,
      author: item.curator_display_name || item.curator_username || null,
      thumbnailUrl: item.thumb_url || null,
    }));
  }, [displayItems]);

  const handleReplay = () => {
    navigation.navigate('ReplayScreen');
  };

  const handleCreatePlaylist = () => {
    navigation.navigate('CreatorStudioHomeScreen');
  };

  const renderVideoCard = ({ item, index }: { item: PRPItem; index: number }) => {
    const thumbnail = item.thumb_url || (item.youtube_video_id ? `https://img.youtube.com/vi/${item.youtube_video_id}/hqdefault.jpg` : null);
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
          {/* Playlist badge */}
          {item.playlist_title && (
            <View style={styles.playlistBadge}>
              <Feather name="list" size={10} color="#fff" />
              <Text style={styles.playlistBadgeText} numberOfLines={1}>{item.playlist_title}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.videoInfo}>
          <Pressable 
            style={styles.avatarContainer}
            onPress={() => navigation.navigate('ProfileViewScreen', { username: item.curator_username })}
          >
            {item.curator_avatar_url ? (
              <Image source={{ uri: item.curator_avatar_url }} style={styles.avatar} />
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
              Curated by {item.curator_display_name || item.curator_username} • {formatTimeAgo(item.first_added_at)}
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
            placeholder="Search Playlists..."
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

        {/* Row 3: +Create Playlist / REPLAY / Playlists */}
        <View style={styles.tabRow}>
          <Pressable style={[styles.createButton, { flex: 1 }]} onPress={handleCreatePlaylist}>
            <Text style={styles.createButtonText}>+Create Playlist</Text>
          </Pressable>
          <Pressable style={[styles.replayButton, { flex: 1 }]} onPress={handleReplay}>
            <Text style={styles.replayButtonText}>REPLAY</Text>
          </Pressable>
          <View style={[styles.playlistsButtonActive, { flex: 1 }]}>
            <Feather name="list" size={14} color="#fff" />
            <Text style={styles.playlistsButtonTextActive}>Playlists</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="list" size={60} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No playlists yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Be the first to create a public playlist!
      </Text>
      <Pressable style={styles.browseButton} onPress={handleReplay}>
        <Text style={styles.browseButtonText}>Browse REPLAY</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.item_id}
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
        playlistTitle="Playlists"
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

  // Create button (outline style)
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ec4899',
    backgroundColor: '#fff',
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ec4899',
  },

  // Tab Row
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replayButton: {
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  playlistsButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ec4899',
  },
  playlistsButtonTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
    backgroundColor: '#1f2937',
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
  playlistBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(236, 72, 153, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: '60%',
  },
  playlistBadgeText: {
    color: '#fff',
    fontSize: 11,
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
    marginBottom: 20,
  },
  browseButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#ec4899',
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
