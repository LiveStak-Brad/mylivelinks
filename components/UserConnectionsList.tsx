'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

interface UserConnection {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followed_at?: string;
  friends_since?: string;
}

interface UserConnectionsListProps {
  userId: string; // The profile user ID we're viewing
  listType: 'following' | 'followers' | 'friends';
  currentUserId?: string; // The logged-in user viewing this page
}

export default function UserConnectionsList({
  userId,
  listType,
  currentUserId,
}: UserConnectionsListProps) {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [canView, setCanView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const listTitles = {
    following: 'Following',
    followers: 'Followers',
    friends: 'Friends',
  };

  const emptyMessages = {
    following: 'Not following anyone yet',
    followers: 'No followers yet',
    friends: 'No mutual friends yet',
  };

  const privateMessages = {
    following: 'This user has hidden their following list',
    followers: 'This user has hidden their followers list',
    friends: 'This user has hidden their friends list',
  };

  useEffect(() => {
    loadConnections();
  }, [userId, listType, currentUserId]);

  const loadConnections = async () => {
    setLoading(true);
    setError(null);

    try {
      // First check if we can view this list
      const { data: permissions, error: permError } = await supabase.rpc(
        'can_view_user_lists',
        {
          target_user_id: userId,
          requesting_user_id: currentUserId || null,
        }
      );

      if (permError) {
        console.error('Error checking permissions:', permError);
        setCanView(true); // Default to showing if check fails
      } else {
        const canViewMap = {
          following: permissions?.can_view_following,
          followers: permissions?.can_view_followers,
          friends: permissions?.can_view_friends,
        };
        setCanView(canViewMap[listType] !== false);
      }

      // If we can't view, don't query
      if (permissions && !permissions[`can_view_${listType}`]) {
        setLoading(false);
        return;
      }

      // Query the appropriate list
      const rpcFunctionMap = {
        following: 'get_user_following',
        followers: 'get_user_followers',
        friends: 'get_user_friends',
      };

      const { data, error: queryError } = await supabase.rpc(
        rpcFunctionMap[listType],
        {
          target_user_id: userId,
          requesting_user_id: currentUserId || null,
        }
      );

      if (queryError) throw queryError;

      setConnections(data || []);
    } catch (err) {
      console.error(`Error loading ${listType}:`, err);
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="text-center p-8">
        <div className="inline-block p-4 bg-gray-800/50 rounded-lg">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="text-gray-400">{privateMessages[listType]}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-400">{emptyMessages[listType]}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">
        {listTitles[listType]} ({connections.length})
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connections.map((user) => (
          <Link
            key={user.id}
            href={`/${user.username}`}
            className="flex items-center space-x-3 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
          >
            {/* Avatar */}
            <div className="relative w-12 h-12 flex-shrink-0">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.username}
                  fill
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {user.display_name || user.username}
              </p>
              <p className="text-sm text-gray-400 truncate">@{user.username}</p>
              {user.bio && (
                <p className="text-xs text-gray-500 truncate mt-1">{user.bio}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

