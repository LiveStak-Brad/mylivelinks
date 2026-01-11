import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.meta}>MyLiveLinks LLC</Text>
        <Text style={styles.meta}>Effective: January 1, 2026</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Information We Collect</Text>
          <Text style={styles.sectionText}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>How We Use Information</Text>
          <Text style={styles.sectionText}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>How We Share Information</Text>
          <Text style={styles.sectionText}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Cookies / Similar Technologies (Web)</Text>
          <Text style={styles.sectionText}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Data Retention</Text>
          <Text style={styles.sectionText}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Security</Text>
          <Text style={styles.sectionText}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Your Choices</Text>
          <Text style={styles.sectionText}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Children / Minors</Text>
          <Text style={styles.sectionText}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>International Users</Text>
          <Text style={styles.sectionText}>Privacy content goes here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Contact</Text>
          <Text style={styles.sectionText}>Privacy content goes here</Text>
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

