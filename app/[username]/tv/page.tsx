'use client';

/**
 * [Username]TV Full Page
 * 
 * Route: /[username]/tv
 * 
 * Full-page TV grid view with all video content.
 * This is the dedicated TV page (separate from the profile tab).
 * 
 * Features:
 * - Search input (filters by title/description/tags)
 * - Sort dropdown (Newest, Most Viewed, Oldest, Longest, Shortest)
 * - Featured row at top
 * - Category filter pills (Other hidden but included in All)
 * - Creator context (avatar, follow, about)
 * - Series/Episode labeling
 * 
 * MOCK DATA: Uses lib/tv/mockData.ts
 * See that file for WIRING PLAN
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Tv, Play, Search, ChevronDown, UserPlus, UserCheck, Info, Star, ListVideo } from 'lucide-react';
import { fetchTVVideos, type TVVideoItem, MOCK_TV_VIDEOS } from '@/lib/tv/mockData';
import { ChannelBanner } from '@/components/tv';
import { createClient } from '@/lib/supabase';
import PlaylistsTab from '@/components/playlist/PlaylistsTab';

// Content type filter options - "Other" is NOT shown as a pill but included in "All"
const CONTENT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'podcast', label: 'Podcasts' },
  { id: 'movie', label: 'Movies' },
  { id: 'series', label: 'Series' },
  { id: 'education', label: 'Education' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'vlog', label: 'Vlogs' },
  { id: 'music_video', label: 'Music Videos' },
  { id: 'playlists', label: 'Playlists' },
  // 'other' intentionally NOT shown - appears in All, search, and recommendations only
] as const;

type ContentFilter = 'all' | 'podcast' | 'movie' | 'series' | 'education' | 'comedy' | 'vlog' | 'music_video' | 'playlists' | 'other';

// Sort options
const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'most_viewed', label: 'Most Viewed' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'longest', label: 'Longest' },
  { id: 'shortest', label: 'Shortest' },
] as const;

type SortOption = typeof SORT_OPTIONS[number]['id'];

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
  return `${views} views`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function VideoCard({ video, username, showSeriesInfo = true }: { video: TVVideoItem; username: string; showSeriesInfo?: boolean }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link 
      href={`/replay/${username}/${video.id}`}
      className="group cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 mb-3">
        {!imageError && video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
          {video.duration}
        </div>
        
        {/* Content type badge - hide "other" */}
        {video.content_type !== 'other' && (
          <div className="absolute top-2 left-2 bg-purple-600/90 text-white text-xs font-medium px-2 py-0.5 rounded capitalize">
            {video.content_type.replace('_', ' ')}
          </div>
        )}
        
        {/* Series/Episode badge */}
        {showSeriesInfo && video.episode_number && (
          <div className="absolute top-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-0.5 rounded">
            S{video.season_number || 1} E{video.episode_number}
          </div>
        )}
        
        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          </div>
        </div>
      </div>
      
      {/* Video info */}
      <div>
        {/* Series title if part of series */}
        {showSeriesInfo && video.series_title && (
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-0.5">
            {video.series_title}
          </p>
        )}
        <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{formatViews(video.views)}</span>
          <span>•</span>
          <span>{formatTimeAgo(video.published_at)}</span>
        </div>
      </div>
    </Link>
  );
}

// Featured video card - larger horizontal layout
function FeaturedVideoCard({ video, username }: { video: TVVideoItem; username: string }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link 
      href={`/replay/${username}/${video.id}`}
      className="group cursor-pointer flex-shrink-0 w-80"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2">
        {!imageError && video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
          {video.duration}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          </div>
        </div>
      </div>
      <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
        {video.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {formatViews(video.views)}
      </p>
    </Link>
  );
}

function VideoGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  channel_banner_url: string | null;
  follower_count?: number;
}

