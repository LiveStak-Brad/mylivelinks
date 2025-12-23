'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

const COIN_PACKS = [
  { usd: 5, coins: 350 },
  { usd: 10, coins: 700 },
  { usd: 25, coins: 1750 },
  { usd: 50, coins: 3500 },
  { usd: 100, coins: 7000 },
  { usd: 250, coins: 17500 },
  { usd: 500, coins: 35000 },
  { usd: 1000, coins: 70000 },
];

export default function CoinPurchaseSection() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handlePurchase = async (usdAmount: number, coinAmount: number) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to purchase coins');
        return;
      }

      // TODO: Integrate with Stripe payment
      // For now, just show alert
      alert(`Purchase ${coinAmount.toLocaleString()} coins for $${usdAmount} - Payment integration coming soon`);
    } catch (error) {
      console.error('Error initiating purchase:', error);
      alert('Failed to initiate purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
      <h3 className="text-base font-semibold mb-2">Purchase Coins</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {COIN_PACKS.map((pack) => (
          <button
            key={pack.usd}
            onClick={() => handlePurchase(pack.usd, pack.coins)}
            disabled={loading}
            className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition text-left"
          >
            <div className="font-semibold text-sm text-blue-600 dark:text-blue-400">
              ${pack.usd}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {pack.coins.toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

