'use client';

/**
 * PlaylistsTab - Horizontal scroll playlists for profile TV tab
 * 
 * DO NOT TOUCH - Video links use youtube_video_id for the replay player URL.
 * The replay player searches by both youtube_video_id AND playlist item UUID.
 * 
 * Shows playlists with horizontal scroll of videos (like SeriesTab).
 * Each playlist: Title + "+ Video" button → horizontal scroll of video cards
 * Owner can delete videos directly from the scroll view.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { 
  ListVideo, 
  Plus, 
  Play, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  MoreVertical,
  Pencil,
  Loader2,
  Youtube
} from 'lucide-react';
import PlaylistUploaderModal, { type PlaylistFormData } from './PlaylistUploaderModal';

type PlaylistItem = {
  id: string;
  youtube_url: string;
  youtube_video_id: string;
  title: string | null;
  author: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  position: number;
};

type PlaylistWithItems = {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  visibility: 'public' | 'unlisted' | 'private';
  category: string;
  subcategory: string | null;
  thumbnail_url: string | null;
  items: PlaylistItem[];
};

type Props = {
  profileId: string;
  username: string;
  isOwner?: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  buttonColor?: string;
};

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Extract YouTube video ID from URL
function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  // Check if it's a raw 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return null;
}

// Fetch YouTube video metadata using oEmbed API
async function fetchYoutubeMetadata(videoId: string): Promise<{ title: string; author: string } | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      title: data.title || null,
      author: data.author_name || null,
    };
  } catch {
    return null;
  }
}

function VideoCard({ 
  item, 
  isOwner,
  onDelete,
  deleting,
  username,
  playlistId,
}: { 
  item: PlaylistItem;
  isOwner: boolean;
  onDelete: () => void;
  deleting: boolean;
  username: string;
  playlistId: string;
}) {
  const thumbnail = item.thumbnail_url || getYoutubeThumbnail(item.youtube_video_id);

  return (
    <div className="group flex-shrink-0 w-[200px] relative">
      {/* Thumbnail - links to replay player */}
      <a
        href={`/replay/${username}/${item.youtube_video_id}?playlist=${playlistId}`}
        className="block relative aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700"
      >
        <img 
          src={thumbnail} 
          alt={item.title || 'Video'}
          className="w-full h-full object-cover"
        />
        
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-4 h-4 text-gray-900 ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        {item.duration_seconds && item.duration_seconds > 0 && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-[10px] rounded font-medium">
            {formatDuration(item.duration_seconds)}
          </div>
        )}
      </a>

      {/* Delete button for owner */}
      {isOwner && (
        <button
          onClick={onDelete}
          disabled={deleting}
          className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Remove from playlist"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5 text-white" />
          )}
        </button>
      )}

      {/* Title */}
      <div className="mt-1.5 pr-1">
        <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2">
          {item.title || 'Untitled Video'}
        </p>
        {item.author && (
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {item.author}
          </p>
        )}
      </div>
    </div>
  );
}

