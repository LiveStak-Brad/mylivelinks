import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type PublicAnalyticsTab = 'overview' | 'engagement' | 'economy' | 'live';

export default function UserAnalyticsScreen({ route }: { route?: any }) {
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.identityMeta}>
            <View style={styles.identityTitleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {user.displayName}
              </Text>
              <View style={styles.publicPill}>
                <Ionicons name="globe-outline" size={14} color="#2563eb" />
                <Text style={styles.publicPillText}>Public</Text>
              </View>
            </View>

            <Text style={styles.subtitle} numberOfLines={1}>
              @{user.username} • User analytics
            </Text>
            {user.userId ? <Text style={styles.userId}>ID: {user.userId}</Text> : null}
          </View>
        </View>

        <Text style={styles.headerHint}>Placeholder metrics for a public analytics view (overview + key cards).</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
        <TabButton icon="apps" label="Overview" active={activeTab === 'overview'} onPress={() => setActiveTab('overview')} />
        <TabButton icon="people" label="Engagement" active={activeTab === 'engagement'} onPress={() => setActiveTab('engagement')} />
        <TabButton icon="gift" label="Economy" active={activeTab === 'economy'} onPress={() => setActiveTab('economy')} />
        <TabButton icon="radio" label="Live" active={activeTab === 'live'} onPress={() => setActiveTab('live')} />
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'engagement' && <EngagementTab />}
        {activeTab === 'economy' && <EconomyTab />}
        {activeTab === 'live' && <LiveTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ icon, label, active, onPress }: { icon: any; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Ionicons name={icon} size={18} color={active ? '#2563eb' : '#6b7280'} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function KpiCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: any;
  subtitle?: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <Ionicons name={icon} size={18} color="#2563eb" />
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>
      <Text style={styles.kpiValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      {subtitle ? <Text style={styles.kpiSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function RowItem({ left, right, icon }: { left: string; right: string; icon?: any }) {
  return (
    <View style={styles.rowItem}>
      <View style={styles.rowLeft}>
        {icon ? <Ionicons name={icon} size={18} color="#6b7280" /> : null}
        <Text style={styles.rowLeftText} numberOfLines={1}>
          {left}
        </Text>
      </View>
      <Text style={styles.rowRightText} numberOfLines={1}>
        {right}
      </Text>
    </View>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function ChartPlaceholder({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.chartPlaceholder}>
      <Ionicons name={icon} size={44} color="#cbd5e1" />
      <Text style={styles.chartPlaceholderText}>{label}</Text>
    </View>
  );
}

function OverviewTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Followers" value={12840} icon="people" subtitle="public count (placeholder)" />
        <KpiCard title="Profile views" value={92500} icon="eye" subtitle="last 30 days (placeholder)" />
        <KpiCard title="Total gifts received" value={1732} icon="gift" subtitle="lifetime (placeholder)" />
        <KpiCard title="Diamonds earned" value={48210} icon="diamond" subtitle="lifetime (placeholder)" />
      </View>

      <Section title="Highlights" subtitle="Key public stats (placeholder)">
        <View style={styles.card}>
          <RowItem icon="trophy-outline" left="Best live session" right="458 peak viewers" />
          <RowItem icon="time-outline" left="Longest session" right="3h 20m" />
          <RowItem icon="sparkles-outline" left="Top gift" right="5,000 🪙" />
        </View>
      </Section>

      <Section title="Trends" subtitle="Visuals coming soon">
        <ChartPlaceholder icon="bar-chart-outline" label="Followers & views trend chart (placeholder)" />
      </Section>
    </View>
  );
}

function EngagementTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Avg viewers" value={127} icon="people-outline" subtitle="per live (placeholder)" />
        <KpiCard title="Peak viewers" value={458} icon="trending-up-outline" subtitle="best live (placeholder)" />
        <KpiCard title="Chat messages" value={18340} icon="chatbubbles-outline" subtitle="last 30 days (placeholder)" />
        <KpiCard title="Shares" value={920} icon="share-social-outline" subtitle="last 30 days (placeholder)" />
      </View>

      <Section title="Audience" subtitle="Breakdown (placeholder)">
        <View style={styles.card}>
          <RowItem icon="compass-outline" left="Top region" right="United States" />
          <RowItem icon="calendar-outline" left="Top active day" right="Friday" />
          <RowItem icon="time-outline" left="Top active hour" right="8–10 PM" />
        </View>
      </Section>

      <Section title="Engagement trend" subtitle="Visuals coming soon">
        <ChartPlaceholder icon="pulse-outline" label="Engagement trend chart (placeholder)" />
      </Section>
    </View>
  );
}

function EconomyTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Gifts received" value={1732} icon="gift-outline" subtitle="lifetime (placeholder)" />
        <KpiCard title="Diamonds earned" value={48210} icon="diamond-outline" subtitle="lifetime (placeholder)" />
        <KpiCard title="Est. USD value" value="$241.05" icon="cash-outline" subtitle="estimate (placeholder)" />
        <KpiCard title="Top gifter" value="@topfan" icon="person-outline" subtitle="placeholder" />
      </View>

      <Section title="Top gifts" subtitle="Most valuable gifts (placeholder)">
        <View style={styles.card}>
          <RowItem icon="sparkles-outline" left="Galaxy" right="1 × 5,000 🪙" />
          <RowItem icon="sparkles-outline" left="Rocket" right="3 × 1,000 🪙" />
          <RowItem icon="sparkles-outline" left="Rose" right="120 × 10 🪙" />
        </View>
      </Section>

      <Section title="Economy trend" subtitle="Visuals coming soon">
        <ChartPlaceholder icon="trending-up-outline" label="Gifts & diamonds trend chart (placeholder)" />
      </Section>
    </View>
  );
}

function LiveTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Live sessions" value={45} icon="radio-outline" subtitle="last 90 days (placeholder)" />
        <KpiCard title="Total live time" value="32h 15m" icon="time-outline" subtitle="last 90 days (placeholder)" />
        <KpiCard title="Avg session" value="43m" icon="hourglass-outline" subtitle="placeholder" />
        <KpiCard title="Battle wins" value={18} icon="trophy-outline" subtitle="placeholder" />
      </View>

      <Section title="Recent sessions" subtitle="Last sessions (placeholder)">
        <View style={styles.card}>
          <RowItem icon="calendar-outline" left="Jan 10 • 2h 15m" right="245 peak viewers" />
          <RowItem icon="calendar-outline" left="Jan 9 • 1h 45m" right="189 peak viewers" />
          <RowItem icon="calendar-outline" left="Jan 8 • 3h 00m" right="458 peak viewers" />
          <RowItem icon="calendar-outline" left="Jan 7 • 1h 30m" right="156 peak viewers" />
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
