'use client';

import { useState, useEffect, useRef } from 'react';
import { Gift, X, Send, Ban } from 'lucide-react';
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
  commentId?: string;
  postId?: string;
  onGiftSent: () => void;
  onClose: () => void;
}

export default function GiftModal({
  recipientId,
  recipientUsername,
  slotIndex,
  liveStreamId,
  commentId,
  postId,
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

      // Call appropriate API endpoint based on gift type
      const endpoint = commentId ? `/api/comments/${commentId}/gift` : '/api/gifts/send';
      const body = commentId
        ? { coins: selectedGift.coin_cost, request_id: requestId }
        : {
            toUserId: recipientId,
            coinsAmount: selectedGift.coin_cost,
            giftTypeId: selectedGift.id,
            streamId: liveStreamId || null,
            requestId,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

      // Get diamonds awarded from response
      const diamondsAwarded =
        typeof data?.diamondsAwarded === 'number'
          ? data.diamondsAwarded
          : (typeof data?.diamonds_awarded === 'number' ? data.diamonds_awarded : selectedGift.coin_cost);

      const diamondsSuffix = typeof diamondsAwarded === 'number' ? ` 💎+${diamondsAwarded}` : '';
      
      // If this is a post gift, create a comment on the post
      if (postId) {
        const { error: commentError } = await supabase.from('post_comments').insert({
          post_id: postId,
          author_id: user.id,
          text_content: `🎁 Sent a ${selectedGift.name} (${selectedGift.coin_cost} coins)${diamondsSuffix}`,
        });
        if (commentError) {
          console.error('[GiftModal] Failed to create gift comment:', commentError);
        }
      } else {
        // Otherwise post to chat messages (for live streams)
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (senderProfile) {
          await supabase.from('chat_messages').insert({
            profile_id: user.id,
            content: `${senderProfile.username} sent "${selectedGift.name}" to ${recipientUsername}${diamondsSuffix}`,
            message_type: 'gift',
          });
        }
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4" style={{ zIndex: 99999 }} onClick={onClose}>
      <div 
        className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 rounded-[2rem] w-full max-w-md max-h-[85vh] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/20 dark:border-white/10 animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all" 
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 shadow-lg shadow-purple-500/30">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Send Gift</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">to <span className="font-medium text-gray-700 dark:text-gray-300">{recipientUsername}</span></p>
            </div>
          </div>
        </div>

        {/* Balance Banner */}
        <div className="mx-6 mb-4 px-4 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">Your Balance</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{userCoinBalance.toLocaleString()} 💰</span>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-2xl text-sm border border-red-200/50 dark:border-red-800/30">
            {error}
          </div>
        )}

        {/* Gift Grid - Premium */}
        <div className="px-6 pb-4 max-h-64 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-4 gap-3">
            {giftTypes.map((gift) => {
              const canAfford = userCoinBalance >= gift.coin_cost;
              const isSelected = selectedGift?.id === gift.id;
              return (
                <button
                  key={gift.id}
                  onClick={() => canAfford && setSelectedGift(gift)}
                  disabled={!canAfford}
                  className={`relative flex flex-col items-center p-3 rounded-2xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 scale-105 shadow-lg ring-2 ring-purple-400 dark:ring-purple-500'
                      : canAfford
                        ? 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105 hover:shadow-md active:scale-95'
                        : 'bg-gray-50/50 dark:bg-gray-800/30 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className={`text-3xl mb-1 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`}>
                    {gift.icon_url ? (
                      <img src={gift.icon_url} alt={gift.name} className="w-10 h-10 drop-shadow-md" />
                    ) : (
                      gift.emoji || getGiftEmoji(gift.name)
                    )}
                  </span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{gift.coin_cost}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Gift & Send - Premium Footer */}
        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-900/80 border-t border-gray-200 dark:border-gray-800">
          {selectedGift ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 flex items-center justify-center">
                  <span className="text-2xl">
                    {selectedGift.icon_url ? (
                      <img src={selectedGift.icon_url} alt={selectedGift.name} className="w-8 h-8" />
                    ) : (
                      selectedGift.emoji || getGiftEmoji(selectedGift.name)
                    )}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{selectedGift.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedGift.coin_cost} coins → 💎 {selectedGift.coin_cost}</p>
                </div>
              </div>
              <button
                onClick={handleSendGift}
                disabled={loading || userCoinBalance < selectedGift.coin_cost}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-center text-gray-400 dark:text-gray-500 py-2">Tap a gift to select</p>
          )}
        </div>
      </div>
    </div>
  );
}

