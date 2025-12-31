'use client';

import { BarChart3, Video, Clock, Eye, TrendingUp, Calendar } from 'lucide-react';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';

interface StreamStats {
  total_streams: number;
  total_minutes_live: number;
  total_viewers: number;
  peak_viewers: number;
  diamonds_earned_lifetime: number;
  diamonds_earned_7d: number;
  followers_gained_from_streams: number;
  last_stream_at?: string;
}

interface StatsCardProps {
  streamStats: StreamStats;
  gifterStatus?: GifterStatus | null;
  totalGiftsSent: number;
  totalGiftsReceived: number;
  cardStyle: React.CSSProperties;
  borderRadiusClass: string;
  accentColor: string;
}

export default function StatsCard({
  streamStats,
  gifterStatus,
  totalGiftsSent,
  totalGiftsReceived,
  cardStyle,
  borderRadiusClass,
  accentColor
}: StatsCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes}m`;
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  return (
    <div className={`${borderRadiusClass} shadow-lg overflow-hidden`} style={cardStyle}>
      <div className="p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <BarChart3 size={20} style={{ color: accentColor }} />
          Statistics
        </h3>
        
        {/* Stream Stats */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">
            Streaming
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-center mb-2">
                <Video size={20} style={{ color: accentColor }} />
              </div>
              <div className="text-2xl font-bold">{streamStats.total_streams}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Streams</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-center mb-2">
                <Clock size={20} style={{ color: accentColor }} />
              </div>
              <div className="text-2xl font-bold">
                {formatDuration(streamStats.total_minutes_live)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Time Live</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-center mb-2">
                <Eye size={20} style={{ color: accentColor }} />
              </div>
              <div className="text-2xl font-bold">{streamStats.total_viewers.toLocaleString()}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Views</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-center mb-2">
                <TrendingUp size={20} style={{ color: accentColor }} />
              </div>
              <div className="text-2xl font-bold">{streamStats.peak_viewers}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Peak Viewers</div>
            </div>
          </div>
        </div>
        
        {/* Earnings Stats */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">
            Earnings
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="text-3xl font-bold" style={{ color: accentColor }}>
                💎 {streamStats.diamonds_earned_lifetime.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Lifetime Diamonds
              </div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
              <div className="text-3xl font-bold" style={{ color: accentColor }}>
                💎 {streamStats.diamonds_earned_7d.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Last 7 Days
              </div>
            </div>
          </div>
        </div>
        
        {/* Gifting Stats */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">
            Gifting
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              {gifterStatus && Number(gifterStatus.lifetime_coins ?? 0) > 0 ? (
                <div className="flex flex-col items-center justify-center gap-1">
                  <TierBadge tier_key={gifterStatus.tier_key} level={gifterStatus.level_in_tier} size="sm" />
                  <div className="text-xs text-gray-500 dark:text-gray-400">Gifter Level</div>
                </div>
              ) : (
                <>
                  <div className="text-xs text-gray-500 dark:text-gray-400">No gifter level</div>
                </>
              )}
            </div>
            
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-2xl font-bold">
                {totalGiftsSent.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Sent</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-2xl font-bold">
                {totalGiftsReceived.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Received</div>
            </div>
          </div>
        </div>
        
        {/* Last Stream */}
        {streamStats.last_stream_at && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar size={16} />
            <span>Last streamed: {formatDate(streamStats.last_stream_at)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

