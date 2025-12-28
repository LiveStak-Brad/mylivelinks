/**
 * ProfileSectionTabs Component - Mobile
 * 
 * Horizontal scrollable chip-based tabs for profile sections.
 * Tabs vary based on profile type. Controlled via local state.
 * Does NOT render section content - only tab navigation.
 */

import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useThemeMode, ThemeDefinition } from '../contexts/ThemeContext';
import type { ProfileType } from './ProfileTypeBadge';

export type SectionTab = {
  id: string;
  label: string;
  emoji?: string;
};

interface ProfileSectionTabsProps {
  /** The profile type determines which tabs to show */
  profileType: ProfileType;
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when tab is selected */
  onTabChange: (tabId: string) => void;
  /** Optional custom style */
  style?: any;
}

const PROFILE_SECTIONS: Record<ProfileType, SectionTab[]> = {
  streamer: [
    { id: 'about', label: 'About' },
    { id: 'streams', label: 'Streams', emoji: '📺' },
    { id: 'highlights', label: 'Highlights', emoji: '⭐' },
    { id: 'schedule', label: 'Schedule', emoji: '📅' },
    { id: 'community', label: 'Community', emoji: '👥' },
  ],
  musician: [
    { id: 'about', label: 'About' },
    { id: 'music', label: 'Music', emoji: '🎵' },
    { id: 'videos', label: 'Videos', emoji: '🎬' },
    { id: 'shows', label: 'Shows', emoji: '🎤' },
    { id: 'merch', label: 'Merch', emoji: '👕' },
  ],
  comedian: [
    { id: 'about', label: 'About' },
    { id: 'clips', label: 'Clips', emoji: '🎭' },
    { id: 'shows', label: 'Shows', emoji: '🎫' },
    { id: 'reviews', label: 'Reviews', emoji: '⭐' },
  ],
  business: [
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services', emoji: '💼' },
    { id: 'products', label: 'Products', emoji: '🛍️' },
    { id: 'reviews', label: 'Reviews', emoji: '⭐' },
    { id: 'contact', label: 'Contact', emoji: '📧' },
  ],
  creator: [
    { id: 'about', label: 'About' },
    { id: 'featured', label: 'Featured', emoji: '✨' },
    { id: 'gallery', label: 'Gallery', emoji: '🖼️' },
    { id: 'posts', label: 'Posts', emoji: '📝' },
    { id: 'links', label: 'Links', emoji: '🔗' },
  ],
  default: [
    { id: 'about', label: 'About' },
    { id: 'posts', label: 'Posts' },
    { id: 'media', label: 'Media' },
  ],
};

export function ProfileSectionTabs({
  profileType,
  activeTab,
  onTabChange,
  style,
}: ProfileSectionTabsProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const scrollViewRef = useRef<ScrollView>(null);

  const tabs = PROFILE_SECTIONS[profileType] || PROFILE_SECTIONS.default;

  // Auto-scroll to active tab when it changes
  const handleTabPress = (tabId: string, index: number) => {
    onTabChange(tabId);
    // Optionally scroll to make active tab visible
    scrollViewRef.current?.scrollTo({
      x: index * 100, // Approximate scroll position
      animated: true,
    });
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          
          return (
            <Pressable
              key={tab.id}
              style={({ pressed }) => [
                styles.tab,
                isActive && styles.tabActive,
                pressed && !isActive && styles.tabPressed,
              ]}
              onPress={() => handleTabPress(tab.id, index)}
            >
              {tab.emoji && (
                <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              )}
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  const isLight = theme.mode === 'light';
  const accentColor = theme.colors.accent;
  
  return StyleSheet.create({
    container: {
      width: '100%',
    },
    scrollView: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: isLight 
        ? 'rgba(139, 92, 246, 0.08)' 
        : 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1.5,
      borderColor: 'transparent',
      gap: 6,
      minWidth: 80,
    },
    tabActive: {
      backgroundColor: isLight
        ? 'rgba(139, 92, 246, 0.15)'
        : 'rgba(139, 92, 246, 0.25)',
      borderColor: accentColor,
      // Enhanced shadow for active tab
      shadowColor: accentColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    tabPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.97 }],
    },
    tabEmoji: {
      fontSize: 14,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    tabLabelActive: {
      color: accentColor,
      fontWeight: '700',
    },
  });
}

export default ProfileSectionTabs;




