import React, { useCallback, useMemo } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

const WEB_BASE_URL = 'https://www.mylivelinks.com';

const LINKS = {
  terms: `${WEB_BASE_URL}/policies/terms-of-service`,
  privacy: `${WEB_BASE_URL}/policies/privacy-policy`,
  guidelines: `${WEB_BASE_URL}/policies/community-guidelines`,
} as const;

export function LegalFooter({ extraBottomPadding = 0 }: { extraBottomPadding?: number }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, insets.bottom, extraBottomPadding), [extraBottomPadding, insets.bottom, theme]);

  const navigateSafetyPolicies = useCallback(() => {
    try {
      navigation.getParent?.()?.navigate?.('SafetyPolicies');
      return;
    } catch {
      // ignore
    }
    try {
      navigation.navigate?.('SafetyPolicies');
    } catch {
      // ignore
    }
  }, [navigation]);

  const openUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', url);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.row}>
        <FooterLink
          label="Safety & Policies"
          onPress={navigateSafetyPolicies}
          styles={styles}
        />
        <FooterLink label="Terms" onPress={() => void openUrl(LINKS.terms)} styles={styles} />
        <FooterLink label="Privacy" onPress={() => void openUrl(LINKS.privacy)} styles={styles} />
        <FooterLink label="Guidelines" onPress={() => void openUrl(LINKS.guidelines)} styles={styles} />
      </View>
    </View>
  );
}

function FooterLink({ label, onPress, styles }: { label: string; onPress: () => void; styles: ReturnType<typeof createStyles> }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed ? styles.linkPressed : null]}
      hitSlop={8}
    >
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: ThemeDefinition, safeBottom: number, extraBottomPadding: number) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.cardSurface,
      paddingBottom: Math.max(safeBottom, 8) + Math.max(extraBottomPadding, 0),
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingTop: 8,
      rowGap: 6,
      columnGap: 8,
    },
    link: {
      minHeight: 44,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 10,
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    linkPressed: {
      backgroundColor: theme.colors.highlight,
    },
    linkText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
  });
}
