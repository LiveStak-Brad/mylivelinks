import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

export type GiftOverlayData = {
  id: string;
  giftName: string;
  giftIconUrl?: string | null;
  senderUsername?: string | null;
  coinAmount?: number | null;
};

interface GiftOverlayProps {
  gifts: GiftOverlayData[];
  onComplete: (giftId: string) => void;
}

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

function GiftOverlayItem({ gift, onComplete }: { gift: GiftOverlayData; onComplete: (giftId: string) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  const displayText = useMemo(() => {
    const sender = gift.senderUsername ? `${gift.senderUsername} sent` : 'Sent';
    return `${sender} ${gift.giftName}`;
  }, [gift.senderUsername, gift.giftName]);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.delay(1800),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 220, useNativeDriver: true }),
      ]),
    ]).start(() => onComplete(gift.id));
  }, [gift.id, onComplete, opacity, scale]);

  return (
    <Animated.View style={[styles.overlayItem, { opacity, transform: [{ scale }] }]}>
      {gift.giftIconUrl ? (
        <Image source={{ uri: gift.giftIconUrl }} style={styles.icon} />
      ) : (
        <Text style={styles.emoji}>{getGiftEmoji(gift.giftName)}</Text>
      )}
      <View style={styles.textWrap}>
        <Text style={styles.title}>{displayText}</Text>
        <Text style={styles.subtitle}>
          {gift.giftName}
          {typeof gift.coinAmount === 'number' ? ` +${gift.coinAmount}` : ''}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function GiftOverlay({ gifts, onComplete }: GiftOverlayProps) {
  if (!gifts.length) return null;
  return (
    <View pointerEvents="none" style={styles.container}>
      {gifts.map((gift) => (
        <GiftOverlayItem key={gift.id} gift={gift} onComplete={onComplete} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 50,
    elevation: 50,
  },
  overlayItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  icon: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 6,
  },
  textWrap: {
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
