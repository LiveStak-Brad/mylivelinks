import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { showComingSoon } from '../lib/showComingSoon';

export default function LinkAutoSwipeScreen() {
  // UI-only state (no networking / no background work).
  const [autoSwipeEnabled, setAutoSwipeEnabled] = useState(false);
  const [pauseWhenLowBalance, setPauseWhenLowBalance] = useState(true);
  const [skipPrivateAccounts, setSkipPrivateAccounts] = useState(true);
  const [prioritizeMutuals, setPrioritizeMutuals] = useState(true);
  const [respectCooldowns, setRespectCooldowns] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [hideSensitiveContent, setHideSensitiveContent] = useState(true);
  const [blockReportedUsers, setBlockReportedUsers] = useState(true);
  const [allowVerifiedOnly, setAllowVerifiedOnly] = useState(false);
  const [speed, setSpeed] = useState<'Conservative' | 'Balanced' | 'Aggressive'>('Balanced');

  const statusTone = useMemo(() => {
    return autoSwipeEnabled
      ? {
          bg: '#ECFDF5',
          border: '#A7F3D0',
          pillBg: '#059669',
          pillText: '#FFFFFF',
          statusText: '#065F46',
        }
      : {
          bg: '#FFFFFF',
          border: '#E5E7EB',
          pillBg: '#111827',
          pillText: '#FFFFFF',
          statusText: '#111827',
        };
  }, [autoSwipeEnabled]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="swap-horizontal-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Link Auto Swipe</Text>
          <Text style={styles.subtitle}>
            Set your rules, schedule, and safety filters. When you’re ready, start or stop auto swiping anytime.
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusPill, { backgroundColor: statusTone.pillBg }]}>
                <Ionicons name="flash-outline" size={16} color={statusTone.pillText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>Status</Text>
                <Text style={[styles.statusValue, { color: statusTone.statusText }]}>
                  Auto Swipe: {autoSwipeEnabled ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
            <Text style={styles.statusHint}>UI only</Text>
          </View>
        </View>

        <Section title="Enable">
          <ToggleRow
            iconName="toggle-outline"
            title="Enable Auto Swipe"
            subtitle="Turns auto swiping on/off (UI only)"
            value={autoSwipeEnabled}
            onToggle={() => setAutoSwipeEnabled(v => !v)}
          />
          <Divider />
          <ToggleRow
            iconName="timer-outline"
            title="Respect cooldowns"
            subtitle="Adds spacing to reduce spammy behavior"
            value={respectCooldowns}
            onToggle={() => setRespectCooldowns(v => !v)}
          />
          <Divider />
          <ToggleRow
            iconName="wallet-outline"
            title="Pause when low balance"
            subtitle="Avoid actions when resources are low"
            value={pauseWhenLowBalance}
            onToggle={() => setPauseWhenLowBalance(v => !v)}
          />
        </Section>

        <Section title="Limits">
          <ValueRow
            iconName="speedometer-outline"
            title="Max swipes per hour"
            subtitle="Keeps usage predictable"
            valueText="50 / hr"
            badge="UI"
          />
          <Divider />
          <ValueRow
            iconName="calendar-outline"
            title="Daily cap"
            subtitle="Stops after a daily limit"
            valueText="200 / day"
            badge="UI"
          />
          <Divider />
          <ValueRow
            iconName="time-outline"
            title="Cooldown between batches"
            subtitle="Adds a rest period after a burst"
            valueText="3 min"
            badge="UI"
          />
        </Section>

        <Section title="Preferences">
          <ToggleRow
            iconName="people-outline"
            title="Prioritize mutuals"
            subtitle="Try mutual-friendly actions first"
            value={prioritizeMutuals}
            onToggle={() => setPrioritizeMutuals(v => !v)}
          />
          <Divider />
          <ToggleRow
            iconName="lock-closed-outline"
            title="Skip private accounts"
            subtitle="Avoid accounts with limited visibility"
            value={skipPrivateAccounts}
            onToggle={() => setSkipPrivateAccounts(v => !v)}
          />
          <Divider />
          <ToggleRow
            iconName="checkmark-circle-outline"
            title="Verified only"
            subtitle="Only swipe verified profiles"
            value={allowVerifiedOnly}
            onToggle={() => setAllowVerifiedOnly(v => !v)}
          />
          <Divider />
          <PillRow
            iconName="options-outline"
            title="Swipe style"
            subtitle="How selective to be"
            options={['Conservative', 'Balanced', 'Aggressive'] as const}
            value={speed}
            onChange={setSpeed}
          />
        </Section>

        <Section title="Schedule">
          <ToggleRow
            iconName="alarm-outline"
            title="Enable schedule"
            subtitle="Run only during selected hours"
            value={scheduleEnabled}
            onToggle={() => setScheduleEnabled(v => !v)}
          />
          <Divider />
          <ValueRow
            iconName="time-outline"
            title="Active hours"
            subtitle="Local time window"
            valueText="9:00 AM – 6:00 PM"
            badge="UI"
          />
          <Divider />
          <ValueRow
            iconName="repeat-outline"
            title="Days"
            subtitle="When to run each week"
            valueText="Mon–Fri"
            badge="UI"
          />
          <Divider />
          <ValueRow
            iconName="globe-outline"
            title="Timezone"
            subtitle="Schedule reference timezone"
            valueText="Local"
            badge="UI"
          />
        </Section>

        <Section title="Safety & Filters">
          <ToggleRow
            iconName="shield-checkmark-outline"
            title="Hide sensitive content"
            subtitle="Avoid potentially sensitive profiles"
            value={hideSensitiveContent}
            onToggle={() => setHideSensitiveContent(v => !v)}
          />
          <Divider />
          <ToggleRow
            iconName="alert-circle-outline"
            title="Block reported users"
            subtitle="Skip users flagged by community signals"
            value={blockReportedUsers}
            onToggle={() => setBlockReportedUsers(v => !v)}
          />
          <Divider />
          <ValueRow
            iconName="ban-outline"
            title="Blocked keywords"
            subtitle="Filters for bios / usernames"
            valueText="None"
            badge="UI"
          />
          <View style={styles.noteRow}>
            <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
            <Text style={styles.noteText}>
              Tip: these controls are a UI mock only—no swipes will actually run from this screen yet.
            </Text>
          </View>
        </Section>

        <View style={styles.ctaWrap}>
          <Text style={styles.ctaTitle}>Controls</Text>
          <Text style={styles.ctaSubtitle}>Start/Stop are UI-only buttons (no background logic)</Text>

          <View style={styles.ctaRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start Auto Swipe"
              onPress={() => showComingSoon('Auto swipe')}
              style={({ pressed }) => [styles.ctaBtn, styles.ctaBtnPrimary, pressed && styles.pressed]}
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.ctaBtnPrimaryText}>Start Auto Swipe</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop Auto Swipe"
              onPress={() => showComingSoon('Auto swipe')}
              style={({ pressed }) => [styles.ctaBtn, styles.ctaBtnSecondary, pressed && styles.pressed]}
            >
              <Ionicons name="stop" size={16} color="#111827" />
              <Text style={styles.ctaBtnSecondaryText}>Stop</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function ToggleRow({
  iconName,
  title,
  subtitle,
  value,
  onToggle,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={iconName} size={18} color="#111827" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: value }}
        onPress={onToggle}
        style={({ pressed }) => [styles.toggle, value && styles.toggleOn, pressed && styles.pressed]}
      >
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </Pressable>
    </View>
  );
}

