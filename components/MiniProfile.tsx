'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import Image from 'next/image';

interface MiniProfileProps {
  profileId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  gifterStatus?: GifterStatus | null;
  isLive?: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
  onLeaveChannel?: () => void;
  onDisconnect?: () => void;
}

export default function MiniProfile({
  profileId,
  username,
  displayName,
  avatarUrl,
  gifterStatus,
  isLive = false,
  onClose,
  position,
  onLeaveChannel,
  onDisconnect,
}: MiniProfileProps) {
  const router = useRouter();
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId && currentUserId !== profileId) {
      checkBlockStatus();
    }
  }, [currentUserId, profileId]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
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
    // TODO: Implement instant messaging
    alert('Instant messaging coming soon!');
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

  const isOwnProfile = currentUserId === profileId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 max-w-[90vw] relative"
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
            {avatarUrl ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={avatarUrl}
                  alt={username}
                  fill
                  className="object-cover"
                />
                {isLive && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800">
                    <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {(username?.[0] ?? '?').toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">{displayName || username}</h3>
                {isLive && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{username}</p>
              {gifterStatus && Number(gifterStatus.lifetime_coins ?? 0) > 0 && (
                <div className="mt-1">
                  <TierBadge
                    tier_key={gifterStatus.tier_key}
                    level={gifterStatus.level_in_tier}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 space-y-2">
          {!isOwnProfile && (
            <>
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
    </div>
  );
}

