'use client';

/**
 * VideoPlayer - YouTube-style video player component
 * 
 * Features:
 * - HTML5 video with custom controls
 * - Like, share, subscribe actions
 * - Video metadata display
 * 
 * MOCK: Uses mock data from lib/tv/mockData.ts
 * WIRING: Actions will connect to real APIs when ready
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  ThumbsUp,
  ThumbsDown, 
  Share2, 
  Bell,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ListPlus,
} from 'lucide-react';
import type { TVVideoItem } from '@/lib/tv/mockData';
import AddToPlaylistModal from '@/components/playlist/AddToPlaylistModal';
import { ShareModal } from '@/components/ShareModal';

interface VideoPlayerProps {
  video: TVVideoItem;
  onLike?: () => void;
  onShare?: () => void;
  onSubscribe?: () => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  currentUserId?: string | null;
}

// Check if URL is a YouTube embed URL
function isYoutubeUrl(url: string): boolean {
  return url.includes('youtube.com/embed/') || url.includes('youtu.be/');
}

// Extract YouTube video ID from embed URL
function extractYoutubeIdFromEmbed(url: string): string | null {
  if (!url) return null;
  const embedMatch = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/i);
  if (embedMatch?.[1]) return embedMatch[1];
  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/i);
  if (shortMatch?.[1]) return shortMatch[1];
  return null;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
  return `${views} views`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export default function VideoPlayer({ video, onLike, onShare, onSubscribe, onEnded, autoPlay = false, currentUserId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes || 0);
  const [commentCount, setCommentCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(video.creator.subscriber_count || 0);
  
  // Follow state: 'none' | 'following' | 'friends'
  const [followStatus, setFollowStatus] = useState<'none' | 'following' | 'friends'>('none');
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewCount, setViewCount] = useState(video.views || 0);
  const [hasIncrementedView, setHasIncrementedView] = useState(false);

  // Increment view count when video starts playing
  useEffect(() => {
    if (isPlaying && !hasIncrementedView) {
      setHasIncrementedView(true);
      setViewCount(prev => prev + 1);
      
      // Fire and forget - increment in database
      fetch('/api/video/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      }).catch(console.error);
    }
  }, [isPlaying, hasIncrementedView, video.id]);

  // Fetch video stats (likes, comments) and creator follower count
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/video/stats?videoId=${video.id}&creatorId=${video.creator.id}`);
        if (response.ok) {
          const data = await response.json();
          setLikeCount(data.like_count || 0);
          setCommentCount(data.comment_count || 0);
          setFollowerCount(data.follower_count || 0);
          if (data.is_liked_by_me) {
            setIsLiked(true);
          }
        }
      } catch (e) {
        console.error('Failed to fetch video stats:', e);
      }
    };
    
    fetchStats();
  }, [video.id, video.creator.id]);

  // Fetch follow status on mount
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!currentUserId || !video.creator.id || currentUserId === video.creator.id) return;
      
      try {
        const response = await fetch(`/api/profile/follow-status?targetProfileId=${video.creator.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.is_mutual || data.is_friends) {
            setFollowStatus('friends');
          } else if (data.is_following) {
            setFollowStatus('following');
          } else {
            setFollowStatus('none');
          }
        }
      } catch (e) {
        console.error('Failed to fetch follow status:', e);
      }
    };
    
    fetchFollowStatus();
  }, [currentUserId, video.creator.id]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!currentUserId || isFollowLoading) return;
    
    setIsFollowLoading(true);
    try {
      const response = await fetch('/api/profile/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProfileId: video.creator.id }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.action === 'followed') {
          // Check if now mutual
          if (data.is_mutual) {
            setFollowStatus('friends');
          } else {
            setFollowStatus('following');
          }
        } else if (data.action === 'unfollowed') {
          setFollowStatus('none');
        }
      }
    } catch (e) {
      console.error('Failed to toggle follow:', e);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress((current / total) * 100);
      setCurrentTime(formatTime(current));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(formatTime(videoRef.current.duration));
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const newTime = (clickX / width) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleLike = async () => {
    if (!currentUserId || isLikeLoading) return;
    
    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
    setIsLikeLoading(true);
    
    try {
      const response = await fetch('/api/video/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      });
      
      if (!response.ok) {
        // Revert on error
        setIsLiked(wasLiked);
        setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      }
    } catch (e) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      console.error('Failed to toggle like:', e);
    } finally {
      setIsLikeLoading(false);
    }
    
    onLike?.();
  };

  const handleDislike = () => {
    if (!currentUserId) return;
    
    // Toggle dislike - if liked, remove like first
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    }
    setIsDisliked(!isDisliked);
  };

  const isYoutube = isYoutubeUrl(video.video_url);
  const youtubeVideoId = isYoutube ? extractYoutubeIdFromEmbed(video.video_url) : null;
  
  // YouTube player ref and state for auto-next
  const ytPlayerRef = useRef<any>(null);
  const hasTriggeredEndRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset end trigger when video changes
  useEffect(() => {
    hasTriggeredEndRef.current = false;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, [video.id]);

  // Handle YouTube player ready - start polling for near-end
  const onYouTubeReady = useCallback((event: YouTubeEvent) => {
    ytPlayerRef.current = event.target;
    
    // Poll every 500ms to check if near end
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      if (hasTriggeredEndRef.current || !ytPlayerRef.current) return;
      try {
        const current = ytPlayerRef.current.getCurrentTime();
        const total = ytPlayerRef.current.getDuration();
        if (total > 0 && current > 0 && (total - current) <= 1) {
          hasTriggeredEndRef.current = true;
          if (onEnded) onEnded();
        }
      } catch (e) {}
    }, 500);
  }, [onEnded]);

  // Handle YouTube state change - also catch ended state
  const onYouTubeStateChange = useCallback((event: YouTubeEvent) => {
    // 0 = ended
    if (event.data === 0 && !hasTriggeredEndRef.current) {
      hasTriggeredEndRef.current = true;
      if (onEnded) onEnded();
    }
  }, [onEnded]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return (
    <div className="w-full">
      {/* Video Container */}
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
        {isYoutube && youtubeVideoId ? (
          // YouTube player using react-youtube (same pattern as mobile)
          <YouTube
            key={video.id}
            videoId={youtubeVideoId}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: autoPlay ? 1 : 0,
                rel: 0,
                modestbranding: 1,
              },
            }}
            onReady={onYouTubeReady}
            onStateChange={onYouTubeStateChange}
            className="w-full h-full"
            iframeClassName="w-full h-full"
          />
        ) : (
          // Native video player for uploads
          <>
            <video
              ref={videoRef}
              src={video.video_url}
              poster={video.thumbnail_url}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
            />
            
            {/* Play/Pause overlay */}
            {!isPlaying && (
              <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={togglePlay}
              >
                <div className="w-20 h-20 rounded-full bg-black/70 flex items-center justify-center">
                  <Play className="w-10 h-10 text-white ml-1" fill="white" />
                </div>
              </div>
            )}
            
            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Progress bar */}
              <div 
                className="h-1 bg-white/30 rounded-full mb-3 cursor-pointer"
                onClick={handleProgressClick}
              >
                <div 
                  className="h-full bg-red-600 rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full" />
                </div>
              </div>
              
              {/* Control buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlay} className="text-white hover:text-gray-300">
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  <button onClick={toggleMute} className="text-white hover:text-gray-300">
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>
                  <span className="text-white text-sm">
                    {currentTime} / {duration}
                  </span>
                </div>
                <button onClick={handleFullscreen} className="text-white hover:text-gray-300">
                  <Maximize className="w-6 h-6" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Video Info */}
      <div className="mt-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {video.title}
        </h1>
        
        <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
          {/* Creator info */}
          <div className="flex items-center gap-3">
            <Link href={`/${video.creator.username}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                <Image
                  src={video.creator.avatar_url}
                  alt={video.creator.display_name}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            </Link>
            <div>
              <Link 
                href={`/${video.creator.username}`}
                className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
              >
                {video.creator.display_name}
              </Link>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {followerCount.toLocaleString()} followers
              </p>
            </div>
            {currentUserId && currentUserId !== video.creator.id && (
              <button
                onClick={handleFollow}
                disabled={isFollowLoading}
                className={`ml-4 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                  followStatus === 'friends'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : followStatus === 'following'
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isFollowLoading ? (
                  'Loading...'
                ) : followStatus === 'friends' ? (
                  <span className="flex items-center gap-1">
                    <Bell className="w-4 h-4" />
                    Friends
                  </span>
                ) : followStatus === 'following' ? (
                  'Following'
                ) : (
                  'Follow'
                )}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                isLiked
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              {likeCount.toLocaleString()}
            </button>
            <button
              onClick={handleDislike}
              className={`p-2 rounded-full font-medium text-sm transition-colors ${
                isDisliked
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <ThumbsDown className={`w-5 h-5 ${isDisliked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
            {/* Add to Playlist - Only for YouTube content */}
            {isYoutube && youtubeVideoId && (
              <button
                onClick={() => setShowAddToPlaylist(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Add to Playlist"
              >
                <ListPlus className="w-5 h-5" />
                <span className="hidden sm:inline">+ Playlist</span>
              </button>
            )}
            <button className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2">
            <span className="font-medium">{formatViews(viewCount)}</span>
            <span>•</span>
            <span>{formatDate(video.published_at)}</span>
          </div>
          <p className={`text-gray-800 dark:text-gray-200 whitespace-pre-wrap ${!showFullDescription ? 'line-clamp-2' : ''}`}>
            {video.description}
          </p>
          {video.description.length > 150 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
            >
              {showFullDescription ? (
                <>Show less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show more <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {video.tags.map(tag => (
                <span 
                  key={tag}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add to Playlist Modal */}
      {isYoutube && youtubeVideoId && (
        <AddToPlaylistModal
          isOpen={showAddToPlaylist}
          onClose={() => setShowAddToPlaylist(false)}
          youtubeUrl={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
          youtubeVideoId={youtubeVideoId}
          videoTitle={video.title}
          videoAuthor={video.creator.display_name}
          videoThumbnail={video.thumbnail_url}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={video.title}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        thumbnailUrl={video.thumbnail_url}
        contentType="video"
      />
    </div>
  );
}
