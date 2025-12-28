import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Modal, Button, Checkbox } from '../ui';
import { VideoPlaylistPlayer, type VideoPlaylistItem } from './VideoPlaylistPlayer';

export type ComedySpecialType = 'upload' | 'youtube';

export type ComedySpecialItem = {
  id: string;
  title: string;
  description?: string | null;
  video_type: ComedySpecialType;
  video_url: string;
  youtube_id?: string | null;
};

type Props = {
  profileId: string;
  isOwner: boolean;
  items: ComedySpecialItem[];
  onItemsChange: (next: ComedySpecialItem[]) => void;
  cardOpacity?: number;
  accentColor?: string;
};

function getYoutubeIdFromUrl(url: string): string | null {
  const v = String(url || '').trim();
  if (!v) return null;
  const shortMatch = v.match(/youtu\.be\/([^?&/]+)/i);
  if (shortMatch?.[1]) return shortMatch[1];
  const watchMatch = v.match(/[?&]v=([^?&/]+)/i);
  if (watchMatch?.[1]) return watchMatch[1];
  const embedMatch = v.match(/youtube\.com\/(?:embed|shorts)\/([^?&/]+)/i);
  if (embedMatch?.[1]) return embedMatch[1];
  return null;
}

function safeId() {
  try {
    // eslint-disable-next-line no-undef
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      // eslint-disable-next-line no-undef
      return (crypto as any).randomUUID();
    }
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function uploadSpecialVideo(profileId: string, specialId: string, uri: string, mimeType: string | null, upsert: boolean) {
  const filePath = `${profileId}/comedy/specials/${specialId}/video`;
  const blob = await fetch(uri).then((r) => r.blob());
  const { error } = await supabase.storage.from('profile-media').upload(filePath, blob, {
    contentType: mimeType || undefined,
    upsert,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('profile-media').getPublicUrl(filePath);
  if (!data?.publicUrl) throw new Error('Failed to get public URL');
  return data.publicUrl;
}

async function pickVideo(setPickedUri: (v: string | null) => void, setPickedMime: (v: string | null) => void) {
  try {
    let ImagePicker: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ImagePicker = require('expo-image-picker');
    } catch {
      Alert.alert('Uploader not installed', 'Install expo-image-picker to enable uploads.');
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
    setPickedUri(asset.uri);
    setPickedMime(typeof asset?.mimeType === 'string' ? asset.mimeType : null);
  } catch (e: any) {
    Alert.alert('Pick failed', String(e?.message || e || 'Failed to pick video'));
  }
}

export function ComedySpecialsSection({
  profileId,
  isOwner,
  items,
  onItemsChange,
  cardOpacity = 0.95,
  accentColor = '#5E9BFF',
}: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity, accentColor), [theme, cardOpacity, accentColor]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ComedySpecialItem | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<ComedySpecialType>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedMime, setPickedMime] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setSourceType('youtube');
    setYoutubeUrl('');
    setPickedUri(null);
    setPickedMime(null);
    setRightsConfirmed(false);
    setEditorOpen(true);
  };

  const openEdit = (row: ComedySpecialItem) => {
    setEditing(row);
    setTitle(row.title || '');
    setDescription(row.description || '');
    setSourceType(row.video_type);
    setYoutubeUrl(row.video_type === 'youtube' ? row.video_url : '');
    setPickedUri(null);
    setPickedMime(null);
    setRightsConfirmed(false);
    setEditorOpen(true);
  };

  const save = async () => {
    const cleanedTitle = title.trim();
    if (!cleanedTitle) {
      Alert.alert('Title required', 'Please enter a title.');
      return;
    }
    if (!rightsConfirmed) {
      Alert.alert('Rights confirmation required', 'You must confirm you have rights/permission to upload.');
      return;
    }

    setSaving(true);
    try {
      let videoType: ComedySpecialType = sourceType;
      let videoUrl = editing?.video_url ?? '';
      let rpcId: string | null = editing?.id ?? null;

      if (sourceType === 'youtube') {
        const ytId = getYoutubeIdFromUrl(youtubeUrl);
        if (!ytId) {
          Alert.alert('Invalid YouTube URL', 'Please paste a valid YouTube URL.');
          return;
        }
        videoUrl = youtubeUrl.trim();
        videoType = 'youtube';
      } else {
        const uploadId = editing?.id ?? safeId();
        if (pickedUri) {
          videoUrl = await uploadSpecialVideo(profileId, uploadId, pickedUri, pickedMime, Boolean(editing));
        }
        if (!videoUrl) {
          Alert.alert('Video required', 'Please pick a video file to upload.');
          return;
        }
        videoType = 'upload';
      }

      const payload: any = {
        title: cleanedTitle,
        description: description.trim() || null,
        video_type: videoType,
        video_url: videoUrl,
        rights_confirmed: true,
      };

      const { error } = await supabase.rpc('upsert_comedy_special', { p_id: rpcId, p_payload: payload });
      if (error) throw error;

      const { data: list, error: listErr } = await supabase.rpc('get_comedy_specials', { p_profile_id: profileId });
      if (listErr) throw listErr;
      const next = (Array.isArray(list) ? list : []).map((r: any) => ({
        id: String(r.id),
        title: String(r.title || ''),
        description: r.description ?? null,
        video_type: r.video_type as ComedySpecialType,
        video_url: String(r.video_url || ''),
        youtube_id: r.youtube_id ?? null,
      })) as ComedySpecialItem[];

      onItemsChange(next);
      setEditorOpen(false);
    } catch (e: any) {
      console.error('[ComedySpecialsSection] save failed', e);
      Alert.alert('Save failed', String(e?.message || 'Could not save special.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (row: ComedySpecialItem) => {
    Alert.alert('Delete special?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.rpc('delete_comedy_special', { p_id: row.id });
            if (error) throw error;
            const next = items.filter((x) => x.id !== row.id);
            onItemsChange(next);
          } catch (e: any) {
            console.error('[ComedySpecialsSection] delete failed', e);
            Alert.alert('Delete failed', String(e?.message || 'Could not delete special.'));
          }
        },
      },
    ]);
  };

  const playlistItems: VideoPlaylistItem[] = items.map((it) => ({
    id: it.id,
    title: it.title,
    subtitle: it.description ?? null,
    video_type: it.video_type,
    video_url: it.video_url,
    youtube_id: it.youtube_id ?? null,
  }));

  return (
    <>
      <VideoPlaylistPlayer
        title="🎞️ Comedy Specials"
        items={playlistItems}
        isOwner={isOwner}
        onAdd={openAdd}
        onEdit={(it) => {
          const row = items.find((r) => r.id === it.id);
          if (row) openEdit(row);
        }}
        onDelete={(it) => {
          const row = items.find((r) => r.id === it.id);
          if (row) void deleteItem(row);
        }}
        accentColor={accentColor}
        cardOpacity={cardOpacity}
        emptyTitle="No Comedy Specials Yet"
        emptyText="Add an uploaded video or a YouTube URL so visitors can watch your specials."
        emptyOwnerCTA="Add Special"
      />

      <Modal visible={editorOpen} onRequestClose={() => (saving ? null : setEditorOpen(false))}>
        <View style={{ gap: 12 }}>
          <Text style={styles.modalTitle}>{editing ? 'Edit Comedy Special' : 'Add Comedy Special'}</Text>

          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Live at The Apollo"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Short blurb"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, styles.textArea]}
              multiline
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Source</Text>
            <View style={styles.sourceRow}>
              <Pressable onPress={() => setSourceType('youtube')} style={[styles.sourceChip, sourceType === 'youtube' ? styles.sourceChipActive : null]}>
                <Text style={[styles.sourceChipText, sourceType === 'youtube' ? styles.sourceChipTextActive : null]}>YouTube URL</Text>
              </Pressable>
              <Pressable onPress={() => setSourceType('upload')} style={[styles.sourceChip, sourceType === 'upload' ? styles.sourceChipActive : null]}>
                <Text style={[styles.sourceChipText, sourceType === 'upload' ? styles.sourceChipTextActive : null]}>Upload</Text>
              </Pressable>
            </View>
          </View>

          {sourceType === 'youtube' ? (
            <View style={{ gap: 6 }}>
              <Text style={styles.fieldLabel}>YouTube URL</Text>
              <TextInput
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="https://www.youtube.com/watch?v=…"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Button title={pickedUri ? 'Change Video' : 'Pick Video'} variant="secondary" onPress={() => void pickVideo(setPickedUri, setPickedMime)} />
              {pickedUri ? <Text style={styles.pickedText}>Selected</Text> : null}
            </View>
          )}

          <View style={styles.rightsBox}>
            <Checkbox
              value={rightsConfirmed}
              onValueChange={setRightsConfirmed}
              label="I own the rights or have permission to upload this content."
            />
            <Text style={styles.warningText}>Posting copyrighted work without rights may risk profile deletion.</Text>
          </View>

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="secondary" onPress={() => setEditorOpen(false)} />
            <Button title={saving ? 'Saving…' : editing ? 'Save' : 'Add'} onPress={() => void save()} disabled={saving} />
          </View>
        </View>
      </Modal>
    </>
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
    title: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
    addButton: { backgroundColor: accentColor, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
    addButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    scrollContent: { paddingHorizontal: 16, gap: 12 },
    videoCard: {
      width: 240,
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
    },
    videoCardActive: { borderColor: accentColor },
    thumb: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.10)' : 'rgba(255,255,255,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbEmoji: { fontSize: 34, opacity: 0.9 },
    videoMeta: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },
    videoTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' },
    videoDescription: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 6, fontWeight: '700' },
    videoSource: { color: theme.colors.textMuted, fontSize: 12, marginTop: 6, fontWeight: '800' },
    cardActionsRow: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 0, flexWrap: 'wrap' },
    playPill: { backgroundColor: accentColor, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
    playPillText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    smallPill: {
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.10)' : 'rgba(255,255,255,0.08)',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
    },
    smallPillText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800' },
    deletePill: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    deletePillText: { color: theme.colors.danger },
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
    emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 8 },
    emptyDescription: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
    ctaButton: { backgroundColor: accentColor, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    ctaButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    modalTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '900' },
    modalSubtitle: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
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
    textArea: { minHeight: 84, textAlignVertical: 'top' },
    sourceRow: { flexDirection: 'row', gap: 10 },
    sourceChip: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.06)',
    },
    sourceChipActive: {
      borderColor: accentColor,
      backgroundColor: theme.mode === 'light' ? 'rgba(94,155,255,0.10)' : 'rgba(94,155,255,0.18)',
    },
    sourceChipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '800' },
    sourceChipTextActive: { color: accentColor },
    pickedText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
    rightsBox: {
      borderWidth: 1,
      borderColor: theme.mode === 'light' ? 'rgba(245,158,11,0.35)' : 'rgba(245,158,11,0.30)',
      backgroundColor: theme.mode === 'light' ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.12)',
      padding: 12,
      borderRadius: 14,
      gap: 6,
    },
    warningText: { color: theme.mode === 'light' ? '#92400E' : '#FCD34D', fontSize: 12, fontWeight: '800' },
    modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    playerBox: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' },
    video: { width: '100%', height: '100%', backgroundColor: '#000' },
    youtubeFallbackBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 },
    youtubeFallbackTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
    youtubeFallbackText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', textAlign: 'center' },
    youtubeOpenButton: { backgroundColor: accentColor, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
    youtubeOpenButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    youtubeHintText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  });
}
