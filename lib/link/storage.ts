/**
 * Link Photo Upload Stub
 * TODO: Logic Manager - Implement real Supabase Storage upload
 */

export async function uploadLinkPhoto(file: File): Promise<string> {
  // TODO: Implement real upload to Supabase Storage bucket 'link-photos'
  // For now, return a placeholder URL
  console.warn('[STUB] uploadLinkPhoto called - Logic Manager needs to implement');
  return `https://placeholder.com/photo/${Date.now()}`;
}
