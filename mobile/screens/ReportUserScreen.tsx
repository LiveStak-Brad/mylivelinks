import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportUser'>;

type Reason = { value: string; label: string };

const REPORT_REASONS: Reason[] = [
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'inappropriate', label: 'Inappropriate Behavior' },
  { value: 'spam', label: 'Spam or Scam' },
  { value: 'underage', label: 'Underage User (Under 18)' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
];

export function ReportUserScreen({ navigation, route }: Props) {
  const { session } = useAuthContext();
  const userId = session?.user?.id ?? null;

  const reportedUserId = route.params?.reportedUserId;
  const reportedUsername = route.params?.reportedUsername;

  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => {
    if (reportedUsername) return `Report ${reportedUsername}`;
    return 'Report a User';
  }, [reportedUsername]);

  const submit = useCallback(async () => {
    const client = supabase;
    if (!client) {
      Alert.alert('Offline mode', 'Supabase is not configured.');
      return;
    }
    if (!userId) {
      Alert.alert('Login required', 'Please log in to submit a report.');
      return;
    }

    if (!selectedReason) {
      Alert.alert('Missing reason', 'Please select a reason for reporting.');
      return;
    }

    if (reportedUserId && reportedUserId === userId) {
      Alert.alert('Not allowed', 'You cannot report yourself.');
      return;
    }

    setSubmitting(true);

    try {
      try {
        const rate = await client.rpc('check_report_rate_limit', { p_reporter_id: userId });
        if (rate?.data === false) {
          Alert.alert('Rate limit', 'You have submitted too many reports recently. Please try again later.');
          return;
        }
      } catch {
      }

      const insert = await client.from('content_reports').insert({
        reporter_id: userId,
        reported_user_id: reportedUserId || null,
        report_type: 'user',
        report_reason: selectedReason,
        report_details: details.trim() || null,
        context_details: null,
        status: 'pending',
      } as any);

      if (insert.error) {
        throw insert.error;
      }

      Alert.alert('Report Submitted', 'Thank you for helping keep MyLiveLinks safe.', [
        {
          text: 'Done',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }, [details, navigation, reportedUserId, selectedReason, userId]);

  return (
    <PageShell
      title={title}
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.note}>
          Reports are reviewed by our moderation team. False reports may result in account restrictions.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason *</Text>
          {REPORT_REASONS.map((r) => {
            const active = selectedReason === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => setSelectedReason(r.value)}
                style={({ pressed }) => [styles.reasonRow, pressed ? styles.pressed : null, active ? styles.activeRow : null]}
              >
                <Text style={[styles.reasonLabel, active ? styles.activeText : null]}>{r.label}</Text>
                <Text style={[styles.check, active ? styles.activeText : styles.muted]}>{active ? '✓' : ''}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional details (optional)</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Provide any additional context…"
            placeholderTextColor="#9aa0a6"
            multiline
            style={styles.textArea}
            maxLength={500}
          />
          <Text style={styles.counter}>{details.length}/500</Text>
        </View>

        <Button title={submitting ? 'Submitting…' : 'Submit Report'} onPress={submit} disabled={submitting || !selectedReason} loading={submitting} />
      </ScrollView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    height: 36,
    paddingHorizontal: 12,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  scroll: {
    paddingBottom: 24,
    gap: 14,
  },
  pressed: {
    opacity: 0.9,
  },
  note: {
    color: '#bdbdbd',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  section: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  reasonRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  activeRow: {
    borderColor: 'rgba(94, 155, 255, 0.50)',
    backgroundColor: 'rgba(94, 155, 255, 0.10)',
  },
  reasonLabel: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '800',
  },
  activeText: {
    color: '#5E9BFF',
  },
  muted: {
    color: '#6b7280',
  },
  check: {
    fontSize: 14,
    fontWeight: '900',
  },
  textArea: {
    minHeight: 120,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    textAlignVertical: 'top',
    fontSize: 14,
    fontWeight: '600',
  },
  counter: {
    color: '#9aa0a6',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
});
