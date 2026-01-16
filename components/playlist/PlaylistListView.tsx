'use client';

/**
 * PlaylistListView - Display playlist tiles grid
 * 
 * Shows all playlists for a profile with thumbnails and metadata.
 */

import React from 'react';
import { 
  ListVideo, 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2,
  Lock,
  Link2,
  Globe,
  Youtube
} from 'lucide-react';

export type PlaylistSummary = {
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
  item_count: number;
};

type Props = {
  playlists: PlaylistSummary[];
  isOwner: boolean;
  isLoading?: boolean;
  onCreatePlaylist: () => void;
  onSelectPlaylist: (playlist: PlaylistSummary) => void;
  onEditPlaylist?: (playlist: PlaylistSummary) => void;
  onDeletePlaylist?: (playlist: PlaylistSummary) => void;
  buttonColor?: string;
};

function VisibilityIcon({ visibility }: { visibility: string }) {
  switch (visibility) {
    case 'private':
      return <Lock className="w-3 h-3" />;
    case 'unlisted':
      return <Link2 className="w-3 h-3" />;
    default:
      return <Globe className="w-3 h-3" />;
  }
}

export default function PlaylistListView({
  playlists,
  isOwner,
  isLoading = false,
  onCreatePlaylist,
  onSelectPlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  buttonColor = '#8B5CF6',
}: Props) {
  const [menuOpen, setMenuOpen] = React.useState<string | null>(null);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-video rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="mt-2 h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            <div className="mt-1 h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (playlists.length === 0) {
    return (
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
            onClick={onCreatePlaylist}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: buttonColor }}
          >
            <Plus className="w-4 h-4" />
            + Playlist
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with create button - top right when has playlists */}
      {isOwner && (
        <div className="flex justify-end">
          <button
            onClick={onCreatePlaylist}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: buttonColor }}
          >
            + Playlist
          </button>
        </div>
      )}

      {/* Playlist grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {playlists.map((playlist) => {
          const isMenuOpen = menuOpen === playlist.id;

          return (
            <div key={playlist.id} className="group relative">
              {/* Thumbnail */}
              <div
                onClick={() => onSelectPlaylist(playlist)}
                className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 cursor-pointer"
              >
                {playlist.thumbnail_url ? (
                  <img
                    src={playlist.thumbnail_url}
                    alt={playlist.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                    <Youtube className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                  </div>
                )}

                {/* Overlay with count */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-black/70 rounded-md">
                    <ListVideo className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-medium text-white">
                      {playlist.item_count} video{playlist.item_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div 
                    className="flex items-center gap-1 px-1.5 py-1 bg-black/70 rounded-md text-white/80"
                    title={playlist.visibility}
                  >
                    <VisibilityIcon visibility={playlist.visibility} />
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div 
                    className="px-4 py-2 rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: buttonColor }}
                  >
                    View Playlist
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="mt-2 pr-8">
                <h3 
                  className="font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
                  onClick={() => onSelectPlaylist(playlist)}
                >
                  {playlist.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="capitalize">{playlist.category}</span>
                  {playlist.subcategory && (
                    <>
                      <span>•</span>
                      <span>{playlist.subcategory}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Owner menu */}
              {isOwner && (
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(isMenuOpen ? null : playlist.id);
                    }}
                    className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4 text-white" />
                  </button>

                  {/* Dropdown menu */}
                  {isMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setMenuOpen(null)} 
                      />
                      <div className="absolute right-0 top-8 z-20 w-36 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            onEditPlaylist?.(playlist);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            if (confirm('Delete this playlist? This cannot be undone.')) {
                              onDeletePlaylist?.(playlist);
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
          );
        })}
      </div>
    </div>
  );
}
