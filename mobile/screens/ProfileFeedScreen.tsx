import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, Input, PageShell } from '../components/ui';

/* =============================================================================
   PROFILE FEED SCREEN

   Facebook-style feed with:
   - Composer card at top
   - FlatList of PostCards
   - Like/Comment/Share buttons
   - Empty/loading/error states
============================================================================= */

type ProfileFeedScreenProps = {
  /** Called when user taps back arrow */
  onBack?: () => void;
  /** Called when user submits a new post */
  onPost?: (content: string) => void;
  /** Called when user taps like on a post */
  onLike?: (postId: string) => void;
  /** Called when user taps comment on a post */
  onComment?: (postId: string) => void;
  /** Called when user taps share on a post */
  onShare?: (postId: string) => void;
};

type ScreenState = 'loading' | 'empty' | 'error' | 'data';

export function ProfileFeedScreen({ onBack, onPost }: ProfileFeedScreenProps) {
  const [composerText, setComposerText] = useState('');
  const [screenState] = useState<ScreenState>('empty');

  const renderComposer = () => (
    <View style={styles.composerCard}>
      <View style={styles.composerHeader}>
        <View style={styles.composerAvatar}>
          <Text style={styles.composerAvatarLetter}>U</Text>
        </View>
        <Input
          placeholder="Feed launching soon"
          value={composerText}
          onChangeText={setComposerText}
          style={styles.composerInput}
          multiline
          editable={false}
        />
      </View>
      <View style={styles.composerActions}>
        <View style={styles.composerMediaRow}>
          <Pressable style={styles.mediaButton} disabled>
            <Text style={styles.mediaIcon}>📷</Text>
            <Text style={styles.mediaText}>Photo</Text>
          </Pressable>
          <Pressable style={styles.mediaButton} disabled>
            <Text style={styles.mediaIcon}>🎥</Text>
            <Text style={styles.mediaText}>Video</Text>
          </Pressable>
          <Pressable style={styles.mediaButton} disabled>
            <Text style={styles.mediaIcon}>📍</Text>
            <Text style={styles.mediaText}>Location</Text>
          </Pressable>
        </View>
        <Button
          title="Post (Coming Soon)"
          onPress={() => onPost?.(composerText)}
          disabled
          style={styles.postButton}
        />
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📝</Text>
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptySubtitle}>
        When posts are shared, they’ll appear here. Feed launching soon.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#5E9BFF" />
      <Text style={styles.loadingText}>Loading feed...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorSubtitle}>
        We couldn't load the feed. Please try again.
      </Text>
      <Button
        title="Retry"
        onPress={() => {}}
        style={styles.retryButton}
      />
    </View>
  );

  const renderContent = () => {
    switch (screenState) {
      case 'loading':
        return renderLoadingState();
      case 'empty':
        return (
          <>
            {renderComposer()}
            {renderEmptyState()}
          </>
        );
      case 'error':
        return renderErrorState();
      default:
        return (
          <>
            {renderComposer()}
            {renderEmptyState()}
          </>
        );
    }
  };

  return (
    <PageShell
      title="Feed"
      left={
        onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.headerButton}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        ) : undefined
      }
    >
      {renderContent()}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
  },
  separator: {
    height: 12,
  },

  // Composer Card
  composerCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  composerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5E9BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  composerInput: {
    flex: 1,
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
    marginTop: 4,
  },
  composerMediaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mediaIcon: {
    fontSize: 14,
  },
  mediaText: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '600',
  },
  postButton: {
    paddingHorizontal: 24,
    height: 36,
  },

  // Post Card
  postCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5E9BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  postMeta: {
    flex: 1,
    marginLeft: 12,
  },
  postAuthor: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  postTime: {
    color: '#9aa0a6',
    fontSize: 13,
    marginTop: 2,
  },
  postMenu: {
    padding: 8,
  },
  postMenuIcon: {
    color: '#9aa0a6',
    fontSize: 16,
    letterSpacing: 1,
  },
  postContent: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  postDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44, // Touch target
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    color: '#9aa0a6',
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#9aa0a6',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#9aa0a6',
    fontSize: 15,
    fontWeight: '600',
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  errorIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  errorSubtitle: {
    color: '#9aa0a6',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 32,
  },
});

export default ProfileFeedScreen;

