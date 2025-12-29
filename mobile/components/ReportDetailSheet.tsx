// Mobile Owner Panel: Reports Parity (canonical commit)
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button } from '../components/ui';
import type { ThemeDefinition } from '../contexts/ThemeContext';
import type { Report } from '../screens/OwnerReportsScreen';

interface ReportDetailSheetProps {
  report: Report;
  onClose: () => void;
  onUpdate: () => void;
  theme: ThemeDefinition;
}

export function ReportDetailSheet({ report, onClose, onUpdate, theme }: ReportDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { fetchAuthed } = useFetchAuthed();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [adminNotes, setAdminNotes] = useState(report.admin_notes || '');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, variant: 'success' | 'error') => {
    setToast({ message, variant });
    setTimeout(() => {
      setToast(null);
    }, 2500);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Moderation actions are disabled - no handler needed

  const handleStatusChange = useCallback(
    async (newStatus: 'resolved' | 'dismissed') => {
      setActionLoading('status');

      try {
        // Map status to resolution format expected by API
        const resolution = newStatus === 'dismissed' ? 'dismissed' : 'actioned';

        const res = await fetchAuthed('/api/admin/reports/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_id: report.id,
            resolution: resolution,
            note: adminNotes || null,
          }),
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            showToast('You do not have permission to update reports.', 'error');
            return;
          }
          throw new Error(res.message || 'Failed to update report status');
        }

        showToast(newStatus === 'resolved' ? 'Report resolved.' : 'Report dismissed.', 'success');
        setTimeout(() => {
          onUpdate();
        }, 450);
      } catch (error: any) {
        console.error('Error updating report:', error);
        showToast(error?.message || 'Failed to update report status', 'error');
      } finally {
        setActionLoading(null);
      }
    },
    [report.id, adminNotes, fetchAuthed, onUpdate, showToast]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'reviewed':
        return '#3b82f6';
      case 'resolved':
        return '#10b981';
      case 'dismissed':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Feather name="alert-triangle" size={20} color="#ef4444" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Report Details</Text>
            <Text style={styles.headerSubtitle}>ID: {report.id.slice(0, 8)}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        {toast && (
          <View
            style={[
              styles.toast,
              toast.variant === 'success' ? styles.toastSuccess : styles.toastError,
            ]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        )}

        {/* Content */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Report Info */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="flag" size={16} color={theme.colors.textPrimary} />
              <Text style={styles.sectionTitle}>Report Information</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Type</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{report.report_type}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reason</Text>
                <Text style={styles.infoValue}>{report.report_reason.replace(/_/g, ' ')}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                  <Text style={styles.statusBadgeText}>{report.status}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Submitted</Text>
                <Text style={styles.infoValue}>{formatDate(report.created_at)}</Text>
              </View>
              {report.reviewed_at && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Reviewed</Text>
                  <Text style={styles.infoValue}>{formatDate(report.reviewed_at)}</Text>
                </View>
              )}
            </View>
            {report.report_details && (
              <View style={styles.detailsCard}>
                <Text style={styles.detailsLabel}>Details:</Text>
                <Text style={styles.detailsText}>{report.report_details}</Text>
              </View>
            )}
          </View>

          {/* Reported User */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="user" size={16} color={theme.colors.textPrimary} />
              <Text style={styles.sectionTitle}>Reported User</Text>
            </View>
            {report.reported_user ? (
              <View style={styles.userCard}>
                <Image
                  source={require('../assets/no-profile-pic.png')}
                  style={styles.userAvatar}
                  resizeMode="cover"
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{report.reported_user.display_name || report.reported_user.username}</Text>
                  <Text style={styles.userHandle}>@{report.reported_user.username}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No user information available</Text>
              </View>
            )}
          </View>

          {/* Reporter */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="flag" size={16} color={theme.colors.textPrimary} />
              <Text style={styles.sectionTitle}>Reported By</Text>
            </View>
            {report.reporter ? (
              <View style={styles.userCard}>
                <Image
                  source={require('../assets/no-profile-pic.png')}
                  style={styles.userAvatar}
                  resizeMode="cover"
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{report.reporter.display_name || report.reporter.username}</Text>
                  <Text style={styles.userHandle}>@{report.reporter.username}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Anonymous reporter</Text>
              </View>
            )}
          </View>

          {/* Related Messages (Placeholder for chat reports) */}
          {report.report_type === 'chat' && report.context_details && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="message-square" size={16} color={theme.colors.textPrimary} />
                <Text style={styles.sectionTitle}>Related Messages</Text>
              </View>
              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderText}>Message context preview would appear here</Text>
                <Text style={styles.placeholderSubtext}>Context ID: {report.context_details}</Text>
              </View>
            </View>
          )}

          {/* Admin Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Notes</Text>
            <TextInput
              value={adminNotes}
              onChangeText={setAdminNotes}
              placeholder="Add internal notes about this report..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              style={styles.notesInput}
              maxLength={500}
            />
          </View>

          {/* Moderation Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="shield" size={16} color={theme.colors.textPrimary} />
              <Text style={styles.sectionTitle}>Moderation Actions</Text>
            </View>
            <View style={styles.actionsGrid}>
              <View style={[styles.actionButton, styles.disabled]}>
                <Feather name="alert-triangle" size={18} color={theme.colors.textMuted} />
                <Text style={[styles.actionButtonText, styles.disabledText]}>Warn</Text>
              </View>
              <View style={[styles.actionButton, styles.disabled]}>
                <Feather name="volume-2" size={18} color={theme.colors.textMuted} />
                <Text style={[styles.actionButtonText, styles.disabledText]}>Mute</Text>
              </View>
              <View style={[styles.actionButton, styles.dangerButton, styles.disabled]}>
                <Feather name="slash" size={18} color={theme.colors.textMuted} />
                <Text style={[styles.actionButtonText, styles.disabledText]}>Ban</Text>
              </View>
              <View style={[styles.actionButton, styles.disabled]}>
                <Feather name="dollar-sign" size={18} color={theme.colors.textMuted} />
                <Text style={[styles.actionButtonText, styles.disabledText]}>Remove $$</Text>
              </View>
            </View>
            <Text style={styles.actionsNote}>Moderation actions require backend implementation</Text>
          </View>
        </ScrollView>

        {/* Footer - Status Actions */}
        <View style={styles.footer}>
          {report.status === 'pending' || report.status === 'reviewed' ? (
            <View style={styles.footerButtons}>
              <Button
                title={actionLoading === 'status' ? 'Updating...' : 'Resolve'}
                onPress={() => handleStatusChange('resolved')}
                disabled={!!actionLoading}
                loading={actionLoading === 'status'}
                style={[styles.footerButton, styles.resolveButton]}
              />
              <Button
                title="Dismiss"
                onPress={() => handleStatusChange('dismissed')}
                disabled={!!actionLoading}
                variant="secondary"
                style={styles.footerButton}
              />
            </View>
          ) : (
            <View style={styles.footerStatus}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                <Text style={styles.statusBadgeText}>
                  {report.status === 'resolved' ? 'Report Resolved' : 'Report Dismissed'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 16,
      backgroundColor: theme.colors.cardSurface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: '#fee2e2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
    headerSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.colors.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toast: {
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    toastSuccess: {
      backgroundColor: '#10b98115',
      borderColor: '#10b98130',
    },
    toastError: {
      backgroundColor: '#ef444415',
      borderColor: '#ef444430',
    },
    toastText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 20,
    },
    section: {
      gap: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '900',
    },
    infoCard: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 10,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    infoLabel: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    infoValue: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    typeBadge: {
      backgroundColor: theme.colors.cardAlt,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    typeBadgeText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'capitalize',
    },
    detailsCard: {
      backgroundColor: '#fef3c7',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#fbbf24',
      padding: 12,
      gap: 6,
    },
    detailsLabel: {
      color: '#78350f',
      fontSize: 13,
      fontWeight: '900',
    },
    detailsText: {
      color: '#78350f',
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    userAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.cardAlt,
    },
    userInfo: {
      flex: 1,
      gap: 2,
    },
    userName: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    userHandle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    emptyCard: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    placeholderCard: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#a855f7',
      borderLeftWidth: 4,
      padding: 14,
      gap: 6,
    },
    placeholderText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      fontStyle: 'italic',
    },
    placeholderSubtext: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    notesInput: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
      minHeight: 100,
      textAlignVertical: 'top',
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      minWidth: '45%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 14,
      paddingHorizontal: 16,
      minHeight: 50,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    dangerButton: {
      backgroundColor: '#ef4444',
      borderColor: '#ef4444',
    },
    pressed: {
      opacity: 0.7,
    },
    disabled: {
      opacity: 0.4,
    },
    actionButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    dangerButtonText: {
      color: '#fff',
    },
    disabledText: {
      color: theme.colors.textMuted,
    },
    actionsNote: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 4,
    },
    footer: {
      padding: 16,
      backgroundColor: theme.colors.cardSurface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    footerButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    footerButton: {
      flex: 1,
    },
    resolveButton: {
      backgroundColor: '#10b981',
    },
    footerStatus: {
      alignItems: 'center',
      paddingVertical: 8,
    },
  });
}

