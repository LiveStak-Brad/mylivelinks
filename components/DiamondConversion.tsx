'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Gem, Coins, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { Tooltip } from '@/components/ui/Tooltip';

// Module-level singleton to prevent duplicate subscriptions (shared with UserStatsSection)
const activeConversionSubscriptions = new Map<string, { channel: any; refCount: number; callbacks: Set<Function> }>();

export default function DiamondConversion() {
  const [diamondBalance, setDiamondBalance] = useState<number>(0);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [diamondsToConvert, setDiamondsToConvert] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();
  const MIN_DIAMONDS = 2; // Minimum diamonds required
  const CONVERSION_RATE = 0.6; // 60% (40% platform fee)

  useEffect(() => {
    loadBalances();
  }, []);

  // Real-time subscription for balance updates with singleton pattern
  useEffect(() => {
    let userId: string | null = null;
    let myCallback: Function | null = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      userId = user.id;
      const existing = activeConversionSubscriptions.get(userId);

      // Create callback for this component instance
      myCallback = (payload: any) => {
        const updatedProfile = payload.new;
        setCoinBalance(updatedProfile.coin_balance || 0);
        setDiamondBalance(updatedProfile.earnings_balance || 0);
      };

      if (existing) {
        // Reuse existing subscription
        existing.refCount++;
        existing.callbacks.add(myCallback);
        return;
      }

      // Create new subscription
      const channel = supabase
        .channel(`conversion-balance-updates:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload: any) => {
            const sub = activeConversionSubscriptions.get(userId!);
            if (sub) {
              sub.callbacks.forEach(cb => cb(payload));
            }
          }
        )
        .subscribe();

      activeConversionSubscriptions.set(userId, {
        channel,
        refCount: 1,
        callbacks: new Set([myCallback])
      });
    };

    setupRealtimeSubscription();

    return () => {
      if (userId && myCallback) {
        const existing = activeConversionSubscriptions.get(userId);
        if (existing) {
          existing.callbacks.delete(myCallback);
          existing.refCount--;
          if (existing.refCount === 0) {
            supabase.removeChannel(existing.channel);
            activeConversionSubscriptions.delete(userId);
          }
        }
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-foreground">Convert Diamonds to Coins</h2>
        <Tooltip content="Convert your earned diamonds back to coins for gifting. 40% platform fee applies.">
          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
        </Tooltip>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Gem className="w-4 h-4 text-purple-500" />
            <span className="text-muted-foreground text-sm">Diamond Balance</span>
          </div>
          <span className="font-bold text-purple-500">{diamondBalance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="text-muted-foreground text-sm">Coin Balance</span>
          </div>
          <span className="font-bold text-amber-500">{coinBalance.toLocaleString()}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/30 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">
          Diamonds to Convert (min: {MIN_DIAMONDS})
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={MIN_DIAMONDS}
            max={diamondBalance}
            value={diamondsToConvert}
            onChange={(e) => setDiamondsToConvert(e.target.value)}
            placeholder="Enter diamonds"
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDiamondsToConvert(String(Math.max(0, Math.floor(diamondBalance))))}
            disabled={loading || diamondBalance < MIN_DIAMONDS}
          >
            Max
          </Button>
        </div>
      </div>

      {diamondsToConvert && conversion.valid && (
        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">You'll receive:</span>
            <span className="font-bold text-amber-500">{conversion.coins} coins</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform fee (40%):</span>
            <span className="text-muted-foreground">{conversion.fee} diamonds</span>
          </div>
        </div>
      )}

      <Button
        onClick={handleConvert}
        disabled={loading || !conversion.valid || parseInt(diamondsToConvert) < MIN_DIAMONDS}
        isLoading={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        Convert Diamonds
      </Button>

      <p className="text-xs text-muted-foreground">
        Platform fee: 40%. Minimum {MIN_DIAMONDS} diamonds required. 
        Conversion rate: 1 diamond = 0.60 coins (after fee).
      </p>
    </div>
  );
}
