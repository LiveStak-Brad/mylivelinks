'use client';

/**
 * BattleInvitePopup - Modal for accepting/declining battle invites during cohost
 * 
 * Shows when other host sends a battle invite
 * User can accept to start battle or decline to continue cohosting
 */

import { useState } from 'react';
import { Swords, X } from 'lucide-react';

interface BattleInvitePopupProps {
  /** Invite ID */
  inviteId: string;
  /** Username of host who sent invite */
  fromUsername: string;
  /** Callback when user accepts */
  onAccept: (inviteId: string) => Promise<void>;
  /** Callback when user declines */
  onDecline: (inviteId: string) => Promise<void>;
  /** Callback when popup closes */
  onClose: () => void;
}

export default function BattleInvitePopup({
  inviteId,
  fromUsername,
  onAccept,
  onDecline,
  onClose,
}: BattleInvitePopupProps) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccept(inviteId);
      onClose();
    } catch (err) {
      console.error('[BattleInvitePopup] Accept error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await onDecline(inviteId);
      onClose();
    } catch (err) {
      console.error('[BattleInvitePopup] Decline error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Swords className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Battle Challenge!
        </h2>

        {/* Message */}
        <p className="text-white/80 text-center mb-6">
          <span className="font-semibold text-orange-400">{fromUsername}</span> wants to start a battle!
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Swords className="w-5 h-5" />
                <span>Accept Battle</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
