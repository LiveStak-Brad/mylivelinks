import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Dimensions, Modal, ScrollView, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import ModuleEmptyState from '../ModuleEmptyState';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - (NUM_COLUMNS + 1) * GRID_SPACING) / NUM_COLUMNS;

interface MediaTabProps {
  profileId: string;
  isOwnProfile?: boolean;
  onAddMedia?: () => void;
  colors: any;
}

interface MediaItem {
  id: string;
  media_url: string;
  media_type: string;
  thumbnail_url?: string;
  text_content?: string;
  created_at: string;
}

export default function MediaTab({ profileId, isOwnProfile = false, onAddMedia, colors }: MediaTabProps) {
  const insets = useSafeAreaInsets();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadMedia();
  }, [profileId]);

  const loadMedia = async () => {
    try {
      console.log('[MediaTab] Loading media for profileId:', profileId);
      
      // First, get ALL posts for this author to debug
      const { data: allPosts, error: allError } = await supabase
        .from('posts')
        .select('id, media_url, visibility, created_at')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      console.log('[MediaTab] All posts for author:', allPosts?.length || 0, allPosts?.slice(0, 3));
      
      // Now filter for posts with media
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          media_url,
          media_type,
          thumbnail_url,
          text_content,
          created_at
        `)
        .eq('author_id', profileId)
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[MediaTab] Query error:', error);
        throw error;
      }
      
      console.log('[MediaTab] Posts with media_url:', data?.length || 0, data?.slice(0, 3));
      
      // Filter out empty strings and map to media items
      const mediaItems = (data || [])
        .filter((item: any) => item.media_url && item.media_url.trim() !== '')
        .map((item: any) => {
          const url = (item.media_url || '').toLowerCase();
          const isVideo = /(\.mp4|\.mov|\.webm|\.mkv|\.avi)(\?|$)/i.test(url);
          return {
            ...item,
            media_type: isVideo ? 'video' : 'image'
          };
        });
      
      console.log('[MediaTab] Final media items:', mediaItems.length);
      setMedia(mediaItems);
    } catch (error) {
      console.error('[MediaTab] Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaPress = (item: MediaItem) => {
    setSelectedMedia(item);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMedia(null);
  };

  const renderMediaItem = ({ item }: { item: MediaItem }) => {
    // Use thumbnail_url for videos if available, otherwise fall back to media_url
    const displayUrl = item.media_type === 'video' && item.thumbnail_url 
      ? item.thumbnail_url 
      : item.media_url;
    
    return (
      <Pressable style={styles.mediaItem} onPress={() => handleMediaPress(item)}>
        <Image
          source={{ uri: displayUrl }}
          style={styles.mediaThumbnail}
          resizeMode="cover"
        />
        {item.media_type === 'video' && (
          <View style={styles.playOverlay}>
            <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
              <Feather name="play" size={16} color="#fff" />
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (media.length === 0) {
    if (!isOwnProfile) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
          <Feather name="image" size={48} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No media yet
          </Text>
        </View>
      );
    }
    
    return (
      <ModuleEmptyState
        icon="image"
        title="No Media Yet"
        description="Share photos and videos from your posts here."
        ctaLabel="Add Media"
        onCtaPress={onAddMedia}
        colors={colors}
      />
    );
  }

  // Group media into rows of NUM_COLUMNS
  const rows: MediaItem[][] = [];
  for (let i = 0; i < media.length; i += NUM_COLUMNS) {
    rows.push(media.slice(i, i + NUM_COLUMNS));
  }

  return (
    <>
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => (
              <View key={item.id}>{renderMediaItem({ item })}</View>
            ))}
          </View>
        ))}
      </View>

      <Modal
        visible={modalVisible}
        animationType="fade"
        onRequestClose={handleCloseModal}
        transparent={false}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={handleCloseModal} style={styles.closeButton}>
              <Feather name="x" size={24} color={colors.text} />
            </Pressable>
            <View style={styles.modalHeaderInfo}>
              <Feather 
                name={selectedMedia?.media_type === 'video' ? 'video' : 'image'} 
                size={20} 
                color={colors.primary} 
                style={{ marginRight: 8 }} 
              />
              <Text style={[styles.modalUsername, { color: colors.text }]}>
                {selectedMedia?.media_type === 'video' ? 'Video' : 'Photo'}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedMedia?.media_type === 'video' ? (
              <Pressable 
                style={styles.videoContainer}
                onPress={() => {
                  if (selectedMedia?.media_url) {
                    Linking.openURL(selectedMedia.media_url);
                  }
                }}
              >
                <Image
                  source={{ uri: selectedMedia.thumbnail_url || selectedMedia.media_url }}
                  style={styles.modalVideo}
                  resizeMode="cover"
                />
                <View style={styles.videoPlayOverlay}>
                  <View style={[styles.videoPlayButton, { backgroundColor: colors.primary }]}>
                    <Feather name="play" size={32} color="#fff" />
                  </View>
                  <Text style={styles.videoPlayText}>Tap to play video</Text>
                </View>
              </Pressable>
            ) : (
              <Image
                source={{ uri: selectedMedia?.media_url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}

            {selectedMedia?.text_content && (
              <View style={[styles.captionSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.captionText, { color: colors.text }]}>
                  {selectedMedia.text_content}
                </Text>
              </View>
            )}

            <View style={[styles.commentsSection, { backgroundColor: colors.card }]}>
              <Text style={[styles.commentsTitle, { color: colors.text }]}>Comments</Text>
              <Text style={[styles.commentsPlaceholder, { color: colors.mutedText }]}>
                Comments coming soon
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    paddingBottom: 16,
    marginHorizontal: -14, // Counteract parent paddingHorizontal: 14
  },
  row: {
    flexDirection: 'row',
    gap: GRID_SPACING,
    marginBottom: GRID_SPACING,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    position: 'relative',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  modalHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    marginRight: 10,
  },
  modalUsername: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalContent: {
    flexGrow: 1,
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#000',
  },
  modalVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  videoPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  captionSection: {
    padding: 16,
  },
  captionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  commentsSection: {
    padding: 16,
    minHeight: 200,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  commentsPlaceholder: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});
