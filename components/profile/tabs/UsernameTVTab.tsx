'use client';

/**
 * UsernameTVTab - [Username]TV Profile Tab
 * 
 * A unified video hub that aggregates ALL long-form video content for a user.
 * Think: A creator's personal YouTube home page inside their profile.
 * 
 * Includes content from: Podcasts, Movies, Series, Education, Comedy, Vlogs, Music Videos, Other
 * 
 * MOCK DATA: This component uses mock data for initial structure.
 * Real data will come from Creator Studio content tables.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import VideoGrid, { VideoItem } from './VideoGrid';
import { Tv, Search, ChevronDown, ExternalLink, Plus, Play, X, ListVideo } from 'lucide-react';
import { ChannelBanner } from '@/components/tv';
import { PlaylistsTab } from '@/components/playlist';

interface UsernameTVTabProps {
  profileId: string;
  username: string;
  displayName?: string;
  channelBannerUrl?: string | null;
  isOwner?: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  onBannerUpdate?: (newUrl: string | null) => void;
}

// Content type filter options - "Other" NOT shown as pill but included in "All"
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

type ContentFilter = 'all' | 'podcast' | 'movie' | 'series' | 'education' | 'comedy' | 'vlog' | 'music_video' | 'playlists' | 'other';

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

// Sort options
const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'most_viewed', label: 'Most Viewed' },
  { id: 'oldest', label: 'Oldest' },
] as const;

type SortOption = typeof SORT_OPTIONS[number]['id'];

export default function UsernameTVTab({
  profileId,
  username,
  displayName,
  channelBannerUrl,
  isOwner = false,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  onBannerUpdate,
}: UsernameTVTabProps) {
  // Profile object for banner component
  const bannerProfile = {
    id: profileId,
    username,
    display_name: displayName,
    channel_banner_url: channelBannerUrl,
  };
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ContentFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistItem | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistDetailItem[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showPlaylistUploader, setShowPlaylistUploader] = useState(false);

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        
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
                creator: { id: profileId, username, display_name: username, avatar_url: '' },
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
                creator: { id: profileId, username, display_name: username, avatar_url: '' },
              });
            }
          }
        }
        
        setVideos(allVideos);
      } catch (error) {
        console.error('Failed to fetch TV content:', error);
        setVideos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [profileId, username]);

  // Fetch playlists from replay_playlists table via RPC
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        
        // Use the get_user_playlists RPC
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
            item_count: p.item_count || 0,
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

  // Filter, search, and sort videos
  const filteredVideos = useMemo(() => {
    let result = [...videos];
    
    // Category filter
    if (activeFilter !== 'all') {
      result = result.filter(v => v.content_type === activeFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.title.toLowerCase().includes(query)
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
        break;
      case 'most_viewed':
        result.sort((a, b) => b.views - a.views);
        break;
    }
    
    return result;
  }, [videos, activeFilter, searchQuery, sortBy]);

  const handleVideoClick = (video: VideoItem) => {
    // Navigate to replay player page (canonical long-form player)
    router.push(`/replay/${username}/${video.id}`);
  };

  const handlePlaylistClick = async (playlist: PlaylistItem) => {
    // Navigate directly to the curator playlist player
    router.push(`/replay/${username}/playlist/${playlist.id}`);
  };

  const handlePlayPlaylist = () => {
    if (selectedPlaylist) {
      // Navigate to curator playlist player
      router.push(`/replay/${username}/playlist/${selectedPlaylist.id}`);
    }
  };

  const handleAddPlaylist = () => {
    // Open playlist uploader modal from agent 2
    setShowPlaylistUploader(true);
  };

  // Get current genre list based on active filter
  const currentGenres = activeFilter === 'music_video' ? MUSIC_GENRES : activeFilter === 'movie' ? MOVIE_GENRES : [];

  // Filter playlists by search
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const query = searchQuery.toLowerCase();
    return playlists.filter(p => p.title.toLowerCase().includes(query));
  }, [playlists, searchQuery]);

  return (
    <div 
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      {/* Channel Banner */}
      <ChannelBanner
        profile={bannerProfile}
        isOwner={isOwner}
        onBannerUpdate={onBannerUpdate}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Tv className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {username}TV
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {videos.length} videos
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isOwner && (
            <a
              href="/creator-studio/upload"
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
            >
              <span>+</span> Creator Studio
            </a>
          )}
          <Link
            href={`/${username}/tv`}
            className="flex items-center gap-1 px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
          >
            View All <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Search + Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search @${username}TV`}
            className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-purple-500 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {SORT_OPTIONS.find(s => s.id === sortBy)?.label}
            <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showSortDropdown && (
            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
              {SORT_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSortBy(option.id);
                    setShowSortDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    sortBy === option.id
                      ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        {CONTENT_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => {
              setActiveFilter(filter.id as ContentFilter);
              setSelectedGenre(null);
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === filter.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Genre Subcategory Chips - Only for Music Videos and Movies */}
      {currentGenres.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedGenre === null
                ? 'bg-purple-500 text-white'
                : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            All Genres
          </button>
          {currentGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedGenre === genre
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* Playlists Section - Show when Playlists tab is active */}
      {activeFilter === 'playlists' ? (
        <PlaylistsTab
          profileId={profileId}
          username={username}
          isOwner={isOwner}
          buttonColor="#8B5CF6"
        />
      ) : (
        /* Video Grid - Show for all other tabs */
        <>
          {/* Search results count */}
          {searchQuery && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {filteredVideos.length} result{filteredVideos.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          )}

          <VideoGrid
            videos={filteredVideos}
            isLoading={isLoading}
            emptyMessage={
              searchQuery
                ? `No videos matching "${searchQuery}"`
                : activeFilter === 'all'
                  ? 'No videos uploaded yet'
                  : `No ${CONTENT_FILTERS.find(f => f.id === activeFilter)?.label.toLowerCase()} content yet`
            }
            showCreator={false}
            onVideoClick={handleVideoClick}
            username={username}
          />
        </>
      )}

      {/* Playlist Detail Modal */}
      {showPlaylistModal && selectedPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <ListVideo className="w-6 h-6 text-purple-600" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedPlaylist.title}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{playlistItems.length} items</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayPlaylist}
                  disabled={playlistItems.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" fill="white" />
                  Play All
                </button>
                <button
                  onClick={() => {
                    setShowPlaylistModal(false);
                    setSelectedPlaylist(null);
                    setPlaylistItems([]);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Playlist Items */}
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {playlistItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No items in this playlist</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {playlistItems.map((item, index) => (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/replay/${item.id}?playlist=${selectedPlaylist.id}&mode=curator`)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <span className="text-sm text-gray-400 w-6 text-center">{index + 1}</span>
                      <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                        {item.thumbnail_url ? (
                          <Image
                            src={item.thumbnail_url}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1 py-0.5 rounded">
                          {item.duration}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">{item.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.content_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Playlist Uploader Modal - Agent 2 provides this component */}
      {showPlaylistUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg p-6 mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Playlist</h2>
              <button
                onClick={() => setShowPlaylistUploader(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              Playlist uploader coming soon...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
