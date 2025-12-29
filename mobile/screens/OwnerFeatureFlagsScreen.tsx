import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerFeatureFlags'>;

// ============================================================================
// Types
// ============================================================================

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  iconName: keyof typeof Feather.glyphMap;
  enabled: boolean;
  lastChangedBy: string | null;
  lastChangedAt: string | null;
  category: 'core' | 'monetization' | 'social';
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: 'live_streaming',
    name: 'Live Streaming',
    description:
      'Enables users to start live streams and viewers to watch. Disabling will prevent new streams from starting.',
    iconName: 'video',
    enabled: true,
    lastChangedBy: 'owner@mylivelinks.com',
    lastChangedAt: '2025-12-15T10:30:00Z',
    category: 'core',
  },
  {
    id: 'gifting',
    name: 'Gifting',
    description:
      'Allows viewers to send gifts to streamers. Disabling will hide gift buttons and prevent transactions.',
    iconName: 'gift',
    enabled: true,
    lastChangedBy: 'owner@mylivelinks.com',
    lastChangedAt: '2025-12-10T14:20:00Z',
    category: 'monetization',
  },
  {
    id: 'chat',
    name: 'Chat',
    description:
      'Enables chat messages in live streams. Disabling will hide chat UI and prevent message sending.',
    iconName: 'message-square',
    enabled: true,
    lastChangedBy: null,
    lastChangedAt: null,
    category: 'social',
  },
  {
    id: 'battles',
    name: 'Battles',
    description:
      'Enables battle mode for competitive streams. Disabling will prevent new battles from starting.',
    iconName: 'zap',
    enabled: true,
    lastChangedBy: 'owner@mylivelinks.com',
    lastChangedAt: '2025-11-28T09:15:00Z',
    category: 'core',
  },
  {
    id: 'payouts',
    name: 'Payouts',
    description:
      'Allows creators to request payouts of their earnings. Disabling will prevent payout requests.',
    iconName: 'dollar-sign',
    enabled: true,
    lastChangedBy: null,
    lastChangedAt: null,
    category: 'monetization',
  },
];

// ============================================================================
// Component
// ============================================================================

export function OwnerFeatureFlagsScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [flags, setFlags] = useState<FeatureFlag[]>(MOCK_FEATURE_FLAGS);
  const [loading, setLoading] = useState(false);
  const [confirmingToggle, setConfirmingToggle] = useState<FeatureFlag | null>(null);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleToggleFlag = useCallback((flag: FeatureFlag) => {
    // Show confirmation dialog for disabling critical features
    if (flag.enabled && flag.category === 'core') {
      setConfirmingToggle(flag);
      return;
    }

    // Toggle immediately for non-critical or enabling
    toggleFlag(flag.id);
  }, []);

  const toggleFlag = useCallback((id: string) => {
    // TODO: Wire to API
    setFlags((prev) =>
      prev.map((flag) =>
        flag.id === id
          ? {
              ...flag,
              enabled: !flag.enabled,
              lastChangedBy: 'owner@mylivelinks.com',
              lastChangedAt: new Date().toISOString(),
            }
          : flag
      )
    );
    setConfirmingToggle(null);
  }, []);

  const cancelToggle = useCallback(() => {
    setConfirmingToggle(null);
  }, []);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core':
        return '#ef4444';
      case 'monetization':
        return '#10b981';
      case 'social':
        return '#3b82f6';
      default:
        return theme.colors.textMuted;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'core':
        return 'Critical';
      case 'monetization':
        return 'Revenue';
      case 'social':
        return 'Social';
      default:
        return category;
    }
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <PageShell
      title="Feature Flags"
      left={
        <Button
          title="Back"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        />
      }
      contentStyle={styles.container}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.mutedText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <Feather name="alert-triangle" size={20} color="#f59e0b" />
            <View style={styles.warningBannerContent}>
              <Text style={styles.warningBannerTitle}>Emergency Kill Switches</Text>
              <Text style={styles.warningBannerText}>
                Disabling core features will immediately affect all users. Use with caution and
                only during incidents or maintenance.
              </Text>
            </View>
          </View>

          {/* Feature Flags List */}
          {flags.map((flag) => (
            <View key={flag.id} style={styles.flagCard}>
              {/* Header */}
              <View style={styles.flagHeader}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: flag.enabled
                        ? getCategoryColor(flag.category) + '20'
                        : theme.tokens.borderSubtle,
                    },
                  ]}
                >
                  <Feather
                    name={flag.iconName}
                    size={24}
                    color={flag.enabled ? getCategoryColor(flag.category) : theme.colors.textMuted}
                  />
                </View>
                <View style={styles.flagHeaderContent}>
                  <Text style={styles.flagName}>{flag.name}</Text>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: getCategoryColor(flag.category) + '20' },
                    ]}
                  >
                    <Text
                      style={[styles.categoryBadgeText, { color: getCategoryColor(flag.category) }]}
                    >
                      {getCategoryLabel(flag.category)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.flagDescription}>{flag.description}</Text>

              {/* Toggle */}
              <View style={styles.flagToggleRow}>
                <Text
                  style={[
                    styles.flagStatus,
                    { color: flag.enabled ? '#10b981' : theme.colors.textMuted },
                  ]}
                >
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </Text>
                <TouchableOpacity
                  style={[styles.toggle, flag.enabled && styles.toggleActive]}
                  onPress={() => handleToggleFlag(flag)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.toggleThumb, flag.enabled && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              {/* Last Changed */}
              <View style={styles.flagFooter}>
                <Feather name="clock" size={12} color={theme.colors.textMuted} />
                {flag.lastChangedBy ? (
                  <Text style={styles.flagFooterText}>
                    Changed by {flag.lastChangedBy} on {formatTimestamp(flag.lastChangedAt)}
                  </Text>
                ) : (
                  <Text style={styles.flagFooterText}>No changes recorded</Text>
                )}
              </View>
            </View>
          ))}

          {/* Info Section */}
          <View style={styles.infoCard}>
            <Feather name="info" size={20} color={theme.colors.accent} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>About Feature Flags</Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Critical:</Text> Core platform features. Disabling
                requires confirmation.
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Revenue:</Text> Monetization features. May impact
                earnings.
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Social:</Text> User interaction features. Can be
                toggled freely.
              </Text>
              <Text style={styles.infoText}>
                All changes take effect immediately and are logged for audit purposes.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={confirmingToggle !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelToggle}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Feather name="alert-triangle" size={24} color="#ef4444" />
              <Text style={styles.modalTitle}>Confirm Disable</Text>
            </View>
            <Text style={styles.modalText}>
              This will immediately disable {confirmingToggle?.name} for all users. Are you sure?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={cancelToggle}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => confirmingToggle && toggleFlag(confirmingToggle.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextConfirm}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </PageShell>
  );
}

