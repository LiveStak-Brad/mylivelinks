import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';

const RIGHTS_DISCLAIMER = "You must own rights to audio/video. No reposting others' content.";

type ContentCategory = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  screen: string;
  color: string;
};

type QuickAction = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  screen: string;
  params?: Record<string, any>;
  color: string;
};

type Stats = {
  totalContent: number;
  published: number;
  drafts: number;
  processing: number;
};

const CONTENT_CATEGORIES: ContentCategory[] = [
  { key: 'music', label: 'Music', icon: 'musical-note-outline', screen: 'CreatorStudioMusicScreen', color: '#22D3EE' },
  { key: 'music-videos', label: 'Music Videos', icon: 'musical-notes-outline', screen: 'CreatorStudioMusicVideosScreen', color: '#EC4899' },
  { key: 'podcasts', label: 'Podcasts', icon: 'mic-outline', screen: 'CreatorStudioPodcastsScreen', color: '#F59E0B' },
  { key: 'movies', label: 'Movies', icon: 'film-outline', screen: 'CreatorStudioMoviesScreen', color: '#8B5CF6' },
  { key: 'series', label: 'Series', icon: 'albums-outline', screen: 'CreatorStudioSeriesScreen', color: '#22C55E' },
];

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'upload', label: 'Upload Content', icon: 'cloud-upload-outline', screen: 'CreatorStudioUploadScreen', color: '#EC4899' },
  { key: 'music', label: 'Upload Music', icon: 'musical-note-outline', screen: 'CreatorStudioUploadScreen', params: { defaultType: 'music' }, color: '#22D3EE' },
  { key: 'podcast', label: 'New Podcast', icon: 'mic-outline', screen: 'CreatorStudioUploadScreen', params: { defaultType: 'podcast' }, color: '#F59E0B' },
  { key: 'movie', label: 'Upload Movie', icon: 'film-outline', screen: 'CreatorStudioUploadScreen', params: { defaultType: 'movie' }, color: '#8B5CF6' },
  { key: 'music-video', label: 'Music Video', icon: 'musical-notes-outline', screen: 'CreatorStudioUploadScreen', params: { defaultType: 'music_video' }, color: '#EC4899' },
  { key: 'series', label: 'Create Series', icon: 'albums-outline', screen: 'CreatorStudioSeriesScreen', color: '#22C55E' },
];

export default function CreatorStudioHomeScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ totalContent: 0, published: 0, drafts: 0, processing: 0 });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API endpoint: GET /api/creator-studio/stats
      // Will be implemented by web team
      // For now, show zeros (empty state)
      setStats({ totalContent: 0, published: 0, drafts: 0, processing: 0 });
    } catch (e: any) {
      setError(e?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Rights Disclaimer Banner */}
        <View style={styles.disclaimerBanner}>
          <Ionicons name="warning-outline" size={16} color="#F59E0B" />
          <Text style={styles.disclaimerText}>{RIGHTS_DISCLAIMER}</Text>
        </View>

        {/* Header with Settings */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.headerTitleCol}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Creator Studio</Text>
                <Text style={[styles.headerSubtitle, { color: colors.mutedText }]}>
                  Manage your long-form content
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => navigation.navigate('CreatorStudioSettingsScreen')}
              style={({ pressed }) => [styles.settingsBtn, { backgroundColor: colors.surface }, pressed && styles.pressedSoft]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.mutedText} />
            </Pressable>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          {loading ? (
            <View style={[styles.statsLoading, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color="#EC4899" />
            </View>
          ) : (
            <>
              <StatCard label="Total" value={String(stats.totalContent)} icon="folder-outline" colors={colors} />
              <StatCard label="Published" value={String(stats.published)} icon="checkmark-circle-outline" colors={colors} />
              <StatCard label="Drafts" value={String(stats.drafts)} icon="document-text-outline" colors={colors} />
              <StatCard label="Processing" value={String(stats.processing)} icon="hourglass-outline" colors={colors} />
            </>
          )}
        </View>

        {/* Quick Actions Grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              onPress={() => navigation.navigate(action.screen, action.params)}
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.pressedSoft,
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={20} color={action.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Content Sections */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Browse Content</Text>
        <View style={styles.sectionsList}>
          {CONTENT_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              accessibilityRole="button"
              onPress={() => navigation.navigate(cat.screen)}
              style={({ pressed }) => [
                styles.sectionRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.pressedSoft,
              ]}
            >
              <View style={[styles.sectionIcon, { backgroundColor: `${cat.color}15` }]}>
                <Ionicons name={cat.icon} size={20} color={cat.color} />
              </View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>{cat.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
            </Pressable>
          ))}
        </View>

        {/* All Content Link */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('CreatorStudioContentScreen')}
          style={({ pressed }) => [
            styles.allContentRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressedSoft,
          ]}
        >
          <View style={styles.allContentLeft}>
            <Ionicons name="grid-outline" size={20} color={colors.text} />
            <Text style={[styles.allContentText, { color: colors.text }]}>View All Content</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  colors: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={14} color={colors.mutedText} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 32 },

  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

  headerCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  headerSubtitle: { fontSize: 13, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 6 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  statValue: { fontSize: 14, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center' },

  uploadCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#EC4899',
  },
  uploadCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCtaText: { flex: 1, gap: 2 },
  uploadCtaTitle: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  uploadCtaSubtitle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  sectionTitle: { fontSize: 16, fontWeight: '900', marginTop: 4 },

  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsLoading: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '31%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  sectionsList: { gap: 8 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { flex: 1, fontSize: 14, fontWeight: '700' },

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontSize: 14, fontWeight: '800' },
  categoryCount: { fontSize: 12, fontWeight: '600' },

  allContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  allContentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  allContentText: { fontSize: 14, fontWeight: '800' },
  allContentRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countBadgeText: { fontSize: 12, fontWeight: '900', color: '#EC4899' },

  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  pressedSoft: { opacity: 0.85 },
});
