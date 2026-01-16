/**
 * Creator Studio Section
 * 
 * CREATOR STUDIO PROFILE WIRING - GENERIC SECTION COMPONENT
 * ==========================================================
 * This is the primary component for displaying Creator Studio content on profiles.
 * 
 * Source of Truth: creator_studio_items table
 * RPC: get_public_creator_studio_items (filters: status='ready', visibility='public')
 * 
 * Supported item types: podcast, movie, series_episode, education
 * (music_video uses MusicVideos.tsx for legacy compatibility)
 * 
 * CANONICAL ROUTES:
 * - /[username]/podcast/[id]
 * - /[username]/movie/[id]
 * - /[username]/education/[id]
 * - /[username]/series/[seriesSlug]/[episodeSlug]
 * 
 * Clicking any item card navigates to its canonical route.
 * See docs/CREATOR_STUDIO_PROFILE_WIRING.md for full documentation.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Play, 
  ExternalLink, 
  Music2, 
  Film, 
  Mic, 
  Clapperboard, 
  BookOpen,
  Layers,
  Clock,
  Heart,
} from 'lucide-react';
import { 
  useCreatorStudioItems, 
  buildCreatorStudioItemUrl, 
  hasCanonicalRoute,
  type CreatorStudioItem,
  type CreatorStudioItemType,
} from '@/hooks/useCreatorStudioItems';

interface CreatorStudioSectionProps {
  profileId: string;
  username: string;
  itemType: CreatorStudioItemType;
  title: string;
  emptyTitle?: string;
  emptyText?: string;
  isOwner?: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  buttonColor?: string;
}

function getItemTypeIcon(type: CreatorStudioItemType) {
  switch (type) {
    case 'music': return Music2;
    case 'music_video': return Film;
    case 'podcast': return Mic;
    case 'movie': return Clapperboard;
    case 'education': return BookOpen;
    case 'series_episode': return Layers;
    default: return Film;
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function ItemCard({ 
  item, 
  username,
  onPlay,
}: { 
  item: CreatorStudioItem; 
  username: string;
  onPlay?: (item: CreatorStudioItem) => void;
}) {
  const Icon = getItemTypeIcon(item.item_type);
  const canonicalUrl = buildCreatorStudioItemUrl(username, item);
  const hasRoute = hasCanonicalRoute(item.item_type);
  const thumbnailUrl = item.thumb_url || item.artwork_url;

  // Wrap entire card in Link if has canonical route
  const CardWrapper = hasRoute ? Link : 'div';
  const cardProps = hasRoute ? { href: canonicalUrl } : {};

  return (
    <CardWrapper 
      {...cardProps as any}
      className="group relative bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-purple-500/50 transition-all cursor-pointer block"
    >
      {/* Thumbnail / Artwork */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
        )}
        
        {/* Play overlay - shows on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        {item.duration_seconds && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
            {formatDuration(item.duration_seconds)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
          {item.title}
        </h3>
        
        {item.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
            {item.description}
          </p>
        )}

        {/* Tags/Categories for Movies & Education */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-medium rounded-full"
              >
                #{tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-gray-400">+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {item.likes_count > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {item.likes_count}
              </span>
            )}
            {item.duration_seconds && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(item.duration_seconds)}
              </span>
            )}
          </div>

          {hasRoute && (
            <span className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
              Watch now
              <ExternalLink className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </CardWrapper>
  );
}

export default function CreatorStudioSection({
  profileId,
  username,
  itemType,
  title,
  emptyTitle = 'No content yet',
  emptyText = 'Check back later for new content.',
  isOwner = false,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  buttonColor = '#DB2777',
}: CreatorStudioSectionProps) {
  const { items, loading, error } = useCreatorStudioItems({
    profileId,
    itemType,
  });

  const [playingItem, setPlayingItem] = useState<CreatorStudioItem | null>(null);

  const handlePlay = (item: CreatorStudioItem) => {
    setPlayingItem(item);
  };

  const handleClosePlayer = () => {
    setPlayingItem(null);
  };

  if (loading) {
    return (
      <div
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-red-200/50 dark:border-red-700/50 shadow-lg mb-6`}
        style={cardStyle}
      >
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load content</p>
      </div>
    );
  }

  // Build type-specific upload URL
  const getUploadUrl = () => {
    // Series uses series builder, others use upload with type param
    if (itemType === 'series_episode') return '/creator-studio/series';
    return `/creator-studio/upload?type=${itemType}`;
  };

  const getAddLabel = () => {
    return '+ Creator Studio';
  };

  if (items.length === 0) {
    return (
      <div
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 font-medium">{emptyTitle}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{emptyText}</p>
          {isOwner && (
            <Link
              href={getUploadUrl()}
              className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: buttonColor }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Creator Studio
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {isOwner && (
          <Link
            href={getUploadUrl()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Creator Studio
          </Link>
        )}
      </div>

      {/* Inline Player (if playing) */}
      {playingItem && (
        <div className="mb-4 relative">
          <button
            onClick={handleClosePlayer}
            className="absolute top-2 right-2 z-10 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
          >
            ✕
          </button>
          {playingItem.media_url?.includes('youtube') ? (
            <div className="aspect-video rounded-xl overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${extractYoutubeId(playingItem.media_url)}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : playingItem.item_type === 'music' || playingItem.item_type === 'podcast' ? (
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-4">
                {playingItem.artwork_url && (
                  <img 
                    src={playingItem.artwork_url} 
                    alt={playingItem.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{playingItem.title}</p>
                  <audio 
                    src={playingItem.media_url || ''} 
                    controls 
                    autoPlay
                    className="w-full mt-2"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <video
                src={playingItem.media_url || ''}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>
          )}
          
          {/* Link to full page */}
          {hasCanonicalRoute(playingItem.item_type) && (
            <div className="mt-2 text-center">
              <Link
                href={buildCreatorStudioItemUrl(username, playingItem)}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                Open full page →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            username={username}
            onPlay={handlePlay}
          />
        ))}
      </div>
    </div>
  );
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^?&/]+)/i);
  return match?.[1] || null;
}
