/**
 * GlobalHeader Component - Mobile (REBUILT FOR PARITY)
 * 
 * WEB PARITY: components/GlobalHeader.tsx
 * 
 * STRUCTURE (matching web exactly):
 * ┌──────────────────────────────────────────────────┐
 * │ [Logo] [Trophy]          [Messages] [Noties] [Avatar▼] [⚙️Options] │
 * └──────────────────────────────────────────────────┘
 * 
 * FEATURES:
 * - Logo (left, clickable → Home)
 * - Trophy icon (opens Leaderboards modal)
 * - Messages icon with badge (right side, logged in only)
 * - Noties icon with badge (right side, logged in only)
 * - UserMenu dropdown (avatar with chevron, logged in = dropdown, logged out = Login button)
 * - OptionsMenu button (gear icon, always visible)
 * 
 * ENTRY POINTS FOR LEADERBOARDS:
 * - Trophy icon (next to logo) - PRIMARY ENTRY POINT
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BrandLogo } from './BrandLogo';
import { UserMenu } from '../UserMenu';
import { OptionsMenu } from '../OptionsMenu';
import { LeaderboardModal } from '../LeaderboardModal';
import { useTopBarState } from '../../hooks/topbar/useTopBarState';

type GlobalHeaderProps = {
  onNavigateHome?: () => void;
  onNavigateToProfile?: (username: string) => void;
  onNavigateToSettings?: () => void;
  onNavigateToWallet?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToApply?: () => void;
  onLogout?: () => void;
};

export function GlobalHeader({
  onNavigateHome,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToWallet,
  onNavigateToAnalytics,
  onNavigateToApply,
  onLogout,
}: GlobalHeaderProps) {
  const navigation = useNavigation<any>();
  const topBar = useTopBarState();

  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const messagesBadgeText = useMemo(() => {
    const c = Number(topBar.unreadMessagesCount ?? 0);
    if (c <= 0) return '';
    return c > 99 ? '99+' : String(c);
  }, [topBar.unreadMessagesCount]);

  const notiesBadgeText = useMemo(() => {
    const c = Number(topBar.unreadNotiesCount ?? 0);
    if (c <= 0) return '';
    return c > 99 ? '99+' : String(c);
  }, [topBar.unreadNotiesCount]);

  const navigateToTab = (tabName: 'Messages' | 'Noties') => {
    try {
      navigation.navigate(tabName);
      return;
    } catch {
    }
    try {
      const parent = navigation.getParent?.();
      parent?.navigate?.(tabName);
    } catch {
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* Left Section: Logo + Trophy */}
        <View style={styles.leftSection}>
          {/* Logo */}
          <Pressable
            style={styles.logoContainer}
            onPress={onNavigateHome}
          >
            <BrandLogo size={100} />
          </Pressable>

          {/* Trophy - Leaderboard Button */}
          <Pressable
            style={styles.trophyButton}
            onPress={() => setShowLeaderboard(true)}
          >
            <Text style={styles.trophyIcon}>🏆</Text>
          </Pressable>
        </View>

        {/* Right Section: Messages, Noties, UserMenu, OptionsMenu */}
        <View style={styles.rightSection}>
          {/* Messages & Noties - Only show when logged in */}
          {topBar.isLoggedIn && (
            <>
              {/* Messages Icon */}
              <Pressable style={styles.iconButton} onPress={() => navigateToTab('Messages')}>
                <Text style={styles.iconEmoji}>💬</Text>
                {topBar.showMessagesBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{messagesBadgeText}</Text>
                  </View>
                )}
              </Pressable>

              {/* Noties Icon */}
              <Pressable style={styles.iconButton} onPress={() => navigateToTab('Noties')}>
                <Text style={styles.iconEmoji}>🔔</Text>
                {topBar.showNotiesBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{notiesBadgeText}</Text>
                  </View>
                )}
              </Pressable>
            </>
          )}

          {/* UserMenu */}
          <UserMenu
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToSettings={onNavigateToSettings}
            onNavigateToWallet={onNavigateToWallet}
            onNavigateToAnalytics={onNavigateToAnalytics}
            onLogout={onLogout}
          />

          {/* OptionsMenu */}
          <OptionsMenu
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToSettings={onNavigateToSettings}
            onNavigateToWallet={onNavigateToWallet}
            onNavigateToApply={onNavigateToApply}
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

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#000',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  logoContainer: {
    paddingVertical: 4,
  },
  trophyButton: {
    padding: 8,
    marginLeft: -8,
  },
  trophyIcon: {
    fontSize: 24,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    position: 'relative',
    padding: 6,
  },
  iconEmoji: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
});
