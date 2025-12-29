/**
 * OptionsMenu Component - Mobile
 * 
 * WEB PARITY: components/OptionsMenu.tsx
 * Secondary menu with Account, Room/Live, Preferences, Safety, and Admin sections
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { assertRouteExists } from '../lib/routeAssert';
import { useTopBarState } from '../hooks/topbar/useTopBarState';
import { useThemeMode, ThemeDefinition } from '../contexts/ThemeContext';

interface OptionsMenuProps {
  visible?: boolean;
  onClose?: () => void;
  onNavigateToProfile?: (username: string) => void;
  onNavigateToSettings?: () => void;
  onNavigateToWallet?: () => void;
  onNavigateToApply?: () => void;
}

export function OptionsMenu({
  visible: externalVisible,
  onClose: externalOnClose,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToWallet,
  onNavigateToApply,
}: OptionsMenuProps) {
  const navigation = useNavigation<any>();
  const topBar = useTopBarState();
  const insets = useSafeAreaInsets();
  const { theme, mode, setMode } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [internalShowMenu, setInternalShowMenu] = useState(false);
  const [endingAllStreams, setEndingAllStreams] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const showMenu = externalVisible !== undefined ? externalVisible : internalShowMenu;
  const isControlled = externalVisible !== undefined;
  
  // Preferences state
  const [muteAllTiles, setMuteAllTiles] = useState(false);
  const [autoplayTiles, setAutoplayTiles] = useState(true);
  const [showPreviewLabels, setShowPreviewLabels] = useState(true);

  useEffect(() => {
    // keep existing effect timing; role/username are derived from shared top bar state
  }, []);

  const handleEndAllStreams = async () => {
    if (!topBar.enabledItems.optionsMenu_endAllStreams) return;

    Alert.alert(
      'End ALL Streams',
      'End ALL live streams now? This will stop everyone immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End All',
          style: 'destructive',
          onPress: async () => {
            setEndingAllStreams(true);
            try {
              if (!supabaseConfigured) {
                throw new Error('Supabase client not initialized.');
              }
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData.session?.access_token;
              if (!accessToken) {
                throw new Error('No auth session. Please log in again.');
              }
              const res = await fetch('https://www.mylivelinks.com/api/admin/end-streams', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data?.error || 'Failed to end streams');
              }
              Alert.alert('Success', 'All streams have been ended.');
              closeMenu();
            } catch (err: any) {
              console.error('Failed to end all streams', err);
              Alert.alert('Error', err.message || 'Failed to end all streams');
            } finally {
              setEndingAllStreams(false);
            }
          },
        },
      ]
    );
  };

  const closeMenu = () => {
    if (isControlled && externalOnClose) {
      externalOnClose();
    } else {
      setInternalShowMenu(false);
    }
  };

  const openMenu = () => {
    if (!isControlled) {
      setInternalShowMenu(true);
    }
  };

  const navigateRoot = (routeName: string, params?: any) => {
    try {
      assertRouteExists(navigation, routeName);
      navigation.getParent?.()?.navigate?.(routeName, params);
    } catch (err: any) {
      console.error('[OptionsMenu] Navigation error:', err);
      Alert.alert('Navigation Error', `Could not navigate to ${routeName}`);
    }
  };

  const navigateToProfile = (username?: string | null) => {
    const cleaned = typeof username === 'string' ? username.trim() : '';
    if (!cleaned) return;

    // Prefer Profile tab if it exists, since that's how most of mobile navigates to profiles.
    try {
      navigation.getParent?.()?.navigate?.('MainTabs', { screen: 'Profile', params: { username: cleaned } });
      return;
    } catch {
      // ignore
    }
    try {
      navigation.navigate?.('Profile', { username: cleaned });
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Trigger Button - Only show if not controlled externally */}
      {!isControlled && (
        <Pressable style={styles.triggerButton} onPress={openMenu}>
          <Text style={styles.triggerIcon}>⚙️</Text>
          <Text style={styles.triggerText}>Options</Text>
        </Pressable>
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        animationType="fade"
        transparent
        supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
        onRequestClose={closeMenu}
      >
        <View style={[styles.backdrop, { paddingTop: Math.max(insets.top, 20) + 40 }]}>
          <Pressable style={styles.backdropTouchable} onPress={closeMenu} />

          <View style={styles.menuContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Options</Text>
              <Pressable style={styles.closeButton} onPress={closeMenu}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Account Section */}
              <SectionHeader title="Account" styles={styles} />
              <MenuItem
                styles={styles}
                label="My Profile"
                onPress={() => {
                  closeMenu();
                  if (onNavigateToProfile && topBar.username) {
                    onNavigateToProfile(topBar.username);
                    return;
                  }
                  navigateToProfile(topBar.username);
                }}
                disabled={!topBar.enabledItems.optionsMenu_myProfile}
              />
              <MenuItem
                styles={styles}
                label="Edit Profile"
                onPress={() => {
                  closeMenu();
                  navigateRoot('EditProfile');
                }}
                disabled={!topBar.enabledItems.optionsMenu_editProfile}
              />
              <MenuItem
                styles={styles}
                label="Wallet"
                onPress={() => {
                  closeMenu();
                  if (onNavigateToWallet) {
                    onNavigateToWallet();
                    return;
                  }
                  navigateRoot('Wallet');
                }}
                disabled={!topBar.enabledItems.optionsMenu_wallet}
              />
              <MenuItem
                styles={styles}
                label="My Gifts / Transactions"
                onPress={() => {
                  closeMenu();
                  navigateRoot('Transactions');
                }}
                disabled={!topBar.enabledItems.optionsMenu_transactions}
              />

              <Divider styles={styles} />

              {/* Room / Live Section */}
              <SectionHeader title="Room / Live" styles={styles} />
              <MenuItem
                styles={styles}
                label="Apply for a Room"
                onPress={() => {
                  closeMenu();
                  if (onNavigateToApply) {
                    onNavigateToApply();
                    return;
                  }
                  try {
                    void Linking.openURL('https://www.mylivelinks.com/apply');
                  } catch {
                    // ignore
                  }
                }}
                disabled={!topBar.enabledItems.optionsMenu_applyRoom}
              />
              <MenuItem
                styles={styles}
                label="Room Rules"
                onPress={() => {
                  closeMenu();
                  navigateRoot('RoomRules');
                }}
                disabled={!topBar.enabledItems.optionsMenu_roomRules}
              />
              <MenuItem
                styles={styles}
                label="Help / FAQ"
                onPress={() => {
                  closeMenu();
                  navigateRoot('HelpFAQ');
                }}
                disabled={!topBar.enabledItems.optionsMenu_helpFaq}
              />

              <Divider styles={styles} />

              {/* Preferences Section */}
              <SectionHeader title="Preferences" styles={styles} />
              <PreferenceToggle
                label="Mute All Tiles"
                value={muteAllTiles}
                onValueChange={setMuteAllTiles}
                styles={styles}
                theme={theme}
              />
              <PreferenceToggle
                label="Autoplay Tiles"
                value={autoplayTiles}
                onValueChange={setAutoplayTiles}
                styles={styles}
                theme={theme}
              />
              <PreferenceToggle
                label="Show Preview Mode Labels"
                value={showPreviewLabels}
                onValueChange={setShowPreviewLabels}
                styles={styles}
                theme={theme}
              />
              <PreferenceToggle
                label="Light Mode"
                value={mode === 'light'}
                onValueChange={(isLight) => setMode(isLight ? 'light' : 'dark')}
                styles={styles}
                theme={theme}
              />

              <Divider styles={styles} />

              {/* Safety Section */}
              <SectionHeader title="Safety" styles={styles} />
              <MenuItem
                styles={styles}
                label="Report a User"
                onPress={() => {
                  closeMenu();
                  navigateRoot('ReportUser');
                }}
                disabled={!topBar.enabledItems.optionsMenu_reportUser}
              />
              <MenuItem
                styles={styles}
                label="Blocked Users"
                onPress={() => {
                  closeMenu();
                  navigateRoot('BlockedUsers');
                }}
                disabled={!topBar.enabledItems.optionsMenu_blockedUsers}
              />

              {/* Admin Section */}
              {topBar.isAdmin && (
                <>
                  <Divider styles={styles} />
                  <SectionHeader title="Admin" styles={styles} />
                  <MenuItem
                    styles={styles}
                    label="👑 Owner Panel"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('OwnerPanel');
                    }}
                    disabled={!topBar.enabledItems.optionsMenu_ownerPanel}
                  />
                  <MenuItem
                    styles={styles}
                    label="Moderation Panel"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('ModerationPanel');
                    }}
                    disabled={!topBar.enabledItems.optionsMenu_moderationPanel}
                  />
                  <MenuItem
                    styles={styles}
                    label="Approve Room Applications"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('AdminApplications');
                    }}
                    disabled={!topBar.enabledItems.optionsMenu_approveApplications}
                  />
                  <MenuItem
                    styles={styles}
                    label="Manage Gift Types / Coin Packs"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('AdminGifts');
                    }}
                    disabled={!topBar.enabledItems.optionsMenu_manageGifts}
                  />
                  <MenuItem
                    styles={styles}
                    label={endingAllStreams ? 'Ending all streams...' : 'End ALL streams'}
                    onPress={handleEndAllStreams}
                    destructive
                    disabled={endingAllStreams || !topBar.enabledItems.optionsMenu_endAllStreams}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Section Header Component
