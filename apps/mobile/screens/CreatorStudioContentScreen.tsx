import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';

const RIGHTS_DISCLAIMER = "You must own rights to audio/video. No reposting others' content.";

type ContentStatus = 'draft' | 'processing' | 'published';
type ContentType = 'music_video' | 'movie' | 'podcast' | 'series';
type FilterChip = 'all' | ContentStatus;

type ContentItem = {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  thumbnailUrl: string | null;
  views: number;
  createdAt: string;
};


const FILTER_CHIPS: { key: FilterChip; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'published', label: 'Published' },
  { key: 'processing', label: 'Processing' },
];

const TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  music_video: { label: 'Music Video', icon: 'musical-notes-outline', color: '#EC4899' },
  movie: { label: 'Movie', icon: 'film-outline', color: '#8B5CF6' },
  podcast: { label: 'Podcast', icon: 'mic-outline', color: '#F59E0B' },
  series: { label: 'Series', icon: 'albums-outline', color: '#22C55E' },
};

const STATUS_CONFIG: Record<ContentStatus, { label: string; bgColor: string; textColor: string }> = {
  draft: { label: 'Draft', bgColor: 'rgba(148,163,184,0.15)', textColor: '#94A3B8' },
  processing: { label: 'Processing', bgColor: 'rgba(59,130,246,0.15)', textColor: '#3B82F6' },
  published: { label: 'Published', bgColor: 'rgba(34,197,94,0.15)', textColor: '#22C55E' },
};

export default function CreatorStudioContentScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API endpoint: GET /api/creator-studio/content
      // Will be implemented by web team
      // For now, show empty state
      setContent([]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const filteredContent = content.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.status === activeFilter;
  });

  const renderItem = ({ item }: { item: ContentItem }) => {
    const typeConfig = TYPE_CONFIG[item.type];
    const statusConfig = STATUS_CONFIG[item.status];

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('CreatorStudioItemDetailScreen', { itemId: item.id })}
        style={({ pressed }) => [
          styles.contentCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressedSoft,
        ]}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnail}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnailImage} />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: 'rgba(236,72,153,0.1)' }]}>
              <Ionicons name={typeConfig.icon} size={24} color={typeConfig.color} />
            </View>
          )}
        </View>

        {/* Content Info */}
        <View style={styles.contentInfo}>
          <Text style={[styles.contentTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            {/* Type Badge */}
            <View style={[styles.typeBadge, { backgroundColor: `${typeConfig.color}15` }]}>
              <Ionicons name={typeConfig.icon} size={12} color={typeConfig.color} />
              <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
            </View>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusConfig.textColor }]}>{statusConfig.label}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <Ionicons name="eye-outline" size={12} color={colors.mutedText} />
            <Text style={[styles.statsText, { color: colors.mutedText }]}>
              {item.views.toLocaleString()} views
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* Rights Disclaimer Banner */}
      <View style={styles.disclaimerBanner}>
        <Ionicons name="warning-outline" size={16} color="#F59E0B" />
        <Text style={styles.disclaimerText}>{RIGHTS_DISCLAIMER}</Text>
      </View>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>All Content</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('CreatorStudioUploadScreen')}
          style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressedSoft]}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.key;
          return (
            <Pressable
              key={chip.key}
              accessibilityRole="button"
              onPress={() => setActiveFilter(chip.key)}
              style={[
                styles.filterChip,
                { backgroundColor: isActive ? '#EC4899' : colors.surface, borderColor: isActive ? '#EC4899' : colors.border },
              ]}
            >
              <Text style={[styles.filterChipText, { color: isActive ? '#FFFFFF' : colors.text }]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content List */}
      <FlatList
        data={filteredContent}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color={colors.mutedText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No content found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
              {activeFilter === 'all' ? 'Upload your first content to get started' : `No ${activeFilter} content`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F59E0B',
    lineHeight: 17,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  uploadBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },

  listContent: { padding: 16, gap: 12 },

  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  thumbnail: {
    width: 72,
    height: 54,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentInfo: { flex: 1, gap: 6 },
  contentTitle: { fontSize: 14, fontWeight: '800', lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsText: { fontSize: 11, fontWeight: '600' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySubtitle: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  pressedSoft: { opacity: 0.85 },
});
