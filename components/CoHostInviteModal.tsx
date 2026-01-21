'use client';

/**
 * CoHostInviteModal - Invite another live streamer to co-host
 * 
 * Features:
 * - 4 tabs: Friends / Following / Followers / Everyone
 * - Shows ONLY live solo streamers
 * - Batch invites: modal stays open, send multiple invites up to capacity
 * - Cancel pending invites
 * - Shows slots remaining
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserPlus, Search, Users, UserCheck, Heart, Globe, Loader2, X, Clock } from 'lucide-react';
import Image from 'next/image';
import BottomSheetModal from './BottomSheetModal';
import { createClient } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import {
  getLiveUsersForInvite,
  sendInvite,
  cancelInvite,
  getOutgoingInvites,
  LiveUserForInvite,
  LiveSessionInvite,
} from '@/lib/battle-session';

const MAX_SLOTS = 12;

interface CoHostInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionStarted?: (sessionId: string) => void;
  /** Current active participant count (from session) */
  activeCount?: number;
}

type Tab = 'friends' | 'following' | 'followers' | 'everyone';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
  { id: 'following', label: 'Following', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'followers', label: 'Followers', icon: <Heart className="w-4 h-4" /> },
  { id: 'everyone', label: 'Everyone', icon: <Globe className="w-4 h-4" /> },
];

export default function CoHostInviteModal({ isOpen, onClose, onSessionStarted, activeCount = 1 }: CoHostInviteModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<LiveUserForInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track pending invites by user ID
  const [pendingInvites, setPendingInvites] = useState<Map<string, string>>(new Map()); // userId -> inviteId
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [cancelingInvite, setCancelingInvite] = useState<string | null>(null);
  
  const supabase = useMemo(() => createClient(), []);
  
  // Calculate available slots
  const pendingCount = pendingInvites.size;
  const availableSlots = MAX_SLOTS - activeCount - pendingCount;
  
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
  
  // Fetch outgoing invites on mount to restore pending state
  const fetchOutgoingInvites = useCallback(async () => {
    try {
      const invites = await getOutgoingInvites();
      const inviteMap = new Map<string, string>();
      invites.forEach(inv => {
        inviteMap.set(inv.to_host_id, inv.id);
      });
      setPendingInvites(inviteMap);
    } catch (err) {
      console.error('[CoHostInviteModal] fetchOutgoingInvites error:', err);
    }
  }, []);
  
  // Fetch on open
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchOutgoingInvites();
    }
  }, [isOpen, activeTab, fetchUsers, fetchOutgoingInvites]);
  
  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      u => u.username.toLowerCase().includes(q) || 
           (u.display_name && u.display_name.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);
  
  // Send invite to user (modal stays open)
  const handleSendInvite = async (userId: string) => {
    if (availableSlots <= 0) {
      setError('No slots available');
      return;
    }
    
    setSendingTo(userId);
    setError(null);
    try {
      const inviteId = await sendInvite(userId, 'cohost', 'standard');
      console.log('[CoHostInviteModal] Invite sent:', inviteId);
      // Add to pending map (don't close modal)
      setPendingInvites(prev => new Map(prev).set(userId, inviteId));
    } catch (err: any) {
      console.error('[CoHostInviteModal] sendInvite error:', err);
      setError(err.message || 'Failed to send invite');
    } finally {
      setSendingTo(null);
    }
  };
  
  // Cancel a pending invite
  const handleCancelInvite = async (userId: string) => {
    const inviteId = pendingInvites.get(userId);
    if (!inviteId) return;
    
    setCancelingInvite(userId);
    try {
      await cancelInvite(inviteId);
      setPendingInvites(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    } catch (err: any) {
      console.error('[CoHostInviteModal] cancelInvite error:', err);
      setError(err.message || 'Failed to cancel invite');
    } finally {
      setCancelingInvite(null);
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
            Done
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {/* Info Section with Capacity */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 bg-purple-500/10 rounded-lg p-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white text-sm">Collaborative Streaming</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                Stream together with other hosts
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-purple-500 text-sm">{availableSlots} slots</p>
              <p className="text-gray-400 text-xs">remaining</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <p className="text-yellow-500 text-xs mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {pendingCount} pending invite{pendingCount !== 1 ? 's' : ''}
            </p>
          )}
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
        
        {/* Error display */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}
        
        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery ? 'No live streamers found' : `No live ${activeTab === 'everyone' ? 'streamers' : activeTab} to invite`}
              </p>
            </div>
          ) : (
            filteredUsers.map(user => {
              const isPending = pendingInvites.has(user.profile_id);
              const isSending = sendingTo === user.profile_id;
              const isCanceling = cancelingInvite === user.profile_id;
              
              return (
                <div
                  key={user.profile_id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isPending 
                      ? 'bg-yellow-500/10 border border-yellow-500/30' 
                      : 'bg-gray-50 dark:bg-gray-700/50'
                  }`}
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
                  
                  {isPending ? (
                    // Pending state: show "Pending..." with cancel button
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-xs font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                      <button
                        onClick={() => handleCancelInvite(user.profile_id)}
                        disabled={isCanceling}
                        className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        title="Cancel invite"
                      >
                        {isCanceling ? (
                          <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                        ) : (
                          <X className="w-4 h-4 text-red-400" />
                        )}
                      </button>
                    </div>
                  ) : (
                    // Normal state: show invite button
                    <button
                      onClick={() => handleSendInvite(user.profile_id)}
                      disabled={isSending || availableSlots <= 0}
                      className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Invite
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </BottomSheetModal>
  );
}
