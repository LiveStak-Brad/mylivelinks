'use client';

/**
 * IncomingBattleRequestStack - Stacked inline cards for pending battle/cohost invites
 * 
 * Replaces the modal-based IncomingInviteSheet with lightweight stacked cards.
 * Fetches inviter profiles and renders cards with reliable data.
 */

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import IncomingBattleRequestCard from './IncomingBattleRequestCard';
import type { LiveSessionInvite } from '@/lib/battle-session';

interface InviterProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface IncomingBattleRequestStackProps {
  invites: LiveSessionInvite[];
  onAccepted: (sessionId: string) => void;
  onDeclined: (inviteId: string) => void;
}

export default function IncomingBattleRequestStack({
  invites,
  onAccepted,
  onDeclined,
}: IncomingBattleRequestStackProps) {
  const [inviterProfiles, setInviterProfiles] = useState<Map<string, InviterProfile>>(new Map());
  const [loading, setLoading] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);

  // Fetch inviter profiles for all pending invites
  useEffect(() => {
    if (invites.length === 0) {
      setInviterProfiles(new Map());
      return;
    }

    const inviterIds = [...new Set(invites.map(inv => inv.from_host_id))];
    
    setLoading(true);
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', inviterIds)
      .then(({ data, error }) => {
        if (error) {
          console.error('[IncomingBattleRequestStack] Error fetching inviters:', error);
        } else if (data) {
          const profileMap = new Map<string, InviterProfile>();
          data.forEach(profile => {
            profileMap.set(profile.id, profile as InviterProfile);
          });
          setInviterProfiles(profileMap);
        }
        setLoading(false);
      });
  }, [invites, supabase]);

  if (invites.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-40 flex flex-col gap-2 max-w-md mx-auto pointer-events-none">
      {invites.map(invite => {
        const inviter = inviterProfiles.get(invite.from_host_id);
        if (!inviter && !loading) return null;
        
        // Show placeholder while loading
        if (!inviter) {
          return (
            <div key={invite.id} className="flex items-center gap-3 p-3 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 shadow-lg pointer-events-auto">
              <div className="w-10 h-10 bg-white/10 rounded-full animate-pulse" />
              <div className="w-10 h-10 bg-white/10 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded animate-pulse" />
                <div className="h-3 bg-white/10 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          );
        }

        return (
          <div key={invite.id} className="pointer-events-auto">
            <IncomingBattleRequestCard
              invite={invite}
              inviter={inviter}
              onAccepted={onAccepted}
              onDeclined={() => onDeclined(invite.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
