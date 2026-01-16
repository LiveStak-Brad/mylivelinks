/**
 * Empty State Components for Profile Tabs
 * 
 * Generic empty states for Feed, Photos, Videos, etc.
 * Shows different messaging for owner vs visitor.
 */

'use client';

import { LayoutGrid, Image as ImageIcon, Video } from 'lucide-react';
import { getEmptyStateText } from '@/lib/mockDataProviders';

interface EmptyStateProps {
  type: 'feed' | 'photos' | 'videos' | 'music_videos';
  isOwner?: boolean;
  onAction?: () => void;
  buttonColor?: string;
}

const iconMap = {
  feed: LayoutGrid,
  photos: ImageIcon,
  videos: Video,
  music_videos: Video,
};

export default function TabEmptyState({ type, isOwner = false, onAction, buttonColor = '#DB2777' }: EmptyStateProps) {
  const Icon = iconMap[type];
  const emptyState = getEmptyStateText(type);

  return (
    <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
      <div className="text-center py-16">
        <Icon className="w-20 h-20 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {emptyState.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {emptyState.text}
        </p>
        {isOwner && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {emptyState.ownerCTA}
          </button>
        )}
      </div>
    </div>
  );
}

