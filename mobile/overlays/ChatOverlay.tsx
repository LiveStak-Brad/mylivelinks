/**
 * Chat Overlay - Swipe UP to open, DOWN to close
 * Semi-transparent scrollable chat list
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Message } from '../types/live';

interface ChatOverlayProps {
  visible: boolean;
  onClose: () => void;
}

// Mock messages for UI scaffolding
const MOCK_MESSAGES: Message[] = [
  { id: '1', username: 'User1', text: 'Hey everyone!', timestamp: Date.now() - 60000 },
  { id: '2', username: 'User2', text: 'Welcome to the stream 🎉', timestamp: Date.now() - 50000 },
  { id: '3', username: 'User3', text: 'This is amazing!', timestamp: Date.now() - 40000 },
];

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ visible, onClose }) => {
  const [messages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  
  const translateY = useSharedValue(0);

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

  const handleSend = () => {
    // TODO: Implement actual chat send
    console.log('[PLACEHOLDER] Send message:', inputText);
    setInputText('');
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
            <ScrollView style={styles.messageList} contentContainerStyle={styles.messageContent}>
              {messages.map((msg) => (
                <View key={msg.id} style={styles.messageItem}>
                  <Text style={styles.messageUsername}>{msg.username}</Text>
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              ))}
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
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
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
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

