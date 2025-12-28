import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { uploadProfileMediaFromUri } from '../../lib/profileMedia';
import { supabase } from '../../lib/supabase';

export type ProfileMusicTrack = {
  id: string;
  title: string;
  artist_name?: string | null;
  audio_url: string;
  cover_art_url?: string | null;
  sort_order?: number | null;
  rights_confirmed?: boolean | null;
};

type Props = {
  profileId: string;
  tracks: ProfileMusicTrack[];
  isOwner: boolean;
  onTracksChange?: (next: ProfileMusicTrack[]) => void;
  accentColor?: string;
  cardOpacity?: number;
};

function safeId() {
  return `tmp_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function AudioPlaylistPlayer({
  profileId,
  tracks,
  isOwner,
  onTracksChange,
  accentColor,
  cardOpacity = 0.95,
}: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, accentColor, cardOpacity), [theme, accentColor, cardOpacity]);

  const [uiTracks, setUiTracks] = useState<ProfileMusicTrack[]>(tracks);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileMusicTrack | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [pickedAudioUri, setPickedAudioUri] = useState<string | null>(null);
  const [pickedAudioMime, setPickedAudioMime] = useState<string | null>(null);
  const [pickedCoverUri, setPickedCoverUri] = useState<string | null>(null);
  const [pickedCoverMime, setPickedCoverMime] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const tracksRef = useRef<ProfileMusicTrack[]>(tracks);
  const currentIndexRef = useRef<number>(0);
  const currentTrack = uiTracks[currentIndex] ?? null;
  const canPlay = !!currentTrack?.audio_url;

  const loadFromDb = async () => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_music_tracks', { p_profile_id: profileId });
      if (error) throw error;
      const rows = Array.isArray(data) ? (data as any[]) : [];
      const next: ProfileMusicTrack[] = rows.map((r) => ({
        id: String((r as any)?.id ?? ''),
        title: String((r as any)?.title ?? ''),
        artist_name: (r as any)?.artist_name ?? null,
        audio_url: String((r as any)?.audio_url ?? ''),
        cover_art_url: (r as any)?.cover_art_url ?? null,
        sort_order: (r as any)?.sort_order ?? null,
        rights_confirmed: (r as any)?.rights_confirmed ?? null,
      }));
      setUiTracks(next);
      onTracksChange?.(next);
      setCurrentIndex((idx) => {
        const max = Math.max(next.length - 1, 0);
        return Math.min(Math.max(idx, 0), max);
      });
    } catch (e: any) {
      console.error('[AudioPlaylistPlayer] load failed', e);
      setUiTracks([]);
      onTracksChange?.([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    setUiTracks(tracks);
    setCurrentIndex((idx) => {
      const max = Math.max(tracks.length - 1, 0);
      return Math.min(Math.max(idx, 0), max);
    });
  }, [tracks]);

  useEffect(() => {
    tracksRef.current = uiTracks;
  }, [uiTracks]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  useEffect(() => {
    return () => {
      void (async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          }
        } catch {
          // ignore
        } finally {
          soundRef.current = null;
        }
      })();
    };
  }, []);

  const setTracks = (next: ProfileMusicTrack[]) => {
    setUiTracks(next);
    onTracksChange?.(next);
  };

  const persistReorder = async (next: ProfileMusicTrack[]) => {
    if (!isOwner) return;
    if (!profileId) return;
    try {
      const { error } = await supabase.rpc('reorder_music_tracks', {
        p_ordered_ids: next.map((t) => t.id),
      });
      if (error) throw error;
    } catch (e) {
      console.error('[AudioPlaylistPlayer] reorder failed', e);
      Alert.alert('Unable to reorder', 'Please try again.');
    }
  };

  const stop = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
      }
    } catch {
      // ignore
    } finally {
      setIsPlaying(false);
      setIsBuffering(false);
    }
  };

  const loadAndPlay = async (track: ProfileMusicTrack) => {
    if (!track.audio_url) return;
    try {
      setIsBuffering(true);
      // unload previous
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
        } catch {
          // ignore
        }
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audio_url },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          if ((status as any).isBuffering) {
            setIsBuffering(true);
          } else {
            setIsBuffering(false);
          }
          if (status.didJustFinish) {
            // cycle playlist
            if (uiTracks.length <= 1) {
              setIsPlaying(false);
              return;
            }
            setCurrentIndex((i) => (i + 1) % uiTracks.length);
            setIsPlaying(true);
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      setIsBuffering(false);
    } catch (e) {
      setIsPlaying(false);
      setIsBuffering(false);
      Alert.alert('Unable to play audio', 'Please check the audio URL and try again.');
    }
  };

  const togglePlay = async () => {
    if (!currentTrack?.audio_url) return;

    if (isPlaying) {
      try {
        await soundRef.current?.pauseAsync();
      } catch {
        // ignore
      }
      setIsPlaying(false);
      return;
    }

    // If we already have a sound loaded for this track, resume; otherwise reload
    try {
      const status = await soundRef.current?.getStatusAsync();
      if (status && status.isLoaded) {
        await soundRef.current?.playAsync();
        setIsPlaying(true);
        return;
      }
    } catch {
      // ignore -> reload below
    }

    await loadAndPlay(currentTrack);
  };

  const goNext = async () => {
    if (uiTracks.length === 0) return;
    const nextIndex = (currentIndex + 1) % uiTracks.length;
    setCurrentIndex(nextIndex);
    await loadAndPlay(uiTracks[nextIndex]);
  };

  const goPrev = async () => {
    if (uiTracks.length === 0) return;
    const prevIndex = (currentIndex - 1 + uiTracks.length) % uiTracks.length;
    setCurrentIndex(prevIndex);
    await loadAndPlay(uiTracks[prevIndex]);
  };

  const removeTrack = async (id: string) => {
    try {
      if (isOwner) {
        const { error } = await supabase.rpc('delete_music_track', { p_id: id });
        if (error) throw error;
      }
      const idx = uiTracks.findIndex((t) => t.id === id);
      const next = uiTracks.filter((t) => t.id !== id);
      setTracks(next);
      if (currentTrack?.id === id) {
        await stop();
      }
      if (next.length === 0) {
        setCurrentIndex(0);
        return;
      }
      if (idx >= 0) {
        setCurrentIndex((cur) => Math.min(cur, next.length - 1));
      }
    } catch (e: any) {
      Alert.alert('Delete failed', String(e?.message || 'Could not delete track.'));
    }
  };

  const moveTrack = async (id: string, dir: -1 | 1) => {
    const idx = uiTracks.findIndex((t) => t.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= uiTracks.length) return;
    const next = [...uiTracks];
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);
    setTracks(next);
    // keep selection by id
    const selectedId = currentTrack?.id ?? item.id;
    setCurrentIndex(next.findIndex((t) => t.id === selectedId));

    if (isOwner) {
      try {
        const orderedIds = next.map((t) => t.id);
        const { error } = await supabase.rpc('reorder_music_tracks', { p_ordered_ids: orderedIds });
        if (error) throw error;
      } catch (e: any) {
        Alert.alert('Reorder failed', String(e?.message || 'Could not reorder tracks.'));
      }
    }
  };

  const openAdd = () => {
    setEditing(null);
    setNewTitle('');
    setNewArtist('');
    setNewAudioUrl('');
    setNewCoverUrl('');
    setPickedAudioUri(null);
    setPickedAudioMime(null);
    setPickedCoverUri(null);
    setPickedCoverMime(null);
    setRightsConfirmed(false);
    setAddOpen(true);
  };

  const openEdit = (t: ProfileMusicTrack) => {
    setEditing(t);
    setNewTitle(t.title || '');
    setNewArtist(t.artist_name || '');
    setNewAudioUrl(t.audio_url || '');
    setNewCoverUrl(t.cover_art_url || '');
    setPickedAudioUri(null);
    setPickedAudioMime(null);
    setPickedCoverUri(null);
    setPickedCoverMime(null);
    setRightsConfirmed(false);
    setEditOpen(true);
  };

  const pickAudio = async () => {
    try {
      let DocumentPicker: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        DocumentPicker = require('expo-document-picker');
      } catch {
        Alert.alert('Uploader not installed', 'Install expo-document-picker to select audio files.');
        return;
      }

      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: false, copyToCacheDirectory: true });
      if (res?.canceled) return;
      const asset = Array.isArray(res?.assets) ? res.assets[0] : null;
      const uri = typeof asset?.uri === 'string' ? asset.uri : null;
      if (!uri) return;
      setPickedAudioUri(uri);
      setPickedAudioMime(typeof asset?.mimeType === 'string' ? asset.mimeType : 'audio/mpeg');
    } catch (e: any) {
      Alert.alert('Pick failed', String(e?.message || e || 'Failed to pick audio'));
    }
  };

  const pickCover = async () => {
    try {
      let ImagePicker: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        ImagePicker = require('expo-image-picker');
      } catch {
        Alert.alert('Uploader not installed', 'Install expo-image-picker to select images.');
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) {
        Alert.alert('Permission required', 'Please allow photo library access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: false,
      });
      if (result?.canceled) return;
      const asset = Array.isArray(result?.assets) ? result.assets[0] : null;
      const uri = typeof asset?.uri === 'string' ? asset.uri : null;
      if (!uri) return;
      setPickedCoverUri(uri);
      setPickedCoverMime(typeof asset?.mimeType === 'string' ? asset.mimeType : 'image/jpeg');
    } catch (e: any) {
      Alert.alert('Pick failed', String(e?.message || e || 'Failed to pick image'));
    }
  };

  const submitAdd = async () => {
    const title = newTitle.trim();
    const artist = newArtist.trim();
    if (!title) return Alert.alert('Missing title', 'Track title is required.');
    if (!rightsConfirmed) return Alert.alert('Rights required', 'You must confirm you own the rights or have permission.');

    setSaving(true);
    try {
      // Build audio_url
      let audioUrl = newAudioUrl.trim();
      if (pickedAudioUri) {
        const idForPath = editing?.id || safeId();
        const { publicUrl } = await uploadProfileMediaFromUri({
          profileId,
          relativePath: `music/tracks/${idForPath}/audio`,
          uri: pickedAudioUri,
          opts: { contentType: pickedAudioMime, upsert: Boolean(editing), maxBytes: 50 * 1024 * 1024 },
        });
        audioUrl = publicUrl;
      }
      if (!audioUrl) return Alert.alert('Missing audio', 'Please provide an audio URL or upload an audio file.');

      // Build cover_art_url
      let cover = newCoverUrl.trim();
      if (pickedCoverUri) {
        const idForPath = editing?.id || safeId();
        const { publicUrl } = await uploadProfileMediaFromUri({
          profileId,
          relativePath: `music/tracks/${idForPath}/cover`,
          uri: pickedCoverUri,
          opts: { contentType: pickedCoverMime, upsert: Boolean(editing), maxBytes: 5 * 1024 * 1024 },
        });
        cover = publicUrl;
      }

      const payload: any = {
        title,
        artist_name: artist || null,
        audio_url: audioUrl,
        cover_art_url: cover || null,
        rights_confirmed: true,
        sort_order: uiTracks.length,
      };

      const { error } = await supabase.rpc('upsert_music_track', {
        p_id: editing?.id ?? null,
        p_payload: payload,
      });
      if (error) throw error;

      await loadFromDb();
      setAddOpen(false);
      setEditOpen(false);
      setPlaylistOpen(false);
    } catch (e: any) {
      Alert.alert('Save failed', String(e?.message || 'Could not save track.'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🎵</Text>
        <Text style={styles.emptyTitle}>Loading…</Text>
        <Text style={styles.emptyText}>Fetching your tracks.</Text>
      </View>
    );
  }

  if (uiTracks.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🎵</Text>
        <Text style={styles.emptyTitle}>No Tracks Yet</Text>
        <Text style={styles.emptyText}>Add a track to enable your playlist player.</Text>
        <Pressable onPress={openAdd} style={styles.primaryCta}>
          <Text style={styles.primaryCtaText}>Add Track</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>🎵 Music Showcase</Text>
          <Text style={styles.subtitle}>
            {currentTrack ? `Now playing: ${currentTrack.title}` : 'Add your first track'}
          </Text>
        </View>

        {isOwner && (
          <Pressable onPress={openAdd} style={styles.addButton}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        )}
      </View>

      {/* Player */}
      <View style={styles.playerCard}>
        <View style={styles.nowRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nowTitle} numberOfLines={1}>
              {currentTrack?.title ?? '—'}
            </Text>
            {!!currentTrack?.artist_name && (
              <Text style={styles.nowArtist} numberOfLines={1}>
                {currentTrack.artist_name}
              </Text>
            )}
            {isBuffering && <Text style={styles.bufferingText}>Buffering…</Text>}
            {!canPlay && (
              <Text style={styles.cantPlay}>This track needs an audio URL to play.</Text>
            )}
                <Ionicons name="list" size={18} color={styles._accent.color as any} />
                <Text style={styles.playlistButtonText}>Playlist ({uiTracks.length})</Text>
              </Pressable>
            </View>

            <View style={styles.controlsRow}>
              <Pressable onPress={goPrev} style={styles.controlBtn}>
                <Ionicons name="play-skip-back" size={20} color={theme.colors.textPrimary} />
              </Pressable>

              <Pressable
                onPress={togglePlay}
                style={[styles.playBtn, !canPlay && styles.playBtnDisabled]}
                disabled={!canPlay}
              >
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
              </Pressable>

              <Pressable onPress={goNext} style={styles.controlBtn}>
                <Ionicons name="play-skip-forward" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </>
      )}

      {/* Playlist Modal */}
      <Modal visible={playlistOpen} transparent animationType="fade" onRequestClose={() => setPlaylistOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPlaylistOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Playlist</Text>
              <Pressable onPress={() => setPlaylistOpen(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            {uiTracks.map((t, idx) => {
              const selected = t.id === currentTrack?.id;
              return (
                <View key={t.id} style={[styles.trackRow, selected && styles.trackRowSelected]}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={async () => {
                      setCurrentIndex(idx);
                      await loadAndPlay(t);
                      setPlaylistOpen(false);
                    }}
                  >
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {t.title}
                    </Text>
                    {!!t.artist_name && (
                      <Text style={styles.trackArtist} numberOfLines={1}>
                        {t.artist_name}
                      </Text>
                    )}
                  </Pressable>

                  {isOwner && (
                    <View style={styles.trackActions}>
                      <Pressable onPress={() => openEdit(t)} style={styles.iconBtn} accessibilityLabel="Edit">
                        <Ionicons name="pencil" size={16} color={theme.colors.textSecondary} />
                      </Pressable>
                      <Pressable onPress={() => moveTrack(t.id, -1)} style={styles.iconBtn} accessibilityLabel="Move up">
                        <Ionicons name="chevron-up" size={18} color={theme.colors.textSecondary} />
                      </Pressable>
                      <Pressable onPress={() => moveTrack(t.id, 1)} style={styles.iconBtn} accessibilityLabel="Move down">
                        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                      </Pressable>
                      <Pressable
                        onPress={async () => removeTrack(t.id)}
                        style={[styles.iconBtn, styles.iconBtnDanger]}
                        accessibilityLabel="Remove"
                      >
                        <Ionicons name="trash" size={18} color={theme.colors.danger} />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}

            {isOwner && (
              <View style={styles.modalFooter}>
                <Text style={styles.modalHint}>Reordering and edits save to your profile.</Text>
                <Pressable onPress={openAdd} style={styles.primaryCta}>
                  <Text style={styles.primaryCtaText}>+ Add Track</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Track Modal */}
      <Modal visible={addOpen || editOpen} transparent animationType="slide" onRequestClose={() => (saving ? null : (addOpen ? setAddOpen(false) : setEditOpen(false)))}>
        <Pressable style={styles.modalBackdrop} onPress={() => (saving ? null : (addOpen ? setAddOpen(false) : setEditOpen(false)))}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editOpen ? 'Edit Track' : 'Add Track'}</Text>
              <Pressable onPress={() => (saving ? null : (addOpen ? setAddOpen(false) : setEditOpen(false)))}>
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Track Title *</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Midnight Dreams"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Artist Name</Text>
              <TextInput
                value={newArtist}
                onChangeText={setNewArtist}
                placeholder="e.g. Jane Artist"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Audio URL *</Text>
              <TextInput
                value={newAudioUrl}
                onChangeText={setNewAudioUrl}
                placeholder="https://.../track.mp3"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            <View style={styles.formRow}>
              <Pressable onPress={() => void pickAudio()} style={styles.secondaryBtn} disabled={saving}>
                <Text style={styles.secondaryBtnText}>{pickedAudioUri ? 'Change Audio File' : 'Pick Audio File'}</Text>
              </Pressable>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Cover Art URL</Text>
              <TextInput
                value={newCoverUrl}
                onChangeText={setNewCoverUrl}
                placeholder="https://.../cover.jpg"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            <View style={styles.formRow}>
              <Pressable onPress={() => void pickCover()} style={styles.secondaryBtn} disabled={saving}>
                <Text style={styles.secondaryBtnText}>{pickedCoverUri ? 'Change Cover Image' : 'Pick Cover Image'}</Text>
              </Pressable>
            </View>

            <View style={styles.rightsRow}>
              <Switch value={rightsConfirmed} onValueChange={setRightsConfirmed} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rightsText}>
                  I own the rights or have permission to upload this content.
                </Text>
                <Text style={styles.rightsWarn}>
                  Removing tracks later may break shares/embeds and can affect existing listeners.
                </Text>
              </View>
            </View>

            <View style={styles.modalFooterRow}>
              <Pressable onPress={() => (saving ? null : (addOpen ? setAddOpen(false) : setEditOpen(false)))} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submitAdd()} style={styles.primaryCta} disabled={saving}>
                <Text style={styles.primaryCtaText}>{saving ? 'Saving…' : editOpen ? 'Save' : 'Add Track'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(theme: ThemeDefinition, accentColor?: string, cardOpacity: number = 0.95) {
  const accent = accentColor || theme.colors.accent;
  return StyleSheet.create({
    _accent: { color: accent },
    container: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },
    emptyState: {
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity,
      borderRadius: 18,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      padding: 20,
      alignItems: 'center',
    },
    emptyIcon: { fontSize: 42, opacity: 0.55, marginBottom: 8 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 6 },
    emptyText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 14 },
    playerCard: {
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
    },
    nowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 12,
    },
    nowTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.textPrimary },
    nowArtist: { marginTop: 2, fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
    cantPlay: { marginTop: 6, fontSize: 12, fontWeight: '800', color: theme.colors.danger },
    bufferingText: { marginTop: 6, fontSize: 12, fontWeight: '800', color: theme.colors.textMuted },
    playlistButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    playlistButtonText: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    controlBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    playBtn: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: accent,
    },
    playBtnDisabled: {
      opacity: 0.45,
    },
    primaryCta: {
      backgroundColor: accent,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    primaryCtaText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 16,
      justifyContent: 'center',
    },
    modalCard: {
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      opacity: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    modalTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.textPrimary },
    trackRow: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      alignItems: 'center',
    },
    trackRowSelected: {
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.14)',
      borderRadius: 12,
      paddingHorizontal: 10,
    },
    trackTitle: { fontSize: 14, fontWeight: '900', color: theme.colors.textPrimary },
    trackArtist: { marginTop: 2, fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
    trackActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconBtnDanger: {
      backgroundColor: theme.mode === 'light' ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.12)',
    },
    modalFooter: { marginTop: 10, gap: 8 },
    modalHint: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
    formRow: { marginTop: 10 },
    formLabel: { fontSize: 12, fontWeight: '900', color: theme.colors.textSecondary, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.textPrimary,
      backgroundColor: theme.mode === 'light' ? '#fff' : 'rgba(0,0,0,0.2)',
    },
    rightsRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      marginTop: 12,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
    },
    rightsText: { fontSize: 13, fontWeight: '900', color: theme.colors.textPrimary },
    rightsWarn: { marginTop: 4, fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
    modalFooterRow: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
      marginTop: 14,
    },
    secondaryBtn: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
    },
    secondaryBtnText: { fontSize: 13, fontWeight: '900', color: theme.colors.textPrimary },
  });
}


