/**
 * Link System API Client
 * Wrappers for Supabase Link/Dating RPCs
 */

import { supabase } from '@/lib/supabase';
import type {
  LinkProfile,
  LinkSettings,
  LinkMutual,
  DatingProfile,
  DatingMatch,
  LinkDecisionResult,
  DatingDecisionResult,
} from './types';

// ============================================================================
// LINK PROFILE API
// ============================================================================

/**
 * Upsert user's link profile
 */
export async function upsertLinkProfile(data: {
  enabled: boolean;
  bio?: string;
  location_text?: string;
  photos?: string[];
  tags?: string[];
}): Promise<LinkProfile> {
  const { data: result, error } = await supabase.rpc('rpc_upsert_link_profile', {
    p_enabled: data.enabled,
    p_bio: data.bio || null,
    p_location_text: data.location_text || null,
    p_photos: data.photos || [],
    p_tags: data.tags || [],
  });

  if (error) {
    console.error('Error upserting link profile:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  return result as LinkProfile;
}

/**
 * Get current user's link profile
 */
export async function getMyLinkProfile(): Promise<LinkProfile | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('link_profiles')
    .select('*')
    .eq('profile_id', session.session.user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No profile yet
    }
    console.error('Error fetching link profile:', error);
    throw error;
  }

  return data as LinkProfile;
}

/**
 * Get link candidates for swiping (Regular Link)
 */
export async function getLinkCandidates(
  limit: number = 20,
  offset: number = 0
): Promise<LinkProfile[]> {
  const { data, error } = await supabase.rpc('rpc_get_link_candidates', {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('Error fetching link candidates:', error);
    throw error;
  }

  return (data || []) as LinkProfile[];
}

/**
 * Submit a link decision (link or nah)
 */
export async function submitLinkDecision(
  toProfileId: string,
  decision: 'link' | 'nah'
): Promise<LinkDecisionResult> {
  const { data, error } = await supabase.rpc('rpc_submit_link_decision', {
    p_to_profile_id: toProfileId,
    p_decision: decision,
  });

  if (error) {
    console.error('Error submitting link decision:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  return data as LinkDecisionResult;
}

/**
 * Get current user's link mutuals
 */
export async function getMyMutuals(
  limit: number = 50,
  offset: number = 0
): Promise<LinkMutual[]> {
  const { data, error } = await supabase.rpc('rpc_get_my_mutuals', {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('Error fetching mutuals:', error);
    throw error;
  }

  return (data || []) as LinkMutual[];
}

// ============================================================================
// LINK SETTINGS API
// ============================================================================

/**
 * Upsert user's link settings (Auto-Link behavior)
 */
export async function upsertLinkSettings(data: {
  auto_link_on_follow: boolean;
  auto_link_require_approval?: boolean;
  auto_link_policy?: string;
}): Promise<LinkSettings> {
  const { data: result, error } = await supabase.rpc('rpc_upsert_link_settings', {
    p_auto_link_on_follow: data.auto_link_on_follow,
    p_auto_link_require_approval: data.auto_link_require_approval ?? false,
    p_auto_link_policy: data.auto_link_policy ?? 'everyone',
  });

  if (error) {
    console.error('Error upserting link settings:', error);
    throw error;
  }

  return result as LinkSettings;
}

/**
 * Get current user's link settings
 */
export async function getMyLinkSettings(): Promise<LinkSettings | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('link_settings')
    .select('*')
    .eq('profile_id', session.session.user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No settings yet
    }
    console.error('Error fetching link settings:', error);
    throw error;
  }

  return data as LinkSettings;
}

// ============================================================================
// DATING API
// ============================================================================

/**
 * Upsert user's dating profile
 */
export async function upsertDatingProfile(data: {
  enabled: boolean;
  bio?: string;
  location_text?: string;
  photos?: string[];
  prefs?: Record<string, any>;
}): Promise<DatingProfile> {
  const { data: result, error } = await supabase.rpc('rpc_upsert_dating_profile', {
    p_enabled: data.enabled,
    p_bio: data.bio || null,
    p_location_text: data.location_text || null,
    p_photos: data.photos || [],
    p_prefs: data.prefs || {},
  });

  if (error) {
    console.error('Error upserting dating profile:', error);
    throw error;
  }

  return result as DatingProfile;
}

/**
 * Get current user's dating profile
 */
export async function getMyDatingProfile(): Promise<DatingProfile | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('dating_profiles')
    .select('*')
    .eq('profile_id', session.session.user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No profile yet
    }
    console.error('Error fetching dating profile:', error);
    throw error;
  }

  return data as DatingProfile;
}

/**
 * Get dating candidates for swiping
 */
export async function getDatingCandidates(
  limit: number = 20,
  offset: number = 0
): Promise<DatingProfile[]> {
  const { data, error } = await supabase.rpc('rpc_get_dating_candidates', {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('Error fetching dating candidates:', error);
    throw error;
  }

  return (data || []) as DatingProfile[];
}

/**
 * Submit a dating decision (like or nah)
 */
export async function submitDatingDecision(
  toProfileId: string,
  decision: 'like' | 'nah'
): Promise<DatingDecisionResult> {
  const { data, error } = await supabase.rpc('rpc_submit_dating_decision', {
    p_to_profile_id: toProfileId,
    p_decision: decision,
  });

  if (error) {
    console.error('Error submitting dating decision:', error);
    throw error;
  }

  return data as DatingDecisionResult;
}

/**
 * Get current user's dating matches
 */
export async function getMyDatingMatches(
  limit: number = 50,
  offset: number = 0
): Promise<DatingMatch[]> {
  const { data, error } = await supabase.rpc('rpc_get_my_dating_matches', {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('Error fetching dating matches:', error);
    throw error;
  }

  return (data || []) as DatingMatch[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if two profiles are link mutuals
 */
export async function isLinkMutual(
  profileId1: string,
  profileId2: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_link_mutual', {
    p_profile_id_1: profileId1,
    p_profile_id_2: profileId2,
  });

  if (error) {
    console.error('Error checking link mutual:', error);
    return false;
  }

  return data as boolean;
}

/**
 * Check if two profiles are dating matches
 */
export async function isDatingMatch(
  profileId1: string,
  profileId2: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_dating_match', {
    p_profile_id_1: profileId1,
    p_profile_id_2: profileId2,
  });

  if (error) {
    console.error('Error checking dating match:', error);
    return false;
  }

  return data as boolean;
}
