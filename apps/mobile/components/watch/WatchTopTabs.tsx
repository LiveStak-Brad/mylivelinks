import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type WatchTabId = 'trending' | 'new' | 'nearby' | 'following' | 'foryou';

export interface WatchTab {
  id: WatchTabId;
  label: string;
}

const TABS: WatchTab[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'following', label: 'Following' },
  { id: 'foryou', label: 'For You' },
];

interface WatchTopTabsProps {
  activeTab: WatchTabId;
  onTabPress: (tabId: WatchTabId) => void;
}

export default function WatchTopTabs({ activeTab, onTabPress }: WatchTopTabsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onTabPress(tab.id)}
              style={styles.tabButton}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 20,
    alignItems: 'center',
  },
  tabButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  activeIndicator: {
    marginTop: 4,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
});
