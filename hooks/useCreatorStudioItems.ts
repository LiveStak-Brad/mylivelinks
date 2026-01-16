/**
 * Hook to fetch Creator Studio items for profile display
 * Uses the get_public_creator_studio_items RPC
 * 
 * CREATOR STUDIO PROFILE WIRING - SOURCE OF TRUTH
 * ================================================
 * Table: creator_studio_items
 * RPC: get_public_creator_studio_items(p_profile_id, p_item_type, p_limit, p_offset)
 * 
 * REQUIRED FILTERS (enforced by RPC):
 * - status = 'ready'
 * - visibility = 'public'
 * - owner_profile_id = p_profile_id
 * 
 * CANONICAL ROUTES:
 * - /[username]/music/[id]
 * - /[username]/music-video/[id]
 * - /[username]/podcast/[id]
 * - /[username]/movie/[id]
 * - /[username]/education/[id]
 * - /[username]/series/[seriesSlug]/[episodeSlug]
 * 
 * See docs/CREATOR_STUDIO_PROFILE_WIRING.md for full documentation.
 */

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';

export type CreatorStudioItemType = 
  | 'music'
  | 'music_video'
  | 'movie'
  | 'podcast'
  | 'series_episode'
  | 'education'
  | 'vlog'
  | 'comedy_special'
  | 'other';

export interface CreatorStudioItem {
  id: string;
  title: string;
  description: string | null;
  item_type: CreatorStudioItemType;
  media_url: string | null;
  thumb_url: string | null;
  artwork_url: string | null;
  duration_seconds: number | null;
  likes_count: number;
  created_at: string;
  tags?: string[] | null;
  category?: string | null;
}

interface UseCreatorStudioItemsOptions {
  profileId: string;
  itemType?: CreatorStudioItemType | null;
  limit?: number;
  enabled?: boolean;
}

interface UseCreatorStudioItemsResult {
  items: CreatorStudioItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCreatorStudioItems({
  profileId,
  itemType = null,
  limit = 50,
  enabled = true,
}: UseCreatorStudioItemsOptions): UseCreatorStudioItemsResult {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<CreatorStudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!profileId || !enabled) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_public_creator_studio_items', {
        p_profile_id: profileId,
        p_item_type: itemType,
        p_limit: limit,
        p_offset: 0,
      });

      if (rpcError) {
        throw rpcError;
      }

      setItems((data as CreatorStudioItem[]) || []);
    } catch (err) {
      console.error('[useCreatorStudioItems] fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, itemType, limit, enabled]);

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
  };
}

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 50); // Limit length
}

/**
 * Build canonical route for a Creator Studio item
 */
export function buildCreatorStudioItemUrl(
  username: string,
  item: CreatorStudioItem
): string {
  // Use ID for reliability (canonical routes accept both id and slug)
  const slug = item.id;
  
  switch (item.item_type) {
    case 'music':
      return `/${username}/music/${slug}`;
    case 'music_video':
      return `/${username}/music-video/${slug}`;
    case 'podcast':
      return `/${username}/podcast/${slug}`;
    case 'movie':
      return `/${username}/movie/${slug}`;
    case 'education':
      return `/${username}/education/${slug}`;
    case 'series_episode':
      // Series episodes need series slug - for now link to profile
      return `/${username}`;
    case 'vlog':
    case 'comedy_special':
    case 'other':
    default:
      // These don't have dedicated routes yet
      return `/${username}`;
  }
}

/**
 * Check if an item type has a dedicated canonical route
 */
export function hasCanonicalRoute(itemType: CreatorStudioItemType): boolean {
  return ['music', 'music_video', 'podcast', 'movie', 'education'].includes(itemType);
}
