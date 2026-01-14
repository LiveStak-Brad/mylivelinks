import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator, Dimensions, Modal, ScrollView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - (NUM_COLUMNS + 1) * GRID_SPACING) / NUM_COLUMNS;

interface PhotosTabProps {
  profileId: string;
  colors: any;
}

interface Photo {
  id: string;
  media_url: string;
  text_content?: string;
  created_at: string;
  profiles?: {
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

export default function PhotosTab({ profileId, colors }: PhotosTabProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [profileId]);

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          media_url,
          text_content,
          created_at,
          profiles!posts_author_id_fkey (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('author_id', profileId)
        .eq('media_type', 'image')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setPhotos((data as any) || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoPress = (photo: Photo) => {
    setSelectedPhoto(photo);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedPhoto(null);
  };

  const renderPhoto = ({ item }: { item: Photo }) => (
    <Pressable style={styles.photoItem} onPress={() => handlePhotoPress(item)}>
      <Image
        source={{ uri: item.media_url }}
        style={styles.photo}
        resizeMode="cover"
      />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Feather name="image" size={48} color={colors.mutedText} />
        <Text style={[styles.emptyText, { color: colors.mutedText }]}>
          No photos yet
        </Text>
      </View>
    );
  }

  // Group photos into rows of NUM_COLUMNS
  const rows: Photo[][] = [];
  for (let i = 0; i < photos.length; i += NUM_COLUMNS) {
    rows.push(photos.slice(i, i + NUM_COLUMNS));
  }

  return (
    <>
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => (
              <View key={item.id}>{renderPhoto({ item })}</View>
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
            {selectedPhoto?.profiles && (
              <View style={styles.modalHeaderInfo}>
                <Image
                  source={{ uri: selectedPhoto.profiles.avatar_url || undefined }}
                  style={styles.modalAvatar}
                />
                <Text style={[styles.modalUsername, { color: colors.text }]}>
                  {selectedPhoto.profiles.display_name || selectedPhoto.profiles.username}
                </Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Image
              source={{ uri: selectedPhoto?.media_url }}
              style={styles.modalImage}
              resizeMode="contain"
            />

            {selectedPhoto?.content && (
              <View style={[styles.captionSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.captionText, { color: colors.text }]}>
                  {selectedPhoto.content}
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
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
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
