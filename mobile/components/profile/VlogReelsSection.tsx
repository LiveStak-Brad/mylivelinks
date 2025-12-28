import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Modal, Button } from '../ui';

export type VlogItem = {
  id: string;
  video_url: string;
  caption: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  created_at: string;
};

type Props = {
  profileId: string;
  isOwner: boolean;
  items: VlogItem[];
  onItemsChange: (next: VlogItem[]) => void;
  cardOpacity?: number;
  accentColor?: string;
  title?: string;
  contentLabel?: string;
};

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

async function uploadVlogVideo(profileId: string, vlogId: string, uri: string, mimeType: string | null) {
  const filePath = `${profileId}/vlogs/${vlogId}/video`;
  const blob = await fetch(uri).then((r) => r.blob());
  const { error } = await supabase.storage.from('profile-media').upload(filePath, blob, {
    contentType: mimeType || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('profile-media').getPublicUrl(filePath);
  if (!data?.publicUrl) throw new Error('Failed to get public URL');
  return data.publicUrl;
}

export function VlogReelsSection({
  profileId,
  isOwner,
  items,
  onItemsChange,
  cardOpacity = 0.95,
  accentColor = '#5E9BFF',
  title,
  contentLabel,
}: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity, accentColor), [theme, cardOpacity, accentColor]);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerActiveIndex, setViewerActiveIndex] = useState(0);

  const [editorOpen, setEditorOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedMime, setPickedMime] = useState<string | null>(null);
  const [pickedDurationSeconds, setPickedDurationSeconds] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const listRef = useRef<FlatList<VlogItem>>(null);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const next = viewableItems?.[0]?.index;
      if (typeof next === 'number') {
        setViewerActiveIndex(next);
      }
    }
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });

  const openAdd = () => {
    setCaption('');
    setPickedUri(null);
    setPickedMime(null);
    setPickedDurationSeconds(null);
    setEditorOpen(true);
  };

  const pickVideo = useCallback(async () => {
    try {
      let ImagePicker: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        ImagePicker = require('expo-image-picker');
      } catch {
        Alert.alert('Uploader not installed', "Install expo-image-picker to enable uploads.");
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) {
        Alert.alert('Permission required', 'Please allow photo library access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
        allowsEditing: false,
      });
      if (result?.canceled) return;
      const asset = Array.isArray(result?.assets) ? result.assets[0] : null;
      if (!asset?.uri) return;

      // duration is in ms on some platforms, seconds on others; normalize to seconds.
      const rawDur = (asset as any)?.duration;
      const durSeconds =
        typeof rawDur === 'number'
          ? rawDur > 1000
            ? Math.ceil(rawDur / 1000)
            : Math.ceil(rawDur)
          : null;

      setPickedUri(asset.uri);
      setPickedMime(typeof asset?.mimeType === 'string' ? asset.mimeType : null);
      setPickedDurationSeconds(durSeconds);
    } catch (e: any) {
      Alert.alert('Pick failed', String(e?.message || e || 'Failed to pick video'));
    }
  }, []);

  const refreshFromRpc = useCallback(async () => {
    const { data: list, error } = await supabase.rpc('get_vlogs', { p_profile_id: profileId });
    if (error) throw error;
    const next = (Array.isArray(list) ? list : []).map((r: any) => ({
      id: String(r.id),
      video_url: String(r.video_url || ''),
      caption: r.caption ?? null,
      thumbnail_url: r.thumbnail_url ?? null,
      duration_seconds: Number(r.duration_seconds || 0),
      created_at: String(r.created_at || ''),
    })) as VlogItem[];
    onItemsChange(next);
  }, [onItemsChange, profileId]);

  const save = useCallback(async () => {
    if (!pickedUri) {
      Alert.alert('Video required', 'Please pick a video file.');
      return;
    }

    const duration = pickedDurationSeconds;
    if (typeof duration === 'number' && duration > 60) {
      Alert.alert('Too long', 'VLOG must be 60 seconds or less.');
      return;
    }

    setSaving(true);
    try {
      const vlogId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const videoUrl = await uploadVlogVideo(profileId, vlogId, pickedUri, pickedMime);

      // If duration is missing from picker, we still try; DB will enforce <=60.
      const payload: any = {
        video_url: videoUrl,
        caption: caption.trim() || null,
        duration_seconds: typeof duration === 'number' ? duration : 60,
      };

      const { error } = await supabase.rpc('create_vlog', { p_payload: payload });
      if (error) throw error;

      await refreshFromRpc();
      setEditorOpen(false);
    } catch (e: any) {
      console.error('[VlogReelsSection] save failed', e);
      Alert.alert('Upload failed', String(e?.message || 'Could not upload VLOG.'));
    } finally {
      setSaving(false);
    }
  }, [caption, pickedDurationSeconds, pickedMime, pickedUri, profileId, refreshFromRpc]);

  const deleteItem = useCallback(
    async (row: VlogItem) => {
      Alert.alert('Delete VLOG?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_vlog', { p_id: row.id });
              if (error) throw error;
              await refreshFromRpc();
            } catch (e: any) {
              console.error('[VlogReelsSection] delete failed', e);
              Alert.alert('Delete failed', String(e?.message || 'Could not delete VLOG.'));
            }
          },
        },
      ]);
    },
    [refreshFromRpc]
  );

  const windowW = Dimensions.get('window').width;
  const windowH = Dimensions.get('window').height;
  const tileSize = (windowW - 16 * 2 - 2 * 2) / 3;
  const label = String(contentLabel || 'reels');
  const titleText = String(title || '🎞️ Reels');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{titleText}</Text>
        {isOwner && (
          <Pressable onPress={openAdd} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add VLOG</Text>
          </Pressable>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎞️</Text>
          <Text style={styles.emptyTitle}>No {label} yet</Text>
          <Text style={styles.emptyDescription}>Short-form VLOG videos (≤ 60s) will appear here.</Text>
          {isOwner && (
            <Pressable style={styles.ctaButton} onPress={openAdd}>
              <Text style={styles.ctaButtonText}>Add VLOG</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.gridWrap}>
          {items.map((row, idx) => (
            <Pressable
              key={row.id}
              onPress={() => {
                setViewerIndex(idx);
                setViewerActiveIndex(idx);
                setViewerOpen(true);
              }}
              style={[styles.tile, { width: tileSize, height: tileSize }]}
            >
              <Video
                source={{ uri: row.video_url }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isMuted
              />
              <View style={styles.tileOverlay}>
                <View style={styles.durationPill}>
                  <Text style={styles.durationText}>{formatDuration(row.duration_seconds)}</Text>
                </View>
              </View>

              {isOwner && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    void deleteItem(row);
                  }}
                  style={styles.tileDelete}
                >
                  <Ionicons name="trash" size={16} color="#fff" />
                </Pressable>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <RNModal visible={viewerOpen} animationType="slide" onRequestClose={() => setViewerOpen(false)}>
        <View style={styles.viewerScreen}>
          <View style={styles.viewerTopBar}>
            <Pressable onPress={() => setViewerOpen(false)} style={styles.viewerIconBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
            {isOwner && items[viewerActiveIndex] ? (
              <Pressable
                onPress={() => {
                  const row = items[viewerActiveIndex];
                  if (row) void deleteItem(row);
                }}
                style={[styles.viewerIconBtn, { backgroundColor: 'rgba(220,38,38,0.7)' }]}
              >
                <Ionicons name="trash" size={18} color="#fff" />
              </Pressable>
            ) : (
              <View style={{ width: 42 }} />
            )}
          </View>

          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(it) => it.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={windowH}
            snapToAlignment="start"
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({ length: windowH, offset: windowH * index, index })}
            onScrollToIndexFailed={() => {
              // ignore
            }}
            viewabilityConfig={viewabilityConfig.current as any}
            onViewableItemsChanged={onViewableItemsChanged.current as any}
            renderItem={({ item, index }) => (
              <View style={[styles.viewerPage, { width: windowW, height: windowH }]}>
                <Video
                  source={{ uri: item.video_url }}
                  style={StyleSheet.absoluteFill}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={index === viewerActiveIndex}
                  isLooping
                  useNativeControls
                />

                {!!item.caption && (
                  <View style={styles.viewerCaptionWrap}>
                    <Text style={styles.viewerCaptionText}>{String(item.caption)}</Text>
                  </View>
                )}
              </View>
            )}
          />
        </View>
      </RNModal>

      <Modal visible={editorOpen} onRequestClose={() => (saving ? null : setEditorOpen(false))}>
        <View style={{ gap: 12 }}>
          <Text style={styles.modalTitle}>Add VLOG</Text>

          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>Caption (optional)</Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Say something…"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Button title={pickedUri ? 'Change Video' : 'Pick Video'} variant="secondary" onPress={() => void pickVideo()} />
            {pickedUri ? (
              <Text style={styles.pickedText}>
                Selected{typeof pickedDurationSeconds === 'number' ? ` • ${pickedDurationSeconds}s` : ''}
              </Text>
            ) : null}
          </View>

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>VLOG must be 60 seconds or less. Vertical videos work best.</Text>
          </View>

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="secondary" onPress={() => setEditorOpen(false)} />
            <Button title={saving ? 'Uploading…' : 'Upload'} onPress={() => void save()} disabled={saving} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(theme: ThemeDefinition, cardOpacity: number, accentColor: string) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    container: { paddingVertical: 18 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    title: { fontSize: 20, fontWeight: '900', color: theme.colors.textPrimary },
    addButton: { backgroundColor: accentColor, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
    addButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },

    emptyState: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 40,
      marginHorizontal: 16,
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.55 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary, marginBottom: 8 },
    emptyDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 18,
    },
    ctaButton: { backgroundColor: accentColor, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    ctaButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },

    gridWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 2,
      paddingHorizontal: 16,
    },
    tile: {
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    tileOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      padding: 6,
    },
    durationPill: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    durationText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    tileDelete: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 32,
      height: 32,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '900' },
    viewerScreen: { flex: 1, backgroundColor: '#000' },
    viewerTopBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      paddingTop: 44,
      paddingHorizontal: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    viewerIconBtn: {
      width: 42,
      height: 42,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewerPage: {
      backgroundColor: '#000',
    },
    viewerCaptionWrap: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 54,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 14,
    },
    viewerCaptionText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },

    fieldLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '800' },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.textPrimary,
      backgroundColor: theme.tokens.surfaceModal,
      fontWeight: '700',
    },
    pickedText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
    hintBox: {
      borderWidth: 1,
      borderColor: theme.mode === 'light' ? 'rgba(94,155,255,0.25)' : 'rgba(94,155,255,0.35)',
      backgroundColor: theme.mode === 'light' ? 'rgba(94,155,255,0.08)' : 'rgba(94,155,255,0.14)',
      padding: 12,
      borderRadius: 14,
    },
    hintText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800' },
    modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  });
}
