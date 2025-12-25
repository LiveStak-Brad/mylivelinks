'use client';

import { useState, useEffect } from 'react';
import { X, Coins, Gem, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({ coins: 0, diamonds: 0 });
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadBalance();
    }
  }, [isOpen]);

  const loadBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance, earnings_balance')
        .eq('id', user.id)
        .single();

      if (profile) {
        setBalance({
          coins: profile.coin_balance || 0,
          diamonds: profile.earnings_balance || 0,
        });
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-yellow-50 to-purple-50 dark:from-yellow-900/20 dark:to-purple-900/20">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            💼 Your Wallet
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Coin Balance */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 p-5 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-yellow-200 dark:bg-yellow-800/50 flex items-center justify-center">
                      <Coins className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Coins</div>
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {balance.coins.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Use coins to send gifts to streamers
                </p>
              </div>

              {/* Diamond Balance */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 p-5 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-200 dark:bg-purple-800/50 flex items-center justify-center">
                      <Gem className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Diamonds</div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {balance.diamonds.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Diamonds from gifts • ≈ ${(balance.diamonds / 100).toFixed(2)} USD
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href="/wallet"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-lg font-medium hover:from-yellow-600 hover:to-amber-600 transition"
                >
                  <span>Buy Coins</span>
                </a>
                <a
                  href="/wallet"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition"
                >
                  <span>Cash Out</span>
                </a>
              </div>

              {/* Full Wallet Link */}
              <a
                href="/wallet"
                className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline pt-2"
              >
                <span>Open Full Wallet</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

