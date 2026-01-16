'use client';

/**
 * RelatedVideos - YouTube-style related videos sidebar
 * 
 * Features:
 * - Compact video cards for sidebar
 * - Click to navigate to video
 * - Shows video metadata
 * 
 * REAL DATA: Fetches from profile_music_videos table
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, SkipBack, SkipForward, Plus } from 'lucide-react';
import { type TVVideoItem } from '@/lib/tv/mockData';
import { createClient } from '@/lib/supabase';

// Helper to extract YouTube video ID from URL
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/i);
  return match?.[1] || null;
}

// Helper to get YouTube thumbnail
function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

interface PlaylistInfo {
  id: string;
  title: string;
  curator_id: string;
  curator_username: string;
  curator_display_name: string;
  curator_avatar_url?: string;
}

interface PlaylistVideoItem {
  id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  position: number;
}

interface RelatedVideosProps {
  currentVideoId: string;
  contentType: string;
  username: string;
  playlistId?: string | null;
  videoQueue?: string[]; // Queue of video IDs for prev/next navigation
  onVideoChange?: (youtubeVideoId: string) => void;
  onAutoNextReady?: (autoNextFn: () => void) => void;
  currentUserId?: string | null;
  onAddSong?: () => void;
}

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

function RelatedVideoCard({ video, username }: { video: TVVideoItem; username: string }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link 
      href={`/replay/${username}/${video.id}`}
      className="flex gap-2 group"
    >
      {/* Thumbnail */}
      <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
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
            <Play className="w-8 h-8 text-gray-400" />
          </div>
        )}
        
        {/* Duration badge */}
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs font-medium px-1 py-0.5 rounded">
          {video.duration}
        </div>
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {video.creator.display_name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatViews(video.views)} • {formatTimeAgo(video.published_at)}
        </p>
      </div>
    </Link>
  );
}

function RelatedVideosSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-2 animate-pulse">
          <div className="w-40 aspect-video rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-1" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Playlist video card with current indicator
function PlaylistVideoCard({ 
  item, 
  username, 
  playlistId,
  isCurrent,
  index,
  onVideoChange 
}: { 
  item: PlaylistVideoItem; 
  username: string;
  playlistId: string;
  isCurrent: boolean;
  index: number;
  onVideoChange?: (youtubeVideoId: string) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const thumbnail = item.thumbnail_url || getYoutubeThumbnail(item.youtube_video_id);
  
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onVideoChange) {
      e.preventDefault();
      onVideoChange(item.youtube_video_id);
    }
  };

  return (
    <Link 
      href={`/replay/${username}/${item.youtube_video_id}?playlist=${playlistId}`}
      onClick={handleClick}
      className={`flex gap-2 group p-1.5 rounded-lg transition-colors ${
        isCurrent 
          ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700' 
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {/* Index number */}
      <div className={`w-6 flex-shrink-0 flex items-center justify-center text-sm ${
        isCurrent ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-400'
      }`}>
        {isCurrent ? '▶' : index + 1}
      </div>
      
      {/* Thumbnail */}
      <div className="relative w-24 aspect-video rounded overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        {!imageError && thumbnail ? (
          <Image
            src={thumbnail}
            alt={item.title}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-6 h-6 text-gray-400" />
          </div>
        )}
        {item.duration_seconds && (
          <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] font-medium px-1 rounded">
            {formatDuration(item.duration_seconds)}
          </div>
        )}
      </div>
      
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-xs font-medium line-clamp-2 ${
          isCurrent 
            ? 'text-purple-700 dark:text-purple-300' 
            : 'text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400'
        }`}>
          {item.title}
        </h4>
      </div>
    </Link>
  );
}

