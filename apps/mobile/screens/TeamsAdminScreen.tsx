import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { TeamsNavigationParams, navigateToTeamInvite } from '../lib/teamNavigation';

type TeamMember = {
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
};

type PendingRequest = {
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  requested_at: string;
};

type TeamRole = 'Team_Admin' | 'Team_Moderator' | 'Team_Member';

export default function TeamsAdminScreen() {
  const route = useRoute<RouteProp<TeamsNavigationParams, 'TeamsAdminScreen'>>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { teamId } = route.params || {};

  const [team, setTeam] = useState<{ id: string; slug: string; name: string } | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members');
  
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    if (!teamId) return;
    
    const { data } = await supabase
      .from('teams')
      .select('id, slug, name')
      .eq('id', teamId)
      .single();
    
    if (data) setTeam(data);
  }, [teamId]);

  const loadMembers = useCallback(async () => {
    if (!team?.slug) return;
    
    try {
      const { data, error } = await supabase.rpc('rpc_get_team_members', {
        p_team_slug: team.slug,
        p_status: 'approved',
        p_role: null,
        p_search: null,
        p_limit: 100,
      });
      
      if (error) throw error;
      
      setMembers(((data as any[]) || []).map((row) => ({
        profile_id: String(row.profile_id || ''),
        username: String(row.username || ''),
        display_name: (row.display_name as string | null) || null,
        avatar_url: (row.avatar_url as string | null) || null,
        role: String(row.role || 'Team_Member'),
      })));
    } catch (err: any) {
      console.error('[TeamsAdminScreen] loadMembers error:', err);
    }
  }, [team?.slug]);

  const loadPendingRequests = useCallback(async () => {
    if (!teamId) return;
    
    try {
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          profile_id,
          requested_at,
          profiles!team_memberships_profile_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      
      setPendingRequests(((data as any[]) || []).map((row) => ({
        profile_id: row.profile_id,
        username: row.profiles?.username || '',
        display_name: row.profiles?.display_name || null,
        avatar_url: row.profiles?.avatar_url || null,
        requested_at: row.requested_at,
      })));
    } catch (err: any) {
      console.error('[TeamsAdminScreen] loadPendingRequests error:', err);
    }
  }, [teamId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (team) {
      loadMembers();
      loadPendingRequests();
      setLoading(false);
    }
  }, [team, loadMembers, loadPendingRequests]);

  const handleApproveRequest = async (profileId: string) => {
    if (!teamId) return;
    
    setProcessingRequest(profileId);
    try {
      const { error } = await supabase.rpc('rpc_approve_member', {
        p_team_id: teamId,
        p_profile_id: profileId,
      });
      
      if (error) throw error;
      
      setPendingRequests(prev => prev.filter(r => r.profile_id !== profileId));
      await loadMembers();
    } catch (err: any) {
      console.error('[TeamsAdminScreen] handleApproveRequest error:', err);
      Alert.alert('Error', err.message || 'Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (profileId: string) => {
    if (!teamId) return;
    
    setProcessingRequest(profileId);
    try {
      const { error } = await supabase.rpc('rpc_reject_member', {
        p_team_id: teamId,
        p_profile_id: profileId,
      });
      
      if (error) throw error;
      
      setPendingRequests(prev => prev.filter(r => r.profile_id !== profileId));
    } catch (err: any) {
      console.error('[TeamsAdminScreen] handleRejectRequest error:', err);
      Alert.alert('Error', err.message || 'Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleChangeRole = async (newRole: TeamRole) => {
    if (!teamId || !selectedMember) return;
    
    setUpdatingRole(true);
    try {
      const { error } = await supabase.rpc('rpc_set_member_role', {
        p_team_id: teamId,
        p_profile_id: selectedMember.profile_id,
        p_role: newRole,
      });
      
      if (error) throw error;
      
      setMembers(prev => prev.map(m => 
        m.profile_id === selectedMember.profile_id ? { ...m, role: newRole } : m
      ));
      setRoleModalVisible(false);
      setSelectedMember(null);
    } catch (err: any) {
      console.error('[TeamsAdminScreen] handleChangeRole error:', err);
      Alert.alert('Error', err.message || 'Failed to change role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'Team_Admin') return 'Admin';
    if (role === 'Team_Moderator') return 'Moderator';
    return 'Member';
  };

  const getRoleBadgeStyle = (role: string) => {
    if (role === 'Team_Admin') return styles.badgeAdmin;
    if (role === 'Team_Moderator') return styles.badgeMod;
    return styles.badgeMember;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.headerLabel}>TEAM ADMIN</Text>
          <Text style={styles.headerTitle}>{team?.name || 'Manage your team'}</Text>
          <Text style={styles.headerDescription}>
            Members, roles, and moderation tools.
          </Text>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Ionicons name="people" size={18} color={activeTab === 'members' ? '#ec4899' : 'rgba(255,255,255,0.5)'} />
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
              Members ({members.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
            onPress={() => setActiveTab('requests')}
          >
            <Ionicons name="mail" size={18} color={activeTab === 'requests' ? '#ec4899' : 'rgba(255,255,255,0.5)'} />
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
              Requests ({pendingRequests.length})
            </Text>
            {pendingRequests.length > 0 && (
              <View style={styles.requestBadge}>
                <Text style={styles.requestBadgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {activeTab === 'members' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Team Members</Text>
              {teamId && (
                <Pressable 
                  style={styles.inviteButton}
                  onPress={() => navigateToTeamInvite(navigation, teamId)}
                >
                  <Ionicons name="person-add" size={16} color="#8B5CF6" />
                  <Text style={styles.inviteButtonText}>Invite</Text>
                </Pressable>
              )}
            </View>

            {members.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>No members yet</Text>
              </View>
            ) : (
              members.map((member) => (
                <View key={member.profile_id} style={styles.memberRow}>
                  <View style={styles.memberLeft}>
                    <View style={styles.avatar}>
                      {member.avatar_url ? (
                        <Image source={{ uri: member.avatar_url }} style={styles.avatarImage} resizeMode="cover" />
                      ) : (
                        <Text style={styles.avatarText}>
                          {(member.display_name || member.username).charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.memberMeta}>
                      <Text style={styles.memberName}>{member.display_name || member.username}</Text>
                      <Text style={styles.memberUsername}>@{member.username}</Text>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.roleBadge, getRoleBadgeStyle(member.role)]}
                    onPress={() => {
                      setSelectedMember(member);
                      setRoleModalVisible(true);
                    }}
                  >
                    <Text style={styles.roleBadgeText}>{getRoleLabel(member.role)}</Text>
                    <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.7)" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'requests' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>

            {pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="mail-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>No pending requests</Text>
              </View>
            ) : (
              pendingRequests.map((request) => (
                <View key={request.profile_id} style={styles.requestRow}>
                  <View style={styles.memberLeft}>
                    <View style={styles.avatar}>
                      {request.avatar_url ? (
                        <Image source={{ uri: request.avatar_url }} style={styles.avatarImage} resizeMode="cover" />
                      ) : (
                        <Text style={styles.avatarText}>
                          {(request.display_name || request.username).charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.memberMeta}>
                      <Text style={styles.memberName}>{request.display_name || request.username}</Text>
                      <Text style={styles.memberUsername}>@{request.username}</Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    {processingRequest === request.profile_id ? (
                      <ActivityIndicator size="small" color="#ec4899" />
                    ) : (
                      <>
                        <Pressable
                          style={styles.rejectButton}
                          onPress={() => handleRejectRequest(request.profile_id)}
                        >
                          <Ionicons name="close" size={18} color="#ef4444" />
                        </Pressable>
                        <Pressable
                          style={styles.approveButton}
                          onPress={() => handleApproveRequest(request.profile_id)}
                        >
                          <Ionicons name="checkmark" size={18} color="#fff" />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRoleModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Role</Text>
            <Text style={styles.modalSubtitle}>
              {selectedMember?.display_name || selectedMember?.username}
            </Text>

            {(['Team_Admin', 'Team_Moderator', 'Team_Member'] as TeamRole[]).map((role) => (
              <Pressable
                key={role}
                style={[
                  styles.roleOption,
                  selectedMember?.role === role && styles.roleOptionActive,
                ]}
                onPress={() => handleChangeRole(role)}
                disabled={updatingRole}
              >
                <Text style={styles.roleOptionText}>{getRoleLabel(role)}</Text>
                {selectedMember?.role === role && (
                  <Ionicons name="checkmark" size={20} color="#ec4899" />
                )}
              </Pressable>
            ))}

            {updatingRole && (
              <ActivityIndicator size="small" color="#ec4899" style={styles.modalLoader} />
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c16',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.5,
    color: 'rgba(255,255,255,0.5)',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  headerDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: {
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderColor: 'rgba(236,72,153,0.3)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#ec4899',
  },
  requestBadge: {
    backgroundColor: '#ec4899',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  memberLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  memberMeta: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  memberUsername: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  badgeAdmin: {
    backgroundColor: 'rgba(236,72,153,0.2)',
  },
  badgeMod: {
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  badgeMember: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleOptionActive: {
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderColor: 'rgba(236,72,153,0.3)',
  },
  roleOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalLoader: {
    marginTop: 8,
  },
});
