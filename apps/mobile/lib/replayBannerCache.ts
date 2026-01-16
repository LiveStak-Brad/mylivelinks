/**
 * Simple in-memory cache for the Replay banner URL
 * Prevents reloading the banner when switching between Replay/Playlists tabs
 */

import { supabase } from './supabase';

let cachedBannerUrl: string | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getReplayBannerUrl(): Promise<string | null> {
  const now = Date.now();
  
  // Return cached URL if still valid
  if (cachedBannerUrl && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedBannerUrl;
  }
  
  try {
    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    for (const ext of extensions) {
      const { data } = await supabase.storage
        .from('channel_banners')
        .list('global', { search: `replay_banner.${ext}` });
      
      if (data && data.length > 0) {
        const { data: urlData } = supabase.storage
          .from('channel_banners')
          .getPublicUrl(`global/replay_banner.${ext}`);
        
        if (urlData?.publicUrl) {
          cachedBannerUrl = urlData.publicUrl;
          lastFetchTime = now;
          return cachedBannerUrl;
        }
      }
    }
  } catch (err) {
    console.error('Failed to load replay banner:', err);
  }
  
  return null;
}

export function clearReplayBannerCache(): void {
  cachedBannerUrl = null;
  lastFetchTime = 0;
}
