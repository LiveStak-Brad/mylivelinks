import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { supabase } from '../../lib/supabase';

interface Playlist {
  id: string;
  title: string;
  item_count: number;
  thumbnail_url: string | null;
}

interface AddToPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  youtubeUrl: string;
  youtubeVideoId: string;
  videoTitle?: string;
  videoAuthor?: string;
  videoThumbnail?: string;
  onSuccess?: () => void;
}

export default function AddToPlaylistModal({
  visible,
  onClose,
  youtubeUrl,
  youtubeVideoId,
  videoTitle,
  videoAuthor,
  videoThumbnail,
  onSuccess,
}: AddToPlaylistModalProps) {
  const { colors } = useTheme();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to add to playlist');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase.rpc('get_user_playlists', {
        p_profile_id: user.id,
      });

      if (fetchError) throw fetchError;
      setPlaylists(data || []);
    } catch (err: any) {
      console.error('Failed to load playlists:', err);
      setError(err.message || 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadPlaylists();
      setSuccess(null);
      setError(null);
    }
  }, [visible, loadPlaylists]);

  const handleAddToPlaylist = async (playlistId: string) => {
    setAdding(playlistId);
    setError(null);
    setSuccess(null);

    try {
      const { error: addError } = await supabase.rpc('add_playlist_item', {
        p_playlist_id: playlistId,
        p_youtube_url: youtubeUrl,
        p_title: videoTitle || null,
        p_author: videoAuthor || null,
        p_thumbnail_url: videoThumbnail || null,
      });

      if (addError) {
        if (addError.message.includes('already exists')) {
          setError('This video is already in the playlist');
        } else {
          throw addError;
        }
        return;
      }

      const playlist = playlists.find(p => p.id === playlistId);
      setSuccess(`Added to "${playlist?.title}"`);
      onSuccess?.();
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to add to playlist:', err);
      setError(err.message || 'Failed to add to playlist');
    } finally {
      setAdding(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) return;
    
    setCreating(true);
    setError(null);

    try {
      const { data: playlistId, error: createError } = await supabase.rpc('create_playlist', {
        p_title: newPlaylistTitle.trim(),
      });

      if (createError) throw createError;

      const { error: addError } = await supabase.rpc('add_playlist_item', {
        p_playlist_id: playlistId,
        p_youtube_url: youtubeUrl,
        p_title: videoTitle || null,
        p_author: videoAuthor || null,
        p_thumbnail_url: videoThumbnail || null,
      });

      if (addError) throw addError;

      setSuccess(`Created "${newPlaylistTitle}" and added video`);
      setNewPlaylistTitle('');
      setShowCreateNew(false);
      onSuccess?.();
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to create playlist:', err);
      setError(err.message || 'Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <Pressable
      onPress={() => handleAddToPlaylist(item.id)}
      disabled={adding !== null}
      style={({ pressed }) => [
        styles.playlistItem,
        { 
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: adding !== null ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {item.thumbnail_url ? (
        <Image
          source={{ uri: item.thumbnail_url }}
          style={styles.playlistThumb}
        />
      ) : (
        <View style={[styles.playlistThumbPlaceholder, { backgroundColor: colors.accent }]}>
          <Ionicons name="list" size={20} color="#FFFFFF" />
        </View>
      )}
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.playlistCount, { color: colors.mutedText }]}>
          {item.item_count} video{item.item_count !== 1 ? 's' : ''}
        </Text>
      </View>
      {adding === item.id ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Ionicons name="add" size={24} color={colors.mutedText} />
      )}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="list" size={20} color={colors.accent} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Add to Playlist
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Video Preview */}
          <View style={[styles.videoPreview, { backgroundColor: colors.surface }]}>
            {videoThumbnail || youtubeVideoId ? (
              <Image
                source={{ uri: videoThumbnail || `https://img.youtube.com/vi/${youtubeVideoId}/default.jpg` }}
                style={styles.videoThumb}
              />
            ) : (
              <View style={[styles.videoThumbPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="videocam" size={24} color={colors.mutedText} />
              </View>
            )}
            <View style={styles.videoInfo}>
              <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
                {videoTitle || 'YouTube Video'}
              </Text>
              {videoAuthor && (
                <Text style={[styles.videoAuthor, { color: colors.mutedText }]} numberOfLines={1}>
                  {videoAuthor}
                </Text>
              )}
            </View>
          </View>

          {/* Messages */}
          {error && (
            <View style={[styles.message, styles.errorMessage]}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {success && (
            <View style={[styles.message, styles.successMessage]}>
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : (
              <>
                {/* Create New Playlist */}
                {showCreateNew ? (
                  <View style={[styles.createNewForm, { borderColor: colors.accent }]}>
                    <TextInput
                      value={newPlaylistTitle}
                      onChangeText={setNewPlaylistTitle}
                      placeholder="Playlist name..."
                      placeholderTextColor={colors.mutedText}
                      style={[styles.createInput, { color: colors.text, borderColor: colors.border }]}
                      autoFocus
                    />
                    <View style={styles.createButtons}>
                      <Pressable
                        onPress={handleCreatePlaylist}
                        disabled={!newPlaylistTitle.trim() || creating}
                        style={[
                          styles.createBtn,
                          { backgroundColor: newPlaylistTitle.trim() ? colors.accent : colors.border },
                        ]}
                      >
                        {creating ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                            <Text style={styles.createBtnText}>Create & Add</Text>
                          </>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => setShowCreateNew(false)}
                        style={[styles.cancelBtn, { backgroundColor: colors.surface }]}
                      >
                        <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowCreateNew(true)}
                    style={[styles.createNewBtn, { borderColor: colors.border }]}
                  >
                    <Ionicons name="add" size={20} color={colors.mutedText} />
                    <Text style={[styles.createNewText, { color: colors.mutedText }]}>
                      Create new playlist
                    </Text>
                  </Pressable>
                )}

                {/* Playlists List */}
                {playlists.length === 0 && !loading && (
                  <Text style={[styles.emptyText, { color: colors.mutedText }]}>
                    No playlists yet. Create one above!
                  </Text>
                )}

                <FlatList
                  data={playlists}
                  keyExtractor={(item) => item.id}
                  renderItem={renderPlaylistItem}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  videoPreview: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
  videoThumb: {
    width: 80,
    height: 56,
    borderRadius: 8,
  },
  videoThumbPlaceholder: {
    width: 80,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  videoAuthor: {
    fontSize: 12,
    marginTop: 2,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  errorMessage: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  successMessage: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
  successText: {
    fontSize: 13,
    color: '#22C55E',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginBottom: 12,
  },
  createNewText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createNewForm: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  createInput: {
    fontSize: 15,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  createButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 20,
  },
  listContent: {
    gap: 8,
    paddingBottom: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    gap: 12,
  },
  playlistThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  playlistThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  playlistCount: {
    fontSize: 12,
    marginTop: 2,
  },
});
