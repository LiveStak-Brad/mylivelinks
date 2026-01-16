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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

interface ShopItem {
  id: string;
  title: string;
  description?: string;
  price?: string;
  link_url: string;
  image_url?: string;
}

interface ShopItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  profileId: string;
  editingItem?: ShopItem | null;
  colors: any;
}

export default function ShopItemModal({
  visible,
  onClose,
  onSave,
  profileId,
  editingItem,
  colors,
}: ShopItemModalProps) {
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<any>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingItem) {
        setTitle(editingItem.title || '');
        setDescription(editingItem.description || '');
        setPrice(editingItem.price || '');
        setLinkUrl(editingItem.link_url || '');
        setImageUrl(editingItem.image_url || '');
        setImagePreview(editingItem.image_url || null);
        setImageSource('url');
      } else {
        resetForm();
      }
    }
  }, [visible, editingItem]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setLinkUrl('');
    setImageSource('url');
    setImageUrl('');
    setImageFile(null);
    setImagePreview(null);
    setVideoFile(null);
    setVideoPreview(null);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setImageFile(result.assets[0]);
      setImagePreview(result.assets[0].uri);
      setImageSource('upload');
    } catch (err) {
      console.error('[ShopItemModal] Error picking image:', err);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setVideoFile(result.assets[0]);
      setVideoPreview(result.assets[0].uri);
    } catch (err) {
      console.error('[ShopItemModal] Error picking video:', err);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const uploadImage = async (uri: string, itemId: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const ext = uri.split('.').pop() || 'jpg';
    const path = `${profileId}/${itemId}.${ext}`;
    
    const { error } = await supabase.storage
      .from('shop-item')
      .upload(path, blob, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('shop-item')
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const uploadVideo = async (uri: string, itemId: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const ext = uri.split('.').pop() || 'mp4';
    const path = `${profileId}/${itemId}-video.${ext}`;
    
    const { error } = await supabase.storage
      .from('shop-item')
      .upload(path, blob, {
        contentType: `video/${ext}`,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('shop-item')
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!linkUrl.trim()) {
      Alert.alert('Error', 'Product link is required');
      return;
    }

    setSaving(true);
    try {
      const itemId = editingItem?.id || crypto.randomUUID();
      
      let finalImageUrl = imageUrl;
      
      // Upload image if user selected a file
      if (imageSource === 'upload' && imageFile) {
        finalImageUrl = await uploadImage(imageFile.uri, itemId);
      }

      // Upload video if user selected a file
      let finalVideoUrl = null;
      if (videoFile) {
        finalVideoUrl = await uploadVideo(videoFile.uri, itemId);
      }

      const payload = {
        id: itemId,
        profile_id: profileId,
        title: title.trim(),
        description: description.trim() || null,
        price: price.trim() || null,
        link_url: linkUrl.trim(),
        image_url: finalImageUrl || null,
        video_url: finalVideoUrl || null,
        media_type: finalVideoUrl ? 'video' as const : 'link' as const,
        media_url: finalVideoUrl || linkUrl.trim(),
      };

      if (editingItem) {
        const { error } = await supabase
          .from('profile_portfolio')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profile_portfolio')
          .insert(payload);
        if (error) throw error;
      }

      onSave();
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('[ShopItemModal] Save error:', err);
      Alert.alert('Error', err.message || 'Failed to save shop item');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
      resetForm();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} disabled={saving}>
            <Feather name="x" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {editingItem ? 'Edit Shop Item' : 'Add Shop Item'}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Product name"
              placeholderTextColor={colors.mutedText}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Product description (optional)"
              placeholderTextColor={colors.mutedText}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Price */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Price</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={price}
              onChangeText={setPrice}
              placeholder="$29.99 (optional)"
              placeholderTextColor={colors.mutedText}
            />
          </View>

          {/* Product Link */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Product Link *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://amazon.com/your-product"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Image Source Toggle */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Product Image</Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleBtn,
                  { borderColor: colors.border },
                  imageSource === 'url' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setImageSource('url')}
              >
                <Feather name="link" size={16} color={imageSource === 'url' ? '#fff' : colors.text} />
                <Text style={[styles.toggleText, { color: imageSource === 'url' ? '#fff' : colors.text }]}>
                  Image URL
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleBtn,
                  { borderColor: colors.border },
                  imageSource === 'upload' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setImageSource('upload')}
              >
                <Feather name="upload" size={16} color={imageSource === 'upload' ? '#fff' : colors.text} />
                <Text style={[styles.toggleText, { color: imageSource === 'upload' ? '#fff' : colors.text }]}>
                  Upload
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Image URL Input */}
          {imageSource === 'url' && (
            <View style={styles.field}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={imageUrl}
                onChangeText={(text) => {
                  setImageUrl(text);
                  setImagePreview(text);
                }}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={colors.mutedText}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          )}

          {/* Image Upload */}
          {imageSource === 'upload' && (
            <View style={styles.field}>
              <Pressable
                style={[styles.uploadBtn, { borderColor: colors.border }]}
                onPress={pickImage}
              >
                <Feather name="image" size={24} color={colors.primary} />
                <Text style={[styles.uploadBtnText, { color: colors.primary }]}>
                  {imageFile ? 'Change Image' : 'Select Image'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Image Preview</Text>
              <Image
                source={{ uri: imagePreview }}
                style={[styles.imagePreview, { borderColor: colors.border }]}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Video Upload */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Product Video (optional)</Text>
            <Pressable
              style={[styles.uploadBtn, { borderColor: colors.border }]}
              onPress={pickVideo}
            >
              <Feather name="video" size={24} color={colors.primary} />
              <Text style={[styles.uploadBtnText, { color: colors.primary }]}>
                {videoFile ? 'Change Video' : 'Select Video'}
              </Text>
            </Pressable>
          </View>

          {/* Video Preview */}
          {videoPreview && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Video Selected</Text>
              <View style={[styles.videoSelected, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="check-circle" size={20} color={colors.primary} />
                <Text style={[styles.videoSelectedText, { color: colors.text }]}>
                  Video ready to upload
                </Text>
                <Pressable onPress={() => { setVideoFile(null); setVideoPreview(null); }}>
                  <Feather name="x" size={20} color={colors.mutedText} />
                </Pressable>
              </View>
            </View>
          )}
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
  },
  videoSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  videoSelectedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
