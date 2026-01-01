import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportUser'>;

type Reason = { value: string; label: string };

type UserSearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

const REPORT_REASONS: Reason[] = [
  { value: 'sexual_services', label: 'Sexual services / solicitation (prostitution, escorting, sugaring)' },
  { value: 'grooming_exploitation', label: 'Grooming / exploitation' },
  { value: 'minor_safety', label: 'Minor safety (under 18)' },
  { value: 'fraud_scams', label: 'Fraud / scams' },
  { value: 'harassment_hate', label: 'Harassment / hate' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
];

export function ReportUserScreen({ navigation, route }: Props) {
  const { session } = useAuthContext();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const userId = session?.user?.id ?? null;

  const reportedUserId = route.params?.reportedUserId;
  const reportedUsername = route.params?.reportedUsername;

  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // User search state (only used when no user is pre-selected)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    reportedUserId && reportedUsername
      ? { id: reportedUserId, username: reportedUsername, display_name: null, avatar_url: null }
      : null
  );

  const title = useMemo(() => {
    if (selectedUser?.username) return `Report ${selectedUser.username}`;
    if (reportedUsername) return `Report ${reportedUsername}`;
    return 'Report a User';
  }, [reportedUsername, selectedUser]);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults((data as UserSearchResult[]) || []);
    } catch (err) {
      console.error('User search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      searchUsers(text);
    },
    [searchUsers]
  );

  const handleSelectUser = useCallback((user: UserSearchResult) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

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

    // Determine the target user ID - prioritize selectedUser, fall back to route params
    const targetUserId = selectedUser?.id || reportedUserId;

    if (!targetUserId) {
      Alert.alert('Missing user', 'Please select a user to report.');
      return;
    }

    if (targetUserId === userId) {
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
        // ignore rate limit RPC failure; continue submit
      }

      const insert = await client.from('content_reports').insert({
        reporter_id: userId,
        reported_user_id: targetUserId,
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
  }, [details, navigation, reportedUserId, selectedReason, userId, selectedUser]);

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

        {/* User Selection (only shown if no user was pre-selected) */}
        {!reportedUserId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who are you reporting? *</Text>
            {selectedUser ? (
              <View style={styles.selectedUserRow}>
                <View style={styles.selectedUserInfo}>
                  <Text style={styles.selectedUserName}>@{selectedUser.username}</Text>
                  {selectedUser.display_name && (
                    <Text style={styles.selectedUserDisplayName}>{selectedUser.display_name}</Text>
                  )}
                </View>
                <Pressable onPress={() => setSelectedUser(null)} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  placeholder="Search by username..."
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchLoading && (
                  <View style={styles.searchLoading}>
                    <ActivityIndicator size="small" color={theme.colors.accentSecondary} />
                  </View>
                )}
                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchResults.map((user) => (
                      <Pressable
                        key={user.id}
                        onPress={() => handleSelectUser(user)}
                        style={({ pressed }) => [styles.searchResultRow, pressed ? styles.pressed : null]}
                      >
                        <Text style={styles.searchResultUsername}>@{user.username}</Text>
                        {user.display_name && <Text style={styles.searchResultDisplayName}>{user.display_name}</Text>}
                      </Pressable>
                    ))}
                  </View>
                )}
                {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                  <Text style={styles.noResults}>No users found</Text>
                )}
              </>
            )}
          </View>
        )}

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
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={styles.textArea}
            maxLength={500}
          />
          <Text style={styles.counter}>{details.length}/500</Text>
        </View>

        <Button
          title={submitting ? 'Submitting…' : 'Submit Report'}
          onPress={submit}
          disabled={submitting || !selectedReason || (!reportedUserId && !selectedUser)}
          loading={submitting}
        />
      </ScrollView>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    headerButton: {
      height: 36,
      paddingHorizontal: 12,
    },
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    scroll: {
      paddingBottom: 24,
      gap: 14,
    },
    pressed: {
      opacity: 0.9,
    },
    note: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    section: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      padding: 12,
      gap: 8,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '900',
    },
    // User search styles
    searchInput: {
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.cardAlt,
      fontSize: 14,
      fontWeight: '600',
    },
    searchLoading: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    searchResults: {
      gap: 4,
    },
    searchResultRow: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchResultUsername: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    searchResultDisplayName: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    noResults: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      paddingVertical: 8,
    },
    selectedUserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.highlight,
      borderWidth: 1,
      borderColor: theme.colors.accentSecondary,
    },
    selectedUserInfo: {
      flex: 1,
    },
    selectedUserName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    selectedUserDisplayName: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    clearButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    clearButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    // Reason selection styles
    reasonRow: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    activeRow: {
      borderColor: theme.colors.accentSecondary,
      backgroundColor: theme.colors.highlight,
    },
    reasonLabel: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    activeText: {
      color: theme.colors.accentSecondary,
      fontWeight: '800',
    },
    muted: {
      color: theme.colors.textMuted,
    },
    check: {
      fontSize: 14,
      fontWeight: '900',
      color: theme.colors.textMuted,
    },
    textArea: {
      minHeight: 100,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.cardAlt,
      textAlignVertical: 'top',
    },
    counter: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      textAlign: 'right',
    },
  });
}

