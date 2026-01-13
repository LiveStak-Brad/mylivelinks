import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { MusicTrack } from '../../types/profile';
import { supabase } from '../../lib/supabase';

interface MusicShowcaseSectionProps {
  profileId: string;
  isOwnProfile: boolean;
  onEdit?: () => void;
  colors: any;
}

export default function MusicShowcaseSection({
  profileId,
  isOwnProfile,
  onEdit,
  colors,
}: MusicShowcaseSectionProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadTracks();
  }, [profileId]);

  const loadTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_music_tracks')
        .select('*')
        .eq('profile_id', profileId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error('Error loading music tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = async (track: MusicTrack) => {
    try {
      if (playingTrackId === track.id) {
        // Pause current track
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
          setPlayingTrackId(null);
        }
      } else {
        // Stop previous track if playing
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        // Load and play new track
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: track.audio_url },
          { shouldPlay: true }
        );

        soundRef.current = sound;
        setPlayingTrackId(track.id);

        // Handle playback completion
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingTrackId(null);
          }
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (tracks.length === 0 && !isOwnProfile) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="music" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Music</Text>
        </View>
        {isOwnProfile && onEdit && (
          <Pressable onPress={onEdit} style={styles.editButton}>
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={[styles.editText, { color: colors.primary }]}>Add Track</Text>
          </Pressable>
        )}
      </View>

      {tracks.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.mutedText }]}>
          No music tracks yet
        </Text>
      ) : (
        <View style={styles.tracksList}>
          {tracks.map((track) => (
            <View key={track.id} style={[styles.trackCard, { borderColor: colors.border }]}>
              <Image
                source={{ uri: track.cover_art_url || undefined }}
                style={styles.coverArt}
              />
              <View style={styles.trackInfo}>
                <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
                  {track.title}
                </Text>
                {track.artist_name && (
                  <Text style={[styles.artistName, { color: colors.mutedText }]} numberOfLines={1}>
                    {track.artist_name}
                  </Text>
                )}
                {track.rights_confirmed && (
                  <View style={styles.trackMeta}>
                    <Feather name="check-circle" size={12} color={colors.primary} />
                    <Text style={[styles.playCount, { color: colors.mutedText }]}>
                      Rights Confirmed
                    </Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => handlePlayPause(track)}
                style={[styles.playButton, { backgroundColor: colors.primary }]}
              >
                <Feather
                  name={playingTrackId === track.id ? 'pause' : 'play'}
                  size={20}
                  color="#fff"
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  tracksList: {
    gap: 12,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  coverArt: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  trackInfo: {
    flex: 1,
    gap: 4,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  artistName: {
    fontSize: 13,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  playCount: {
    fontSize: 11,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
