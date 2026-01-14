import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showComingSoon } from '../lib/showComingSoon';

export default function LinkDatingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header / explainer (mirrors web hub structure) */}
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
          <Pressable accessibilityRole="button" onPress={() => showComingSoon('Safety tips')} style={({ pressed }) => [styles.safetyBtn, pressed && styles.pressed]}>
            <Text style={styles.safetyIcon}>🛡️</Text>
            <Text style={styles.safetyText}>Safety</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>♥</Text>
          </View>

          <Text style={styles.title}>Link Dating</Text>
          <Text style={styles.subtitle}>Opt-in dating mode. Find your match.</Text>

          <View style={styles.statusRow}>
            <Chip label="Opt-in" />
            <Chip label="Mutual likes" />
            <Chip label="No DM spam" />
          </View>

          <View style={styles.ctaRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => showComingSoon('Dating swipe')}
              style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
            >
              <Text style={styles.primaryCtaText}>Start Swiping</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => showComingSoon('Dating profile')}
              style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryCtaText}>Edit Dating Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Entry buttons / cards */}
        <Section title="Dating hub">
          <HubCard
            title="Swipe"
            subtitle="Browse profiles"
            meta="Ready"
            badgeLabel="Primary"
            onPress={() => showComingSoon('Dating swipe')}
          />
          <HubCard
            title="Matches"
            subtitle="Your mutual matches"
            meta="View"
            badgeLabel="💕"
            onPress={() => showComingSoon('Dating matches')}
          />
          <HubCard
            title="Profile"
            subtitle="Photos & preferences"
            meta="Edit"
            badgeLabel="Opt-in"
            onPress={() => showComingSoon('Dating profile')}
          />
          <HubCard
            title="Settings"
            subtitle="Controls & safety"
            meta="Manage"
            badgeLabel="Privacy"
            onPress={() => showComingSoon('Dating settings')}
          />
        </Section>

        {/* Web hub “Info Cards” (1/2/3 steps) */}
        <Section title="How it works">
          <View style={styles.stepsGrid}>
            <InfoStep number={1} title="Set Preferences" description="Choose what you're looking for" />
            <InfoStep number={2} title="Swipe" description="Like or pass on profiles" />
            <InfoStep number={3} title="Match" description="Connect when both like each other" />
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

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function HubCard({
  title,
  subtitle,
  meta,
  badgeLabel,
  onPress,
}: {
  title: string;
  subtitle: string;
  meta: string;
  badgeLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.hubCard, pressed && styles.pressed]}>
      <View style={styles.hubCardTop}>
        <View style={styles.hubCardText}>
          <View style={styles.hubCardTitleRow}>
            <Text style={styles.hubCardTitle}>{title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          </View>
          <Text style={styles.hubCardSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.hubCardMeta}>{meta}</Text>
      </View>
    </Pressable>
  );
}

function InfoStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{number}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDesc}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7F9' },
  container: { paddingHorizontal: 16, paddingBottom: 28 },

  headerRow: {
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: { width: 72 },
  safetyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFE4EA',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  safetyIcon: { fontSize: 14 },
  safetyText: { fontSize: 13, fontWeight: '800', color: '#9D174D' },

  hero: { paddingTop: 6, paddingBottom: 6, alignItems: 'center' },
  heroIcon: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  heroIconText: { color: '#FFFFFF', fontSize: 44, fontWeight: '900' },

  title: { fontSize: 40, fontWeight: '900', color: '#9D174D', letterSpacing: -0.4, textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 15, fontWeight: '700', color: '#6B7280', textAlign: 'center', maxWidth: 320 },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  chipText: { fontSize: 12, fontWeight: '800', color: '#9D174D' },

  ctaRow: { marginTop: 16, width: '100%', gap: 10 },
  primaryCta: {
    backgroundColor: '#E11D48',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondaryCta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FBCFE8',
  },
  secondaryCtaText: { color: '#9D174D', fontSize: 16, fontWeight: '900' },

  section: { marginTop: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 10 },
  sectionBody: { gap: 10 },

  hubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    padding: 14,
  },
  hubCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  hubCardText: { flex: 1 },
  hubCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  hubCardTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  hubCardSubtitle: { marginTop: 4, fontSize: 13, fontWeight: '700', color: '#6B7280' },
  hubCardMeta: { fontSize: 13, fontWeight: '900', color: '#9D174D' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFE4EA',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  badgeText: { fontSize: 12, fontWeight: '900', color: '#9D174D' },

  stepsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stepCard: {
    flexGrow: 1,
    flexBasis: 120,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    borderRadius: 18,
    padding: 14,
  },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stepNumText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  stepTitle: { fontSize: 14, fontWeight: '900', color: '#111827' },
  stepDesc: { marginTop: 5, fontSize: 12, fontWeight: '700', color: '#6B7280', lineHeight: 16 },

  pressed: { opacity: 0.85 },
});
