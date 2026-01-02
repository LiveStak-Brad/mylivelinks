/**
 * Teams API Client
 * 
 * Wraps Supabase RPC calls for Teams functionality.
 * 
 * Backend RPC functions (from 20260102_zz_canonical_teams_backend.sql):
 * - rpc_create_team(p_name, p_slug, p_team_tag, ...) - Create a team
 * - rpc_request_join_team(p_team_slug) - Request to join a team by slug
 * - rpc_get_my_team() - Get user's current team
 */

import { supabase, supabaseConfigured } from './supabase';

export interface Team {
  id: string;
  created_by: string;
  name: string;
  slug: string;
  team_tag: string;
  description?: string;
  rules?: string;
  icon_url?: string;
  banner_url?: string;
  theme_color?: string;
  approved_member_count: number;
  pending_request_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  team_id: string;
  status: 'requested' | 'approved' | 'rejected' | 'banned' | 'left';
  role: 'Team_Admin' | 'Team_Moderator' | 'Team_Member';
}

export type CreateTeamResult = 
  | { success: true; team: Team }
  | { success: false; error: string };

export type JoinTeamResult =
  | { success: true; membership: TeamMembership }
  | { success: false; error: string };

export type GetMyTeamResult =
  | { success: true; team: Team | null; membership: TeamMembership | null }
  | { success: false; error: string };

/**
 * Generate a URL-safe slug from a team name
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  // Ensure minimum 7 chars (slug format: ^[a-z0-9][a-z0-9-]{5,62}[a-z0-9]$)
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${randomSuffix}`.substring(0, 64);
}

/**
 * Generate a team tag (3-5 uppercase alphanumeric chars)
 */
function generateTeamTag(name: string): string {
  // Take first letters of words, uppercase, max 5 chars
  const words = name.trim().split(/\s+/);
  let tag = words.map(w => w[0]?.toUpperCase() || '').join('').substring(0, 5);
  
  // If too short, pad with random chars
  while (tag.length < 3) {
    tag += Math.random().toString(36).substring(2, 3).toUpperCase();
  }
  
  // Ensure alphanumeric only
  return tag.replace(/[^A-Z0-9]/g, 'X').substring(0, 5);
}

/**
 * Create a new team
 */
export async function createTeam(name: string): Promise<CreateTeamResult> {
  if (!supabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Team name is required' };
  }

  try {
    const slug = generateSlug(trimmedName);
    const teamTag = generateTeamTag(trimmedName);

    const { data, error } = await supabase.rpc('rpc_create_team', {
      p_name: trimmedName,
      p_slug: slug,
      p_team_tag: teamTag,
    });

    if (error) {
      console.error('[teams] Create team error:', error);
      
      // Handle specific error codes
      if (error.message?.includes('one_team_per_creator')) {
        return { success: false, error: 'You can only create one team' };
      }
      if (error.message?.includes('unauthorized')) {
        return { success: false, error: 'Please log in to create a team' };
      }
      
      return { success: false, error: error.message || 'Failed to create team' };
    }

    return { success: true, team: data as Team };
  } catch (err: any) {
    console.error('[teams] Create team exception:', err);
    return { success: false, error: err?.message || 'Failed to create team' };
  }
}

/**
 * Request to join a team by invite code (slug)
 */
export async function joinTeamByCode(code: string): Promise<JoinTeamResult> {
  if (!supabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }

  const trimmedCode = code.trim().toLowerCase();
  if (!trimmedCode) {
    return { success: false, error: 'Invite code is required' };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_request_join_team', {
      p_team_slug: trimmedCode,
    });

    if (error) {
      console.error('[teams] Join team error:', error);
      
      // Handle specific error codes
      if (error.message?.includes('team_not_found')) {
        return { success: false, error: 'Team not found. Check your invite code.' };
      }
      if (error.message?.includes('banned')) {
        return { success: false, error: 'You are banned from this team' };
      }
      if (error.message?.includes('unauthorized')) {
        return { success: false, error: 'Please log in to join a team' };
      }
      
      return { success: false, error: error.message || 'Failed to join team' };
    }

    // The RPC returns a table row
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { success: false, error: 'Failed to join team' };
    }

    return {
      success: true,
      membership: {
        team_id: row.team_id,
        status: row.status,
        role: row.role,
      },
    };
  } catch (err: any) {
    console.error('[teams] Join team exception:', err);
    return { success: false, error: err?.message || 'Failed to join team' };
  }
}

/**
 * Get user's current team membership
 */
export async function getMyTeam(): Promise<GetMyTeamResult> {
  if (!supabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: true, team: null, membership: null };
    }

    // Find user's active team membership
    const { data: membershipData, error: membershipError } = await supabase
      .from('team_memberships')
      .select('team_id, status, role')
      .eq('profile_id', user.id)
      .in('status', ['approved', 'requested'])
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error('[teams] Get membership error:', membershipError);
      return { success: false, error: membershipError.message };
    }

    if (!membershipData) {
      return { success: true, team: null, membership: null };
    }

    // Fetch the team details
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', membershipData.team_id)
      .single();

    if (teamError) {
      console.error('[teams] Get team error:', teamError);
      return { success: false, error: teamError.message };
    }

    return {
      success: true,
      team: teamData as Team,
      membership: membershipData as TeamMembership,
    };
  } catch (err: any) {
    console.error('[teams] Get my team exception:', err);
    return { success: false, error: err?.message || 'Failed to get team' };
  }
}
