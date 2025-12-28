/**
 * ProfileTypeDemo - Standalone Demo Screen
 * 
 * Demonstrates all profile type components with all variations.
 * Useful for visual testing and component development.
 * 
 * To use: Add this screen to your navigation stack temporarily.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeMode } from '../contexts/ThemeContext';
import ProfileTypeBadge, { ProfileType } from './ProfileTypeBadge';
import ProfileQuickActionsRow from './ProfileQuickActionsRow';
import ProfileSectionTabs from './ProfileSectionTabs';

const PROFILE_TYPES: ProfileType[] = [
  'streamer',
  'musician',
  'comedian',
  'business',
  'creator',
  'default',
];

export function ProfileTypeDemo() {
  const { theme } = useThemeMode();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<ProfileType>('streamer');
  const [activeTab, setActiveTab] = useState('about');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Profile Type Components Demo
        </Text>
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Type Selector */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Select Profile Type:
          </Text>
          <View style={styles.typeSelector}>
            {PROFILE_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.typeButton,
                  selectedType === type && {
                    backgroundColor: theme.colors.accent,
                  },
                ]}
                onPress={() => {
                  setSelectedType(type);
                  setActiveTab('about'); // Reset tab when type changes
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    {
                      color: selectedType === type ? '#fff' : theme.colors.textPrimary,
                    },
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Badge Demo */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            ProfileTypeBadge
          </Text>
          <View style={styles.demoContainer}>
            <ProfileTypeBadge profileType={selectedType} />
          </View>
        </View>

        {/* Quick Actions Demo */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            ProfileQuickActionsRow
          </Text>
          <View style={styles.demoContainer}>
            <ProfileQuickActionsRow profileType={selectedType} />
          </View>
          {selectedType === 'default' && (
            <Text style={[styles.note, { color: theme.colors.textMuted }]}>
              ℹ️ Default type has no quick actions
            </Text>
          )}
        </View>

        {/* Section Tabs Demo */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            ProfileSectionTabs
          </Text>
          <ProfileSectionTabs
            profileType={selectedType}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <Text style={[styles.activeTabIndicator, { color: theme.colors.accent }]}>
            Active Tab: {activeTab}
          </Text>
        </View>

        {/* All Badges Showcase */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            All Profile Types
          </Text>
          <View style={styles.badgesGrid}>
            {PROFILE_TYPES.map((type) => (
              <View key={type} style={styles.badgeItem}>
                <ProfileTypeBadge profileType={type} />
                <Text style={[styles.badgeLabel, { color: theme.colors.textMuted }]}>
                  {type}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Integration Example */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Integrated Layout Example
          </Text>
          <View style={styles.profileExample}>
            {/* Mock Avatar */}
            <View style={[styles.mockAvatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.mockAvatarText}>JD</Text>
            </View>
            
            {/* Mock Name */}
            <Text style={[styles.mockName, { color: theme.colors.textPrimary }]}>
              John Doe
            </Text>
            <Text style={[styles.mockUsername, { color: theme.colors.textMuted }]}>
              @johndoe
            </Text>
            
            {/* Badge */}
            <ProfileTypeBadge profileType={selectedType} style={{ marginTop: 8 }} />
            
            {/* Mock Bio */}
            <Text style={[styles.mockBio, { color: theme.colors.textSecondary }]}>
              Living my best life and sharing it with you! ✨
            </Text>
            
            {/* Quick Actions */}
            <ProfileQuickActionsRow profileType={selectedType} style={{ marginTop: 12 }} />
            
            {/* Mock Buttons */}
            <View style={styles.mockButtons}>
              <View style={[styles.mockButton, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.mockButtonText}>Follow</Text>
              </View>
              <View style={[styles.mockButton, { backgroundColor: theme.colors.border }]}>
                <Text style={[styles.mockButtonText, { color: theme.colors.textPrimary }]}>
                  Message
                </Text>
              </View>
            </View>
          </View>
          
          {/* Section Tabs */}
          <ProfileSectionTabs
            profileType={selectedType}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            style={{ marginTop: 16 }}
          />
          
          {/* Mock Content */}
          <View style={[styles.mockContent, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.mockContentText, { color: theme.colors.textMuted }]}>
              Section content for "{activeTab}" would appear here...
            </Text>
          </View>
        </View>

        {/* Documentation Link */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            📚 Documentation
          </Text>
          <Text style={[styles.docText, { color: theme.colors.textSecondary }]}>
            See MOBILE_UI_AGENT_2_DELIVERABLES.md for full documentation,
            integration guide, and API reference.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  section: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  demoContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  activeTabIndicator: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  badgeItem: {
    alignItems: 'center',
    gap: 6,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  profileExample: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  mockAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mockAvatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  mockName: {
    fontSize: 20,
    fontWeight: '800',
  },
  mockUsername: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  mockBio: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
  },
  mockButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  mockButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  mockButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mockContent: {
    padding: 24,
    borderRadius: 12,
    marginTop: 12,
  },
  mockContentText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  docText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export default ProfileTypeDemo;

