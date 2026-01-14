import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { showComingSoon } from '../lib/showComingSoon';

export default function ComposerScreen() {
  type TabView = 'drafts' | 'posted';
  const [activeTab, setActiveTab] = useState<TabView>('drafts');

  type StatusTone = 'pink' | 'blue' | 'green' | 'amber' | 'neutral';
  type ProjectItem = {
    id: string;
    title: string;
    statusLabel: string;
    statusTone: StatusTone;
    updatedAtLabel: string;
  };

  // UI-only mock data (no upload/playback, no nav)
  const featuredProjects = useMemo<ProjectItem[]>(
    () => [
      { id: 'fp_1', title: 'Winter Vlog — Episode 3', statusLabel: 'In Progress', statusTone: 'blue', updatedAtLabel: 'Updated 12m ago' },
      { id: 'fp_2', title: 'Behind the Scenes: Live Room', statusLabel: 'Ready', statusTone: 'green', updatedAtLabel: 'Updated 2h ago' },
    ],
    []
  );

  const drafts = useMemo<ProjectItem[]>(
    () => [
      { id: 'd_1', title: 'Product Teaser (15s)', statusLabel: 'Draft', statusTone: 'neutral', updatedAtLabel: 'Updated 5m ago' },
      { id: 'd_2', title: 'Battle Highlights — Week 2', statusLabel: 'In Progress', statusTone: 'blue', updatedAtLabel: 'Updated 1h ago' },
      { id: 'd_3', title: 'Creator Intro', statusLabel: 'Ready', statusTone: 'green', updatedAtLabel: 'Updated yesterday' },
      { id: 'd_4', title: 'Outtakes Reel', statusLabel: 'Needs Review', statusTone: 'amber', updatedAtLabel: 'Updated 3d ago' },
    ],
    []
  );

  const posted = useMemo<ProjectItem[]>(
    () => [
      { id: 'p_1', title: 'Morning Routine — Quick Cut', statusLabel: 'Posted', statusTone: 'pink', updatedAtLabel: 'Posted 2d ago' },
      { id: 'p_2', title: 'Live Room Tour', statusLabel: 'Posted', statusTone: 'pink', updatedAtLabel: 'Posted 1w ago' },
      { id: 'p_3', title: 'Top Gifts Compilation', statusLabel: 'Scheduled', statusTone: 'blue', updatedAtLabel: 'Scheduled for tomorrow' },
    ],
    []
  );

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

        {/* Section: Projects (web: Projects + featured/recents) */}
        <SectionHeader title="Projects" subtitle="Recently worked on" />
        <View style={styles.grid}>
          {featuredProjects.map((p) => (
            <ProjectCard key={p.id} title={p.title} statusLabel={p.statusLabel} statusTone={p.statusTone} updatedAtLabel={p.updatedAtLabel} />
          ))}
        </View>

        {/* Tabs (web: Drafts / Posted) */}
        <View style={styles.tabsShell}>
          <TabButton label="Drafts" isActive={activeTab === 'drafts'} onPress={() => setActiveTab('drafts')} />
          <TabButton label="Posted" isActive={activeTab === 'posted'} onPress={() => setActiveTab('posted')} />
        </View>

        {/* Section: Drafts / Posted (web: list rows) */}
        <SectionHeader
          title={activeTab === 'drafts' ? 'Drafts' : 'Posted'}
          subtitle={`${currentProjects.length} project${currentProjects.length === 1 ? '' : 's'}`}
        />

        <View style={styles.list}>
          {currentProjects.map((p) => (
            <ProjectRow
              key={p.id}
              title={p.title}
              statusLabel={p.statusLabel}
              statusTone={p.statusTone}
              updatedAtLabel={p.updatedAtLabel}
              variant={activeTab}
            />
          ))}
        </View>
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'pink' | 'blue' | 'green' | 'amber' | 'neutral' }) {
  const toneStyle =
    tone === 'pink'
      ? styles.pillPink
      : tone === 'blue'
        ? styles.pillBlue
        : tone === 'green'
          ? styles.pillGreen
          : tone === 'amber'
            ? styles.pillAmber
            : styles.pillNeutral;

  const toneTextStyle =
    tone === 'pink'
      ? styles.pillTextPink
      : tone === 'blue'
        ? styles.pillTextBlue
        : tone === 'green'
          ? styles.pillTextGreen
          : tone === 'amber'
            ? styles.pillTextAmber
            : styles.pillTextNeutral;

  return (
    <View style={[styles.pill, toneStyle]}>
      <Text style={[styles.pillText, toneTextStyle]}>{label}</Text>
    </View>
  );
}

