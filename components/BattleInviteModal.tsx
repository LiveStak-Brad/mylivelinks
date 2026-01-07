'use client';

import { useState } from 'react';
import { X, Swords, Search, Trophy, Clock, Zap } from 'lucide-react';

interface BattleInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BattleInviteModal({ isOpen, onClose }: BattleInviteModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col modal-fullscreen-mobile">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Swords className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Start a Battle</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mobile-touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body p-6 space-y-6 overflow-y-auto flex-1">
          {/* Coming Soon Banner */}
          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Coming Soon!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Battle mode is currently in development. Soon you&apos;ll be able to challenge other streamers and compete for gifts!
            </p>
          </div>

          {/* Battle Info */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">How Battles Work</h4>
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
          </div>

          {/* Feature Preview (Disabled) */}
          <div className="opacity-50 pointer-events-none">
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
                disabled
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-bottom">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
