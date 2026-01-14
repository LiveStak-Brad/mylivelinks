import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MusicVideo {
  id: string;
  title: string;
  description?: string;
  video_type: 'youtube' | 'upload';
  video_url: string;
  youtube_id?: string;
  thumbnail_url?: string;
}

interface MusicVideoEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  profileId: string;
  editingVideo?: MusicVideo | null;
  colors: any;
}

function getYoutubeIdFromUrl(url: string): string | null {
  const v = String(url || '').trim();
  if (!v) return null;

  const raw = v.match(/^[A-Za-z0-9_-]{11}$/);
  if (raw) return raw[0];

  const shortMatch = v.match(/youtu\.be\/([A-Za-z0-9_-]{11})/i);
  if (shortMatch?.[1]) return shortMatch[1];

  const watchMatch = v.match(/[?&]v=([A-Za-z0-9_-]{11})/i);
  if (watchMatch?.[1]) return watchMatch[1];

  const embedMatch = v.match(/youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/i);
  if (embedMatch?.[1]) return embedMatch[1];

  return null;
}

export default function MusicVideoEditModal({
  visible,
  onClose,
  onSave,
  profileId,
  editingVideo,
  colors,
}: MusicVideoEditModalProps) {
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoType, setVideoType] = useState<'youtube' | 'upload'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoFile, setVideoFile] = useState<any>(null);
  const [thumbnailFile, setThumbnailFile] = useState<any>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (editingVideo) {
        setTitle(editingVideo.title || '');
        setDescription(editingVideo.description || '');
        setVideoType(editingVideo.video_type || 'youtube');
        setYoutubeUrl(editingVideo.video_type === 'youtube' ? editingVideo.video_url : '');
        setThumbnailPreview(editingVideo.thumbnail_url || null);
      } else {
        resetForm();
      }
    }
  }, [visible, editingVideo]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVideoType('youtube');
    setYoutubeUrl('');
    setVideoFile(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setRightsConfirmed(false);
    setUploadProgress(null);
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      // Note: ImagePicker doesn't provide file size, so we skip size validation
      // The server will reject files that are too large

      setVideoFile({
        uri: file.uri,
        name: file.uri.split('/').pop() || 'video.mp4',
        mimeType: file.mimeType || 'video/mp4',
      });
    } catch (err) {
      console.error('[MusicVideoEditModal] Error picking video:', err);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const pickThumbnail = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setThumbnailFile(result.assets[0]);
      setThumbnailPreview(result.assets[0].uri);
    } catch (err) {
      console.error('[MusicVideoEditModal] Error picking thumbnail:', err);
      Alert.alert('Error', 'Failed to select thumbnail');
    }
  };

  const uploadFile = async (uri: string, path: string, mimeType: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const { error } = await supabase.storage
      .from('profile-media')
      .upload(path, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('profile-media')
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!rightsConfirmed) {
      Alert.alert('Error', 'You must confirm you have rights to this content');
      return;
    }

    setSaving(true);
    try {
      let videoUrl = editingVideo?.video_url || '';
      let thumbnailUrl = editingVideo?.thumbnail_url || null;
      const storageId = editingVideo?.id || crypto.randomUUID();

      if (videoType === 'youtube') {
        const ytId = getYoutubeIdFromUrl(youtubeUrl);
        if (!ytId) {
          Alert.alert('Error', 'Please enter a valid YouTube URL');
          setSaving(false);
          return;
        }
        videoUrl = youtubeUrl.trim();
      } else {
        if (videoFile) {
          setUploadProgress('Uploading video...');
          const videoPath = `${profileId}/music/videos/${storageId}/video`;
          videoUrl = await uploadFile(videoFile.uri, videoPath, videoFile.mimeType || 'video/mp4');
        }
        if (!videoUrl) {
          Alert.alert('Error', 'Please select a video file');
          setSaving(false);
          return;
        }
      }

      if (thumbnailFile) {
        setUploadProgress('Uploading thumbnail...');
        const thumbPath = `${profileId}/music/videos/${storageId}/thumb`;
        thumbnailUrl = await uploadFile(thumbnailFile.uri, thumbPath, thumbnailFile.mimeType || 'image/jpeg');
      }

      setUploadProgress('Saving...');

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        video_type: videoType,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        rights_confirmed: true,
      };

      const { error } = await supabase.rpc('upsert_music_video', {
        p_id: editingVideo?.id || null,
        p_payload: payload,
      });

      if (error) throw error;

      resetForm();
      onSave();
      onClose();
    } catch (err) {
      console.error('[MusicVideoEditModal] Save error:', err);
      Alert.alert('Error', 'Failed to save video');
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const getYoutubeThumbnail = (): string | null => {
    const ytId = getYoutubeIdFromUrl(youtubeUrl);
    return ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} disabled={saving} style={styles.closeBtn}>
            <Feather name="x" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {editingVideo ? 'Edit Music Video' : 'Add Music Video'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., New Single (Official Video)"
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description..."
              placeholderTextColor={colors.mutedText}
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Source</Text>
            <View style={styles.sourceButtons}>
              <Pressable
                style={[
                  styles.sourceBtn,
                  { borderColor: videoType === 'youtube' ? colors.primary : colors.border },
                  videoType === 'youtube' && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => setVideoType('youtube')}
              >
                <Feather name="youtube" size={18} color={videoType === 'youtube' ? colors.primary : colors.mutedText} />
                <Text style={[styles.sourceBtnText, { color: videoType === 'youtube' ? colors.primary : colors.text }]}>
                  YouTube URL
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sourceBtn,
                  { borderColor: videoType === 'upload' ? colors.primary : colors.border },
                  videoType === 'upload' && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => setVideoType('upload')}
              >
                <Feather name="upload" size={18} color={videoType === 'upload' ? colors.primary : colors.mutedText} />
                <Text style={[styles.sourceBtnText, { color: videoType === 'upload' ? colors.primary : colors.text }]}>
                  Upload Video
                </Text>
              </Pressable>
            </View>
          </View>

          {videoType === 'youtube' ? (
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>YouTube URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor={colors.mutedText}
                autoCapitalize="none"
                keyboardType="url"
              />
              {getYoutubeThumbnail() && (
                <Image
                  source={{ uri: getYoutubeThumbnail()! }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}
            </View>
          ) : (
            <>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Video File *</Text>
                <Pressable
                  style={[styles.uploadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={pickVideo}
                >
                  <Feather name="film" size={24} color={colors.primary} />
                  <Text style={[styles.uploadBtnText, { color: colors.text }]}>
                    {videoFile ? videoFile.name : 'Select Video File'}
                  </Text>
                </Pressable>
                {videoFile && (
                  <Text style={[styles.fileInfo, { color: colors.mutedText }]}>
                    {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                  </Text>
                )}
                <Text style={[styles.hint, { color: colors.mutedText }]}>
                  MP4/H.264 recommended. Max 500MB.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Custom Thumbnail (optional)</Text>
                <Pressable
                  style={[styles.uploadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={pickThumbnail}
                >
                  <Feather name="image" size={24} color={colors.primary} />
                  <Text style={[styles.uploadBtnText, { color: colors.text }]}>
                    {thumbnailFile ? 'Change Thumbnail' : 'Select Thumbnail'}
                  </Text>
                </Pressable>
                {thumbnailPreview && (
                  <Image
                    source={{ uri: thumbnailPreview }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                )}
              </View>
            </>
          )}

          <View style={[styles.rightsBox, { backgroundColor: colors.surface, borderColor: '#F59E0B' }]}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setRightsConfirmed(!rightsConfirmed)}
            >
              <View style={[styles.checkbox, { borderColor: rightsConfirmed ? colors.primary : colors.border }]}>
                {rightsConfirmed && <Feather name="check" size={14} color={colors.primary} />}
              </View>
              <View style={styles.rightsTextContainer}>
                <Text style={[styles.rightsText, { color: colors.text }]}>
                  I own the rights or have permission to upload this content.
                </Text>
                <Text style={[styles.rightsWarning, { color: '#F59E0B' }]}>
                  Posting music without rights may risk profile deletion.
                </Text>
              </View>
            </Pressable>
          </View>

          {uploadProgress && (
            <View style={[styles.progressBox, { backgroundColor: colors.primary + '20' }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.progressText, { color: colors.primary }]}>{uploadProgress}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingVideo ? 'Save Changes' : 'Add Video'}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sourceButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  sourceBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  fileInfo: {
    fontSize: 12,
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 12,
  },
  rightsBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rightsTextContainer: {
    flex: 1,
  },
  rightsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  rightsWarning: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
