/**
 * UsernameTVTab - [Username]TV Profile Tab (Mobile)
 * 
 * A unified video hub that aggregates ALL long-form video content for a user.
 * Think: A creator's personal YouTube home page inside their profile.
 * 
 * MOCK DATA: Uses mock data for initial structure.
 * Real data will come from Creator Studio content tables.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ChannelBanner from '../../tv/ChannelBanner';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../state/AuthContext';
import PlaylistsTab from './PlaylistsTab';
import VideoPlayerModal, { VideoItem as PlayerVideoItem } from '../../VideoPlayerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// 16px padding left + 16px padding right + 16px gap between = 48px total
const VIDEO_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: string;
  views: number;
  published_at: string;
  content_type: 'podcast' | 'movie' | 'series' | 'education' | 'comedy' | 'vlog' | 'music_video' | 'other';
  youtube_id?: string;
}

interface UsernameTVTabProps {
  profileId: string;
  username: string;
  displayName?: string | null;
  channelBannerUrl?: string | null;
  colors: any;
  isOwnProfile?: boolean;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
  onBannerUpdate?: (newUrl: string | null) => void;
}

const CONTENT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'music_video', label: 'Music Videos' },
  { id: 'podcast', label: 'Podcasts' },
  { id: 'series', label: 'Series' },
  { id: 'movie', label: 'Movies' },
  { id: 'education', label: 'Education' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'vlog', label: 'Vlogs' },
  { id: 'playlists', label: 'Playlists' },
] as const;

type ContentFilter = typeof CONTENT_FILTERS[number]['id'] | 'playlists';

// Genre subcategories for music and movies
const MUSIC_GENRES = [
  'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Country', 'Latin', 'Reggae', 'Other'
];

const MOVIE_GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Documentary', 'Thriller', 'Animation', 'Other'
];

// Playlist types
interface PlaylistItem {
  id: string;
  title: string;
  thumbnail_url: string;
  category: string;
  subcategory?: string;
  item_count: number;
  created_at: string;
}

interface PlaylistDetailItem {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: string;
  content_type: string;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return `${views}`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function VideoCard({ video, colors, onPress, cardRadius, cardBg }: { video: VideoItem; colors: any; onPress: () => void; cardRadius?: number; cardBg?: string }) {
  const [imageError, setImageError] = useState(false);
  const radius = cardRadius || 12;
  const bg = cardBg || colors.surface;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.videoCard, { backgroundColor: bg, borderColor: colors.border, borderRadius: radius }, pressed && styles.pressed]}
    >
      <View style={[styles.thumbnailContainer, { borderRadius: radius }]}>
        {!imageError && video.thumbnail_url ? (
          <Image
            source={{ uri: video.thumbnail_url }}
            style={styles.thumbnail}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="play" size={32} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
      </View>
      <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={[styles.videoMeta, { color: colors.mutedText }]}>
        {formatViews(video.views)} views • {formatTimeAgo(video.published_at)}
      </Text>
    </Pressable>
  );
}

export default function UsernameTVTab({ 
  profileId, 
  username, 
  displayName,
  channelBannerUrl,
  colors, 
  isOwnProfile = false,
  cardStyle,
  onBannerUpdate,
}: UsernameTVTabProps) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ContentFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistItem | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistDetailItem[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showPlaylistUploader, setShowPlaylistUploader] = useState(false);
  
  // Video player modal state
  const [playerVisible, setPlayerVisible] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  
  // Apply card style
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  
  // Profile object for banner component
  const bannerProfile = {
    id: profileId,
    username,
    display_name: displayName,
    channel_banner_url: channelBannerUrl,
  };

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      // Format duration helper
      const formatDuration = (seconds: number): string => {
        if (!seconds || seconds <= 0) return '0:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      };
      
      // Map DB item_type to frontend content_type
      const reverseContentTypeMap: Record<string, VideoItem['content_type']> = {
        'podcast': 'podcast',
        'movie': 'movie',
        'series_episode': 'series',
        'education': 'education',
        'comedy_special': 'comedy',
        'vlog': 'vlog',
        'music_video': 'music_video',
        'music': 'music_video',
        'other': 'other',
      };
      
      // Fetch from both creator_studio_items AND legacy profile_music_videos
      const [csResult, legacyResult] = await Promise.all([
        supabase.rpc('get_public_creator_studio_items', {
          p_profile_id: profileId,
          p_item_type: null,
          p_limit: 100,
          p_offset: 0,
        }),
        supabase.rpc('get_music_videos', { p_profile_id: profileId }),
      ]);
      
      const allVideos: VideoItem[] = [];
      const seenTitles = new Set<string>();
      
      // Add Creator Studio items first
      if (csResult.data && !csResult.error) {
        for (const item of csResult.data) {
          const titleKey = (item.title || '').toLowerCase();
          if (!seenTitles.has(titleKey)) {
            seenTitles.add(titleKey);
            allVideos.push({
              id: item.id,
              title: item.title || 'Untitled',
              thumbnail_url: item.thumb_url || item.artwork_url || '',
              duration: formatDuration(item.duration_seconds || 0),
              views: 0,
              published_at: item.created_at,
              content_type: reverseContentTypeMap[item.item_type] || 'other',
              youtube_id: item.youtube_id,
            });
          }
        }
      }
      
      // Add legacy music videos (dedupe by title)
      if (legacyResult.data && !legacyResult.error) {
        for (const item of legacyResult.data) {
          const titleKey = (item.title || '').toLowerCase();
          if (!seenTitles.has(titleKey)) {
            seenTitles.add(titleKey);
            // Extract YouTube thumbnail if available
            let thumbUrl = item.thumbnail_url || '';
            if (!thumbUrl && item.youtube_id) {
              thumbUrl = `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`;
            }
            allVideos.push({
              id: item.id,
              title: item.title || 'Untitled',
              thumbnail_url: thumbUrl,
              duration: '0:00',
              views: item.views_count || 0,
              published_at: item.created_at,
              content_type: 'music_video',
              youtube_id: item.youtube_id,
            });
          }
        }
      }
      
      setVideos(allVideos);
    } catch (error) {
      console.error('Failed to fetch TV content:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Fetch playlists using the same RPC as web/PlaylistsTab
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_playlists', {
          p_profile_id: profileId,
        });
        
        if (!error && data) {
          setPlaylists(data.map((p: any) => ({
            id: p.id,
            title: p.title,
            thumbnail_url: p.thumbnail_url || '',
            category: p.category || 'mixed',
            subcategory: p.subcategory,
            item_count: Number(p.item_count) || 0,
            created_at: p.created_at,
          })));
        } else {
          setPlaylists([]);
        }
      } catch {
        setPlaylists([]);
      }
    };
    
    fetchPlaylists();
  }, [profileId]);

  const filteredVideos = useMemo(() => {
    let result = activeFilter === 'all' || activeFilter === 'playlists'
      ? videos
      : videos.filter(v => v.content_type === activeFilter);
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => v.title.toLowerCase().includes(query));
    }
    
    return result;
  }, [videos, activeFilter, searchQuery]);

  // Filter playlists by search
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const query = searchQuery.toLowerCase();
    return playlists.filter(p => p.title.toLowerCase().includes(query));
  }, [playlists, searchQuery]);

  // Get current genre list based on active filter
  const currentGenres = activeFilter === 'music_video' ? MUSIC_GENRES : activeFilter === 'movie' ? MOVIE_GENRES : [];

  const handleVideoPress = (video: VideoItem, index: number) => {
    // Open video player modal instead of navigating
    setSelectedVideoIndex(index);
    setPlayerVisible(true);
  };
  
  // Convert videos to PlayerVideoItem[] format for VideoPlayerModal
  const playerVideoItems: PlayerVideoItem[] = useMemo(() => {
    return filteredVideos.map(v => ({
      id: v.id,
      youtubeVideoId: v.youtube_id || '',
      youtubeUrl: '',
      title: v.title || null,
      author: null,
      thumbnailUrl: v.thumbnail_url || null,
    }));
  }, [filteredVideos]);

  const handleAddPress = () => {
    navigation.navigate('CreatorStudioUploadScreen', {});
  };

  const handlePlaylistPress = async (playlist: PlaylistItem) => {
    setSelectedPlaylist(playlist);
    setShowPlaylistModal(true);
    
    // Fetch playlist items
    try {
      const { data, error } = await supabase
        .from('curator_playlist_items')
        .select('*')
        .eq('playlist_id', playlist.id)
        .order('position', { ascending: true });
      
      if (!error && data) {
        setPlaylistItems(data.map((item: any) => ({
          id: item.content_id,
          title: item.title || 'Untitled',
          thumbnail_url: item.thumbnail_url || '',
          duration: item.duration || '0:00',
          content_type: item.content_type || 'other',
        })));
      } else {
        setPlaylistItems([]);
      }
    } catch {
      setPlaylistItems([]);
    }
  };

  const handlePlayPlaylist = () => {
    if (selectedPlaylist && playlistItems.length > 0) {
      setShowPlaylistModal(false);
      navigation.navigate('ReplayScreen', {
        contentId: playlistItems[0].id,
        playlistId: selectedPlaylist.id,
        mode: 'curator',
      });
    }
  };

  const handleAddPlaylist = () => {
    setShowPlaylistUploader(true);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If no videos at all, show only the empty state (no header/filters)
  if (videos.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <Ionicons name="videocam-outline" size={48} color={colors.mutedText} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No videos yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          Videos will appear here
        </Text>
        {isOwnProfile && (
          <Pressable
            onPress={handleAddPress}
            style={({ pressed }) => [styles.emptyAddBtn, { backgroundColor: '#EC4899' }, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.emptyAddBtnText}>Creator Studio</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      {/* Channel Banner */}
      <View style={styles.bannerWrapper}>
        <ChannelBanner
          profile={bannerProfile}
          isOwner={isOwnProfile}
          onBannerUpdate={onBannerUpdate}
          colors={colors}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="tv-outline" size={24} color="#EC4899" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{username}TV</Text>
        </View>
        {isOwnProfile && (
          <Pressable
            onPress={handleAddPress}
            style={({ pressed }) => [styles.uploadBtn, { backgroundColor: '#EC4899' }, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>Creator Studio</Text>
          </Pressable>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search @${username}TV`}
          placeholderTextColor="#9CA3AF"
          style={[styles.searchInput, { color: colors.text }]}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {CONTENT_FILTERS.map((filter) => (
          <Pressable
            key={filter.id}
            onPress={() => setActiveFilter(filter.id)}
            style={[
              styles.filterPill,
              activeFilter === filter.id && { backgroundColor: '#EC4899' },
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === filter.id && styles.filterPillTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Genre Subcategory Chips - Only for Music Videos and Movies */}
      {currentGenres.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreContainer}
        >
          <Pressable
            onPress={() => setSelectedGenre(null)}
            style={[
              styles.genrePill,
              selectedGenre === null && { backgroundColor: '#EC4899' },
            ]}
          >
            <Text style={[styles.genrePillText, selectedGenre === null && styles.genrePillTextActive]}>
              All Genres
            </Text>
          </Pressable>
          {currentGenres.map((genre) => (
            <Pressable
              key={genre}
              onPress={() => setSelectedGenre(genre)}
              style={[
                styles.genrePill,
                selectedGenre === genre && { backgroundColor: '#EC4899' },
              ]}
            >
              <Text style={[styles.genrePillText, selectedGenre === genre && styles.genrePillTextActive]}>
                {genre}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Playlists Section - Use PlaylistsTab component for horizontal scroll layout */}
      {activeFilter === 'playlists' ? (
        <PlaylistsTab
          profileId={profileId}
          username={username}
          colors={colors}
          isOwnProfile={isOwnProfile}
          cardStyle={{
            backgroundColor: cardBg,
            borderRadius: cardRadius,
          }}
        />
      ) : (
        <>
        {filteredVideos.length === 0 ? (
          <View style={[styles.filteredEmptyState, { backgroundColor: cardBg }]}>
            <Ionicons name="videocam-outline" size={32} color={colors.mutedText} />
            <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
              {searchQuery 
                ? `No videos matching "${searchQuery}"`
                : `No ${CONTENT_FILTERS.find(f => f.id === activeFilter)?.label.toLowerCase()} content yet`
              }
            </Text>
          </View>
        ) : (
          <View style={styles.listContent}>
            <View style={styles.gridContainer}>
              {filteredVideos.map((item, index) => (
                <VideoCard
                  key={item.id}
                  video={item}
                  colors={colors}
                  onPress={() => handleVideoPress(item, index)}
                  cardRadius={cardRadius}
                  cardBg={cardBg}
                />
              ))}
            </View>
          </View>
        )}
        </>
      )}

      {/* Playlist Detail Modal */}
      <Modal
        visible={showPlaylistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaylistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="list" size={24} color="#EC4899" />
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedPlaylist?.title}</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.mutedText }]}>{playlistItems.length} items</Text>
                </View>
              </View>
              <View style={styles.modalHeaderRight}>
                <Pressable
                  onPress={handlePlayPlaylist}
                  disabled={playlistItems.length === 0}
                  style={({ pressed }) => [
                    styles.playAllBtn,
                    { backgroundColor: playlistItems.length > 0 ? '#EC4899' : '#9CA3AF' },
                    pressed && styles.pressed
                  ]}
                >
                  <Ionicons name="play" size={16} color="#FFFFFF" />
                  <Text style={styles.playAllBtnText}>Play All</Text>
                </Pressable>
                <Pressable onPress={() => setShowPlaylistModal(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={colors.mutedText} />
                </Pressable>
              </View>
            </View>

            {/* Playlist Items */}
            <ScrollView style={styles.playlistItemsScroll}>
              {playlistItems.length === 0 ? (
                <View style={styles.playlistItemsEmpty}>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>No items in this playlist</Text>
                </View>
              ) : (
                playlistItems.map((item, index) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setShowPlaylistModal(false);
                      navigation.navigate('ReplayScreen', {
                        contentId: item.id,
                        playlistId: selectedPlaylist?.id,
                        mode: 'curator',
                      });
                    }}
                    style={({ pressed }) => [styles.playlistItemRow, pressed && styles.pressed]}
                  >
                    <Text style={[styles.playlistItemIndex, { color: colors.mutedText }]}>{index + 1}</Text>
                    <View style={styles.playlistItemThumb}>
                      {item.thumbnail_url ? (
                        <Image source={{ uri: item.thumbnail_url }} style={styles.playlistItemImage} />
                      ) : (
                        <View style={styles.playlistItemPlaceholder}>
                          <Ionicons name="play" size={16} color="#9CA3AF" />
                        </View>
                      )}
                      <View style={styles.playlistItemDuration}>
                        <Text style={styles.playlistItemDurationText}>{item.duration}</Text>
                      </View>
                    </View>
                    <View style={styles.playlistItemInfo}>
                      <Text style={[styles.playlistItemTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[styles.playlistItemType, { color: colors.mutedText }]}>{item.content_type.replace('_', ' ')}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Playlist Uploader Modal - Agent 2 provides this component */}
      <Modal
        visible={showPlaylistUploader}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaylistUploader(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.uploaderModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.uploaderHeader}>
              <Text style={[styles.uploaderTitle, { color: colors.text }]}>Create Playlist</Text>
              <Pressable onPress={() => setShowPlaylistUploader(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.mutedText} />
              </Pressable>
            </View>
            <View style={styles.uploaderBody}>
              <Text style={[styles.uploaderPlaceholder, { color: colors.mutedText }]}>Playlist uploader coming soon...</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={playerVisible}
        onClose={() => setPlayerVisible(false)}
        videos={playerVideoItems}
        initialIndex={selectedVideoIndex}
        playlistTitle={`${username}TV`}
        currentUserId={user?.id}
        username={username}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  bannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.15)',
    marginRight: 8,
  },
  filterPillActive: {
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  filteredEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
  },
  videoCard: {
    width: '100%',
    marginBottom: 16,
    padding: 8,
    borderWidth: 1,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  videoMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  // Genre chips styles
  genreContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  genrePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.1)',
    marginRight: 6,
  },
  genrePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  genrePillTextActive: {
    color: '#FFFFFF',
  },
  // Playlist styles
  addPlaylistRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  addPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPlaylistBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playlistEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playlistCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    marginBottom: 8,
  },
  playlistThumbnail: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  playlistImage: {
    width: '100%',
    height: '100%',
  },
  playlistPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EC4899',
  },
  playlistCountBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playlistCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playlistTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  playlistSubcategory: {
    fontSize: 11,
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  playAllBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  playlistItemsScroll: {
    padding: 16,
  },
  playlistItemsEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  playlistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  playlistItemIndex: {
    width: 24,
    textAlign: 'center',
    fontSize: 13,
  },
  playlistItemThumb: {
    position: 'relative',
    width: 80,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
  },
  playlistItemImage: {
    width: '100%',
    height: '100%',
  },
  playlistItemPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  playlistItemDuration: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  playlistItemDurationText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playlistItemInfo: {
    flex: 1,
  },
  playlistItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  playlistItemType: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  // Uploader modal styles
  uploaderModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  uploaderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploaderTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  uploaderBody: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  uploaderPlaceholder: {
    fontSize: 14,
    textAlign: 'center',
  },
});