function SectionHeader({ title, styles }: { title: string; styles: Styles }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

// Menu Item Component
interface MenuItemProps {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  styles: Styles;
}

function MenuItem({ label, onPress, destructive, highlighted, disabled, styles }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && !disabled && styles.menuItemPressed,
        highlighted && styles.menuItemHighlighted,
        destructive && styles.menuItemDestructive,
        disabled && styles.menuItemDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.menuItemLabel,
          destructive && styles.menuItemLabelDestructive,
          highlighted && styles.menuItemLabelHighlighted,
          disabled && styles.menuItemLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Preference Toggle Component
interface PreferenceToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  styles: Styles;
  theme: ThemeDefinition;
}

function PreferenceToggle({ label, value, onValueChange, styles, theme }: PreferenceToggleProps) {
  return (
    <View style={styles.preferenceItem}>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
        thumbColor={value ? '#fff' : theme.colors.mutedText}
      />
    </View>
  );
}

// Divider Component
function Divider({ styles }: { styles: Styles }) {
  return <View style={styles.divider} />;
}

type Styles = ReturnType<typeof createStyles>;

function createStyles(theme: ThemeDefinition) {
  const isLight = theme.mode === 'light';
  const accent = theme.colors.accent;
  const accentSecondary = theme.colors.accentSecondary;
  const textPrimary = theme.colors.textPrimary;
  const textSecondary = theme.colors.textSecondary;
  const textMuted = theme.colors.textMuted;

  return StyleSheet.create({
    triggerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.accent,
      borderRadius: 8,
    },
    triggerIcon: {
      fontSize: 14,
    },
    triggerText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.menuBackdrop,
      justifyContent: 'flex-start',
    },
    backdropTouchable: {
      flex: 1,
    },
    menuContainer: {
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      maxHeight: '80%',
      overflow: 'hidden',
      shadowColor: theme.colors.menuShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 10,
      borderWidth: 1,
      borderColor: theme.colors.menuBorder,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isLight ? 'rgba(139, 92, 246, 0.18)' : theme.colors.menuBorder,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isLight ? accent : theme.colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    closeButtonText: {
      fontSize: 24,
      color: textMuted,
      fontWeight: '300',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingVertical: 8,
    },
    sectionHeader: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    sectionHeaderText: {
      fontSize: 11,
      fontWeight: '700',
      color: isLight ? accentSecondary : theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    menuItem: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    menuItemPressed: {
      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.1)' : theme.colors.highlight,
    },
    menuItemHighlighted: {
      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.14)' : theme.colors.highlight,
    },
    menuItemDestructive: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    menuItemDisabled: {
      opacity: 0.5,
    },
    menuItemLabel: {
      fontSize: 14,
      color: isLight ? textPrimary : theme.colors.textPrimary,
    },
    menuItemLabelDestructive: {
      color: theme.colors.danger,
      fontWeight: '600',
    },
    menuItemLabelHighlighted: {
      color: theme.colors.text,
      fontWeight: '600',
    },
    menuItemLabelDisabled: {
      color: textMuted,
    },
    preferenceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.07)' : theme.colors.cardAlt,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isLight ? 'rgba(139, 92, 246, 0.25)' : theme.colors.border,
    },
    preferenceLabel: {
      fontSize: 14,
      color: isLight ? textPrimary : theme.colors.textPrimary,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.18)' : theme.colors.menuBorder,
      marginVertical: 4,
      marginHorizontal: 12,
    },
  });
}

