import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Theme'>;

type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme_preference';

export function ThemeScreen({ navigation }: Props) {
  const [value, setValue] = useState<ThemeChoice>('system');

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw === 'light' || raw === 'dark' || raw === 'system') {
          setValue(raw);
        }
      } catch {
      }
    };
    void load();
  }, []);

  const setAndSave = async (next: ThemeChoice) => {
    setValue(next);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, next);
    } catch {
    }
  };

  const options = useMemo(
    () => [
      { key: 'light' as const, label: 'Light' },
      { key: 'dark' as const, label: 'Dark' },
      { key: 'system' as const, label: 'System' },
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
          const active = value === o.key;
          return (
            <Pressable
              key={o.key}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null, active ? styles.activeRow : null]}
              onPress={() => void setAndSave(o.key)}
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

const styles = StyleSheet.create({
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
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.9,
  },
  activeRow: {
    backgroundColor: 'rgba(94, 155, 255, 0.12)',
  },
  rowLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  activeLabel: {
    color: '#5E9BFF',
  },
  muted: {
    color: '#6b7280',
  },
  check: {
    fontSize: 14,
    fontWeight: '900',
  },
});
