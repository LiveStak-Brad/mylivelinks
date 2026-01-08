'use client';

/**
 * CoHostInviteModal - Invite another live streamer to co-host
 * 
 * Features:
 * - 4 tabs: Friends / Following / Followers / Everyone
 * - Shows ONLY live solo streamers
 * - Send invite to start collaborative streaming session
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserPlus, Search, Users, UserCheck, Heart, Globe, Loader2 } from 'lucide-react';
import Image from 'next/image';
import BottomSheetModal from './BottomSheetModal';
import { createClient } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import {
  getLiveUsersForInvite,
  sendInvite,
  LiveUserForInvite,
} from '@/lib/battle-session';

interface CoHostInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionStarted?: (sessionId: string) => void;
}

type Tab = 'friends' | 'following' | 'followers' | 'everyone';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
  { id: 'following', label: 'Following', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'followers', label: 'Followers', icon: <Heart className="w-4 h-4" /> },
  { id: 'everyone', label: 'Everyone', icon: <Globe className="w-4 h-4" /> },
];

export default function CoHostInviteModal({ isOpen, onClose, onSessionStarted }: CoHostInviteModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<LiveUserForInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  
  const supabase = useMemo(() => createClient(), []);
  
  // Fetch users for current tab
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLiveUsersForInvite(activeTab);
      setUsers(data);
    } catch (err: any) {
      console.error('[CoHostInviteModal] fetchUsers error:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);
  
  // Fetch on tab change
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, activeTab, fetchUsers]);
  
  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      u => u.username.toLowerCase().includes(q) || 
           (u.display_name && u.display_name.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);
  
  // Send invite to user
  const handleSendInvite = async (userId: string) => {
    setSendingTo(userId);
    try {
      const inviteId = await sendInvite(userId, 'cohost', 'standard');
      console.log('[CoHostInviteModal] Invite sent:', inviteId);
      // Close modal - the hook will detect when invite is accepted
      onClose();
    } catch (err: any) {
      console.error('[CoHostInviteModal] sendInvite error:', err);
      setError(err.message || 'Failed to send invite');
    } finally {
      setSendingTo(null);
    }
  };

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
      maxHeightVh={70}
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
      <div className="flex flex-col h-full">
        {/* Info Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 bg-purple-500/10 rounded-lg p-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Collaborative Streaming</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                Stream together with another host in a shared view
              </p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live streamers..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={fetchUsers}
                className="mt-2 text-purple-500 text-sm hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery ? 'No live streamers found' : `No live ${activeTab === 'everyone' ? 'streamers' : activeTab} to invite`}
              </p>
            </div>
          ) : (
            filteredUsers.map(user => (
              <div
                key={user.profile_id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <Image
                  src={getAvatarUrl(user.avatar_url)}
                  alt={user.username}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {user.display_name || user.username}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                    @{user.username} · {user.viewer_count} viewers
                  </p>
                </div>
                <button
                  onClick={() => handleSendInvite(user.profile_id)}
                  disabled={sendingTo === user.profile_id}
                  className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {sendingTo === user.profile_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Invite
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </BottomSheetModal>
  );
}
