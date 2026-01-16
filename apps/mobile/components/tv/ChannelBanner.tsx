/**
 * Channel Banner Component (Mobile)
 * 
 * Displays the channel banner for [username]TV pages.
 * Shows uploaded banner if exists, otherwise auto-generated default.
 * Owner can edit/remove banner.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = SCREEN_WIDTH * (5 / 16); // 16:5 aspect ratio

const BUCKET_NAME = 'channel_banners';

/**
 * Gradient presets for auto-generated banners
 */
const BANNER_GRADIENTS = [
  { start: '#7c3aed', end: '#ec4899' }, // Purple to Pink
  { start: '#6366f1', end: '#8b5cf6' }, // Indigo to Purple
  { start: '#ec4899', end: '#f97316' }, // Pink to Orange
  { start: '#8b5cf6', end: '#06b6d4' }, // Purple to Cyan
  { start: '#3b82f6', end: '#8b5cf6' }, // Blue to Purple
  { start: '#f43f5e', end: '#a855f7' }, // Rose to Purple
];

function hashUsername(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

interface ChannelBannerProps {
  profile: {
    id: string;
    username: string;
    display_name?: string | null;
    channel_banner_url?: string | null;
  };
  isOwner: boolean;
  onBannerUpdate?: (newUrl: string | null) => void;
  colors: any;
}

export default function ChannelBanner({ 
  profile, 
  isOwner, 
  onBannerUpdate,
  colors 
}: ChannelBannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const hasCustomBanner = !!profile.channel_banner_url;
  const gradientIndex = hashUsername(profile.username) % BANNER_GRADIENTS.length;
  const gradient = BANNER_GRADIENTS[gradientIndex];

  const pickImage = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a banner.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadBanner(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, [profile.id]);

  const uploadBanner = async (uri: string) => {
    setIsUploading(true);
    setIsEditing(false);

    try {
      // Get file extension from URI
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `banner.${ext}`;
      const filePath = `${profile.id}/${fileName}`;

      // Fetch the image as blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get banner URL');
      }

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile in DB (authoritative)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          channel_banner_url: publicUrl,
          channel_banner_updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      onBannerUpdate?.(publicUrl);
      Alert.alert('Success', 'Channel banner updated!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to upload banner');
    } finally {
      setIsUploading(false);
    }
  };

  const removeBanner = async () => {
    Alert.alert(
      'Remove Banner',
      'Are you sure you want to remove your channel banner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsRemoving(true);
            setIsEditing(false);

            try {
              // Update DB first (authoritative)
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  channel_banner_url: null,
                  channel_banner_updated_at: new Date().toISOString(),
                })
                .eq('id', profile.id);

              if (updateError) {
                throw new Error(updateError.message);
              }

              // Best-effort storage delete
              try {
                const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
                const paths = extensions.map(ext => `${profile.id}/banner.${ext}`);
                await supabase.storage.from(BUCKET_NAME).remove(paths);
              } catch (deleteErr) {
                console.warn('Storage delete failed (non-blocking):', deleteErr);
              }

              onBannerUpdate?.(null);
            } catch (error) {
              console.error('Remove error:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove banner');
            } finally {
              setIsRemoving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Banner Display */}
      <View style={styles.bannerContainer}>
        {isUploading || isRemoving ? (
          <View style={[styles.banner, styles.loadingBanner, { backgroundColor: gradient.start }]}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>
              {isUploading ? 'Uploading...' : 'Removing...'}
            </Text>
          </View>
        ) : hasCustomBanner ? (
          <Image
            source={{ uri: profile.channel_banner_url! }}
            style={styles.banner}
            resizeMode="cover"
          />
        ) : (
          // Auto-generated gradient banner
          <View style={[styles.banner, { backgroundColor: gradient.start }]}>
            <View style={[StyleSheet.absoluteFill, styles.gradientOverlay, { backgroundColor: gradient.end }]} />
            <View style={styles.defaultBannerContent}>
              <Text style={styles.defaultBannerTitle}>
                {profile.display_name || profile.username}TV
              </Text>
              <Text style={styles.defaultBannerSubtitle}>
                Welcome to my channel
              </Text>
            </View>
          </View>
        )}

        {/* Owner Edit Button */}
        {isOwner && !isUploading && !isRemoving && (
          <Pressable
            onPress={() => setIsEditing(true)}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
          >
            <Ionicons name="camera" size={16} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        )}
      </View>

      {/* Edit Modal */}
      <Modal
        visible={isEditing}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditing(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsEditing(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Channel Banner
            </Text>

            <Pressable
              onPress={pickImage}
              style={({ pressed }) => [styles.modalButton, styles.uploadButton, pressed && styles.pressed]}
            >
              <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
              <Text style={styles.modalButtonText}>Upload Image</Text>
            </Pressable>

            {hasCustomBanner && (
              <Pressable
                onPress={removeBanner}
                style={({ pressed }) => [styles.modalButton, styles.removeButton, pressed && styles.pressed]}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>Remove Banner</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => setIsEditing(false)}
              style={({ pressed }) => [styles.modalButton, styles.cancelButton, pressed && styles.pressed]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.mutedText }]}>Cancel</Text>
            </Pressable>

            <Text style={[styles.helpText, { color: colors.mutedText }]}>
              Recommended: 1280×400 or larger
            </Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  bannerContainer: {
    position: 'relative',
    width: '100%',
    height: BANNER_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  loadingBanner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  gradientOverlay: {
    opacity: 0.5,
  },
  defaultBannerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  defaultBannerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  defaultBannerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#8B5CF6',
  },
  removeButton: {
    backgroundColor: '#EF4444',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
