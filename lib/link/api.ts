/**
 * Link Module API Client
 * Wrappers for Supabase RPC calls
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
    console.error('Error upserting link profile:', error);
    throw error;
  }

  return result as LinkProfile;
}

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
      return null;
    }
    console.error('Error fetching link profile:', error);
    throw error;
  }

  return data as LinkProfile;
}

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

export async function submitLinkDecision(
  toProfileId: string,
  decision: 'link' | 'nah'
): Promise<LinkDecisionResult> {
  const { data, error } = await supabase.rpc('rpc_submit_link_decision', {
    p_to_profile_id: toProfileId,
    p_decision: decision,
  });

  if (error) {
    console.error('Error submitting link decision:', error);
    throw error;
  }

  return data as LinkDecisionResult;
}

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
      return null;
    }
    console.error('Error fetching link settings:', error);
    throw error;
  }

  return data as LinkSettings;
}

// ============================================================================
// DATING API
// ============================================================================

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
      return null;
    }
    console.error('Error fetching dating profile:', error);
    throw error;
  }

  return data as DatingProfile;
}

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
