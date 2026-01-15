import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
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

interface VideoCardProps {
  video: MusicVideo;
  isPlaying: boolean;
  onPress: () => void;
  colors: any;
}

function VideoCard({ video, isPlaying, onPress, colors }: VideoCardProps) {
  const isYouTube = video.video_type === 'youtube' || video.youtube_id;

  return (
    <View style={styles.videoCardContainer}>
      <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
        {video.title}
      </Text>
      <View style={styles.videoWrapper}>
        {isYouTube && video.youtube_id ? (
          <>
            <View style={[styles.playerContainer, { opacity: isPlaying ? 1 : 0, zIndex: isPlaying ? 1 : -1 }]}>
              <YoutubePlayer
                height={220}
                play={isPlaying}
                videoId={video.youtube_id}
                initialPlayerParams={{
                  preventFullScreen: false,
                  modestbranding: true,
                }}
                webViewProps={{
                  androidLayerType: 'hardware',
                }}
              />
            </View>
            {!isPlaying && (
              <Pressable onPress={onPress} style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg` }}
                  style={styles.thumbnail}
                />
                <View style={styles.playOverlay}>
                  <View style={[styles.playIconCircle, { backgroundColor: colors.primary }]}>
                    <Feather name="play" size={32} color="#fff" />
                  </View>
                </View>
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.videoPlayer}>
            <Text style={[styles.errorText, { color: colors.mutedText }]}>
              Video playback not supported for this format
            </Text>
          </View>
        )}
      </View>
    </View>
  );
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
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

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

  const handleVideoPress = (videoId: string) => {
    if (playingVideoId === videoId) {
      setPlayingVideoId(null);
    } else {
      setPlayingVideoId(videoId);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (videos.length === 0 && !isOwnProfile) {
    return null;
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
            <Text style={[styles.editText, { color: colors.primary }]}>Add Video</Text>
          </Pressable>
        )}
      </View>

      {videos.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.mutedText }]}>
          No music videos yet
        </Text>
      ) : (
        <View style={styles.videosList}>
          {videos.map((video) => {
            const isPlaying = playingVideoId === video.id;
            return (
              <VideoCard
                key={video.id}
                video={video}
                isPlaying={isPlaying}
                onPress={() => handleVideoPress(video.id)}
                colors={colors}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
  },
  videosList: {
    gap: 20,
  },
  videoCardContainer: {
    width: '100%',
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  playerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  thumbnailContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  playIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});
