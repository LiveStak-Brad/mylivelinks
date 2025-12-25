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

// Fallback packs shown if database has none (for quick setup)
const FALLBACK_PACKS: CoinPack[] = [
  { sku: 'coins_5', price_id: '', usd_amount: 5, coins_awarded: 350, pack_name: 'Starter', is_vip: false, vip_tier: null },
  { sku: 'coins_10', price_id: '', usd_amount: 10, coins_awarded: 700, pack_name: 'Popular', is_vip: false, vip_tier: null },
  { sku: 'coins_25', price_id: '', usd_amount: 25, coins_awarded: 1750, pack_name: 'Great Value', is_vip: false, vip_tier: null },
  { sku: 'coins_50', price_id: '', usd_amount: 50, coins_awarded: 3500, pack_name: 'Best Seller', is_vip: false, vip_tier: null },
  { sku: 'coins_100', price_id: '', usd_amount: 100, coins_awarded: 7000, pack_name: 'Supporter', is_vip: false, vip_tier: null },
  { sku: 'coins_250', price_id: '', usd_amount: 250, coins_awarded: 17500, pack_name: 'Super', is_vip: false, vip_tier: null },
  { sku: 'coins_500', price_id: '', usd_amount: 500, coins_awarded: 35000, pack_name: 'Mega', is_vip: false, vip_tier: null },
  { sku: 'coins_1000', price_id: '', usd_amount: 1000, coins_awarded: 70000, pack_name: 'Ultimate', is_vip: false, vip_tier: null },
];

export default function CoinPurchaseSection() {
  const [loading, setLoading] = useState(false);
  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const supabase = createClient();

  // Load coin packs from API
  useEffect(() => {
    const loadPacks = async () => {
      try {
        setPacksLoading(true);
        const response = await fetch('/api/coins/packs');
        if (response.ok) {
          const data = await response.json();
          if (data.packs && data.packs.length > 0) {
            // Check if any pack has a valid Stripe price ID
            const hasValidStripe = data.packs.some((p: CoinPack) => 
              p.price_id && !p.price_id.includes('REPLACE')
            );
            setStripeConfigured(hasValidStripe);
            setPacks(data.packs);
          } else {
            // No packs from API, use fallback
            setPacks(FALLBACK_PACKS);
            setStripeConfigured(false);
          }
        } else {
          // API error, use fallback
          setPacks(FALLBACK_PACKS);
          setStripeConfigured(false);
        }
      } catch (err) {
        console.error('Failed to load coin packs:', err);
        setPacks(FALLBACK_PACKS);
        setStripeConfigured(false);
      } finally {
        setPacksLoading(false);
      }
    };
    loadPacks();
  }, []);

  const handlePurchase = async (pack: CoinPack) => {
    // Check if Stripe is configured
    if (!pack.price_id || pack.price_id.includes('REPLACE') || !stripeConfigured) {
      // Redirect to wallet page instead
      window.location.href = '/wallet';
      return;
    }

    setLoading(true);
    setPurchasingSku(pack.sku);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to purchase coins');
        return;
      }

      // Call create-checkout API
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

  // Display packs (max 8 for sidebar, prioritize smaller amounts)
  const displayPacks = packs.slice(0, 8);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
      <h3 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">💰 Purchase Coins</h3>
      
      {error && (
        <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}
      
      {packsLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {displayPacks.map((pack) => (
              <button
                key={pack.sku}
                onClick={() => handlePurchase(pack)}
                disabled={loading}
                className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                  pack.is_vip 
                    ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20' 
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-500 dark:hover:border-purple-500'
                } ${purchasingSku === pack.sku ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'} ${loading ? 'cursor-wait' : 'cursor-pointer'}`}
              >
                {pack.is_vip && (
                  <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full">VIP</span>
                )}
                <div className="font-bold text-lg text-green-600 dark:text-green-400">
                  ${pack.usd_amount}
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {pack.coins_awarded.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  coins
                </div>
                {purchasingSku === pack.sku && (
                  <div className="text-[10px] text-purple-500 animate-pulse mt-1">Processing...</div>
                )}
              </button>
            ))}
          </div>

          {!stripeConfigured && (
            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-400">
              💳 Stripe payments being configured. Visit wallet for details.
            </div>
          )}
        </>
      )}
      
      <a 
        href="/wallet" 
        className="block mt-3 text-xs text-purple-600 dark:text-purple-400 hover:underline text-center font-medium"
      >
        Open Full Wallet →
      </a>
      
      <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 text-center">
        Secure payments via Stripe • Non-refundable
      </p>
    </div>
  );
}
