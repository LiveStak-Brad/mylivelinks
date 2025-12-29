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
} from 'react-native';
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
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ visible, onClose }) => {
  const { messages, loading, sendMessage } = useChatMessages();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
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
                messages.map((msg) => (
                  <View key={msg.id} style={styles.messageItem}>
                    <Text style={styles.messageUsername}>{msg.username || 'Unknown'}</Text>
                    <Text style={styles.messageText}>{msg.content}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input area */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.inputContainer}
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
              <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() || loading || sending) && styles.sendButtonDisabled]} 
                onPress={handleSend} 
                disabled={!inputText.trim() || loading || sending}
              >
                <Text style={styles.sendButtonText}>Send</Text>
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
  messageUsername: {
    color: '#4a9eff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
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
  sendButton: {
    backgroundColor: '#4a9eff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
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

