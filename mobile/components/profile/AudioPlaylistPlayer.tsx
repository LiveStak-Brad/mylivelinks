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
  profileId?: string | null;
  tracks: ProfileMusicTrack[];
  isOwner: boolean;
  onTracksChange?: (next: ProfileMusicTrack[]) => void; // UI-only for now
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
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const tracksRef = useRef<ProfileMusicTrack[]>(tracks);
  const currentIndexRef = useRef<number>(0);
  const currentTrack = uiTracks[currentIndex] ?? null;
  const canPlay = !!currentTrack?.audio_url;

  // Sync incoming tracks
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

  // Setup audio mode once
  useEffect(() => {
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      void (async () => {
        try {
          if (soundRef.current) {
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
      const { error } = await supabase.rpc('reorder_profile_music_tracks', {
        p_profile_id: profileId,
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
    }
  };

  const loadAndPlay = async (track: ProfileMusicTrack) => {
    if (!track.audio_url) return;
    try {
      // unload previous
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audio_url },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            // cycle playlist
            const list = tracksRef.current;
            if (list.length <= 1) {
              setIsPlaying(false);
              return;
            }
            const nextIndex = (currentIndexRef.current + 1) % list.length;
            setCurrentIndex(nextIndex);
            setIsPlaying(true);
            void loadAndPlay(list[nextIndex]);
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (e) {
      setIsPlaying(false);
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
    const idx = uiTracks.findIndex((t) => t.id === id);
    const next = uiTracks.filter((t) => t.id !== id);
    if (isOwner && profileId) {
      try {
        const { error } = await supabase.rpc('delete_profile_music_track', { p_track_id: id });
        if (error) throw error;
        if (next.length) {
          await supabase.rpc('reorder_profile_music_tracks', {
            p_profile_id: profileId,
            p_ordered_ids: next.map((t) => t.id),
          });
        }
      } catch (e) {
        console.error('[AudioPlaylistPlayer] delete failed', e);
        Alert.alert('Unable to delete', 'Please try again.');
        return;
      }
    }

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
  };

  const moveTrack = (id: string, dir: -1 | 1) => {
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
    void persistReorder(next);
  };

  const openAdd = () => {
    setNewTitle('');
    setNewArtist('');
    setNewAudioUrl('');
    setNewCoverUrl('');
    setRightsConfirmed(false);
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const title = newTitle.trim();
    const audioUrl = newAudioUrl.trim();
    const artist = newArtist.trim();
    const cover = newCoverUrl.trim();
    if (!title) return Alert.alert('Missing title', 'Track title is required.');
    if (!audioUrl) return Alert.alert('Missing audio URL', 'Audio URL is required.');
    if (!rightsConfirmed) return Alert.alert('Rights required', 'You must confirm you own the rights or have permission.');

    // If we don't have a profileId yet, keep UI usable (but persistence won't happen).
    if (!profileId) {
      const nextTrack: ProfileMusicTrack = {
        id: safeId(),
        title,
        artist_name: artist || null,
        audio_url: audioUrl,
        cover_art_url: cover || null,
        rights_confirmed: true,
      };
      const next = [...uiTracks, nextTrack];
      setTracks(next);
      setAddOpen(false);
      setPlaylistOpen(false);
      setCurrentIndex(next.length - 1);
      await loadAndPlay(nextTrack);
      return;
    }

    try {
      const payload: any = {
        title,
        artist_name: artist || null,
        audio_url: audioUrl,
        cover_art_url: cover || null,
        sort_order: uiTracks.length,
        rights_confirmed: true,
      };
      const { data, error } = await supabase.rpc('upsert_profile_music_track', { p_track: payload });
      if (error) throw error;
      const row: any = data ?? null;
      if (!row?.id) throw new Error('Missing track id');
      const nextTrack: ProfileMusicTrack = {
        id: String(row.id),
        title: String(row.title ?? title),
        artist_name: row.artist_name ?? (artist || null),
        audio_url: String(row.audio_url ?? audioUrl),
        cover_art_url: row.cover_art_url ?? (cover || null),
        rights_confirmed: row.rights_confirmed ?? true,
        sort_order: row.sort_order ?? uiTracks.length,
      };
      const next = [...uiTracks, nextTrack];
      setTracks(next);
      setAddOpen(false);
      setPlaylistOpen(false);
      setCurrentIndex(next.length - 1);
      await loadAndPlay(nextTrack);
    } catch (e) {
      console.error('[AudioPlaylistPlayer] save failed', e);
      Alert.alert('Unable to save', 'Please try again.');
    }
  };

  // Requirement: empty state is owner-only
  if (uiTracks.length === 0 && !isOwner) {
    return null;
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

      {/* Empty owner-only state */}
      {uiTracks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎵</Text>
          <Text style={styles.emptyTitle}>No Music Yet</Text>
          <Text style={styles.emptyText}>Music tracks and releases will appear here</Text>
          <Pressable onPress={openAdd} style={styles.primaryCta}>
            <Text style={styles.primaryCtaText}>Add Your First Track</Text>
          </Pressable>
        </View>
      ) : (
        <>
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
                {!canPlay && (
                  <Text style={styles.cantPlay}>This track needs an audio URL to play.</Text>
                )}
              </View>
              <Pressable onPress={() => setPlaylistOpen(true)} style={styles.playlistButton}>
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
                <Text style={styles.modalHint}>Reordering is UI-only for now (saving is wired later).</Text>
                <Pressable onPress={openAdd} style={styles.primaryCta}>
                  <Text style={styles.primaryCtaText}>+ Add Track</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Track Modal */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Track</Text>
              <Pressable onPress={() => setAddOpen(false)}>
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
              <Pressable onPress={() => setAddOpen(false)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submitAdd()} style={styles.primaryCta}>
                <Text style={styles.primaryCtaText}>Add Track</Text>
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


