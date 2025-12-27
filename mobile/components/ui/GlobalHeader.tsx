/**
 * GlobalHeader Component - Mobile (MOBILE PARITY v4.0)
 * 
 * DESIGN RULES (LOCKED):
 * - Left: Gold trophy icon (🏆) + Red video icon (📹 Rooms)
 * - Center: MyLiveLinks logo
 * - Right: Avatar circle (with initials fallback)
 * - This header is IDENTICAL on every screen
 * 
 * STRUCTURE:
 * ┌───────────────────────────────────────┐
 * │ [🏆][📹]    [Logo]         [Avatar]   │
 * └───────────────────────────────────────┘
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { BrandLogo } from './BrandLogo';
import { UserMenu } from '../UserMenu';
import { LeaderboardModal } from '../LeaderboardModal';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

type GlobalHeaderProps = {
  onNavigateHome?: () => void;
  onNavigateToProfile?: (username: string) => void;
  onNavigateToSettings?: () => void;
  onNavigateToWallet?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToApply?: () => void;
  onNavigateToRooms?: () => void;
  onLogout?: () => void;
};

export function GlobalHeader({
  onNavigateHome,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToWallet,
  onNavigateToAnalytics,
  onNavigateToApply,
  onNavigateToRooms,
  onLogout,
}: GlobalHeaderProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <>
      <View style={styles.container}>
        {/* Left Section: Trophy + Rooms */}
        <View style={styles.leftSection}>
          {/* Leaderboard Trophy (Gold) */}
          <Pressable 
            style={styles.iconButton}
            onPress={() => setShowLeaderboard(true)}
          >
            <Ionicons name="trophy-outline" size={24} color="#f59e0b" />
          </Pressable>
          
          {/* Rooms Video Icon (Red) */}
          <Pressable 
            style={styles.iconButton}
            onPress={onNavigateToRooms}
          >
            <Feather name="video" size={24} color="#f44336" />
          </Pressable>
        </View>

        {/* Center Section: Logo */}
        <Pressable
          style={styles.centerSection}
          onPress={onNavigateHome}
        >
          <BrandLogo size={90} />
        </Pressable>

        {/* Right Section: User Menu (Avatar Circle) */}
        <View style={styles.rightSection}>
          <UserMenu
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToSettings={onNavigateToSettings}
            onNavigateToWallet={onNavigateToWallet}
            onNavigateToAnalytics={onNavigateToAnalytics}
            onNavigateToApply={onNavigateToApply}
            onLogout={onLogout}
          />
        </View>
      </View>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        visible={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        onNavigateToProfile={onNavigateToProfile}
      />
    </>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      height: 56,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: 96, // Fixed width: 2 buttons (40px each) + gap (8px) + padding
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    centerSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rightSection: {
      width: 96, // Match left section width for centering
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
  });
}
