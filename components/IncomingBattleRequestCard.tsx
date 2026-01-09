'use client';

/**
 * IncomingBattleRequestCard - Compact inline card for battle/cohost requests
 * 
 * Replaces the full modal with a lightweight, stacked card design.
 * Shows profile photo, username, mode/time, and accept/decline buttons.
 */

import { useState } from 'react';
import Image from 'next/image';
import { Swords, UserPlus, Zap, Trophy, Check, X, Loader2 } from 'lucide-react';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { respondToInvite } from '@/lib/battle-session';
import type { LiveSessionInvite } from '@/lib/battle-session';

interface InviterProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface IncomingBattleRequestCardProps {
  invite: LiveSessionInvite;
  inviter: InviterProfile;
  onAccepted: (sessionId: string) => void;
  onDeclined: () => void;
}

export default function IncomingBattleRequestCard({
  invite,
  inviter,
  onAccepted,
  onDeclined,
}: IncomingBattleRequestCardProps) {
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null);

  const isBattle = invite.type === 'battle';
  const isSpeed = invite.mode === 'speed';

  const handleAccept = async () => {
    setResponding('accept');
    try {
      const result = await respondToInvite(invite.id, 'accepted');
      if (result.session_id) {
        onAccepted(result.session_id);
      }
    } catch (err: any) {
      console.error('[IncomingBattleRequestCard] Accept error:', err);
      onDeclined();
    } finally {
      setResponding(null);
    }
  };

  const handleDecline = async () => {
    setResponding('decline');
    try {
      await respondToInvite(invite.id, 'declined');
      onDeclined();
    } catch (err: any) {
      console.error('[IncomingBattleRequestCard] Decline error:', err);
      onDeclined();
    } finally {
      setResponding(null);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 shadow-lg">
      {/* Icon */}
      <div className={`w-10 h-10 ${isBattle ? 'bg-orange-500/20' : 'bg-purple-500/20'} rounded-full flex items-center justify-center flex-shrink-0`}>
        {isBattle ? (
          <Swords className="w-5 h-5 text-orange-500" />
        ) : (
          <UserPlus className="w-5 h-5 text-purple-500" />
        )}
      </div>

      {/* Profile Photo */}
      <Image
        src={getAvatarUrl(inviter.avatar_url)}
        alt={inviter.username}
        width={40}
        height={40}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">
          {inviter.display_name || inviter.username}
        </p>
        <p className="text-white/60 text-xs truncate">
          @{inviter.username}
        </p>
      </div>

      {/* Mode Badge */}
      <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-full flex-shrink-0">
        {isSpeed ? (
          <Zap className="w-3 h-3 text-yellow-400" />
        ) : (
          <Trophy className="w-3 h-3 text-orange-400" />
        )}
        <span className="text-white/80 text-xs font-medium">
          {isSpeed ? '1:00' : '3:00'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDecline}
          disabled={responding !== null}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
          title="Decline"
        >
          {responding === 'decline' ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <X className="w-4 h-4 text-white" />
          )}
        </button>
        <button
          onClick={handleAccept}
          disabled={responding !== null}
          className={`p-2 rounded-full ${
            isBattle ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-500 hover:bg-purple-600'
          } transition-colors disabled:opacity-50`}
          title="Accept"
        >
          {responding === 'accept' ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Check className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
