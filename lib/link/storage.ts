/**
 * Link Photo Storage Helpers
 * Upload and manage photos for Link and Dating profiles
 */

import { supabase } from '@/lib/supabase';

const LINK_PHOTOS_BUCKET = 'link-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 5;

export async function uploadLinkPhoto(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated for photo upload.');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  // Upload to storage
  const { data, error } = await supabase.storage
    .from(LINK_PHOTOS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Failed to upload photo:', error);
    throw error;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(LINK_PHOTOS_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

export async function deleteLinkPhoto(photoUrl: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Extract file path from URL
  const urlParts = photoUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];
  const filePath = `${user.id}/${fileName}`;

  const { error } = await supabase.storage
    .from(LINK_PHOTOS_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Failed to delete photo:', error);
    throw error;
  }
}

export { MAX_PHOTOS, MAX_FILE_SIZE };
