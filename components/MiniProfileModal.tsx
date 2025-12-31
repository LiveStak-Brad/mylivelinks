'use client';

import { useState, useEffect } from 'react';
import { X, MessageCircle, UserPlus, UserMinus, Share2, Flag } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import Image from 'next/image';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';

interface MiniProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  username: string;
  onMessageClick?: () => void;
  onReportClick?: () => void;
  isStreamerProfile?: boolean; // true for streamers (show stream stats), false for chat viewers (personal stats only)
}

interface ProfileData {
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  follower_count: number;
  following_count: number;
  gifter_status?: GifterStatus | null;
  created_at?: string;
  total_streams?: number;
  total_gifts_received?: number;
  total_diamonds?: number;
  diamonds_sent?: number;
  battle_wins?: number;
  battle_losses?: number;
}

export default function MiniProfileModal({ 
  isOpen, 
  onClose, 
  profileId, 
  username,
  onMessageClick,
  onReportClick,
  isStreamerProfile = true // Default to streamer profile (backward compatible)
}: MiniProfileModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;
    loadProfile();
  }, [isOpen, profileId]);

  const loadProfile = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    // Load profile data
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, bio, created_at')
      .eq('id', profileId)
      .single();

    // Get follower/following counts
    const { count: followerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileId);

    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileId);

    // Get total streams count
    const { count: totalStreams } = await supabase
      .from('live_streams')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);

    // Get total gifts received
    const { count: totalGifts } = await supabase
      .from('gifts')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', profileId);

    // Get total diamonds (sum of coin_value from gifts received)
    const { data: diamondsData } = await supabase
      .from('gifts')
      .select('coin_value')
      .eq('recipient_id', profileId);
    
    const totalDiamonds = diamondsData?.reduce((sum, gift) => sum + (gift.coin_value || 0), 0) || 0;

    // Get diamonds sent
    const { data: diamondsSentData } = await supabase
      .from('gifts')
      .select('coin_value')
      .eq('sender_id', profileId);
    
    const diamondsSent = diamondsSentData?.reduce((sum, gift) => sum + (gift.coin_value || 0), 0) || 0;

    // Get battle stats (placeholder - will need actual battle tracking table)
    const battleWins = 0; // TODO: Query battles table
    const battleLosses = 0; // TODO: Query battles table

    console.log('[MiniProfile] Stats:', { 
      followerCount, 
      followingCount,
      totalStreams,
      totalGifts,
      totalDiamonds,
      diamondsSent,
      battleWins,
      battleLosses,
      profileId 
    });

    // Check if current user is following
    if (user?.id && user.id !== profileId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profileId)
        .single();
      
      setIsFollowing(!!followData);
    }

    // Get gifter status
    const gifterStatuses = await fetchGifterStatuses([profileId]);
    const gifterStatus = gifterStatuses[profileId] || null;

    setProfile({
      username: profileData?.username || username,
      display_name: profileData?.display_name,
      avatar_url: profileData?.avatar_url,
      bio: profileData?.bio,
      follower_count: followerCount || 0,
      following_count: followingCount || 0,
      gifter_status: gifterStatus,
      created_at: profileData?.created_at,
      total_streams: totalStreams || 0,
      total_gifts_received: totalGifts || 0,
      total_diamonds: totalDiamonds,
      diamonds_sent: diamondsSent,
      battle_wins: battleWins,
      battle_losses: battleLosses,
    });

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!currentUserId || !profileId) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profileId);
        setIsFollowing(false);
        if (profile) {
          setProfile({ ...profile, follower_count: profile.follower_count - 1 });
        }
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: profileId,
          });
        setIsFollowing(true);
        if (profile) {
          setProfile({ ...profile, follower_count: profile.follower_count + 1 });
        }
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/${profile?.username || username}`;
    if (navigator.share) {
      navigator.share({
        title: `${profile?.display_name || profile?.username || username}'s Profile`,
        url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
      });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in flex flex-col modal-fullscreen-mobile"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : profile ? (
          <>
            {/* Compact Header */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-3 flex-shrink-0 mobile-safe-top">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition text-white z-10 mobile-touch-target"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <Image
                  src={getAvatarUrl(profile.avatar_url)}
                  alt={profile.username}
                  width={60}
                  height={60}
                  className="rounded-full border-2 border-white"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-white leading-tight truncate">
                        {profile.display_name || profile.username}
                      </h2>
                      {profile.gifter_status && (
                        <div className="flex mt-1">
                          <TierBadge
                            tier_key={profile.gifter_status.tier_key}
                            level={profile.gifter_status.level_in_tier}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                    {currentUserId && currentUserId !== profileId && (
                      <button
                        onClick={handleFollow}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0 ${
                          isFollowing
                            ? 'bg-white/20 text-white hover:bg-white/30'
                            : 'bg-white text-purple-600 hover:bg-white/90'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="modal-body px-4 py-3">
              {/* Stats - Different for streamers vs chat viewers */}
              {isStreamerProfile ? (
                // Streamer Profile: Show stream-related stats
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      {profile.follower_count.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Followers
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      {profile.following_count.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Following
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-purple-600 dark:text-purple-400">
                      {profile.total_diamonds?.toLocaleString() || 0}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Received
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-pink-600 dark:text-pink-400">
                      {profile.diamonds_sent?.toLocaleString() || 0}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Sent
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      {profile.total_streams?.toLocaleString() || 0}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Streams
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-green-600 dark:text-green-400">
                      {profile.battle_wins || 0}W - {profile.battle_losses || 0}L
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      {(() => {
                        const total = (profile.battle_wins || 0) + (profile.battle_losses || 0);
                        const winRate = total > 0 ? Math.round(((profile.battle_wins || 0) / total) * 100) : 0;
                        return `${winRate}% Win`;
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                // Chat Viewer Profile: Show personal stats only (no stream/battle stats)
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      {profile.follower_count.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Followers
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      {profile.following_count.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Following
                    </div>
                  </div>
                  {/* TODO: Add user setting to hide gift stats */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center col-span-2">
                    <div className="text-base font-bold text-purple-600 dark:text-purple-400">
                      {profile.total_diamonds?.toLocaleString() || 0}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Total Diamonds
                    </div>
                  </div>
                </div>
              )}

              {/* Member Since */}
              {profile.created_at && (
                <div className="text-center text-[10px] text-gray-500 dark:text-gray-400 mb-3">
                  Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              )}

              {/* Action Button */}
              <a
                href={`/${profile.username}`}
                className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all text-center font-semibold"
              >
                View Profile
              </a>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Profile not found
          </div>
        )}
      </div>
    </div>
  );
}
