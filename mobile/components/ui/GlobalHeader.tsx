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

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { BrandLogo } from './BrandLogo';
import { UserMenu } from '../UserMenu';
import { LeaderboardModal } from '../LeaderboardModal';
import { SearchModal } from '../SearchModal';
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
  const navigation = useNavigation<any>();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const navigateToTab = useCallback(
    (tabName: string, params?: any) => {
      // IMPORTANT: navigation.navigate() does not throw if a route is missing; it can silently no-op.
      // So we explicitly check if the current navigator knows this tab.
      const state = navigation.getState?.();
      const routeNames: string[] = Array.isArray(state?.routeNames) ? state.routeNames : [];

      if (routeNames.includes(tabName)) {
        navigation.navigate(tabName, params);
        return;
      }

      // Otherwise, bubble up to the parent (RootStack) and target MainTabs -> tab.
      const parent = navigation.getParent?.();
      if (parent?.navigate) {
        parent.navigate('MainTabs', { screen: tabName, params });
        return;
      }

      // Last resort: attempt from current nav.
      navigation.navigate('MainTabs', { screen: tabName, params });
    },
    [navigation]
  );

  const navigateToRoot = useCallback(
    (routeName: string, params?: any) => {
      const state = navigation.getState?.();
      const routeNames: string[] = Array.isArray(state?.routeNames) ? state.routeNames : [];

      if (routeNames.includes(routeName)) {
        navigation.navigate(routeName, params);
        return;
      }

      const parent = navigation.getParent?.();
      if (parent?.navigate) {
        parent.navigate(routeName, params);
        return;
      }

      navigation.navigate(routeName, params);
    },
    [navigation]
  );

  const handleRoomsPress = useCallback(() => {
    try {
      onNavigateToRooms?.();
    } catch {
      // ignore
    }
    // Rooms is a RootStack screen (NOT a bottom tab).
    navigateToRoot('Rooms');
  }, [navigateToRoot, onNavigateToRooms]);

  const handleHomePress = useCallback(() => {
    try {
      onNavigateHome?.();
    } catch {
      // ignore
    }
    navigateToTab('Home');
  }, [navigateToTab, onNavigateHome]);

  const handleProfilePress = useCallback(
    (username: string) => {
      try {
        onNavigateToProfile?.(username);
      } catch {
        // ignore
      }

      // Always attempt fallback navigation so it works even when callback is a stub.
      navigateToTab('Profile', { username });
    },
    [navigateToTab, onNavigateToProfile]
  );

  return (
    <>
      <View style={styles.container}>
        {/* Left Section: Trophy + Rooms + Search */}
        <View style={styles.leftSection}>
          {/* Leaderboard Trophy (Gold) */}
          <Pressable 
            style={styles.iconButton}
            onPress={() => setShowLeaderboard(true)}
          >
            <Ionicons name="trophy-outline" size={24} color="#f59e0b" />
          </Pressable>
          
          {/* Rooms Video Icon (Red) */}
          <Pressable style={styles.iconButton} onPress={handleRoomsPress}>
            <Feather name="video" size={24} color="#f44336" />
          </Pressable>

          {/* Search Icon (Blue) */}
          <Pressable 
            style={styles.iconButton}
            onPress={() => setShowSearch(true)}
          >
            <Feather name="search" size={24} color="#3b82f6" />
          </Pressable>
        </View>

        {/* Center Section: Logo */}
        <Pressable
          style={styles.centerSection}
          onPress={handleHomePress}
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
        onNavigateToProfile={handleProfilePress}
      />

      {/* Search Modal */}
      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onNavigateToProfile={handleProfilePress}
        onNavigateToRoom={handleRoomsPress}
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
      width: 136, // Fixed width: 3 buttons (40px each) + 2 gaps (8px each) + padding
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
      width: 136, // Match left section width for centering
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
  });
}
