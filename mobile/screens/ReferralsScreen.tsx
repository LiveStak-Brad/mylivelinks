import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import type { RootStackParamList } from '../types/navigation';
import { PageHeader, PageShell } from '../components/ui';
import { InviteLinkModal } from '../components/InviteLinkModal';
import { ReferralProgress } from '../components/ReferralProgress';
import { ReferralLeaderboardPreview } from '../components/ReferralLeaderboardPreview';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Referrals'>;

export function ReferralsScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <PageShell
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={() => navigation.getParent?.()?.navigate?.('MainTabs', { screen: 'Home' })}
      onNavigateToProfile={(username) => navigation.getParent?.()?.navigate?.('MainTabs', { screen: 'Profile', params: { username } })}
      onNavigateToRooms={() => navigation.getParent?.()?.navigate?.('Rooms')}
    >
      <PageHeader icon="users" iconColor="#8b5cf6" title="Referrals" />

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite & referrals</Text>
          <Text style={styles.cardSubtitle}>
            Share your invite link to bring quality creators and viewers to MyLiveLinks. Track clicks, joins, and rankings.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryButtonPressed : null]}
            onPress={() => setShowInviteModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Open invite link"
          >
            <Feather name="link" size={16} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Open Invite Link</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ReferralProgress
            theme={theme}
            onShareInvite={() => setShowInviteModal(true)}
            onViewLeaderboard={() => navigation.navigate('ReferralsLeaderboard')}
          />
        </View>

        <View style={styles.section}>
          <ReferralLeaderboardPreview
            theme={theme}
            showCurrentUser
            onViewFull={() => navigation.navigate('ReferralsLeaderboard')}
            onPressEntry={({ username }) =>
              navigation.getParent?.()?.navigate?.('MainTabs', { screen: 'Profile', params: { username } })
            }
          />
        </View>
      </View>

      <InviteLinkModal visible={showInviteModal} onClose={() => setShowInviteModal(false)} />
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
      gap: 14,
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
    card: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
      marginBottom: 6,
    },
    cardSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12,
    },
    primaryButton: {
      height: 44,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.accent,
    },
    buttonIcon: {
      marginRight: -4,
    },
    primaryButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },
  });
}


