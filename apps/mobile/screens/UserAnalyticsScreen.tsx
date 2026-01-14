import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

type PublicAnalyticsTab = 'overview' | 'engagement' | 'economy' | 'live';

export default function UserAnalyticsScreen({ route }: { route?: any }) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<PublicAnalyticsTab>('overview');

  const user = useMemo(() => {
    const params = route?.params ?? {};
    const pUser = params.user ?? params.profile ?? {};
    const displayName = String(pUser.displayName ?? pUser.name ?? params.displayName ?? 'Creator');
    const username = String(pUser.username ?? params.username ?? 'creator');
    const userId = pUser.id ?? params.userId ?? params.id;
    const avatarUrl = pUser.avatarUrl ?? pUser.avatar ?? params.avatarUrl;

    return { displayName, username, userId: userId ? String(userId) : undefined, avatarUrl: avatarUrl ? String(avatarUrl) : undefined };
  }, [route?.params]);

  const initials = useMemo(() => {
    const parts = user.displayName.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? 'C';
    const second = parts[1]?.[0] ?? '';
    return (first + second).toUpperCase();
  }, [user.displayName]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.identityRow}>
          <View style={[styles.avatar, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={[styles.avatarText, { color: colors.link }]}>{initials}</Text>
          </View>

          <View style={styles.identityMeta}>
            <View style={styles.identityTitleRow}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {user.displayName}
              </Text>
              <View style={[styles.publicPill, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Ionicons name="globe-outline" size={14} color={colors.link} />
                <Text style={[styles.publicPillText, { color: colors.link }]}>Public</Text>
              </View>
            </View>

            <Text style={[styles.subtitle, { color: colors.mutedText }]} numberOfLines={1}>
              @{user.username} • User analytics
            </Text>
            {user.userId ? <Text style={[styles.userId, { color: colors.subtleText }]}>ID: {user.userId}</Text> : null}
          </View>
        </View>

        <Text style={[styles.headerHint, { color: colors.subtleText }]}>Placeholder metrics for a public analytics view (overview + key cards).</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabsContainer, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabsContent}>
        <TabButton icon="apps" label="Overview" active={activeTab === 'overview'} onPress={() => setActiveTab('overview')} colors={colors} />
        <TabButton icon="people" label="Engagement" active={activeTab === 'engagement'} onPress={() => setActiveTab('engagement')} colors={colors} />
        <TabButton icon="gift" label="Economy" active={activeTab === 'economy'} onPress={() => setActiveTab('economy')} colors={colors} />
        <TabButton icon="radio" label="Live" active={activeTab === 'live'} onPress={() => setActiveTab('live')} colors={colors} />
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && <OverviewTab colors={colors} />}
        {activeTab === 'engagement' && <EngagementTab colors={colors} />}
        {activeTab === 'economy' && <EconomyTab colors={colors} />}
        {activeTab === 'live' && <LiveTab colors={colors} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ icon, label, active, onPress, colors }: { icon: any; label: string; active: boolean; onPress: () => void; colors: any }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && [styles.tabActive, { borderBottomColor: colors.link }]]}>
      <Ionicons name={icon} size={18} color={active ? colors.link : colors.mutedText} />
      <Text style={[styles.tabLabel, { color: colors.mutedText }, active && { color: colors.link }]}>{label}</Text>
    </Pressable>
  );
}

function KpiCard({
  title,
  value,
  icon,
  subtitle,
  colors,
}: {
  title: string;
  value: string | number;
  icon: any;
  subtitle?: string;
  colors: any;
}) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <View style={styles.kpiHeader}>
        <Ionicons name={icon} size={18} color={colors.link} />
        <Text style={[styles.kpiTitle, { color: colors.mutedText }]}>{title}</Text>
      </View>
      <Text style={[styles.kpiValue, { color: colors.text }]}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      {subtitle ? <Text style={[styles.kpiSubtitle, { color: colors.subtleText }]}>{subtitle}</Text> : null}
    </View>
  );
}

function RowItem({ left, right, icon, colors }: { left: string; right: string; icon?: any; colors: any }) {
  return (
    <View style={[styles.rowItem, { borderTopColor: colors.border }]}>
      <View style={styles.rowLeft}>
        {icon ? <Ionicons name={icon} size={18} color={colors.mutedText} /> : null}
        <Text style={[styles.rowLeftText, { color: colors.text }]} numberOfLines={1}>
          {left}
        </Text>
      </View>
      <Text style={[styles.rowRightText, { color: colors.text }]} numberOfLines={1}>
        {right}
      </Text>
    </View>
  );
}

