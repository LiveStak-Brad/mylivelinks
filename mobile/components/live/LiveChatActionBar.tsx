import React, { useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type LiveChatActionBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  inputEnabled?: boolean;

  showGift?: boolean;
  showShare?: boolean;

  giftEnabled?: boolean;
  onGiftPress?: () => void;
  onSharePress?: () => void;

  showComingSoon?: boolean;
  bottomInset?: number;
};

export function LiveChatActionBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Type a message...',
  inputEnabled = true,
  showGift = true,
  showShare = true,
  giftEnabled = true,
  onGiftPress,
  onSharePress,
  showComingSoon = false,
  bottomInset = 0,
}: LiveChatActionBarProps) {
  const handleGiftPress = useCallback(() => {
    if (!giftEnabled) {
      Alert.alert('Coming Soon', 'Gifting is coming soon.');
      return;
    }
    if (!onGiftPress) return;
    onGiftPress();
  }, [giftEnabled, onGiftPress]);

  const handleSharePress = useCallback(() => {
    if (!onSharePress) return;
    onSharePress();
  }, [onSharePress]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.wrap, { paddingBottom: Math.max(10, bottomInset) }]}
    >
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.6)"
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          editable={inputEnabled}
        />

        {showGift && (
          <TouchableOpacity
            style={[styles.actionButton, styles.giftButton, !giftEnabled && styles.actionButtonDisabled]}
            onPress={handleGiftPress}
            activeOpacity={0.8}
          >
            <Ionicons name="gift" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {showGift && showComingSoon && (
          <Text style={styles.comingSoonText} numberOfLines={1}>
            Coming Soon
          </Text>
        )}

        {showShare && (
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleSharePress}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  giftButton: {
    backgroundColor: '#a855f7',
  },
  shareButton: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  comingSoonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 88,
  },
});
