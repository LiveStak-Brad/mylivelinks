import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme/useTheme';
import { brand } from '../theme/colors';

const API_BASE_URL = 'https://www.mylivelinks.com';

export type ReportType = 'user' | 'stream' | 'profile' | 'chat';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportType: ReportType;
  reportedUserId?: string;
  reportedUsername?: string;
  contextDetails?: string;
}

const REPORT_REASONS: Record<ReportType, { value: string; label: string }[]> = {
  user: [
    { value: 'sexual_services', label: 'Sexual services / solicitation' },
    { value: 'grooming_exploitation', label: 'Grooming / exploitation' },
    { value: 'minor_safety', label: 'Minor safety (under 18)' },
    { value: 'fraud_scams', label: 'Fraud / scams' },
    { value: 'harassment_hate', label: 'Harassment / hate' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'violence_threats', label: 'Violence / threats' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'other', label: 'Other' },
  ],
  stream: [
    { value: 'sexual_services', label: 'Sexual services / solicitation' },
    { value: 'grooming_exploitation', label: 'Grooming / exploitation' },
    { value: 'minor_safety', label: 'Minor safety (under 18)' },
    { value: 'fraud_scams', label: 'Fraud / scams' },
    { value: 'harassment_hate', label: 'Harassment / hate' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'violence_threats', label: 'Violence / threats' },
    { value: 'copyright', label: 'Copyright Violation' },
    { value: 'other', label: 'Other' },
  ],
  profile: [
    { value: 'sexual_services', label: 'Sexual services / solicitation' },
    { value: 'grooming_exploitation', label: 'Grooming / exploitation' },
    { value: 'minor_safety', label: 'Minor safety (under 18)' },
    { value: 'fraud_scams', label: 'Fraud / scams' },
    { value: 'harassment_hate', label: 'Harassment / hate' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'violence_threats', label: 'Violence / threats' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'other', label: 'Other' },
  ],
  chat: [
    { value: 'sexual_services', label: 'Sexual services / solicitation' },
    { value: 'grooming_exploitation', label: 'Grooming / exploitation' },
    { value: 'minor_safety', label: 'Minor safety (under 18)' },
    { value: 'fraud_scams', label: 'Fraud / scams' },
    { value: 'harassment_hate', label: 'Harassment / hate' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'violence_threats', label: 'Violence / threats' },
    { value: 'other', label: 'Other' },
  ],
};