export default function TVPage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = params?.username ?? '';
  
  const [videos, setVideos] = useState<TVVideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ContentFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Profile and auth state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Check if current user is the owner
  const isOwner = !!(currentUserId && profile?.id && currentUserId === profile.id);

  // Fetch profile data including channel_banner_url
  useEffect(() => {
    if (!username) return;
    
    const fetchProfile = async () => {
      setProfileLoading(true);
      const supabase = createClient();
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);
        
        // Fetch profile by username (case-insensitive)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, channel_banner_url, follower_count')
          .ilike('username', username)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchProfile();
  }, [username]);

  // Handle banner update callback
  const handleBannerUpdate = (newUrl: string | null) => {
    setProfile(prev => prev ? { ...prev, channel_banner_url: newUrl } : prev);
  };

  // Set browser tab title
  useEffect(() => {
    if (username) {
      document.title = `${username}TV | MyLiveLinks`;
    }
  }, [username]);

  // Load videos when profile is available
  useEffect(() => {
    if (!profile?.id) return;
    
    const loadVideos = async () => {
      setIsLoading(true);
      try {
        const data = await fetchTVVideos(profile.id);
        setVideos(data);
      } catch (error) {
        console.error('Failed to load TV content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVideos();
  }, [profile?.id]);

  // Featured videos (is_featured flag)
  const featuredVideos = useMemo(() => 
    videos.filter(v => v.is_featured).slice(0, 5),
    [videos]
  );

  // Filter, search, and sort videos
  const filteredVideos = useMemo(() => {
    let result = [...videos];
    
    // Category filter ("all" includes "other", specific categories exclude "other")
    if (activeFilter !== 'all') {
      result = result.filter(v => v.content_type === activeFilter);
    }
    
    // Search filter (title, description, tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.title.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query) ||
        v.tags?.some(tag => tag.toLowerCase().includes(query))
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
      case 'longest':
        result.sort((a, b) => b.duration_seconds - a.duration_seconds);
        break;
      case 'shortest':
        result.sort((a, b) => a.duration_seconds - b.duration_seconds);
        break;
    }
    
    return result;
  }, [videos, activeFilter, searchQuery, sortBy]);

  if (!username) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 2xl:px-10 py-6">
        {/* Back link */}
        <Link
          href={`/${username}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to @{username}
        </Link>

        {/* Channel Banner */}
        {profile && (
          <ChannelBanner
            profile={profile}
            isOwner={isOwner}
            onBannerUpdate={handleBannerUpdate}
          />
        )}

        {/* Creator Context Header */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-4">
            {/* Creator Avatar */}
            <Link href={`/${username}`}>
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 ring-2 ring-purple-500">
                {profile?.avatar_url && (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name || username}
                    width={56}
                    height={56}
                    className="object-cover"
                  />
                )}
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {username}TV
                </h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {videos.length} videos
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {profile?.follower_count?.toLocaleString() || 0} followers
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                isFollowing
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isFollowing ? (
                <><UserCheck className="w-4 h-4" /> Following</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Follow</>
              )}
            </button>
            <Link
              href={`/${username}`}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="About this channel"
            >
              <Info className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Featured Row */}
        {featuredVideos.length > 0 && activeFilter === 'all' && !searchQuery && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Featured</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              {featuredVideos.map(video => (
                <FeaturedVideoCard key={video.id} video={video} username={username} />
              ))}
            </div>
          </div>
        )}

        {/* Filter Bar - Same layout as /replay */}
        <div className="space-y-3 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search @${username}TV...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-transparent focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            )}
          </div>

          {/* Row 1: Sort Toggle - stretch on mobile */}
          <div className="flex items-center gap-2">
            {SORT_OPTIONS.slice(0, 2).map((option) => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id)}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-full text-sm font-semibold transition-all text-center ${
                  sortBy === option.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Row 2: Category Chips - horizontal scroll */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {CONTENT_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as ContentFilter)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeFilter === filter.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Row 3: Creator Studio + UsernameTV / Playlists - stretch on mobile */}
          <div className="flex items-center gap-2">
            <Link
              href="/creator-studio"
              className="flex-1 md:flex-none flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-pink-500 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all"
            >
              +Creator Studio
            </Link>
            <button
              className="flex-1 md:flex-none px-5 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md text-center"
            >
              {username}TV
            </button>
            <Link
              href="/replay/playlists"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              <ListVideo className="w-4 h-4" />
              Playlists
            </Link>
          </div>
        </div>

        {/* Results count when searching */}
        {searchQuery && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {filteredVideos.length} result{filteredVideos.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}

        {/* Content Area - Playlists tab or Video Grid */}
        {activeFilter === 'playlists' ? (
          profile?.id ? (
            <PlaylistsTab
              profileId={profile.id}
              username={username}
              isOwner={isOwner}
              buttonColor="#8B5CF6"
            />
          ) : (
            <VideoGridSkeleton />
          )
        ) : isLoading ? (
          <VideoGridSkeleton />
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-16">
            <Tv className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery
                ? `No videos matching "${searchQuery}"`
                : activeFilter === 'all'
                  ? 'No videos uploaded yet'
                  : `No ${CONTENT_FILTERS.find(f => f.id === activeFilter)?.label.toLowerCase()} content yet`}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-purple-600 dark:text-purple-400 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} username={username} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
