import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ProfileTab } from '../../config/profileTypeConfig';

interface ProfileTabBarProps {
  tabs: Array<{ id: ProfileTab; label: string; icon: string }>;
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  colors: any;
}

export default function ProfileTabBar({ tabs, activeTab, onTabChange, colors }: ProfileTabBarProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={[
                styles.tab,
                isActive && styles.tabActive,
                isActive && { borderBottomColor: colors.primary },
              ]}
            >
              <Feather
                name={tab.icon as any}
                size={18}
                color={isActive ? colors.primary : colors.mutedText}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? colors.primary : colors.mutedText },
                  isActive && styles.tabTextActive,
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

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '700',
  },
});
