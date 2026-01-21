'use client';

/**
 * BattleReadyModal - Popup for the battle ready phase
 * Shows all participants with their photo, username, and ready status
 * Current user can click "Ready Up" button
 */

import { useCallback } from 'react';
import Image from 'next/image';
import { Check, X, Loader2 } from 'lucide-react';
import { getAvatarUrl } from '@/lib/defaultAvatar';

interface Participant {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface BattleReadyModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** All participants in the session */
  participants: Participant[];
  /** Map of participant ID -> ready state */
  readyStates: Record<string, boolean>;
  /** Current user's ID */
  currentUserId: string;
  /** Whether current user is ready */
  isCurrentUserReady: boolean;
  /** Whether we're currently setting ready state */
  isSettingReady: boolean;
  /** Callback to set ready */
  onSetReady: () => void;
  /** Optional: Close callback for viewers (hosts can't close) */
  onClose?: () => void;
}

export default function BattleReadyModal({
  isOpen,
  participants,
  readyStates,
  currentUserId,
  isCurrentUserReady,
  isSettingReady,
  onSetReady,
}: BattleReadyModalProps) {
  if (!isOpen) return null;

  const readyCount = Object.values(readyStates).filter(Boolean).length;
  const totalCount = Object.keys(readyStates).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-green-500/20 to-emerald-500/20">
          <h2 className="text-xl font-bold text-white text-center">
            Battle Starting
          </h2>
          <p className="text-sm text-white/60 text-center mt-1">
            {readyCount} of {totalCount} ready
          </p>
        </div>

        {/* Participants List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {participants.map((participant) => {
            const isReady = readyStates[participant.id] === true;
            const isCurrentUser = participant.id === currentUserId;

            return (
              <div
                key={participant.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isReady 
                    ? 'bg-green-500/20 border border-green-500/50' 
                    : 'bg-red-500/20 border border-red-500/50'
                }`}
              >
                {/* Avatar */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={getAvatarUrl(participant.avatarUrl)}
                    alt={participant.username || 'User'}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Name & Status */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {participant.displayName || participant.username || 'Unknown'}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-white/50">(You)</span>
                    )}
                  </div>
                  <div className={`text-sm font-medium ${
                    isReady ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isReady ? 'Ready' : 'Not Ready'}
                  </div>
                </div>

                {/* Status Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isReady ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {isReady ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <X className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ready Up Button (for current user if not ready) */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
          {isCurrentUserReady ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-green-500/20 border border-green-500/50 rounded-xl">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">
                Waiting for others...
              </span>
            </div>
          ) : (
            <button
              onClick={onSetReady}
              disabled={isSettingReady}
              className="w-full flex items-center justify-center gap-2 py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-lg rounded-xl transition-colors disabled:opacity-50"
            >
              {isSettingReady ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Ready Up!</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
