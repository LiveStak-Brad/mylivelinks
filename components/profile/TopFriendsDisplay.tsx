'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Users, Settings } from 'lucide-react';

interface TopFriend {
  id: string;
  profile_id: string;
  friend_id: string;
  position: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_live: boolean;
  follower_count: number;
  total_gifts_received: number;
  gifter_level: number;
  created_at: string;
}

interface TopFriendsDisplayProps {
  profileId: string;
  isOwner: boolean;
  onManage?: () => void;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  accentColor?: string;
}

export default function TopFriendsDisplay({
  profileId,
  isOwner,
  onManage,
  cardStyle = {},
  borderRadiusClass = 'rounded-xl',
  accentColor = '#3B82F6',
}: TopFriendsDisplayProps) {
  const [topFriends, setTopFriends] = useState<TopFriend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopFriends();
  }, [profileId]);

  const loadTopFriends = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/profile/top-friends?profileId=${profileId}`);
      const data = await response.json();

      if (response.ok) {
        setTopFriends(data.topFriends || []);
      } else {
        console.error('[TOP_FRIENDS] Error loading:', data.error);
      }
    } catch (error) {
      console.error('[TOP_FRIENDS] Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show section if no friends and not owner
  if (!loading && topFriends.length === 0 && !isOwner) {
    return null;
  }

  return (
    <div
      className={`${borderRadiusClass} overflow-hidden shadow-lg mb-4 sm:mb-6 p-4 sm:p-6`}
      style={cardStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Users size={24} style={{ color: accentColor }} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Top Friends</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isOwner ? 'Your favorite people' : 'Their favorite people'}
            </p>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={onManage}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition hover:opacity-80"
            style={{ backgroundColor: accentColor, color: 'white' }}
          >
            <Settings size={16} />
            Manage
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-300 dark:bg-gray-700 rounded-lg mb-2" />
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State (Owner Only) */}
      {!loading && topFriends.length === 0 && isOwner && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Add up to 8 favorite friends to showcase on your profile!
          </p>
          <button
            onClick={onManage}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition hover:opacity-80"
            style={{ backgroundColor: accentColor, color: 'white' }}
          >
            <Users size={20} />
            Add Top Friends
          </button>
        </div>
      )}

      {/* Friends Grid */}
      {!loading && topFriends.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {topFriends.map((friend) => (
            <Link
              key={friend.friend_id}
              href={`/${friend.username}`}
              className="group relative"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 transition-transform duration-200 group-hover:scale-105 shadow-md group-hover:shadow-xl">
                {/* Avatar */}
                {friend.avatar_url ? (
                  <Image
                    src={friend.avatar_url}
                    alt={friend.username}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white text-3xl font-bold"
                    style={{ backgroundColor: accentColor }}
                  >
                    {friend.username[0].toUpperCase()}
                  </div>
                )}

                {/* Live Badge */}
                {friend.is_live && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}

                {/* Position Badge */}
                <div
                  className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  {friend.position}
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Name */}
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white font-bold text-sm truncate">
                    {friend.display_name || friend.username}
                  </p>
                  <p className="text-white/80 text-xs truncate">
                    @{friend.username}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {/* Empty Slots (Owner Only) */}
          {isOwner &&
            topFriends.length < 8 &&
            [...Array(8 - topFriends.length)].map((_, i) => (
              <button
                key={`empty-${i}`}
                onClick={onManage}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 flex items-center justify-center transition-colors"
              >
                <Users
                  size={32}
                  className="text-gray-400 dark:text-gray-500"
                />
              </button>
            ))}
        </div>
      )}

      {/* MySpace Nostalgia Note */}
      {!loading && topFriends.length > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6 italic">
          Just like the good old days 💙
        </p>
      )}
    </div>
  );
}

