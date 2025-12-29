import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomRules'>;

type Rule = {
  title: string;
  description: string;
  iconName: string;
  iconColor: string;
};

const RULES: Rule[] = [
  {
    iconName: 'shield-checkmark',
    iconColor: '#10b981',
    title: 'Be Respectful',
    description: 'Treat everyone with respect. Harassment, hate speech, and bullying are not tolerated.',
  },
  {
    iconName: 'alert-circle',
    iconColor: '#ef4444',
    title: 'Age Requirement',
    description: 'All users and streamers must be 18+ years old. No exceptions.',
  },
  {
    iconName: 'camera',
    iconColor: '#8b5cf6',
    title: 'Content Guidelines',
    description: 'Follow content guidelines for your room type. Adult content only in 18+ verified rooms.',
  },
  {
    iconName: 'chatbubbles',
    iconColor: '#3b82f6',
    title: 'Chat Etiquette',
    description: 'No spam, excessive caps, or disruptive behavior in chat. Keep it positive!',
  },
  {
    iconName: 'heart',
    iconColor: '#ec4899',
    title: 'Support Streamers',
    description: 'Tipping is appreciated but never required. Be generous when you can!',
  },
  {
    iconName: 'flag',
    iconColor: '#f59e0b',
    title: 'Report Issues',
    description: 'Report any violations using the Report button. Our moderators are here to help.',
  },
];

export function RoomRulesScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <PageShell
      title="Room Rules"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          To keep MyLiveLinks fun and safe for everyone, please follow these community guidelines:
        </Text>

        {RULES.map((r) => (
          <View key={r.title} style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name={r.iconName as any} size={20} color={r.iconColor} />
              <Text style={styles.cardTitle}>{r.title}</Text>
            </View>
            <Text style={styles.cardBody}>{r.description}</Text>
          </View>
        ))}

        <View style={styles.warn}>
          <View style={styles.warnHeader}>
            <Ionicons name="warning" size={18} color="#fbbf24" />
            <Text style={styles.warnTitle}>Important Notice</Text>
          </View>
          <Text style={styles.warnText}>
            Violations may result in: Chat mute, temporary timeout, or permanent ban from the platform.
          </Text>
        </View>
      </ScrollView>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const isDark = theme.mode === 'dark';
  return StyleSheet.create({
    headerButton: {
      height: 36,
      paddingHorizontal: 12,
    },
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    scroll: {
      paddingBottom: 24,
      gap: 12,
    },
    intro: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      padding: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '900',
    },
    cardBody: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    warn: {
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.5)',
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.10)' : 'rgba(254, 243, 199, 1)',
      borderRadius: 14,
      padding: 12,
    },
    warnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    warnTitle: {
      color: isDark ? '#fbbf24' : '#d97706',
      fontSize: 13,
      fontWeight: '800',
    },
    warnText: {
      color: isDark ? '#fcd34d' : '#92400e',
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
    },
  });
}
