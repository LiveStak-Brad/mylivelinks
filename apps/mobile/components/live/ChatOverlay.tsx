import React, { useRef, useEffect } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ChatMessage {
  id: string;
  type: 'chat' | 'gift' | 'follow' | 'system';
  username: string;
  text: string;
  avatarUrl?: string;
  giftAmount?: number;
  // User's chosen chat color from chat_settings (web parity)
  chatColor?: string;
  // Gifter status for showing badge (matches web gifter-tiers.ts)
  gifterTierKey?: string;
  gifterLevelInTier?: number;
  lifetimeCoins?: number; // For checking if badge should show
  // Pro badge
  isPro?: boolean;
}

// Gifter tier configuration (matches web lib/gifter-tiers.ts exactly)
export interface GifterTier {
  key: string;
  name: string;
  color: string;
  icon: string;
  minCoins: number;
  maxCoins: number | null;
}

export const GIFTER_TIERS: GifterTier[] = [
  { key: 'starter', name: 'Starter', color: '#9CA3AF', icon: '🌱', minCoins: 0, maxCoins: 59_999 },
  { key: 'supporter', name: 'Supporter', color: '#CD7F32', icon: '🤝', minCoins: 60_000, maxCoins: 299_999 },
  { key: 'contributor', name: 'Contributor', color: '#C0C0C0', icon: '⭐', minCoins: 300_000, maxCoins: 899_999 },
  { key: 'elite', name: 'Elite', color: '#D4AF37', icon: '👑', minCoins: 900_000, maxCoins: 2_399_999 },
  { key: 'patron', name: 'Patron', color: '#22C55E', icon: '🏆', minCoins: 2_400_000, maxCoins: 5_999_999 },
  { key: 'power', name: 'Power', color: '#3B82F6', icon: '⚡', minCoins: 6_000_000, maxCoins: 14_999_999 },
  { key: 'vip', name: 'VIP', color: '#EF4444', icon: '🔥', minCoins: 15_000_000, maxCoins: 29_999_999 },
  { key: 'legend', name: 'Legend', color: '#A855F7', icon: '🌟', minCoins: 30_000_000, maxCoins: 44_999_999 },
  { key: 'mythic', name: 'Mythic', color: '#111827', icon: '🔮', minCoins: 45_000_000, maxCoins: 59_999_999 },
  { key: 'diamond', name: 'Diamond', color: '#22D3EE', icon: '💎', minCoins: 60_000_000, maxCoins: null },
];

export function getTierByKey(key: string): GifterTier | undefined {
  return GIFTER_TIERS.find((t) => t.key === key);
}

// Get tier and level from lifetime coins (matches web lib/gifter-status.ts logic)
export function getGifterTierFromCoins(lifetimeCoins: number): { tierKey: string; levelInTier: number } {
  const coins = Math.max(0, Math.floor(lifetimeCoins || 0));
  
  // Find the tier based on lifetime coins
  let tier = GIFTER_TIERS[0];
  for (const t of GIFTER_TIERS) {
    if (t.maxCoins === null) {
      // Diamond tier (no max)
      if (coins >= t.minCoins) tier = t;
      break;
    }
    if (coins >= t.minCoins && coins <= t.maxCoins) {
      tier = t;
      break;
    }
  }
  
  // Calculate level within tier (simplified - 50 levels per tier, linear distribution)
  const tierRange = tier.maxCoins === null ? 10_000_000 : (tier.maxCoins - tier.minCoins + 1);
  const coinsInTier = coins - tier.minCoins;
  const levelInTier = Math.min(50, Math.max(1, Math.floor((coinsInTier / tierRange) * 50) + 1));
  
  return { tierKey: tier.key, levelInTier };
}

// Approved bright font colors palette
export const CHAT_FONT_COLORS = [
  '#FFFFFF', // White (default)
  '#FFD400', // Yellow
  '#00E5FF', // Cyan
  '#FF4DFF', // Magenta
  '#7CFF00', // Lime
  '#FF8A00', // Orange
  '#6EA8FF', // Light Blue
  '#B86BFF', // Bright Purple
] as const;

export type ChatFontColor = typeof CHAT_FONT_COLORS[number];

interface ChatOverlayProps {
  messages: ChatMessage[];
  fontColor?: ChatFontColor;
}

const PLACEHOLDER_AVATAR = 'https://via.placeholder.com/28/6366F1/FFFFFF?text=?';

