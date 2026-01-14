import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type PodcastItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
  episodeNumber?: number;
  publishedAt: string;
};

interface PodcastsTabProps {
  profileId: string;
  colors: any;
}

export default function PodcastsTab({ profileId, colors }: PodcastsTabProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);

  const fetchPodcasts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API endpoint: GET /api/profile/:profileId/podcasts
      // Will be implemented by web team
      setPodcasts([]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load podcasts');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  const handlePodcastPress = useCallback((item: PodcastItem) => {
    navigation.navigate('LongFormPlayerScreen', {
      contentId: item.id,
      contentType: 'podcast',
      title: item.title,
    });
  }, [navigation]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedText} />
        <Text style={[styles.errorText, { color: colors.mutedText }]}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={fetchPodcasts}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (podcasts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <View style={[styles.emptyIcon, { backgroundColor: 'rgba(236,72,153,0.1)' }]}>
          <Ionicons name="mic-outline" size={32} color="#EC4899" />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Podcasts Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          Podcasts will appear here when available
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={podcasts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => handlePodcastPress(item)}
          style={({ pressed }) => [
            styles.podcastCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.podcastIcon, { backgroundColor: 'rgba(236,72,153,0.1)' }]}>
            <Ionicons name="mic" size={24} color="#EC4899" />
          </View>
          <View style={styles.podcastInfo}>
            <Text style={[styles.podcastTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.podcastMeta, { color: colors.mutedText }]}>
              {item.duration} • {new Date(item.publishedAt).toLocaleDateString()}
            </Text>
          </View>
          <Ionicons name="play-circle-outline" size={28} color={colors.mutedText} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
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
    backgroundColor: '#EC4899',
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
    padding: 16,
    gap: 12,
  },
  podcastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  podcastIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastInfo: {
    flex: 1,
    gap: 4,
  },
  podcastTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  podcastMeta: {
    fontSize: 12,
    fontWeight: '500',
  },

  pressed: { opacity: 0.85 },
});
