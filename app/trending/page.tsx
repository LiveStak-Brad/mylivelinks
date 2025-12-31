'use client';

/**
 * TRENDING LIVE STREAMS PAGE
 * 
 * Drop-in component for /app/trending/page.tsx
 * Shows top trending live streams with auto-refresh
 */

import { useTrendingStreams } from '@/lib/trending-hooks';
import Link from 'next/link';
import Image from 'next/image';
import { RefreshCw, Eye, Heart, MessageCircle, Gift } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TrendingPage() {
  const { streams, isLoading, error, refresh } = useTrendingStreams({
    limit: 20,
    refreshInterval: 10000 // Auto-refresh every 10 seconds
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    setLastUpdate(new Date());
  }, [streams]);

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            Failed to load trending streams. Please try again.
          </p>
          <button
            onClick={refresh}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            🔥 Trending Live
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Top live streams right now · Updates every 10s
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && streams.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="mt-2 h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && streams.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📺</div>
          <h2 className="text-2xl font-semibold mb-2">No trending streams</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Be the first to go live and start trending!
          </p>
          <Link
            href="/go-live"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Start Streaming
          </Link>
        </div>
      )}

      {/* Trending Grid */}
      {streams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {streams.map((stream, index) => (
            <TrendingStreamCard
              key={stream.stream_id}
              stream={stream}
              rank={index + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TrendingStreamCardProps {
  stream: {
    stream_id: string;
    profile_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    started_at: string;
    views_count: number;
    likes_count: number;
    comments_count: number;
    gifts_value: number;
    trending_score: number;
    viewer_count: number;
  };
  rank: number;
}

function TrendingStreamCard({ stream, rank }: TrendingStreamCardProps) {
  const getRankBadge = () => {
    if (rank === 1) return { emoji: '🥇', color: 'bg-yellow-500' };
    if (rank === 2) return { emoji: '🥈', color: 'bg-gray-400' };
    if (rank === 3) return { emoji: '🥉', color: 'bg-orange-600' };
    return { emoji: `#${rank}`, color: 'bg-blue-500' };
  };

  const rankBadge = getRankBadge();

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Calculate stream duration
  const getStreamDuration = () => {
    const start = new Date(stream.started_at);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Link href={`/live/${stream.username}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-video bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg overflow-hidden">
          {/* Thumbnail placeholder with animated gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/80 to-blue-600/80 animate-pulse" />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Rank badge */}
          <div className={`absolute top-2 left-2 ${rankBadge.color} text-white font-bold px-3 py-1 rounded-full text-sm shadow-lg`}>
            {rankBadge.emoji}
          </div>

          {/* Live indicator */}
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>

          {/* Stream duration */}
          <div className="absolute bottom-12 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            {getStreamDuration()}
          </div>

          {/* Stream info */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Image
                src={stream.avatar_url || '/no-profile-pic.png'}
                alt={stream.username}
                width={32}
                height={32}
                className="rounded-full border-2 border-white shadow-lg"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate text-sm">
                  {stream.display_name || stream.username}
                </div>
                <div className="text-xs text-gray-200">
                  @{stream.username}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs text-white/90">
              <div className="flex items-center gap-1" title="Current viewers">
                <Eye className="w-3 h-3" />
                <span className="font-medium">{formatNumber(stream.viewer_count)}</span>
              </div>
              <div className="flex items-center gap-1" title="Total likes">
                <Heart className="w-3 h-3" />
                <span className="font-medium">{formatNumber(stream.likes_count)}</span>
              </div>
              <div className="flex items-center gap-1" title="Total comments">
                <MessageCircle className="w-3 h-3" />
                <span className="font-medium">{formatNumber(stream.comments_count)}</span>
              </div>
              <div className="flex items-center gap-1" title="Gifts received">
                <Gift className="w-3 h-3" />
                <span className="font-medium">{formatNumber(stream.gifts_value)}</span>
              </div>
            </div>
          </div>

          {/* Hover effect */}
          <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors duration-200" />
        </div>

        {/* Trending score (for debugging, can remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-1 text-xs text-gray-400 text-center">
            Score: {stream.trending_score.toFixed(2)}
          </div>
        )}
      </div>
    </Link>
  );
}