function ValueRow({
  iconName,
  title,
  subtitle,
  valueText,
  badge,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  valueText: string;
  badge?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => showComingSoon(title)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={iconName} size={18} color="#111827" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.rowRight}>
        {badge ? <Badge label={badge} /> : null}
        <Text style={styles.valueText}>{valueText}</Text>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </View>
    </Pressable>
  );
}

function PillRow<const T extends readonly string[]>({
  iconName,
  title,
  subtitle,
  options,
  value,
  onChange,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  options: T;
  value: T[number];
  onChange: (next: T[number]) => void;
}) {
  return (
    <View style={styles.rowStack}>
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.rowIcon}>
            <Ionicons name={iconName} size={18} color="#111827" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{title}</Text>
            <Text style={styles.rowSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <Badge label="UI" />
      </View>

      <View style={styles.pills}>
        {options.map(opt => {
          const selected = opt === value;
          return (
            <Pressable
              key={opt}
              accessibilityRole="button"
              accessibilityLabel={`${title}: ${opt}`}
              onPress={() => onChange(opt)}
              style={({ pressed }) => [
                styles.pill,
                selected && styles.pillSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { padding: 16, paddingBottom: 28 },

  header: { paddingTop: 8, paddingBottom: 12, alignItems: 'center' },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', letterSpacing: -0.2 },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6B7280', textAlign: 'center', maxWidth: 340, lineHeight: 18 },

  statusCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statusPill: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  statusValue: { marginTop: 2, fontSize: 15, fontWeight: '900' },
  statusHint: { fontSize: 12, color: '#9CA3AF', fontWeight: '800' },

  section: { marginTop: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#111827', marginBottom: 10 },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
  },

  rowStack: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '900', color: '#111827' },
  rowSubtitle: { marginTop: 2, fontSize: 12, color: '#6B7280', lineHeight: 16 },

  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueText: { fontSize: 12, color: '#111827', fontWeight: '900' },

  divider: { height: 1, backgroundColor: '#E5E7EB' },

  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    position: 'relative',
  },
  toggleOn: { backgroundColor: '#10B981' },
  toggleThumb: {
    position: 'absolute',
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbOn: { left: 28 },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  badgeText: { fontSize: 11, fontWeight: '900', color: '#374151' },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingLeft: 44, paddingBottom: 4 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  pillSelected: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  pillText: { fontSize: 12, fontWeight: '900', color: '#111827' },
  pillTextSelected: { color: '#2563EB' },

  noteRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noteText: { flex: 1, fontSize: 12, color: '#1F2937', fontWeight: '800', lineHeight: 16 },

  ctaWrap: { marginTop: 18 },
  ctaTitle: { fontSize: 15, fontWeight: '900', color: '#111827' },
  ctaSubtitle: { marginTop: 4, fontSize: 12, color: '#6B7280', fontWeight: '700' },
  ctaRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  ctaBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaBtnPrimary: { backgroundColor: '#059669' },
  ctaBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ctaBtnPrimaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  ctaBtnSecondaryText: { color: '#111827', fontWeight: '900', fontSize: 13 },

  pressed: { opacity: 0.85 },
});
