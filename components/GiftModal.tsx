'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { trackLiveGift } from '@/lib/trending-hooks';

interface GiftType {
  id: number;
  name: string;
  coin_cost: number;
  icon_url?: string;
  emoji?: string;
  tier: number;
}

interface GiftModalProps {
  recipientId: string;
  recipientUsername: string;
  slotIndex?: number;
  liveStreamId?: number;
  onGiftSent: () => void;
  onClose: () => void;
}

export default function GiftModal({
  recipientId,
  recipientUsername,
  slotIndex,
  liveStreamId,
  onGiftSent,
  onClose,
}: GiftModalProps) {
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCoinBalance, setUserCoinBalance] = useState<number>(0);

  const inFlightRef = useRef(false);

  const supabase = createClient();

  // Map gift names to emojis (same as GiftAnimation for consistency)
  const getGiftEmoji = (name: string) => {
    const emojiMap: { [key: string]: string } = {
      'Poo': '💩',
      'Rose': '🌹',
      'Heart': '❤️',
      'Star': '⭐',
      'Diamond': '💎',
      'Super Star': '🌟',
      'Crown': '👑',
      'Platinum': '💠',
      'Legendary': '🏆',
      'Fire': '🔥',
      'Rocket': '🚀',
      'Rainbow': '🌈',
      'Unicorn': '🦄',
      'Party': '🎉',
      'Confetti': '🎊',
      'Champagne': '🍾',
      'Money': '💰',
      'Cash': '💵',
      'Gold': '🥇',
      'Silver': '🥈',
      'Bronze': '🥉',
      'Kiss': '💋',
      'Hug': '🤗',
      'Love': '💕',
      'Sparkle': '✨',
      'Gem': '💎',
      'Crystal': '🔮',
      'Music': '🎵',
      'Microphone': '🎤',
      'Camera': '📸',
      'Clap': '👏',
      'Thumbs Up': '👍',
      'Wave': '👋',
      'Flex': '💪',
      'Cool': '😎',
      'Hot': '🥵',
      'VIP': '🎯',
      'King': '🤴',
      'Queen': '👸',
      'Angel': '😇',
      'Devil': '😈',
    };
    return emojiMap[name] || '🎁';
  };

  // Load gift types and user balance on mount
  useEffect(() => {
    loadGiftTypes();
    loadUserBalance();
  }, []);

  const loadGiftTypes = async () => {
    const { data, error } = await supabase
      .from('gift_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (!error && data) {
      setGiftTypes(data);
    }
  };

  const loadUserBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setUserCoinBalance((data as any).coin_balance);
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift) return;

    if (inFlightRef.current) return;

    if (userCoinBalance < selectedGift.coin_cost) {
      setError('Insufficient coin balance');
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const requestId = crypto.randomUUID();

      // Call API endpoint (gifts are 1:1 coins -> diamonds, no platform fee on gifts)
      const response = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: recipientId,
          coinsAmount: selectedGift.coin_cost,
          giftTypeId: selectedGift.id,
          streamId: liveStreamId || null,
          requestId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send gift');
      }

      // Update local balance from response
      if (data.senderBalance) {
        setUserCoinBalance(data.senderBalance.coins);
      } else {
        await loadUserBalance();
      }

      // Post chat message: "sender sent 'gift' to recipient"
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (senderProfile) {
        const diamondsAwarded =
          typeof data?.diamondsAwarded === 'number'
            ? data.diamondsAwarded
            : (typeof data?.diamonds_awarded === 'number' ? data.diamonds_awarded : null);

        const diamondsSuffix = typeof diamondsAwarded === 'number' ? ` 💎+${diamondsAwarded}` : '';
        await supabase.from('chat_messages').insert({
          profile_id: user.id,
          content: `${senderProfile.username} sent "${selectedGift.name}" to ${recipientUsername}${diamondsSuffix}`,
          message_type: 'gift',
        });
      }

      // Track gift for trending (after successful send, fire-and-forget)
      if (liveStreamId) {
        trackLiveGift({
          streamId: liveStreamId,
          amountValue: selectedGift.coin_cost
        }).catch(err => {
          console.warn('[Trending] Gift tracking failed:', err);
        });
      }

      // Track gift for trending (after successful send, fire-and-forget)
      if (liveStreamId) {
        trackLiveGift({
          streamId: liveStreamId,
          amountValue: selectedGift.coin_cost
        }).catch(err => {
          console.warn('[Trending] Gift tracking failed:', err);
        });
      }

      onGiftSent();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send gift');
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl overflow-hidden flex flex-col modal-fullscreen-mobile" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">🎁 Send Gift to {recipientUsername}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl mobile-touch-target" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body flex-1 overflow-y-auto">
          <div className="mb-4 p-3 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your Coins: <span className="font-bold text-yellow-600 dark:text-yellow-400">💰 {userCoinBalance.toLocaleString()}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          <div className="grid grid-cols-4 gap-3 mb-4 max-h-72 overflow-y-auto p-1 custom-scrollbar">
            {giftTypes.map((gift) => (
              <button
                key={gift.id}
                onClick={() => setSelectedGift(gift)}
                className={`p-3 border-2 rounded-lg transition ${
                  selectedGift?.id === gift.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-lg scale-105'
                    : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/20'
                }`}
              >
                {gift.icon_url ? (
                  <img src={gift.icon_url} alt={gift.name} className="w-12 h-12 mx-auto mb-1 drop-shadow-lg" />
                ) : (
                  <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center text-4xl drop-shadow-lg">
                    {gift.emoji || getGiftEmoji(gift.name)}
                  </div>
                )}
                <p className="text-xs font-medium truncate">{gift.name}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">{gift.coin_cost} 💰</p>
              </button>
            ))}
          </div>

          {selectedGift && (
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-3">
                <div className="text-3xl">
                  {selectedGift.icon_url ? (
                    <img src={selectedGift.icon_url} alt={selectedGift.name} className="w-10 h-10" />
                  ) : (
                    selectedGift.emoji || getGiftEmoji(selectedGift.name)
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedGift.name}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-bold">
                    💰 {selectedGift.coin_cost} coins
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                ✨ Recipient will earn {selectedGift.coin_cost} diamonds
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-shrink-0 pt-2 mobile-safe-bottom">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSendGift}
            disabled={!selectedGift || loading || userCoinBalance < (selectedGift?.coin_cost || 0)}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition"
          >
            {loading ? '✨ Sending...' : '🎁 Send Gift'}
          </button>
        </div>
      </div>
    </div>
  );
}

