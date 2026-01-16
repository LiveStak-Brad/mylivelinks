'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import UserNameWithBadges from '@/components/shared/UserNameWithBadges';

interface User {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  follower_count: number;
  is_live: boolean;
  is_online?: boolean;
  is_mll_pro?: boolean;
  followed_at?: string;
  friends_since?: string;
}

interface FollowersModalProps {
  profileId: string;
  type?: 'followers' | 'following' | 'friends';
  onClose: () => void;
  followerCount?: number;
  followingCount?: number;
  friendsCount?: number;
}

export default function FollowersModal({
  profileId,
  type = 'followers',
  onClose,
  followerCount = 0,
  followingCount = 0,
  friendsCount = 0,
}: FollowersModalProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'friends'>(type);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  
  const tabs = [
    { id: 'followers' as const, label: 'Followers', count: followerCount },
    { id: 'following' as const, label: 'Following', count: followingCount },
    { id: 'friends' as const, label: 'Friends', count: friendsCount },
  ];
  
  useEffect(() => {
    setUsers([]);
    setHasMore(true);
    setOffset(0);
  }, [profileId, activeTab]);
  
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const endpoint = activeTab === 'followers' 
        ? `/api/profile/followers?profileId=${profileId}&limit=${limit}&offset=${offset}`
        : activeTab === 'following'
        ? `/api/profile/following?profileId=${profileId}&limit=${limit}&offset=${offset}`
        : `/api/profile/friends?profileId=${profileId}&limit=${limit}&offset=${offset}`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.error) {
        console.error('Failed to load users:', data.error);
        return;
      }
      
      const newUsers = data[activeTab] || [];
      
      // Sort: live first, then online, then alphabetical
      const sortedUsers = [...newUsers].sort((a: User, b: User) => {
        // Live users first
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        // Then online users
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        // Then alphabetical by display_name or username
        const nameA = (a.display_name || a.username || '').toLowerCase();
        const nameB = (b.display_name || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setUsers(prev => offset === 0 ? sortedUsers : [...prev, ...sortedUsers]);
      const total = typeof data.total === 'number' ? data.total : null;
      setHasMore(total !== null ? offset + newUsers.length < total : newUsers.length === limit);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [profileId, activeTab, offset]);
  
  const loadMore = () => {
    setOffset(prev => prev + limit);
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col">
        {/* Header with Close Button */}
        <div className="flex items-center justify-between p-4 pb-0">
          <h2 className="text-xl font-bold">Connections</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-center font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="block text-lg">{tab.count.toLocaleString()}</span>
              <span className="block text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* List - min-height prevents resize during tab switch */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[400px] relative">
          {/* Loading overlay - shows on top of existing content */}
          {loading && offset === 0 && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-10">
              <Loader2 className="animate-spin" size={32} />
            </div>
          )}
          
          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No {activeTab} yet
              </p>
            </div>
          )}
          
          {users.length > 0 && (
            <div className="space-y-3">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/${user.username}`}
                  onClick={onClose}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  {/* Avatar with live ring or online dot */}
                  <div className="relative flex-shrink-0">
                    <div className={`relative w-14 h-14 rounded-full overflow-hidden ${user.is_live ? 'ring-[3px] ring-red-500' : ''}`}>
                      <Image
                        src={getAvatarUrl(user.avatar_url)}
                        alt={user.username}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/no-profile-pic.png';
                        }}
                      />
                    </div>
                    {/* Live badge */}
                    {user.is_live && (
                      <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    )}
                    {/* Online dot (purple) - only if not live */}
                    {!user.is_live && user.is_online && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-purple-500 rounded-full border-2 border-white dark:border-gray-800 shadow-lg" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <UserNameWithBadges
                      profileId={user.id}
                      name={user.display_name || user.username}
                      isMllPro={user.is_mll_pro}
                      textSize="text-lg"
                      nameClassName="font-semibold truncate"
                      showGifterBadge={false}
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {user.bio}
                      </p>
                    )}
                  </div>
                  
                  {/* Stats */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.follower_count.toLocaleString()} followers
                    </p>
                  </div>
                </Link>
              ))}
              
              {/* Load More */}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition font-semibold disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={20} />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

