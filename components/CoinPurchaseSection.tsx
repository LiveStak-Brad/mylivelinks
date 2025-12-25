'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface CoinPack {
  sku: string;
  price_id: string;
  usd_amount: number;
  coins_awarded: number;
  pack_name: string;
  is_vip: boolean;
  vip_tier: number | null;
  description?: string | null;
}

interface UserInfo {
  id: string;
  vip_tier: number;
  isOwner: boolean;
}

// Owner/Admin IDs for override
const OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
const OWNER_EMAILS = ['wcba.mo@gmail.com'];

export default function CoinPurchaseSection() {
  const [loading, setLoading] = useState(false);
  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const supabase = createClient();

  // Load user info and coin packs
  useEffect(() => {
    const loadData = async () => {
      try {
        setPacksLoading(true);

        // Get current user info
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isOwner = OWNER_IDS.includes(user.id) || OWNER_EMAILS.includes(user.email?.toLowerCase() || '');
          
          // Get user's VIP tier
          const { data: profile } = await supabase
            .from('profiles')
            .select('vip_tier')
            .eq('id', user.id)
            .single();

          setUserInfo({
            id: user.id,
            vip_tier: profile?.vip_tier || 0,
            isOwner,
          });
        }

        // Load packs from API (single source of truth)
        const response = await fetch('/api/coins/packs');
        const data = await response
          .json()
          .catch(() => ({} as any));

        if (!response.ok) {
          const msg =
            data?.message ||
            data?.error ||
            `Failed to load coin packs (HTTP ${response.status})`;
          setError(msg);
          return;
        }

        if (data.packs && Array.isArray(data.packs)) {
          setPacks(data.packs);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load coin packs');
      } finally {
        setPacksLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter and sort packs based on user qualification
  const getVisiblePacks = (): CoinPack[] => {
    if (!packs.length) return [];

    // Filter based on VIP gating
    const filtered = packs.filter((pack) => {
      // Standard packs always visible
      if (!pack.is_vip) return true;

      // Owner/Admin sees everything
      if (userInfo?.isOwner) return true;

      // VIP packs: user must have >= pack's vip_tier
      const userTier = userInfo?.vip_tier || 0;
      const packTier = pack.vip_tier ?? 0;
      return userTier >= packTier;
    });

    // Sort: Standard packs by USD ascending, then VIP packs by tier ascending
    return filtered.sort((a, b) => {
      // Standard packs first
      if (a.is_vip !== b.is_vip) return a.is_vip ? 1 : -1;
      
      // Within same category, sort by price
      if (!a.is_vip) {
        return a.usd_amount - b.usd_amount;
      }
      
      // VIP packs: sort by tier, then price
      const tierDiff = (a.vip_tier ?? 0) - (b.vip_tier ?? 0);
      if (tierDiff !== 0) return tierDiff;
      return a.usd_amount - b.usd_amount;
    });
  };

  const handlePurchase = async (pack: CoinPack) => {
    if (!pack.price_id) {
      setError('This pack is not available for purchase');
      return;
    }

    setLoading(true);
    setPurchasingSku(pack.sku);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to purchase coins');
        setLoading(false);
        setPurchasingSku(null);
        return;
      }

      // Call create-checkout API with price_id
      const response = await fetch('/api/coins/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: pack.price_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create checkout');
        return;
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setError('No checkout URL returned');
      }
    } catch (err) {
      console.error('Error initiating purchase:', err);
      setError('Failed to initiate purchase');
    } finally {
      setLoading(false);
      setPurchasingSku(null);
    }
  };

  // Get VIP badge styling
  const getVipBadge = (pack: CoinPack) => {
    if (!pack.is_vip) return null;

    const tier = pack.vip_tier ?? 1;
    
    // Bronze tier ($10,000)
    if (tier === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-sm">
          🥉 BRONZE
        </span>
      );
    }
    
    // Diamond tier ($25,000)
    if (tier >= 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 text-white shadow-sm">
          💎 DIAMOND
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        ⭐ VIP
      </span>
    );
  };

  const visiblePacks = getVisiblePacks();
  const hasVipPacks = packs.some(p => p.is_vip);
  const userCanSeeAllVip = userInfo?.isOwner || (userInfo?.vip_tier || 0) >= 2;

  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <h3 className="text-base font-semibold mb-2 text-foreground">💰 Purchase Coins</h3>
      
      {error && (
        <div className="mb-2 p-2 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {packsLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : visiblePacks.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No coin packs available</p>
          <p className="text-xs mt-1">Please try again later</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {visiblePacks.map((pack) => (
              <button
                key={pack.sku}
                onClick={() => handlePurchase(pack)}
                disabled={loading || !pack.price_id}
                className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                  pack.is_vip 
                    ? pack.vip_tier === 1
                      ? 'border-amber-500 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-yellow-900/20 hover:shadow-amber-200 dark:hover:shadow-amber-900/50'
                      : 'border-cyan-400 bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 dark:from-cyan-900/30 dark:via-blue-900/20 dark:to-purple-900/20 hover:shadow-cyan-200 dark:hover:shadow-cyan-900/50'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-500 dark:hover:border-purple-500'
                } ${purchasingSku === pack.sku ? 'opacity-50 scale-95' : 'hover:scale-[1.02] hover:shadow-lg'} ${loading ? 'cursor-wait' : 'cursor-pointer'} ${!pack.price_id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {/* VIP Badge */}
                {pack.is_vip && (
                  <div className="absolute -top-2 -right-2">
                    {getVipBadge(pack)}
                  </div>
                )}

                {/* Pack Name */}
                <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate pr-8">
                  {pack.pack_name}
                </div>

                {/* Price */}
                <div className={`font-bold text-xl ${
                  pack.is_vip 
                    ? pack.vip_tier === 1 
                      ? 'text-amber-600 dark:text-amber-400' 
                      : 'text-cyan-600 dark:text-cyan-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  ${(pack.usd_amount).toLocaleString()}
                </div>

                {/* Coins */}
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {pack.coins_awarded.toLocaleString()} 🪙
                </div>

                {/* Description */}
                {pack.description && (
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {pack.description}
                  </div>
                )}

                {/* Processing State */}
                {purchasingSku === pack.sku && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center">
                    <div className="text-xs text-purple-600 dark:text-purple-400 animate-pulse font-medium">
                      Processing...
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Locked VIP message for non-qualified users */}
          {hasVipPacks && !userCanSeeAllVip && (
            <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-warning">
                <span>🔒</span>
                <span>Unlock higher VIP Coin Packs by purchasing VIP tiers</span>
              </div>
            </div>
          )}
        </>
      )}
      
      <a 
        href="/wallet" 
        className="block mt-3 text-xs text-primary hover:underline text-center font-medium"
      >
        Open Full Wallet →
      </a>
      
      <p className="mt-1 text-[10px] text-muted-foreground text-center">
        Secure payments via Stripe
      </p>
    </div>
  );
}
