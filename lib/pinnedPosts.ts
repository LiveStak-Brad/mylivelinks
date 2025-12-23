// Mock adapter for pinned posts
// Can be swapped with real Supabase queries later

import { createClient, isSeedModeEnabled } from './supabase';

export interface PinnedPost {
  id: number;
  profile_id: string;
  caption?: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  updated_at: string;
}

// Mock storage for pinned posts (in-memory, resets on refresh)
const mockPinnedPosts: Map<string, PinnedPost> = new Map();

export async function getPinnedPost(profileId: string): Promise<PinnedPost | null> {
  const supabase = createClient();

  if (isSeedModeEnabled()) {
    // Return mock data for seed mode
    return mockPinnedPosts.get(profileId) || null;
  }

  try {
    const { data, error } = await supabase
      .from('pinned_posts')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error fetching pinned post:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error in getPinnedPost:', error);
    return null;
  }
}

export async function upsertPinnedPost(
  profileId: string,
  caption: string,
  mediaUrl: string,
  mediaType: 'image' | 'video'
): Promise<PinnedPost | null> {
  const supabase = createClient();

  if (isSeedModeEnabled()) {
    // Mock storage
    const post: PinnedPost = {
      id: Date.now(),
      profile_id: profileId,
      caption,
      media_url: mediaUrl,
      media_type: mediaType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockPinnedPosts.set(profileId, post);
    return post;
  }

  try {
    const { data, error } = await supabase
      .from('pinned_posts')
      .upsert({
        profile_id: profileId,
        caption,
        media_url: mediaUrl,
        media_type: mediaType,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting pinned post:', error);
    throw error;
  }
}

export async function deletePinnedPost(profileId: string): Promise<void> {
  const supabase = createClient();

  if (isSeedModeEnabled()) {
    mockPinnedPosts.delete(profileId);
    return;
  }

  try {
    const { error } = await supabase
      .from('pinned_posts')
      .delete()
      .eq('profile_id', profileId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting pinned post:', error);
    throw error;
  }
}