function IconAction({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => showComingSoon(label)} style={({ pressed }) => [styles.iconAction, pressed && styles.pressedSoft]}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.85)" />
    </Pressable>
  );
}

function ProjectRow({
  title,
  statusLabel,
  statusTone,
  updatedAtLabel,
  variant,
}: {
  title: string;
  statusLabel: string;
  statusTone: 'pink' | 'blue' | 'green' | 'amber' | 'neutral';
  updatedAtLabel: string;
  variant: 'drafts' | 'posted';
}) {
  return (
    <Pressable accessibilityRole="button" onPress={() => showComingSoon('Project details')} style={({ pressed }) => [styles.rowShell, pressed && styles.pressedSoft]}>
      <View style={styles.rowLeftIcon}>
        <Ionicons name={variant === 'drafts' ? 'document-text-outline' : 'checkmark-circle-outline'} size={18} color="rgba(255,255,255,0.8)" />
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.rowMetaLine}>
          <StatusPill label={statusLabel} tone={statusTone} />
          <Text style={styles.rowMeta}>{updatedAtLabel}</Text>
        </View>
      </View>

      <View style={styles.rowActions}>
        {variant === 'drafts' ? <IconAction icon="create-outline" label="Edit" /> : <IconAction icon="eye-outline" label="View" />}
        {variant === 'drafts' ? <IconAction icon="copy-outline" label="Duplicate" /> : <IconAction icon="share-outline" label="Share" />}
        <IconAction icon="ellipsis-horizontal" label="More" />
      </View>
    </Pressable>
  );
}

function ProjectCard({
  title,
  statusLabel,
  statusTone,
  updatedAtLabel,
}: {
  title: string;
  statusLabel: string;
  statusTone: 'pink' | 'blue' | 'green' | 'amber' | 'neutral';
  updatedAtLabel: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={() => showComingSoon('Project details')} style={({ pressed }) => [styles.projectCard, pressed && styles.pressedSoft]}>
      <View style={styles.projectThumb}>
        <Ionicons name="film-outline" size={26} color="rgba(255,255,255,0.22)" />
      </View>
      <View style={styles.projectCardBody}>
        <Text style={styles.projectTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.projectMetaRow}>
          <StatusPill label={statusLabel} tone={statusTone} />
          <Text style={styles.projectMeta}>{updatedAtLabel}</Text>
        </View>
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

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  sectionHeaderLeft: { flex: 1, minWidth: 0, gap: 3 },
  sectionHeaderTitle: { fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.2 },
  sectionHeaderSubtitle: { fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },

  list: { gap: 10 },
  rowShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowLeftIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0, gap: 6 },
  rowTitle: { fontSize: 13.5, fontWeight: '900', color: '#FFFFFF' },
  rowMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowMeta: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 11.5, fontWeight: '900' },
  pillNeutral: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  pillTextNeutral: { color: 'rgba(255,255,255,0.80)' },
  pillBlue: { backgroundColor: 'rgba(59,130,246,0.16)', borderColor: 'rgba(59,130,246,0.28)' },
  pillTextBlue: { color: 'rgba(147,197,253,1)' },
  pillGreen: { backgroundColor: 'rgba(34,197,94,0.16)', borderColor: 'rgba(34,197,94,0.28)' },
  pillTextGreen: { color: 'rgba(134,239,172,1)' },
  pillAmber: { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.28)' },
  pillTextAmber: { color: 'rgba(253,230,138,1)' },
  pillPink: { backgroundColor: 'rgba(236,72,153,0.16)', borderColor: 'rgba(236,72,153,0.28)' },
  pillTextPink: { color: 'rgba(251,207,232,1)' },

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
  projectMetaRow: { gap: 6 },

  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  pressedSoft: { opacity: 0.88 },
});
