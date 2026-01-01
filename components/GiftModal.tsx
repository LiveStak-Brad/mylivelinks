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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card/95 backdrop-blur-md rounded-2xl max-w-sm w-full mx-4 shadow-2xl overflow-hidden flex flex-col modal-fullscreen-mobile border border-border" onClick={(e) => e.stopPropagation()}>
        {/* Header with vector icon */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Send Gift</h2>
              <p className="text-xs text-muted-foreground">to {recipientUsername}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance bar */}
        <div className="px-4 py-2 bg-yellow-500/10 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Your Balance</span>
          <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{userCoinBalance.toLocaleString()} 💰</span>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Gift Grid - Compact */}
        <div className="p-3 max-h-52 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-5 gap-1.5">
            {giftTypes.map((gift) => {
              const canAfford = userCoinBalance >= gift.coin_cost;
              const isSelected = selectedGift?.id === gift.id;
              return (
                <button
                  key={gift.id}
                  onClick={() => canAfford && setSelectedGift(gift)}
                  disabled={!canAfford}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all duration-150 ${
                    isSelected
                      ? 'bg-primary/15 scale-110 shadow-lg ring-2 ring-primary/50'
                      : canAfford
                        ? 'hover:bg-muted/60 hover:scale-105 active:scale-95'
                        : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className={`text-2xl transition-transform ${isSelected ? 'scale-125' : ''}`}>
                    {gift.icon_url ? (
                      <img src={gift.icon_url} alt={gift.name} className="w-7 h-7" />
                    ) : (
                      gift.emoji || getGiftEmoji(gift.name)
                    )}
                  </span>
                  <span className="text-[9px] font-medium text-muted-foreground mt-0.5">{gift.coin_cost}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Gift & Send */}
        <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
          {selectedGift ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xl flex-shrink-0">
                  {selectedGift.icon_url ? (
                    <img src={selectedGift.icon_url} alt={selectedGift.name} className="w-6 h-6" />
                  ) : (
                    selectedGift.emoji || getGiftEmoji(selectedGift.name)
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{selectedGift.name}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedGift.coin_cost} coins</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="p-2 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition active:scale-95"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSendGift}
                  disabled={loading || userCoinBalance < selectedGift.coin_cost}
                  className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition active:scale-95"
                  title="Send Gift"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-[10px] text-muted-foreground">Tap a gift to select</p>
          )}
        </div>
      </div>
    </div>
  );
}

