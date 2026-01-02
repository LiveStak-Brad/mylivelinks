/**
 * TeamsHomeScreen - Main Teams tab content
 * 
 * Shown after user completes teams onboarding (via create/join/skip).
 * Includes an "Invite friends" banner for users who skipped setup.
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Share,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { PageShell, PageHeader, Button, Modal } from '../components/ui';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { LegalFooter } from '../components/LegalFooter';
import { getMyTeam, createTeam, joinTeamByCode, type Team, type TeamMembership } from '../lib/teams';

type Props = { navigation: any };

export function TeamsHomeScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [membership, setMembership] = useState<TeamMembership | null>(null);
  
  // Modal states
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Load team data on focus
  useFocusEffect(
    React.useCallback(() => {
      loadTeamData();
    }, [])
  );

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const result = await getMyTeam();
      if (result.success) {
        setTeam(result.team);
        setMembership(result.membership);
      }
    } catch (error) {
      console.error('[TeamsHome] Failed to load team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateHome = () => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) {
      parent.navigate('MainTabs', { screen: 'Home' });
    }
  };

  const handleInviteFriends = async () => {
    try {
      // If user has a team, share the team slug
      const inviteUrl = team?.slug 
        ? `https://www.mylivelinks.com/teams/${team.slug}`
        : 'https://www.mylivelinks.com/join';
      const teamText = team?.name ? `my team "${team.name}"` : 'MyLiveLinks';
      
      await Share.share({
        title: `Join ${teamText}!`,
        message: `Hey! Join ${teamText}. Let's build something together! 🚀\n\n${inviteUrl}`,
        url: inviteUrl,
      });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        console.error('Share error:', error);
      }
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Team Name Required', 'Please enter a name for your team.');
      return;
    }
    
    setIsCreating(true);
    try {
      const result = await createTeam(teamName.trim());
      
      if (!result.success) {
        Alert.alert('Could Not Create Team', result.error);
        return;
      }
      
      setShowCreateModal(false);
      setTeamName('');
      await loadTeamData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Code Required', 'Please enter a team invite code.');
      return;
    }
    
    setIsJoining(true);
    try {
      const result = await joinTeamByCode(joinCode.trim());
      
      if (!result.success) {
        Alert.alert('Could Not Join Team', result.error);
        return;
      }
      
      setShowJoinModal(false);
      setJoinCode('');
      await loadTeamData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to join team');
    } finally {
      setIsJoining(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <PageShell
        contentStyle={styles.container}
        useNewHeader
        onNavigateHome={handleNavigateHome}
      >
        <PageHeader icon="users" iconColor="#10b981" title="Teams" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </PageShell>
    );
  }

  // User has a team - show team content
  const hasTeam = team && membership;

  return (
    <PageShell
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={handleNavigateHome}
    >
      <PageHeader icon="users" iconColor="#10b981" title="Teams" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Invite Friends Banner (shown for users who skipped) */}
        {!bannerDismissed && (
          <View style={styles.inviteBanner}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerIcon}>
                <Ionicons name="people-outline" size={20} color="#fff" />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Invite friends to your team</Text>
                <Text style={styles.bannerSubtitle}>
                  Build your group and unlock team features
                </Text>
              </View>
            </View>
            <View style={styles.bannerActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.bannerButton,
                  pressed && styles.bannerButtonPressed,
                ]}
                onPress={handleInviteFriends}
              >
                <Ionicons name="share-outline" size={16} color="#fff" />
                <Text style={styles.bannerButtonText}>Invite</Text>
              </Pressable>
              <Pressable
                style={styles.dismissButton}
                onPress={() => setBannerDismissed(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Team Content or Empty State */}
        {hasTeam ? (
          <View style={styles.teamCard}>
            <View style={styles.teamHeader}>
              <View style={[styles.teamIcon, team.theme_color ? { backgroundColor: team.theme_color } : null]}>
                <Text style={styles.teamIconText}>{team.team_tag}</Text>
              </View>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{team.name}</Text>
                <Text style={styles.teamStats}>
                  {team.approved_member_count} member{team.approved_member_count !== 1 ? 's' : ''}
                  {membership.status === 'requested' && ' • Pending approval'}
                </Text>
              </View>
            </View>
            {team.description && (
              <Text style={styles.teamDescription}>{team.description}</Text>
            )}
            <View style={styles.membershipBadge}>
              <Ionicons 
                name={membership.role === 'Team_Admin' ? 'shield-checkmark' : membership.role === 'Team_Moderator' ? 'shield-half' : 'person'} 
                size={14} 
                color={theme.colors.accent} 
              />
              <Text style={styles.membershipText}>
                {membership.role.replace('Team_', '')}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Feather name="users" size={48} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Teams Yet</Text>
            <Text style={styles.emptyDescription}>
              Create or join a team to start collaborating with friends
            </Text>
            
            <View style={styles.emptyActions}>
              <Button
                title="Create a Team"
                onPress={() => setShowCreateModal(true)}
                style={styles.actionButton}
              />
              <Button
                title="Join with Code"
                variant="secondary"
                onPress={() => setShowJoinModal(true)}
                style={styles.actionButton}
              />
            </View>
          </View>
        )}

        {/* Coming Soon Features */}
        <View style={styles.comingSoonSection}>
          <Text style={styles.sectionTitle}>Coming Soon</Text>
          <View style={styles.featureCards}>
            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="trophy-outline" size={22} color="#f59e0b" />
              </View>
              <Text style={styles.featureTitle}>Team Challenges</Text>
              <Text style={styles.featureDescription}>
                Compete together and earn rewards
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="chatbubbles-outline" size={22} color="#3b82f6" />
              </View>
              <Text style={styles.featureTitle}>Team Chat</Text>
              <Text style={styles.featureDescription}>
                Private group messaging
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="stats-chart-outline" size={22} color="#10b981" />
              </View>
              <Text style={styles.featureTitle}>Leaderboards</Text>
              <Text style={styles.featureDescription}>
                Track your team's progress
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <LegalFooter extraBottomPadding={68} />

      {/* Join with Code Modal */}
      <Modal visible={showJoinModal} onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Join with Code</Text>
          <Text style={styles.modalDescription}>
            Enter the invite code shared by your team leader.
          </Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter team code..."
            placeholderTextColor={theme.colors.textMuted}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isJoining}
          />
          <View style={styles.modalButtons}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => {
                setJoinCode('');
                setShowJoinModal(false);
              }}
              style={styles.modalButton}
              disabled={isJoining}
            />
            <Button
              title="Join Team"
              onPress={handleJoinWithCode}
              style={styles.modalButton}
              loading={isJoining}
              disabled={isJoining}
            />
          </View>
        </View>
      </Modal>

      {/* Create Team Modal */}
      <Modal visible={showCreateModal} onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create a Team</Text>
          <Text style={styles.modalDescription}>
            Give your team a name to get started.
          </Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Team name..."
            placeholderTextColor={theme.colors.textMuted}
            value={teamName}
            onChangeText={setTeamName}
            autoCorrect={false}
            editable={!isCreating}
          />
          <View style={styles.modalButtons}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => {
                setTeamName('');
                setShowCreateModal(false);
              }}
              style={styles.modalButton}
              disabled={isCreating}
            />
            <Button
              title="Create Team"
              onPress={handleCreateTeam}
              style={styles.modalButton}
              loading={isCreating}
              disabled={isCreating}
            />
          </View>
        </View>
      </Modal>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const isLight = theme.mode === 'light';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },

    // Invite Banner
    inviteBanner: {
      backgroundColor: '#10b981',
      borderRadius: 14,
      padding: 14,
      marginBottom: 20,
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    bannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    bannerIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerText: {
      flex: 1,
    },
    bannerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 2,
    },
    bannerSubtitle: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.85)',
    },
    bannerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    bannerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    bannerButtonPressed: {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    bannerButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    dismissButton: {
      padding: 4,
    },

    // Empty State
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    emptyActions: {
      width: '100%',
      gap: 12,
    },
    actionButton: {
      width: '100%',
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Team Card (when user has a team)
    teamCard: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    teamHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 12,
    },
    teamIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: '#10b981',
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamIconText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
    },
    teamInfo: {
      flex: 1,
    },
    teamName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    teamStats: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    teamDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    membershipBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    membershipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.accent,
    },

    // Modal
    modalContent: {
      gap: 12,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    modalDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    modalInput: {
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.colors.textPrimary,
      marginTop: 8,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
    },

    // Coming Soon Section
    comingSoonSection: {
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 14,
    },
    featureCards: {
      gap: 12,
    },
    featureCard: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    featureIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    featureDescription: {
      fontSize: 13,
      color: theme.colors.textMuted,
      maxWidth: 120,
      textAlign: 'right',
    },
  });
}
