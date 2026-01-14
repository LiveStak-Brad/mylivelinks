import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';
import { useTheme } from '../../theme/useTheme';

type Feeling = {
  id: number;
  slug: string;
  emoji: string;
  label: string;
};

type Visibility = 'public' | 'friends' | 'followers';

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: string }[] = [
  { value: 'public', label: 'Public', icon: 'globe' },
  { value: 'followers', label: 'Followers', icon: 'users' },
  { value: 'friends', label: 'Friends Only', icon: 'user-check' },
];

interface FeedComposerModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

type UserProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FeedComposerModal({
  visible,
  onClose,
  onPostCreated,
}: FeedComposerModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { mode, colors } = useTheme();

  const [textContent, setTextContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<Feeling | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('public');

  const [feelings, setFeelings] = useState<Feeling[]>([]);
  const [loadingFeelings, setLoadingFeelings] = useState(false);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const isDark = mode === 'dark';

  // Fetch user profile when modal opens
  useEffect(() => {
    if (!visible || !user) return;

    const fetchProfile = async () => {
      try {
        const { data, error: profileErr } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (!profileErr && data) {
          setProfile({
            username: data.username ?? null,
            display_name: data.display_name ?? null,
            avatar_url: data.avatar_url ?? null,
          });
        }
      } catch (e) {
        console.warn('[composer] failed to load profile:', e);
      }
    };

    fetchProfile();
  }, [visible, user]);

  // Fetch feelings on mount
  useEffect(() => {
    if (!visible) return;
    
    const fetchFeelings = async () => {
      setLoadingFeelings(true);
      try {
        // Try RPC first, fallback to direct table query
        const { data, error: rpcErr } = await supabase.rpc('get_post_feelings');
        if (!rpcErr && Array.isArray(data)) {
          setFeelings(data as Feeling[]);
          return;
        }
        
        // Fallback: query table directly if RPC doesn't exist
        const { data: tableData } = await supabase
          .from('post_feelings')
          .select('id, slug, emoji, label')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (Array.isArray(tableData)) {
          setFeelings(tableData as Feeling[]);
        }
      } catch (e: any) {
        console.warn('[composer] failed to load feelings:', e);
        // Feelings are optional, don't block the UI
      } finally {
        setLoadingFeelings(false);
      }
    };

    fetchFeelings();
  }, [visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setTextContent('');
      setMediaUri(null);
      setMediaType(null);
      setSelectedFeeling(null);
      setVisibility('public');
      setError(null);
      setShowFeelingPicker(false);
      setShowVisibilityPicker(false);
    }
  }, [visible]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        setMediaType('image');
      }
    } catch (e) {
      console.warn('[composer] image picker error:', e);
    }
  }, []);

  const pickVideo = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        videoMaxDuration: 60,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        setMediaType('video');
      }
    } catch (e) {
      console.warn('[composer] video picker error:', e);
    }
  }, []);

  const clearMedia = useCallback(() => {
    setMediaUri(null);
    setMediaType(null);
  }, []);

  const uploadMedia = useCallback(async (): Promise<string | null> => {
    if (!mediaUri || !user) return null;

    setUploading(true);
    try {
      // Get file extension from URI
      const uriParts = mediaUri.split('.');
      const extFromUri = uriParts.length > 1 ? uriParts.pop()?.toLowerCase() : null;
      const ext = extFromUri || (mediaType === 'video' ? 'mp4' : 'jpg');
      
      // Create unique file path
      const filePath = `${user.id}/feed/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

      // Fetch the local file as blob
      const response = await fetch(mediaUri);
      const blob = await response.blob();

      // Detect content type from blob or fallback
      const contentType = blob.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');

      const { error: uploadErr } = await supabase.storage
        .from('post-media')
        .upload(filePath, blob, {
          contentType,
          upsert: false,
        });

      if (uploadErr) throw new Error(uploadErr.message);

      // Get the public URL
      const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(filePath);
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get media URL');
      }

      return urlData.publicUrl;
    } catch (e: any) {
      console.error('[composer] upload error:', e);
      throw e;
    } finally {
      setUploading(false);
    }
  }, [mediaUri, mediaType, user]);

  const handlePost = useCallback(async () => {
    if (!user) {
      setError('Please log in to post');
      return;
    }

    const hasContent = textContent.trim() || mediaUri || selectedFeeling;
    if (!hasContent) {
      setError('Add some text, media, or a feeling');
      return;
    }

    setPosting(true);
    setError(null);

    try {
      let mediaPath: string | null = null;
      if (mediaUri) {
        mediaPath = await uploadMedia();
      }

      // Use direct table insert (RPC may not exist yet if migration not applied)
      const insertData: Record<string, any> = {
        author_id: user.id,
        text_content: textContent.trim() || null,
        media_url: mediaPath,
        visibility: visibility,
      };

      // Only include feeling_id if the column exists (migration may not be applied)
      if (selectedFeeling?.id) {
        insertData.feeling_id = selectedFeeling.id;
      }

      const { error: insertErr } = await supabase
        .from('posts')
        .insert(insertData);

      if (insertErr) throw new Error(insertErr.message);

      onPostCreated();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  }, [user, textContent, mediaUri, selectedFeeling, visibility, uploadMedia, onPostCreated, onClose]);

  const canPost = Boolean(textContent.trim() || mediaUri || selectedFeeling);
  const isLoading = uploading || posting;

  const visibilityOption = VISIBILITY_OPTIONS.find((o) => o.value === visibility) ?? VISIBILITY_OPTIONS[0];

  // Resolve avatar URL (may be a storage path or full URL)
  const resolveAvatarUrl = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // It's a storage path, get public URL
    const { data } = supabase.storage.from('avatars').getPublicUrl(url);
    return data?.publicUrl ?? null;
  };

  const avatarUrl = resolveAvatarUrl(profile?.avatar_url ?? null);
  const displayName = profile?.display_name || profile?.username || 'You';
  const initial = displayName.trim().slice(0, 1).toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top || 12 }]}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Create Post</Text>
          <Pressable
            onPress={handlePost}
            disabled={!canPost || isLoading}
            style={[
              styles.postBtn,
              { backgroundColor: canPost && !isLoading ? '#EC4899' : colors.border },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.mutedText }]}>{initial}</Text>
              )}
            </View>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {displayName}
              </Text>
              <Pressable
                onPress={() => setShowVisibilityPicker(true)}
                style={[styles.visibilityChip, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
              >
                <Feather name={visibilityOption.icon as any} size={12} color={colors.mutedText} />
                <Text style={[styles.visibilityText, { color: colors.mutedText }]}>
                  {visibilityOption.label}
                </Text>
                <Feather name="chevron-down" size={12} color={colors.mutedText} />
              </Pressable>
            </View>
          </View>

          {/* Text input */}
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.mutedText}
            multiline
            value={textContent}
            onChangeText={setTextContent}
            autoFocus
          />

          {/* Selected feeling */}
          {selectedFeeling && (
            <View style={styles.feelingRow}>
              <View style={[styles.feelingChip, { backgroundColor: isDark ? '#374151' : '#FEF3C7' }]}>
                <Text style={styles.feelingEmoji}>{selectedFeeling.emoji}</Text>
                <Text style={[styles.feelingLabel, { color: colors.text }]}>
                  feeling {selectedFeeling.label}
                </Text>
                <Pressable onPress={() => setSelectedFeeling(null)}>
                  <Feather name="x" size={14} color={colors.mutedText} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Media preview */}
          {mediaUri && (
            <View style={styles.mediaPreviewContainer}>
              <Image source={{ uri: mediaUri }} style={styles.mediaPreview} resizeMode="cover" />
              <Pressable onPress={clearMedia} style={styles.mediaRemoveBtn}>
                <Feather name="x" size={18} color="#FFFFFF" />
              </Pressable>
              {mediaType === 'video' && (
                <View style={styles.videoIndicator}>
                  <Feather name="video" size={14} color="#FFFFFF" />
                </View>
              )}
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Action bar */}
        <View style={[styles.actionBar, { borderTopColor: colors.border, paddingBottom: insets.bottom || 12 }]}>
          <Pressable onPress={pickImage} style={styles.actionBtn}>
            <Feather name="image" size={22} color="#22C55E" />
          </Pressable>
          <Pressable onPress={pickVideo} style={styles.actionBtn}>
            <Feather name="video" size={22} color="#EF4444" />
          </Pressable>
          <Pressable onPress={() => setShowFeelingPicker(true)} style={styles.actionBtn}>
            <Feather name="smile" size={22} color="#F59E0B" />
          </Pressable>
        </View>

        {/* Feeling Picker Modal */}
        <Modal
          visible={showFeelingPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFeelingPicker(false)}
        >
          <Pressable style={styles.pickerBackdrop} onPress={() => setShowFeelingPicker(false)}>
            <View
              style={[styles.pickerCard, { backgroundColor: colors.surface, paddingBottom: insets.bottom || 20 }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>How are you feeling?</Text>
                <Pressable onPress={() => setShowFeelingPicker(false)}>
                  <Feather name="x" size={20} color={colors.mutedText} />
                </Pressable>
              </View>
              {loadingFeelings ? (
                <View style={styles.pickerLoading}>
                  <ActivityIndicator size="small" color="#EC4899" />
                </View>
              ) : (
                <FlatList
                  data={feelings}
                  numColumns={4}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={styles.feelingsGrid}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        setSelectedFeeling(item);
                        setShowFeelingPicker(false);
                      }}
                      style={[
                        styles.feelingGridItem,
                        selectedFeeling?.id === item.id && styles.feelingGridItemSelected,
                      ]}
                    >
                      <Text style={styles.feelingGridEmoji}>{item.emoji}</Text>
                      <Text
                        style={[styles.feelingGridLabel, { color: colors.mutedText }]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  )}
                />
              )}
            </View>
          </Pressable>
        </Modal>

        {/* Visibility Picker Modal */}
        <Modal
          visible={showVisibilityPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowVisibilityPicker(false)}
        >
          <Pressable style={styles.pickerBackdrop} onPress={() => setShowVisibilityPicker(false)}>
            <View
              style={[styles.visibilityPickerCard, { backgroundColor: colors.surface }]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={[styles.pickerTitle, { color: colors.text, marginBottom: 12 }]}>
                Who can see this?
              </Text>
              {VISIBILITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setVisibility(opt.value);
                    setShowVisibilityPicker(false);
                  }}
                  style={[
                    styles.visibilityOption,
                    visibility === opt.value && { backgroundColor: isDark ? '#374151' : '#EEF2FF' },
                  ]}
                >
                  <Feather name={opt.icon as any} size={18} color={colors.text} />
                  <Text style={[styles.visibilityOptionText, { color: colors.text }]}>{opt.label}</Text>
                  {visibility === opt.value && (
                    <Feather name="check" size={18} color="#EC4899" style={{ marginLeft: 'auto' }} />
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  authorInfo: {
    flex: 1,
    gap: 4,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
  },
  visibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    fontSize: 18,
    lineHeight: 26,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  feelingRow: {
    marginTop: 12,
  },
  feelingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  feelingEmoji: {
    fontSize: 16,
  },
  feelingLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  mediaPreviewContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  mediaRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorRow: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  pickerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  feelingsGrid: {
    padding: 12,
  },
  feelingGridItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    margin: 4,
    borderRadius: 12,
  },
  feelingGridItemSelected: {
    backgroundColor: 'rgba(236,72,153,0.15)',
  },
  feelingGridEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  feelingGridLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  visibilityPickerCard: {
    position: 'absolute',
    top: '30%',
    left: 24,
    right: 24,
    borderRadius: 16,
    padding: 16,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  visibilityOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
