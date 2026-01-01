import type { SupabaseClient } from '@supabase/supabase-js';

export async function isBlockedBidirectional(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  otherUserId: string | null | undefined
): Promise<boolean> {
  if (!userId || !otherUserId || userId === otherUserId) return false;

  try {
    const { data, error } = await supabase.rpc('is_blocked', {
      p_user_id: userId,
      p_other_user_id: otherUserId,
    });

    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
