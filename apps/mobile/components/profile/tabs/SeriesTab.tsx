/**
 * SeriesTab - Series Content Profile Tab (Mobile)
 * 
 * Displays series content grouped by series title with horizontal episode scroll.
 * 
 * REAL DATA: Fetches from creator_studio_items via get_public_creator_studio_items RPC
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';

const EPISODE_CARD_WIDTH = 220;

type SeriesEpisode = {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration: string;
  episodeNumber: number;
  seasonNumber?: number;
  publishedAt: string;
};

type SeriesGroup = {
  seriesId: string;
  seriesTitle: string;
  episodes: SeriesEpisode[];
};

interface SeriesTabProps {
  profileId: string;
  colors: any;
  isOwnProfile?: boolean;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

function EpisodeCard({ 
  episode, 
  colors, 
  cardRadius,
  onPress,
}: { 
  episode: SeriesEpisode; 
  colors: any;
  cardRadius: number;
  onPress: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.episodeCard,
        { borderColor: colors.border, borderRadius: cardRadius },
        pressed && styles.pressed,
      ]}
    >
      {/* Thumbnail */}
      <View style={[styles.episodeThumbnail, { borderRadius: cardRadius - 2 }]}>
        {!imageError && episode.thumbnailUrl ? (
          <Image
            source={{ uri: episode.thumbnailUrl }}
            style={styles.thumbnailImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.thumbnailImage, styles.thumbnailPlaceholder]}>
            <Ionicons name="albums" size={24} color="#9CA3AF" />
          </View>
        )}
        {/* Episode number badge */}
        <View style={styles.episodeBadge}>
          <Text style={styles.episodeBadgeText}>Ep {episode.episodeNumber}</Text>
        </View>
        {/* Duration badge */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{episode.duration}</Text>
        </View>
      </View>
      {/* Content */}
      <View style={styles.episodeContent}>
        <Text style={[styles.episodeTitle, { color: colors.text }]} numberOfLines={2}>
          {episode.title}
        </Text>
      </View>
    </Pressable>
  );
}

function SeriesRow({ 
  series, 
  colors, 
  cardRadius,
  navigation,
}: { 
  series: SeriesGroup; 
  colors: any;
  cardRadius: number;
  navigation: any;
}) {
  const sortedEpisodes = [...series.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);

  const handleEpisodePress = (episode: SeriesEpisode) => {
    // TODO: Implement modal player like PlaylistsTab
    console.log('Episode pressed:', episode.id);
  };

  return (
    <View style={styles.seriesRow}>
      {/* Series Title Header */}
      <View style={styles.seriesHeader}>
        <Ionicons name="albums" size={20} color={colors.primary} />
        <Text style={[styles.seriesHeaderTitle, { color: colors.text }]}>
          {series.seriesTitle}
        </Text>
        <Text style={[styles.seriesEpisodeCount, { color: colors.mutedText }]}>
          ({sortedEpisodes.length} episode{sortedEpisodes.length !== 1 ? 's' : ''})
        </Text>
      </View>

      {/* Horizontal Episode Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.episodeScrollContent}
      >
        {sortedEpisodes.map((episode) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            colors={colors}
            cardRadius={cardRadius}
            onPress={() => handleEpisodePress(episode)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function SeriesTab({ profileId, colors, isOwnProfile = false, cardStyle }: SeriesTabProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const [error, setError] = useState<string | null>(null);
  const [seriesGroups, setSeriesGroups] = useState<SeriesGroup[]>([]);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_public_creator_studio_items', {
        p_profile_id: profileId,
        p_item_type: 'series_episode',
        p_limit: 100,
        p_offset: 0,
      });
      
      if (rpcError) {
        console.error('Error fetching series:', rpcError);
        setSeriesGroups([]);
        return;
      }
      
      if (!data || data.length === 0) {
        setSeriesGroups([]);
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
      
      // Group episodes by series_id
      const groupedMap = new Map<string, SeriesGroup>();
      
      for (const item of data) {
        const seriesId = item.series_id || item.id;
        const seriesTitle = item.series_title || item.title || 'Untitled Series';
        
        if (!groupedMap.has(seriesId)) {
          groupedMap.set(seriesId, {
            seriesId,
            seriesTitle,
            episodes: [],
          });
        }
        
        const group = groupedMap.get(seriesId)!;
        group.episodes.push({
          id: item.id,
          title: item.title || 'Untitled Episode',
          description: item.description,
          thumbnailUrl: item.thumb_url || item.artwork_url,
          duration: formatDuration(item.duration_seconds || 0),
          episodeNumber: item.episode_number || group.episodes.length + 1,
          seasonNumber: item.season_number || 1,
          publishedAt: item.created_at,
        });
      }
      
      setSeriesGroups(Array.from(groupedMap.values()));
    } catch (e: any) {
      setError(e?.message || 'Failed to load series');
      setSeriesGroups([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedText} />
        <Text style={[styles.errorText, { color: colors.mutedText }]}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={fetchSeries}
          style={({ pressed }) => [styles.retryBtn, { backgroundColor: colors.primary }, pressed && styles.pressed]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (seriesGroups.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="albums-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Series Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          {isOwnProfile ? 'Create your first series' : 'Series will appear here when available'}
        </Text>
        {isOwnProfile && (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'series' })}
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
          <Ionicons name="albums" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Series</Text>
        </View>
        {isOwnProfile && (
          <Pressable
            onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'series' })}
            style={({ pressed }) => [styles.uploadBtn, { backgroundColor: '#EC4899' }, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>Creator Studio</Text>
          </Pressable>
        )}
      </View>

      {/* Series Groups with Horizontal Episode Scroll */}
      <FlatList
        data={seriesGroups}
        keyExtractor={(item) => item.seriesId}
        renderItem={({ item }) => (
          <SeriesRow
            series={item}
            colors={colors}
            cardRadius={cardRadius}
            navigation={navigation}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
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
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  seriesRow: {
    marginBottom: 24,
  },
  seriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seriesHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  seriesEpisodeCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  episodeScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  episodeCard: {
    width: EPISODE_CARD_WIDTH,
    borderWidth: 1,
    overflow: 'hidden',
  },
  episodeThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#9333EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  episodeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
  episodeContent: {
    padding: 10,
  },
  episodeTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  pressed: { opacity: 0.85 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
