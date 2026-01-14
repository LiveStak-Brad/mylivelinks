import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Dimensions, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { supabase } from '../../../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - (NUM_COLUMNS + 1) * GRID_SPACING) / NUM_COLUMNS;

interface MusicVideosTabProps {
  profileId: string;
  colors: any;
}

interface MusicVideo {
  id: string;
  media_url: string;
  text_content?: string;
  title?: string;
  thumbnail_url?: string;
  created_at: string;
  profiles?: {
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

export default function MusicVideosTab({ profileId, colors }: MusicVideosTabProps) {
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<MusicVideo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadVideos();
  }, [profileId]);

  const loadVideos = async () => {
    try {
      // Load from profile_music_videos table (music videos specifically)
      const { data, error } = await supabase
        .from('profile_music_videos')
        .select(`
          id,
          youtube_url,
          title,
          created_at
        `)
        .eq('profile_id', profileId)
        .order('display_order', { ascending: true })
        .limit(50);

      if (error) throw error;
      
      // Map to our interface
      const formattedVideos: MusicVideo[] = (data || []).map((item: any) => ({
        id: item.id,
        media_url: item.youtube_url,
        title: item.title,
        created_at: item.created_at,
      }));
      
      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error loading music videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPress = (video: MusicVideo) => {
    setSelectedVideo(video);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedVideo(null);
  };

  const getYouTubeThumbnail = (url: string) => {
    // Extract YouTube video ID and return thumbnail URL
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return null;
  };

  const renderVideo = ({ item }: { item: MusicVideo }) => {
    const thumbnailUrl = getYouTubeThumbnail(item.media_url);
    
    return (
      <Pressable style={styles.videoItem} onPress={() => handleVideoPress(item)}>
        <View style={styles.videoThumbnail}>
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.surface }]}>
              <Feather name="music" size={24} color={colors.mutedText} />
            </View>
          )}
          <View style={styles.playOverlay}>
            <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
              <Feather name="play" size={20} color="#fff" />
            </View>
          </View>
          {/* Music emblem */}
          <View style={[styles.musicBadge, { backgroundColor: colors.primary }]}>
            <Feather name="music" size={10} color="#fff" />
          </View>
        </View>
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

  if (videos.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Feather name="music" size={48} color={colors.mutedText} />
        <Text style={[styles.emptyText, { color: colors.mutedText }]}>
          No music videos yet
        </Text>
      </View>
    );
  }

  // Group videos into rows of NUM_COLUMNS
  const rows: MusicVideo[][] = [];
  for (let i = 0; i < videos.length; i += NUM_COLUMNS) {
    rows.push(videos.slice(i, i + NUM_COLUMNS));
  }

  return (
    <>
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => (
              <View key={item.id}>{renderVideo({ item })}</View>
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
            <View style={styles.modalHeaderInfo}>
              <Feather name="music" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {selectedVideo?.title || 'Music Video'}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedVideo && (
              <View style={styles.videoPlayerContainer}>
                <Text style={[styles.youtubeNote, { color: colors.mutedText }]}>
                  YouTube video playback - tap to open in browser
                </Text>
                <Pressable 
                  style={styles.youtubeLink}
                  onPress={() => {
                    // Open YouTube link
                    import('react-native').then(({ Linking }) => {
                      Linking.openURL(selectedVideo.media_url);
                    });
                  }}
                >
                  <Image
                    source={{ uri: getYouTubeThumbnail(selectedVideo.media_url) || undefined }}
                    style={styles.modalThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.youtubePlayOverlay}>
                    <View style={[styles.youtubePlayButton, { backgroundColor: '#FF0000' }]}>
                      <Feather name="play" size={32} color="#fff" />
                    </View>
                  </View>
                </Pressable>
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
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  musicBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
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
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  modalContent: {
    flexGrow: 1,
  },
  videoPlayerContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  youtubeNote: {
    fontSize: 12,
    textAlign: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  youtubeLink: {
    flex: 1,
    position: 'relative',
  },
  modalThumbnail: {
    width: '100%',
    height: '100%',
  },
  youtubePlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubePlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