export default function ReportModal({
  visible,
  onClose,
  reportType,
  reportedUserId,
  reportedUsername,
  contextDetails,
}: ReportModalProps) {
  const { colors } = useTheme();
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reasons = REPORT_REASONS[reportType] || REPORT_REASONS.user;

  const primary = (colors as any).focusRing ?? (brand as any).primary ?? '#6366F1';

  const handleClose = () => {
    if (submitting) return;
    onClose();
    setTimeout(() => {
      setSubmitted(false);
      setSelectedReason('');
      setDetails('');
    }, 300);
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please choose a reason before submitting your report.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        Alert.alert('Sign in required', 'Please log in to submit a report.');
        setSubmitting(false);
        return;
      }

      const payload = {
        report_type: reportType,
        reported_user_id: reportedUserId || null,
        report_reason: selectedReason,
        report_details: details.trim() || null,
        context_details: contextDetails || null,
      };

      console.log('[ReportModal] submitting report', {
        ...payload,
        reported_user_id: payload.reported_user_id ? '<redacted>' : null,
      });

      const response = await fetch(`${API_BASE_URL}/api/reports/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errCode = typeof data?.error === 'string' ? data.error : null;

        if (response.status === 401 || errCode === 'UNAUTHORIZED') {
          Alert.alert('Sign in required', 'Please log in to submit a report.');
          setSubmitting(false);
          return;
        }

        if (response.status === 429 || errCode === 'RATE_LIMITED') {
          const retryAfterSeconds = typeof data?.retry_after_seconds === 'number' ? data.retry_after_seconds : null;
          Alert.alert(
            'Rate limited',
            retryAfterSeconds != null
              ? `Too many reports. Try again in ${retryAfterSeconds}s.`
              : 'Too many reports. Please try again later.'
          );
          setSubmitting(false);
          return;
        }

        if (response.status === 400 || errCode === 'INVALID_TARGET') {
          Alert.alert('Unable to submit report', 'Missing or invalid report target. Please try again.');
          setSubmitting(false);
          return;
        }

        Alert.alert(
          'Report failed',
          errCode === 'DB_ERROR' ? 'Server error. Please try again.' : 'Failed to submit report. Please try again.'
        );
        setSubmitting(false);
        return;
      }

      const reportId = typeof data?.report_id === 'string' || typeof data?.report_id === 'number' ? data.report_id : null;
      if (!reportId) {
        Alert.alert('Report failed', 'Server did not return a report ID. Please try again.');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      console.error('[ReportModal] Error submitting report:', error);
      Alert.alert('Report failed', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (reportType) {
      case 'user':
        return reportedUsername ? `Report ${reportedUsername}` : 'Report User';
      case 'stream':
        return 'Report Stream';
      case 'profile':
        return reportedUsername ? `Report ${reportedUsername}'s Profile` : 'Report Profile';
      case 'chat':
        return 'Report Message';
      default:
        return 'Submit Report';
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface2,
    },
    body: {
      padding: 14,
    },
    disclaimer: {
      fontSize: 12,
      color: colors.mutedText,
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    required: {
      color: '#EF4444',
    },
    reasonsList: {
      marginBottom: 12,
    },
    reasonItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 6,
      backgroundColor: colors.surface,
    },
    reasonItemSelected: {
      borderColor: primary,
      backgroundColor: `${primary}10`,
    },
    reasonRadio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reasonRadioSelected: {
      borderColor: primary,
    },
    reasonRadioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: primary,
    },
    reasonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    detailsInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surface,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: 8,
    },
    charCount: {
      fontSize: 11,
      color: colors.mutedText,
      textAlign: 'right',
      marginBottom: 16,
    },
    warning: {
      backgroundColor: '#FEF3C7',
      borderWidth: 1,
      borderColor: '#FCD34D',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    warningText: {
      fontSize: 12,
      color: '#92400E',
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    submitBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnDisabled: {
      opacity: 0.5,
    },
    submitBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    successContainer: {
      padding: 32,
      alignItems: 'center',
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#D1FAE5',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    successTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
    },
    successText: {
      fontSize: 14,
      color: colors.mutedText,
      textAlign: 'center',
    },
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {submitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Feather name="check" size={32} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Report Submitted</Text>
              <Text style={styles.successText}>
                Thank you for helping keep MyLiveLinks safe. Our moderation team will review this report.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <Feather name="alert-triangle" size={20} color="#EF4444" />
                  </View>
                  <Text style={styles.headerTitle}>{getTitle()}</Text>
                </View>
                <Pressable
                  style={styles.closeBtn}
                  onPress={handleClose}
                  disabled={submitting}
                >
                  <Feather name="x" size={18} color={colors.mutedText} />
                </Pressable>
              </View>

              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                <Text style={styles.disclaimer}>
                  Reports are reviewed by our moderation team. False reports may result in account restrictions.
                </Text>

                <Text style={styles.label}>
                  Reason for reporting <Text style={styles.required}>*</Text>
                </Text>

                <View style={styles.reasonsList}>
                  {reasons.map((reason) => {
                    const isSelected = selectedReason === reason.value;
                    return (
                      <Pressable
                        key={reason.value}
                        style={[styles.reasonItem, isSelected && styles.reasonItemSelected]}
                        onPress={() => setSelectedReason(reason.value)}
                        disabled={submitting}
                      >
                        <View style={[styles.reasonRadio, isSelected && styles.reasonRadioSelected]}>
                          {isSelected && <View style={styles.reasonRadioInner} />}
                        </View>
                        <Text style={styles.reasonText}>{reason.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>Additional details (optional)</Text>
                <TextInput
                  style={styles.detailsInput}
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Provide any additional context..."
                  placeholderTextColor={colors.mutedText}
                  multiline
                  maxLength={500}
                  editable={!submitting}
                />
                <Text style={styles.charCount}>{details.length}/500</Text>

                <View style={styles.warning}>
                  <Text style={styles.warningText}>
                    ⚠️ <Text style={{ fontWeight: '700' }}>Important:</Text> Submitting false or malicious reports may result in your account being restricted.
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.footer}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  disabled={submitting}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitBtn, (!selectedReason || submitting) && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={!selectedReason || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Report</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
