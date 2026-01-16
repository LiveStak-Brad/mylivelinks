'use client';

/**
 * Public Replay Playlists (PRP) Page
 * 
 * Route: /replay/playlists
 * 
 * Shows a deduped feed of playlist items:
 * - Same youtube_video_id appears only once
 * - First curator to add gets credit
 * 
 * REAL DATA: Uses get_prp_feed_deduped RPC
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, ListVideo, Tv, Plus, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import ReplayBanner from '@/components/replay/ReplayBanner';

// Owner UUIDs who can edit the Replay banner
const OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818', '0b47a2d7-43fb-4d38-b321-2d5d0619aabf'];

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

interface PRPItem {
  item_id: string;
  youtube_video_id: string | null;
  title: string | null;
  description: string | null;
  thumb_url: string | null;
  media_url: string | null;
  duration_seconds: number;
  views_count: number;
  created_at: string;
  playlist_id: string;
  playlist_title: string;
  curator_profile_id: string;
  curator_username: string;
  curator_display_name: string | null;
  curator_avatar_url: string | null;
  first_added_at: string;
  item_type: string;
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

function PRPVideoCard({ item }: { item: PRPItem }) {
  const [imageError, setImageError] = useState(false);
  const thumbnail = item.thumb_url || (item.youtube_video_id ? getYoutubeThumbnail(item.youtube_video_id) : null);

  return (
    <div className="group">
      {/* Video link - opens with playlist context for prev/next */}
      <Link 
        href={`/replay/${item.curator_username}/${item.youtube_video_id || item.item_id}?playlist=${item.playlist_id}`}
        className="block"
      >
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800">
          {!imageError && thumbnail ? (
            <Image
              src={thumbnail}
              alt={item.title || 'Video'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-12 h-12 text-gray-400" />
            </div>
          )}
          
          {item.duration_seconds > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
              {formatDuration(item.duration_seconds)}
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      </Link>
      
      <div className="mt-3 flex gap-3">
        {/* Curator avatar */}
        <Link 
          href={`/${item.curator_username}`}
          className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 hover:ring-2 hover:ring-purple-500 transition-all"
        >
          {item.curator_avatar_url ? (
            <Image
              src={item.curator_avatar_url}
              alt={item.curator_display_name || item.curator_username}
              width={36}
              height={36}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
              {(item.curator_display_name || item.curator_username)?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>
        
        <div className="flex-1 min-w-0">
          <Link 
            href={`/replay/${item.curator_username}/${item.youtube_video_id || item.item_id}?playlist=${item.playlist_id}`}
            className="block"
          >
            <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {item.title || 'Untitled'}
            </h3>
          </Link>
          
          {/* Curator credit */}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Curated by</span>
            <Link 
              href={`/${item.curator_username}`}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              {item.curator_display_name || item.curator_username}
            </Link>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {formatViews(item.views_count)} • Added {formatTimeAgo(item.first_added_at)}
          </p>
          
          {/* Playlist link */}
          <Link
            href={`/${item.curator_username}/playlists/${item.playlist_id}`}
            className="inline-flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
          >
            <ListVideo className="w-3 h-3" />
            {item.playlist_title}
          </Link>
        </div>
      </div>
    </div>
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

export default function PRPPage() {
  const [items, setItems] = useState<PRPItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<'popular' | 'new'>('popular');
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        
        // Check if user is owner (by UUID)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAdmin(OWNER_IDS.includes(user.id));
        }
        
        const { data, error } = await supabase.rpc('get_prp_feed_deduped', { 
          p_limit: 24 
        });
        
        if (error) {
          console.error('Failed to load PRP feed:', error);
        } else if (data) {
          setItems(data);
        }
      } catch (error) {
        console.error('Failed to load PRP content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, []);

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
                placeholder="Search Playlists..."
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

            {/* Row 3: +Create Playlist / REPLAY / Playlists - stretch on mobile */}
            <div className="flex items-center gap-2">
              <Link
                href="/playlists/new"
                className="flex-1 md:flex-none flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-pink-500 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all"
              >
                +Create Playlist
              </Link>
              <Link
                href="/replay"
                className="flex-1 md:flex-none px-5 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-center"
              >
                REPLAY
              </Link>
              <button
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
              >
                <ListVideo className="w-4 h-4" />
                Playlists
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
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
                <ListVideo className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No playlists yet</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                Be the first to create a public playlist and get featured here!
              </p>
              <Link
                href="/replay"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/25"
              >
                Browse REPLAY
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {displayItems.map((item) => (
                <PRPVideoCard key={item.item_id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
