import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PolicyDetailScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Policy Detail</Text>
        <Text style={styles.subtitle}>Review key sections below</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Last updated</Text>
            <Text style={styles.rowValue}>2026-01-01</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.sectionBody}>
            Placeholder text for this section. This content will be replaced with the official policy
            copy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section details</Text>
          <Text style={styles.sectionBody}>
            Placeholder text for this section. Keep paragraphs short and easy to scan on mobile.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your choices</Text>
          <Text style={styles.sectionBody}>
            Placeholder text for this section. Provide clear headings and spacing for readability.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More information</Text>
          <Text style={styles.sectionBody}>
            Placeholder text for this section. Include links or contact details where applicable.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rowValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
});
