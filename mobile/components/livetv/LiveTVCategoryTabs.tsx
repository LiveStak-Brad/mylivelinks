import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

type Props = {
  tabs: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function LiveTVCategoryTabs({ tabs, selected, onSelect }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {tabs.map((tab) => {
          const active = tab === selected;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => onSelect(tab)}
              style={[styles.tab, active ? styles.tabActive : null]}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      paddingTop: 10,
      paddingBottom: 6,
    },
    content: {
      paddingHorizontal: 16,
      gap: 10,
      paddingRight: 24,
    },
    tab: {
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: theme.colors.accent,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '800',
    },
    tabTextActive: {
      color: theme.colors.textPrimary,
    },
  });
}
