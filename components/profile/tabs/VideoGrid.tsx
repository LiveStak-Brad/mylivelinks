'use client';

/**
 * VideoGrid - Reusable YouTube-style video grid component
 * 
 * Used by [Username]TV and individual category tabs.
 * Displays video thumbnails in a responsive grid with YouTube-familiar UX.
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Clock, Eye } from 'lucide-react';

export interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: string; // e.g., "12:34"
  views: number;
  published_at: string;
  content_type: 'podcast' | 'movie' | 'series' | 'education' | 'comedy' | 'vlog' | 'music_video' | 'other';
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface VideoGridProps {
  videos: VideoItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  showCreator?: boolean; // Show creator info (for discovery, hide for profile tabs)
  onVideoClick?: (video: VideoItem) => void;
  username?: string; // For building video URLs
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
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

function VideoCard({ 
  video, 
  showCreator = false, 
  onClick,
  username 
}: { 
  video: VideoItem; 
  showCreator?: boolean;
  onClick?: (video: VideoItem) => void;
  username?: string;
}) {
  const [imageError, setImageError] = useState(false);
  
  const handleClick = () => {
    if (onClick) {
      onClick(video);
    }
  };

  const videoUrl = username 
    ? `/replay/${username}/${video.id}` 
    : `/replay/${username}/${video.id}`;

  return (
    <div 
      className="group cursor-pointer"
      onClick={handleClick}
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
        
        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          </div>
        </div>
      </div>
      
      {/* Video info */}
      <div className="flex gap-3">
        {showCreator && video.creator.avatar_url && (
          <Link href={`/${video.creator.username}`} onClick={(e) => e.stopPropagation()}>
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
              <Image
                src={video.creator.avatar_url}
                alt={video.creator.display_name}
                width={36}
                height={36}
                className="object-cover"
              />
            </div>
          </Link>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {video.title}
          </h3>
          
          {showCreator && (
            <Link 
              href={`/${video.creator.username}`} 
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {video.creator.display_name}
            </Link>
          )}
          
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatViews(video.views)}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.published_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VideoGrid({
  videos,
  isLoading = false,
  emptyMessage = 'No videos yet',
  showCreator = false,
  onVideoClick,
  username,
}: VideoGridProps) {
  if (isLoading) {
    return <VideoGridSkeleton />;
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-16">
        <Play className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          showCreator={showCreator}
          onClick={onVideoClick}
          username={username}
        />
      ))}
    </div>
  );
}
