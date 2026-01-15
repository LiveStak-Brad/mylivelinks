import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

// Pool of quick reply options (shared with web)
const REPLY_POOL = [
  "Thank you so much! 💖",
  "You're amazing! 🙌",
  "This made my day! ✨",
  "So grateful! 🥰",
  "You're the best! 🎉",
  "Love you for this! 💕",
  "Wow, thank you! 😍",
  "Appreciate you! 🙏",
  "You rock! 🤘",
  "Can't thank you enough! 💫",
  "This is so sweet! 🍬",
  "You're incredible! 🌟",
  "Means so much! ❤️",
  "Best supporter ever! 👑",
  "Thank you, friend! 🤗",
];

function getRandomReplies(count: number = 3): string[] {
  const shuffled = [...REPLY_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, REPLY_POOL.length));
}

interface GiftQuickRepliesProps {
  giftId: string;
  senderId: string;
  postId?: string;
  creatorStudioItemId?: string;
  onSendReply: (recipientId: string, message: string, giftId?: string, postId?: string, creatorStudioItemId?: string) => Promise<boolean>;
  onDismiss: (giftId: string) => void;
  colors: {
    primary: string;
    text: string;
    mutedText: string;
    surface: string;
    border: string;
  };
}

export default function GiftQuickReplies({
  giftId,
  senderId,
  postId,
  creatorStudioItemId,
  onSendReply,
  onDismiss,
  colors,
}: GiftQuickRepliesProps) {
  const [isSending, setIsSending] = useState(false);
  
  // Generate random replies once per mount
  const replies = useMemo(() => getRandomReplies(3), []);

  const handleReply = async (message: string) => {
    if (isSending) return;
    setIsSending(true);
    
    try {
      await onSendReply(senderId, message, giftId, postId, creatorStudioItemId);
      onDismiss(giftId);
    } catch (err) {
      console.error('[GiftQuickReplies] Failed to send reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleNoThanks = () => {
    onDismiss(giftId);
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {replies.map((reply, idx) => (
        <Pressable
          key={idx}
          onPress={() => handleReply(reply)}
          disabled={isSending}
          style={({ pressed }) => [
            styles.replyButton,
            pressed && styles.buttonPressed,
            isSending && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.replyText}>{reply}</Text>
        </Pressable>
      ))}
      <Pressable
        onPress={handleNoThanks}
        disabled={isSending}
        style={({ pressed }) => [
          styles.noThanksButton,
          pressed && styles.buttonPressed,
          isSending && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.noThanksText}>No thanks</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: GiftQuickRepliesProps['colors']) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    replyButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: `${colors.primary}20`,
      borderRadius: 16,
    },
    replyText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    noThanksButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noThanksText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.mutedText,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
}
