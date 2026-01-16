'use client';

/**
 * Replay Home - Global YouTube-like Discovery Page
 * 
 * Route: /replay
 * 
 * Features:
 * - Hero banner with admin upload
 * - Tabs: Videos / Playlists
 * - Category filters
 * - Popular & New content sections
 * - YouTube-style video grid
 * 
 * REAL DATA: Uses get_replay_feed_popular and get_replay_feed_new RPCs
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, ListVideo, Tv, Plus, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import ReplayBanner from '@/components/replay/ReplayBanner';

// Owner UUIDs who can edit the Replay banner
const OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818', '0b47a2d7-43fb-4d38-b321-2d5d0619aabf'];

// Category filter chips (YouTube-style)
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
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
  return `${views} views`;
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
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function VideoCard({ item, allItems }: { item: ReplayItem; allItems?: ReplayItem[] }) {
  const [imageError, setImageError] = useState(false);
  const youtubeId = item.media_url ? extractYoutubeId(item.media_url) : null;
  const thumbnail = item.thumb_url || item.artwork_url || (youtubeId ? getYoutubeThumbnail(youtubeId) : null);
  
  // Build queue parameter from all items for prev/next navigation
  const queueParam = allItems && allItems.length > 1 
    ? `?queue=${allItems.map(i => i.id).join(',')}`
    : '';

  return (
    <Link 
      href={`/replay/${item.owner_username}/${item.id}${queueParam}`}
      className="group block"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 shadow-md group-hover:shadow-xl transition-shadow">
        {!imageError && thumbnail ? (
          <Image
            src={thumbnail}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {item.duration_seconds && item.duration_seconds > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded-md">
            {formatDuration(item.duration_seconds)}
          </div>
        )}
        
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-7 h-7 text-gray-900 ml-1" fill="currentColor" />
          </div>
        </div>
      </div>
      
      <div className="mt-3 flex gap-3">
        <Link href={`/${item.owner_username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-transparent hover:ring-purple-400 transition-all">
            {item.owner_avatar_url ? (
              <Image
                src={item.owner_avatar_url}
                alt={item.owner_display_name || item.owner_username}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                {(item.owner_display_name || item.owner_username)?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {item.title}
          </h3>
          <Link href={`/${item.owner_username}`} className="text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mt-1 block">
            {item.owner_display_name || item.owner_username}
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {formatViews(item.views_count)} • {formatTimeAgo(item.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function VideoCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="mt-3 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-1" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}


type FilterType = 'popular' | 'new';

export default function ReplayHomePage() {
  const [filter, setFilter] = useState<FilterType>('popular');
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [popularItems, setPopularItems] = useState<ReplayItem[]>([]);
  const [newItems, setNewItems] = useState<ReplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        
        // Check if user is owner (by UUID)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if user's UUID is in the owner list
          const isOwner = OWNER_IDS.includes(user.id);
          setIsAdmin(isOwner);
        }
        
        const [popularRes, newRes] = await Promise.all([
          supabase.rpc('get_replay_feed_popular', { p_limit: 20 }),
          supabase.rpc('get_replay_feed_new', { p_limit: 20 }),
        ]);
        
        if (popularRes.data) setPopularItems(popularRes.data);
        if (newRes.data) setNewItems(newRes.data);
      } catch (error) {
        console.error('Failed to load replay content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, []);

  // Filter items by category and search
  const baseItems = filter === 'popular' ? popularItems : newItems;
  const filteredByCategory = category === 'all' 
    ? baseItems 
    : baseItems.filter(item => item.item_type === category);
  const displayItems = searchQuery.trim() 
    ? filteredByCategory.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner_display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredByCategory;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-[1800px] mx-auto">
        {/* Hero Banner */}
        <div className="px-4 lg:px-6 pt-4">
          <ReplayBanner isAdmin={isAdmin} />
        </div>

        {/* Filter Bar with Tabs */}
        <div className="sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          <div className="px-4 lg:px-6 py-3 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Replay..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-transparent focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all"
              />
            </div>

            {/* Row 1: Popular/New Toggle - stretch on mobile */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('popular')}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-full text-sm font-semibold transition-all text-center ${
                  filter === 'popular'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Popular
              </button>
              <button
                onClick={() => setFilter('new')}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-full text-sm font-semibold transition-all text-center ${
                  filter === 'new'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                New
              </button>
            </div>

            {/* Row 2: Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    category === cat.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Row 3: Creator Studio + REPLAY / Playlists Tabs - stretch on mobile */}
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
                REPLAY
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
        </div>

        {/* Main Content Grid */}
        <div className="px-4 lg:px-6 py-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Tv className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {category === 'all' ? 'No videos yet' : `No ${CATEGORIES.find(c => c.id === category)?.label || 'videos'} yet`}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Be the first to upload content to Replay!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {displayItems.map((item) => (
                <VideoCard key={item.id} item={item} allItems={displayItems} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
