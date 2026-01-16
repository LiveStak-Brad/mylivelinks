/**
 * Replay Banner Utilities
 * 
 * Handles the global Replay page banner upload/management.
 * Uses the existing channel_banners bucket with a special "global" folder.
 * Only site owners can edit this banner.
 */

import { createClient } from './supabase';

// Use existing channel_banners bucket with a special folder for global banners
const BUCKET_NAME = 'channel_banners';
const BANNER_FOLDER = 'global';
const BANNER_NAME = 'replay_banner';

/**
 * Upload Replay banner to Supabase Storage
 * Path: channel_banners/global/replay_banner.{ext}
 * 
 * @param file - The image file to upload
 * @returns The public URL of the uploaded banner
 */
export async function uploadReplayBanner(file: File): Promise<string> {
  const supabase = createClient();

  // Get file extension from the uploaded file
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${BANNER_FOLDER}/${BANNER_NAME}.${ext}`;

  console.log('[ReplayBanner] Uploading to:', filePath);

  // Upload to storage (upsert to replace existing)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('[ReplayBanner] Upload error:', uploadError);
    throw new Error(`Failed to upload replay banner: ${uploadError.message}`);
  }

  // Get public URL with cache-busting timestamp
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get replay banner URL');
  }

  // Add cache-busting query param
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
  console.log('[ReplayBanner] Upload success:', publicUrl);

  return publicUrl;
}

/**
 * Remove Replay banner
 */
export async function removeReplayBanner(): Promise<void> {
  const supabase = createClient();

  // Best-effort storage delete for all possible extensions
  try {
    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const paths = extensions.map(ext => `${BANNER_FOLDER}/${BANNER_NAME}.${ext}`);
    
    console.log('[ReplayBanner] Removing:', paths);
    
    await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths);
  } catch (err) {
    console.warn('[ReplayBanner] Storage delete error:', err);
  }
}

// In-memory cache for banner URL
let cachedBannerUrl: string | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get Replay banner URL by checking if file exists in storage
 * Uses in-memory cache to prevent reloading on page navigation
 */
export async function getReplayBannerUrl(): Promise<string | null> {
  const now = Date.now();
  
  // Return cached URL if still valid
  if (cachedBannerUrl !== null && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedBannerUrl;
  }
  
  const supabase = createClient();
  
  // Check for existing banner files
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  
  for (const ext of extensions) {
    const filePath = `${BANNER_FOLDER}/${BANNER_NAME}.${ext}`;
    
    // Try to get the file - if it exists, return its URL
    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .list(BANNER_FOLDER, {
        search: `${BANNER_NAME}.${ext}`,
      });
    
    if (data && data.length > 0) {
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      if (urlData?.publicUrl) {
        cachedBannerUrl = urlData.publicUrl;
        lastFetchTime = now;
        return cachedBannerUrl;
      }
    }
  }
  
  // Cache null result too
  cachedBannerUrl = null;
  lastFetchTime = now;
  return null;
}

/**
 * Clear the banner cache (call after uploading new banner)
 */
export function clearReplayBannerCache(): void {
  cachedBannerUrl = null;
  lastFetchTime = 0;
}

/**
 * Generate default Replay banner as SVG data URI
 */
export function generateDefaultReplayBanner(): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="400" viewBox="0 0 1920 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#ec4899;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f97316;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1920" height="400" fill="url(#bg)"/>
  <circle cx="150" cy="200" r="180" fill="rgba(255,255,255,0.1)"/>
  <circle cx="1800" cy="100" r="120" fill="rgba(255,255,255,0.08)"/>
  <circle cx="1700" cy="350" r="80" fill="rgba(255,255,255,0.06)"/>
  <text 
    x="960" 
    y="180" 
    text-anchor="middle"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="72" 
    font-weight="bold" 
    fill="white"
    filter="url(#glow)"
  >Replay</text>
  <text 
    x="960" 
    y="240" 
    text-anchor="middle"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="24" 
    fill="rgba(255,255,255,0.9)"
  >Discover amazing long-form content from creators worldwide</text>
  <rect x="860" y="280" width="200" height="50" rx="25" fill="rgba(255,255,255,0.2)"/>
  <text 
    x="960" 
    y="312" 
    text-anchor="middle"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="16" 
    font-weight="600"
    fill="white"
  >Start Watching</text>
</svg>`.trim();

  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  
  return `data:image/svg+xml,${encoded}`;
}
