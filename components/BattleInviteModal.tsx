'use client';

/**
 * BattleInviteModal - Invite another live streamer to a battle
 * 
 * Features:
 * - 4 tabs: Friends / Following / Followers / Everyone
 * - Shows ONLY live solo streamers
 * - Speed Battle Pool entry
 * - Send invite with mode selection (speed/standard)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Swords, Search, Trophy, Zap, Users, UserCheck, Heart, Globe, Loader2 } from 'lucide-react';
import Image from 'next/image';
import BottomSheetModal from './BottomSheetModal';
import { createClient } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import {
  getLiveUsersForInvite,
  sendInvite,
  joinBattlePool,
  leaveBattlePool,
  checkPoolStatus,
  triggerPoolMatch,
  LiveUserForInvite,
  SessionMode,
} from '@/lib/battle-session';

interface BattleInviteModalProps {
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

export default function BattleInviteModal({ isOpen, onClose, onSessionStarted }: BattleInviteModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<LiveUserForInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<SessionMode>('standard');
  
  // Speed pool state
  const [inPool, setInPool] = useState(false);
  const [poolSearching, setPoolSearching] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  
  const supabase = useMemo(() => createClient(), []);
  
  // Fetch users for current tab
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLiveUsersForInvite(activeTab);
      setUsers(data);
    } catch (err: any) {
      console.error('[BattleInviteModal] fetchUsers error:', err);
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
  
  // Check pool status on open
  useEffect(() => {
    if (isOpen) {
      checkPoolStatus()
        .then(status => {
          setInPool(status.in_pool);
          if (status.matched && status.session_id) {
            onSessionStarted?.(status.session_id);
            onClose();
          }
        })
        .catch(console.error);
    }
  }, [isOpen, onSessionStarted, onClose]);
  
  // Pool polling when searching
  useEffect(() => {
    if (!poolSearching || !inPool) return;
    
    const pollInterval = setInterval(async () => {
      try {
        // Try to trigger a match
        const matchResult = await triggerPoolMatch();
        if (matchResult.matched && matchResult.session_id) {
          setPoolSearching(false);
          onSessionStarted?.(matchResult.session_id);
          onClose();
          return;
        }
        
        // Check our own status
        const status = await checkPoolStatus();
        if (status.matched && status.session_id) {
          setPoolSearching(false);
          onSessionStarted?.(status.session_id);
          onClose();
        }
      } catch (err) {
        console.error('[BattleInviteModal] pool poll error:', err);
      }
    }, 5000);
    
    return () => clearInterval(pollInterval);
  }, [poolSearching, inPool, onSessionStarted, onClose]);
  
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
      const inviteId = await sendInvite(userId, 'battle', selectedMode);
      console.log('[BattleInviteModal] Invite sent:', inviteId);
      // Close modal - the hook will detect when invite is accepted
      onClose();
    } catch (err: any) {
      console.error('[BattleInviteModal] sendInvite error:', err);
      setError(err.message || 'Failed to send invite');
    } finally {
      setSendingTo(null);
    }
  };
  
  // Join speed pool
  const handleJoinPool = async () => {
    setPoolError(null);
    try {
      await joinBattlePool();
      setInPool(true);
      setPoolSearching(true);
    } catch (err: any) {
      console.error('[BattleInviteModal] joinPool error:', err);
      setPoolError(err.message || 'Failed to join pool');
    }
  };
  
  // Leave speed pool
  const handleLeavePool = async () => {
    try {
      await leaveBattlePool();
      setInPool(false);
      setPoolSearching(false);
    } catch (err: any) {
      console.error('[BattleInviteModal] leavePool error:', err);
    }
  };

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
        {/* Speed Battle Pool Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Speed Battle Pool</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  {poolSearching ? 'Searching for opponent...' : 'Auto-match with another live host'}
                </p>
              </div>
            </div>
            {poolSearching ? (
              <button
                onClick={handleLeavePool}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Leave
              </button>
            ) : (
              <button
                onClick={handleJoinPool}
                disabled={inPool}
                className="px-3 py-1.5 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                Enter Pool
              </button>
            )}
          </div>
          {poolError && (
            <p className="text-red-500 text-xs mt-2">{poolError}</p>
          )}
        </div>
        
        {/* Mode Selection */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Battle Mode</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedMode('speed')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedMode === 'speed'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              Speed (1:00)
            </button>
            <button
              onClick={() => setSelectedMode('standard')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedMode === 'standard'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-1" />
              Standard (3:00)
            </button>
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
                  ? 'text-orange-500 border-b-2 border-orange-500'
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
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={fetchUsers}
                className="mt-2 text-orange-500 text-sm hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Swords className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery ? 'No live streamers found' : `No live ${activeTab === 'everyone' ? 'streamers' : activeTab} to battle`}
              </p>
            </div>
          ) : (
            filteredUsers.map(user => (
              <div
                key={user.profile_id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <Image
                  src={getAvatarUrl(user.avatar_url, user.username)}
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
                  className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {sendingTo === user.profile_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Swords className="w-4 h-4" />
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
