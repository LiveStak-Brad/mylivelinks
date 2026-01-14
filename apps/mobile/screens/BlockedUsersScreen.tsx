import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../theme/useTheme';

interface BlockedUser {
  blocked_id: string;
  blocked_username: string | null;
  blocked_display_name: string | null;
  blocked_avatar_url: string | null;
  created_at: string;
}

export default function BlockedUsersScreen() {
  const navigation = useNavigation();
  const { userId } = useCurrentUser();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const stylesVars = useMemo(
    () => ({
      bg: colors.bg,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
      mutedText: colors.mutedText,
      danger: '#EF4444',
    }),
    [colors]
  );

  const styles = useMemo(() => createStyles(stylesVars), [stylesVars]);

  const loadBlockedUsers = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_blocked_users', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[BlockedUsersScreen] RPC error:', error);
        setBlockedUsers([]);
        return;
      }

      setBlockedUsers(data || []);
    } catch (err) {
      console.error('[BlockedUsersScreen] Load error:', err);
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = useCallback(
    async (blockedId: string, username: string | null) => {
      Alert.alert(
        'Unblock User',
        `Are you sure you want to unblock @${username || 'this user'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unblock',
            style: 'destructive',
            onPress: async () => {
              if (!userId) return;

              setUnblocking(blockedId);
              try {
                const { error } = await supabase.rpc('unblock_user', {
                  p_blocker_id: userId,
                  p_blocked_id: blockedId,
                });

                if (error) {
                  console.error('[BlockedUsersScreen] Unblock RPC error:', error);
                  Alert.alert('Error', 'Failed to unblock user. Please try again.');
                  return;
                }

                setBlockedUsers((prev) => prev.filter((u) => u.blocked_id !== blockedId));
              } catch (err) {
                console.error('[BlockedUsersScreen] Unblock error:', err);
                Alert.alert('Error', 'Failed to unblock user. Please try again.');
              } finally {
                setUnblocking(null);
              }
            },
          },
        ]
      );
    },
    [userId]
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: stylesVars.bg }]} edges={['left', 'right', 'bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={stylesVars.mutedText} />
          <Text style={[styles.loadingText, { color: stylesVars.mutedText }]}>Loading blocked users…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: stylesVars.bg }]} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: `${stylesVars.danger}15` }]}>
              <Ionicons name="ban" size={20} color={stylesVars.danger} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={[styles.headerTitle, { color: stylesVars.text }]}>Blocked Users</Text>
              <Text style={[styles.headerSubtitle, { color: stylesVars.mutedText }]}>
                {blockedUsers.length === 0
                  ? 'No blocked users'
                  : `${blockedUsers.length} blocked user${blockedUsers.length !== 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>

          {blockedUsers.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: stylesVars.card, borderColor: stylesVars.border }]}>
              <Ionicons name="checkmark-circle" size={48} color={stylesVars.mutedText} />
              <Text style={[styles.emptyTitle, { color: stylesVars.text }]}>No Blocked Users</Text>
              <Text style={[styles.emptyText, { color: stylesVars.mutedText }]}>
                Users you block will appear here. Blocking prevents direct messages and gifting.
              </Text>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: stylesVars.card, borderColor: stylesVars.border }]}>
              {blockedUsers.map((user, index) => (
                <View key={user.blocked_id}>
                  <View style={styles.userRow}>
                    <View style={[styles.avatar, { backgroundColor: `${stylesVars.mutedText}20` }]}>
                      {user.blocked_avatar_url ? (
                        <Image source={{ uri: user.blocked_avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <Ionicons name="person" size={20} color={stylesVars.mutedText} />
                      )}
                    </View>

                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: stylesVars.text }]} numberOfLines={1}>
                        {user.blocked_display_name || user.blocked_username || 'Unknown User'}
                      </Text>
                      <Text style={[styles.userHandle, { color: stylesVars.mutedText }]} numberOfLines={1}>
                        @{user.blocked_username || 'unknown'}
                      </Text>
                      <Text style={[styles.blockedDate, { color: stylesVars.mutedText }]}>
                        Blocked {formatDate(user.created_at)}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => handleUnblock(user.blocked_id, user.blocked_username)}
                      disabled={unblocking === user.blocked_id}
                      style={({ pressed }) => [
                        styles.unblockButton,
                        { borderColor: stylesVars.danger },
                        pressed && styles.unblockButtonPressed,
                        unblocking === user.blocked_id && styles.unblockButtonDisabled,
                      ]}
                    >
                      {unblocking === user.blocked_id ? (
                        <ActivityIndicator size="small" color={stylesVars.danger} />
                      ) : (
                        <Text style={[styles.unblockButtonText, { color: stylesVars.danger }]}>Unblock</Text>
                      )}
                    </Pressable>
                  </View>

                  {index < blockedUsers.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: stylesVars.border }]} />
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={[styles.infoCard, { backgroundColor: `${stylesVars.mutedText}10`, borderColor: stylesVars.border }]}>
            <Ionicons name="information-circle" size={18} color={stylesVars.mutedText} />
            <Text style={[styles.infoText, { color: stylesVars.mutedText }]}>
              Blocking prevents direct messages and gifting between you and blocked users.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(stylesVars: {
  bg: string;
  card: string;
  border: string;
  text: string;
  mutedText: string;
  danger: string;
}) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
    },
    container: {
      gap: 16,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextCol: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
    emptyCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 32,
      alignItems: 'center',
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    listCard: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    userInfo: {
      flex: 1,
      minWidth: 0,
    },
    userName: {
      fontSize: 15,
      fontWeight: '700',
    },
    userHandle: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 1,
    },
    blockedDate: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 3,
    },
    unblockButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    unblockButtonPressed: {
      opacity: 0.8,
    },
    unblockButtonDisabled: {
      opacity: 0.5,
    },
    unblockButtonText: {
      fontSize: 13,
      fontWeight: '700',
    },
    divider: {
      height: 1,
      marginHorizontal: 14,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
