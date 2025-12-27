import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { PageShell } from '../components/ui';
import type { MainTabsParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = BottomTabScreenProps<MainTabsParamList, 'Rooms'>;

export function RoomsScreen(_props: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <PageShell title="Rooms" contentStyle={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.placeholder}>
          <Text style={styles.title}>🎥 Rooms</Text>
          <Text style={styles.subtitle}>Live streaming rooms</Text>
          <Text style={styles.text}>
            Discover and join live streaming rooms. Watch live content, interact with hosts, and connect with other viewers.
          </Text>
        </View>
      </ScrollView>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    content: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    placeholder: {
      padding: 20,
      borderRadius: 18,
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 28,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    text: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 320,
    },
  });
}
