import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const PLACEHOLDER_TEAMS = [
  { id: '1', name: 'Team Alpha', slug: 'team-alpha', members: 24, role: 'owner' },
  { id: '2', name: 'Beta Squad', slug: 'beta-squad', members: 18, role: 'member' },
  { id: '3', name: 'Gamma Crew', slug: 'gamma-crew', members: 32, role: 'member' },
];

const PLACEHOLDER_NEW_TEAMS = [
  { id: '4', name: 'Delta Force', slug: 'delta-force', members: 15, status: 'NEW' },
  { id: '5', name: 'Echo Team', slug: 'echo-team', members: 22, status: 'NEW' },
  { id: '6', name: 'Foxtrot Group', slug: 'foxtrot-group', members: 19, status: 'NEW' },
];

const PLACEHOLDER_INVITES = [
  { id: '1', teamName: 'Zeta Alliance', inviterName: 'John Doe', message: 'Join us!' },
  { id: '2', teamName: 'Theta Network', inviterName: 'Jane Smith', message: null },
];

export default function TeamsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateCta] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLabel}>
              <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={styles.headerLabelText}>TEAMS</Text>
            </View>
            <Text style={styles.headerTitle}>Teams</Text>
            <Text style={styles.headerDescription}>
              Your communities — chat, posts, live rooms, and people you care about.
            </Text>
          </View>
          {showCreateCta && (
            <TouchableOpacity style={styles.createButton}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.createButtonText}>Create Team</Text>
            </TouchableOpacity>
          )}
        </View>

        {showCreateCta ? (
          <View style={styles.ctaCard}>
            <Text style={styles.ctaLabel}>CREATE YOUR SPACE</Text>
            <Text style={styles.ctaTitle}>Launch a home for your people</Text>
            <Text style={styles.ctaDescription}>
              Spin up live rooms, posts, and chats in minutes. Invite collaborators and grow your community.
            </Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Ionicons name="add" size={18} color="#ec4899" />
              <Text style={styles.ctaButtonText}>Start a team</Text>
            </TouchableOpacity>
            <View style={styles.ctaBadges}>
              <View style={styles.ctaBadge}>
                <Text style={styles.ctaBadgeText}>FREE TO LAUNCH</Text>
              </View>
              <View style={styles.ctaBadge}>
                <Text style={styles.ctaBadgeText}>INVITE-ONLY</Text>
              </View>
              <View style={styles.ctaBadge}>
                <Text style={styles.ctaBadgeText}>LIVE READY</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>OWNER DASHBOARD</Text>
            <View style={styles.heroTeam}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>T</Text>
              </View>
              <View style={styles.heroTeamInfo}>
                <Text style={styles.heroTeamName}>Team Alpha</Text>
                <Text style={styles.heroTeamSlug}>/team-alpha</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Jump back in</Text>
              <Ionicons name="arrow-up-outline" size={16} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatText}>1 OWNER TEAM</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatText}>24 MEMBERS</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>DISCOVER</Text>
              <Text style={styles.sectionTitle}>New teams</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.exploreLink}>Explore all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {PLACEHOLDER_NEW_TEAMS.map((team) => (
              <TouchableOpacity key={team.id} style={styles.newTeamCard}>
                <View style={styles.newTeamImage}>
                  <View style={styles.newTeamGradient}>
                    <Text style={styles.newTeamImageText}>{team.name}</Text>
                  </View>
                  <View style={styles.newTeamBadge}>
                    <Text style={styles.newTeamBadgeText}>{team.status}</Text>
                  </View>
                </View>
                <Text style={styles.newTeamName}>{team.name}</Text>
                <View style={styles.newTeamAvatars}>
                  <View style={[styles.miniAvatar, { backgroundColor: '#F97316' }]}>
                    <Text style={styles.miniAvatarText}>A</Text>
                  </View>
                  <View style={[styles.miniAvatar, { backgroundColor: '#EC4899', marginLeft: -6 }]}>
                    <Text style={styles.miniAvatarText}>B</Text>
                  </View>
                  <View style={[styles.miniAvatar, { backgroundColor: '#38BDF8', marginLeft: -6 }]}>
                    <Text style={styles.miniAvatarText}>C</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search teams by name, tag, or slug"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close" size={14} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.searchHint}>Find teams by name, tag, or slug across your memberships.</Text>
        </View>

        {PLACEHOLDER_INVITES.length > 0 && (
          <View style={styles.section}>
            <View style={styles.invitesHeader}>
              <Ionicons name="mail-outline" size={16} color="#5eead4" />
              <Text style={styles.invitesTitle}>Teams you're invited to</Text>
              <View style={styles.invitesBadge}>
                <Text style={styles.invitesBadgeText}>{PLACEHOLDER_INVITES.length}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.invitesScroll}>
              {PLACEHOLDER_INVITES.map((invite) => (
                <View key={invite.id} style={styles.inviteCard}>
                  <View style={styles.inviteHeader}>
                    <View style={styles.inviteAvatar}>
                      <Text style={styles.inviteAvatarText}>{invite.teamName[0]}</Text>
                    </View>
                    <View style={styles.inviteInfo}>
                      <Text style={styles.inviteTeamName}>{invite.teamName}</Text>
                      <Text style={styles.inviteInviter}>Invited by {invite.inviterName}</Text>
                    </View>
                  </View>
                  {invite.message && (
                    <Text style={styles.inviteMessage}>"{invite.message}"</Text>
                  )}
                  <View style={styles.inviteActions}>
                    <TouchableOpacity style={styles.inviteAcceptButton}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Text style={styles.inviteAcceptText}>Join</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.inviteDeclineButton}>
                      <Ionicons name="close" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.inviteDeclineText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>YOUR SPACE</Text>
              <Text style={styles.sectionTitle}>Your teams</Text>
            </View>
            <TouchableOpacity style={styles.discoverButton}>
              <Ionicons name="compass-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.discoverButtonText}>Discover</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.teamsGrid}>
            {PLACEHOLDER_TEAMS.map((team) => (
              <TouchableOpacity key={team.id} style={styles.teamCard}>
                <View style={styles.teamImage}>
                  <View style={styles.teamGradient}>
                    <Text style={styles.teamImageText}>{team.name}</Text>
                  </View>
                  {team.role === 'owner' && (
                    <View style={styles.ownerBadge}>
                      <Text style={styles.ownerBadgeText}>Owner</Text>
                    </View>
                  )}
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{team.name}</Text>
                  <Text style={styles.teamMembers}>{team.members} members</Text>
                </View>
                <View style={styles.teamAvatars}>
                  <View style={[styles.miniAvatar, { backgroundColor: '#F97316' }]}>
                    <Text style={styles.miniAvatarText}>A</Text>
                  </View>
                  <View style={[styles.miniAvatar, { backgroundColor: '#EC4899', marginLeft: -6 }]}>
                    <Text style={styles.miniAvatarText}>B</Text>
                  </View>
                  <View style={[styles.miniAvatar, { backgroundColor: '#38BDF8', marginLeft: -6 }]}>
                    <Text style={styles.miniAvatarText}>C</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
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
  newTeamAvatars: {
    flexDirection: 'row',
    marginTop: 8,
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
  },
});
