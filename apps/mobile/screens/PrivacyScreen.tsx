import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

export default function PrivacyScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
        <Text style={[styles.meta, { color: colors.mutedText }]}>MyLiveLinks LLC</Text>
        <Text style={[styles.meta, { color: colors.mutedText }]}>Effective: January 1, 2026</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Information We Collect</Text>
          <Text style={[styles.sectionText, { color: colors.mutedText }]}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>How We Use Information</Text>
          <Text style={[styles.sectionText, { color: colors.mutedText }]}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>How We Share Information</Text>
          <Text style={[styles.sectionText, { color: colors.mutedText }]}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Cookies / Similar Technologies (Web)</Text>
          <Text style={[styles.sectionText, { color: colors.mutedText }]}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Data Retention</Text>
          <Text style={[styles.sectionText, { color: colors.mutedText }]}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Security</Text>
          <Text style={[styles.sectionText, { color: colors.mutedText }]}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Your Choices</Text>
          <Text style={[styles.sectionText, { color: colors.mutedText }]}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Children / Minors</Text>
          <Text style={[styles.sectionText, { color: colors.mutedText }]}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>International Users</Text>
          <Text style={[styles.sectionText, { color: colors.mutedText }]}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Contact</Text>
          <Text style={[styles.sectionText, { color: colors.mutedText }]}>Privacy content goes here</Text>
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

