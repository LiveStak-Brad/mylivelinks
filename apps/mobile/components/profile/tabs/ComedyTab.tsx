/**
 * ComedyTab - Comedy Content Profile Tab (Mobile)
 * 
 * Displays comedy-specific content: stand-up specials, comedy clips, sketches.
 * Uses a YouTube-familiar video grid layout.
 * 
 * REAL DATA: Fetches from creator_studio_items via get_public_creator_studio_items RPC
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import { supabase } from '../../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: string;
  views: number;
  published_at: string;
  media_url?: string;
  youtube_id?: string;
}

interface ComedyTabProps {
  profileId: string;
  colors: any;
  isOwnProfile?: boolean;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return `${views}`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function VideoCard({ video, colors, onPress, cardRadius, cardBg }: { video: VideoItem; colors: any; onPress: () => void; cardRadius?: number; cardBg?: string }) {
  const [imageError, setImageError] = useState(false);
  const radius = cardRadius || 12;
  const bg = cardBg || colors.surface;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.videoCard, { backgroundColor: bg, borderColor: colors.border, borderRadius: radius }, pressed && styles.pressed]}
    >
      <View style={[styles.thumbnailContainer, { borderRadius: radius }]}>
        {!imageError && video.thumbnail_url ? (
          <Image
            source={{ uri: video.thumbnail_url }}
            style={styles.thumbnail}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="happy-outline" size={32} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
      </View>
      <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={[styles.videoMeta, { color: colors.mutedText }]}>
        {formatViews(video.views)} views • {formatTimeAgo(video.published_at)}
      </Text>
    </Pressable>
  );
}

export default function ComedyTab({ profileId, colors, isOwnProfile = false, cardStyle }: ComedyTabProps) {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Apply card style
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_public_creator_studio_items', {
        p_profile_id: profileId,
        p_item_type: 'comedy_special',
        p_limit: 50,
        p_offset: 0,
      });
      
      if (error) {
        console.error('Error fetching comedy videos:', error);
        setVideos([]);
        return;
      }
      
      if (!data || data.length === 0) {
        setVideos([]);
        return;
      }
      
      const formatDuration = (seconds: number): string => {
        if (!seconds || seconds <= 0) return '0:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      };
      
      const transformedVideos: VideoItem[] = data.map((item: any) => ({
        id: item.id,
        title: item.title || 'Untitled',
        thumbnail_url: item.thumb_url || item.artwork_url || '',
        duration: formatDuration(item.duration_seconds || 0),
        views: 0,
        published_at: item.created_at,
      }));
      
      setVideos(transformedVideos);
    } catch (error) {
      console.error('Failed to fetch comedy content:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleVideoPress = (video: VideoItem) => {
    // TODO: Implement modal player like PlaylistsTab
    console.log('Video pressed:', video.id);
  };

  const handleAddPress = () => {
    navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'comedy' });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="happy-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Comedy Content Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          {isOwnProfile ? 'Upload your first comedy video' : 'Comedy content will appear here'}
        </Text>
        {isOwnProfile && (
          <Pressable
            onPress={handleAddPress}
            style={({ pressed }) => [styles.addBtn, { backgroundColor: '#EC4899' }, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Creator Studio</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="happy-outline" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Comedy</Text>
        </View>
        {isOwnProfile && (
          <Pressable
            onPress={handleAddPress}
            style={({ pressed }) => [styles.uploadBtn, { backgroundColor: '#EC4899' }, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>Creator Studio</Text>
          </Pressable>
        )}
      </View>

      {/* Video Grid */}
      <View style={styles.listContent}>
        <View style={styles.gridContainer}>
          {videos.map((item) => (
            <VideoCard
              key={item.id}
              video={item}
              colors={colors}
              onPress={() => handleVideoPress(item)}
              cardRadius={cardRadius}
              cardBg={cardBg}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  row: {
    justifyContent: 'space-between',
  },
  videoCard: {
    width: '100%',
    marginBottom: 16,
    padding: 8,
    borderWidth: 1,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  videoMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
