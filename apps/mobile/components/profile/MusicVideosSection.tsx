import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { MusicVideo } from '../../types/profile';
import { supabase } from '../../lib/supabase';

interface MusicVideosSectionProps {
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

export default function MusicVideosSection({
  profileId,
  isOwnProfile,
  onEdit,
  colors,
  cardStyle,
}: MusicVideosSectionProps) {
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const textColor = cardStyle?.textColor || colors.text;
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    loadVideos();
  }, [profileId]);

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_music_videos')
        .select(`
          id,
          profile_id,
          title,
          video_type,
          video_url,
          youtube_id,
          thumbnail_url,
          sort_order,
          rights_confirmed,
          rights_confirmed_at,
          created_at,
          updated_at
        `)
        .eq('profile_id', profileId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error loading music videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentVideo = videos[currentIndex];

  const handlePrevious = () => {
    setIsPlaying(false);
    setPlayerReady(false);
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setPlayerReady(false);
    setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
  };

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  // Sync with YouTube player state changes
  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') {
      setIsPlaying(false);
      handleNext();
    } else if (state === 'paused') {
      setIsPlaying(false);
    } else if (state === 'playing') {
      setIsPlaying(true);
    }
  }, []);

  const handleSelectVideo = (index: number) => {
    setIsPlaying(false);
    setCurrentIndex(index);
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
          <Feather name="video" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: textColor }]}>Music Videos</Text>
        </View>
        {isOwnProfile && onEdit && (
          <Pressable onPress={onEdit} style={styles.editButton}>
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={[styles.editText, { color: colors.primary }]}>Creator Studio</Text>
          </Pressable>
        )}
      </View>

      {videos.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="video" size={32} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No music videos yet
          </Text>
          {isOwnProfile && (
            <Pressable onPress={onEdit} style={[styles.creatorStudioBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.creatorStudioBtnText}>Creator Studio</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.playerSection}>
          {/* Main Video Player */}
          <View style={styles.videoWrapper}>
            {currentVideo?.youtube_id ? (
              <View style={styles.playerContainer}>
                <YoutubePlayer
                  ref={playerRef}
                  height={200}
                  play={isPlaying}
                  videoId={currentVideo.youtube_id}
                  onChangeState={onStateChange}
                  onReady={() => setPlayerReady(true)}
                  forceAndroidAutoplay={true}
                  initialPlayerParams={{
                    preventFullScreen: false,
                    modestbranding: true,
                    controls: true,
                  }}
                  webViewProps={{
                    androidLayerType: 'hardware',
                  }}
                />
              </View>
            ) : (
              <View style={styles.noVideoPlaceholder}>
                <Feather name="video-off" size={32} color={colors.mutedText} />
              </View>
            )}
          </View>

          {/* Video Title */}
          <Text style={[styles.currentVideoTitle, { color: textColor }]} numberOfLines={2}>
            {currentVideo?.title || 'No title'}
          </Text>

          {/* Playback Controls */}
          <View style={styles.controls}>
            <Pressable onPress={handlePrevious} style={[styles.controlBtn, { backgroundColor: colors.surface }]}>
              <Feather name="skip-back" size={20} color={colors.text} />
            </Pressable>
            <Pressable 
              onPress={currentVideo?.youtube_id ? undefined : handlePlayPause} 
              style={[
                styles.playBtn, 
                { backgroundColor: currentVideo?.youtube_id ? colors.mutedText : colors.primary }
              ]}
              disabled={!!currentVideo?.youtube_id}
            >
              <Feather name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
            </Pressable>
            <Pressable onPress={handleNext} style={[styles.controlBtn, { backgroundColor: colors.surface }]}>
              <Feather name="skip-forward" size={20} color={colors.text} />
            </Pressable>
          </View>
          
          {/* YouTube hint */}
          {currentVideo?.youtube_id && (
            <Text style={[styles.youtubeHint, { color: colors.mutedText }]}>
              Tap the video above to play/pause
            </Text>
          )}

          {/* Video Counter */}
          <Text style={[styles.videoCounter, { color: colors.mutedText }]}>
            {currentIndex + 1} / {videos.length}
          </Text>

          {/* Horizontal Thumbnail List */}
          {videos.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.thumbnailList}
              contentContainerStyle={styles.thumbnailListContent}
            >
              {videos.map((video, index) => (
                <Pressable
                  key={video.id}
                  onPress={() => handleSelectVideo(index)}
                  style={[
                    styles.thumbnailItem,
                    index === currentIndex && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <Image
                    source={{ uri: video.youtube_id 
                      ? `https://img.youtube.com/vi/${video.youtube_id}/default.jpg`
                      : video.thumbnail_url || undefined
                    }}
                    style={styles.thumbnailSmall}
                  />
                  {index === currentIndex && isPlaying && (
                    <View style={styles.playingIndicator}>
                      <Feather name="volume-2" size={12} color="#fff" />
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
    marginBottom: 16,
    padding: 16,
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
  },
  editText: {
    fontSize: 14,
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
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderRadius: 12,
    position: 'relative',
  },
  playerContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoTapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  videoTapOverlayPaused: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  playIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  noVideoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
  currentVideoTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCounter: {
    fontSize: 12,
    marginBottom: 12,
  },
  youtubeHint: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },
  thumbnailList: {
    maxHeight: 60,
  },
  thumbnailListContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  thumbnailItem: {
    width: 80,
    height: 50,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailSmall: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  playingIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    padding: 2,
  },
});
