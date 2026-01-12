import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

export default function TermsScreen() {
  const { colors } = useTheme();
  const textStyle = { color: colors.text };
  const mutedStyle = { color: colors.mutedText };
  const subtleStyle = { color: (colors as any).subtleText ?? colors.mutedText };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, textStyle]}>Terms of Service</Text>
        <Text style={[styles.meta, mutedStyle]}>MyLiveLinks LLC</Text>
        <Text style={[styles.meta, mutedStyle]}>Effective: January 1, 2026</Text>
        <Text style={[styles.lastUpdated, subtleStyle]}>Last updated: January 1, 2026</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>Eligibility; Teen Accounts (13–17)</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Age requirements and account restrictions.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Parental consent provisions.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>Accounts and Security</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Account creation and verification requirements.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Security and password responsibilities.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>User Content and Conduct</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Content ownership and licensing terms.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Prohibited conduct and community guidelines.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>App Store–Critical Prohibition: Sexual Exploitation & Services (Explicit)</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Prohibited activities and content.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Enforcement and consequences.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>Virtual Currency, Gifts, and Purchases</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Virtual currency terms and conditions.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Purchase policies and refund limitations.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>Chargebacks / Payment Reversals (Non-Negotiable)</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Chargeback policies and account consequences.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Dispute resolution procedures.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>Enforcement Rights</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Platform moderation and enforcement actions.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Account suspension and termination rights.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>Disclaimers / Limitation of Liability</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Service disclaimers and warranties.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Liability limitations and exclusions.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>Indemnification</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} User indemnification obligations.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Defense and settlement provisions.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>Governing Law</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Applicable jurisdiction and legal framework.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Venue and forum selection.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>Binding Arbitration / Class Action Waiver</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Arbitration agreement and procedures.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Class action waiver provisions.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, textStyle]}>Changes</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} Terms modification and update procedures.</Text>
          <Text style={[styles.sectionText, mutedStyle]}>{'\u2022'} User notification requirements.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  lastUpdated: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
});

