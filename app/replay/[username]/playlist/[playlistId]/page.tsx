'use client';

/**
 * Curator Playlist Player Page
 * 
 * Route: /replay/[username]/playlist/[playlistId]
 * 
 * CURATOR MODE RULES:
 * - Hide gifting UI completely
 * - Show "Curator: DisplayName" badge
 * - Provide "Open on YouTube" link
 * - Playlist queue on right rail
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  ListVideo, 
  ExternalLink, 
  Play, 
  ChevronDown,
  ChevronUp,
  Share2,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface PlaylistItem {
  id: string;
  youtube_url: string;
  youtube_video_id: string;
  title: string | null;
  author: string | null;
  thumbnail_url: string;
  duration_seconds: number | null;
  position: number;
}

interface PlaylistData {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  visibility: string;
  category: string;
  subcategory: string | null;
  thumbnail_url: string | null;
  items: PlaylistItem[];
}

interface CuratorProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function CuratorPlaylistPlayerPage() {
  const params = useParams<{ username: string; playlistId: string }>();
  const router = useRouter();
  const username = params?.username ?? '';
  const playlistId = params?.playlistId ?? '';

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [curator, setCurator] = useState<CuratorProfile | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    const loadPlaylist = async () => {
      if (!playlistId || !username) return;

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Get curator profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('username', username)
          .single();

        if (!profile) {
          setError('Curator not found');
          setIsLoading(false);
          return;
        }

        setCurator(profile);

        // Get playlist with items
        const { data: playlistData, error: playlistError } = await supabase.rpc(
          'get_playlist_with_items',
          { p_playlist_id: playlistId }
        );

        if (playlistError) throw playlistError;

        if (!playlistData) {
          setError('Playlist not found');
          setIsLoading(false);
          return;
        }

        setPlaylist(playlistData);
      } catch (err: any) {
        console.error('Failed to load playlist:', err);
        setError(err.message || 'Failed to load playlist');
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylist();
  }, [playlistId, username]);

  const currentItem = playlist?.items?.[currentIndex] ?? null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: playlist?.title || 'Playlist',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const goToItem = (index: number) => {
    setCurrentIndex(index);
  };

  const goNext = () => {
    if (playlist && currentIndex < playlist.items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!username || !playlistId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
              <div className="mt-4 space-y-3">
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 animate-pulse" />
              </div>
            </div>
            <div className="w-full lg:w-[400px] space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
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

  if (error || !playlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ListVideo className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Playlist not found'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The playlist you're looking for doesn't exist or is private.
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

  if (playlist.items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ListVideo className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Empty Playlist
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This playlist doesn't have any videos yet.
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
      <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-6">
        {/* Back navigation */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/${username}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {curator?.display_name || username}
          </Link>

          {/* Curator Badge - CURATOR MODE */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              Curator: {curator?.display_name || username}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content - Video Player */}
          <div className="flex-1 min-w-0">
            {/* YouTube Embed - NO GIFTING UI */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              {currentItem && (
                <iframe
                  key={currentItem.youtube_video_id}
                  src={`https://www.youtube.com/embed/${currentItem.youtube_video_id}?autoplay=1&rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={currentItem.title || 'Video'}
                />
              )}
            </div>

            {/* Video Info */}
            <div className="mt-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentItem?.title || 'Untitled Video'}
              </h1>

              <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
                {/* Curator info */}
                <div className="flex items-center gap-3">
                  <Link href={`/${username}`}>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                      {curator?.avatar_url ? (
                        <Image
                          src={curator.avatar_url}
                          alt={curator.display_name || username}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div>
                    <Link
                      href={`/${username}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
                    >
                      {curator?.display_name || username}
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Curated playlist
                    </p>
                  </div>
                </div>

                {/* Action buttons - NO GIFT BUTTON (Curator Mode) */}
                <div className="flex items-center gap-2">
                  {/* Open on YouTube */}
                  {currentItem && (
                    <a
                      href={`https://www.youtube.com/watch?v=${currentItem.youtube_video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open on YouTube
                    </a>
                  )}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>
              </div>

              {/* Playlist Info */}
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <ListVideo className="w-5 h-5 text-purple-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {playlist.title}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    • {currentIndex + 1} / {playlist.items.length}
                  </span>
                </div>
                {playlist.description && (
                  <>
                    <p
                      className={`text-gray-700 dark:text-gray-300 text-sm ${
                        !showFullDescription ? 'line-clamp-2' : ''
                      }`}
                    >
                      {playlist.description}
                    </p>
                    {playlist.description.length > 100 && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
                      >
                        {showFullDescription ? (
                          <>
                            Show less <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            Show more <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Playlist Queue */}
          <aside className="w-full lg:w-[400px] flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setShowQueue(!showQueue)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ListVideo className="w-5 h-5 text-purple-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Playlist Queue
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({playlist.items.length})
                  </span>
                </div>
                {showQueue ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {showQueue && (
                <div className="max-h-[600px] overflow-y-auto">
                  {playlist.items.map((item, index) => {
                    const isActive = index === currentIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => goToItem(index)}
                        className={`w-full flex gap-3 p-3 text-left transition-colors ${
                          isActive
                            ? 'bg-purple-50 dark:bg-purple-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={item.thumbnail_url}
                            alt={item.title || 'Video'}
                            className="w-32 h-20 object-cover rounded-lg"
                          />
                          {isActive && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <Play className="w-6 h-6 text-white" fill="white" />
                            </div>
                          )}
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white font-medium">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium line-clamp-2 ${
                              isActive
                                ? 'text-purple-700 dark:text-purple-300'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {item.title || 'Untitled'}
                          </p>
                          {item.author && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                              {item.author}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
