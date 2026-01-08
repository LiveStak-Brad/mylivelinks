'use client';

import { useState } from 'react';
import { Swords, Search, Trophy, Zap } from 'lucide-react';
import BottomSheetModal from './BottomSheetModal';

interface BattleInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BattleInviteModal({ isOpen, onClose }: BattleInviteModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <BottomSheetModal
      open={isOpen}
      onClose={onClose}
      title="Start a Battle"
      titleIcon={
        <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
          <Swords className="w-5 h-5 text-orange-500" />
        </div>
      }
      maxHeightVh={50}
      footerContent={
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {/* Battle Info */}
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Zap className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Real-time Competition</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Compete with another streamer side-by-side</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Trophy className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Gift Battle</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Viewers send gifts to help you win</p>
            </div>
          </div>
        </div>

        {/* Search Streamers */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Challenge a Streamer
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live streamers..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Empty State */}
        <div className="text-center py-6">
          <Swords className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {searchQuery ? 'No live streamers found' : 'Search for a streamer to battle'}
          </p>
        </div>
      </div>
    </BottomSheetModal>
  );
}
