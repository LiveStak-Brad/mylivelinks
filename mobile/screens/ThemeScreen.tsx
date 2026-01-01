import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, PageShell } from '../components/ui';
import { LegalFooter } from '../components/LegalFooter';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Theme'>;

export function ThemeScreen({ navigation }: Props) {
  const { mode, setMode, theme, cardOpacity, setCardOpacity } = useThemeMode();
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
      <View style={styles.body}>
        {/* Theme Mode Selection */}
        <Text style={styles.sectionTitle}>Color Mode</Text>
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

        {/* Card Opacity Slider */}
        <Text style={styles.sectionTitle}>Card Opacity</Text>
        <View style={styles.card}>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Transparency: {Math.round(cardOpacity * 100)}%
            </Text>
            <Text style={styles.sliderHint}>
              Adjust how see-through cards and panels appear
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0.3}
              maximumValue={1}
              step={0.05}
              value={cardOpacity}
              onValueChange={setCardOpacity}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.accent}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderEndLabel}>30% (See-through)</Text>
              <Text style={styles.sliderEndLabel}>100% (Solid)</Text>
            </View>
          </View>
        </View>
      </View>

      <LegalFooter />
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
    },
    body: {
      flex: 1,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginTop: 12,
      marginBottom: 12,
      marginLeft: 4,
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
      marginBottom: 16,
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
    sliderContainer: {
      padding: 16,
    },
    sliderLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    sliderHint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 16,
    },
    slider: {
      width: '100%',
      height: 40,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    sliderEndLabel: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
  });
}
