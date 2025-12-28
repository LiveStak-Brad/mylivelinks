import * as FileSystem from 'expo-file-system';

import { supabase } from './supabase';

type UploadOpts = {
  contentType?: string | null;
  upsert?: boolean;
  maxBytes?: number;
};

export async function getFileSizeBytes(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    const size = (info as any)?.size;
    return typeof size === 'number' && Number.isFinite(size) ? size : null;
  } catch {
    return null;
  }
}

export async function uploadProfileMediaFromUri(params: {
  profileId: string;
  relativePath: string;
  uri: string;
  opts?: UploadOpts;
}): Promise<{ publicUrl: string; path: string; sizeBytes: number | null }> {
  const { profileId, relativePath, uri, opts } = params;
  const cleanRel = String(relativePath).replace(/^\/+/, '');
  const path = `${profileId}/${cleanRel}`;

  const sizeBytes = await getFileSizeBytes(uri);
  const maxBytes = typeof opts?.maxBytes === 'number' ? opts?.maxBytes : undefined;
  if (typeof maxBytes === 'number' && typeof sizeBytes === 'number' && sizeBytes > maxBytes) {
    throw new Error(`File is too large (${Math.ceil(sizeBytes / (1024 * 1024))}MB).`);
  }

  const blob = await fetch(uri).then((r) => r.blob());
  const { error } = await supabase.storage.from('profile-media').upload(path, blob, {
    contentType: opts?.contentType || undefined,
    upsert: opts?.upsert === true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('profile-media').getPublicUrl(path);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) {
    throw new Error('Failed to get public URL');
  }

  return { publicUrl, path, sizeBytes };
}
