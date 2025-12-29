/**
 * UserMenu Component - Mobile (v3.0 - Vector Icons)
 * 
 * Single menu combining UserMenu + OptionsMenu items
 * Triggered by avatar circle in top bar
 * Now uses vector icons (Ionicons) for professional styling
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
  Switch,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { supabase, supabaseConfigured } from '../lib/supabase';
import { assertRouteExists } from '../lib/routeAssert';
import { useTopBarState } from '../hooks/topbar/useTopBarState';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { getAvatarSource } from '../lib/defaultAvatar';

interface UserMenuProps {
  onNavigateToProfile?: (username: string) => void;
  onNavigateToSettings?: () => void;
  onNavigateToWallet?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToApply?: () => void;
  onLogout?: () => void;
}

export function UserMenu({
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToWallet,
  onNavigateToAnalytics,
  onNavigateToApply,
  onLogout,
}: UserMenuProps) {
  const navigation = useNavigation<any>();
  const topBar = useTopBarState();
  const { theme, mode, setMode } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [showMenu, setShowMenu] = useState(false);

  const displayName = useMemo(() => {
    return topBar.displayName || topBar.username || 'User';
  }, [topBar.displayName, topBar.username]);

  const initials = useMemo(() => {
    return (displayName?.charAt(0) ?? 'U').toUpperCase();
  }, [displayName]);

  const handleLogout = async () => {
    if (!supabaseConfigured) return;
    await supabase.auth.signOut();
    setShowMenu(false);
    if (onLogout) {
      onLogout();
    }
  };

  const closeMenu = () => setShowMenu(false);

  const navigateRoot = (screenName: string) => {
    try {
      assertRouteExists(navigation, screenName);
      navigation.getParent?.()?.navigate?.(screenName);
    } catch {
      console.warn(`Failed to navigate to ${screenName}`);
    }
  };

  const navigateToProfileTab = () => {
    try {
      // If we're already inside the tab navigator
      navigation.navigate?.('Profile');
      return;
    } catch {
      // ignore
    }
    try {
      navigation.getParent?.()?.navigate?.('MainTabs', { screen: 'Profile' });
    } catch {
      // ignore
    }
  };

  const handleViewProfile = () => {
    closeMenu();
    if (onNavigateToProfile && topBar.username) {
      onNavigateToProfile(topBar.username);
      return;
    }

    // Fallback: navigate to Profile tab and let ProfileTabScreen resolve the username
    navigateToProfileTab();
  };

  const handleEditProfile = () => {
    closeMenu();
    assertRouteExists(navigation, 'EditProfile');
    navigation.getParent?.()?.navigate?.('EditProfile');
  };

  const handleWallet = () => {
    closeMenu();
    if (onNavigateToWallet) {
      onNavigateToWallet();
      return;
    }
    navigateRoot('Wallet');
  };

  const handleAnalytics = () => {
    closeMenu();
    assertRouteExists(navigation, 'MyAnalytics');
    navigation.getParent?.()?.navigate?.('MyAnalytics');
  };

  const handleTransactions = () => {
    closeMenu();
    navigateRoot('Transactions');
  };

  const handleReferrals = () => {
    closeMenu();
    navigateRoot('Referrals');
  };

  const handleApplyRoom = () => {
    closeMenu();
    if (onNavigateToApply) {
      onNavigateToApply();
      return;
    }
    // Navigate to in-app ApplyForRoom screen (no web redirect)
    navigateRoot('ApplyForRoom');
  };

  const handleRoomRules = () => {
    closeMenu();
    navigateRoot('RoomRules');
  };

  const handleHelpFaq = () => {
    closeMenu();
    navigateRoot('HelpFAQ');
  };

  const handleReportUser = () => {
    closeMenu();
    navigateRoot('ReportUser');
  };

  const handleBlockedUsers = () => {
    closeMenu();
    navigateRoot('BlockedUsers');
  };

  // Loading state
  if (!supabaseConfigured) {
    return (
      <View style={styles.loadingAvatar}>
        <ActivityIndicator size="small" color="#8b5cf6" />
      </View>
    );
  }

  // Not logged in - show login button
  if (!topBar.isLoggedIn) {
    return (
      <Pressable
        style={styles.loginButton}
        onPress={() => {
          try {
            navigation.getParent?.()?.navigate?.('Auth');
          } catch {
            navigation.navigate?.('Auth');
          }
        }}
      >
        <Text style={styles.loginButtonText}>Login</Text>
      </Pressable>
    );
  }

  return (
    <>
      {/* Trigger Button - Avatar Circle */}
      <Pressable
        style={styles.triggerButton}
        onPress={() => setShowMenu(true)}
      >
        {/* Avatar with default fallback image */}
        <Image
          source={getAvatarSource(topBar.avatarUrl)}
          style={styles.avatarImage}
        />

        {/* Chevron indicator */}
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showMenu}
        animationType="fade"
        transparent
        supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <View style={styles.menuContainer}>
            {/* User Info Header */}
            {topBar.username && (
              <View style={styles.userInfoHeader}>
                <View style={styles.userInfoContent}>
                  <Image
                    source={getAvatarSource(topBar.avatarUrl)}
                    style={styles.userInfoAvatar}
                  />
                  <View style={styles.userInfoText}>
                    <Text style={styles.userInfoName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={styles.userInfoUsername} numberOfLines={1}>
                      @{topBar.username}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Menu Items */}
            <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
              {/* Profile Actions */}
              <MenuItem
                icon="person-outline"
                iconColor="#8b5cf6"
                label="View Profile"
                onPress={handleViewProfile}
                disabled={!topBar.enabledItems.userMenu_viewProfile}
                styles={styles}
              />

              <MenuItem
                icon="settings-outline"
                iconColor="#a78bfa"
                label="Edit Profile"
                onPress={handleEditProfile}
                disabled={!topBar.enabledItems.userMenu_editProfile}
                styles={styles}
              />

              <MenuDivider styles={styles} />

              {/* Account Actions */}
              <MenuItem
                icon="wallet-outline"
                iconColor="#ec4899"
                label="Wallet"
                onPress={handleWallet}
                disabled={!topBar.enabledItems.userMenu_wallet}
                styles={styles}
              />

              <MenuItem
                icon="bar-chart-outline"
                iconColor="#6366f1"
                label="Analytics"
                onPress={handleAnalytics}
                disabled={!topBar.enabledItems.userMenu_analytics}
                styles={styles}
              />

              <MenuItem
                icon="diamond-outline"
                iconColor="#d946ef"
                label="Transactions"
                onPress={handleTransactions}
                disabled={!topBar.enabledItems.optionsMenu_transactions}
                styles={styles}
              />

              <MenuItem
                icon="people-outline"
                iconColor="#8b5cf6"
                label="Referrals"
                onPress={handleReferrals}
                styles={styles}
              />

              <MenuItem
                icon="film-outline"
                iconColor="#f59e0b"
                label="Composer"
                onPress={() => {
                  closeMenu();
                  navigateRoot('ComposerList');
                }}
                styles={styles}
              />

              <MenuDivider styles={styles} />

              {/* Room / Live */}
              <MenuItem
                icon="document-text-outline"
                iconColor="#3b82f6"
                label="Apply for a Room"
                onPress={handleApplyRoom}
                disabled={!topBar.enabledItems.optionsMenu_applyRoom}
                styles={styles}
              />

              <MenuItem
                icon="list-outline"
                iconColor="#c084fc"
                label="Room Rules"
                onPress={handleRoomRules}
                disabled={!topBar.enabledItems.optionsMenu_roomRules}
                styles={styles}
              />

              <MenuItem
                icon="help-circle-outline"
                iconColor="#818cf8"
                label="Help / FAQ"
                onPress={handleHelpFaq}
                disabled={!topBar.enabledItems.optionsMenu_helpFaq}
                styles={styles}
              />

              <MenuDivider styles={styles} />

              {/* Safety */}
              <MenuItem
                icon="warning-outline"
                iconColor="#f472b6"
                label="Report a User"
                onPress={handleReportUser}
                disabled={!topBar.enabledItems.optionsMenu_reportUser}
                styles={styles}
              />

              <MenuItem
                icon="ban-outline"
                iconColor="#a855f7"
                label="Blocked Users"
                onPress={handleBlockedUsers}
                disabled={!topBar.enabledItems.optionsMenu_blockedUsers}
                styles={styles}
              />

              {/* Admin */}
              {topBar.isAdmin && (
                <>
                  <MenuDivider styles={styles} />

                  <MenuItem
                    icon="trophy-outline"
                    iconColor="#f59e0b"
                    label="Owner Panel"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('OwnerPanel');
                    }}
                    styles={styles}
                  />

                  <MenuItem
                    icon="shield-checkmark-outline"
                    iconColor="#6366f1"
                    label="Moderation Panel"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('ModerationPanel');
                    }}
                    styles={styles}
                  />

                  <MenuItem
                    icon="checkbox-outline"
                    iconColor="#3b82f6"
                    label="Approve Room Applications"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('AdminApplications');
                    }}
                    styles={styles}
                  />

                  <MenuItem
                    icon="gift-outline"
                    iconColor="#ec4899"
                    label="Manage Gift Types / Coin Packs"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('AdminGifts');
                    }}
                    styles={styles}
                  />
                </>
              )}

              <MenuDivider styles={styles} />

              {/* Theme Toggle */}
              <View style={styles.themeRow}>
                <View style={styles.themeLabelGroup}>
                  <View style={styles.themeIconRow}>
                    <Ionicons 
                      name={mode === 'light' ? 'sunny-outline' : 'moon-outline'} 
                      size={18} 
                      color="#6366f1" 
                    />
                    <Text style={styles.themeLabel}>Theme</Text>
                  </View>
                  <Text style={styles.themeValue}>{mode === 'light' ? 'Light' : 'Dark'}</Text>
                </View>
                <Switch
                  value={mode === 'light'}
                  onValueChange={(isLight) => setMode(isLight ? 'light' : 'dark')}
                  trackColor={{ false: theme.colors.border, true: '#8b5cf6' }}
                  thumbColor={mode === 'light' ? '#fff' : '#e0e7ff'}
                />
              </View>

              <MenuDivider styles={styles} />

              {/* Logout */}
              <MenuItem
                icon="log-out-outline"
                iconColor="#ec4899"
                label="Logout"
                onPress={handleLogout}
                destructive
                disabled={!topBar.enabledItems.userMenu_logout}
                styles={styles}
              />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// Menu Item Component
interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  styles: Styles;
}

function MenuItem({ icon, iconColor, label, onPress, destructive = false, disabled = false, styles }: MenuItemProps) {
  const finalIconColor = disabled ? '#9ca3af' : (iconColor || '#6b7280');
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && !disabled && styles.menuItemPressed,
        destructive && styles.menuItemDestructive,
        disabled && styles.menuItemDisabled,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={finalIconColor}
      />
      <Text
        style={[
          styles.menuItemLabel,
          destructive && styles.menuItemLabelDestructive,
          disabled && styles.menuItemLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Menu Divider
function MenuDivider({ styles }: { styles: Styles }) {
  return <View style={styles.divider} />;
}

type Styles = ReturnType<typeof createStyles>;

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    loadingAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loginButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    triggerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingLeft: 4,
      paddingRight: 8,
      borderRadius: 20,
    backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    shadowColor: theme.colors.menuShadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    },
    avatarImage: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    avatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    avatarInitials: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    chevron: {
      fontSize: 10,
      color: theme.colors.mutedText,
    },
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.menuBackdrop,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 60,
      paddingRight: 16,
    },
    menuContainer: {
      width: 256,
      maxHeight: '80%',
    backgroundColor: theme.colors.cardSurface,
    borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
    borderColor: theme.colors.border,
      shadowColor: theme.colors.menuShadow,
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    userInfoHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.cardAlt,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.menuBorder,
    },
    userInfoContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    userInfoAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    userInfoAvatarText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    userInfoText: {
      flex: 1,
    },
    userInfoName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    userInfoUsername: {
      fontSize: 12,
      color: theme.colors.mutedText,
    },
    menuItems: {
      padding: 8,
    backgroundColor: 'transparent',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
    },
    menuItemPressed: {
      backgroundColor: theme.colors.highlight,
    },
    menuItemDestructive: {
      backgroundColor: 'transparent',
    },
    menuItemDisabled: {
      opacity: 0.4,
    },
    menuItemLabel: {
      flex: 1,
      fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    },
    menuItemLabelDestructive: {
      color: theme.colors.danger,
    },
    menuItemLabelDisabled: {
      color: theme.colors.mutedText,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.menuBorder,
      marginVertical: 4,
    },
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 8,
    backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    themeLabelGroup: {
      flexDirection: 'column',
      gap: 2,
      flex: 1,
    },
    themeIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    themeLabel: {
      fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    },
    themeValue: {
      fontSize: 12,
    color: theme.colors.textSecondary,
    },
  });
}

