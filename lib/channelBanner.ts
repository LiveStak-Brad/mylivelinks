/**
 * Channel Banner Utilities
 * 
 * Handles channel banner uploads, deletion, and auto-generated default banners
 * for [username]TV pages.
 */

import { createClient } from './supabase';

const BUCKET_NAME = 'channel_banners';

/**
 * Upload channel banner to Supabase Storage
 * Path: channel-banners/{profileId}/banner.{ext}
 * 
 * @param profileId - The user's profile ID
 * @param file - The image file to upload
 * @returns The public URL of the uploaded banner
 */
export async function uploadChannelBanner(
  profileId: string,
  file: File
): Promise<string> {
  const supabase = createClient();

  // Get file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `banner.${ext}`;
  const filePath = `${profileId}/${fileName}`;

  // Upload to storage (upsert to replace existing)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('Error uploading channel banner:', uploadError);
    throw new Error(`Failed to upload channel banner: ${uploadError.message}`);
  }

  // Get public URL with cache-busting timestamp
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get channel banner URL');
  }

  // Add cache-busting query param
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Update profiles table with new banner URL (DB is authoritative)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      channel_banner_url: publicUrl,
      channel_banner_updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  if (updateError) {
    console.error('Error updating profile channel_banner_url:', updateError);
    throw new Error(`Failed to update profile: ${updateError.message}`);
  }

  return publicUrl;
}

/**
 * Remove channel banner
 * Sets DB field to null first (authoritative), then best-effort storage delete
 * 
 * @param profileId - The user's profile ID
 */
export async function removeChannelBanner(profileId: string): Promise<void> {
  const supabase = createClient();

  // DB update is authoritative - do this first
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      channel_banner_url: null,
      channel_banner_updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  if (updateError) {
    console.error('Error removing channel banner from DB:', updateError);
    throw new Error(`Failed to remove channel banner: ${updateError.message}`);
  }

  // Best-effort storage delete (non-blocking)
  try {
    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const paths = extensions.map(ext => `${profileId}/banner.${ext}`);
    
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths);

    if (deleteError) {
      console.warn('Storage delete failed (non-blocking):', deleteError);
    }
  } catch (err) {
    console.warn('Storage delete error (non-blocking):', err);
  }
}

/**
 * Gradient presets for auto-generated banners
 * Uses MyLiveLinks brand colors (purple/pink theme)
 */
const BANNER_GRADIENTS = [
  { start: '#7c3aed', end: '#ec4899' }, // Purple to Pink
  { start: '#6366f1', end: '#8b5cf6' }, // Indigo to Purple
  { start: '#ec4899', end: '#f97316' }, // Pink to Orange
  { start: '#8b5cf6', end: '#06b6d4' }, // Purple to Cyan
  { start: '#3b82f6', end: '#8b5cf6' }, // Blue to Purple
  { start: '#f43f5e', end: '#a855f7' }, // Rose to Purple
];

/**
 * Simple hash function to get consistent gradient per username
 */
function hashUsername(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a default channel banner as SVG data URI
 * 
 * @param displayName - The user's display name or username
 * @param username - The username (used for consistent gradient selection)
 * @returns SVG data URI string
 */
export function generateDefaultBannerSvg(
  displayName: string,
  username: string
): string {
  const gradientIndex = hashUsername(username) % BANNER_GRADIENTS.length;
  const gradient = BANNER_GRADIENTS[gradientIndex];
  
  // Escape special characters for SVG
  const escapedName = (displayName || username)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  
  const channelName = `${escapedName}TV`;
  
  // SVG with 16:9 aspect ratio (1280x720 for good resolution)
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradient.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${gradient.end};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <text 
    x="80" 
    y="400" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="72" 
    font-weight="bold" 
    fill="white" 
    filter="url(#shadow)"
  >${channelName}</text>
  <text 
    x="80" 
    y="480" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="28" 
    fill="rgba(255,255,255,0.8)"
  >Welcome to my channel</text>
</svg>`.trim();

  // Encode as data URI
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Get channel banner URL or generate default
 * 
 * @param profile - Profile object with channel_banner_url, display_name, username
 * @returns URL string (either uploaded banner or generated SVG data URI)
 */
export function getChannelBannerUrl(profile: {
  channel_banner_url?: string | null;
  display_name?: string | null;
  username: string;
}): string {
  if (profile.channel_banner_url) {
    return profile.channel_banner_url;
  }
  
  return generateDefaultBannerSvg(
    profile.display_name || profile.username,
    profile.username
  );
}
