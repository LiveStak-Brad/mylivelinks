'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ListVideo, Plus, Play, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface Playlist {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  visibility: string;
  category: string;
  subcategory: string | null;
  thumbnail_url: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

interface PlaylistsSectionProps {
  profileId: string;
  username: string;
  isOwner?: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  buttonColor?: string;
  maxDisplay?: number;
}

export default function PlaylistsSection({
  profileId,
  username,
  isOwner = false,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  buttonColor = '#9333EA',
  maxDisplay = 6,
}: PlaylistsSectionProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlaylists = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('get_user_playlists', {
          p_profile_id: profileId,
        });

        if (error) throw error;
        setPlaylists(data || []);
      } catch (err) {
        console.error('Failed to load playlists:', err);
        setPlaylists([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlaylists();
  }, [profileId]);

  const displayPlaylists = playlists.slice(0, maxDisplay);
  const hasMore = playlists.length > maxDisplay;

  if (loading) {
    return (
      <div
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="flex items-center gap-2 mb-4">
          <ListVideo className="w-5 h-5 text-purple-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Playlists</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (playlists.length === 0 && !isOwner) {
    return null;
  }

  if (playlists.length === 0 && isOwner) {
    return (
      <div
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Playlists</h2>
          </div>
        </div>
        <div className="text-center py-8">
          <ListVideo className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Playlists Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
            Curate YouTube videos into playlists for your audience
          </p>
          <Link
            href={`/${username}/playlists/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: buttonColor }}
          >
            <Plus className="w-4 h-4" />
            Create Playlist
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-purple-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Playlists</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({playlists.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Link
              href={`/${username}/playlists/new`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white font-semibold text-xs transition-opacity hover:opacity-90"
              style={{ backgroundColor: buttonColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </Link>
          )}
          {hasMore && (
            <Link
              href={`/${username}/playlists`}
              className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
            >
              View All
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {displayPlaylists.map((playlist) => (
          <Link
            key={playlist.id}
            href={`/replay/${username}/playlist/${playlist.id}`}
            className="group block"
          >
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
              {playlist.thumbnail_url ? (
                <img
                  src={playlist.thumbnail_url}
                  alt={playlist.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <ListVideo className="w-8 h-8 text-white" />
                </div>
              )}
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
                  <Play className="w-5 h-5 text-gray-900 ml-0.5" />
                </div>
              </div>
              {/* Video count badge */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-semibold">
                {playlist.item_count} video{playlist.item_count !== 1 ? 's' : ''}
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {playlist.title}
            </h3>
            {playlist.category !== 'mixed' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {playlist.category}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
