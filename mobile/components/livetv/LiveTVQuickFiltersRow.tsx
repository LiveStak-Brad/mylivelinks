import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

type Props = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function LiveTVQuickFiltersRow({ options, selected, onSelect }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {options.map((option) => {
          const active = option === selected;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => onSelect(option)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {option}
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
      paddingBottom: 10,
    },
    content: {
      paddingHorizontal: 16,
      gap: 8,
      paddingRight: 24,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    chipText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    chipTextActive: {
      color: '#fff',
    },
  });
}
