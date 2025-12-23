/**
 * Storage Helper Functions
 * Handles Supabase Storage uploads for avatars and pinned posts
 */

import { createClient } from './supabase';

/**
 * Upload avatar to Supabase Storage
 * Path: avatars/{profile_id}/avatar.{ext}
 */
export async function uploadAvatar(
  profileId: string,
  file: File
): Promise<string> {
  const supabase = createClient();

  // Get file extension
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `avatar.${ext}`;
  const filePath = `${profileId}/${fileName}`;

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Replace existing avatar
    });

  if (error) {
    console.error('Error uploading avatar:', error);
    throw new Error(`Failed to upload avatar: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get avatar URL');
  }

  return urlData.publicUrl;
}

/**
 * Upload pinned post media to Supabase Storage
 * Path: pinned-posts/{profile_id}/pinned.{ext}
 */
export async function uploadPinnedPostMedia(
  profileId: string,
  file: File
): Promise<string> {
  const supabase = createClient();

  // Get file extension
  const ext = file.name.split('.').pop() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
  const fileName = `pinned.${ext}`;
  const filePath = `${profileId}/${fileName}`;

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('pinned-posts')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Replace existing pinned post media
    });

  if (error) {
    console.error('Error uploading pinned post media:', error);
    throw new Error(`Failed to upload media: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('pinned-posts')
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get media URL');
  }

  return urlData.publicUrl;
}

/**
 * Delete avatar from Supabase Storage
 */
export async function deleteAvatar(profileId: string): Promise<void> {
  const supabase = createClient();

  // Try to delete avatar (may not exist)
  const { error } = await supabase.storage
    .from('avatars')
    .remove([`${profileId}/avatar.jpg`, `${profileId}/avatar.png`, `${profileId}/avatar.jpeg`]);

  // Ignore errors (file may not exist)
  if (error) {
    console.warn('Error deleting avatar (may not exist):', error);
  }
}

/**
 * Delete pinned post media from Supabase Storage
 */
export async function deletePinnedPostMedia(profileId: string): Promise<void> {
  const supabase = createClient();

  // Try to delete pinned post media (may not exist)
  const { error } = await supabase.storage
    .from('pinned-posts')
    .remove([`${profileId}/pinned.jpg`, `${profileId}/pinned.png`, `${profileId}/pinned.mp4`, `${profileId}/pinned.webm`]);

  // Ignore errors (file may not exist)
  if (error) {
    console.warn('Error deleting pinned post media (may not exist):', error);
  }
}


