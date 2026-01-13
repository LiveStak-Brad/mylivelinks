import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator, Dimensions, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video as ExpoVideo } from 'expo-av';
import { supabase } from '../../../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - (NUM_COLUMNS + 1) * GRID_SPACING) / NUM_COLUMNS;

interface VideosTabProps {
  profileId: string;
  colors: any;
}

interface Video {
  id: string;
  media_url: string;
  content?: string;
  created_at: string;
  profiles?: {
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

export default function VideosTab({ profileId, colors }: VideosTabProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadVideos();
  }, [profileId]);

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          media_url,
          content,
          created_at,
          profiles:profile_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('profile_id', profileId)
        .eq('media_type', 'video')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPress = (video: Video) => {
    setSelectedVideo(video);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedVideo(null);
  };

  const renderVideo = ({ item }: { item: Video }) => (
    <Pressable style={styles.videoItem} onPress={() => handleVideoPress(item)}>
      <View style={styles.videoThumbnail}>
        <View style={styles.playOverlay}>
          <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
            <Feather name="play" size={20} color="#fff" />
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Feather name="video" size={48} color={colors.mutedText} />
        <Text style={[styles.emptyText, { color: colors.mutedText }]}>
          No videos yet
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />

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
            {selectedVideo?.profiles && (
              <View style={styles.modalHeaderInfo}>
                <Image
                  source={{ uri: selectedVideo.profiles.avatar_url || undefined }}
                  style={styles.modalAvatar}
                />
                <Text style={[styles.modalUsername, { color: colors.text }]}>
                  {selectedVideo.profiles.display_name || selectedVideo.profiles.username}
                </Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedVideo && (
              <ExpoVideo
                source={{ uri: selectedVideo.media_url }}
                style={styles.modalVideo}
                useNativeControls
                resizeMode="contain"
                shouldPlay
              />
            )}

            {selectedVideo?.content && (
              <View style={[styles.captionSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.captionText, { color: colors.text }]}>
                  {selectedVideo.content}
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
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    overflow: 'hidden',
    position: 'relative',
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  modalVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (9 / 16),
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
