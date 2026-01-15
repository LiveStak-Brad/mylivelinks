import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface PortfolioManagerProps {
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  colors: {
    bg: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
  };
}

type MediaType = 'image' | 'video' | 'link';

export default function PortfolioManager({
  profileId,
  isOpen,
  onClose,
  onSave,
  colors,
}: PortfolioManagerProps) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('link');
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setDescription('');
    setMediaType('link');
    setMediaUrl('');
    setThumbnailUrl('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!mediaUrl.trim()) {
      Alert.alert('Required', 'Please enter a URL for your portfolio item.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        profile_id: profileId,
        title: title.trim() || null,
        subtitle: subtitle.trim() || null,
        description: description.trim() || null,
        media_type: mediaType,
        media_url: mediaUrl.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        sort_order: 0,
      };

      // Insert directly since RPC may not be deployed
      const { error } = await supabase
        .from('profile_portfolio')
        .insert(payload);

      if (error) {
        console.error('[PortfolioManager] Save error:', error);
        Alert.alert('Error', error.message || 'Failed to save portfolio item');
        return;
      }

      resetForm();
      onSave();
      onClose();
    } catch (error: any) {
      console.error('[PortfolioManager] Save error:', error);
      Alert.alert('Error', error?.message || 'Failed to save portfolio item');
    } finally {
      setSaving(false);
    }
  };

  const mediaTypes: { value: MediaType; label: string; icon: string }[] = [
    { value: 'link', label: 'Link', icon: 'link' },
    { value: 'image', label: 'Image', icon: 'image' },
    { value: 'video', label: 'Video', icon: 'videocam' },
  ];

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Add Portfolio Item</Text>
          <Pressable onPress={handleSave} style={styles.headerButton} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.headerButtonText, { color: colors.primary, fontWeight: '600' }]}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Media Type Selector */}
          <Text style={[styles.label, { color: colors.text }]}>Type</Text>
          <View style={styles.mediaTypeRow}>
            {mediaTypes.map((type) => (
              <Pressable
                key={type.value}
                style={[
                  styles.mediaTypeButton,
                  { 
                    backgroundColor: mediaType === type.value ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setMediaType(type.value)}
              >
                <Ionicons 
                  name={type.icon as any} 
                  size={20} 
                  color={mediaType === type.value ? '#FFFFFF' : colors.text} 
                />
                <Text 
                  style={[
                    styles.mediaTypeLabel, 
                    { color: mediaType === type.value ? '#FFFFFF' : colors.text }
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Title */}
          <Text style={[styles.label, { color: colors.text }]}>Title (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g., My Latest Project"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          {/* Subtitle */}
          <Text style={[styles.label, { color: colors.text }]}>Subtitle (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g., Web Design"
            placeholderTextColor={colors.textSecondary}
            value={subtitle}
            onChangeText={setSubtitle}
          />

          {/* Media URL */}
          <Text style={[styles.label, { color: colors.text }]}>
            {mediaType === 'link' ? 'Link URL' : mediaType === 'image' ? 'Image URL' : 'Video URL'} *
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder={
              mediaType === 'link' 
                ? 'https://example.com/my-work' 
                : mediaType === 'image'
                ? 'https://example.com/image.jpg'
                : 'https://example.com/video.mp4'
            }
            placeholderTextColor={colors.textSecondary}
            value={mediaUrl}
            onChangeText={setMediaUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {/* Thumbnail URL (for videos/links) */}
          {(mediaType === 'video' || mediaType === 'link') && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Thumbnail URL (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="https://example.com/thumbnail.jpg"
                placeholderTextColor={colors.textSecondary}
                value={thumbnailUrl}
                onChangeText={setThumbnailUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </>
          )}

          {/* Description */}
          <Text style={[styles.label, { color: colors.text }]}>Description (optional)</Text>
          <TextInput
            style={[
              styles.input, 
              styles.textArea,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }
            ]}
            placeholder="Describe your work..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.bottomPadding} />
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  mediaTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  mediaTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});
