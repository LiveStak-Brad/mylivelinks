import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export type LiveTVGenderFilter = 'All' | 'Men' | 'Women';

type Props = {
  value: LiveTVGenderFilter;
  onChange: (value: LiveTVGenderFilter) => void;
};

const OPTIONS: LiveTVGenderFilter[] = ['All', 'Men', 'Women'];

export function LiveTVGenderSegmentedControl({ value, onChange }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.segment,
              active ? styles.segmentActive : null,
              pressed ? styles.segmentPressed : null,
            ]}
          >
            <Text style={[styles.text, active ? styles.textActive : null]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      marginHorizontal: 16,
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: {
      backgroundColor: theme.colors.accent,
    },
    segmentPressed: {
      opacity: 0.92,
    },
    text: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    textActive: {
      color: '#fff',
    },
  });
}
