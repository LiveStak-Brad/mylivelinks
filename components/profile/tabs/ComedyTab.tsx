'use client';

/**
 * ComedyTab - Comedy Content Profile Tab
 * 
 * Displays comedy-specific content: stand-up specials, comedy clips, sketches.
 * Uses the shared VideoGrid component for YouTube-familiar UX.
 * 
 * REAL DATA: Fetches from creator_studio_items via get_public_creator_studio_items RPC
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VideoGrid, { VideoItem } from './VideoGrid';
import { Laugh } from 'lucide-react';

interface ComedyTabProps {
  profileId: string;
  username: string;
  isOwner?: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
}

export default function ComedyTab({
  profileId,
  username,
  isOwner = false,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
}: ComedyTabProps) {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        
        const { data, error } = await supabase.rpc('get_public_creator_studio_items', {
          p_profile_id: profileId,
          p_item_type: 'comedy_special',
          p_limit: 50,
          p_offset: 0,
        });
        
        if (error) {
          console.error('Error fetching comedy videos:', error);
          setVideos([]);
          return;
        }
        
        if (!data || data.length === 0) {
          setVideos([]);
          return;
        }
        
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
        
        const transformedVideos: VideoItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.title || 'Untitled',
          thumbnail_url: item.thumb_url || item.artwork_url || '',
          duration: formatDuration(item.duration_seconds || 0),
          views: 0,
          published_at: item.created_at,
          content_type: 'comedy' as const,
          creator: { id: profileId, username, display_name: username, avatar_url: '' },
        }));
        
        setVideos(transformedVideos);
      } catch (error) {
        console.error('Failed to fetch comedy content:', error);
        setVideos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [profileId, username]);

  const handleVideoClick = (video: VideoItem) => {
    router.push(`/replay/${username}/${video.id}`);
  };

  return (
    <div 
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Laugh className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Comedy
          </h2>
        </div>
        
        {isOwner && (
          <a
            href="/creator-studio/upload?type=comedy"
            className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
          >
            <span>+</span> Creator Studio
          </a>
        )}
      </div>

      {/* Video Grid */}
      <VideoGrid
        videos={videos}
        isLoading={isLoading}
        emptyMessage="No comedy content yet"
        showCreator={false}
        onVideoClick={handleVideoClick}
        username={username}
      />
    </div>
  );
}
