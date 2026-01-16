'use client';

/**
 * PlaylistDetailView - View and manage playlist items
 * 
 * Shows playlist items with reorder, remove, and add URL functionality.
 * YouTube URLs only.
 */

import React, { useState, useCallback } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  GripVertical, 
  Trash2, 
  Play, 
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Youtube,
  Clock,
  Loader2
} from 'lucide-react';

export type PlaylistItem = {
  id: string;
  youtube_url: string;
  youtube_video_id: string;
  title: string | null;
  author: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  position: number;
  created_at: string;
};

export type Playlist = {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  visibility: 'public' | 'unlisted' | 'private';
  category: string;
  subcategory: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  items: PlaylistItem[];
};

type Props = {
  playlist: Playlist;
  isOwner: boolean;
  onBack: () => void;
  onAddItem: (youtubeUrl: string) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onReorderItems: (orderedIds: string[]) => Promise<void>;
  onPlayVideo?: (item: PlaylistItem) => void;
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

export default function PlaylistDetailView({
  playlist,
  isOwner,
  onBack,
  onAddItem,
  onRemoveItem,
  onReorderItems,
  onPlayVideo,
  buttonColor = '#8B5CF6',
}: Props) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = playlist.items || [];

  const handleAddItem = async () => {
    const url = newUrl.trim();
    if (!url) return;

    setAdding(true);
    setError(null);

    try {
      await onAddItem(url);
      setNewUrl('');
      setShowAddInput(false);
    } catch (e) {
      console.error('[PlaylistDetailView] add failed', e);
      setError(e instanceof Error ? e.message : 'Failed to add video');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setRemoving(itemId);
    setError(null);

    try {
      await onRemoveItem(itemId);
    } catch (e) {
      console.error('[PlaylistDetailView] remove failed', e);
      setError(e instanceof Error ? e.message : 'Failed to remove video');
    } finally {
      setRemoving(null);
    }
  };

  const moveItem = useCallback(async (index: number, direction: 'up' | 'down') => {
    if (reordering) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(newIndex, 0, moved);

    const orderedIds = newItems.map(i => i.id);

    setReordering(true);
    setError(null);

    try {
      await onReorderItems(orderedIds);
    } catch (e) {
      console.error('[PlaylistDetailView] reorder failed', e);
      setError(e instanceof Error ? e.message : 'Failed to reorder');
    } finally {
      setReordering(false);
    }
  }, [items, reordering, onReorderItems]);

  // Get playlist thumbnail (custom or first video)
  const playlistThumbnail = playlist.thumbnail_url || 
    (items[0] ? getYoutubeThumbnail(items[0].youtube_video_id) : null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Playlist thumbnail */}
        <div className="w-32 h-20 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0">
          {playlistThumbnail ? (
            <img
              src={playlistThumbnail}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Youtube className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {playlist.title}
            </h2>
            {isOwner && !showAddInput && (
              <button
                onClick={() => setShowAddInput(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90 flex-shrink-0"
                style={{ backgroundColor: buttonColor }}
              >
                + Video
              </button>
            )}
          </div>
          {playlist.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
              {playlist.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="capitalize">{playlist.visibility}</span>
            <span>•</span>
            <span>{items.length} video{items.length !== 1 ? 's' : ''}</span>
            {playlist.category !== 'mixed' && (
              <>
                <span>•</span>
                <span className="capitalize">{playlist.category}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Video Input (shown when + Video clicked) */}
      {isOwner && showAddInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={adding}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !adding) {
                handleAddItem();
              } else if (e.key === 'Escape') {
                setShowAddInput(false);
                setNewUrl('');
              }
            }}
            autoFocus
          />
          <button
            onClick={handleAddItem}
            disabled={adding || !newUrl.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: buttonColor }}
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add
          </button>
          <button
            onClick={() => {
              setShowAddInput(false);
              setNewUrl('');
            }}
            disabled={adding}
            className="px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <Youtube className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {isOwner ? 'Add YouTube videos to your playlist' : 'This playlist is empty'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const thumbnail = item.thumbnail_url || getYoutubeThumbnail(item.youtube_video_id);
            const isRemoving = removing === item.id;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                  isRemoving ? 'opacity-50' : ''
                }`}
              >
                {/* Reorder controls (owner only) */}
                {isOwner && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0 || reordering}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1 || reordering}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}

                {/* Position number */}
                <div className="w-6 text-center text-sm font-medium text-gray-400">
                  {index + 1}
                </div>

                {/* Thumbnail */}
                <div 
                  className="relative w-24 h-14 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 cursor-pointer group"
                  onClick={() => onPlayVideo?.(item)}
                >
                  <img
                    src={thumbnail}
                    alt={item.title || 'Video'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-white" fill="white" />
                  </div>
                  {item.duration_seconds && (
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[10px] text-white font-medium">
                      {formatDuration(item.duration_seconds)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.title || 'Untitled Video'}
                  </p>
                  {item.author && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.author}
                    </p>
                  )}
                  {!item.title && !item.author && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Metadata pending
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <a
                    href={`https://youtube.com/watch?v=${item.youtube_video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </a>
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isRemoving}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Remove from playlist"
                    >
                      {isRemoving ? (
                        <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