function PlaylistRow({ 
  playlist, 
  isOwner,
  onAddVideo,
  onDeleteVideo,
  onEditPlaylist,
  onDeletePlaylist,
  buttonColor,
  username,
}: { 
  playlist: PlaylistWithItems;
  isOwner: boolean;
  onAddVideo: (playlistId: string, url: string) => Promise<void>;
  onDeleteVideo: (playlistId: string, itemId: string) => Promise<void>;
  onEditPlaylist: (playlist: PlaylistWithItems) => void;
  onDeletePlaylist: (playlistId: string) => void;
  buttonColor: string;
  username: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 220;
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
  }, [playlist.items]);

  const handleAddVideo = async () => {
    const url = newUrl.trim();
    if (!url) return;
    
    setAdding(true);
    try {
      await onAddVideo(playlist.id, url);
      setNewUrl('');
      setShowAddInput(false);
    } catch (e) {
      console.error('Failed to add video:', e);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteVideo = async (itemId: string) => {
    setDeletingId(itemId);
    try {
      await onDeleteVideo(playlist.id, itemId);
    } catch (e) {
      console.error('Failed to delete video:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const items = playlist.items || [];

  return (
    <div className="mb-6">
      {/* Playlist Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <ListVideo className="w-5 h-5 text-purple-500 flex-shrink-0" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {playlist.title}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
            ({items.length} video{items.length !== 1 ? 's' : ''})
          </span>
          
          {/* + Video button for owner */}
          {isOwner && !showAddInput && (
            <button
              onClick={() => setShowAddInput(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90 flex-shrink-0"
              style={{ backgroundColor: buttonColor }}
            >
              + Video
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Scroll controls */}
          {items.length > 3 && (
            <>
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
            </>
          )}
          
          {/* Owner menu */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
              
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-20 w-36 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-hidden">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onEditPlaylist(playlist);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        if (confirm('Delete this playlist? This cannot be undone.')) {
                          onDeletePlaylist(playlist.id);
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Video Input */}
      {isOwner && showAddInput && (
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={adding}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !adding) handleAddVideo();
              else if (e.key === 'Escape') {
                setShowAddInput(false);
                setNewUrl('');
              }
            }}
            autoFocus
          />
          <button
            onClick={handleAddVideo}
            disabled={adding || !newUrl.trim()}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            style={{ backgroundColor: buttonColor }}
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
          <button
            onClick={() => { setShowAddInput(false); setNewUrl(''); }}
            disabled={adding}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Horizontal Video Scroll */}
      {items.length > 0 ? (
        <div 
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <VideoCard
              key={item.id}
              item={item}
              isOwner={isOwner}
              onDelete={() => handleDeleteVideo(item.id)}
              deleting={deletingId === item.id}
              username={username}
              playlistId={playlist.id}
            />
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
          {isOwner ? 'Add YouTube videos to this playlist' : 'This playlist is empty'}
        </div>
      )}
    </div>
  );
}

export default function PlaylistsTab({
  profileId,
  username,
  isOwner = false,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  buttonColor = '#8B5CF6',
}: Props) {
  const [playlists, setPlaylists] = useState<PlaylistWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistWithItems | null>(null);

  // Load all playlists with items
  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_user_playlists_with_items', {
        p_profile_id: profileId,
      });

      if (error) {
        // Fallback to basic playlists if RPC doesn't exist yet
        const { data: basicData, error: basicError } = await supabase.rpc('get_user_playlists', {
          p_profile_id: profileId,
        });
        if (basicError) throw basicError;
        
        // Load items for each playlist
        const playlistsWithItems: PlaylistWithItems[] = [];
        for (const p of (basicData || [])) {
          const { data: itemsData } = await supabase.rpc('get_playlist_with_items', {
            p_playlist_id: p.id,
          });
          playlistsWithItems.push({
            ...p,
            items: itemsData?.items || [],
          });
        }
        setPlaylists(playlistsWithItems);
        return;
      }

      setPlaylists((data || []) as PlaylistWithItems[]);
    } catch (err) {
      console.error('[PlaylistsTab] Failed to load playlists:', err);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  // Create/Update playlist
  const handleSavePlaylist = async (formData: PlaylistFormData) => {
    const supabase = createClient();

    if (formData.id) {
      const { error } = await supabase.rpc('update_playlist', {
        p_playlist_id: formData.id,
        p_title: formData.title,
        p_description: formData.description || null,
        p_visibility: formData.visibility,
        p_category: formData.category,
        p_subcategory: formData.subcategory || null,
        p_thumbnail_url: formData.thumbnail_url || null,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.rpc('create_playlist', {
        p_title: formData.title,
        p_description: formData.description || null,
        p_visibility: formData.visibility,
        p_category: formData.category,
        p_subcategory: formData.subcategory || null,
        p_thumbnail_url: formData.thumbnail_url || null,
      });
      if (error) throw error;
    }

    await loadPlaylists();
    setEditingPlaylist(null);
  };

  // Delete playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    const supabase = createClient();
    const { error } = await supabase.rpc('delete_playlist', {
      p_playlist_id: playlistId,
    });
    if (error) {
      console.error('[PlaylistsTab] Delete failed:', error);
      alert('Failed to delete playlist');
      return;
    }
    await loadPlaylists();
  };

  // Add video to playlist (with YouTube metadata fetch)
  const handleAddVideo = async (playlistId: string, youtubeUrl: string) => {
    const supabase = createClient();
    
    // Extract video ID and fetch metadata
    const videoId = extractYoutubeVideoId(youtubeUrl);
    let title: string | null = null;
    let author: string | null = null;
    
    if (videoId) {
      const metadata = await fetchYoutubeMetadata(videoId);
      if (metadata) {
        title = metadata.title;
        author = metadata.author;
      }
    }
    
    const { error } = await supabase.rpc('add_playlist_item', {
      p_playlist_id: playlistId,
      p_youtube_url: youtubeUrl,
      p_title: title,
      p_author: author,
    });
    if (error) throw error;
    await loadPlaylists();
  };

  // Delete video from playlist
  const handleDeleteVideo = async (playlistId: string, itemId: string) => {
    const supabase = createClient();
    const { error } = await supabase.rpc('remove_playlist_item', {
      p_item_id: itemId,
    });
    if (error) throw error;
    await loadPlaylists();
  };

  // Handle edit playlist
  const handleEditPlaylist = (playlist: PlaylistWithItems) => {
    setEditingPlaylist(playlist);
    setShowModal(true);
  };

  // Handle create playlist
  const handleCreatePlaylist = () => {
    setEditingPlaylist(null);
    setShowModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              </div>
              <div className="flex gap-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="w-[200px] flex-shrink-0">
                    <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mt-2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (playlists.length === 0) {
    return (
      <div
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="py-12 text-center">
          <ListVideo className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            No Playlists Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {isOwner 
              ? 'Create a playlist to curate your favorite YouTube videos'
              : 'This user hasn\'t created any playlists yet'
            }
          </p>
          {isOwner && (
            <button
              onClick={handleCreatePlaylist}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: buttonColor }}
            >
              <Plus className="w-4 h-4" />
              + Playlist
            </button>
          )}
        </div>

        <PlaylistUploaderModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingPlaylist(null); }}
          onSave={handleSavePlaylist}
          buttonColor={buttonColor}
        />
      </div>
    );
  }

  return (
    <div
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      {/* Header with + Playlist button */}
      {isOwner && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleCreatePlaylist}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: buttonColor }}
          >
            + Playlist
          </button>
        </div>
      )}

      {/* Playlist rows with horizontal scroll */}
      {playlists.map((playlist) => (
        <PlaylistRow
          key={playlist.id}
          playlist={playlist}
          isOwner={isOwner}
          onAddVideo={handleAddVideo}
          onDeleteVideo={handleDeleteVideo}
          onEditPlaylist={handleEditPlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          buttonColor={buttonColor}
          username={username}
        />
      ))}

      {/* Create/Edit Modal */}
      <PlaylistUploaderModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingPlaylist(null); }}
        onSave={handleSavePlaylist}
        initialData={editingPlaylist ? {
          id: editingPlaylist.id,
          title: editingPlaylist.title,
          description: editingPlaylist.description || '',
          visibility: editingPlaylist.visibility,
          category: editingPlaylist.category,
          subcategory: editingPlaylist.subcategory || '',
          thumbnail_url: editingPlaylist.thumbnail_url || '',
        } : undefined}
        buttonColor={buttonColor}
      />
    </div>
  );
}
