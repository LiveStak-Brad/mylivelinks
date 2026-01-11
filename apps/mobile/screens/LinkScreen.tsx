import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function LinkScreen() {
  const navigation = useNavigation<any>();

  const navTo = (routeName: string) => {
    navigation.navigate(routeName);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="link" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Link</Text>
          <Text style={styles.subtitle}>Connect intentionally. Build mutuals. Choose your mode.</Text>
        </View>

        <Section title="Modes">
          <ModeCard
            tone="regular"
            title="Link or Nah"
            subtitle="Manual Swipe"
            description="Swipe to build mutuals without DM spam."
            iconName="link-outline"
            onStart={() => navTo('LinkRegularSwipeScreen')}
            onProfile={() => navTo('LinkProfileScreen')}
            onSettings={() => navTo('LinkSettingsScreen')}
          />

          <ModeCard
            tone="auto"
            title="Auto-Link (F4F)"
            subtitle="Follow for Follow"
            description="Auto link-back on follow. Toggle on/off."
            iconName="swap-horizontal-outline"
            onStart={() => navTo('LinkAutoSwipeScreen')}
            onProfile={() => navTo('LinkProfileScreen')}
            onSettings={() => navTo('LinkSettingsScreen')}
          />

          <ModeCard
            tone="dating"
            title="Link Dating"
            subtitle="Opt-in Dating"
            description="Separate dating lane. Totally optional."
            iconName="heart-outline"
            onStart={() => navTo('LinkDatingSwipeScreen')}
            onProfile={() => navTo('LinkDatingProfileScreen')}
            onSettings={() => navTo('LinkSettingsScreen')}
          />
        </Section>

        <Section title="Quick links">
          <Row
            iconName="people-outline"
            title="Mutuals"
            subtitle="People who linked you back"
            onPress={() => navTo('LinkMutualsScreen')}
          />
          <Row
            iconName="person-circle-outline"
            title="Link Profile"
            subtitle="Your Link persona"
            onPress={() => navTo('LinkProfileScreen')}
          />
          <Row
            iconName="heart-circle-outline"
            title="Dating Profile"
            subtitle="Your dating profile & preferences"
            onPress={() => navTo('LinkDatingProfileScreen')}
          />
          <Row
            iconName="copy-outline"
            title="Dating Matches"
            subtitle="Your Link Dating matches"
            onPress={() => navTo('LinkDatingMatchesScreen')}
          />
          <Row
            iconName="sparkles-outline"
            title="Regular Swipe"
            subtitle="Start swiping (Link or Nah)"
            onPress={() => navTo('LinkRegularSwipeScreen')}
          />
          <Row
            iconName="flame-outline"
            title="Dating Swipe"
            subtitle="Start swiping (Link Dating)"
            onPress={() => navTo('LinkDatingSwipeScreen')}
          />
          <Row
            iconName="options-outline"
            title="Settings"
            subtitle="Link preferences"
            onPress={() => navTo('LinkSettingsScreen')}
          />
        </Section>

        <Section title="How it works">
          <View style={styles.howGrid}>
            <HowStep number={1} title="Swipe" description="Browse profiles, swipe Link or Nah" tone="regular" />
            <HowStep number={2} title="Match" description="Both swiped Link? You're mutuals!" tone="auto" />
            <HowStep number={3} title="Connect" description="Message and follow each other" tone="dating" />
          </View>
          <View style={styles.safetyNote}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#2563EB" />
            <Text style={styles.safetyText}>Safety: connect respectfully and keep it intentional.</Text>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

type ModeTone = 'regular' | 'auto' | 'dating';

function ModeCard({
  tone,
  title,
  subtitle,
  description,
  iconName,
  onStart,
  onProfile,
  onSettings,
}: {
  tone: ModeTone;
  title: string;
  subtitle: string;
  description: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onStart: () => void;
  onProfile: () => void;
  onSettings: () => void;
}) {
  const toneStyle = tones[tone];

  return (
    <View style={[styles.card, toneStyle.card]}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, toneStyle.icon]}>
          <Ionicons name={iconName} size={22} color="#FFFFFF" />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={[styles.cardSubtitle, toneStyle.subtitle]}>{subtitle}</Text>
        </View>
      </View>

      <Text style={styles.cardDesc}>{description}</Text>

      <PrimaryButton label="Start" tone={tone} onPress={onStart} />

      <View style={styles.cardRow}>
        <MiniButton iconName="person-outline" label="Profile" onPress={onProfile} />
        <MiniButton iconName="settings-outline" label="Settings" onPress={onSettings} />
      </View>
    </View>
  );
}

