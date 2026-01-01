import type { SupabaseClient } from '@supabase/supabase-js';

export async function isBlockedBidirectional(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string
): Promise<boolean> {
  if (!userId || !otherUserId || userId === otherUserId) return false;

  const { data, error } = await supabase.rpc('is_blocked', {
    p_user_id: userId,
    p_other_user_id: otherUserId,
  });

  if (error) {
    throw error;
  }

  return data === true;
}
