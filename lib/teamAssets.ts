/**
 * Team Assets Upload
 * 
 * Handles uploading team icons and banners to Supabase storage.
 * 
 * BUCKET REQUIRED: "team-assets"
 * - icons/{team_id}.{ext}
 * - banners/{team_id}.{ext}
 * 
 * Make the bucket PUBLIC for read access.
 */

import { createClient } from '@/lib/supabase';

const BUCKET_NAME = 'team-assets';

export type AssetType = 'icon' | 'banner';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a team asset (icon or banner) and update the team record
 */
export async function uploadTeamAsset(
  teamId: string,
  file: File,
  type: AssetType
): Promise<UploadResult> {
  const supabase = createClient();

  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please select an image file' };
    }

    // Max file size: 5MB for icons, 10MB for banners
    const maxSize = type === 'icon' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: `File too large. Max ${type === 'icon' ? '5MB' : '10MB'}` };
    }

    // Get file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!allowedExts.includes(ext)) {
      return { success: false, error: 'Invalid file type. Use JPG, PNG, GIF, or WebP' };
    }

    // Build storage path
    const folder = type === 'icon' ? 'icons' : 'banners';
    const filePath = `${folder}/${teamId}.${ext}`;

    // Upload to storage (upsert to replace existing)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[teamAssets] Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL with cache-busting timestamp
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Add timestamp to bust browser/CDN cache
    const timestamp = Date.now();
    const publicUrl = `${urlData.publicUrl}?t=${timestamp}`;

    // Update team record with new URL
    const updateField = type === 'icon' ? 'icon_url' : 'banner_url';
    const { error: updateError } = await supabase
      .from('teams')
      .update({ [updateField]: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', teamId);

    if (updateError) {
      console.error('[teamAssets] Update error:', updateError);
      return { success: false, error: 'Failed to update team record' };
    }

    console.log(`[teamAssets] ✅ Updated ${type} for team ${teamId}: ${publicUrl}`);
    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error('[teamAssets] Exception:', err);
    return { success: false, error: err?.message || 'Upload failed' };
  }
}

/**
 * Delete a team asset
 */
export async function deleteTeamAsset(
  teamId: string,
  type: AssetType
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const folder = type === 'icon' ? 'icons' : 'banners';
    
    // List files in the folder with this team ID prefix
    const { data: files } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder, { search: teamId });

    if (files && files.length > 0) {
      const filesToDelete = files.map(f => `${folder}/${f.name}`);
      await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);
    }

    // Clear the URL in team record
    const updateField = type === 'icon' ? 'icon_url' : 'banner_url';
    await supabase
      .from('teams')
      .update({ [updateField]: null, updated_at: new Date().toISOString() })
      .eq('id', teamId);

    return { success: true };
  } catch (err: any) {
    console.error('[teamAssets] Delete error:', err);
    return { success: false, error: err?.message || 'Delete failed' };
  }
}
