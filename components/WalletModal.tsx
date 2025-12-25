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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-warning/10 to-primary/10">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            💼 Your Wallet
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-muted rounded-lg" />
              <div className="h-20 bg-muted rounded-lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Coin Balance */}
              <div className="bg-warning/10 p-5 rounded-xl border border-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                      <Coins className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Coins</div>
                      <div className="text-2xl font-bold text-warning">
                        {balance.coins.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use coins to send gifts to streamers
                </p>
              </div>

              {/* Diamond Balance */}
              <div className="bg-primary/10 p-5 rounded-xl border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Gem className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Diamonds</div>
                      <div className="text-2xl font-bold text-primary">
                        {balance.diamonds.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Diamonds from gifts • ≈ ${(balance.diamonds / 100).toFixed(2)} USD
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href="/wallet"
                  className="btn btn-md bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  <span>Buy Coins</span>
                </a>
                <a
                  href="/wallet"
                  className="btn btn-md btn-primary"
                >
                  <span>Cash Out</span>
                </a>
              </div>

              {/* Full Wallet Link */}
              <a
                href="/wallet"
                className="flex items-center justify-center gap-2 text-sm text-primary hover:underline pt-2"
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

