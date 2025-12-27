import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, PageShell } from '../components/ui';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Theme'>;

export function ThemeScreen({ navigation }: Props) {
  const { mode, setMode, theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const options = useMemo(
    () => [
      { key: 'light' as const, label: 'Light' },
      { key: 'dark' as const, label: 'Dark' },
    ],
    []
  );

  return (
    <PageShell
      title="Theme"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      <View style={styles.card}>
        {options.map((o) => {
          const active = mode === o.key;
          return (
            <Pressable
              key={o.key}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null, active ? styles.activeRow : null]}
              onPress={() => setMode(o.key)}
            >
              <Text style={[styles.rowLabel, active ? styles.activeLabel : null]}>{o.label}</Text>
              <Text style={[styles.check, active ? styles.activeLabel : styles.muted]}>{active ? '✓' : ''}</Text>
            </Pressable>
          );
        })}
      </View>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    headerButton: {
      height: 36,
      paddingHorizontal: 12,
    },
    container: {
      flex: 1,
      padding: 16,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    row: {
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pressed: {
      opacity: 0.92,
    },
    activeRow: {
      backgroundColor: theme.colors.highlight,
    },
    rowLabel: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    activeLabel: {
      color: theme.colors.accentSecondary,
    },
    muted: {
      color: theme.colors.mutedText,
    },
    check: {
      fontSize: 14,
      fontWeight: '900',
    },
  });
}
