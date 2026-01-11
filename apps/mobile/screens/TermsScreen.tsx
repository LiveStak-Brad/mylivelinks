import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.meta}>MyLiveLinks LLC</Text>
        <Text style={styles.meta}>Effective: January 1, 2026</Text>
        <Text style={styles.lastUpdated}>Last updated: January 1, 2026</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Eligibility; Teen Accounts (13–17)</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Age requirements and account restrictions.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Parental consent provisions.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Accounts and Security</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Account creation and verification requirements.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Security and password responsibilities.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>User Content and Conduct</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Content ownership and licensing terms.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Prohibited conduct and community guidelines.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>App Store–Critical Prohibition: Sexual Exploitation & Services (Explicit)</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Prohibited activities and content.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Enforcement and consequences.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Virtual Currency, Gifts, and Purchases</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Virtual currency terms and conditions.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Purchase policies and refund limitations.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Chargebacks / Payment Reversals (Non-Negotiable)</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Chargeback policies and account consequences.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Dispute resolution procedures.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Enforcement Rights</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Platform moderation and enforcement actions.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Account suspension and termination rights.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Disclaimers / Limitation of Liability</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Service disclaimers and warranties.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Liability limitations and exclusions.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Indemnification</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} User indemnification obligations.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Defense and settlement provisions.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Governing Law</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Applicable jurisdiction and legal framework.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Venue and forum selection.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Binding Arbitration / Class Action Waiver</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Arbitration agreement and procedures.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Class action waiver provisions.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Changes</Text>
          <Text style={styles.sectionText}>{'\u2022'} Section text will be displayed here.</Text>
          <Text style={styles.sectionText}>{'\u2022'} Terms modification and update procedures.</Text>
          <Text style={styles.sectionText}>{'\u2022'} User notification requirements.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
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
    color: '#000',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
});

