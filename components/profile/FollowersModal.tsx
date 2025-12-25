'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  follower_count: number;
  is_live: boolean;
  followed_at?: string;
  friends_since?: string;
}

interface FollowersModalProps {
  profileId: string;
  type?: 'followers' | 'following' | 'friends';
  onClose: () => void;
}

export default function FollowersModal({
  profileId,
  type = 'followers',
  onClose
}: FollowersModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  
  useEffect(() => {
    loadUsers();
  }, [profileId, type]);
  
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const endpoint = type === 'followers' 
        ? `/api/profile/followers?profileId=${profileId}&limit=${limit}&offset=${offset}`
        : type === 'following'
        ? `/api/profile/following?profileId=${profileId}&limit=${limit}&offset=${offset}`
        : `/api/profile/friends?profileId=${profileId}&limit=${limit}&offset=${offset}`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.error) {
        console.error('Failed to load users:', data.error);
        return;
      }
      
      const newUsers = data[type] || [];
      setUsers(prev => offset === 0 ? newUsers : [...prev, ...newUsers]);
      setHasMore(newUsers.length === limit);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMore = () => {
    setOffset(prev => prev + limit);
    setTimeout(loadUsers, 100);
  };
  
  const getTitle = () => {
    switch (type) {
      case 'followers': return 'Followers';
      case 'following': return 'Following';
      case 'friends': return 'Friends';
      default: return 'Users';
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold">{getTitle()}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && offset === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No {type} yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/${user.username}`}
                  onClick={onClose}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {user.avatar_url ? (
                      <div className="relative w-14 h-14 rounded-full overflow-hidden">
                        <Image
                          src={user.avatar_url}
                          alt={user.username}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                        {(user.username?.[0] ?? '?').toUpperCase()}
                      </div>
                    )}
                    {user.is_live && (
                      <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        LIVE
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg truncate">
                      {user.display_name || user.username}
                    </p>
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

