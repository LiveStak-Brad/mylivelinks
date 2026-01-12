import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

export default function ComposerProjectIdScreen() {
  const { colors } = useTheme();
  const projectTitle = 'My Project';
  const projectStatus = 'draft';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{projectTitle}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{projectStatus}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracks</Text>
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>No tracks added yet</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sounds</Text>
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>No sounds added yet</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clips</Text>
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>No clips added yet</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.buttonPrimary}>
            <Text style={styles.buttonPrimaryText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.buttonSecondary}>
            <Text style={styles.buttonSecondaryText}>Publish</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.buttonDanger}>
            <Text style={styles.buttonDangerText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  placeholderBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonSecondary: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDanger: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  buttonDangerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff3b30',
  },
});