// ============================================================================
// Styles
// ============================================================================

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    headerButton: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    mutedText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },

    // Warning Banner
    warningBanner: {
      backgroundColor: '#f59e0b20',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      flexDirection: 'row',
      gap: 12,
      borderWidth: 1,
      borderColor: '#f59e0b40',
    },
    warningBannerContent: {
      flex: 1,
    },
    warningBannerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    warningBannerText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      lineHeight: 16,
    },

    // Flag Card
    flagCard: {
      backgroundColor: theme.tokens.backgroundPrimary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      ...theme.elevations.card,
    },
    flagHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flagHeaderContent: {
      flex: 1,
      gap: 6,
    },
    flagName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    categoryBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    flagDescription: {
      fontSize: 13,
      color: theme.colors.textMuted,
      lineHeight: 18,
      marginBottom: 16,
    },
    flagToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.tokens.borderSubtle,
      marginBottom: 12,
    },
    flagStatus: {
      fontSize: 14,
      fontWeight: '700',
    },

    // Toggle Switch
    toggle: {
      width: 52,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.tokens.borderSubtle,
      padding: 2,
      justifyContent: 'center',
    },
    toggleActive: {
      backgroundColor: '#10b981',
    },
    toggleThumb: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#fff',
      ...theme.elevations.card,
    },
    toggleThumbActive: {
      alignSelf: 'flex-end',
    },

    // Flag Footer
    flagFooter: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.tokens.borderSubtle,
    },
    flagFooterText: {
      flex: 1,
      fontSize: 11,
      color: theme.colors.textMuted,
      lineHeight: 16,
    },

    // Info Card
    infoCard: {
      backgroundColor: theme.tokens.backgroundPrimary,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      ...theme.elevations.card,
    },
    infoContent: {
      flex: 1,
      gap: 8,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    infoText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      lineHeight: 16,
    },
    infoBold: {
      fontWeight: '700',
      color: theme.colors.text,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    modalContent: {
      backgroundColor: theme.tokens.backgroundPrimary,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      ...theme.elevations.modal,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    modalText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      lineHeight: 20,
      marginBottom: 24,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    modalButtonCancel: {
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    modalButtonConfirm: {
      backgroundColor: '#ef4444',
    },
    modalButtonTextCancel: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    modalButtonTextConfirm: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
  });
}
