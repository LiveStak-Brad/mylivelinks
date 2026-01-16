'use client';

/**
 * Replay Category Page
 * 
 * Route: /replay/categories/:category
 * 
 * Shows content filtered by category (music_video, podcast, etc.)
 * 
 * REAL DATA: Uses get_replay_feed_popular with category filter
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Play, ArrowLeft, TrendingUp, Clock, Tv } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const CATEGORY_INFO: Record<string, { label: string; icon: string; description: string }> = {
  'music_video': { label: 'Music Videos', icon: '🎵', description: 'Official music videos and performances' },
  'podcast': { label: 'Podcasts', icon: '🎙️', description: 'Long-form conversations and discussions' },
  'series_episode': { label: 'Series', icon: '📺', description: 'Episodic content and web series' },
  'movie': { label: 'Movies', icon: '🎬', description: 'Full-length films and documentaries' },
  'education': { label: 'Education', icon: '📚', description: 'Tutorials, courses, and learning content' },
  'comedy_special': { label: 'Comedy', icon: '😂', description: 'Stand-up specials and comedy sketches' },
  'vlog': { label: 'Vlogs', icon: '📹', description: 'Personal vlogs and day-in-the-life content' },
};

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

function VideoCard({ item }: { item: ReplayItem }) {
  const [imageError, setImageError] = useState(false);
  const youtubeId = item.media_url ? extractYoutubeId(item.media_url) : null;
  const thumbnail = item.thumb_url || item.artwork_url || (youtubeId ? getYoutubeThumbnail(youtubeId) : null);

  return (
    <Link 
      href={`/replay/${item.owner_username}/${item.id}`}
      className="group block"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800">
        {!imageError && thumbnail ? (
          <Image
            src={thumbnail}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {item.duration_seconds && item.duration_seconds > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
            {formatDuration(item.duration_seconds)}
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
      
      <div className="mt-3 flex gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          {item.owner_avatar_url ? (
            <Image
              src={item.owner_avatar_url}
              alt={item.owner_display_name || item.owner_username}
              width={36}
              height={36}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
              {(item.owner_display_name || item.owner_username)?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {item.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {item.owner_display_name || item.owner_username}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
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

export default function ReplayCategoryPage() {
  const params = useParams<{ category: string }>();
  const category = params?.category ?? '';
  const categoryInfo = CATEGORY_INFO[category];
  
  const [filter, setFilter] = useState<FilterType>('popular');
  const [items, setItems] = useState<ReplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      if (!category) return;
      
      setIsLoading(true);
      try {
        const supabase = createClient();
        
        const rpcName = filter === 'popular' ? 'get_replay_feed_popular' : 'get_replay_feed_new';
        const { data, error } = await supabase.rpc(rpcName, { 
          p_category: category,
          p_limit: 24 
        });
        
        if (error) {
          console.error('Failed to load category content:', error);
        } else if (data) {
          setItems(data);
        }
      } catch (error) {
        console.error('Failed to load category content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [category, filter]);

  if (!categoryInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Tv className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Category not found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The category you're looking for doesn't exist.
          </p>
          <Link
            href="/replay"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Replay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 2xl:px-10 py-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/replay"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Replay
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-500/30 dark:to-pink-500/30 flex items-center justify-center text-3xl">
              {categoryInfo.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{categoryInfo.label}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{categoryInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('popular')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'popular'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Popular
          </button>
          <button
            onClick={() => setFilter('new')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'new'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            New
          </button>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{categoryInfo.icon}</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No {categoryInfo.label.toLowerCase()} yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Be the first to upload content in this category!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {items.map((item) => (
              <VideoCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
