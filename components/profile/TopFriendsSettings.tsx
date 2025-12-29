'use client';

import { useState } from 'react';
import { Users, Circle, Square } from 'lucide-react';

interface TopFriendsSettingsProps {
  showTopFriends: boolean;
  topFriendsTitle: string;
  topFriendsAvatarStyle: 'circle' | 'square';
  topFriendsMaxCount: number;
  onChange: (settings: {
    showTopFriends: boolean;
    topFriendsTitle: string;
    topFriendsAvatarStyle: 'circle' | 'square';
    topFriendsMaxCount: number;
  }) => void;
}

export default function TopFriendsSettings({
  showTopFriends,
  topFriendsTitle,
  topFriendsAvatarStyle,
  topFriendsMaxCount,
  onChange,
}: TopFriendsSettingsProps) {
  const handleChange = (updates: Partial<typeof settings>) => {
    const newSettings = { showTopFriends, topFriendsTitle, topFriendsAvatarStyle, topFriendsMaxCount, ...updates };
    onChange(newSettings);
  };

  const settings = { showTopFriends, topFriendsTitle, topFriendsAvatarStyle, topFriendsMaxCount };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
          <Users size={24} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Top Friends Section</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Customize your Top Friends display (MySpace style!)
          </p>
        </div>
      </div>

      {/* Show/Hide Toggle */}
      <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="font-medium">Show Top Friends Section</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Display your favorite people on your profile
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={showTopFriends}
              onChange={(e) => handleChange({ showTopFriends: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </div>
        </label>
      </div>

      {/* Settings (only show if section is enabled) */}
      {showTopFriends && (
        <>
          {/* Section Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Section Title
            </label>
            <input
              type="text"
              value={topFriendsTitle}
              onChange={(e) => handleChange({ topFriendsTitle: e.target.value })}
              placeholder="Top Friends"
              maxLength={50}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Examples: "Top G's", "My Crew", "Best Buds", "VIPs", etc.
            </p>
          </div>

          {/* Avatar Style */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">
              Avatar Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChange({ topFriendsAvatarStyle: 'square' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  topFriendsAvatarStyle === 'square'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Square className="w-8 h-8 mx-auto mb-2" />
                <div className="font-medium">Square</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Classic look</div>
              </button>
              <button
                type="button"
                onClick={() => handleChange({ topFriendsAvatarStyle: 'circle' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  topFriendsAvatarStyle === 'circle'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Circle className="w-8 h-8 mx-auto mb-2" />
                <div className="font-medium">Circle</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Modern style</div>
              </button>
            </div>
          </div>

          {/* Max Count */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Maximum Friends to Display
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="8"
                value={topFriendsMaxCount}
                onChange={(e) => handleChange({ topFriendsMaxCount: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="w-12 text-center">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {topFriendsMaxCount}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Grid will auto-center based on the number of friends you add
            </p>
          </div>

          {/* Visual Preview Grid */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <p className="text-sm font-medium mb-3 text-center">Preview Grid Layout</p>
            <div className="flex justify-center">
              <div className={`grid gap-2 ${
                topFriendsMaxCount <= 4 ? 'grid-cols-4' : 'grid-cols-4'
              }`} style={{ maxWidth: '300px' }}>
                {[...Array(topFriendsMaxCount)].map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square bg-purple-200 dark:bg-purple-800 ${
                      topFriendsAvatarStyle === 'circle' ? 'rounded-full' : 'rounded-lg'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

