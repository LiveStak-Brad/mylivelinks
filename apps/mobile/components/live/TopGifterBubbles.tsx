import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

export interface TopGifter {
  id: string;
  username: string;
  avatarUrl?: string;
  totalCoins: number;
}

interface TopGifterBubblesProps {
  gifters: TopGifter[];
  onPress?: () => void;
}

const PLACEHOLDER_AVATAR = 'https://via.placeholder.com/40/6366F1/FFFFFF?text=?';

const BORDER_COLORS = [
  '#FFD700', // Gold - 1st place
  '#C0C0C0', // Silver - 2nd place
  '#CD7F32', // Bronze - 3rd place
];

export default function TopGifterBubbles({ gifters, onPress }: TopGifterBubblesProps) {
  if (gifters.length === 0) return null;

  return (
    <View style={styles.container}>
      {gifters.slice(0, 3).map((gifter, index) => (
        <Pressable
          key={gifter.id}
          onPress={onPress}
          style={({ pressed }) => [
            styles.bubble,
            { borderColor: BORDER_COLORS[index] },
            pressed && styles.bubblePressed,
          ]}
        >
          <Image
            source={{ uri: gifter.avatarUrl || PLACEHOLDER_AVATAR }}
            style={styles.avatar}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bubblePressed: {
    opacity: 0.8,
    transform: [{ scale: 1.1 }],
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
});
