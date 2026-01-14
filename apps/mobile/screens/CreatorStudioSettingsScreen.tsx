import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

const RIGHTS_DISCLAIMER = "You must own rights to audio/video. No reposting others' content.";

type Visibility = 'public' | 'private';

export default function CreatorStudioSettingsScreen() {
  const { colors } = useTheme();

  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>('public');
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);
  const [autoGenerateThumbnails, setAutoGenerateThumbnails] = useState(true);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Rights Disclaimer Banner */}
        <View style={styles.disclaimerBanner}>
          <Ionicons name="warning-outline" size={16} color="#F59E0B" />
          <Text style={styles.disclaimerText}>{RIGHTS_DISCLAIMER}</Text>
        </View>

        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.headerTitleCol}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Creator Settings</Text>
              <Text style={[styles.headerSubtitle, { color: colors.mutedText }]}>
                Configure your Creator Studio preferences
              </Text>
            </View>
          </View>
        </View>

        {/* Default Visibility */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Default Visibility</Text>
          <Text style={[styles.sectionDesc, { color: colors.mutedText }]}>
            New uploads will use this visibility by default
          </Text>
          <View style={styles.visibilityRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDefaultVisibility('public')}
              style={[
                styles.visibilityOption,
                { backgroundColor: colors.surface, borderColor: defaultVisibility === 'public' ? '#EC4899' : colors.border },
                defaultVisibility === 'public' && styles.visibilityOptionActive,
              ]}
            >
              <View style={[styles.visibilityIcon, defaultVisibility === 'public' && styles.visibilityIconActive]}>
                <Ionicons name="globe-outline" size={20} color={defaultVisibility === 'public' ? '#FFFFFF' : colors.mutedText} />
              </View>
              <View style={styles.visibilityInfo}>
                <Text style={[styles.visibilityLabel, { color: colors.text }]}>Public</Text>
                <Text style={[styles.visibilityDesc, { color: colors.mutedText }]}>Anyone can view</Text>
              </View>
              {defaultVisibility === 'public' && (
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setDefaultVisibility('private')}
              style={[
                styles.visibilityOption,
                { backgroundColor: colors.surface, borderColor: defaultVisibility === 'private' ? '#EC4899' : colors.border },
                defaultVisibility === 'private' && styles.visibilityOptionActive,
              ]}
            >
              <View style={[styles.visibilityIcon, defaultVisibility === 'private' && styles.visibilityIconActive]}>
                <Ionicons name="lock-closed-outline" size={20} color={defaultVisibility === 'private' ? '#FFFFFF' : colors.mutedText} />
              </View>
              <View style={styles.visibilityInfo}>
                <Text style={[styles.visibilityLabel, { color: colors.text }]}>Private</Text>
                <Text style={[styles.visibilityDesc, { color: colors.mutedText }]}>Only you can view</Text>
              </View>
              {defaultVisibility === 'private' && (
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Notify followers on publish</Text>
              <Text style={[styles.toggleDesc, { color: colors.mutedText }]}>
                Send notification when content goes live
              </Text>
            </View>
            <Switch
              value={notifyOnPublish}
              onValueChange={setNotifyOnPublish}
              trackColor={{ false: colors.border, true: '#EC4899' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Thumbnails */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Thumbnails</Text>
          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Auto-generate thumbnails</Text>
              <Text style={[styles.toggleDesc, { color: colors.mutedText }]}>
                Automatically create thumbnails from video content
              </Text>
            </View>
            <Switch
              value={autoGenerateThumbnails}
              onValueChange={setAutoGenerateThumbnails}
              trackColor={{ false: colors.border, true: '#EC4899' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Content Policy */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Content Policy</Text>
          <View style={[styles.policyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.policyIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#EC4899" />
            </View>
            <View style={styles.policyInfo}>
              <Text style={[styles.policyTitle, { color: colors.text }]}>Rights & Guidelines</Text>
              <Text style={[styles.policyDesc, { color: colors.mutedText }]}>
                You must own or have legal rights to all content you upload. Reposting copyrighted material or other creators' content is prohibited and may result in content removal and account suspension.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },

  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F59E0B',
    lineHeight: 17,
  },

  headerCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { fontSize: 13, fontWeight: '600' },

  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionDesc: { fontSize: 12, fontWeight: '600' },

  visibilityRow: { gap: 10 },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  visibilityOptionActive: {
    backgroundColor: 'rgba(236,72,153,0.08)',
  },
  visibilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(148,163,184,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityIconActive: {
    backgroundColor: '#EC4899',
  },
  visibilityInfo: { flex: 1, gap: 2 },
  visibilityLabel: { fontSize: 14, fontWeight: '800' },
  visibilityDesc: { fontSize: 12, fontWeight: '600' },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 14, fontWeight: '700' },
  toggleDesc: { fontSize: 12, fontWeight: '600' },

  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  policyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(236,72,153,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyInfo: { flex: 1, gap: 6 },
  policyTitle: { fontSize: 14, fontWeight: '800' },
  policyDesc: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
});
