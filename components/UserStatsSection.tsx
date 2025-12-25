'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';

export default function UserStatsSection() {
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [diamondBalance, setDiamondBalance] = useState<number>(0);
  const [username, setUsername] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gifterStatus, setGifterStatus] = useState<GifterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadUserStats();
  }, []);

  // Real-time subscription for balance updates
  useEffect(() => {
    let channel: any = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to profile changes for this user
      channel = supabase
        .channel(`user-balance-updates:${user.id}`)
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
            fetchGifterStatuses([user.id]).then((m) => {
              setGifterStatus(m[user.id] || null);
            });
            
            console.log('[BALANCE] Real-time update:', {
              coins: updatedProfile.coin_balance,
              diamonds: updatedProfile.earnings_balance,
              level: updatedProfile.gifter_level,
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

  const loadUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        setLoading(false);
        return;
      }

      setCoinBalance(profile.coin_balance || 0);
      setDiamondBalance(profile.earnings_balance || 0);
      setUsername(profile.username);
      setAvatarUrl(profile.avatar_url);

      const statusMap = await fetchGifterStatuses([user.id]);
      setGifterStatus(statusMap[user.id] || null);
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Your Stats</h3>
      
      {/* User Info */}
      <div className="flex items-center gap-3 mb-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {username[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <div className="flex-1">
          <div className="font-semibold">{username}</div>
          {gifterStatus && Number(gifterStatus.lifetime_coins ?? 0) > 0 && (
            <TierBadge
              tier_key={gifterStatus.tier_key}
              level={gifterStatus.level_in_tier}
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Balances */}
      <div className="space-y-2">
        <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
          <span className="text-sm text-gray-600 dark:text-gray-400">Coins</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {coinBalance.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
          <span className="text-sm text-gray-600 dark:text-gray-400">Diamonds</span>
          <span className="font-bold text-purple-600 dark:text-purple-400">
            {diamondBalance.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}




