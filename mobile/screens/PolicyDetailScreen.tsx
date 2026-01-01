import React, { useEffect, useMemo, useRef } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';
import { PageShell } from '../components/ui';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

const WEB_BASE_URL = 'https://www.mylivelinks.com';

type Props = NativeStackScreenProps<RootStackParamList, 'PolicyDetail'>;

export function PolicyDetailScreen({ navigation, route }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const openedRef = useRef(false);

  const url = useMemo(() => `${WEB_BASE_URL}/policies/${route.params.id}`, [route.params.id]);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    void (async () => {
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert('Unable to open link', url);
      }
    })();
  }, [url]);

  return (
    <PageShell
      title="Policy"
      left={
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      }
    >
      <View style={styles.container}>
        <Text style={styles.title}>Opening policy…</Text>
        <Text style={styles.meta}>{url}</Text>

        <Pressable onPress={() => Linking.openURL(url)} style={styles.openBtn}>
          <Text style={styles.openBtnText}>Open in Browser</Text>
        </Pressable>
      </View>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      padding: 16,
      paddingBottom: 28,
    },
    backBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    backText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    title: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 6,
    },
    meta: {
      color: theme.colors.mutedText,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 14,
    },
    openBtn: {
      marginTop: 6,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
    },
    openBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },
  });
}

