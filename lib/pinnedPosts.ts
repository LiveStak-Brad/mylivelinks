import { createClient } from './supabase';

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

  try {
    const cached = mockPinnedPosts.get(profileId);
    if (cached) return cached;

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

    if (data) {
      mockPinnedPosts.set(profileId, data as PinnedPost);
      return data as PinnedPost;
    }
    return null;
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

  try {
    const { data, error } = await supabase
      .from('pinned_posts')
      .upsert({
        profile_id: profileId,
        caption,
        media_url: mediaUrl,
        media_type: mediaType,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'profile_id', // Specify the unique constraint column
        ignoreDuplicates: false    // Update on conflict, don't ignore
      })
      .select()
      .single();

    if (error) throw error;
    if (data) {
      mockPinnedPosts.set(profileId, data as PinnedPost);
    }
    return data as PinnedPost;
  } catch (error) {
    console.error('Error upserting pinned post:', error);
    throw error;
  }
}

export async function deletePinnedPost(profileId: string): Promise<void> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('pinned_posts')
      .delete()
      .eq('profile_id', profileId);

    if (error) throw error;

    mockPinnedPosts.delete(profileId);
  } catch (error) {
    console.error('Error deleting pinned post:', error);
    throw error;
  }
}

