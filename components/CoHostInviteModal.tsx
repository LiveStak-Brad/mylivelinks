'use client';

import { useState } from 'react';
import { UserPlus, Search, Users, Clock } from 'lucide-react';
import BottomSheetModal from './BottomSheetModal';

interface CoHostInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CoHostInviteModal({ isOpen, onClose }: CoHostInviteModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <BottomSheetModal
      open={isOpen}
      onClose={onClose}
      title="Invite Co-Host"
      titleIcon={
        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-purple-500" />
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
      <div className="p-4 space-y-6">
        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Coming Soon!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Co-hosting feature is currently in development. Soon you&apos;ll be able to invite other streamers to join your broadcast!
          </p>
        </div>

        {/* Feature Preview (Disabled) */}
        <div className="opacity-50 pointer-events-none">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Search Users
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              disabled
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>
        </div>

        {/* Placeholder Empty State */}
        <div className="text-center py-8 opacity-50">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Search for users to invite as co-host
          </p>
        </div>
      </div>
    </BottomSheetModal>
  );
}
