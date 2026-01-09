'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { GifterBadge as TierBadge } from '@/components/gifter';
import UserNameWithBadges from '@/components/shared/UserNameWithBadges';
import type { GifterStatus } from '@/lib/gifter-status';
import { useIM } from '@/components/im';
import LiveAvatar from '@/components/LiveAvatar';
import ReportModal from './ReportModal';

type UserRole = 'viewer' | 'moderator' | 'admin' | 'owner';

interface MiniProfileProps {
  profileId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  /** New: Full GifterStatus object */
  gifterStatus?: GifterStatus | null;
  /** Legacy: Individual gifter props (used by Chat) */
  gifterLevel?: number;
  badgeName?: string;
  badgeColor?: string;
  isLive?: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
  onLeaveChannel?: () => void;
  onDisconnect?: () => void;
  /** V2: Live room context */
  inLiveRoom?: boolean;
  roomId?: string;
  liveStreamId?: number;
}

export default function MiniProfile({
  profileId,
  username,
  displayName,
  avatarUrl,
  gifterStatus,
  gifterLevel,
  badgeName,
  badgeColor,
  isLive = false,
  onClose,
  position,
  onLeaveChannel,
  onDisconnect,
  inLiveRoom = false,
  roomId,
  liveStreamId,
}: MiniProfileProps) {
  const router = useRouter();
  const supabase = createClient();
  const { openChat } = useIM();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('viewer');
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    checkCurrentUser();
    checkUserRole();
  }, []);

  useEffect(() => {
    if (currentUserId && currentUserId !== profileId) {
      checkBlockStatus();
      checkFollowStatus();
    }
  }, [currentUserId, profileId]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const checkUserRole = async () => {
    if (!inLiveRoom) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserRole('viewer');
        return;
      }

      // Check if user is admin (using the same logic as AdminModeration.tsx)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const isAdmin = (profile as any)?.username?.includes('admin') || false;
      
      if (isAdmin) {
        setCurrentUserRole('admin');
        return;
      }

      // Check if user is the room owner (in LiveKit room context, owner is the host/streamer)
      // For now, we'll check if the current user is the profile owner
      // TODO: Implement proper room owner check from room_presence or live_streams
      const { data: liveStream } = await supabase
        .from('live_streams')
        .select('profile_id')
        .eq('profile_id', user.id)
        .eq('live_available', true)
        .single();

      if (liveStream) {
        setCurrentUserRole('owner');
        return;
      }

      // TODO: Check if user is a moderator
      // This would require a room_moderators table or similar
      // For now, default to viewer
      setCurrentUserRole('viewer');
    } catch (error) {
      console.error('Error checking user role:', error);
      setCurrentUserRole('viewer');
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

  const handleBlock = async () => {
    if (!currentUserId || currentUserId === profileId) return;

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

  const handleUnblock = async () => {
    if (!currentUserId || currentUserId === profileId) return;

    setIsUnblocking(true);
    try {
      const { error } = await supabase.rpc('unblock_user', {
        p_blocker_id: currentUserId,
        p_blocked_id: profileId,
      });

      if (error) throw error;

      setIsBlocked(false);
      // Refresh the page to update filtered lists
      window.location.reload();
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Failed to unblock user');
    } finally {
      setIsUnblocking(false);
    }
  };

  const handleVisitProfile = () => {
    router.push(`/${username}`);
    onClose();
  };

  const handleIM = () => {
    openChat(profileId, username, avatarUrl || undefined);
    onClose();
  };

  const handleLeaveChannel = () => {
    if (onLeaveChannel) {
      onLeaveChannel();
    }
    onClose();
  };

  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    }
    onClose();
  };

  // ============ V2 LIVE ACTIONS ============

  const handleReport = () => {
    setShowReportModal(true);
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
    // Battle feature is explicitly marked as coming soon
    alert('Battle feature coming soon! Stay tuned.');
  };

  // ============ PERMISSIONS ============

  const canPromoteToMod = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canModerate = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'moderator';
  const isOwnProfile = currentUserId === profileId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-80 max-w-[90vw] relative"
        onClick={(e) => e.stopPropagation()}
        style={position ? { position: 'fixed', left: position.x, top: position.y } : {}}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Profile Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <LiveAvatar
              avatarUrl={avatarUrl}
              username={username}
              displayName={displayName || username}
              isLive={isLive}
              size="xl"
              showLiveBadge={true}
              clickable={false}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <UserNameWithBadges
                  profileId={profileId}
                  name={displayName || username}
                  gifterStatus={gifterStatus}
                  textSize="text-lg"
                  nameClassName="font-semibold text-gray-900 dark:text-white truncate"
                  gifterBadgeSize="md"
                />
                {isLive && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{username}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 space-y-2">
          {!isOwnProfile && (
            <>
              {/* Primary Actions - Always Visible */}
              <button
                onClick={handleFollow}
                disabled={isFollowLoading}
                className={`w-full px-4 py-2 rounded-lg transition text-sm font-semibold flex items-center justify-center gap-2 ${
                  isFollowing
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isFollowLoading ? (
                  'Loading...'
                ) : isFollowing ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Following
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Follow
                  </>
                )}
              </button>

              <button
                onClick={handleIM}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                IM
              </button>

              <button
                onClick={handleVisitProfile}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm font-semibold"
              >
                Visit Profile
              </button>

              {/* Live Room Actions - Only in Live Context */}
              {inLiveRoom && (
                <>
                  {isLive && (
                    <button
                      onClick={handleMoveToGrid}
                      className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      Move into Grid
                    </button>
                  )}

                  {/* Battle - Coming Soon (disabled for everyone) */}
                  <button
                    onClick={handleBattle}
                    disabled
                    className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed text-sm font-semibold flex items-center justify-center gap-2"
                    title="Coming Soon"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Battle (Coming Soon)
                  </button>

                  {/* Moderation Actions - Only for mods/admins/owner */}
                  {canModerate && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Moderation
                      </p>

                      <button
                        onClick={handleMute}
                        className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                        Mute
                      </button>

                      <button
                        onClick={handleRemove}
                        className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Remove from Room
                      </button>

                      {canPromoteToMod && (
                        <button
                          onClick={handlePromoteToMod}
                          className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition text-sm font-semibold flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          Promote to Mod
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Report & Block - Always Available */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

              <button
                onClick={handleReport}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Report
              </button>

              {isBlocked ? (
                <button
                  onClick={handleUnblock}
                  disabled={isUnblocking}
                  className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUnblocking ? 'Unblocking...' : 'Unblock'}
                </button>
              ) : (
                <button
                  onClick={handleBlock}
                  disabled={isBlocking}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBlocking ? 'Blocking...' : 'Block'}
                </button>
              )}
            </>
          )}

          {/* Video Controls (when video is connected) */}
          {(onLeaveChannel || onDisconnect) && (
            <>
              {onLeaveChannel && (
                <button
                  onClick={handleLeaveChannel}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-semibold"
                >
                  Leave Channel
                </button>
              )}
              {onDisconnect && (
                <button
                  onClick={handleDisconnect}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold"
                >
                  Disconnect
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportType="user"
          reportedUserId={profileId}
          reportedUsername={username}
          contextDetails={JSON.stringify({
            content_kind: 'profile',
            profile_id: profileId,
            username,
            surface: inLiveRoom ? 'mini_profile_live' : 'mini_profile',
            live_room_id: inLiveRoom ? roomId ?? null : null,
          })}
        />
      )}
    </div>
  );
}

