import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface GiftType {
  id: number;
  name: string;
  coin_cost: number;
  icon_url?: string;
  emoji?: string;
  tier: number;
}

interface WatchGiftModalProps {
  visible: boolean;
  onClose: () => void;
  recipientId: string;
  recipientUsername: string;
  recipientDisplayName: string;
  recipientAvatarUrl: string | null;
  postId?: string | null;
  isLive: boolean;
  liveStreamId?: number | null;
}

// Map gift names to emojis
const getGiftEmoji = (name: string): string => {
  const emojiMap: { [key: string]: string } = {
    'Poo': '💩', 'Rose': '🌹', 'Heart': '❤️', 'Star': '⭐',
    'Diamond': '💎', 'Super Star': '🌟', 'Crown': '👑',
    'Platinum': '💠', 'Legendary': '🏆', 'Fire': '🔥',
    'Rocket': '🚀', 'Rainbow': '🌈', 'Unicorn': '🦄',
    'Party': '🎉', 'Confetti': '🎊', 'Champagne': '🍾',
    'Money': '💰', 'Cash': '💵', 'Gold': '🥇',
    'Kiss': '💋', 'Hug': '🤗', 'Love': '💕',
  };
  return emojiMap[name] || '🎁';
};

const isTestGiftName = (name: string) => name.trim().toLowerCase() === 'mylivelinks';

/**
 * Gift modal for Watch feed items.
 * Fetches real gift types and sends gifts via API.
 */
export default function WatchGiftModal({
  visible,
  onClose,
  recipientId,
  recipientUsername,
  recipientDisplayName,
  recipientAvatarUrl,
  postId,
  isLive,
  liveStreamId,
}: WatchGiftModalProps) {
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [userCoinBalance, setUserCoinBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadGiftTypes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gift_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (!error && data) {
        const sorted = [...data].sort((a: any, b: any) => {
          const costA = Number(a?.coin_cost ?? 0);
          const costB = Number(b?.coin_cost ?? 0);
          if (costA !== costB) return costA - costB;
          const orderA = Number(a?.display_order ?? 0);
          const orderB = Number(b?.display_order ?? 0);
          if (orderA !== orderB) return orderA - orderB;
          return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
        });
        setGiftTypes(sorted);
      }
    } catch (err) {
      console.error('[WatchGiftModal] Error loading gift types:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserBalance = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setUserCoinBalance((data as any).coin_balance || 0);
      }
    } catch (err) {
      console.error('[WatchGiftModal] Error loading balance:', err);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadGiftTypes();
      loadUserBalance();
      setSelectedGift(null);
    }
  }, [visible, loadGiftTypes, loadUserBalance]);

  const handleGiftSelect = (gift: GiftType) => {
    setSelectedGift(gift);
  };

  const handleSendGift = async () => {
    if (!selectedGift || sending) return;

    if (userCoinBalance < selectedGift.coin_cost) {
      Alert.alert('Insufficient Balance', 'You need more coins to send this gift.');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be logged in to send gifts.');
        return;
      }

      const response = await fetch('https://www.mylivelinks.com/api/gifts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          toUserId: recipientId,
          coinsAmount: selectedGift.coin_cost,
          giftTypeId: selectedGift.id,
          streamId: liveStreamId || null,
          requestId: `mobile-${Date.now()}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send gift');
      }

      // Update balance
      if (data.senderBalance) {
        setUserCoinBalance(data.senderBalance.coins);
      } else {
        await loadUserBalance();
      }

      // If this is a post gift, create a comment
      if (postId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('post_comments').insert({
            post_id: postId,
            author_id: user.id,
            text_content: `🎁 Sent a ${selectedGift.name} (${selectedGift.coin_cost} coins)`,
          });
        }
      }

      Alert.alert('Gift Sent!', `You sent a ${selectedGift.name} to @${recipientUsername}`);
      setSelectedGift(null);
      onClose();
    } catch (err) {
      console.error('[WatchGiftModal] Error sending gift:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Send Gift</Text>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close gift modal"
            >
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* Recipient Info */}
          <View style={styles.recipientSection}>
            <View style={styles.avatarContainer}>
              {recipientAvatarUrl ? (
                <Image source={{ uri: recipientAvatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={24} color="#6B7280" />
                </View>
              )}
              {isLive && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              )}
            </View>
            <View style={styles.recipientInfo}>
              <Text style={styles.recipientName}>{recipientDisplayName}</Text>
              <Text style={styles.recipientUsername}>@{recipientUsername}</Text>
            </View>
          </View>

          {/* Gift Grid */}
          <ScrollView style={styles.giftScrollView} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EC4899" />
                <Text style={styles.loadingText}>Loading gifts...</Text>
              </View>
            ) : (
              <View style={styles.giftGrid}>
                {giftTypes.map((gift) => {
                  const isSelected = selectedGift?.id === gift.id;
                  const canAfford = userCoinBalance >= gift.coin_cost;
                  const isTestGift = isTestGiftName(gift.name || '');
                  return (
                    <Pressable
                      key={gift.id}
                      style={[
                        styles.giftItem,
                        isSelected && styles.giftItemSelected,
                        !canAfford && styles.giftItemDisabled,
                      ]}
                      onPress={() => handleGiftSelect(gift)}
                      disabled={!canAfford}
                    >
                      {gift.icon_url ? (
                        <Image
                          source={{ uri: gift.icon_url }}
                          style={[styles.giftIcon, isTestGift && styles.giftIconLarge]}
                        />
                      ) : (
                        <Text style={styles.giftEmoji}>{getGiftEmoji(gift.name)}</Text>
                      )}
                      <Text style={[styles.giftName, !canAfford && styles.giftNameDisabled]}>
                        {gift.name}
                      </Text>
                      <View style={styles.giftCoinRow}>
                        <Ionicons name="logo-bitcoin" size={12} color={canAfford ? "#FBBF24" : "#6B7280"} />
                        <Text style={[styles.giftCoins, !canAfford && styles.giftCoinsDisabled]}>
                          {gift.coin_cost}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Balance + Send Button */}
          <View style={styles.balanceSection}>
            <View style={styles.balanceRow}>
              <Ionicons name="wallet-outline" size={20} color="#FBBF24" />
              <Text style={styles.balanceLabel}>Balance:</Text>
              <Text style={styles.balanceAmount}>{userCoinBalance} coins</Text>
            </View>
            {selectedGift ? (
              <Pressable
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSendGift}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendButtonText}>
                    Send {selectedGift.name} ({selectedGift.coin_cost})
                  </Text>
                )}
              </Pressable>
            ) : (
              <Text style={styles.selectHint}>Select a gift to send</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#4B5563',
    borderRadius: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  recipientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  liveBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  recipientInfo: {
    marginLeft: 12,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recipientUsername: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  giftScrollView: {
    maxHeight: 280,
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  giftItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  giftItemSelected: {
    backgroundColor: '#EC4899',
    borderWidth: 2,
    borderColor: '#F472B6',
  },
  giftItemDisabled: {
    opacity: 0.4,
  },
  giftIcon: {
    width: 36,
    height: 36,
    marginBottom: 6,
    resizeMode: 'contain',
  },
  giftIconLarge: {
    width: 48,
    height: 48,
  },
  giftEmoji: {
    fontSize: 32,
  },
  giftName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 4,
  },
  giftCoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  giftCoins: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FBBF24',
  },
  giftNameDisabled: {
    color: '#6B7280',
  },
  giftCoinsDisabled: {
    color: '#6B7280',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  balanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBBF24',
  },
  sendButton: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectHint: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
