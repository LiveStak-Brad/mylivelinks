'use client';

/**
 * IncomingInviteSheet - Bottom sheet for incoming battle/cohost invites
 * 
 * Pops up when another host sends an invite.
 * Shows: Inviter info, type (battle/cohost), mode, accept/decline buttons.
 */

import { useState, useEffect, useMemo } from 'react';
import { Swords, UserPlus, X, Check, Loader2, Zap, Trophy } from 'lucide-react';
import Image from 'next/image';
import BottomSheetModal from './BottomSheetModal';
import { createClient } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { LiveSessionInvite, respondToInvite } from '@/lib/battle-session';

interface InviterProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface IncomingInviteSheetProps {
  invite: LiveSessionInvite | null;
  onAccepted: (sessionId: string) => void;
  onDeclined: () => void;
  onClose: () => void;
}

export default function IncomingInviteSheet({
  invite,
  onAccepted,
  onDeclined,
  onClose,
}: IncomingInviteSheetProps) {
  const [inviter, setInviter] = useState<InviterProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null);
  
  const supabase = useMemo(() => createClient(), []);
  
  const isOpen = !!invite;
  const isBattle = invite?.type === 'battle';
  const isSpeed = invite?.mode === 'speed';
  
  // Fetch inviter profile
  useEffect(() => {
    if (!invite) {
      setInviter(null);
      return;
    }
    
    setLoading(true);
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', invite.from_host_id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('[IncomingInviteSheet] Error fetching inviter:', error);
        } else {
          setInviter(data as InviterProfile);
        }
        setLoading(false);
      });
  }, [invite, supabase]);
  
  const handleAccept = async () => {
    if (!invite) return;
    
    setResponding('accept');
    try {
      const result = await respondToInvite(invite.id, 'accepted');
      if (result.session_id) {
        onAccepted(result.session_id);
      }
    } catch (err: any) {
      console.error('[IncomingInviteSheet] Accept error:', err);
      // Still close on error
      onClose();
    } finally {
      setResponding(null);
    }
  };
  
  const handleDecline = async () => {
    if (!invite) return;
    
    setResponding('decline');
    try {
      await respondToInvite(invite.id, 'declined');
      onDeclined();
    } catch (err: any) {
      console.error('[IncomingInviteSheet] Decline error:', err);
      // Still close on error
      onClose();
    } finally {
      setResponding(null);
    }
  };

  return (
    <BottomSheetModal
      open={isOpen}
      onClose={onClose}
      title={isBattle ? 'Battle Request' : 'Co-Host Request'}
      titleIcon={
        <div className={`w-10 h-10 ${isBattle ? 'bg-orange-500/20' : 'bg-purple-500/20'} rounded-full flex items-center justify-center`}>
          {isBattle ? (
            <Swords className="w-5 h-5 text-orange-500" />
          ) : (
            <UserPlus className="w-5 h-5 text-purple-500" />
          )}
        </div>
      }
      maxHeightVh={40}
    >
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : inviter ? (
          <>
            {/* Inviter Info */}
            <div className="flex items-center gap-4">
              <Image
                src={getAvatarUrl(inviter.avatar_url)}
                alt={inviter.username}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
              />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                  {inviter.display_name || inviter.username}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  @{inviter.username}
                </p>
              </div>
            </div>
            
            {/* Request Type & Mode */}
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
              isBattle ? 'bg-orange-500/10' : 'bg-purple-500/10'
            }`}>
              <div className={`w-10 h-10 ${
                isBattle ? 'bg-orange-500/20' : 'bg-purple-500/20'
              } rounded-full flex items-center justify-center`}>
                {isSpeed ? (
                  <Zap className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Trophy className={`w-5 h-5 ${isBattle ? 'text-orange-500' : 'text-purple-500'}`} />
                )}
              </div>
              <div>
                <p className={`font-medium ${isBattle ? 'text-orange-600 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'}`}>
                  {isBattle ? 'Battle Request' : 'Co-Host Request'}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {isSpeed ? 'Speed Mode (1:00)' : 'Standard Mode (3:00)'}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                disabled={responding !== null}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
              >
                {responding === 'decline' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <X className="w-5 h-5" />
                )}
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={responding !== null}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 ${
                  isBattle ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-500 hover:bg-purple-600'
                } text-white rounded-lg transition-colors font-medium disabled:opacity-50`}
              >
                {responding === 'accept' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Accept
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Invite not found</p>
          </div>
        )}
      </div>
    </BottomSheetModal>
  );
}
