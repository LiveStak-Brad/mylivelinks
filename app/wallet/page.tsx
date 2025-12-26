'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import CoinPurchaseSection from '@/components/CoinPurchaseSection';
import DiamondConversion from '@/components/DiamondConversion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ConnectStatus {
  hasAccount: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  country?: string;
  disabledReason?: string;
}

interface WalletBalance {
  coins: number;
  diamonds: number;
}

export default function WalletPage() {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<WalletBalance>({ coins: 0, diamonds: 0 });
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [cashoutLoading, setCashoutLoading] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [diamondsToCashout, setDiamondsToCashout] = useState<string>('');

  const supabase = createClient();
  const MIN_CASHOUT_DIAMONDS = 10000; // $100 minimum

  useEffect(() => {
    loadUserData();
  }, []);

  // Check for purchase success/cancel in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const purchaseStatus = params.get('purchase');
    const sessionId = params.get('session_id');

    if (purchaseStatus === 'success') {
      if (!sessionId) {
        setMessage({
          type: 'error',
          text: 'Purchase completed but missing session_id. Please contact support.',
        });
        window.history.replaceState({}, '', '/wallet');
        return;
      }

      (async () => {
        try {
          const resp = await fetch('/api/coins/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });

          const data = await resp.json().catch(() => ({} as any));

          if (!resp.ok) {
            setMessage({
              type: 'error',
              text:
                data?.error ||
                data?.message ||
                'Purchase completed but failed to credit coins. Please contact support.',
            });
            return;
          }

          setMessage({
            type: 'success',
            text: '🎉 Coins purchased successfully! Your balance has been updated.',
          });
          await loadUserData();
        } catch (e) {
          setMessage({
            type: 'error',
            text: 'Purchase completed but failed to confirm coins. Please contact support.',
          });
        } finally {
          window.history.replaceState({}, '', '/wallet');
        }
      })();
    } else if (purchaseStatus === 'cancelled') {
      setMessage({ type: 'error', text: 'Purchase was cancelled.' });
      window.history.replaceState({}, '', '/wallet');
    } else if (params.get('connect') === 'complete') {
      setMessage({ type: 'success', text: '✅ Stripe Connect setup complete! Refreshing status...' });
      window.history.replaceState({}, '', '/wallet');
      refreshConnectStatus();
    }
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      // Load balance
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

      // Load Connect status
      await refreshConnectStatus();
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshConnectStatus = async () => {
    try {
      const response = await fetch('/api/connect/status');
      if (response.ok) {
        const data = await response.json();
        setConnectStatus(data);
      }
    } catch (err) {
      console.error('Error loading Connect status:', err);
    }
  };

  const handleOnboarding = async () => {
    setOnboardingLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/connect/onboard', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to start onboarding' });
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to start Stripe Connect setup' });
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleCashout = async () => {
    const diamonds = diamondsToCashout ? parseInt(diamondsToCashout) : balance.diamonds;

    if (diamonds < MIN_CASHOUT_DIAMONDS) {
      setMessage({ type: 'error', text: `Minimum cashout is ${MIN_CASHOUT_DIAMONDS.toLocaleString()} diamonds ($${MIN_CASHOUT_DIAMONDS / 100})` });
      return;
    }

    if (diamonds > balance.diamonds) {
      setMessage({ type: 'error', text: 'Insufficient diamond balance' });
      return;
    }

    setCashoutLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/cashout/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diamondsRequested: diamonds }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Cashout failed' });
        return;
      }

      setMessage({
        type: 'success',
        text: `🎉 Cashout successful! $${data.amountUsd.toFixed(2)} is being transferred to your Stripe account.`,
      });

      // Update balance
      if (data.remainingDiamonds !== undefined) {
        setBalance(prev => ({ ...prev, diamonds: data.remainingDiamonds }));
      } else {
        await loadUserData();
      }

      setDiamondsToCashout('');
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to process cashout' });
    } finally {
      setCashoutLoading(false);
    }
  };

  const diamondsToUsd = (diamonds: number) => (diamonds / 100).toFixed(2);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Wallet</h1>
          <p className="text-gray-500 mb-4">Please log in to access your wallet</p>
          <Link href="/login" className="text-blue-500 hover:underline">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">💼 Wallet</h1>

        {/* Messages */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Balances Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Your Balances</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-sm text-gray-600 dark:text-gray-400">Coins</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                🪙 {balance.coins.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                For sending gifts
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-sm text-gray-600 dark:text-gray-400">Diamonds</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                💎 {balance.diamonds.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ≈ ${diamondsToUsd(balance.diamonds)} USD
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Coins */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <CoinPurchaseSection />
        </div>

        {/* Cashout Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">💸 Cash Out Diamonds</h2>
          
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <p><strong>Cashout Rate:</strong> 100 diamonds = $1.00 USD</p>
            <p><strong>Minimum:</strong> 10,000 diamonds ($100)</p>
            <p className="text-xs mt-1 opacity-80">
              No additional fees at cashout. The 40% platform fee was already applied when you earned diamonds.
            </p>
          </div>

          {!connectStatus?.hasAccount ? (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Set up Stripe Connect to receive payouts
              </p>
              <button
                onClick={handleOnboarding}
                disabled={onboardingLoading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
              >
                {onboardingLoading ? 'Loading...' : '🔗 Set Up Payouts'}
              </button>
            </div>
          ) : !connectStatus?.payoutsEnabled ? (
            <div className="text-center py-4">
              <div className="text-yellow-600 dark:text-yellow-400 mb-2">⚠️ Payouts Not Enabled</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                {connectStatus?.disabledReason || 'Please complete Stripe onboarding to enable payouts.'}
              </p>
              <button
                onClick={handleOnboarding}
                disabled={onboardingLoading}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 font-medium"
              >
                {onboardingLoading ? 'Loading...' : 'Complete Setup'}
              </button>
            </div>
          ) : balance.diamonds < MIN_CASHOUT_DIAMONDS ? (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400">
                You need at least {MIN_CASHOUT_DIAMONDS.toLocaleString()} diamonds to cash out.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Current: {balance.diamonds.toLocaleString()} diamonds
                ({((balance.diamonds / MIN_CASHOUT_DIAMONDS) * 100).toFixed(1)}% of minimum)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✅</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Payouts enabled ({connectStatus?.country || 'Account ready'})
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Diamonds to Cash Out
                </label>
                <input
                  type="number"
                  min={MIN_CASHOUT_DIAMONDS}
                  max={balance.diamonds}
                  value={diamondsToCashout}
                  onChange={(e) => setDiamondsToCashout(e.target.value)}
                  placeholder={`Max: ${balance.diamonds.toLocaleString()}`}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
                {diamondsToCashout && (
                  <p className="text-sm text-gray-500 mt-1">
                    You'll receive: ${diamondsToUsd(parseInt(diamondsToCashout) || 0)} USD
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDiamondsToCashout(String(balance.diamonds))}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Max
                </button>
                <button
                  onClick={handleCashout}
                  disabled={cashoutLoading || !diamondsToCashout || parseInt(diamondsToCashout) < MIN_CASHOUT_DIAMONDS}
                  className="flex-1 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-medium"
                >
                  {cashoutLoading ? 'Processing...' : '💸 Cash Out'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Diamond Conversion (optional) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <DiamondConversion />
        </div>

        {/* Back Link */}
        <div className="text-center">
          <button onClick={goBack} className="text-blue-500 hover:underline">
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