function Section({ title, subtitle, children, colors }: { title: string; subtitle?: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.mutedText }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function ChartPlaceholder({ icon, label, colors }: { icon: any; label: string; colors: any }) {
  return (
    <View style={[styles.chartPlaceholder, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <Ionicons name={icon} size={44} color={colors.subtleText} />
      <Text style={[styles.chartPlaceholderText, { color: colors.subtleText }]}>{label}</Text>
    </View>
  );
}

function OverviewTab({ colors }: { colors: any }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Followers" value={12840} icon="people" subtitle="public count (placeholder)" colors={colors} />
        <KpiCard title="Profile views" value={92500} icon="eye" subtitle="last 30 days (placeholder)" colors={colors} />
        <KpiCard title="Total gifts received" value={1732} icon="gift" subtitle="lifetime (placeholder)" colors={colors} />
        <KpiCard title="Diamonds earned" value={48210} icon="diamond" subtitle="lifetime (placeholder)" colors={colors} />
      </View>

      <Section title="Highlights" subtitle="Key public stats (placeholder)" colors={colors}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <RowItem icon="trophy-outline" left="Best live session" right="458 peak viewers" colors={colors} />
          <RowItem icon="time-outline" left="Longest session" right="3h 20m" colors={colors} />
          <RowItem icon="sparkles-outline" left="Top gift" right="5,000 🪙" colors={colors} />
        </View>
      </Section>

      <Section title="Trends" subtitle="Visuals coming soon" colors={colors}>
        <ChartPlaceholder icon="bar-chart-outline" label="Followers & views trend chart (placeholder)" colors={colors} />
      </Section>
    </View>
  );
}

function EngagementTab({ colors }: { colors: any }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Avg viewers" value={127} icon="people-outline" subtitle="per live (placeholder)" colors={colors} />
        <KpiCard title="Peak viewers" value={458} icon="trending-up-outline" subtitle="best live (placeholder)" colors={colors} />
        <KpiCard title="Chat messages" value={18340} icon="chatbubbles-outline" subtitle="last 30 days (placeholder)" colors={colors} />
        <KpiCard title="Shares" value={920} icon="share-social-outline" subtitle="last 30 days (placeholder)" colors={colors} />
      </View>

      <Section title="Audience" subtitle="Breakdown (placeholder)" colors={colors}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <RowItem icon="compass-outline" left="Top region" right="United States" colors={colors} />
          <RowItem icon="calendar-outline" left="Top active day" right="Friday" colors={colors} />
          <RowItem icon="time-outline" left="Top active hour" right="8–10 PM" colors={colors} />
        </View>
      </Section>

      <Section title="Engagement trend" subtitle="Visuals coming soon" colors={colors}>
        <ChartPlaceholder icon="pulse-outline" label="Engagement trend chart (placeholder)" colors={colors} />
      </Section>
    </View>
  );
}

function EconomyTab({ colors }: { colors: any }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Gifts received" value={1732} icon="gift-outline" subtitle="lifetime (placeholder)" colors={colors} />
        <KpiCard title="Diamonds earned" value={48210} icon="diamond-outline" subtitle="lifetime (placeholder)" colors={colors} />
        <KpiCard title="Est. USD value" value="$241.05" icon="cash-outline" subtitle="estimate (placeholder)" colors={colors} />
        <KpiCard title="Top gifter" value="@topfan" icon="person-outline" subtitle="placeholder" colors={colors} />
      </View>

      <Section title="Top gifts" subtitle="Most valuable gifts (placeholder)" colors={colors}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <RowItem icon="sparkles-outline" left="Galaxy" right="1 × 5,000 🪙" colors={colors} />
          <RowItem icon="sparkles-outline" left="Rocket" right="3 × 1,000 🪙" colors={colors} />
          <RowItem icon="sparkles-outline" left="Rose" right="120 × 10 🪙" colors={colors} />
        </View>
      </Section>

      <Section title="Economy trend" subtitle="Visuals coming soon" colors={colors}>
        <ChartPlaceholder icon="trending-up-outline" label="Gifts & diamonds trend chart (placeholder)" colors={colors} />
      </Section>
    </View>
  );
}

function LiveTab({ colors }: { colors: any }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Live sessions" value={45} icon="radio-outline" subtitle="last 90 days (placeholder)" colors={colors} />
        <KpiCard title="Total live time" value="32h 15m" icon="time-outline" subtitle="last 90 days (placeholder)" colors={colors} />
        <KpiCard title="Avg session" value="43m" icon="hourglass-outline" subtitle="placeholder" colors={colors} />
        <KpiCard title="Battle wins" value={18} icon="trophy-outline" subtitle="placeholder" colors={colors} />
      </View>

      <Section title="Recent sessions" subtitle="Last sessions (placeholder)" colors={colors}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <RowItem icon="calendar-outline" left="Jan 10 • 2h 15m" right="245 peak viewers" colors={colors} />
          <RowItem icon="calendar-outline" left="Jan 9 • 1h 45m" right="189 peak viewers" colors={colors} />
          <RowItem icon="calendar-outline" left="Jan 8 • 3h 00m" right="458 peak viewers" colors={colors} />
          <RowItem icon="calendar-outline" left="Jan 7 • 1h 30m" right="156 peak viewers" colors={colors} />
        </View>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  identityMeta: {
    flex: 1,
    minWidth: 0,
  },
  identityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  publicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  publicPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: '#6b7280',
  },
  userId: {
    marginTop: 2,
    fontSize: 12,
    color: '#9ca3af',
  },
  headerHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#9ca3af',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabsContent: {
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2563eb',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabLabelActive: {
    color: '#2563eb',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  kpiGrid: {
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  kpiSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  rowLeftText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rowRightText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  chartPlaceholder: {
    height: 180,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
  },
});
