import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ChatMessage {
  id: string;
  type: 'chat' | 'gift' | 'follow' | 'system';
  username: string;
  text: string;
  giftAmount?: number;
}

interface ChatOverlayProps {
  messages: ChatMessage[];
}

export default function ChatOverlay({ messages }: ChatOverlayProps) {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    switch (item.type) {
      case 'gift':
        return (
          <View style={styles.messageBubble}>
            <View style={styles.giftBadge}>
              <Ionicons name="gift" size={12} color="#FFD700" />
              <Text style={styles.giftAmount}>{item.giftAmount}</Text>
            </View>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.giftText}>{item.text}</Text>
          </View>
        );
      case 'follow':
        return (
          <View style={[styles.messageBubble, styles.followBubble]}>
            <Ionicons name="person-add" size={12} color="#A855F7" style={{ marginRight: 4 }} />
            <Text style={styles.followText}>
              <Text style={styles.username}>{item.username}</Text> followed you
            </Text>
          </View>
        );
      case 'system':
        return (
          <View style={[styles.messageBubble, styles.systemBubble]}>
            <Text style={styles.systemText}>{item.text}</Text>
          </View>
        );
      default:
        return (
          <View style={styles.messageBubble}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.messageText}>{item.text}</Text>
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
    paddingVertical: 8,
    gap: 6,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  username: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A855F7',
    marginRight: 6,
  },
  messageText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
  },
  giftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  giftAmount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFD700',
    marginLeft: 3,
  },
  giftText: {
    fontSize: 13,
    color: '#FFD700',
  },
  followBubble: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  followText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  systemBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  systemText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
});
