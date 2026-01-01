/**
 * Link System API Client
 * 
 * Three modes:
 * 1. Regular Link or Nah (manual swipe decisions)
 * 2. Auto-Link F4F (on-follow auto mutual behavior; settings-driven)
 * 3. Link Dating (separate dating decisions + matches)
 */

import { supabase } from '@/lib/supabase';

export interface LinkProfile {
  profile_id: string;
  enabled: boolean;
  bio?: string;
  location_text?: string;
  photos?: string[];
  tags?: string[];
  created_at: string;
  updated_at: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface LinkSettings {
  profile_id: string;
  auto_link_on_follow: boolean;
  auto_link_require_approval: boolean;
  auto_link_policy: 'everyone';
  updated_at: string;
}

export interface LinkMutual {
  profile_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  location_text?: string;
  photos?: string[];
  tags?: string[];
  created_at: string;
  source: 'manual' | 'auto_follow';
}

export interface DatingProfile {
  profile_id: string;
  enabled: boolean;
  bio?: string;
  location_text?: string;
  photos?: string[];
  prefs?: any;
  created_at: string;
  updated_at: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface DatingMatch {
  profile_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  location_text?: string;
  photos?: string[];
  prefs?: any;
  matched_at: string;
}

export interface LinkDecisionResult {
  success: boolean;
  mutual: boolean;
}

export interface DatingDecisionResult {
  success: boolean;
  match: boolean;
}

// Regular Link RPCs
export async function upsertLinkProfile(profile: Partial<LinkProfile>): Promise<void> {
  const { data, error } = await supabase.rpc('rpc_upsert_link_profile', {
    p_enabled: profile.enabled || false,
    p_bio: profile.bio || null,
    p_location_text: profile.location_text || null,
    p_photos: profile.photos || [],
    p_tags: profile.tags || [],
  });
  if (error) throw error;
}

export async function getMyLinkProfile(): Promise<LinkProfile | null> {
  const { data, error } = await supabase.rpc('rpc_get_my_link_profile');
  if (error) throw error;
  return data;
}

export async function getLinkCandidates(limit = 20, offset = 0): Promise<LinkProfile[]> {
  const { data, error } = await supabase.rpc('rpc_get_link_candidates', {
    limit_count: limit,
    offset_count: offset,
  });
  if (error) throw error;
  return data || [];
}

export async function getAutoLinkCandidates(limit = 20, offset = 0): Promise<LinkProfile[]> {
  const { data, error } = await supabase.rpc('rpc_get_auto_link_candidates', {
    limit_count: limit,
    offset_count: offset,
  });
  if (error) throw error;
  return data || [];
}

export async function submitLinkDecision(candidateId: string, decision: 'link' | 'nah'): Promise<LinkDecisionResult> {
  const { data, error } = await supabase.rpc('rpc_submit_link_decision', {
    candidate_id: candidateId,
    decision,
  });
  if (error) throw error;
  return data;
}

export async function getMyMutuals(): Promise<LinkMutual[]> {
  const { data, error } = await supabase.rpc('rpc_get_my_mutuals');
  if (error) throw error;
  return data || [];
}

// Link Settings RPCs
export async function upsertLinkSettings(settings: Partial<LinkSettings>): Promise<void> {
  const { data, error } = await supabase.rpc('rpc_upsert_link_settings', {
    p_auto_link_on_follow: settings.auto_link_on_follow || false,
    p_auto_link_require_approval: settings.auto_link_require_approval || false,
    p_auto_link_policy: settings.auto_link_policy || 'everyone',
  });
  if (error) throw error;
}

export async function getMyLinkSettings(): Promise<LinkSettings | null> {
  const { data, error } = await supabase.rpc('rpc_get_my_link_settings');
  if (error) throw error;
  return data;
}

// Dating RPCs
export async function upsertDatingProfile(profile: Partial<DatingProfile>): Promise<void> {
  const { data, error } = await supabase.rpc('rpc_upsert_dating_profile', {
    p_enabled: profile.enabled || false,
    p_bio: profile.bio || null,
    p_location_text: profile.location_text || null,
    p_photos: profile.photos || [],
    p_prefs: profile.prefs || {},
  });
  if (error) throw error;
}

export async function getMyDatingProfile(): Promise<DatingProfile | null> {
  const { data, error } = await supabase.rpc('rpc_get_my_dating_profile');
  if (error) throw error;
  return data;
}

export async function getDatingCandidates(limit = 20, offset = 0): Promise<DatingProfile[]> {
  const { data, error } = await supabase.rpc('rpc_get_dating_candidates', {
    limit_count: limit,
    offset_count: offset,
  });
  if (error) throw error;
  return data || [];
}

export async function submitDatingDecision(candidateId: string, decision: 'like' | 'nah'): Promise<DatingDecisionResult> {
  const { data, error } = await supabase.rpc('rpc_submit_dating_decision', {
    candidate_id: candidateId,
    decision,
  });
  if (error) throw error;
  return data;
}

export async function getMyDatingMatches(): Promise<DatingMatch[]> {
  const { data, error } = await supabase.rpc('rpc_get_my_dating_matches');
  if (error) throw error;
  return data || [];
}
