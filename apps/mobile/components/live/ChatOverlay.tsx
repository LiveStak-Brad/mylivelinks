import React, { useRef, useEffect } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MllProBadge from '../shared/MllProBadge';
import TopLeaderBadge from '../shared/TopLeaderBadge';
import { useTopLeaders, getLeaderType } from '../../hooks/useTopLeaders';

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

// Gifter tier configuration (matches web lib/gifter-status.ts exactly)
interface TierDef {
  key: string;
  name: string;
  color: string;
  icon: string;
  start: number;
  end: number | null;
  growth: number;
  levelCount: number | null;
}

const DIAMOND_UNLOCK_COINS = 60_000_000;
const DIAMOND_BASE_COST = 3_000_000;
const DIAMOND_GROWTH = 1.45;

const TIERS: TierDef[] = [
  { key: 'starter', name: 'Starter', color: '#9CA3AF', icon: '🌱', start: 0, end: 60_000, growth: 1.1, levelCount: 50 },
  { key: 'supporter', name: 'Supporter', color: '#CD7F32', icon: '🤝', start: 60_000, end: 300_000, growth: 1.12, levelCount: 50 },
  { key: 'contributor', name: 'Contributor', color: '#C0C0C0', icon: '⭐', start: 300_000, end: 900_000, growth: 1.15, levelCount: 50 },
  { key: 'elite', name: 'Elite', color: '#D4AF37', icon: '👑', start: 900_000, end: 2_400_000, growth: 1.18, levelCount: 50 },
  { key: 'patron', name: 'Patron', color: '#22C55E', icon: '🏆', start: 2_400_000, end: 6_000_000, growth: 1.22, levelCount: 50 },
  { key: 'power', name: 'Power', color: '#3B82F6', icon: '⚡', start: 6_000_000, end: 15_000_000, growth: 1.26, levelCount: 50 },
  { key: 'vip', name: 'VIP', color: '#EF4444', icon: '🔥', start: 15_000_000, end: 30_000_000, growth: 1.3, levelCount: 50 },
  { key: 'legend', name: 'Legend', color: '#A855F7', icon: '🌟', start: 30_000_000, end: 45_000_000, growth: 1.35, levelCount: 50 },
  { key: 'mythic', name: 'Mythic', color: '#111827', icon: '🔮', start: 45_000_000, end: 60_000_000, growth: 1.4, levelCount: 50 },
  { key: 'diamond', name: 'Diamond', color: '#22D3EE', icon: '💎', start: 60_000_000, end: null, growth: DIAMOND_GROWTH, levelCount: null },
];

// Legacy interface for getTierByKey
export interface GifterTier {
  key: string;
  name: string;
  color: string;
  icon: string;
  minCoins: number;
  maxCoins: number | null;
}

export const GIFTER_TIERS: GifterTier[] = TIERS.map((t) => ({
  key: t.key,
  name: t.name,
  color: t.color,
  icon: t.icon,
  minCoins: t.start,
  maxCoins: t.end,
}));

export function getTierByKey(key: string): GifterTier | undefined {
  return GIFTER_TIERS.find((t) => t.key === key);
}

// Compute tier boundaries with exponential growth (matches web exactly)
function computeTierBoundaries(start: number, end: number, growth: number, levelCount: number): number[] {
  const totalSpan = end - start;
  if (totalSpan <= 0) return [start, end];

  const weights: number[] = [];
  let sumW = 0;
  for (let i = 0; i < levelCount; i++) {
    const w = Math.pow(growth, i);
    weights.push(w);
    sumW += w;
  }

  const increments: number[] = [];
  let used = 0;
  for (let i = 0; i < levelCount; i++) {
    if (i === levelCount - 1) {
      increments.push(totalSpan - used);
    } else {
      const inc = Math.floor((totalSpan * weights[i]) / sumW);
      increments.push(inc);
      used += inc;
    }
  }

  const boundaries: number[] = [start];
  let cur = start;
  for (let i = 0; i < levelCount; i++) {
    cur += increments[i];
    boundaries.push(cur);
  }

  boundaries[boundaries.length - 1] = end;
  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] < boundaries[i - 1]) boundaries[i] = boundaries[i - 1];
  }

  return boundaries;
}

// Find level within tier boundaries using binary search (matches web exactly)
function findLevelInBoundaries(coins: number, boundaries: number[]): number {
  let lo = 0;
  let hi = boundaries.length - 2;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const a = boundaries[mid];
    const b = boundaries[mid + 1];
    if (coins < a) {
      hi = mid - 1;
    } else if (coins >= b) {
      lo = mid + 1;
    } else {
      return mid + 1;
    }
  }
  return Math.max(1, Math.min(boundaries.length - 1, lo + 1));
}

// Diamond level calculation (matches web exactly)
function diamondCost(step: number): number {
  return Math.floor(DIAMOND_BASE_COST * Math.pow(DIAMOND_GROWTH, step - 1));
}

