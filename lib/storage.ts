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
  const { error } = await supabase.storage
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

  // Update profiles table with new avatar URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: urlData.publicUrl })
    .eq('id', profileId);

  if (updateError) {
    console.error('Error updating profile avatar_url:', updateError);
    throw new Error(`Failed to update profile: ${updateError.message}`);
  }

  return urlData.publicUrl;
}

export async function uploadProfileMedia(profileId: string, relativePath: string, file: File, opts?: { upsert?: boolean }): Promise<string> {
  const supabase = createClient();
  const filePath = `${profileId}/${String(relativePath).replace(/^\/+/, '')}`;

  const { error } = await supabase.storage.from('profile-media').upload(filePath, file, {
    contentType: file.type || undefined,
    upsert: opts?.upsert === true,
  });

  if (error) {
    throw new Error(`Failed to upload profile media: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from('profile-media').getPublicUrl(filePath);
  if (!urlData?.publicUrl) {
    throw new Error('Failed to get profile media URL');
  }

  return urlData.publicUrl;
}

export async function uploadPostMedia(profileId: string, file: File): Promise<string> {
  const supabase = createClient();

  const extRaw =
    file.name.split('.').pop() ||
    (file.type.startsWith('video/') ? 'mp4' : file.type.startsWith('image/') ? file.type.split('/')[1] : 'jpg');
  const ext = String(extRaw).toLowerCase().replace(/[^a-z0-9]/g, '') || (file.type.startsWith('video/') ? 'mp4' : 'jpg');

  const id =
    typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
      ? (crypto as any).randomUUID()
      : String(Date.now());
  const filePath = `${profileId}/feed/${Date.now()}-${id}.${ext}`;

  const { error } = await supabase.storage.from('post-media').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    console.error('Error uploading post media:', error);
    throw new Error(`Failed to upload post media: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(filePath);
  if (!urlData?.publicUrl) {
    throw new Error('Failed to get post media URL');
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
  const { error } = await supabase.storage
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

export async function uploadRoomImage(roomKeyOrId: string, file: File): Promise<string> {
  const supabase = createClient();

  const extRaw = file.name.split('.').pop() || (file.type.startsWith('image/') ? file.type.split('/')[1] : 'jpg');
  const ext = String(extRaw).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const filePath = `${roomKeyOrId}/cover-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('room-images').upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    console.error('Error uploading room image:', error);
    throw new Error(`Failed to upload room image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from('room-images').getPublicUrl(filePath);
  if (!urlData?.publicUrl) {
    throw new Error('Failed to get room image URL');
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


