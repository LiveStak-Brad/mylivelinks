/**
 * OptionsMenu Component - Mobile
 * 
 * WEB PARITY: components/OptionsMenu.tsx
 * Secondary menu with Account, Room/Live, Preferences, Safety, and Admin sections
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { assertRouteExists } from '../lib/routeAssert';
import { useTopBarState } from '../hooks/topbar/useTopBarState';

interface OptionsMenuProps {
  onNavigateToProfile?: (username: string) => void;
  onNavigateToSettings?: () => void;
  onNavigateToWallet?: () => void;
  onNavigateToApply?: () => void;
}

export function OptionsMenu({
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToWallet,
  onNavigateToApply,
}: OptionsMenuProps) {
  const navigation = useNavigation<any>();
  const topBar = useTopBarState();
  const [showMenu, setShowMenu] = useState(false);
  const [endingAllStreams, setEndingAllStreams] = useState(false);
  
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
              const res = await fetch('https://mylivelinks.com/api/admin/end-streams', {
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
              setShowMenu(false);
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

  const closeMenu = () => setShowMenu(false);

  const navigateRoot = (routeName: string, params?: any) => {
    assertRouteExists(navigation, routeName);
    navigation.getParent?.()?.navigate?.(routeName, params);
  };

  return (
    <>
      {/* Trigger Button */}
      <Pressable style={styles.triggerButton} onPress={() => setShowMenu(true)}>
        <Text style={styles.triggerIcon}>⚙️</Text>
        <Text style={styles.triggerText}>Options</Text>
      </Pressable>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        animationType="slide"
        transparent
        onRequestClose={closeMenu}
      >
        <View style={styles.backdrop}>
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
              <SectionHeader title="Account" />
              <MenuItem
                label="My Profile"
                onPress={() => {
                  closeMenu();
                  if (onNavigateToProfile && topBar.username) {
                    onNavigateToProfile(topBar.username);
                  }
                }}
                disabled={!topBar.enabledItems.optionsMenu_myProfile}
              />
              <MenuItem
                label="Edit Profile"
                onPress={() => {
                  closeMenu();
                  navigateRoot('EditProfile');
                }}
                disabled={!topBar.enabledItems.optionsMenu_editProfile}
              />
              <MenuItem
                label="Wallet"
                onPress={() => {
                  closeMenu();
                  if (onNavigateToWallet) {
                    onNavigateToWallet();
                  }
                }}
                disabled={!topBar.enabledItems.optionsMenu_wallet}
              />
              <MenuItem
                label="My Gifts / Transactions"
                onPress={() => {
                  closeMenu();
                  navigateRoot('Transactions');
                }}
                disabled={!topBar.enabledItems.optionsMenu_transactions}
              />

              <Divider />

              {/* Room / Live Section */}
              <SectionHeader title="Room / Live" />
              <MenuItem
                label="Apply for a Room"
                onPress={() => {
                  closeMenu();
                  if (onNavigateToApply) {
                    onNavigateToApply();
                  }
                }}
                disabled={!topBar.enabledItems.optionsMenu_applyRoom}
              />
              <MenuItem
                label="Room Rules"
                onPress={() => {
                  closeMenu();
                  navigateRoot('RoomRules');
                }}
                disabled={!topBar.enabledItems.optionsMenu_roomRules}
              />
              <MenuItem
                label="Help / FAQ"
                onPress={() => {
                  closeMenu();
                  navigateRoot('HelpFAQ');
                }}
                disabled={!topBar.enabledItems.optionsMenu_helpFaq}
              />

              <Divider />

              {/* Preferences Section */}
              <SectionHeader title="Preferences" />
              <PreferenceToggle
                label="Mute All Tiles"
                value={muteAllTiles}
                onValueChange={setMuteAllTiles}
              />
              <PreferenceToggle
                label="Autoplay Tiles"
                value={autoplayTiles}
                onValueChange={setAutoplayTiles}
              />
              <PreferenceToggle
                label="Show Preview Mode Labels"
                value={showPreviewLabels}
                onValueChange={setShowPreviewLabels}
              />

              <Divider />

              {/* Safety Section */}
              <SectionHeader title="Safety" />
              <MenuItem
                label="Report a User"
                onPress={() => {
                  closeMenu();
                  navigateRoot('ReportUser');
                }}
                disabled={!topBar.enabledItems.optionsMenu_reportUser}
              />
              <MenuItem
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
                  <Divider />
                  <SectionHeader title="Admin" />
                  <MenuItem
                    label="👑 Owner Panel"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('OwnerPanel');
                    }}
                    disabled={!topBar.enabledItems.optionsMenu_ownerPanel}
                  />
                  <MenuItem
                    label="Moderation Panel"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('ModerationPanel');
                    }}
                    disabled={!topBar.enabledItems.optionsMenu_moderationPanel}
                  />
                  <MenuItem
                    label="Approve Room Applications"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('AdminApplications');
                    }}
                    disabled={!topBar.enabledItems.optionsMenu_approveApplications}
                  />
                  <MenuItem
                    label="Manage Gift Types / Coin Packs"
                    onPress={() => {
                      closeMenu();
                      navigateRoot('AdminGifts');
                    }}
                    disabled={!topBar.enabledItems.optionsMenu_manageGifts}
                  />
                  <MenuItem
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
function SectionHeader({ title }: { title: string }) {
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
}

function MenuItem({ label, onPress, destructive, highlighted, disabled }: MenuItemProps) {
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
}

function PreferenceToggle({ label, value, onValueChange }: PreferenceToggleProps) {
  return (
    <View style={styles.preferenceItem}>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#3e3e3e', true: '#8b5cf6' }}
        thumbColor={value ? '#fff' : '#9aa0a6'}
      />
    </View>
  );
}

// Divider Component
function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#8b5cf6',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  menuContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#9aa0a6',
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
    color: '#9aa0a6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuItemHighlighted: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  menuItemDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemLabel: {
    fontSize: 14,
    color: '#fff',
  },
  menuItemLabelDestructive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  menuItemLabelHighlighted: {
    color: '#fff',
    fontWeight: '600',
  },
  menuItemLabelDisabled: {
    color: '#6b7280',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
});