function computeDiamond(coins: number) {
  let level = 1;
  let levelStart = DIAMOND_UNLOCK_COINS;
  let next = DIAMOND_UNLOCK_COINS + diamondCost(1);

  while (coins >= next) {
    level += 1;
    levelStart = next;
    next = next + diamondCost(level);
  }

  return { level, levelStart, nextLevel: next };
}

// Get tier and level from lifetime coins (matches web lib/gifter-status.ts exactly)
export function getGifterTierFromCoins(lifetimeCoins: number): { tierKey: string; levelInTier: number } {
  const lifetime = Math.max(0, Math.floor(lifetimeCoins || 0));
  const isDiamond = lifetime >= DIAMOND_UNLOCK_COINS;

  // Find tier
  const tier = (() => {
    if (isDiamond) {
      return TIERS.find((t) => t.key === 'diamond')!;
    }

    for (const t of TIERS) {
      if (t.end === null) continue;
      if (lifetime >= t.start && lifetime < t.end) return t;
    }

    return TIERS[0];
  })();

  // Calculate level within tier
  let levelInTier = 1;

  if (isDiamond) {
    const d = computeDiamond(lifetime);
    levelInTier = d.level;
  } else {
    const boundaries = computeTierBoundaries(tier.start, tier.end!, tier.growth, 50);
    levelInTier = findLevelInBoundaries(lifetime, boundaries);
  }

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
export type ChatSize = 'small' | 'medium' | 'large';

interface ChatOverlayProps {
  messages: ChatMessage[];
  fontColor?: ChatFontColor;
  chatSize?: ChatSize;
  mutedWords?: string[];
}

const PLACEHOLDER_AVATAR = 'https://via.placeholder.com/28/6366F1/FFFFFF?text=?';

export default function ChatOverlay({
  messages,
  fontColor = '#FFFFFF',
  chatSize = 'medium',
  mutedWords = [],
}: ChatOverlayProps) {
  const flatListRef = useRef<FlatList>(null);

  // No need for auto-scroll since we use inverted list (new messages appear at bottom automatically)

  const safeMutedWords = Array.from(new Set(mutedWords.map((w) => String(w || '').trim()).filter(Boolean)));

  const maskMutedWords = (text: string) => {
    if (!safeMutedWords.length) return text;
    let out = text;
    for (const w of safeMutedWords) {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'gi');
      out = out.replace(re, (m) => '*'.repeat(m.length));
    }
    return out;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // Use user's chosen chat color, fall back to default fontColor
    const textColor = item.chatColor || fontColor;
    const safeText = maskMutedWords(item.text);
    
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
                <Text style={[styles.username, fontSizeStyles.username[chatSize], { color: textColor }]} numberOfLines={1}>
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
                {item.isPro && <MllProBadge size="sm" />}
                <View style={styles.giftBadge}>
                  <Ionicons name="gift" size={10} color="#FFD700" />
                  <Text style={styles.giftAmount}>{item.giftAmount}</Text>
                </View>
              </View>
              <Text style={[styles.messageText, fontSizeStyles.message[chatSize], { color: textColor }]} numberOfLines={2}>
                {safeText}
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
                <Text style={[styles.username, fontSizeStyles.username[chatSize], { color: textColor }]} numberOfLines={1}>
                  {item.username}
                </Text>
                <Ionicons name="person-add" size={10} color={textColor} style={{ marginLeft: 4, opacity: 0.7 }} />
              </View>
              <Text style={[styles.messageText, fontSizeStyles.message[chatSize], { color: textColor, opacity: 0.8 }]} numberOfLines={1}>
                followed you
              </Text>
            </View>
          </View>
        );
        
      case 'system':
        return (
          <View style={styles.systemRow}>
            <Ionicons name="information-circle-outline" size={12} color={textColor} style={{ opacity: 0.5 }} />
            <Text style={[styles.systemText, fontSizeStyles.system[chatSize], { color: textColor }]} numberOfLines={1}>
              {safeText}
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
                <Text style={[styles.username, fontSizeStyles.username[chatSize], { color: textColor }]} numberOfLines={1}>
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
                {item.isPro && <MllProBadge size="sm" />}
              </View>
              <Text style={[styles.messageText, fontSizeStyles.message[chatSize], { color: textColor }]} numberOfLines={2}>
                {safeText}
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

const fontSizeStyles = {
  username: {
    small: { fontSize: 11 },
    medium: { fontSize: 12 },
    large: { fontSize: 13 },
  } as const,
  message: {
    small: { fontSize: 12, lineHeight: 16 },
    medium: { fontSize: 13, lineHeight: 17 },
    large: { fontSize: 15, lineHeight: 19 },
  } as const,
  system: {
    small: { fontSize: 10 },
    medium: { fontSize: 11 },
    large: { fontSize: 12 },
  } as const,
};

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
