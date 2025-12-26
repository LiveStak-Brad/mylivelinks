import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, PageShell } from '../components/ui';

/* =============================================================================
   PROFILE PHOTOS SCREEN

   Instagram-style photo grid with:
   - Grid of square tiles (FlatList numColumns=3)
   - Video overlay indicator
   - Fullscreen Modal viewer
   - Empty/loading/error states
============================================================================= */

type MediaItem = {
  id: string;
  type: 'photo' | 'video';
  thumbnail: string;
  fullUrl: string;
  caption?: string;
};

type ProfilePhotosScreenProps = {
  /** Called when user taps back arrow */
  onBack?: () => void;
  /** Called when user taps upload button */
  onUpload?: () => void;
};

type ScreenState = 'loading' | 'empty' | 'error' | 'data';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - TILE_GAP * 4) / 3;

export function ProfilePhotosScreen({
  onBack,
  onUpload,
}: ProfilePhotosScreenProps) {
  const [media] = useState<MediaItem[]>([]);
  const [screenState] = useState<ScreenState>('empty');

  const renderTile = ({ item, index }: { item: MediaItem; index: number }) => {
    // Calculate margin for grid alignment
    const isLeftEdge = index % 3 === 0;
    const isRightEdge = index % 3 === 2;
    
    return (
      <Pressable
        style={[
          styles.tile,
          {
            marginLeft: isLeftEdge ? TILE_GAP : TILE_GAP / 2,
            marginRight: isRightEdge ? TILE_GAP : TILE_GAP / 2,
          },
        ]}
        onPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.type}`}
        disabled
      >
        {/* Placeholder gradient background */}
        <View style={styles.tilePlaceholder}>
          <Text style={styles.tilePlaceholderIcon}>
            {item.type === 'video' ? '🎬' : '🖼️'}
          </Text>
        </View>

        {/* Video indicator overlay */}
        {item.type === 'video' && (
          <View style={styles.videoOverlay}>
            <View style={styles.playIcon}>
              <Text style={styles.playIconText}>▶</Text>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📷</Text>
      <Text style={styles.emptyTitle}>No photos yet</Text>
      <Text style={styles.emptySubtitle}>
        Uploads coming soon. Photos will appear here when uploads are enabled.
      </Text>
      <Button
        title="Uploads (Coming Soon)"
        onPress={() => onUpload?.()}
        style={styles.uploadButton}
        disabled
      />
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#5E9BFF" />
      <Text style={styles.loadingText}>Loading photos...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Couldn't load photos</Text>
      <Text style={styles.errorSubtitle}>
        Something went wrong. Please try again.
      </Text>
      <Button
        title="Retry"
        onPress={() => {}}
        style={styles.retryButton}
      />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <View style={styles.headerStats}>
        <Text style={styles.headerStatValue}>{media.length}</Text>
        <Text style={styles.headerStatLabel}>
          {media.length === 1 ? 'Post' : 'Posts'}
        </Text>
      </View>
      <Pressable
        style={styles.uploadIconButton}
        onPress={() => onUpload?.()}
        accessibilityRole="button"
        accessibilityLabel="Upload photo"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        disabled
      >
        <Text style={styles.uploadIconText}>+</Text>
      </Pressable>
    </View>
  );

  const renderContent = () => {
    switch (screenState) {
      case 'loading':
        return renderLoadingState();
      case 'empty':
        return renderEmptyState();
      case 'error':
        return renderErrorState();
      case 'data':
      default:
        return (
          <FlatList
            data={media}
            keyExtractor={(item) => item.id}
            renderItem={renderTile}
            numColumns={3}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          />
        );
    }
  };

  return (
    <PageShell
      title="Photos"
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
      right={
        <Pressable
          onPress={() => onUpload?.()}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Upload photo"
          style={styles.headerButton}
          disabled
        >
          <Text style={styles.uploadNav}>+</Text>
        </Pressable>
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
  uploadNav: {
    color: '#5E9BFF',
    fontSize: 28,
    fontWeight: '600',
  },
  gridContent: {
    paddingBottom: 40,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  headerStatValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  headerStatLabel: {
    color: '#9aa0a6',
    fontSize: 15,
    fontWeight: '600',
  },
  uploadIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5E9BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: -2,
  },

  // Grid Tiles
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginBottom: TILE_GAP,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tilePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(94, 155, 255, 0.15)',
  },
  tilePlaceholderIcon: {
    fontSize: 28,
    opacity: 0.6,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 3,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: '#9aa0a6',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  uploadButton: {
    marginTop: 16,
    paddingHorizontal: 40,
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

  // Fullscreen Viewer Modal
  viewerContent: {
    minHeight: 400,
  },
  viewerClose: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCloseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  viewerMedia: {
    aspectRatio: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  viewerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewerPlaceholderIcon: {
    fontSize: 48,
  },
  viewerPlaceholderText: {
    color: '#9aa0a6',
    fontSize: 14,
    fontWeight: '600',
  },
  viewerCaption: {
    marginBottom: 16,
  },
  viewerAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  viewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5E9BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerAvatarLetter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  viewerAuthorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  viewerCaptionText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 42,
  },
  viewerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  viewerAction: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 64,
    minHeight: 48, // Touch target
    paddingVertical: 8,
  },
  viewerActionIcon: {
    fontSize: 22,
  },
  viewerActionText: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ProfilePhotosScreen;