function Row({
  iconName,
  title,
  subtitle,
  onPress,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={iconName} size={18} color="#111827" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

function PrimaryButton({ label, tone, onPress }: { label: string; tone: ModeTone; onPress: () => void }) {
  const toneStyle = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.primaryBtn, toneStyle.primaryBtn, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function MiniButton({
  iconName,
  label,
  onPress,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.miniBtn, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Ionicons name={iconName} size={14} color="#111827" />
      <Text style={styles.miniBtnText}>{label}</Text>
    </Pressable>
  );
}

function HowStep({
  number,
  title,
  description,
  tone,
}: {
  number: number;
  title: string;
  description: string;
  tone: ModeTone;
}) {
  const toneStyle = tones[tone];
  return (
    <View style={styles.howStep}>
      <View style={[styles.stepNum, toneStyle.stepNum]}>
        <Text style={styles.stepNumText}>{number}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDesc}>{description}</Text>
    </View>
  );
}

const tones: Record<
  ModeTone,
  {
    primaryBtn: object;
    card: object;
    icon: object;
    subtitle: object;
    stepNum: object;
  }
> = {
  regular: {
    primaryBtn: { backgroundColor: '#2563EB' },
    card: { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
    icon: { backgroundColor: '#2563EB' },
    subtitle: { color: '#2563EB' },
    stepNum: { backgroundColor: '#2563EB' },
  },
  auto: {
    primaryBtn: { backgroundColor: '#059669' },
    card: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
    icon: { backgroundColor: '#059669' },
    subtitle: { color: '#059669' },
    stepNum: { backgroundColor: '#059669' },
  },
  dating: {
    primaryBtn: { backgroundColor: '#DB2777' },
    card: { borderColor: '#FBCFE8', backgroundColor: '#FDF2F8' },
    icon: { backgroundColor: '#DB2777' },
    subtitle: { color: '#DB2777' },
    stepNum: { backgroundColor: '#DB2777' },
  },
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { padding: 16, paddingBottom: 28 },

  header: { paddingTop: 8, paddingBottom: 10, alignItems: 'center' },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 34, fontWeight: '800', color: '#111827', letterSpacing: -0.2 },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6B7280', textAlign: 'center', maxWidth: 320 },

  section: { marginTop: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 10 },
  sectionBody: { gap: 12 },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cardSubtitle: { marginTop: 2, fontSize: 12, fontWeight: '800' },
  cardDesc: { marginTop: 10, fontSize: 13, color: '#374151', lineHeight: 18 },
  cardRow: { marginTop: 10, flexDirection: 'row', gap: 10 },

  primaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },

  miniBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  miniBtnText: { color: '#111827', fontWeight: '800', fontSize: 12 },

  row: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  rowTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  rowSubtitle: { marginTop: 2, fontSize: 12, color: '#6B7280' },

  howGrid: { flexDirection: 'row', gap: 10 },
  howStep: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 12,
  },
  stepNum: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepNumText: { color: '#FFFFFF', fontWeight: '900' },
  stepTitle: { fontSize: 13, fontWeight: '900', color: '#111827' },
  stepDesc: { marginTop: 4, fontSize: 12, color: '#6B7280', lineHeight: 16 },

  safetyNote: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  safetyText: { flex: 1, fontSize: 12, color: '#1F2937', fontWeight: '700' },

  pressed: { opacity: 0.85 },
});
