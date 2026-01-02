/**
 * Team Invites API
 * 
 * Frontend functions for sending and responding to team invites.
 */

import { createClient } from '@/lib/supabase';

export interface TeamInvite {
  invite_id: number;
  team_id: string;
  team_name: string;
  team_slug: string;
  team_icon_url: string | null;
  inviter_id: string;
  inviter_username: string;
  inviter_display_name: string | null;
  inviter_avatar_url: string | null;
  message: string | null;
  created_at: string;
}

export interface SendInviteResult {
  success: boolean;
  invite_id?: number;
  team_slug?: string;
  error?: string;
}

export interface AcceptInviteResult {
  success: boolean;
  team_id?: string;
  team_slug?: string;
  error?: string;
}

/**
 * Send a team invite to a user
 */
export async function sendTeamInvite(
  teamId: string,
  inviteeId: string,
  message?: string
): Promise<SendInviteResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('rpc_send_team_invite', {
    p_team_id: teamId,
    p_invitee_id: inviteeId,
    p_message: message || null,
  });

  if (error) {
    console.error('[teamInvites] Send error:', error);
    return { success: false, error: error.message };
  }

  return data as SendInviteResult;
}

/**
 * Accept a team invite
 */
export async function acceptTeamInvite(inviteId: number): Promise<AcceptInviteResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('rpc_accept_team_invite', {
    p_invite_id: inviteId,
  });

  if (error) {
    console.error('[teamInvites] Accept error:', error);
    return { success: false, error: error.message };
  }

  return data as AcceptInviteResult;
}

/**
 * Decline a team invite
 */
export async function declineTeamInvite(inviteId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('rpc_decline_team_invite', {
    p_invite_id: inviteId,
  });

  if (error) {
    console.error('[teamInvites] Decline error:', error);
    return { success: false, error: error.message };
  }

  return data as { success: boolean; error?: string };
}

/**
 * Get pending team invites for the current user
 */
export async function getMyTeamInvites(): Promise<TeamInvite[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('rpc_get_my_team_invites');

  if (error) {
    console.error('[teamInvites] Get invites error:', error);
    return [];
  }

  return (data || []) as TeamInvite[];
}

/**
 * Search users to invite (followers/following who aren't in the team)
 */
export async function searchUsersToInvite(
  teamId: string,
  searchQuery?: string
): Promise<Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get users I follow
  const { data: following } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', user.id)
    .limit(200);

  // Get users who follow me
  const { data: followers } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('followee_id', user.id)
    .limit(200);

  // Combine and dedupe
  const userIds = new Set<string>();
  (following || []).forEach((f: any) => userIds.add(f.followee_id));
  (followers || []).forEach((f: any) => userIds.add(f.follower_id));
  userIds.delete(user.id); // Remove self

  if (userIds.size === 0) return [];

  // Get existing team members
  const { data: existingMembers } = await supabase
    .from('team_memberships')
    .select('profile_id')
    .eq('team_id', teamId)
    .in('status', ['approved', 'pending']);

  const memberIds = new Set((existingMembers || []).map((m: any) => m.profile_id));

  // Get pending invites
  const { data: pendingInvites } = await supabase
    .from('team_invites')
    .select('invitee_id')
    .eq('team_id', teamId)
    .eq('status', 'pending');

  const invitedIds = new Set((pendingInvites || []).map((i: any) => i.invitee_id));

  // Filter out existing members and already invited
  const eligibleIds = Array.from(userIds).filter(id => !memberIds.has(id) && !invitedIds.has(id));

  if (eligibleIds.length === 0) return [];

  // Fetch profiles
  let query = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', eligibleIds)
    .limit(50);

  if (searchQuery && searchQuery.trim()) {
    query = query.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
  }

  const { data: profiles } = await query;

  return (profiles || []).map((p: any) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
  }));
}
