'use client';

/**
 * IncomingBattleRequestCard - Compact inline card for battle/cohost requests
 * 
 * Replaces the full modal with a lightweight, stacked card design.
 * Shows profile photo, username, mode/time, current participants, and accept/decline buttons.
 */

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Swords, UserPlus, Zap, Trophy, Check, X, Loader2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { respondToInvite, getSessionParticipants, SessionParticipant } from '@/lib/battle-session';
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
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const isBattle = invite.type === 'battle';
  const isSpeed = invite.mode === 'speed';

  // Fetch session participants if invite has a session_id (joining existing session)
  useEffect(() => {
    if (!invite.session_id) {
      setParticipants([]);
      return;
    }

    setLoadingParticipants(true);
    getSessionParticipants(invite.session_id)
      .then(data => {
        setParticipants(data || []);
      })
      .catch(err => {
        console.error('[IncomingBattleRequestCard] Error fetching participants:', err);
      })
      .finally(() => {
        setLoadingParticipants(false);
      });
  }, [invite.session_id]);

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
    <div className="p-3 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 shadow-lg">
      {/* Main Row */}
      <div className="flex items-center gap-3">
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

      {/* Participants Row - Show who's already in the session */}
      {invite.session_id && participants.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-white/40" />
            <span className="text-white/40 text-xs">In party:</span>
            <div className="flex items-center -space-x-2">
              {participants.slice(0, 5).map((p) => (
                <Image
                  key={p.profile_id}
                  src={getAvatarUrl(p.avatar_url)}
                  alt={p.username}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full object-cover border-2 border-black"
                  title={p.display_name || p.username}
                />
              ))}
              {participants.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-white/20 border-2 border-black flex items-center justify-center">
                  <span className="text-white text-xs font-medium">+{participants.length - 5}</span>
                </div>
              )}
            </div>
            <span className="text-white/60 text-xs truncate">
              {participants.map(p => p.display_name || p.username).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Loading state for participants */}
      {invite.session_id && loadingParticipants && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 text-white/40 animate-spin" />
            <span className="text-white/40 text-xs">Loading party...</span>
          </div>
        </div>
      )}
    </div>
  );
}
