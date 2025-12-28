import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';
import { PageHeader, PageShell } from '../components/ui';
import { ReferralLeaderboardPreview } from '../components/ReferralLeaderboardPreview';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ReferralsLeaderboard'>;

export function ReferralsLeaderboardScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <PageShell
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={() => navigation.getParent?.()?.navigate?.('MainTabs', { screen: 'Home' })}
      onNavigateToProfile={(username) => navigation.getParent?.()?.navigate?.('MainTabs', { screen: 'Profile', params: { username } })}
      onNavigateToRooms={() => navigation.getParent?.()?.navigate?.('Rooms')}
    >
      <PageHeader icon="award" iconColor="#f59e0b" title="Referral Leaderboard" />

      <View style={styles.content}>
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Leaderboard</Text>
          <Text style={styles.noteText}>
            Showing the top referrers (and your position if you’re outside the top 5).
          </Text>
          <Text style={styles.noteTextMuted}>
            TODO(LOGIC): Add paginated full leaderboard list UI + tap-to-profile for each row.
          </Text>
        </View>

        <View style={styles.section}>
          <ReferralLeaderboardPreview theme={theme} showCurrentUser onViewFull={undefined} />
        </View>
      </View>
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
      gap: 12,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    section: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    noteCard: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: Math.max(2, cardShadow.elevation - 1),
    },
    noteTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
      marginBottom: 6,
    },
    noteText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 10,
    },
    noteTextMuted: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}


