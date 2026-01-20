/**
 * Battle + Cohost Session API Helpers
 * 
 * Provides typed functions for interacting with battle/cohost sessions.
 */

import { createClient } from '@/lib/supabase';

export type SessionType = 'battle' | 'cohost';
export type SessionMode = 'speed' | 'standard';
export type SessionStatus = 'pending' | 'active' | 'cooldown' | 'ended';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type InviteTab = 'friends' | 'following' | 'followers' | 'everyone';

export interface SessionHost {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface SessionParticipant {
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  team: 'A' | 'B';
  slot_index: number;
  joined_at: string;
}

export interface LiveSession {
  session_id: string;
  type: SessionType;
  mode: SessionMode;
  status: SessionStatus;
  started_at: string | null;
  ends_at: string | null;
  cooldown_ends_at: string | null;
  host_a: SessionHost;
  host_b: SessionHost | null; // Can be null for multi-host sessions
  participants?: SessionParticipant[]; // New: array of all participants
}

export interface LiveSessionInvite {
  id: string;
  session_id: string | null;
  from_host_id: string;
  to_host_id: string;
  type: SessionType;
  mode: SessionMode;
  status: InviteStatus;
  created_at: string;
  responded_at: string | null;
}

export interface LiveUserForInvite {
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  viewer_count: number;
  is_friend: boolean;
  is_following: boolean;
  is_follower: boolean;
}

// Timer durations in seconds
export const TIMER_DURATIONS = {
  speed: { battle: 60, cooldown: 15 },
  standard: { battle: 180, cooldown: 30 },
} as const;

/**
 * Get live users available for invite
 */
export async function getLiveUsersForInvite(tab: InviteTab): Promise<LiveUserForInvite[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_get_live_users_for_invite', {
    p_tab: tab,
  });
  
  if (error) {
    console.error('[battle-session] getLiveUsersForInvite error:', error);
    throw error;
  }
  
  return (data || []) as LiveUserForInvite[];
}

/**
 * Send an invite to another host
 */
export async function sendInvite(
  toHostId: string,
  type: SessionType,
  mode: SessionMode = 'standard'
): Promise<string> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_send_invite', {
    p_to_host_id: toHostId,
    p_type: type,
    p_mode: mode,
  });
  
  if (error) {
    console.error('[battle-session] sendInvite error:', error);
    throw error;
  }
  
  return data as string;
}

/**
 * Respond to an invite (accept or decline)
 */
export async function respondToInvite(
  inviteId: string,
  response: 'accepted' | 'declined'
): Promise<{ status: string; session_id?: string; type?: string; mode?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_respond_to_invite', {
    p_invite_id: inviteId,
    p_response: response,
  });
  
  if (error) {
    console.error('[battle-session] respondToInvite error:', error);
    throw error;
  }
  
  return data as { status: string; session_id?: string; type?: string; mode?: string };
}

/**
 * Cancel a pending invite (sender only)
 */
export async function cancelInvite(inviteId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_cancel_invite', {
    p_invite_id: inviteId,
  });
  
  if (error) {
    console.error('[battle-session] cancelInvite error:', error);
    throw error;
  }
  
  return data as boolean;
}

/**
 * End a session or transition to cooldown
 */
export async function endSession(
  sessionId: string,
  action: 'end' | 'cooldown' = 'end'
): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_end_session', {
    p_session_id: sessionId,
    p_action: action,
  });
  
  if (error) {
    console.error('[battle-session] endSession error:', error);
    throw error;
  }
  
  return data as boolean;
}

/**
 * Start a rematch with the same opponent
 */
export async function startRematch(sessionId: string): Promise<string> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_start_rematch', {
    p_session_id: sessionId,
  });
  
  if (error) {
    console.error('[battle-session] startRematch error:', error);
    throw error;
  }
  
  return data as string;
}

/**
 * Convert a battle in cooldown back to cohost session
 * Called when cooldown timer expires - keeps everyone together
 */
export async function cooldownToCohost(sessionId: string): Promise<{ status: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_cooldown_to_cohost', {
    p_session_id: sessionId,
  });
  
  if (error) {
    console.error('[battle-session] cooldownToCohost error:', error);
    throw error;
  }
  
  return data as { status: string };
}

/**
 * Join the speed battle pool
 */
export async function joinBattlePool(): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_join_battle_pool');
  
  if (error) {
    console.error('[battle-session] joinBattlePool error:', error);
    throw error;
  }
  
  return data as boolean;
}

/**
 * Leave the speed battle pool
 */
export async function leaveBattlePool(): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_leave_battle_pool');
  
  if (error) {
    console.error('[battle-session] leaveBattlePool error:', error);
    throw error;
  }
  
  return data as boolean;
}

/**
 * Check current pool status
 */
export async function checkPoolStatus(): Promise<{
  in_pool: boolean;
  status?: string;
  matched?: boolean;
  session_id?: string;
  joined_at?: string;
}> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_check_pool_status');
  
  if (error) {
    console.error('[battle-session] checkPoolStatus error:', error);
    throw error;
  }
  
  return data as any;
}

/**
 * Try to trigger a pool match (called periodically by clients in pool)
 */
export async function triggerPoolMatch(): Promise<{
  matched: boolean;
  session_id?: string;
  reason?: string;
}> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_match_battle_pool');
  
  if (error) {
    console.error('[battle-session] triggerPoolMatch error:', error);
    throw error;
  }
  
  return data as any;
}

/**
 * Get active session for a host (used by viewers)
 */
export async function getActiveSessionForHost(hostId: string): Promise<LiveSession | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('rpc_get_active_session_for_host', {
    p_host_id: hostId,
  });
  
  if (error) {
    console.error('[battle-session] getActiveSessionForHost error:', error);
    throw error;
  }
  
  return data as LiveSession | null;
}

/**
 * Get pending invites for current user (as recipient)
 */
export async function getPendingInvites(): Promise<LiveSessionInvite[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) return [];
  
  const { data, error } = await supabase
    .from('live_session_invites')
    .select('*')
    .eq('to_host_id', userData.user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[battle-session] getPendingInvites error:', error);
    throw error;
  }
  
  return (data || []) as LiveSessionInvite[];
}

/**
 * Get room name for a session
 * Uses a consistent name that doesn't change when session type changes (cohost <-> battle)
 */
export function getSessionRoomName(sessionId: string, type: SessionType): string {
  // Always use 'session_' prefix so room name stays the same when type changes
  return `session_${sessionId}`;
}

/**
 * Calculate remaining time in seconds from ends_at timestamp
 */
export function getRemainingSeconds(endsAt: string | null): number {
  if (!endsAt) return 0;
  const endTime = new Date(endsAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((endTime - now) / 1000));
}

/**
 * Format seconds as MM:SS
 */
export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
