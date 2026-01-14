import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { TeamsNavigationParams } from '../lib/teamNavigation';

type InviteableUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  invited?: boolean;
  sending?: boolean;
};

export default function TeamsInviteScreen() {
  const route = useRoute<RouteProp<TeamsNavigationParams, 'TeamsInviteScreen'>>();
  const { teamId } = route.params || {};
  const { user } = useAuth();
  
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<InviteableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!teamId || !user?.id) return;
    
    setLoading(true);
    setSearched(true);
    
    try {
      // Get users I follow
      const { data: following } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id)
        .limit(200);

      // Get users who follow me
      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followee_id', user.id)
        .limit(200);

      // Combine and dedupe
      const userIds = new Set<string>();
      (following || []).forEach((f: any) => userIds.add(f.followee_id));
      (followers || []).forEach((f: any) => userIds.add(f.follower_id));
      userIds.delete(user.id);

      if (userIds.size === 0) {
        setUsers([]);
        return;
      }

      // Get existing team members
      const { data: existingMembers } = await supabase
        .from('team_memberships')
        .select('profile_id')
        .eq('team_id', teamId)
        .in('status', ['approved', 'pending']);

      const memberIds = new Set((existingMembers || []).map((m: any) => m.profile_id));

      // Get pending invites
      const { data: pendingInvites } = await supabase
        .from('team_invites')
        .select('invitee_id')
        .eq('team_id', teamId)
        .eq('status', 'pending');

      const invitedIds = new Set((pendingInvites || []).map((i: any) => i.invitee_id));

      // Filter out existing members
      const eligibleIds = Array.from(userIds).filter(id => !memberIds.has(id));

      if (eligibleIds.length === 0) {
        setUsers([]);
        return;
      }

      // Fetch profiles
      let profileQuery = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', eligibleIds)
        .limit(50);

      if (searchQuery.trim()) {
        profileQuery = profileQuery.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
      }

      const { data: profiles } = await profileQuery;

      setUsers((profiles || []).map((p: any) => ({
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        invited: invitedIds.has(p.id),
        sending: false,
      })));
    } catch (err: any) {
      console.error('[TeamsInviteScreen] searchUsers error:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchUsers]);

  const handleSendInvite = async (inviteeId: string) => {
    if (!teamId) return;

    setUsers(prev => prev.map(u => u.id === inviteeId ? { ...u, sending: true } : u));

    try {
      const { error } = await supabase.rpc('rpc_send_team_invite', {
        p_team_id: teamId,
        p_invitee_id: inviteeId,
        p_message: null,
      });

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === inviteeId ? { ...u, invited: true, sending: false } : u));
    } catch (err: any) {
      console.error('[TeamsInviteScreen] handleSendInvite error:', err);
      Alert.alert('Error', err.message || 'Failed to send invite');
      setUsers(prev => prev.map(u => u.id === inviteeId ? { ...u, sending: false } : u));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Invite to team</Text>
            <Text style={styles.subtitle}>Search your followers and following to send team invites.</Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or @username"
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                style={styles.searchInput}
              />
              {query.trim().length > 0 && (
                <Pressable
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={10}
                  style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </Pressable>
              )}
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.emptyText}>Searching...</Text>
            </View>
          ) : searched ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptyText}>
                {query.trim() ? 'Try a different search term' : 'Follow people to invite them to your team'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const disabled = item.invited || item.sending;
          return (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.avatar}>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarText}>
                      {(item.display_name || item.username).charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.meta}>
                  <Text style={styles.displayName} numberOfLines={1}>
                    {item.display_name || item.username}
                  </Text>
                  <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => handleSendInvite(item.id)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={item.invited ? 'Invited' : 'Invite'}
                style={({ pressed }) => [
                  styles.inviteBtn,
                  item.invited ? styles.inviteBtnDisabled : styles.inviteBtnEnabled,
                  pressed && !disabled && styles.pressed,
                ]}
              >
                {item.sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.inviteBtnText, item.invited ? styles.inviteBtnTextDisabled : styles.inviteBtnTextEnabled]}>
                    {item.invited ? 'Invited' : 'Invite'}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c16',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  header: {
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.6)',
  },
  searchWrap: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    paddingVertical: 0,
    minHeight: 22,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  separator: {
    height: 10,
  },
  row: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139,92,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  inviteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtnEnabled: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  inviteBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  inviteBtnTextEnabled: {
    color: '#FFFFFF',
  },
  inviteBtnTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  pressed: {
    opacity: 0.92,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
