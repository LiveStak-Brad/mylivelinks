import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { showComingSoon } from '../lib/showComingSoon';

export default function ComposerProjectScreen() {
  type TabView = 'drafts' | 'posted';
  const [activeTab, setActiveTab] = useState<TabView>('drafts');

  // UI-only placeholders (web: no data wired yet)
  const drafts: Array<{ id: string; title: string; updatedAtLabel: string }> = [];
  const posted: Array<{ id: string; title: string; updatedAtLabel: string }> = [];

  const currentProjects = useMemo(() => (activeTab === 'drafts' ? drafts : posted), [activeTab, drafts, posted]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Header (web: /composer header + New Project CTA) */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="film-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.headerTitleCol}>
                <Text style={styles.headerTitle}>Composer</Text>
                <Text style={styles.headerSubtitle}>Create and manage your video projects</Text>
              </View>
            </View>

            <Pressable accessibilityRole="button" onPress={() => showComingSoon('New project')} style={({ pressed }) => [styles.newProjectButton, pressed && styles.pressed]}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.newProjectButtonText}>New Project</Text>
            </Pressable>
          </View>
        </View>

        {/* Tabs (web: Drafts / Posted) */}
        <View style={styles.tabsShell}>
          <TabButton label="Drafts" isActive={activeTab === 'drafts'} onPress={() => setActiveTab('drafts')} />
          <TabButton label="Posted" isActive={activeTab === 'posted'} onPress={() => setActiveTab('posted')} />
        </View>

        {/* Content Area (web: empty state OR grid) */}
        {currentProjects.length === 0 ? (
          <Card variant="dashed">
            <EmptyState
              iconName={activeTab === 'drafts' ? 'file-tray-outline' : 'checkmark-circle-outline'}
              title={activeTab === 'drafts' ? 'No drafts yet' : 'No posted projects'}
              description={activeTab === 'drafts' ? 'Your draft projects will appear here' : 'Your published projects will appear here'}
            />
          </Card>
        ) : (
          <View style={styles.grid}>
            {currentProjects.map((p) => (
              <ProjectCard key={p.id} title={p.title} updatedAtLabel={p.updatedAtLabel} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ children, variant = 'solid' }: { children: React.ReactNode; variant?: 'solid' | 'dashed' }) {
  return <View style={[styles.card, variant === 'dashed' && styles.cardDashed]}>{children}</View>;
}

function TabButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tabButton, isActive && styles.tabButtonActive, pressed && styles.pressedSoft]}
    >
      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({
  iconName,
  title,
  description,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}) {
  return (
    <View style={styles.emptyStateCenter}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={iconName} size={28} color="rgba(255,255,255,0.75)" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{description}</Text>
    </View>
  );
}

function ProjectCard({ title, updatedAtLabel }: { title: string; updatedAtLabel: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => showComingSoon('Project details')} style={({ pressed }) => [styles.projectCard, pressed && styles.pressedSoft]}>
      <View style={styles.projectThumb}>
        <Ionicons name="film-outline" size={26} color="rgba(255,255,255,0.22)" />
      </View>
      <View style={styles.projectCardBody}>
        <Text style={styles.projectTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.projectMeta}>{updatedAtLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0c0c16' },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 28 },

  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.7)' },

  newProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.35)',
    backgroundColor: 'rgba(236,72,153,0.18)',
  },
  newProjectButtonText: { fontSize: 12.5, fontWeight: '900', color: '#FFFFFF' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardDashed: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },

  tabsShell: {
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignSelf: 'flex-start',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  tabButtonText: { fontSize: 12.5, fontWeight: '800', color: 'rgba(255,255,255,0.65)' },
  tabButtonTextActive: { color: '#FFFFFF' },

  emptyStateCenter: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 8, gap: 8 },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  emptyBody: { fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  projectCard: {
    width: '48%',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  projectThumb: {
    height: 92,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCardBody: { padding: 12, gap: 6 },
  projectTitle: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  projectMeta: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },

  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  pressedSoft: { opacity: 0.88 },
});