export default function ChatOverlay({ messages, fontColor = '#FFFFFF' }: ChatOverlayProps) {
  const flatListRef = useRef<FlatList>(null);

  // No need for auto-scroll since we use inverted list (new messages appear at bottom automatically)

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // Use user's chosen chat color, fall back to default fontColor
    const textColor = item.chatColor || fontColor;
    
    // Get gifter tier for badge (matches web - show if lifetime_coins > 0)
    const tier = item.gifterTierKey ? getTierByKey(item.gifterTierKey) : undefined;
    const showGifterBadge = tier && (item.lifetimeCoins ?? 0) > 0;
    
    switch (item.type) {
      case 'gift':
        return (
          <View style={styles.messageRow}>
            <Image
              source={{ uri: item.avatarUrl || PLACEHOLDER_AVATAR }}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View style={styles.messageContent}>
              <View style={styles.usernameRow}>
                <Text style={[styles.username, { color: textColor }]} numberOfLines={1}>
                  {item.username}
                </Text>
                {/* Gifter badge (web parity - pill with icon + level) */}
                {showGifterBadge && tier && (
                  <View style={[
                    styles.gifterBadgePill,
                    { 
                      backgroundColor: `${tier.color}30`,
                      borderColor: `${tier.color}60`,
                    }
                  ]}>
                    <Text style={styles.gifterBadgeIcon}>{tier.icon}</Text>
                    {item.gifterLevelInTier && (
                      <Text style={[styles.gifterBadgeLevel, { color: tier.color }]}>
                        {item.gifterLevelInTier}
                      </Text>
                    )}
                  </View>
                )}
                {/* Pro badge */}
                {item.isPro && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
                <View style={styles.giftBadge}>
                  <Ionicons name="gift" size={10} color="#FFD700" />
                  <Text style={styles.giftAmount}>{item.giftAmount}</Text>
                </View>
              </View>
              <Text style={[styles.messageText, { color: textColor }]} numberOfLines={2}>
                {item.text}
              </Text>
            </View>
          </View>
        );
        
      case 'follow':
        return (
          <View style={styles.messageRow}>
            <Image
              source={{ uri: item.avatarUrl || PLACEHOLDER_AVATAR }}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View style={styles.messageContent}>
              <View style={styles.usernameRow}>
                <Text style={[styles.username, { color: textColor }]} numberOfLines={1}>
                  {item.username}
                </Text>
                <Ionicons name="person-add" size={10} color={textColor} style={{ marginLeft: 4, opacity: 0.7 }} />
              </View>
              <Text style={[styles.messageText, { color: textColor, opacity: 0.8 }]} numberOfLines={1}>
                followed you
              </Text>
            </View>
          </View>
        );
        
      case 'system':
        return (
          <View style={styles.systemRow}>
            <Ionicons name="information-circle-outline" size={12} color={textColor} style={{ opacity: 0.5 }} />
            <Text style={[styles.systemText, { color: textColor }]} numberOfLines={1}>
              {item.text}
            </Text>
          </View>
        );
        
      default:
        // Regular chat message
        return (
          <View style={styles.messageRow}>
            <Image
              source={{ uri: item.avatarUrl || PLACEHOLDER_AVATAR }}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View style={styles.messageContent}>
              <View style={styles.usernameRow}>
                <Text style={[styles.username, { color: textColor }]} numberOfLines={1}>
                  {item.username}
                </Text>
                {/* Gifter badge (web parity - pill with icon + level) */}
                {showGifterBadge && tier && (
                  <View style={[
                    styles.gifterBadgePill,
                    { 
                      backgroundColor: `${tier.color}30`,
                      borderColor: `${tier.color}60`,
                    }
                  ]}>
                    <Text style={styles.gifterBadgeIcon}>{tier.icon}</Text>
                    {item.gifterLevelInTier && (
                      <Text style={[styles.gifterBadgeLevel, { color: tier.color }]}>
                        {item.gifterLevelInTier}
                      </Text>
                    )}
                  </View>
                )}
                {/* Pro badge */}
                {item.isPro && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.messageText, { color: textColor }]} numberOfLines={2}>
                {item.text}
              </Text>
            </View>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        inverted
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
  },
  listContent: {
    paddingVertical: 4,
    gap: 4, // Compact spacing
  },
  
  // NEW SPEC: Compact message row with avatar
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
    // NO background - transparent
  },
  
  // 1:1 square avatar (24-28px target)
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  
  messageContent: {
    flex: 1,
    justifyContent: 'center',
  },
  
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  username: {
    fontSize: 12,
    fontWeight: '700',
    // color applied dynamically via fontColor prop
  },
  
  messageText: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 1,
    // color applied dynamically via fontColor prop
  },
  
  // Gifter badge pill (matches web GifterBadge component)
  gifterBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 4,
    gap: 2,
  },
  gifterBadgeIcon: {
    fontSize: 9,
  },
  gifterBadgeLevel: {
    fontSize: 9,
    fontWeight: '700',
  },
  
  // Pro badge
  proBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 4,
  },
  proBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  
  // Gift badge (small inline indicator)
  giftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    gap: 2,
  },
  giftAmount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFD700',
  },
  
  // System message (compact, no avatar)
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingLeft: 34, // Align with message text (avatar width + margin)
    gap: 4,
  },
  systemText: {
    fontSize: 11,
    fontStyle: 'italic',
    opacity: 0.6,
  },
});
