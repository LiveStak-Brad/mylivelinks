'use client';

import { useState } from 'react';
import { UserPlus, Search, Users } from 'lucide-react';
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
      <div className="p-4 space-y-4">
        {/* Search Users */}
        <div>
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
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Empty State */}
        <div className="text-center py-6">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {searchQuery ? 'No users found' : 'Search for users to invite as co-host'}
          </p>
        </div>
      </div>
    </BottomSheetModal>
  );
}
