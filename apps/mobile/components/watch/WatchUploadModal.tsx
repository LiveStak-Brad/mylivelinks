import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from '../../lib/supabase';

interface WatchUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WatchUploadModal({
  visible,
  onClose,
  onSuccess,
}: WatchUploadModalProps) {
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [location, setLocation] = useState('');
  const [isVlog, setIsVlog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isVideo = selectedAsset?.type === 'video';

  const resetState = useCallback(() => {
    setSelectedAsset(null);
    setThumbnailUri(null);
    setTitle('');
    setCaption('');
    setHashtags('');
    setLocation('');
    setIsVlog(false);
    setUploading(false);
    setUploadProgress(0);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (uploading) return;
    resetState();
    onClose();
  }, [uploading, resetState, onClose]);

  const pickMedia = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access media library is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 300, // 5 minutes max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedAsset(asset);
        setError(null);

        // Generate thumbnail for videos
        if (asset.type === 'video' && asset.uri) {
          try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
              time: 500, // 0.5 seconds in
            });
            setThumbnailUri(thumbUri);
          } catch (thumbErr) {
            console.warn('[WatchUploadModal] Thumbnail generation failed:', thumbErr);
          }
        }
      }
    } catch (err) {
      console.error('[WatchUploadModal] Pick media error:', err);
      setError('Failed to pick media');
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedAsset) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to upload');
        setUploading(false);
        return;
      }

      setUploadProgress(10);

      // Prepare file for upload
      const uri = selectedAsset.uri;
      const fileExt = uri.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const mimeType = isVideo ? `video/${fileExt}` : `image/${fileExt}`;

      // Fetch the file as blob
      const response = await fetch(uri);
      const blob = await response.blob();

      setUploadProgress(30);

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: mimeType,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress(50);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(fileName);

      // Upload thumbnail if we have one (for videos)
      let thumbnailUrl: string | null = null;
      if (thumbnailUri) {
        const thumbFileName = `${user.id}/${Date.now()}_thumb.jpg`;
        const thumbResponse = await fetch(thumbnailUri);
        const thumbBlob = await thumbResponse.blob();

        const { error: thumbError } = await supabase.storage
          .from('post-media')
          .upload(thumbFileName, thumbBlob, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/jpeg',
          });

        if (!thumbError) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(thumbFileName);
          thumbnailUrl = thumbPublicUrl;
        }
      }

      setUploadProgress(70);

      // Parse hashtags
      const hashtagArray = hashtags
        .split(/[\s,#]+/)
        .filter(tag => tag.trim())
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

      setUploadProgress(85);

      // Create post via RPC
      const { error: rpcError } = await supabase.rpc('rpc_create_video_post', {
        p_media_url: publicUrl,
        p_title: title.trim() || null,
        p_caption: caption.trim() || null,
        p_hashtags: hashtagArray.length > 0 ? hashtagArray : null,
        p_location_text: location.trim() || null,
        p_thumbnail_url: thumbnailUrl,
        p_is_vlog: isVlog,
      });

      if (rpcError) {
        throw new Error(`Failed to create post: ${rpcError.message}`);
      }

      setUploadProgress(100);

      // Success - close modal and trigger refresh
      setTimeout(() => {
        resetState();
        onSuccess();
        onClose();
      }, 300);

    } catch (err: any) {
      console.error('[WatchUploadModal] Upload error:', err);
      setError(err.message || 'Failed to upload');
      setUploading(false);
      setUploadProgress(0);
    }
  }, [selectedAsset, thumbnailUri, title, caption, hashtags, location, isVlog, isVideo, resetState, onSuccess, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Post</Text>
          <Pressable
            onPress={handleClose}
            disabled={uploading}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Media Picker */}
          <Pressable
            onPress={pickMedia}
            disabled={uploading}
            style={({ pressed }) => [
              styles.mediaPicker,
              selectedAsset && styles.mediaPickerSelected,
              pressed && !uploading && styles.pressed,
            ]}
          >
            {selectedAsset ? (
              <View style={styles.previewContainer}>
                {isVideo ? (
                  <Video
                    source={{ uri: selectedAsset.uri }}
                    style={styles.preview}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={false}
                    isMuted
                    useNativeControls
                  />
                ) : (
                  <Image source={{ uri: selectedAsset.uri }} style={styles.preview} resizeMode="contain" />
                )}
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedAsset.fileName || 'Selected media'}
                </Text>
              </View>
            ) : (
              <View style={styles.pickerPlaceholder}>
                <View style={styles.pickerIcons}>
                  <Ionicons name="videocam-outline" size={32} color="rgba(255,255,255,0.5)" />
                  <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.5)" />
                </View>
                <Text style={styles.pickerTitle}>Upload video or photo</Text>
                <Text style={styles.pickerSubtitle}>Tap to browse</Text>
              </View>
            )}
          </Pressable>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Add a title..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              maxLength={100}
              editable={!uploading}
            />
          </View>

          {/* Caption */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Caption</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={caption}
              onChangeText={setCaption}
              placeholder="Write a caption..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              maxLength={2000}
              multiline
              numberOfLines={3}
              editable={!uploading}
            />
          </View>

          {/* Hashtags */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hashtags</Text>
            <TextInput
              style={styles.textInput}
              value={hashtags}
              onChangeText={setHashtags}
              placeholder="#funny #viral #trending"
              placeholderTextColor="rgba(255,255,255,0.4)"
              editable={!uploading}
            />
            <Text style={styles.inputHint}>Separate with spaces or commas</Text>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" /> Location
            </Text>
            <TextInput
              style={styles.textInput}
              value={location}
              onChangeText={setLocation}
              placeholder="City, venue..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              maxLength={100}
              editable={!uploading}
            />
          </View>

          {/* Vlog Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Mark as Vlog</Text>
              <Text style={styles.toggleSubtitle}>Shows in your Vlogs section</Text>
            </View>
            <Switch
              value={isVlog}
              onValueChange={setIsVlog}
              disabled={uploading}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#EC4899' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {uploading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>Uploading... {uploadProgress}%</Text>
            </View>
          )}

          <Pressable
            onPress={handleUpload}
            disabled={!selectedAsset || uploading}
            style={({ pressed }) => [
              styles.uploadButton,
              (!selectedAsset || uploading) && styles.uploadButtonDisabled,
              pressed && !uploading && selectedAsset && styles.pressed,
            ]}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>Uploading...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>Post</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  mediaPicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  mediaPickerSelected: {
    borderColor: '#EC4899',
    borderStyle: 'solid',
    backgroundColor: 'rgba(236,72,153,0.1)',
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  fileName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  pickerPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  pickerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  pickerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EC4899',
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EC4899',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
