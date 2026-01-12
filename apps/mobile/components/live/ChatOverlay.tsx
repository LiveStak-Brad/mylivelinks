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
  // Gifter level for showing badge (0 = no badge)
  gifterLevel?: number;
  // Pro badge
  isPro?: boolean;
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

// Helper to get gifter badge color based on level
const getGifterBadgeColor = (level: number): string | null => {
  if (level >= 50) return '#FFD700'; // Gold
  if (level >= 30) return '#E5E4E2'; // Platinum
  if (level >= 20) return '#C0C0C0'; // Silver
  if (level >= 10) return '#CD7F32'; // Bronze
  if (level >= 5) return '#9966CC'; // Purple
  if (level >= 1) return '#3B82F6'; // Blue
  return null;
};

export default function ChatOverlay({ messages, fontColor = '#FFFFFF' }: ChatOverlayProps) {
  const flatListRef = useRef<FlatList>(null);

  // No need for auto-scroll since we use inverted list (new messages appear at bottom automatically)

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // Use user's chosen chat color, fall back to default fontColor
    const textColor = item.chatColor || fontColor;
    const gifterBadgeColor = getGifterBadgeColor(item.gifterLevel || 0);
    
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
                {/* Gifter badge */}
                {gifterBadgeColor && (
                  <View style={[styles.badgeIcon, { backgroundColor: gifterBadgeColor }]}>
                    <Ionicons name="diamond" size={8} color="#FFFFFF" />
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
                {/* Gifter badge */}
                {gifterBadgeColor && (
                  <View style={[styles.badgeIcon, { backgroundColor: gifterBadgeColor }]}>
                    <Ionicons name="diamond" size={8} color="#FFFFFF" />
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
  
  // Gifter badge icon
  badgeIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
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
