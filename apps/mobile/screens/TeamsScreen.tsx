import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import { useAuth } from '../state/AuthContext';
import { supabase } from '../lib/supabase';
import { navigateToTeamDetail, navigateToTeamsSearch, navigateToTeamsSetup } from '../lib/teamNavigation';

type MyTeam = {
  id: string;
  slug: string;
  name: string;
  approved_member_count: number;
  role: string;
  icon_url?: string | null;
  banner_url?: string | null;
};

type DiscoveryTeam = {
  id: string;
  slug: string;
  name: string;
  approved_member_count: number;
  icon_url?: string | null;
  banner_url?: string | null;
};

type TeamInvite = {
  id: number;
  team_id: string;
  team_name: string;
  inviter_name: string | null;
  message: string | null;
};

export default function TeamsScreen() {
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const isDark = mode === 'dark';
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [myTeams, setMyTeams] = useState<MyTeam[]>([]);
  const [myTeamsLoading, setMyTeamsLoading] = useState(true);
  const [myTeamsError, setMyTeamsError] = useState<string | null>(null);
  
  const [discoveryTeams, setDiscoveryTeams] = useState<DiscoveryTeam[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  
  const [refreshing, setRefreshing] = useState(false);
  
  const loadMyTeams = useCallback(async () => {
    if (!user?.id) return;
    setMyTeamsLoading(true);
    setMyTeamsError(null);
    
    try {
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          team_id,
          role,
          status,
          teams!inner (
            id,
            slug,
            name,
            approved_member_count,
            icon_url,
            banner_url
          )
        `)
        .eq('profile_id', user.id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });
      
      if (error) throw error;
      
      const teams = (data || []).map((row: any) => ({
        id: row.teams.id,
        slug: row.teams.slug,
        name: row.teams.name,
        approved_member_count: row.teams.approved_member_count || 0,
        role: row.role,
        icon_url: row.teams.icon_url,
        banner_url: row.teams.banner_url,
      }));
      
      setMyTeams(teams);
    } catch (err: any) {
      console.error('[TeamsScreen] loadMyTeams error:', err);
      setMyTeamsError(err.message || 'Failed to load teams');
    } finally {
      setMyTeamsLoading(false);
    }
  }, [user?.id]);
  
  const loadDiscoveryTeams = useCallback(async () => {
    setDiscoveryLoading(true);
    setDiscoveryError(null);
    
    try {
      const { data, error } = await supabase.rpc('rpc_get_teams_discovery_ordered', {
        p_limit: 10,
        p_offset: 0,
      });
      
      if (error) throw error;
      
      setDiscoveryTeams((data as any) || []);
    } catch (err: any) {
      console.error('[TeamsScreen] loadDiscoveryTeams error:', err);
      setDiscoveryError(err.message || 'Failed to load discovery teams');
    } finally {
      setDiscoveryLoading(false);
    }
  }, []);
  
  const loadInvites = useCallback(async () => {
    if (!user?.id) return;
    setInvitesLoading(true);
    setInvitesError(null);
    
    try {
      const { data, error } = await supabase
        .from('team_invites')
        .select(`
          id,
          team_id,
          message,
          teams!inner (
            name
          ),
          inviter:profiles!team_invites_inviter_id_fkey (
            display_name,
            username
          )
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        team_id: row.team_id,
        team_name: row.teams?.name || 'Unknown Team',
        inviter_name: row.inviter?.display_name || row.inviter?.username || 'Someone',
        message: row.message,
      }));
      
      setInvites(mapped);
    } catch (err: any) {
      console.error('[TeamsScreen] loadInvites error:', err);
      setInvitesError(err.message || 'Failed to load invites');
    } finally {
      setInvitesLoading(false);
    }
  }, [user?.id]);
  
  const loadAll = useCallback(async () => {
    await Promise.all([loadMyTeams(), loadDiscoveryTeams(), loadInvites()]);
  }, [loadMyTeams, loadDiscoveryTeams, loadInvites]);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);
  
  useEffect(() => {
    loadAll();
  }, [loadAll]);
  
  const handleAcceptInvite = async (inviteId: number) => {
    try {
      const { error } = await supabase.rpc('rpc_accept_team_invite', {
        p_invite_id: inviteId,
      });
      
      if (error) throw error;
      
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      await loadMyTeams();
    } catch (err: any) {
      console.error('[TeamsScreen] handleAcceptInvite error:', err);
    }
  };
  
  const handleDeclineInvite = async (inviteId: number) => {
    try {
      const { error } = await supabase.rpc('rpc_decline_team_invite', {
        p_invite_id: inviteId,
      });
      
      if (error) throw error;
      
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch (err: any) {
      console.error('[TeamsScreen] handleDeclineInvite error:', err);
    }
  };
  
  const ownerTeam = myTeams.find((t) => t.role === 'Team_Admin');
  const showCreateCta = myTeams.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['left', 'right']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        <View style={[styles.header, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLabel}>
              <Ionicons name="people-outline" size={16} color={colors.subtleText} />
              <Text style={[styles.headerLabelText, { color: colors.subtleText }]}>TEAMS</Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Teams</Text>
            <Text style={[styles.headerDescription, { color: colors.mutedText }]}>
              Your communities — chat, posts, live rooms, and people you care about.
            </Text>
          </View>
          {showCreateCta && (
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigateToTeamsSetup(navigation)}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.createButtonText}>Create Team</Text>
            </TouchableOpacity>
          )}
        </View>

        {showCreateCta ? (
          <View style={[styles.ctaCard, { backgroundColor: isDark ? 'rgba(236,72,153,0.2)' : 'rgba(236,72,153,0.1)', borderColor: colors.border }]}>
            <Text style={[styles.ctaLabel, { color: colors.mutedText }]}>CREATE YOUR SPACE</Text>
            <Text style={[styles.ctaTitle, { color: colors.text }]}>Launch a home for your people</Text>
            <Text style={[styles.ctaDescription, { color: colors.mutedText }]}>
              Spin up live rooms, posts, and chats in minutes. Invite collaborators and grow your community.
            </Text>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => navigateToTeamsSetup(navigation)}
            >
              <Ionicons name="add" size={18} color="#ec4899" />
              <Text style={styles.ctaButtonText}>Start a team</Text>
            </TouchableOpacity>
            <View style={styles.ctaBadges}>
              <View style={[styles.ctaBadge, { borderColor: colors.border }]}>
                <Text style={[styles.ctaBadgeText, { color: colors.mutedText }]}>FREE TO LAUNCH</Text>
              </View>
              <View style={[styles.ctaBadge, { borderColor: colors.border }]}>
                <Text style={[styles.ctaBadgeText, { color: colors.mutedText }]}>INVITE-ONLY</Text>
              </View>
              <View style={[styles.ctaBadge, { borderColor: colors.border }]}>
                <Text style={[styles.ctaBadgeText, { color: colors.mutedText }]}>LIVE READY</Text>
              </View>
            </View>
          </View>
        ) : ownerTeam ? (
          <View style={[styles.heroCard, { backgroundColor: isDark ? 'rgba(27,22,48,1)' : colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.heroLabel, { color: colors.subtleText }]}>OWNER DASHBOARD</Text>
            <View style={styles.heroTeam}>
              <View style={[styles.heroAvatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.surface2, borderColor: colors.border }]}>
                <Text style={[styles.heroAvatarText, { color: colors.mutedText }]}>{ownerTeam.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.heroTeamInfo}>
                <Text style={[styles.heroTeamName, { color: colors.text }]}>{ownerTeam.name}</Text>
                <Text style={[styles.heroTeamSlug, { color: colors.subtleText }]}>/{ownerTeam.slug}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.heroButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.surface2 }]}
              onPress={() => navigateToTeamDetail(navigation, { teamId: ownerTeam.id, slug: ownerTeam.slug })}
            >
              <Text style={[styles.heroButtonText, { color: colors.text }]}>Jump back in</Text>
              <Ionicons name="arrow-up-outline" size={16} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.heroStats}>
              <View style={[styles.heroStat, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.surface2 }]}>
                <Text style={[styles.heroStatText, { color: colors.mutedText }]}>1 OWNER TEAM</Text>
              </View>
              <View style={[styles.heroStat, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.surface2 }]}>
                <Text style={[styles.heroStatText, { color: colors.mutedText }]}>{ownerTeam.approved_member_count} MEMBERS</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionLabel, { color: colors.subtleText }]}>DISCOVER</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>New teams</Text>
            </View>
            <TouchableOpacity onPress={() => navigateToTeamsSearch(navigation)}>
              <Text style={[styles.exploreLink, { color: colors.mutedText }]}>Explore all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {discoveryLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text} />
                <Text style={[styles.loadingText, { color: colors.mutedText }]}>Loading teams...</Text>
              </View>
            ) : discoveryError ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: colors.danger }]}>Error: {discoveryError}</Text>
              </View>
            ) : discoveryTeams.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.subtleText }]}>No teams to discover yet</Text>
              </View>
            ) : (
              discoveryTeams.map((team) => {
                const displayPhoto = team.banner_url || team.icon_url;
                return (
                  <TouchableOpacity 
                    key={team.id} 
                    style={styles.newTeamCard}
                    onPress={() => navigateToTeamDetail(navigation, { teamId: team.id, slug: team.slug })}
                  >
                    <View style={[styles.newTeamImage, { borderColor: colors.border }]}>
                      {displayPhoto ? (
                        <Image 
                          source={{ uri: displayPhoto }} 
                          style={styles.newTeamImagePhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.newTeamGradient}>
                          <Text style={styles.newTeamImageText}>{team.name.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={styles.newTeamBadge}>
                        <Text style={styles.newTeamBadgeText}>NEW</Text>
                      </View>
                    </View>
                    <Text style={[styles.newTeamName, { color: colors.text }]}>{team.name}</Text>
                    <Text style={[styles.newTeamMembers, { color: colors.subtleText }]}>{team.approved_member_count} members</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: colors.border }]}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color={colors.subtleText} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface2, borderColor: colors.border, color: colors.text }]}
              placeholder="Search teams by name, tag, or slug"
              placeholderTextColor={colors.subtleText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => navigateToTeamsSearch(navigation)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={[styles.clearButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.surface2 }]}>
                <Ionicons name="close" size={14} color={colors.mutedText} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.searchHint, { color: colors.subtleText }]}>Find teams by name, tag, or slug across your memberships.</Text>
        </View>

        {!invitesLoading && invites.length > 0 && (
          <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: colors.border }]}>
            <View style={styles.invitesHeader}>
              <Ionicons name="mail-outline" size={16} color="#5eead4" />
              <Text style={[styles.invitesTitle, { color: colors.text }]}>Teams you're invited to</Text>
              <View style={styles.invitesBadge}>
                <Text style={styles.invitesBadgeText}>{invites.length}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.invitesScroll}>
              {invites.map((invite) => (
                <View key={invite.id} style={[styles.inviteCard, { backgroundColor: isDark ? 'rgba(94,234,212,0.1)' : 'rgba(94,234,212,0.08)', borderColor: 'rgba(94,234,212,0.3)' }]}>
                  <View style={styles.inviteHeader}>
                    <View style={[styles.inviteAvatar, { borderColor: colors.border }]}>
                      <Text style={[styles.inviteAvatarText, { color: colors.mutedText }]}>{invite.team_name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.inviteInfo}>
                      <Text style={[styles.inviteTeamName, { color: colors.text }]}>{invite.team_name}</Text>
                      <Text style={[styles.inviteInviter, { color: colors.mutedText }]}>Invited by {invite.inviter_name}</Text>
                    </View>
                  </View>
                  {invite.message && (
                    <Text style={[styles.inviteMessage, { color: colors.mutedText }]}>"{invite.message}"</Text>
                  )}
                  <View style={styles.inviteActions}>
                    <TouchableOpacity 
                      style={styles.inviteAcceptButton}
                      onPress={() => handleAcceptInvite(invite.id)}
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Text style={styles.inviteAcceptText}>Join</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.inviteDeclineButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.surface2, borderColor: colors.border }]}
                      onPress={() => handleDeclineInvite(invite.id)}
                    >
                      <Ionicons name="close" size={14} color={colors.mutedText} />
                      <Text style={[styles.inviteDeclineText, { color: colors.mutedText }]}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionLabel, { color: colors.subtleText }]}>YOUR SPACE</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your teams</Text>
            </View>
            <TouchableOpacity 
              style={styles.discoverButton}
              onPress={() => navigateToTeamsSearch(navigation)}
            >
              <Ionicons name="compass-outline" size={16} color={colors.mutedText} />
              <Text style={[styles.discoverButtonText, { color: colors.mutedText }]}>Discover</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.teamsGrid}>
            {myTeamsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text} />
                <Text style={[styles.loadingText, { color: colors.mutedText }]}>Loading your teams...</Text>
              </View>
            ) : myTeamsError ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: colors.danger }]}>Error: {myTeamsError}</Text>
              </View>
            ) : myTeams.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.subtleText }]}>You haven't joined any teams yet</Text>
              </View>
            ) : (
              myTeams.map((team) => {
                const displayPhoto = team.banner_url || team.icon_url;
                return (
                  <TouchableOpacity 
                    key={team.id} 
                    style={[styles.teamCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface, borderColor: colors.border }]}
                    onPress={() => navigateToTeamDetail(navigation, { teamId: team.id, slug: team.slug })}
                  >
                    <View style={[styles.teamImage, { borderColor: colors.border }]}>
                      {displayPhoto ? (
                        <Image 
                          source={{ uri: displayPhoto }} 
                          style={styles.teamImagePhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.teamGradient}>
                          <Text style={styles.teamImageText}>{team.name.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      {team.role === 'Team_Admin' && (
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>Owner</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
                      <Text style={[styles.teamMembers, { color: colors.subtleText }]}>{team.approved_member_count} members</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 24,
  },
  header: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    gap: 8,
  },
  headerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLabelText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.5,
    color: 'rgba(255,255,255,0.5)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ec4899',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  ctaCard: {
    backgroundColor: 'rgba(236,72,153,0.2)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  ctaLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.5,
    color: 'rgba(255,255,255,0.7)',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 32,
  },
  ctaDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ec4899',
  },
  ctaBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  ctaBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  ctaBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.8)',
  },
  heroCard: {
    backgroundColor: 'rgba(27,22,48,1)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 16,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.5,
    color: 'rgba(255,255,255,0.6)',
  },
  heroTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  heroTeamInfo: {
    flex: 1,
  },
  heroTeamName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  heroTeamSlug: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroStat: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  heroStatText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.7)',
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.5,
    color: 'rgba(255,255,255,0.5)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  exploreLink: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  carousel: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  newTeamCard: {
    width: 120,
    marginRight: 12,
  },
  newTeamImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  newTeamImagePhoto: {
    width: '100%',
    height: '100%',
  },
  newTeamGradient: {
    flex: 1,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  newTeamImageText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  newTeamBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  newTeamBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#fff',
  },
  newTeamName: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  newTeamMembers: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  newTeamAvatars: {
    flexDirection: 'row',
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  errorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0c0c16',
  },
  miniAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
  },
  searchHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  invitesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invitesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  invitesBadge: {
    backgroundColor: 'rgba(94,234,212,0.2)',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  invitesBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5eead4',
  },
  invitesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  inviteCard: {
    width: 240,
    backgroundColor: 'rgba(94,234,212,0.1)',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(94,234,212,0.3)',
    gap: 12,
  },
  inviteHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(94,234,212,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inviteAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  inviteInfo: {
    flex: 1,
  },
  inviteTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  inviteInviter: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  inviteMessage: {
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.7)',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteAcceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    paddingVertical: 8,
    gap: 4,
  },
  inviteAcceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  inviteDeclineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 4,
  },
  inviteDeclineText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  discoverButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  teamsGrid: {
    gap: 16,
  },
  teamCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  teamImage: {
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  teamImagePhoto: {
    width: '100%',
    height: '100%',
  },
  teamGradient: {
    flex: 1,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  teamImageText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  ownerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(168,85,247,0.4)',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  teamInfo: {
    gap: 4,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  teamMembers: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  teamAvatars: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
