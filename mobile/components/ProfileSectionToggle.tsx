import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProfileSection, ProfileType } from '../config/profileTypeConfig';
import { PROFILE_TYPE_CONFIG } from '../config/profileTypeConfig';

// ============================================================================
// SECTION METADATA
// ============================================================================

interface SectionMetadata {
  id: ProfileSection;
  label: string;
  description: string;
  isCore: boolean; // Core sections must always have at least one enabled
}

const SECTION_METADATA: Record<ProfileSection, SectionMetadata> = {
  hero: {
    id: 'hero',
    label: 'Hero / Banner',
    description: 'Your profile header with avatar, name, and bio',
    isCore: true,
  },
  social_counts: {
    id: 'social_counts',
    label: 'Social Counts',
    description: 'Follower count and engagement stats',
    isCore: false,
  },
  top_supporters: {
    id: 'top_supporters',
    label: 'Top Supporters',
    description: 'Users who have given you the most gifts',
    isCore: false,
  },
  top_streamers: {
    id: 'top_streamers',
    label: 'Top Streamers',
    description: 'Top streamers you support with gifts',
    isCore: false,
  },
  social_media: {
    id: 'social_media',
    label: 'Social Media Links',
    description: 'Instagram, Twitter, TikTok, etc.',
    isCore: false,
  },
  connections: {
    id: 'connections',
    label: 'Connections',
    description: 'Your followers and following list',
    isCore: false,
  },
  links: {
    id: 'links',
    label: 'Featured Links',
    description: 'Your custom link buttons (Linktree-style)',
    isCore: true,
  },
  profile_stats: {
    id: 'profile_stats',
    label: 'Profile Stats',
    description: 'Account age, join date, and other profile info',
    isCore: false,
  },
  streaming_stats: {
    id: 'streaming_stats',
    label: 'Streaming Stats',
    description: 'Live streaming hours, viewer counts, etc.',
    isCore: false,
  },
  music_showcase: {
    id: 'music_showcase',
    label: 'Music Showcase',
    description: 'Your tracks, albums, and music links',
    isCore: false,
  },
  upcoming_events: {
    id: 'upcoming_events',
    label: 'Upcoming Events',
    description: 'Shows, gigs, and event schedule',
    isCore: false,
  },
  merchandise: {
    id: 'merchandise',
    label: 'Merchandise',
    description: 'Your merch store and products',
    isCore: false,
  },
  portfolio: {
    id: 'portfolio',
    label: 'Portfolio / Products',
    description: 'Your work portfolio or product catalog',
    isCore: false,
  },
  business_info: {
    id: 'business_info',
    label: 'Business Info',
    description: 'Hours, location, contact info',
    isCore: false,
  },
  footer: {
    id: 'footer',
    label: 'Footer',
    description: 'Profile footer with branding',
    isCore: true,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface ProfileSectionToggleProps {
  profileType: ProfileType;
  currentEnabledSections?: ProfileSection[] | null;
  onChange: (enabledSections: ProfileSection[]) => void;
}

export default function ProfileSectionToggle({
  profileType,
  currentEnabledSections,
  onChange,
}: ProfileSectionToggleProps) {
  const [enabledSections, setEnabledSections] = useState<Set<ProfileSection>>(new Set());

  // Initialize: use custom list if present, else fallback to profile_type defaults
  useEffect(() => {
    if (currentEnabledSections && currentEnabledSections.length > 0) {
      // User has custom selection
      setEnabledSections(new Set(currentEnabledSections));
    } else {
      // Fallback to profile type defaults
      const config = PROFILE_TYPE_CONFIG[profileType];
      const defaults = config.sections.filter((s) => s.enabled).map((s) => s.id);
      setEnabledSections(new Set(defaults));
    }
  }, [profileType, currentEnabledSections]);

  // Get all sections available for this profile type
  const availableSections = PROFILE_TYPE_CONFIG[profileType].sections.map((s) => s.id);

  const toggleSection = (sectionId: ProfileSection) => {
    const newSet = new Set(enabledSections);

    if (newSet.has(sectionId)) {
      // Prevent disabling all core sections
      const coreEnabled = Array.from(newSet).filter((id) => SECTION_METADATA[id]?.isCore);

      if (SECTION_METADATA[sectionId].isCore && coreEnabled.length <= 1) {
        Alert.alert(
          'Core Section Required',
          'You must keep at least one core section enabled (Hero, Links, or Footer).'
        );
        return;
      }

      newSet.delete(sectionId);
    } else {
      newSet.add(sectionId);
    }

    setEnabledSections(newSet);
    onChange(Array.from(newSet));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="options" size={20} color="#3B82F6" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Customize Profile Sections</Text>
          <Text style={styles.subtitle}>
            Choose which sections appear on your profile. Sections without content will be hidden from visitors.
          </Text>
        </View>
      </View>

      {/* Section List */}
      <View style={styles.sectionList}>
        {availableSections.map((sectionId) => {
          const metadata = SECTION_METADATA[sectionId];
          if (!metadata) return null;

          const isEnabled = enabledSections.has(sectionId);

          return (
            <Pressable
              key={sectionId}
              onPress={() => toggleSection(sectionId)}
              style={({ pressed }) => [
                styles.sectionItem,
                isEnabled ? styles.sectionItemEnabled : styles.sectionItemDisabled,
                pressed && styles.sectionItemPressed,
              ]}
            >
              {/* Checkbox */}
              <View
                style={[
                  styles.checkbox,
                  isEnabled ? styles.checkboxEnabled : styles.checkboxDisabled,
                ]}
              >
                {isEnabled && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>

              {/* Section Info */}
              <View style={styles.sectionInfo}>
                <View style={styles.sectionLabelRow}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      isEnabled ? styles.sectionLabelEnabled : styles.sectionLabelDisabled,
                    ]}
                  >
                    {metadata.label}
                  </Text>
                  {metadata.isCore && (
                    <View style={styles.coreBadge}>
                      <Text style={styles.coreBadgeText}>CORE</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.sectionDescription,
                    isEnabled
                      ? styles.sectionDescriptionEnabled
                      : styles.sectionDescriptionDisabled,
                  ]}
                >
                  {metadata.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerIcon}>💡</Text>
        <Text style={styles.infoBannerText}>
          <Text style={styles.infoBannerBold}>Note:</Text> Sections without content (e.g., no tracks,
          no events) will be automatically hidden from visitors even if enabled. At least one core
          section must remain enabled.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#9aa0a6',
    lineHeight: 16,
  },
  sectionList: {
    gap: 8,
  },
  sectionItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  sectionItemEnabled: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.10)',
  },
  sectionItemDisabled: {
    borderColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  sectionItemPressed: {
    opacity: 0.7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEnabled: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  checkboxDisabled: {
    borderColor: 'rgba(255, 255, 255, 0.30)',
    backgroundColor: 'transparent',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionLabelEnabled: {
    color: '#fff',
  },
  sectionLabelDisabled: {
    color: '#9aa0a6',
  },
  sectionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionDescriptionEnabled: {
    color: '#ccc',
  },
  sectionDescriptionDisabled: {
    color: '#6b7280',
  },
  coreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.20)',
  },
  coreBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.30)',
  },
  infoBannerIcon: {
    fontSize: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#fbbf24',
    lineHeight: 15,
  },
  infoBannerBold: {
    fontWeight: '800',
  },
});

