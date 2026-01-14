import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type SeriesItem = {
  id: string;
  title: string;
  description: string;
  episodeCount: number;
  thumbnailUrl: string | null;
  updatedAt: string;
};

interface SeriesTabProps {
  profileId: string;
  colors: any;
}

export default function SeriesTab({ profileId, colors }: SeriesTabProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<SeriesItem[]>([]);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API endpoint: GET /api/profile/:profileId/series
      // Will be implemented by web team
      setSeries([]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load series');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleSeriesPress = useCallback((item: SeriesItem) => {
    navigation.navigate('LongFormPlayerScreen', {
      contentId: item.id,
      contentType: 'series',
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
          onPress={fetchSeries}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (series.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <View style={[styles.emptyIcon, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
          <Ionicons name="albums-outline" size={32} color="#22C55E" />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Series Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          Series will appear here when available
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={series}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => handleSeriesPress(item)}
          style={({ pressed }) => [
            styles.seriesCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.seriesThumb, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
            <Ionicons name="albums" size={28} color="#22C55E" />
          </View>
          <View style={styles.seriesInfo}>
            <Text style={[styles.seriesTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.seriesMeta, { color: colors.mutedText }]}>
              {item.episodeCount} episode{item.episodeCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
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
  seriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  seriesThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seriesInfo: {
    flex: 1,
    gap: 4,
  },
  seriesTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  seriesMeta: {
    fontSize: 12,
    fontWeight: '500',
  },

  pressed: { opacity: 0.85 },
});
