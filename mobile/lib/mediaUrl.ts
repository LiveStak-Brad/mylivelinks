import { supabaseBaseUrl } from './supabase';

export function resolveMediaUrl(input?: string | null): string | undefined {
  if (!input) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;

  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

  const base = String(supabaseBaseUrl || '').replace(/\/+$/, '');
  if (!base) return undefined;

  // Common cases:
  // - stored as '/storage/v1/object/public/avatars/..'
  // - stored as 'storage/v1/object/public/avatars/..'
  if (raw.startsWith('/')) return `${base}${raw}`;
  if (raw.startsWith('storage/')) return `${base}/${raw}`;

  // If the DB stores just a bucket path like 'avatars/<profileId>/avatar.jpg'
  // or 'post-media/<profileId>/feed/..', attempt to convert to public object URL.
  const publicPrefix = `${base}/storage/v1/object/public/`;
  return `${publicPrefix}${raw.replace(/^\/+/, '')}`;
}
