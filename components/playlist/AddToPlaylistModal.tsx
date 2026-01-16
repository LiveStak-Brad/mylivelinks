'use client';

import { useState, useEffect } from 'react';
import { X, Plus, ListVideo, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface Playlist {
  id: string;
  title: string;
  item_count: number;
  thumbnail_url: string | null;
}

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  youtubeUrl: string;
  youtubeVideoId: string;
  videoTitle?: string;
  videoAuthor?: string;
  videoThumbnail?: string;
  onSuccess?: () => void;
}

export default function AddToPlaylistModal({
  isOpen,
  onClose,
  youtubeUrl,
  youtubeVideoId,
  videoTitle,
  videoAuthor,
  videoThumbnail,
  onSuccess,
}: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen]);

  const loadPlaylists = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to add to playlist');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase.rpc('get_user_playlists', {
        p_profile_id: user.id,
      });

      if (fetchError) throw fetchError;
      setPlaylists(data || []);
    } catch (err: any) {
      console.error('Failed to load playlists:', err);
      setError(err.message || 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    setAdding(playlistId);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const { error: addError } = await supabase.rpc('add_playlist_item', {
        p_playlist_id: playlistId,
        p_youtube_url: youtubeUrl,
        p_title: videoTitle || null,
        p_author: videoAuthor || null,
        p_thumbnail_url: videoThumbnail || null,
      });

      if (addError) {
        if (addError.message.includes('already exists')) {
          setError('This video is already in the playlist');
        } else {
          throw addError;
        }
        return;
      }

      const playlist = playlists.find(p => p.id === playlistId);
      setSuccess(`Added to "${playlist?.title}"`);
      onSuccess?.();
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to add to playlist:', err);
      setError(err.message || 'Failed to add to playlist');
    } finally {
      setAdding(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) return;
    
    setCreating(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: playlistId, error: createError } = await supabase.rpc('create_playlist', {
        p_title: newPlaylistTitle.trim(),
      });

      if (createError) throw createError;

      // Add the video to the new playlist
      const { error: addError } = await supabase.rpc('add_playlist_item', {
        p_playlist_id: playlistId,
        p_youtube_url: youtubeUrl,
        p_title: videoTitle || null,
        p_author: videoAuthor || null,
        p_thumbnail_url: videoThumbnail || null,
      });

      if (addError) throw addError;

      setSuccess(`Created "${newPlaylistTitle}" and added video`);
      setNewPlaylistTitle('');
      setShowCreateNew(false);
      onSuccess?.();
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to create playlist:', err);
      setError(err.message || 'Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-purple-500" />
            Add to Playlist
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Video Preview */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex gap-3">
            {videoThumbnail || youtubeVideoId ? (
              <img
                src={videoThumbnail || `https://img.youtube.com/vi/${youtubeVideoId}/default.jpg`}
                alt={videoTitle || 'Video thumbnail'}
                className="w-20 h-14 object-cover rounded-lg"
              />
            ) : (
              <div className="w-20 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <ListVideo className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {videoTitle || 'YouTube Video'}
              </p>
              {videoAuthor && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {videoAuthor}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          )}

          {/* Playlists List */}
          {!loading && (
            <div className="space-y-2">
              {/* Create New Playlist */}
              {showCreateNew ? (
                <div className="p-3 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <input
                    type="text"
                    value={newPlaylistTitle}
                    onChange={(e) => setNewPlaylistTitle(e.target.value)}
                    placeholder="Playlist name..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreatePlaylist();
                      if (e.key === 'Escape') setShowCreateNew(false);
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylistTitle.trim() || creating}
                      className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Create & Add
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowCreateNew(false)}
                      className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateNew(true)}
                  className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 transition-colors flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-semibold">Create new playlist</span>
                </button>
              )}

              {/* Existing Playlists */}
              {playlists.length === 0 && !loading && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                  No playlists yet. Create one above!
                </p>
              )}

              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => handleAddToPlaylist(playlist.id)}
                  disabled={adding !== null}
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  {playlist.thumbnail_url ? (
                    <img
                      src={playlist.thumbnail_url}
                      alt={playlist.title}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <ListVideo className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {playlist.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {playlist.item_count} video{playlist.item_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {adding === playlist.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                  ) : (
                    <Plus className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
