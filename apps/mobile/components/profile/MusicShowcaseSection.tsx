import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { MusicTrack } from '../../types/profile';
import { supabase } from '../../lib/supabase';

interface MusicShowcaseSectionProps {
  profileId: string;
  isOwnProfile: boolean;
  onEdit?: () => void;
  colors: any;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

// SoundCloud-style waveform bars (simulated)
function WaveformBars({ progress, isPlaying, colors }: { progress: number; isPlaying: boolean; colors: any }) {
  const bars = 40;
  const heights = useRef(
    Array.from({ length: bars }, () => 0.3 + Math.random() * 0.7)
  ).current;

  return (
    <View style={waveStyles.container}>
      {heights.map((h, i) => {
        const isActive = (i / bars) <= progress;
        return (
          <View
            key={i}
            style={[
              waveStyles.bar,
              {
                height: h * 32,
                backgroundColor: isActive ? colors.primary : `${colors.primary}40`,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
});

export default function MusicShowcaseSection({
  profileId,
  isOwnProfile,
  onEdit,
  colors,
  cardStyle,
}: MusicShowcaseSectionProps) {
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const textColor = cardStyle?.textColor || colors.text;
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadTracks();
  }, [profileId]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

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

  const currentTrack = tracks[currentIndex];

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setProgress(status.durationMillis ? status.positionMillis / status.durationMillis : 0);
      if (status.didJustFinish) {
        handleNext();
      }
    }
  };

  const loadAndPlayTrack = async (track: MusicTrack) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audio_url },
        { shouldPlay: true },
        handlePlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handlePlayPause = async () => {
    if (!currentTrack) return;

    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      } else {
        await loadAndPlayTrack(currentTrack);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handlePrevious = async () => {
    const newIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    setProgress(0);
    setPosition(0);
    if (isPlaying && tracks[newIndex]) {
      await loadAndPlayTrack(tracks[newIndex]);
    } else {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
    }
  };

  const handleNext = async () => {
    const newIndex = currentIndex === tracks.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    setProgress(0);
    setPosition(0);
    if (isPlaying && tracks[newIndex]) {
      await loadAndPlayTrack(tracks[newIndex]);
    } else {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
    }
  };

  const handleSelectTrack = async (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
    setPosition(0);
    if (tracks[index]) {
      await loadAndPlayTrack(tracks[index]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="music" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: textColor }]}>Music</Text>
        </View>
        {isOwnProfile && onEdit && tracks.length > 0 && (
          <Pressable onPress={onEdit} style={[styles.creatorStudioPill, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.creatorStudioPillText}>Creator Studio</Text>
          </Pressable>
        )}
      </View>

      {tracks.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="music" size={32} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No music tracks yet
          </Text>
          {isOwnProfile && onEdit && (
            <Pressable onPress={onEdit} style={[styles.creatorStudioBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.creatorStudioBtnText}>Creator Studio</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.playerSection}>
          {/* Album Art & Track Info */}
          <View style={styles.nowPlaying}>
            <Image
              source={{ uri: currentTrack?.cover_art_url || undefined }}
              style={styles.albumArt}
            />
            <View style={styles.trackDetails}>
              <Text style={[styles.trackTitle, { color: textColor }]} numberOfLines={1}>
                {currentTrack?.title || 'No track'}
              </Text>
              <Text style={[styles.artistName, { color: colors.mutedText }]} numberOfLines={1}>
                {currentTrack?.artist_name || 'Unknown artist'}
              </Text>
            </View>
          </View>

          {/* SoundCloud-style Waveform */}
          <View style={styles.waveformContainer}>
            <WaveformBars progress={progress} isPlaying={isPlaying} colors={colors} />
          </View>

          {/* Time Display */}
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.mutedText }]}>
              {formatTime(position)}
            </Text>
            <Text style={[styles.timeText, { color: colors.mutedText }]}>
              {formatTime(duration)}
            </Text>
          </View>

          {/* Playback Controls */}
          <View style={styles.controls}>
            <Pressable onPress={handlePrevious} style={[styles.controlBtn, { backgroundColor: colors.surface }]}>
              <Feather name="skip-back" size={18} color={colors.text} />
            </Pressable>
            <Pressable onPress={handlePlayPause} style={[styles.playBtn, { backgroundColor: colors.primary }]}>
              <Feather name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={handleNext} style={[styles.controlBtn, { backgroundColor: colors.surface }]}>
              <Feather name="skip-forward" size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Track Counter */}
          <Text style={[styles.trackCounter, { color: colors.mutedText }]}>
            {currentIndex + 1} / {tracks.length}
          </Text>

          {/* Horizontal Track List */}
          {tracks.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.trackList}
              contentContainerStyle={styles.trackListContent}
            >
              {tracks.map((track, index) => (
                <Pressable
                  key={track.id}
                  onPress={() => handleSelectTrack(index)}
                  style={[
                    styles.trackThumb,
                    index === currentIndex && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <Image
                    source={{ uri: track.cover_art_url || undefined }}
                    style={styles.trackThumbImage}
                  />
                  {index === currentIndex && isPlaying && (
                    <View style={[styles.playingBadge, { backgroundColor: colors.primary }]}>
                      <Feather name="volume-2" size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
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
  creatorStudioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  creatorStudioPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  creatorStudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  creatorStudioBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playerSection: {
    alignItems: 'center',
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  albumArt: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  trackDetails: {
    flex: 1,
    gap: 4,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  artistName: {
    fontSize: 14,
  },
  waveformContainer: {
    width: '100%',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 11,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCounter: {
    fontSize: 12,
    marginBottom: 12,
  },
  trackList: {
    maxHeight: 56,
  },
  trackListContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  trackThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  trackThumbImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  playingBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: 4,
    padding: 2,
  },
});
