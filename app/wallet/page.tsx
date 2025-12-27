'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import CoinPurchaseSection from '@/components/CoinPurchaseSection';
import DiamondConversion from '@/components/DiamondConversion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { 
  Wallet, 
  Coins, 
  Gem, 
  TrendingUp, 
  CreditCard, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Skeleton, SkeletonCard, Input } from '@/components/ui';
import { Tooltip } from '@/components/ui/Tooltip';

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

    if (purchaseStatus === 'success') {
      setMessage({
        type: 'success',
        text: 'Processing purchase…',
      });

      let startingCoins = balance.coins;

      const start = Date.now();
      const interval = window.setInterval(() => {
        refreshBalance().then((next) => {
          if (next && next.coins > startingCoins) {
            window.clearInterval(interval);
            setMessage({ type: 'success', text: 'Coins added 🎉' });
          }
        });

        if (Date.now() - start > 60000) {
          window.clearInterval(interval);
          setMessage({
            type: 'error',
            text: 'Still processing your purchase. If coins do not appear soon, please contact support.',
          });
        }
      }, 2500);

      refreshBalance().then((next) => {
        if (next) startingCoins = next.coins;
      });
      window.history.replaceState({}, '', '/wallet');
    } else if (purchaseStatus === 'cancelled') {
      setMessage({ type: 'error', text: 'Purchase was cancelled.' });
      window.history.replaceState({}, '', '/wallet');
    } else if (params.get('connect') === 'complete') {
      setMessage({ type: 'success', text: '✅ Stripe Connect setup complete! Refreshing status...' });
      window.history.replaceState({}, '', '/wallet');
      refreshConnectStatus();
    }
  }, []);

  const refreshBalance = async (): Promise<WalletBalance | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance, earnings_balance')
        .eq('id', user.id)
        .single();

      if (profile) {
        const next = {
          coins: profile.coin_balance || 0,
          diamonds: profile.earnings_balance || 0,
        };
        setBalance(next);
        return next;
      }
    } catch (err) {
      console.error('Error refreshing balance:', err);
    }

    return null;
  };

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      await refreshBalance();

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
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <Skeleton variant="circle" className="w-10 h-10" />
            <div className="space-y-2">
              <Skeleton className="w-36 h-8" />
              <Skeleton className="w-48 h-4" />
            </div>
          </div>
          
          {/* Balance cards skeleton */}
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
          
          {/* Purchase section skeleton */}
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Your Wallet</h1>
            <p className="text-muted-foreground mb-6">Please log in to view your balance and manage your coins</p>
            <Link href="/login">
              <Button size="lg" className="w-full">
                Log In to Continue
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <Button 
            onClick={goBack}
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
            <p className="text-muted-foreground text-sm">Manage your coins and earnings</p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`
              flex items-start gap-3 p-4 rounded-xl border animate-slide-up
              ${message.type === 'success'
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
              }
            `}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Balances Card */}
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Your Balances
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Coins Balance */}
              <Tooltip content="Use coins to send gifts to your favorite creators">
                <div className="relative group cursor-help">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                  <div className="relative p-5 rounded-2xl bg-card border border-amber-300/30 hover:border-amber-400/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-muted-foreground">Coins</span>
                    </div>
                    <div className="text-3xl font-bold text-amber-500">
                      {balance.coins.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      For sending gifts
                    </p>
                  </div>
                </div>
              </Tooltip>

              {/* Diamonds Balance */}
              <Tooltip content="Earn diamonds from receiving gifts. Cash out anytime!">
                <div className="relative group cursor-help">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                  <div className="relative p-5 rounded-2xl bg-card border border-purple-300/30 hover:border-purple-400/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Gem className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-muted-foreground">Diamonds</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-500">
                      {balance.diamonds.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ≈ ${diamondsToUsd(balance.diamonds)} USD
                    </p>
                  </div>
                </div>
              </Tooltip>
            </div>
          </div>
        </Card>

        {/* Purchase Coins */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-primary" />
              Buy Coins
            </CardTitle>
            <CardDescription>
              Get coins to support your favorite creators with gifts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CoinPurchaseSection />
          </CardContent>
        </Card>

        {/* Cashout Section */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gem className="w-5 h-5 text-purple-500" />
              Cash Out Diamonds
            </CardTitle>
            <CardDescription>
              Convert your diamond earnings to real money
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Rate info */}
            <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cashout rate</span>
                <span className="font-semibold text-foreground">100 💎 = $1.00 USD</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Minimum cashout</span>
                <span className="font-semibold text-foreground">10,000 💎 ($100)</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                No additional fees at cashout.
              </p>
            </div>

            {!connectStatus?.hasAccount ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Gem className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Set Up Stripe Connect</p>
                  <p className="text-sm text-muted-foreground">
                    Connect with Stripe to receive your earnings
                  </p>
                </div>
                <Button
                  onClick={handleOnboarding}
                  disabled={onboardingLoading}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {onboardingLoading ? 'Loading...' : '🔗 Set Up Stripe Connect'}
                </Button>
              </div>
            ) : !connectStatus?.payoutsEnabled ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-warning/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-warning" />
                </div>
                <div>
                  <p className="font-medium text-warning mb-1">Payouts Not Enabled</p>
                  <p className="text-sm text-muted-foreground">
                    {connectStatus?.disabledReason || 'Please complete Stripe onboarding to enable payouts.'}
                  </p>
                </div>
                <Button
                  onClick={handleOnboarding}
                  disabled={onboardingLoading}
                  variant="secondary"
                  size="lg"
                >
                  {onboardingLoading ? 'Loading...' : 'Complete Setup'}
                </Button>
              </div>
            ) : balance.diamonds < MIN_CASHOUT_DIAMONDS ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                  <Gem className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">
                    {MIN_CASHOUT_DIAMONDS.toLocaleString()} 💎 needed to cash out
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current: {balance.diamonds.toLocaleString()} diamonds
                  </p>
                </div>
                {/* Progress bar */}
                <div className="max-w-xs mx-auto">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((balance.diamonds / MIN_CASHOUT_DIAMONDS) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {((balance.diamonds / MIN_CASHOUT_DIAMONDS) * 100).toFixed(1)}% of minimum
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-muted-foreground">
                    Payouts enabled ({connectStatus?.country || 'Account ready'})
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Diamonds to Cash Out
                  </label>
                  <Input
                    type="number"
                    min={MIN_CASHOUT_DIAMONDS}
                    max={balance.diamonds}
                    value={diamondsToCashout}
                    onChange={(e) => setDiamondsToCashout(e.target.value)}
                    placeholder={`Max: ${balance.diamonds.toLocaleString()}`}
                    inputSize="lg"
                  />
                  {diamondsToCashout && (
                    <p className="text-sm text-muted-foreground mt-2">
                      You'll receive: <span className="font-semibold text-success">${diamondsToUsd(parseInt(diamondsToCashout) || 0)} USD</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDiamondsToCashout(String(balance.diamonds))}
                  >
                    Max
                  </Button>
                  <Button
                    onClick={handleCashout}
                    disabled={cashoutLoading || !diamondsToCashout || parseInt(diamondsToCashout) < MIN_CASHOUT_DIAMONDS}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    size="lg"
                  >
                    {cashoutLoading ? 'Processing...' : '💸 Cash Out'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diamond Conversion */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <DiamondConversion />
          </CardContent>
        </Card>

        {/* Analytics Link */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow group cursor-pointer">
          <Link href="/me/analytics" className="block">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Analytics</h3>
                    <p className="text-sm text-muted-foreground">
                      View detailed spending, earnings, and gifter stats
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
