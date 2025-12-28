/**
 * Music Showcase Section (Musician Profile Type)
 * 
 * Displays music tracks with play buttons, duration, and metadata.
 * Shows empty state with owner CTA if no tracks available.
 */

'use client';

import { Music, Play } from 'lucide-react';
import { getMockMusicShowcase, getEmptyStateText, MusicTrack } from '@/lib/mockDataProviders';
import { ProfileType } from '@/lib/profileTypeConfig';

interface MusicShowcaseProps {
  profileType?: ProfileType;
  isOwner?: boolean;
  tracks?: MusicTrack[]; // Real data when available
  onAddTrack?: () => void;
}

export default function MusicShowcase({ 
  profileType, 
  isOwner = false,
  tracks,
  onAddTrack,
}: MusicShowcaseProps) {
  // Use real data if provided, otherwise fall back to mock data
  const musicTracks = tracks || getMockMusicShowcase(profileType);
  const emptyState = getEmptyStateText('music_showcase', profileType);

  // Empty state
  if (musicTracks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-500" />
            🎵 Music Showcase
          </h2>
        </div>
        
        <div className="text-center py-12">
          <Music className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {emptyState.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {emptyState.text}
          </p>
          {isOwner && (
            <button
              onClick={onAddTrack}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              {emptyState.ownerCTA}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Music className="w-5 h-5 text-purple-500" />
          🎵 Music Showcase
        </h2>
        {isOwner && (
          <button
            onClick={onAddTrack}
            className="text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            + Add Track
          </button>
        )}
      </div>

      <div className="space-y-3">
        {musicTracks.map((track) => (
          <div
            key={track.id}
            className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            {/* Play Button */}
            <button className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white transition-colors">
              <Play className="w-5 h-5 ml-0.5" />
            </button>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white truncate">
                {track.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {track.artist}
              </p>
            </div>

            {/* Duration */}
            <div className="flex-shrink-0 text-sm font-semibold text-gray-600 dark:text-gray-400">
              {track.duration}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

