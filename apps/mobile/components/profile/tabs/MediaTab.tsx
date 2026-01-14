import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Dimensions, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { supabase } from '../../../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - (NUM_COLUMNS + 1) * GRID_SPACING) / NUM_COLUMNS;

interface MediaTabProps {
  profileId: string;
  colors: any;
}

interface MediaItem {
  id: string;
  media_url: string;
  media_type: string;
  text_content?: string;
  created_at: string;
  profiles?: {
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

export default function MediaTab({ profileId, colors }: MediaTabProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadMedia();
  }, [profileId]);

  const loadMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          media_url,
          media_type,
          text_content,
          created_at,
          profiles!posts_author_id_fkey (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('author_id', profileId)
        .in('media_type', ['image', 'video'])
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMedia((data as any) || []);
    } catch (error) {
      console.error('Error loading media:', error);
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

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <Pressable style={styles.mediaItem} onPress={() => handleMediaPress(item)}>
      <Image
        source={{ uri: item.media_url }}
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (media.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Feather name="image" size={48} color={colors.mutedText} />
        <Text style={[styles.emptyText, { color: colors.mutedText }]}>
          No media yet
        </Text>
      </View>
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
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={handleCloseModal} style={styles.closeButton}>
              <Feather name="x" size={24} color={colors.text} />
            </Pressable>
            {selectedMedia?.profiles && (
              <View style={styles.modalHeaderInfo}>
                <Image
                  source={{ uri: selectedMedia.profiles.avatar_url || undefined }}
                  style={styles.modalAvatar}
                />
                <Text style={[styles.modalUsername, { color: colors.text }]}>
                  {selectedMedia.profiles.display_name || selectedMedia.profiles.username}
                </Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedMedia?.media_type === 'video' ? (
              <ExpoVideo
                source={{ uri: selectedMedia.media_url }}
                style={styles.modalVideo}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
              />
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
