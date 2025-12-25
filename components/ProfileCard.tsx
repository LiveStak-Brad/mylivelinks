'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UserPlus, Check, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface ProfileCardProps {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    follower_count: number;
    is_live: boolean;
  };
  currentUserId: string | null;
  onFollow?: (profileId: string, isFollowing: boolean) => void;
}

export default function ProfileCard({ profile, currentUserId, onFollow }: ProfileCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const supabase = createClient();

  // Check follow status on mount
  useEffect(() => {
    if (!currentUserId) return;
    
    const checkFollowStatus = async () => {
      // Check if you follow them
      const { data: youFollowThem } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('followee_id', profile.id)
        .maybeSingle();
      
      setIsFollowing(!!youFollowThem);

      // Check if they follow you
      const { data: theyFollowYou } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', profile.id)
        .eq('followee_id', currentUserId)
        .maybeSingle();
      
      setFollowsYou(!!theyFollowYou);
    };
    
    checkFollowStatus();
  }, [currentUserId, profile.id, supabase]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUserId || followLoading) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followee_id', profile.id);
        setIsFollowing(false);
        onFollow?.(profile.id, false);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            followee_id: profile.id
          });
        setIsFollowing(true);
        onFollow?.(profile.id, true);
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const displayName = profile.display_name || profile.username;
  const truncatedBio = profile.bio ? (profile.bio.length > 80 ? profile.bio.substring(0, 80) + '...' : profile.bio) : 'No bio yet';

  return (
    <div 
      className="relative flex-shrink-0 w-72 group"
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
    >
      {/* Card */}
      <Link
        href={`/${profile.username}`}
        className="block bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-purple-500"
      >
        {/* Avatar & Live Badge */}
        <div className="relative h-48 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={120}
              height={120}
              className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-xl"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center border-4 border-white shadow-xl">
              <span className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {profile.is_live && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse shadow-lg">
              🔴 LIVE
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate mb-1">
            {displayName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
            @{profile.username}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
            {truncatedBio}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {profile.follower_count.toLocaleString()} followers
            </span>
            {currentUserId && currentUserId !== profile.id && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition ${
                  isFollowing
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                    : followsYou
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                } disabled:opacity-50`}
              >
                {followLoading ? (
                  '...'
                ) : isFollowing ? (
                  <>
                    <Check className="w-3 h-3" />
                    Following
                  </>
                ) : followsYou ? (
                  <>
                    <UserPlus className="w-3 h-3" />
                    Follow Back
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3" />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </Link>

      {/* Hover Popup - Desktop Only */}
      {showPopup && (
        <div className="hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 pointer-events-none">
          <div className="flex items-start gap-3 mb-3">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                width={60}
                height={60}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 dark:text-white truncate">
                {displayName}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                @{profile.username}
              </p>
              {profile.is_live && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                  🔴 LIVE NOW
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {profile.bio || 'No bio yet'}
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {profile.follower_count.toLocaleString()} followers
            </span>
            <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
              View Profile <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

