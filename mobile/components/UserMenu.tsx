/**
 * UserMenu Component - Mobile
 * 
 * WEB PARITY: components/UserMenu.tsx
 * Profile dropdown with user info, profile actions, wallet, analytics, theme toggle, logout
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { supabase, supabaseConfigured } from '../lib/supabase';
import { assertRouteExists } from '../lib/routeAssert';
import { useTopBarState } from '../hooks/topbar/useTopBarState';

interface UserMenuProps {
  onNavigateToProfile?: (username: string) => void;
  onNavigateToSettings?: () => void;
  onNavigateToWallet?: () => void;
  onNavigateToAnalytics?: () => void;
  onLogout?: () => void;
}

export function UserMenu({
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToWallet,
  onNavigateToAnalytics,
  onLogout,
}: UserMenuProps) {
  const navigation = useNavigation<any>();
  const topBar = useTopBarState();

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

  const handleViewProfile = () => {
    closeMenu();
    if (onNavigateToProfile && topBar.username) {
      onNavigateToProfile(topBar.username);
    }
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
    }
  };

  const handleAnalytics = () => {
    closeMenu();
    assertRouteExists(navigation, 'MyAnalytics');
    navigation.getParent?.()?.navigate?.('MyAnalytics');
  };

  const handleTheme = () => {
    closeMenu();
    assertRouteExists(navigation, 'Theme');
    navigation.getParent?.()?.navigate?.('Theme');
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
      {/* Trigger Button */}
      <Pressable
        style={styles.triggerButton}
        onPress={() => setShowMenu(true)}
      >
        {/* Avatar */}
        {topBar.avatarUrl ? (
          <View style={styles.avatarImage}>
            {/* In production, use <Image source={{ uri: profile.avatar_url }} /> */}
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}

        {/* Chevron indicator */}
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showMenu}
        animationType="fade"
        transparent
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <View style={styles.menuContainer}>
            {/* User Info Header */}
            {topBar.username && (
              <View style={styles.userInfoHeader}>
                <View style={styles.userInfoContent}>
                  {topBar.avatarUrl ? (
                    <View style={styles.userInfoAvatar}>
                      <Text style={styles.userInfoAvatarText}>{initials}</Text>
                    </View>
                  ) : (
                    <View style={[styles.userInfoAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.userInfoAvatarText}>{initials}</Text>
                    </View>
                  )}
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
                icon="👤"
                iconColor="#3b82f6"
                label="View Profile"
                onPress={handleViewProfile}
                disabled={!topBar.enabledItems.userMenu_viewProfile}
              />

              <MenuItem
                icon="⚙️"
                iconColor="#6b7280"
                label="Edit Profile"
                onPress={handleEditProfile}
                disabled={!topBar.enabledItems.userMenu_editProfile}
              />

              <MenuDivider />

              {/* Account Actions */}
              <MenuItem
                icon="💰"
                iconColor="#f59e0b"
                label="Wallet"
                onPress={handleWallet}
                disabled={!topBar.enabledItems.userMenu_wallet}
              />

              <MenuItem
                icon="📊"
                iconColor="#8b5cf6"
                label="Analytics"
                onPress={handleAnalytics}
                disabled={!topBar.enabledItems.userMenu_analytics}
              />

              <MenuDivider />

              {/* Theme Toggle - Placeholder */}
              <MenuItem
                icon="🌙"
                iconColor="#6b7280"
                label="Theme"
                onPress={handleTheme}
                disabled={!topBar.enabledItems.userMenu_themeToggle}
              />

              <MenuDivider />

              {/* Logout */}
              <MenuItem
                icon="🚪"
                iconColor="#ef4444"
                label="Logout"
                onPress={handleLogout}
                destructive
                disabled={!topBar.enabledItems.userMenu_logout}
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
  icon: string;
  iconColor?: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

function MenuItem({ icon, iconColor, label, onPress, destructive = false, disabled = false }: MenuItemProps) {
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
      <Text style={[styles.menuItemIcon, iconColor && !disabled ? { color: iconColor } : undefined, disabled && styles.menuItemIconDisabled]}>
        {icon}
      </Text>
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
function MenuDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  loadingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#8b5cf6',
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
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
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
    color: '#9aa0a6',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuContainer: {
    width: 256,
    maxHeight: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfoHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: '#8b5cf6',
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
    color: '#fff',
    marginBottom: 2,
  },
  userInfoUsername: {
    fontSize: 12,
    color: '#9aa0a6',
  },
  menuItems: {
    padding: 8,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuItemDestructive: {
    // backgroundColor remains default
  },
  menuItemDisabled: {
    opacity: 0.4,
  },
  menuItemIcon: {
    fontSize: 16,
  },
  menuItemIconDisabled: {
    opacity: 0.5,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  menuItemLabelDestructive: {
    color: '#ef4444',
  },
  menuItemLabelDisabled: {
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
});

