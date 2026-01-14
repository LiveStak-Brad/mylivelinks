import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';

const RIGHTS_DISCLAIMER = "You must own rights to audio/video. No reposting others' content.";

type ContentStatus = 'draft' | 'processing' | 'published';
type FilterChip = 'all' | ContentStatus;

type MusicItem = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  status: ContentStatus;
  plays: number;
  artworkUrl: string | null;
};

const FILTER_CHIPS: { key: FilterChip; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'published', label: 'Published' },
  { key: 'processing', label: 'Processing' },
];

const STATUS_CONFIG: Record<ContentStatus, { label: string; bgColor: string; textColor: string }> = {
  draft: { label: 'Draft', bgColor: 'rgba(148,163,184,0.15)', textColor: '#94A3B8' },
  processing: { label: 'Processing', bgColor: 'rgba(59,130,246,0.15)', textColor: '#3B82F6' },
  published: { label: 'Published', bgColor: 'rgba(34,197,94,0.15)', textColor: '#22C55E' },
};

export default function CreatorStudioMusicScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<MusicItem[]>([]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API endpoint: GET /api/creator-studio/content?type=music
      // Will be implemented by web team
      // For now, show empty state
      setContent([]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load music');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  const filteredContent = content.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.status === activeFilter;
  });

  const renderItem = ({ item }: { item: MusicItem }) => {
    const statusConfig = STATUS_CONFIG[item.status];

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('CreatorStudioItemDetailScreen', { itemId: item.id, type: 'music' })}
        style={({ pressed }) => [
          styles.contentCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressedSoft,
        ]}
      >
        <View style={[styles.artwork, { backgroundColor: 'rgba(34,211,238,0.1)' }]}>
          <Ionicons name="musical-note-outline" size={24} color="#22D3EE" />
        </View>

        <View style={styles.contentInfo}>
          <Text style={[styles.contentTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.contentArtist, { color: colors.mutedText }]} numberOfLines={1}>
            {item.artist}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.durationBadge, { backgroundColor: 'rgba(34,211,238,0.15)' }]}>
              <Ionicons name="time-outline" size={10} color="#22D3EE" />
              <Text style={styles.durationBadgeText}>{item.duration}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusConfig.textColor }]}>{statusConfig.label}</Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More options"
          onPress={() => {/* Show action menu */}}
          style={({ pressed }) => [styles.moreBtn, pressed && styles.pressedSoft]}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedText} />
        </Pressable>
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
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: '#22D3EE' }]}>
            <Ionicons name="musical-note-outline" size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Music (Audio)</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'music' })}
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
                { backgroundColor: isActive ? '#22D3EE' : colors.surface, borderColor: isActive ? '#22D3EE' : colors.border },
              ]}
            >
              <Text style={[styles.filterChipText, { color: isActive ? '#FFFFFF' : colors.text }]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#22D3EE" />
          <Text style={[styles.stateText, { color: colors.mutedText }]}>Loading music...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>Error</Text>
          <Text style={[styles.stateText, { color: colors.mutedText }]}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={fetchContent}
            style={({ pressed }) => [styles.retryBtn, { borderColor: colors.border }, pressed && styles.pressedSoft]}
          >
            <Text style={[styles.retryBtnText, { color: colors.text }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredContent}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: 'rgba(34,211,238,0.1)' }]}>
                <Ionicons name="musical-note-outline" size={32} color="#22D3EE" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No music yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
                Upload your first audio track to get started
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'music' })}
                style={({ pressed }) => [styles.emptyBtn, pressed && styles.pressed]}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Upload Music</Text>
              </Pressable>
            </View>
          }
        />
      )}
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  uploadBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#22D3EE',
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

  listContent: { padding: 16, gap: 12, flexGrow: 1 },

  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentInfo: { flex: 1, gap: 4 },
  contentTitle: { fontSize: 14, fontWeight: '800', lineHeight: 18 },
  contentArtist: { fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  durationBadgeText: { fontSize: 10, fontWeight: '800', color: '#22D3EE' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  stateTitle: { fontSize: 16, fontWeight: '800' },
  stateText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySubtitle: { fontSize: 13, fontWeight: '600', textAlign: 'center', maxWidth: 260 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#22D3EE',
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  pressedSoft: { opacity: 0.85 },
});
