/**
 * Team Invites API
 * 
 * Frontend functions for sending and responding to team invites.
 */

import { createClient } from '@/lib/supabase';

 const teamIdBySlugCache = new Map<string, string>();

 async function getTeamIdBySlug(teamSlug: string): Promise<string> {
   const slug = teamSlug?.trim();
   if (!slug) throw new Error('team_slug_required');

   const cached = teamIdBySlugCache.get(slug);
   if (cached) return cached;

   const supabase = createClient();
   const { data, error } = await supabase.from('teams').select('id').eq('slug', slug).single();
   if (error) throw error;
   if (!data?.id) throw new Error('team_not_found');
   teamIdBySlugCache.set(slug, data.id);
   return data.id;
 }

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

 export async function sendTeamInviteBySlug(
   teamSlug: string,
   inviteeId: string,
   message?: string
 ): Promise<SendInviteResult> {
   const teamId = await getTeamIdBySlug(teamSlug);
   return sendTeamInvite(teamId, inviteeId, message);
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

 export async function searchUsersToInviteBySlug(
   teamSlug: string,
   searchQuery?: string
 ): Promise<Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>> {
   const teamId = await getTeamIdBySlug(teamSlug);
   return searchUsersToInvite(teamId, searchQuery);
 }

/**
 * Get pending invite for a specific team for the current user
 */
export interface PendingTeamInvite {
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

export async function getPendingInviteForTeam(teamId: string): Promise<PendingTeamInvite | null> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: invite, error } = await supabase
    .from('team_invites')
    .select(`
      id,
      team_id,
      inviter_id,
      message,
      created_at,
      teams!team_invites_team_id_fkey (
        id,
        name,
        slug,
        icon_url
      ),
      profiles!team_invites_inviter_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('team_id', teamId)
    .eq('invitee_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (error || !invite) return null;

  const team = invite.teams as any;
  const inviter = invite.profiles as any;

  return {
    invite_id: invite.id,
    team_id: invite.team_id,
    team_name: team?.name ?? 'Unknown Team',
    team_slug: team?.slug ?? '',
    team_icon_url: team?.icon_url ?? null,
    inviter_id: invite.inviter_id,
    inviter_username: inviter?.username ?? 'Unknown',
    inviter_display_name: inviter?.display_name ?? null,
    inviter_avatar_url: inviter?.avatar_url ?? null,
    message: invite.message,
    created_at: invite.created_at,
  };
}

export async function getPendingInviteForTeamBySlug(teamSlug: string): Promise<PendingTeamInvite | null> {
  try {
    const teamId = await getTeamIdBySlug(teamSlug);
    return getPendingInviteForTeam(teamId);
  } catch {
    return null;
  }
}
