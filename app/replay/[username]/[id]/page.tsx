'use client';

/**
 * Replay Player Page - Canonical Long-Form Video Player
 * 
 * Route: /replay/[username]/[id]
 * 
 * DO NOT TOUCH - This file handles video lookup by multiple ID types:
 * 1. youtube_id (11-char YouTube video ID)
 * 2. UUID (playlist item id or music video id)
 * 
 * The lookup order is critical:
 * 1. profile_music_videos by youtube_id
 * 2. profile_music_videos by UUID id
 * 3. replay_playlist_items by youtube_video_id
 * 4. replay_playlist_items by UUID id (playlist item's own id)
 * 5. creator_studio_items by UUID id
 * 
 * YouTube-style video player page with:
 * - Video player with custom controls
 * - Video metadata (title, description, views, likes)
 * - Comments section
 * - Related videos sidebar (video queue)
 * 
 * Supports all long-form content types:
 * - vlog, music_video, podcast, movie, series_episode, education, comedy_special, other
 * 
 * REAL DATA: Fetches from profile_music_videos, replay_playlist_items, and creator_studio_items tables
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tv } from 'lucide-react';
import { VideoPlayer, VideoComments, RelatedVideos } from '@/components/tv';
import { type TVVideoItem } from '@/lib/tv/mockData';
import { createClient } from '@/lib/supabase';

// Helper to extract YouTube video ID from URL
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/i);
  return match?.[1] || null;
}

// Helper to get YouTube embed URL
function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

// Helper to get YouTube thumbnail
function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default function ReplayPlayerPage() {
  const params = useParams<{ username: string; id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = params?.username ?? '';
  const initialVideoId = params?.id ?? '';
  const playlistId = searchParams?.get('playlist') ?? null;
  
  // Track current video ID in state for smooth transitions
  const [currentVideoId, setCurrentVideoId] = useState(initialVideoId);
  const [video, setVideo] = useState<TVVideoItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoNextFn, setAutoNextFn] = useState<(() => void) | null>(null);
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [addSongUrl, setAddSongUrl] = useState('');
  const [isAddingSong, setIsAddingSong] = useState(false);

  // Get current user
  useEffect(() => {
    const supabase = createClient();
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    fetchUser();
  }, []);

  // Sync URL video ID with state when URL changes
  useEffect(() => {
    if (initialVideoId && initialVideoId !== currentVideoId) {
      setCurrentVideoId(initialVideoId);
    }
  }, [initialVideoId]);

  // Fetch video data from real database
  useEffect(() => {
    const loadVideo = async () => {
      if (!currentVideoId || !username) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const supabase = createClient();
        
        // First get the profile by username
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('username', username)
          .single();
        
        if (!profile) {
          setError('Profile not found');
          setIsLoading(false);
          return;
        }
        
        // Try to find in profile_music_videos by youtube_id first
        let musicVideo = null;
        const { data: mvByYoutubeId } = await supabase
          .from('profile_music_videos')
          .select('*')
          .eq('profile_id', profile.id)
          .eq('youtube_id', currentVideoId)
          .maybeSingle();
        
        musicVideo = mvByYoutubeId;
        
        // If not found by youtube_id, try by UUID id
        if (!musicVideo) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(currentVideoId)) {
            const { data: mvById } = await supabase
              .from('profile_music_videos')
              .select('*')
              .eq('profile_id', profile.id)
              .eq('id', currentVideoId)
              .maybeSingle();
            musicVideo = mvById;
          }
        }
        
        // If still not found, check replay_playlist_items (for curated playlist videos)
        if (!musicVideo) {
          
          // First try by youtube_video_id
          let playlistItem = null;
          const { data: itemByYoutubeId } = await supabase
            .from('replay_playlist_items')
            .select('*, replay_playlists!inner(profile_id)')
            .eq('replay_playlists.profile_id', profile.id)
            .eq('youtube_video_id', currentVideoId)
            .maybeSingle();
          
          playlistItem = itemByYoutubeId;
          
          // If not found, try by playlist item UUID
          if (!playlistItem) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(currentVideoId)) {
              const { data: itemById } = await supabase
                .from('replay_playlist_items')
                .select('*, replay_playlists!inner(profile_id)')
                .eq('replay_playlists.profile_id', profile.id)
                .eq('id', currentVideoId)
                .maybeSingle();
              playlistItem = itemById;
            }
          }
          
          if (playlistItem) {
            // Build video data from playlist item
            const youtubeId = playlistItem.youtube_video_id;
            const videoData: TVVideoItem = {
              id: playlistItem.id,
              title: playlistItem.title || 'Untitled',
              description: '',
              thumbnail_url: playlistItem.thumbnail_url || (youtubeId ? getYoutubeThumbnail(youtubeId) : ''),
              video_url: youtubeId ? getYoutubeEmbedUrl(youtubeId) : (playlistItem.youtube_url || ''),
              duration: '',
              duration_seconds: playlistItem.duration_seconds || 0,
              views: 0,
              likes: 0,
              published_at: playlistItem.created_at,
              content_type: 'music_video',
              creator: {
                id: profile.id,
                username: profile.username,
                display_name: profile.display_name || profile.username,
                avatar_url: profile.avatar_url || '',
                subscriber_count: 0,
              },
            };
            setVideo(videoData);
            setIsLoading(false);
            return;
          }
        }
        
        if (musicVideo) {
          // Transform to TVVideoItem format
          const youtubeId = musicVideo.youtube_id || extractYoutubeId(musicVideo.video_url);
          const isYoutube = musicVideo.video_type === 'youtube' || !!youtubeId;
          
          const videoData: TVVideoItem = {
            id: musicVideo.id,
            title: musicVideo.title,
            description: musicVideo.description || '',
            thumbnail_url: musicVideo.thumbnail_url || (youtubeId ? getYoutubeThumbnail(youtubeId) : ''),
            video_url: isYoutube && youtubeId ? getYoutubeEmbedUrl(youtubeId) : musicVideo.video_url,
            duration: '',
            duration_seconds: 0,
            views: musicVideo.views_count || 0,
            likes: 0,
            published_at: musicVideo.created_at,
            content_type: 'music_video',
            creator: {
              id: profile.id,
              username: profile.username,
              display_name: profile.display_name || profile.username,
              avatar_url: profile.avatar_url || '',
              subscriber_count: 0,
            },
          };
          setVideo(videoData);
          setIsLoading(false);
          return;
        }
        
        // Try creator_studio_items (check if currentVideoId is a valid UUID first)
        const uuidRegex2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex2.test(currentVideoId)) {
          const { data: studioItem } = await supabase
            .from('creator_studio_items')
            .select('*')
            .eq('id', currentVideoId)
            .eq('owner_profile_id', profile.id)
            .maybeSingle();
          
          if (studioItem) {
            const youtubeId = extractYoutubeId(studioItem.media_url || '');
            const isYoutube = !!youtubeId;
            
            const videoData: TVVideoItem = {
              id: studioItem.id,
              title: studioItem.title,
              description: studioItem.description || '',
              thumbnail_url: studioItem.thumb_url || studioItem.artwork_url || (youtubeId ? getYoutubeThumbnail(youtubeId) : ''),
              video_url: isYoutube && youtubeId ? getYoutubeEmbedUrl(youtubeId) : (studioItem.media_url || ''),
              duration: '',
              duration_seconds: studioItem.duration_seconds || 0,
              views: 0,
              likes: 0,
              published_at: studioItem.created_at,
              content_type: studioItem.item_type || 'music_video',
              creator: {
                id: profile.id,
                username: profile.username,
                display_name: profile.display_name || profile.username,
                avatar_url: profile.avatar_url || '',
                subscriber_count: 0,
              },
            };
            setVideo(videoData);
            setIsLoading(false);
            return;
          }
        }
        
        setError('Video not found');
      } catch (err) {
        console.error('Failed to load video:', err);
        setError('Failed to load video');
      } finally {
        setIsLoading(false);
      }
    };

    loadVideo();
  }, [currentVideoId, username]);

  // Handle video change from playlist (without full page reload)
  const handleVideoChange = (newVideoId: string) => {
    setCurrentVideoId(newVideoId);
    setAutoPlay(true);
    // Update URL without full navigation
    window.history.pushState({}, '', `/replay/${username}/${newVideoId}?playlist=${playlistId}`);
  };

  // Handle video ended - auto-advance to next in playlist
  const handleVideoEnded = () => {
    if (autoNextFn) {
      autoNextFn();
    }
  };

  const handleShare = () => {
    if (navigator.share && video) {
      navigator.share({
        title: video.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Handle adding a song to the playlist
  const handleAddSong = async () => {
    if (!addSongUrl.trim() || !playlistId || isAddingSong) return;
    
    setIsAddingSong(true);
    try {
      const response = await fetch('/api/playlist/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playlistId, 
          youtubeUrl: addSongUrl.trim() 
        }),
      });
      
      if (response.ok) {
        setAddSongUrl('');
        setShowAddSongModal(false);
        // Refresh the page to show new song
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add song');
      }
    } catch (e) {
      console.error('Failed to add song:', e);
      alert('Failed to add song');
    } finally {
      setIsAddingSong(false);
    }
  };

  if (!username || !currentVideoId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-4 lg:px-6 2xl:px-12 py-6 2xl:py-8">
          <div className="flex flex-col lg:flex-row gap-6 2xl:gap-8">
            {/* Main content skeleton */}
            <div className="flex-1">
              <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
              <div className="mt-4 space-y-3">
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 animate-pulse" />
              </div>
            </div>
            {/* Sidebar skeleton */}
            <div className="w-full lg:w-[400px] 2xl:w-[450px] space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-2 animate-pulse">
                  <div className="w-40 aspect-video rounded-lg bg-gray-200 dark:bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Tv className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Video not found'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The video you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href={`/${username}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Wide mode: at 2xl+ uses wider container, larger sidebar, and more padding for large monitors */}
      <div className="max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-4 lg:px-6 2xl:px-12 py-6 2xl:py-8">
        {/* Back navigation */}
        <div className="mb-4">
          <Link
            href={`/${username}/tv`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {username}TV
          </Link>
        </div>

        {/* Video + Related Videos row */}
        <div className="flex flex-col lg:flex-row gap-6 2xl:gap-8">
          {/* Main content - video player */}
          <div className="flex-1 min-w-0">
            <VideoPlayer 
              video={video} 
              onShare={handleShare}
              autoPlay={autoPlay}
              onEnded={handleVideoEnded}
              currentUserId={currentUserId}
            />
          </div>

          {/* Sidebar - Playlist or Related Videos (scrollable, wider on large monitors) */}
          <aside className="w-full lg:w-[400px] 2xl:w-[450px] flex-shrink-0 lg:max-h-[calc(56.25vw*0.55)] 2xl:max-h-[800px] lg:overflow-y-auto lg:scrollbar-thin lg:scrollbar-thumb-gray-300 dark:lg:scrollbar-thumb-gray-700">
            <RelatedVideos
              currentVideoId={currentVideoId}
              contentType={video.content_type}
              username={username}
              playlistId={playlistId}
              onVideoChange={handleVideoChange}
              onAutoNextReady={setAutoNextFn}
              currentUserId={currentUserId}
              onAddSong={() => setShowAddSongModal(true)}
            />
          </aside>
        </div>

        {/* Comments - aligned with main video column on large screens, not extending under sidebar */}
        <div className="mt-6 2xl:mt-8 lg:pr-[calc(400px+1.5rem)] 2xl:pr-[calc(450px+2rem)]">
          <VideoComments 
            videoId={currentVideoId} 
            currentUserId={currentUserId}
          />
        </div>
      </div>

      {/* Add Song Modal */}
      {showAddSongModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Add Song to Playlist
            </h3>
            <input
              type="text"
              value={addSongUrl}
              onChange={(e) => setAddSongUrl(e.target.value)}
              placeholder="Paste YouTube URL..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowAddSongModal(false);
                  setAddSongUrl('');
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSong}
                disabled={!addSongUrl.trim() || isAddingSong}
                className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAddingSong ? 'Adding...' : 'Add Song'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
