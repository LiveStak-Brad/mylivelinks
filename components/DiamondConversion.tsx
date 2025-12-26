'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import MonetizationTooltip from './MonetizationTooltip';

export default function DiamondConversion() {
  const [diamondBalance, setDiamondBalance] = useState<number>(0);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [diamondsToConvert, setDiamondsToConvert] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();
  const MIN_DIAMONDS = 2; // Minimum diamonds required
  const CONVERSION_RATE = 0.60; // 60% (40% platform fee)

  useEffect(() => {
    loadBalances();
  }, []);

  // Real-time subscription for balance updates
  useEffect(() => {
    let channel: any = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to profile changes for this user
      channel = supabase
        .channel(`conversion-balance-updates:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload: any) => {
            // Update balances in realtime when profile changes
            const updatedProfile = payload.new;
            setCoinBalance(updatedProfile.coin_balance || 0);
            setDiamondBalance(updatedProfile.earnings_balance || 0);
            
            console.log('[CONVERSION] Real-time balance update:', {
              coins: updatedProfile.coin_balance,
              diamonds: updatedProfile.earnings_balance,
            });
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  const loadBalances = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('coin_balance, earnings_balance')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setCoinBalance((data as any).coin_balance);
      setDiamondBalance((data as any).earnings_balance); // earnings_balance = diamond_balance
    }
  };

  const calculateConversion = (diamonds: number) => {
    if (diamonds < MIN_DIAMONDS) return { coins: 0, fee: 0, valid: false };
    const coins = Math.floor(diamonds * CONVERSION_RATE);
    const fee = diamonds - coins;
    return { coins, fee, valid: coins >= 1 };
  };

  const handleConvert = async () => {
    const requestedDiamonds = parseInt(diamondsToConvert);
    const diamonds = Math.min(requestedDiamonds, diamondBalance);
    
    if (isNaN(requestedDiamonds) || requestedDiamonds < MIN_DIAMONDS) {
      setError(`Minimum ${MIN_DIAMONDS} diamonds required`);
      return;
    }

    if (diamonds < MIN_DIAMONDS) {
      setError('Insufficient diamond balance');
      return;
    }

    const { coins, valid } = calculateConversion(diamonds);
    if (!valid) {
      setError(`Conversion too small. Minimum ${MIN_DIAMONDS} diamonds required to yield 1 coin`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = calculateConversion(diamonds);
      if (!result.valid) {
        setError(`Minimum ${MIN_DIAMONDS} diamonds required`);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call RPC function
      const { data, error: rpcError } = await (supabase.rpc as any)('convert_diamonds_to_coins', {
        p_profile_id: user.id,
        p_diamonds_in: diamonds,
      });

      if (rpcError) throw rpcError;

      setSuccess(`Successfully converted ${diamonds} diamonds to ${coins} coins!`);
      setDiamondsToConvert('');
      
      // Refresh balances
      await loadBalances();
    } catch (err: any) {
      setError(err.message || 'Failed to convert diamonds');
    } finally {
      setLoading(false);
    }
  };

  const conversion = calculateConversion(parseInt(diamondsToConvert) || 0);

  return (
    <div className="bg-white rounded-lg p-6 shadow">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold">Convert Diamonds to Coins</h2>
        <MonetizationTooltip type="conversion">
          <span className="text-gray-400 cursor-help text-sm">ℹ️</span>
        </MonetizationTooltip>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Diamond Balance:</span>
            <MonetizationTooltip type="diamonds">
              <span className="text-gray-400 cursor-help">ℹ️</span>
            </MonetizationTooltip>
          </div>
          <span className="font-bold text-purple-600">{diamondBalance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Coin Balance:</span>
            <MonetizationTooltip type="coins">
              <span className="text-gray-400 cursor-help">ℹ️</span>
            </MonetizationTooltip>
          </div>
          <span className="font-bold text-blue-600">{coinBalance.toLocaleString()}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">
          {success}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Diamonds to Convert (min: {MIN_DIAMONDS})
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min={MIN_DIAMONDS}
            max={diamondBalance}
            value={diamondsToConvert}
            onChange={(e) => setDiamondsToConvert(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter diamonds"
          />
          <button
            type="button"
            onClick={() => setDiamondsToConvert(String(Math.max(0, Math.floor(diamondBalance))))}
            disabled={loading || diamondBalance < MIN_DIAMONDS}
            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Max
          </button>
        </div>
      </div>

      {diamondsToConvert && conversion.valid && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="flex justify-between text-sm mb-1">
            <span>You'll receive:</span>
            <span className="font-bold text-blue-600">{conversion.coins} coins</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Platform fee (40%):</span>
            <span className="text-gray-600">{conversion.fee} diamonds</span>
          </div>
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={loading || !conversion.valid || parseInt(diamondsToConvert) < MIN_DIAMONDS}
        className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Converting...' : 'Convert Diamonds'}
      </button>

      <p className="mt-4 text-xs text-gray-500">
        Platform fee: 40%. Minimum {MIN_DIAMONDS} diamonds required. 
        Conversion rate: 1 diamond = 0.60 coins (after fee).
      </p>
    </div>
  );
}

