import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

interface WatchActionStackProps {
  avatarUrl: string;
  isFollowing: boolean;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  shareCount: number;
  // Handlers are placeholders - no logic wired yet
  onAvatarPress?: () => void;
  onFollowPress?: () => void;
  onLikePress?: () => void;
  onCommentPress?: () => void;
  onFavoritePress?: () => void;
  onSharePress?: () => void;
  onRepostPress?: () => void;
  onCreatePress?: () => void;
}

function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(count);
}

/**
 * Right-side vertical action stack (TikTok-style).
 * Order: Avatar, Follow, Like, Comment, Favorite, Share, Repost, Create(+)
 * Create is bottom-most per spec.
 */
export default function WatchActionStack({
  avatarUrl,
  isFollowing,
  likeCount,
  commentCount,
  favoriteCount,
  shareCount,
  onAvatarPress,
  onFollowPress,
  onLikePress,
  onCommentPress,
  onFavoritePress,
  onSharePress,
  onRepostPress,
  onCreatePress,
}: WatchActionStackProps) {
  return (
    <View style={styles.container}>
      {/* Profile Avatar with Follow overlay */}
      <View style={styles.avatarSection}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View profile"
          onPress={onAvatarPress}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
        >
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            defaultSource={require('../../assets/no-profile-pic.png')}
          />
        </Pressable>
        {!isFollowing && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Follow"
            onPress={onFollowPress}
            style={({ pressed }) => [styles.followBadge, pressed && styles.followBadgePressed]}
          >
            <Ionicons name="add" size={14} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {/* Like */}
      <ActionButton
        icon={<Ionicons name="heart" size={28} color="#FFFFFF" />}
        count={likeCount}
        label="Like"
        onPress={onLikePress}
      />

      {/* Comment */}
      <ActionButton
        icon={<Ionicons name="chatbubble-ellipses" size={26} color="#FFFFFF" />}
        count={commentCount}
        label="Comment"
        onPress={onCommentPress}
      />

      {/* Favorite / Bookmark */}
      <ActionButton
        icon={<Ionicons name="bookmark" size={26} color="#FFFFFF" />}
        count={favoriteCount}
        label="Favorite"
        onPress={onFavoritePress}
      />

      {/* Share */}
      <ActionButton
        icon={<Ionicons name="arrow-redo" size={26} color="#FFFFFF" />}
        count={shareCount}
        label="Share"
        onPress={onSharePress}
      />

      {/* Repost */}
      <ActionButton
        icon={<Feather name="repeat" size={24} color="#FFFFFF" />}
        label="Repost"
        onPress={onRepostPress}
      />

      {/* Create (+) - Bottom-most, gradient pill style (web parity) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create"
        onPress={onCreatePress}
        style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}
      >
        {/* Gradient effect via layered backgrounds */}
        <View style={styles.createButtonGradient}>
          <View style={styles.createButtonGradientLeft} />
          <View style={styles.createButtonGradientRight} />
          <View style={styles.createButtonCenter}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function ActionButton({
  icon,
  count,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  count?: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      {icon}
      {count !== undefined && (
        <Text style={styles.actionCount}>{formatCount(count)}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },

  // Avatar section with follow overlay
  avatarSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  followBadge: {
    position: 'absolute',
    bottom: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  followBadgePressed: {
    backgroundColor: '#DB2777',
  },

  // Action buttons
  actionButton: {
    alignItems: 'center',
    gap: 2,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pressed: {
    opacity: 0.7,
  },

  // Create button - gradient pill style (web parity)
  createButton: {
    marginTop: 8,
  },
  createButtonPressed: {
    opacity: 0.85,
  },
  createButtonGradient: {
    width: 48,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  createButtonGradientLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: '#06B6D4', // Cyan
  },
  createButtonGradientRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: '#EC4899', // Pink
  },
  createButtonCenter: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 2,
    bottom: 2,
    backgroundColor: '#0F172A', // Dark center
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
