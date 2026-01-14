import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WatchGiftModalProps {
  visible: boolean;
  onClose: () => void;
  recipientUsername: string;
  recipientDisplayName: string;
  recipientAvatarUrl: string | null;
  isLive: boolean;
}

const PLACEHOLDER_GIFTS = [
  { id: 'rose', name: 'Rose', emoji: '🌹', coins: 1 },
  { id: 'heart', name: 'Heart', emoji: '❤️', coins: 5 },
  { id: 'star', name: 'Star', emoji: '⭐', coins: 10 },
  { id: 'fire', name: 'Fire', emoji: '🔥', coins: 50 },
  { id: 'diamond', name: 'Diamond', emoji: '💎', coins: 100 },
  { id: 'crown', name: 'Crown', emoji: '👑', coins: 500 },
];

/**
 * Gift modal for Watch feed items.
 * Placeholder v1 - shows recipient info + gift grid.
 */
export default function WatchGiftModal({
  visible,
  onClose,
  recipientUsername,
  recipientDisplayName,
  recipientAvatarUrl,
  isLive,
}: WatchGiftModalProps) {
  const handleGiftSelect = (giftId: string) => {
    // TODO: Wire to gift sending RPC when ready
    console.log('[WatchGiftModal] Gift selected:', { giftId, recipientUsername });
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
            <View style={styles.giftGrid}>
              {PLACEHOLDER_GIFTS.map((gift) => (
                <Pressable
                  key={gift.id}
                  style={({ pressed }) => [
                    styles.giftItem,
                    pressed && styles.giftItemPressed,
                  ]}
                  onPress={() => handleGiftSelect(gift.id)}
                >
                  <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                  <Text style={styles.giftName}>{gift.name}</Text>
                  <View style={styles.giftCoinRow}>
                    <Ionicons name="logo-bitcoin" size={12} color="#FBBF24" />
                    <Text style={styles.giftCoins}>{gift.coins}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Coming Soon Notice */}
            <View style={styles.comingSoonNotice}>
              <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
              <Text style={styles.comingSoonText}>
                Full gifting system coming soon! Your coins will be charged when sending.
              </Text>
            </View>
          </ScrollView>

          {/* Coin Balance Placeholder */}
          <View style={styles.balanceSection}>
            <View style={styles.balanceRow}>
              <Ionicons name="wallet-outline" size={20} color="#FBBF24" />
              <Text style={styles.balanceLabel}>Your Balance:</Text>
              <Text style={styles.balanceAmount}>0 coins</Text>
            </View>
            <Pressable style={styles.rechargeButton}>
              <Text style={styles.rechargeButtonText}>Get Coins</Text>
            </Pressable>
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
  giftItemPressed: {
    backgroundColor: '#4B5563',
    transform: [{ scale: 0.95 }],
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
  comingSoonNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#374151',
    borderRadius: 8,
    gap: 8,
  },
  comingSoonText: {
    flex: 1,
    fontSize: 12,
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
  rechargeButton: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rechargeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
