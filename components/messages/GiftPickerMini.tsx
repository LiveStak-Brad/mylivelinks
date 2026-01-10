'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Gift, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface GiftType {
  id: number;
  name: string;
  coin_cost: number;
  icon_url?: string;
  emoji?: string;
}

interface GiftPickerMiniProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGift: (gift: GiftType) => void;
  recipientUsername: string;
}

// Map gift names to emojis
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

export default function GiftPickerMini({ isOpen, onClose, onSelectGift, recipientUsername }: GiftPickerMiniProps) {
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [userCoinBalance, setUserCoinBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Redirect to wallet if user has 0 coins
  useEffect(() => {
    if (isOpen && userCoinBalance === 0) {
      onClose();
      window.location.href = '/wallet';
    }
  }, [isOpen, userCoinBalance, onClose]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load gift types
      const { data: gifts } = await supabase
        .from('gift_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (gifts) {
        setGiftTypes(gifts);
      }

      // Load user balance
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('coin_balance')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserCoinBalance(profile.coin_balance || 0);
        }
      }
    } catch (error) {
      console.error('[GiftPicker] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedGift) {
      onSelectGift(selectedGift);
      setSelectedGift(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden" style={{ zIndex: 99999 }}>
      {/* Header - Compact with vector icon */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-foreground">Send Gift</h4>
            <p className="text-[10px] text-muted-foreground">to {recipientUsername}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            {userCoinBalance.toLocaleString()} 💰
          </span>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gift Grid - Compact items */}
      <div className="p-2 max-h-40 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : giftTypes.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">No gifts available</p>
        ) : (
          <div className="grid grid-cols-5 gap-1">
            {giftTypes.map(gift => {
              const canAfford = userCoinBalance >= gift.coin_cost;
              const isSelected = selectedGift?.id === gift.id;

              return (
                <button
                  key={gift.id}
                  onClick={() => canAfford && setSelectedGift(gift)}
                  disabled={!canAfford}
                  className={`flex flex-col items-center p-1.5 rounded-xl transition-all duration-150 ${
                    isSelected
                      ? 'bg-primary/15 scale-110 shadow-lg ring-2 ring-primary/50'
                      : canAfford
                        ? 'hover:bg-muted/60 hover:scale-105 active:scale-95'
                        : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className={`text-xl transition-transform ${isSelected ? 'scale-125' : ''}`}>
                    {gift.icon_url ? (
                      <img src={gift.icon_url} alt={gift.name} className="w-6 h-6" />
                    ) : (
                      gift.emoji || getGiftEmoji(gift.name)
                    )}
                  </span>
                  <span className="text-[8px] font-medium text-muted-foreground mt-0.5">
                    {gift.coin_cost}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Gift - Compact send bar */}
      {selectedGift && (
        <div className="px-2 py-1.5 border-t border-border/50 bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg flex-shrink-0">
                {selectedGift.icon_url ? (
                  <img src={selectedGift.icon_url} alt={selectedGift.name} className="w-5 h-5" />
                ) : (
                  selectedGift.emoji || getGiftEmoji(selectedGift.name)
                )}
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-medium text-foreground truncate block">{selectedGift.name}</span>
                <span className="text-[9px] text-muted-foreground">{selectedGift.coin_cost} coins</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition active:scale-95"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleConfirm}
                className="p-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-md transition active:scale-95"
                title="Send Gift"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

