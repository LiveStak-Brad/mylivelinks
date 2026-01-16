'use client';

/**
 * SeriesTab - Series Content Profile Tab
 * 
 * Displays series content grouped by series title with horizontal episode scroll.
 * Each series shows: Series Title (header) → Horizontal scroll of Episode 1 → Episode N
 * 
 * REAL DATA: Fetches from creator_studio_items via get_public_creator_studio_items RPC
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Layers, Play, ChevronRight, ChevronLeft } from 'lucide-react';

interface SeriesEpisode {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration: string;
  duration_seconds?: number;
  episode_number: number;
  season_number?: number;
  published_at: string;
}

interface SeriesGroup {
  series_id: string;
  series_title: string;
  episodes: SeriesEpisode[];
}

interface SeriesTabProps {
  profileId: string;
  username: string;
  isOwner?: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
}

function formatDurationSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(duration: string): string {
  return duration;
}

function EpisodeCard({ 
  episode, 
  username, 
  seriesSlug,
}: { 
  episode: SeriesEpisode; 
  username: string;
  seriesSlug: string;
}) {
  const episodeUrl = `/${username}/series/${seriesSlug}/episode-${episode.episode_number}`;

  return (
    <Link
      href={episodeUrl}
      className="group flex-shrink-0 w-[280px] bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-purple-500/50 transition-all cursor-pointer block"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20">
        {episode.thumbnail_url ? (
          <img 
            src={episode.thumbnail_url} 
            alt={episode.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Episode number badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded">
          Ep {episode.episode_number}
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
          {formatDuration(episode.duration)}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">
          {episode.title}
        </h4>
        {episode.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
            {episode.description}
          </p>
        )}
      </div>
    </Link>
  );
}

function SeriesRow({ 
  series, 
  username,
}: { 
  series: SeriesGroup; 
  username: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const seriesSlug = series.series_id.replace('series-', '');

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, []);

  // Sort episodes by episode number
  const sortedEpisodes = useMemo(() => 
    [...series.episodes].sort((a, b) => a.episode_number - b.episode_number),
    [series.episodes]
  );

  return (
    <div className="mb-8">
      {/* Series Title Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {series.series_title}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({sortedEpisodes.length} episode{sortedEpisodes.length !== 1 ? 's' : ''})
          </span>
        </div>
        
        {/* Scroll controls */}
        {sortedEpisodes.length > 2 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Episode Scroll */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {sortedEpisodes.map((episode) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            username={username}
            seriesSlug={seriesSlug}
          />
        ))}
      </div>
    </div>
  );
}

export default function SeriesTab({
  profileId,
  username,
  isOwner = false,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
}: SeriesTabProps) {
  const [seriesGroups, setSeriesGroups] = useState<SeriesGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSeries = async () => {
      setIsLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        
        const { data, error } = await supabase.rpc('get_public_creator_studio_items', {
          p_profile_id: profileId,
          p_item_type: 'series_episode',
          p_limit: 100,
          p_offset: 0,
        });
        
        if (error) {
          console.error('Error fetching series:', error);
          setSeriesGroups([]);
          return;
        }
        
        if (!data || data.length === 0) {
          setSeriesGroups([]);
          return;
        }
        
        // Group episodes by series_id
        const groupedMap = new Map<string, SeriesGroup>();
        
        for (const item of data) {
          const seriesId = item.series_id || item.id;
          const seriesTitle = item.series_title || item.title || 'Untitled Series';
          
          if (!groupedMap.has(seriesId)) {
            groupedMap.set(seriesId, {
              series_id: seriesId,
              series_title: seriesTitle,
              episodes: [],
            });
          }
          
          const group = groupedMap.get(seriesId)!;
          group.episodes.push({
            id: item.id,
            title: item.title || 'Untitled Episode',
            description: item.description,
            thumbnail_url: item.thumb_url || item.artwork_url,
            duration: formatDurationSeconds(item.duration_seconds || 0),
            duration_seconds: item.duration_seconds,
            episode_number: item.episode_number || group.episodes.length + 1,
            season_number: item.season_number || 1,
            published_at: item.created_at,
          });
        }
        
        setSeriesGroups(Array.from(groupedMap.values()));
      } catch (error) {
        console.error('Failed to fetch series content:', error);
        setSeriesGroups([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeries();
  }, [profileId]);

  if (isLoading) {
    return (
      <div 
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="flex items-center gap-3 mb-6">
          <Layers className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Series</h2>
        </div>
        <div className="animate-pulse space-y-6">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
              <div className="flex gap-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="w-[280px] flex-shrink-0">
                    <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (seriesGroups.length === 0) {
    return (
      <div 
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Series</h2>
          </div>
          {isOwner && (
            <Link
              href="/creator-studio/series"
              className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
            >
              <span>+</span> Creator Studio
            </Link>
          )}
        </div>
        <div className="text-center py-12">
          <Layers className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">No Series Yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            {isOwner ? 'Create your first series' : 'Series will appear here when available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Series</h2>
        </div>
        
        {isOwner && (
          <Link
            href="/creator-studio/series"
            className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
          >
            <span>+</span> Creator Studio
          </Link>
        )}
      </div>

      {/* Series Groups with Horizontal Episode Scroll */}
      {seriesGroups.map((series) => (
        <SeriesRow
          key={series.series_id}
          series={series}
          username={username}
        />
      ))}
    </div>
  );
}
