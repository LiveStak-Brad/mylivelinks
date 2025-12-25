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

export default function CoinPurchaseSection() {
  const [loading, setLoading] = useState(false);
  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
            setPacks(data.packs);
          }
        }
      } catch (err) {
        console.error('Failed to load coin packs:', err);
        setError('Failed to load coin packs');
      } finally {
        setPacksLoading(false);
      }
    };
    loadPacks();
  }, []);

  const handlePurchase = async (pack: CoinPack) => {
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

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
      <h3 className="text-base font-semibold mb-2">💰 Purchase Coins</h3>
      
      {error && (
        <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}
      
      {packsLoading ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">Loading packs...</div>
      ) : (
      <div className="grid grid-cols-2 gap-2">
        {packs.map((pack) => (
          <button
            key={pack.sku}
            onClick={() => handlePurchase(pack)}
            disabled={loading}
            className={`p-2.5 rounded-lg border-2 transition-all ${
              pack.is_vip 
                ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20' 
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-500'
            } ${purchasingSku === pack.sku ? 'opacity-50 scale-95' : 'hover:scale-102'}`}
          >
            {pack.is_vip && (
              <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full">VIP</span>
            )}
            <div className="font-bold text-sm text-purple-600 dark:text-purple-400">
              ${pack.usd_amount}
            </div>
            <div className="text-xs font-semibold text-gray-900 dark:text-white">
              {pack.coins_awarded.toLocaleString()} 🪙
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
              {pack.pack_name}
            </div>
            {pack.description && (
              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                {pack.description}
              </div>
            )}
            {purchasingSku === pack.sku && (
              <div className="text-[10px] text-purple-500 animate-pulse">Processing...</div>
            )}
          </button>
        ))}
      </div>
      )}
      
      <a href="/wallet" className="block mt-2 text-xs text-purple-600 dark:text-purple-400 hover:underline text-center">
        View all packs →
      </a>
      
      <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
        Non-refundable.
      </p>
    </div>
  );
}

