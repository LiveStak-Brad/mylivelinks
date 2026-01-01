/**
 * Chat Overlay - Swipe UP to open, DOWN to close
 * Semi-transparent scrollable chat list with REAL DATA
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useChatMessages } from '../hooks/useChatMessages';

interface ChatOverlayProps {
  visible: boolean;
  onClose: () => void;
  roomId?: string;
  liveStreamId?: number;
  onGiftPress?: () => void;
  onSharePress?: () => void;
  giftingEnabled?: boolean;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  visible,
  onClose,
  roomId,
  liveStreamId,
  onGiftPress,
  onSharePress,
  giftingEnabled = false,
}) => {
  const navigation = useNavigation<any>();
  const { messages, loading, sendMessage, retryMessage } = useChatMessages({ roomId, liveStreamId });
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(0);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, visible]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow downward swipes
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100) {
        // Swipe down threshold reached - close overlay
        runOnJS(onClose)();
      }
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getFallbackBubbleColor = (profileId: string) => {
    const colors = [
      'rgba(168, 85, 247, 0.28)',
      'rgba(236, 72, 153, 0.28)',
      'rgba(59, 130, 246, 0.28)',
      'rgba(99, 102, 241, 0.28)',
      'rgba(139, 92, 246, 0.28)',
      'rgba(217, 70, 239, 0.28)',
      'rgba(244, 63, 94, 0.28)',
      'rgba(34, 211, 238, 0.24)',
    ];
    let hash = 0;
    for (let i = 0; i < profileId.length; i++) {
      hash = profileId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const toHexWithAlpha = (hex: string, alphaHex: string) => {
    const raw = (hex || '').trim();
    if (!raw) return null;
    if (!raw.startsWith('#')) return null;
    const body = raw.slice(1);
    if (body.length !== 6) return null;
    return `#${body}${alphaHex}`;
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    
    setSending(true);
    try {
      const success = await sendMessage(inputText.trim());
      if (success) {
        setInputText('');
      }
    } catch (err) {
      console.error('[ChatOverlay] Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <BlurView intensity={40} style={styles.blur}>
          <View style={styles.content}>
            {/* Header with swipe indicator */}
            <View style={styles.header}>
              <View style={styles.swipeIndicator} />
              <Text style={styles.headerText}>Chat</Text>
            </View>

            {/* Messages list */}
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messageList} 
              contentContainerStyle={styles.messageContent}
            >
              {loading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator color="#4a9eff" size="large" />
                  <Text style={styles.emptySubtitle}>Loading messages...</Text>
                </View>
              ) : messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.emptySubtitle}>Be the first to say something!</Text>
                </View>
              ) : (
                messages.map((msg) => {
                  const isSystem = msg.profile_id == null || msg.message_type === 'system';
                  const bubbleColor = msg.profile_id
                    ? (toHexWithAlpha(msg.chat_bubble_color || '', '66') || getFallbackBubbleColor(msg.profile_id))
                    : 'rgba(0,0,0,0.2)';

                  if (isSystem) {
                    return (
                      <View key={msg.id} style={styles.systemMessageWrap}>
                        <Text style={styles.systemMessageText}>{msg.content}</Text>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={msg.id}
                      style={styles.messageRow}
                      activeOpacity={0.9}
                      onLongPress={() => {
                        if (!msg.profile_id) return;
                        navigation.getParent?.()?.navigate?.('ReportUser', {
                          reportedUserId: msg.profile_id,
                          reportedUsername: msg.username,
                          reportType: 'chat',
                          contextDetails: JSON.stringify({
                            content_kind: 'stream_chat_message',
                            message_id: String(msg.id),
                            room_id: roomId ?? null,
                            live_stream_id: typeof liveStreamId === 'number' ? liveStreamId : null,
                            sender_id: msg.profile_id,
                            sender_username: msg.username ?? null,
                            snippet: String(msg.content || '').slice(0, 160) || null,
                            created_at: msg.created_at,
                            surface: 'mobile_native_live_chat_overlay',
                          }),
                        });
                      }}
                      delayLongPress={350}
                    >
                      <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
                        <View style={styles.bubbleAvatarWrap}>
                          {msg.avatar_url ? (
                            <Image source={{ uri: msg.avatar_url }} style={styles.avatar} />
                          ) : (
                            <View style={styles.avatarFallback} />
                          )}
                        </View>

                        <View style={styles.bubbleContent}>
                          <View style={styles.bubbleHeaderRow}>
                            <Text
                              style={[
                                styles.messageUsername,
                                msg.chat_font ? { fontFamily: msg.chat_font } : null,
                              ]}
                              numberOfLines={1}
                            >
                              {msg.username || 'Unknown'}
                            </Text>
                            <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                            {msg.client_status === 'sending' && (
                              <Text style={styles.messageStatusSending}>Sending…</Text>
                            )}
                            {msg.client_status === 'failed' && (
                              <TouchableOpacity
                                onPress={() => {
                                  if (typeof msg.id === 'string') {
                                    retryMessage(msg.id);
                                  }
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.messageStatusFailed}>Failed • Tap to retry</Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {typeof msg.gifter_level === 'number' && msg.gifter_level > 0 ? (
                            <View style={styles.levelRow}>
                              <View style={styles.levelPill}>
                                <Text style={styles.levelPillText}>Lv {msg.gifter_level}</Text>
                              </View>
                              <Text
                                style={[
                                  styles.messageTextInline,
                                  msg.chat_font ? { fontFamily: msg.chat_font } : null,
                                ]}
                              >
                                {msg.content}
                              </Text>
                            </View>
                          ) : (
                            <Text
                              style={[
                                styles.messageText,
                                msg.chat_font ? { fontFamily: msg.chat_font } : null,
                              ]}
                            >
                              {msg.content}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Input area */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={[styles.inputContainer, { paddingBottom: 8 + (insets.bottom || 0) }]}
            >
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor="#888"
                returnKeyType="send"
                onSubmitEditing={handleSend}
                editable={!loading && !sending}
              />
              {onGiftPress && (
                <View style={styles.iconButtonWrap}>
                  <TouchableOpacity
                    style={[styles.iconButton, !giftingEnabled && styles.iconButtonDisabled]}
                    onPress={onGiftPress}
                    disabled={!giftingEnabled || loading || sending}
                    activeOpacity={0.7}
                    accessibilityLabel={giftingEnabled ? 'Send Gift' : 'Gifts Coming Soon'}
                  >
                    <Ionicons
                      name="gift"
                      size={20}
                      color={giftingEnabled ? '#f59e0b' : 'rgba(255,255,255,0.35)'}
                    />
                  </TouchableOpacity>
                  {!giftingEnabled && (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonBadgeText}>SOON</Text>
                    </View>
                  )}
                </View>
              )}
              {onSharePress && (
                <TouchableOpacity
                  style={[styles.iconButton, (loading || sending) && styles.iconButtonDisabled]}
                  onPress={onSharePress}
                  disabled={loading || sending}
                  activeOpacity={0.7}
                  accessibilityLabel="Share"
                >
                  <Ionicons name="share-social" size={20} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() || loading || sending) && styles.sendButtonDisabled]} 
                onPress={handleSend} 
                disabled={!inputText.trim() || loading || sending}
                activeOpacity={0.7}
                accessibilityLabel="Send"
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
    marginBottom: 12,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingBottom: 16,
  },
  systemMessageWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  systemMessageText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#9aa0a6',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  messageItem: {
    marginBottom: 12,
  },
  messageRow: {
    width: '100%',
    marginBottom: 10,
  },
  bubbleAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  avatar: {
    width: 32,
    height: 32,
    resizeMode: 'cover',
  },
  avatarFallback: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bubble: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bubbleContent: {
    flex: 1,
    minWidth: 0,
  },
  bubbleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  messageUsername: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
  },
  messageTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
  },
  messageStatusSending: {
    color: '#9aa0a6',
    fontSize: 11,
    fontWeight: '600',
  },
  messageStatusFailed: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  messageText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 18,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  levelPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  levelPillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
  },
  messageTextInline: {
    flex: 1,
    minWidth: 0,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
  },
  iconButtonWrap: {
    width: 44,
    height: 44,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  iconButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    opacity: 0.7,
  },
  soonBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  soonBadgeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4a9eff',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

