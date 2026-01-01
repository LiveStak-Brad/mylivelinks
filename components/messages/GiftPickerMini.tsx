'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
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
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-slide-up z-50 min-w-[320px] max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div>
          <h4 className="font-semibold text-sm text-foreground">Send a Gift</h4>
          <p className="text-xs text-muted-foreground">to {recipientUsername}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
            💰 {userCoinBalance.toLocaleString()}
          </span>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gift Grid */}
      <div className="p-3 max-h-48 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : giftTypes.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">No gifts available</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {giftTypes.map(gift => {
              const canAfford = userCoinBalance >= gift.coin_cost;
              const isSelected = selectedGift?.id === gift.id;

              return (
                <button
                  key={gift.id}
                  onClick={() => canAfford && setSelectedGift(gift)}
                  disabled={!canAfford}
                  className={`p-2 rounded-lg border-2 transition ${
                    isSelected
                      ? 'border-primary bg-primary/10 scale-105'
                      : canAfford
                        ? 'border-border hover:border-primary/50 hover:bg-muted/50'
                        : 'border-border/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-2xl mb-1 text-center">
                    {gift.icon_url ? (
                      <img src={gift.icon_url} alt={gift.name} className="w-8 h-8 mx-auto" />
                    ) : (
                      gift.emoji || getGiftEmoji(gift.name)
                    )}
                  </div>
                  <p className="text-[10px] font-medium text-foreground truncate text-center">{gift.name}</p>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold text-center">
                    {gift.coin_cost} 💰
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Gift Preview & Send Button */}
      {selectedGift && (
        <div className="px-4 py-3 border-t border-border bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            <span className="text-xl">
              {selectedGift.icon_url ? (
                <img src={selectedGift.icon_url} alt={selectedGift.name} className="w-6 h-6" />
              ) : (
                selectedGift.emoji || getGiftEmoji(selectedGift.name)
              )}
            </span>
              <div>
                <p className="text-xs font-medium text-foreground">{selectedGift.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedGift.coin_cost} 💎 to recipient
                </p>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition shadow-md"
            >
              Send {selectedGift.coin_cost} 💰
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