export default function RelatedVideos({ currentVideoId, contentType, username, playlistId, videoQueue, onVideoChange, onAutoNextReady, currentUserId, onAddSong }: RelatedVideosProps) {
  const [videos, setVideos] = useState<TVVideoItem[]>([]);
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideoItem[]>([]);
  const [queueVideos, setQueueVideos] = useState<TVVideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        
        // If video queue provided (from /replay feed), load those videos
        if (videoQueue && videoQueue.length > 0) {
          // Fetch video details for all queue IDs
          const { data: queueData } = await supabase
            .from('creator_studio_items')
            .select('*, profiles:owner_profile_id(id, username, display_name, avatar_url)')
            .in('id', videoQueue);
          
          if (queueData && queueData.length > 0) {
            const transformed: TVVideoItem[] = queueData.map((item: any) => {
              const youtubeId = item.media_url ? extractYoutubeId(item.media_url) : null;
              return {
                id: item.id,
                title: item.title,
                description: item.description || '',
                thumbnail_url: item.thumb_url || item.artwork_url || (youtubeId ? getYoutubeThumbnail(youtubeId) : ''),
                video_url: item.media_url || '',
                duration: '',
                duration_seconds: item.duration_seconds || 0,
                views: 0,
                likes: 0,
                published_at: item.created_at,
                content_type: item.item_type || 'other',
                creator: {
                  id: item.profiles?.id || '',
                  username: item.profiles?.username || '',
                  display_name: item.profiles?.display_name || item.profiles?.username || '',
                  avatar_url: item.profiles?.avatar_url || '',
                  subscriber_count: 0,
                },
              };
            });
            // Sort by original queue order
            const sortedVideos = videoQueue
              .map(id => transformed.find(v => v.id === id))
              .filter((v): v is TVVideoItem => v !== undefined);
            setQueueVideos(sortedVideos);
          }
          setIsLoading(false);
          return;
        }
        
        // If playlist ID provided, load playlist info and videos
        if (playlistId) {
          // Get playlist with curator info
          const { data: playlist } = await supabase
            .from('replay_playlists')
            .select('*, profiles!inner(username, display_name, avatar_url)')
            .eq('id', playlistId)
            .single();
          
          if (playlist) {
            setPlaylistInfo({
              id: playlist.id,
              title: playlist.title,
              curator_id: playlist.profile_id,
              curator_username: playlist.profiles.username,
              curator_display_name: playlist.profiles.display_name || playlist.profiles.username,
              curator_avatar_url: playlist.profiles.avatar_url,
            });
            
            // Get playlist items
            const { data: items } = await supabase
              .from('replay_playlist_items')
              .select('*')
              .eq('playlist_id', playlistId)
              .order('position', { ascending: true });
            
            if (items) {
              setPlaylistVideos(items.map((item, idx) => ({
                id: item.id,
                youtube_video_id: item.youtube_video_id,
                title: item.title || 'Untitled',
                thumbnail_url: item.thumbnail_url,
                duration_seconds: item.duration_seconds,
                position: item.position ?? idx,
              })));
            }
          }
          setIsLoading(false);
          return;
        }
        
        // Otherwise load related videos (original behavior)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('username', username)
          .single();
        
        if (!profile) {
          setVideos([]);
          return;
        }
        
        const { data: musicVideos } = await supabase
          .from('profile_music_videos')
          .select('*')
          .eq('profile_id', profile.id)
          .neq('id', currentVideoId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (musicVideos && musicVideos.length > 0) {
          const transformed: TVVideoItem[] = musicVideos.map((mv) => {
            const youtubeId = mv.youtube_id || extractYoutubeId(mv.video_url);
            return {
              id: mv.id,
              title: mv.title,
              description: mv.description || '',
              thumbnail_url: mv.thumbnail_url || (youtubeId ? getYoutubeThumbnail(youtubeId) : ''),
              video_url: mv.video_url,
              duration: '',
              duration_seconds: 0,
              views: mv.views_count || 0,
              likes: 0,
              published_at: mv.created_at,
              content_type: 'music_video',
              creator: {
                id: profile.id,
                username: profile.username,
                display_name: profile.display_name || profile.username,
                avatar_url: profile.avatar_url || '',
                subscriber_count: 0,
              },
            };
          });
          setVideos(transformed);
        } else {
          setVideos([]);
        }
      } catch (error) {
        console.error('Failed to load content:', error);
        setVideos([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [currentVideoId, contentType, username, playlistId, videoQueue]);

  // Find current video index for queue navigation
  const queueCurrentIndex = useMemo(() => {
    return queueVideos.findIndex(v => v.id === currentVideoId);
  }, [queueVideos, currentVideoId]);

  const queuePrevVideo = queueCurrentIndex > 0 ? queueVideos[queueCurrentIndex - 1] : null;
  const queueNextVideo = queueCurrentIndex < queueVideos.length - 1 ? queueVideos[queueCurrentIndex + 1] : null;

  // Find current video index and prev/next videos for playlist navigation
  const currentIndex = useMemo(() => {
    return playlistVideos.findIndex(v => v.youtube_video_id === currentVideoId);
  }, [playlistVideos, currentVideoId]);

  const prevVideo = currentIndex > 0 ? playlistVideos[currentIndex - 1] : null;
  const nextVideo = currentIndex < playlistVideos.length - 1 ? playlistVideos[currentIndex + 1] : null;

  const handlePrev = () => {
    if (prevVideo && onVideoChange) {
      onVideoChange(prevVideo.youtube_video_id);
    }
  };

  const handleNext = () => {
    if (nextVideo && onVideoChange) {
      onVideoChange(nextVideo.youtube_video_id);
    }
  };

  // Expose auto-next function to parent for video end handling
  // Use refs to avoid stale closures
  const nextVideoRef = useRef(nextVideo);
  const queueNextVideoRef = useRef(queueNextVideo);
  const onVideoChangeRef = useRef(onVideoChange);
  
  // Keep refs updated (no deps - runs every render to keep refs fresh)
  nextVideoRef.current = nextVideo;
  queueNextVideoRef.current = queueNextVideo;
  onVideoChangeRef.current = onVideoChange;
  
  // Register auto-next callback for playlist mode
  useEffect(() => {
    if (onAutoNextReady && playlistId && playlistVideos.length > 0) {
      const autoNextFn = () => {
        if (nextVideoRef.current && onVideoChangeRef.current) {
          onVideoChangeRef.current(nextVideoRef.current.youtube_video_id);
        }
      };
      onAutoNextReady(() => autoNextFn);
    }
  }, [onAutoNextReady, playlistId, playlistVideos.length]);
  
  // Register auto-next callback for queue mode
  useEffect(() => {
    if (onAutoNextReady && videoQueue && videoQueue.length > 0 && queueVideos.length > 0) {
      const autoNextFn = () => {
        if (queueNextVideoRef.current && onVideoChangeRef.current) {
          const youtubeId = extractYoutubeId(queueNextVideoRef.current.video_url);
          if (youtubeId) {
            onVideoChangeRef.current(youtubeId);
          }
        }
      };
      onAutoNextReady(() => autoNextFn);
    }
  }, [onAutoNextReady, videoQueue, queueVideos.length]);

  // Queue mode (from /replay feed)
  if (videoQueue && videoQueue.length > 0 && queueVideos.length > 0) {
    const handleQueuePrev = () => {
      if (queuePrevVideo && onVideoChange) {
        const youtubeId = extractYoutubeId(queuePrevVideo.video_url);
        if (youtubeId) onVideoChange(youtubeId);
      }
    };

    const handleQueueNext = () => {
      if (queueNextVideo && onVideoChange) {
        const youtubeId = extractYoutubeId(queueNextVideo.video_url);
        if (youtubeId) onVideoChange(youtubeId);
      }
    };

    return (
      <div>
        {/* Queue header - same style as playlist */}
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Up Next
          </p>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Replay Feed
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {queueVideos.length} videos • {queueCurrentIndex + 1} of {queueVideos.length}
          </p>
          
          {/* Previous / Next buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleQueuePrev}
              disabled={!queuePrevVideo}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                queuePrevVideo
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              <SkipBack className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={handleQueueNext}
              disabled={!queueNextVideo}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                queueNextVideo
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              Next
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Queue videos - horizontal on mobile, vertical on desktop */}
        {isLoading ? (
          <RelatedVideosSkeleton />
        ) : (
          <>
            {/* Mobile: Horizontal scroll */}
            <div className="lg:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                {queueVideos.map((video, index) => {
                  const youtubeId = extractYoutubeId(video.video_url);
                  const isCurrent = video.id === currentVideoId;
                  return (
                    <button
                      key={video.id}
                      onClick={() => youtubeId && onVideoChange?.(youtubeId)}
                      className={`flex-shrink-0 w-36 text-left transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2">
                        <Image
                          src={video.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '')}
                          alt={video.title}
                          fill
                          className="object-cover"
                        />
                        {isCurrent && (
                          <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                            <Play className="w-6 h-6 text-white fill-white" />
                          </div>
                        )}
                      </div>
                      <h4 className={`text-xs font-medium line-clamp-2 ${
                        isCurrent 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {video.title}
                      </h4>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Desktop: Vertical list */}
            <div className="hidden lg:block space-y-3">
              {queueVideos.map(video => (
                <RelatedVideoCard key={video.id} video={video} username={video.creator.username} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Playlist mode
  if (playlistId && playlistInfo) {
    return (
      <div>
        {/* Playlist header */}
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Playlist
          </p>
          <Link 
            href={`/${playlistInfo.curator_username}`}
            className="flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity"
          >
            {playlistInfo.curator_avatar_url && (
              <Image
                src={playlistInfo.curator_avatar_url}
                alt={playlistInfo.curator_display_name}
                width={24}
                height={24}
                className="rounded-full"
              />
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {playlistInfo.curator_display_name}
            </span>
          </Link>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {playlistInfo.title}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {playlistVideos.length} videos • {currentIndex + 1} of {playlistVideos.length}
          </p>
          
          {/* Previous / Next buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handlePrev}
              disabled={!prevVideo}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                prevVideo
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              <SkipBack className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!nextVideo}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                nextVideo
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              Next
              <SkipForward className="w-4 h-4" />
            </button>
            {/* +Song button for playlist owner */}
            {currentUserId && playlistInfo?.curator_id === currentUserId && onAddSong && (
              <button
                onClick={onAddSong}
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Song
              </button>
            )}
          </div>
        </div>
        
        {/* Playlist videos - horizontal on mobile, vertical on desktop */}
        {isLoading ? (
          <RelatedVideosSkeleton />
        ) : playlistVideos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No videos in playlist</p>
        ) : (
          <>
            {/* Mobile: Horizontal scroll */}
            <div className="lg:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                {playlistVideos.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => onVideoChange?.(item.youtube_video_id)}
                    className={`flex-shrink-0 w-36 text-left transition-opacity ${
                      item.youtube_video_id === currentVideoId ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2">
                      <Image
                        src={item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_video_id}/hqdefault.jpg`}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                      {item.youtube_video_id === currentVideoId && (
                        <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <h4 className={`text-xs font-medium line-clamp-2 ${
                      item.youtube_video_id === currentVideoId 
                        ? 'text-purple-600 dark:text-purple-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {item.title}
                    </h4>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Desktop: Vertical list */}
            <div className="hidden lg:block space-y-1">
              {playlistVideos.map((item, index) => (
                <PlaylistVideoCard 
                  key={item.id} 
                  item={item} 
                  username={username}
                  playlistId={playlistId}
                  isCurrent={item.youtube_video_id === currentVideoId}
                  index={index}
                  onVideoChange={onVideoChange}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Related videos mode (original)
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        Related Videos
      </h2>
      
      {isLoading ? (
        <RelatedVideosSkeleton />
      ) : videos.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No related videos found</p>
      ) : (
        <div className="space-y-3">
          {videos.map(video => (
            <RelatedVideoCard key={video.id} video={video} username={username} />
          ))}
        </div>
      )}
    </div>
  );
}
