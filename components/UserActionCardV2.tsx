'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { useIM } from '@/components/im';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import ReportModal from './ReportModal';
import {
  MessageSquare,
  User,
  UserPlus,
  UserCheck,
  LayoutGrid,
  Volume2,
  UserX,
  Shield,
  Swords,
  Flag,
  Ban,
  X,
} from 'lucide-react';

type UserRole = 'viewer' | 'moderator' | 'admin' | 'owner';

interface UserActionCardV2Props {
  profileId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  gifterStatus?: GifterStatus | null;
  isLive?: boolean;
  viewerCount?: number;
  onClose: () => void;
  
  // V2 Context
  inLiveRoom?: boolean;
  roomId?: string;
  liveStreamId?: number;
  
  // V2: Role-based visibility
  currentUserRole?: UserRole;
}

export default function UserActionCardV2({
  profileId,
  username,
  displayName,
  avatarUrl,
  gifterStatus,
  isLive = false,
  viewerCount,
  onClose,
  inLiveRoom = false,
  roomId,
  liveStreamId,
  currentUserRole = 'viewer',
}: UserActionCardV2Props) {
  const router = useRouter();
  const supabase = createClient();
  const { openChat } = useIM();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [detectedRole, setDetectedRole] = useState<UserRole>(currentUserRole);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    checkCurrentUser();
    checkUserRole();
  }, []);

  useEffect(() => {
    if (currentUserId && currentUserId !== profileId) {
      checkFollowStatus();
      checkBlockStatus();
    }
  }, [currentUserId, profileId]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const checkUserRole = async () => {
    // If role was explicitly passed, use it
    if (currentUserRole !== 'viewer') {
      setDetectedRole(currentUserRole);
      return;
    }

    if (!inLiveRoom) {
      setDetectedRole('viewer');
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDetectedRole('viewer');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const isAdmin = (profile as any)?.username?.includes('admin') || false;
      
      if (isAdmin) {
        setDetectedRole('admin');
        return;
      }

      // Check if user is the room owner (streaming)
      const { data: liveStream } = await supabase
        .from('live_streams')
        .select('profile_id')
        .eq('profile_id', user.id)
        .eq('live_available', true)
        .single();

      if (liveStream) {
        setDetectedRole('owner');
        return;
      }

      // TODO: Check moderator status from room_moderators table when implemented
      setDetectedRole('viewer');
    } catch (error) {
      console.error('Error checking user role:', error);
      setDetectedRole('viewer');
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUserId || currentUserId === profileId) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('followee_id', profileId)
        .maybeSingle();

      if (!error) {
        setIsFollowing(!!data);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const checkBlockStatus = async () => {
    if (!currentUserId || currentUserId === profileId) return;

    try {
      const { data, error } = await supabase.rpc('is_blocked', {
        p_user_id: currentUserId,
        p_other_user_id: profileId,
      });

      if (!error && data !== undefined) {
        setIsBlocked(data);
      }
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  const isOwnProfile = currentUserId === profileId;

  // Role-based visibility helpers
  const canModerate = detectedRole === 'moderator' || detectedRole === 'admin' || detectedRole === 'owner';
  const canPromote = detectedRole === 'admin' || detectedRole === 'owner';

  // ========== REAL ACTION HANDLERS ==========

  const handleFollow = async () => {
    if (!currentUserId || currentUserId === profileId) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followee_id', profileId);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            followee_id: profileId,
          });

        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      alert('Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleIM = () => {
    openChat(profileId, username, avatarUrl || undefined);
    onClose();
  };

  const handleVisitProfile = () => {
    router.push(`/${username}`);
    onClose();
  };

  const handleMoveToGrid = async () => {
    if (!inLiveRoom || !liveStreamId) {
      console.log('[TODO] Move to grid: No live stream context available');
      alert('Move to Grid feature is not yet fully implemented');
      return;
    }

    try {
      // TODO: Implement actual grid management API
      console.log('[TODO] Move to grid:', { profileId, username, liveStreamId });
      alert(`Move to Grid feature coming soon. Would move ${username} to grid.`);
    } catch (error) {
      console.error('Error moving to grid:', error);
      alert('Failed to move user to grid');
    }
  };

  const handleMute = async () => {
    if (!inLiveRoom) {
      console.log('[TODO] Mute: No live room context available');
      return;
    }

    try {
      // TODO: Implement actual mute API via LiveKit or room management
      console.log('[TODO] Mute user:', { profileId, username });
      alert(`Mute feature coming soon. Would mute ${username}'s audio.`);
    } catch (error) {
      console.error('Error muting user:', error);
      alert('Failed to mute user');
    }
  };

  const handleRemove = async () => {
    if (!inLiveRoom) {
      console.log('[TODO] Remove: No live room context available');
      return;
    }

    const confirmed = confirm(`Remove ${username} from the live room?`);
    if (!confirmed) return;

    try {
      // TODO: Implement actual remove API
      // This should disconnect the user from LiveKit room and clear their room presence
      console.log('[TODO] Remove user:', { profileId, username });
      alert(`Remove feature coming soon. Would remove ${username} from room.`);
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user');
    }
  };

  const handlePromoteToMod = async () => {
    if (!inLiveRoom || !roomId) {
      console.log('[TODO] Promote to mod: No live room context available');
      return;
    }

    const confirmed = confirm(`Promote ${username} to moderator?`);
    if (!confirmed) return;

    try {
      // TODO: Implement room_moderators table and API
      // For now, this is a stub
      console.log('[TODO] Promote to moderator:', { profileId, username, roomId });
      alert(`Promote to Moderator feature coming soon. Would promote ${username}.`);
    } catch (error) {
      console.error('Error promoting to moderator:', error);
      alert('Failed to promote user');
    }
  };

  const handleBattle = () => {
    // Battle feature is explicitly marked as coming soon - intentionally does nothing
    console.log('[Battle] Coming Soon feature clicked');
  };

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleBlock = async () => {
    if (!currentUserId || currentUserId === profileId) return;

    const confirmed = confirm(`Block ${username}? They won't be able to see your content.`);
    if (!confirmed) return;

    setIsBlocking(true);
    try {
      const { error } = await supabase.rpc('block_user', {
        p_blocker_id: currentUserId,
        p_blocked_id: profileId,
      });

      if (error) throw error;

      setIsBlocked(true);
      // Refresh the page to update filtered lists
      window.location.reload();
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-96 max-w-[90vw] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-700">
              <Image
                src={getAvatarUrl(avatarUrl)}
                alt={username}
                fill
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/no-profile-pic.png';
                }}
              />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-xl truncate text-gray-900 dark:text-white">
                  {displayName || username}
                </h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">@{username}</p>
              
              {/* Live indicator + viewer count */}
              {isLive && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                  {viewerCount !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {viewerCount} watching
                    </span>
                  )}
                </div>
              )}

              {/* Gifter Badge */}
              {gifterStatus && Number(gifterStatus.lifetime_coins ?? 0) > 0 && (
                <div className="mt-2">
                  <TierBadge
                    tier_key={gifterStatus.tier_key}
                    level={gifterStatus.level_in_tier}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Primary Actions */}
        {!isOwnProfile && (
          <div className="p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Follow/Following */}
              <button
                onClick={handleFollow}
                disabled={isFollowLoading}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isFollowing
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isFollowLoading ? (
                  'Loading...'
                ) : isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>

              {/* IM */}
              <button
                onClick={handleIM}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition font-semibold text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                IM
              </button>
            </div>

            {/* Visit Profile */}
            <button
              onClick={handleVisitProfile}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition font-semibold text-sm"
            >
              <User className="w-4 h-4" />
              Visit Profile
            </button>
          </div>
        )}

        {/* Live Actions - Only show if in live room */}
        {inLiveRoom && !isOwnProfile && (
          <div className="px-4 pb-4">
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Live Actions
              </h4>

              {/* Moderator/Admin/Owner Actions */}
              {canModerate && (
                <>
                  <button
                    onClick={handleMoveToGrid}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition font-medium text-sm"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Move into Grid
                  </button>

                  <button
                    onClick={handleMute}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition font-medium text-sm"
                  >
                    <Volume2 className="w-4 h-4" />
                    Mute
                  </button>

                  <button
                    onClick={handleRemove}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition font-medium text-sm"
                  >
                    <UserX className="w-4 h-4" />
                    Remove from Stream
                  </button>
                </>
              )}

              {/* Owner/Admin Only */}
              {canPromote && (
                <button
                  onClick={handlePromoteToMod}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition font-medium text-sm"
                >
                  <Shield className="w-4 h-4" />
                  Promote to Mod
                </button>
              )}

              {/* Battle - Coming Soon (disabled, visible to all) */}
              <button
                disabled
                onClick={handleBattle}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 rounded-xl cursor-not-allowed font-medium text-sm relative"
                title="Coming Soon"
              >
                <Swords className="w-4 h-4" />
                Battle
                <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Safety Section */}
        {!isOwnProfile && (
          <div className="px-4 pb-4">
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Safety
              </h4>

              <button
                onClick={handleReport}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium text-sm"
              >
                <Flag className="w-4 h-4" />
                Report
              </button>

              <button
                onClick={handleBlock}
                disabled={isBlocking}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban className="w-4 h-4" />
                {isBlocking ? 'Blocking...' : isBlocked ? 'Blocked' : 'Block'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportType="user"
          reportedUserId={profileId}
          reportedUsername={username}
          contextDetails={inLiveRoom ? `live_room:${roomId}` : undefined}
        />
      )}
    </div>
  );
}

