import { createClient } from '@/lib/supabase';

/**
 * Check if user has coins before allowing gift action.
 * If user has 0 coins, redirect to wallet page.
 * @returns true if user has coins, false if redirecting to wallet
 */
export async function checkCoinBalanceBeforeGift(): Promise<boolean> {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', user.id)
      .single();

    const balance = profile?.coin_balance || 0;
    
    if (balance === 0) {
      window.location.href = '/wallet';
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[GiftBalanceCheck] Error checking balance:', error);
    return true;
  }
}
