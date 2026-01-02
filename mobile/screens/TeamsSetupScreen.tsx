/**
 * TeamsSetupScreen - First-time Teams onboarding
 * 
 * Shown when user taps Teams tab for the first time.
 * After completion/skip, routes to TeamsHome.
 * 
 * Contents:
 * - Title: "Set up Teams"
 * - Subtitle: "Invite friends to build your first group."
 * - Primary CTA: "Invite Friends" (share link)
 * - Secondary: "Create a Team", "Join with Code"
 * - Link: "Skip for now"
 */

import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Share,
  Alert,
  TextInput,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageShell, PageHeader, Button } from '../components/ui';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { setTeamsOnboardingCompleted } from '../lib/teamsOnboarding';
import { createTeam, joinTeamByCode } from '../lib/teams';
import { Modal } from '../components/ui';

type Props = { navigation: any };

export function TeamsSetupScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleNavigateHome = () => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) {
      parent.navigate('MainTabs', { screen: 'Home' });
    }
  };

  const handleInviteFriends = async () => {
    try {
      const inviteUrl = 'https://www.mylivelinks.com/join';
      await Share.share({
        title: 'Join my team on MyLiveLinks!',
        message: `Hey! Join my team on MyLiveLinks. Let's build something together! 🚀\n\n${inviteUrl}`,
        url: inviteUrl,
      });
      
      // Mark onboarding complete after sharing
      await setTeamsOnboardingCompleted();
      navigateToTeamsHome();
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
      
      await setTeamsOnboardingCompleted();
      setShowCreateModal(false);
      navigateToTeamsHome();
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
      
      await setTeamsOnboardingCompleted();
      setShowJoinModal(false);
      navigateToTeamsHome();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to join team');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSkip = async () => {
    await setTeamsOnboardingCompleted();
    navigateToTeamsHome();
  };

  const navigateToTeamsHome = () => {
    // Navigate to TeamsHome within the same tab
    navigation.replace('TeamsHome');
  };

  return (
    <PageShell
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={handleNavigateHome}
    >
      <PageHeader icon="users" iconColor="#10b981" title="Teams" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <Feather name="users" size={48} color="#10b981" />
          </View>
          <Text style={styles.title}>Set up Teams</Text>
          <Text style={styles.subtitle}>
            Invite friends to build your first group.
          </Text>
        </View>

        {/* Primary CTA - Invite Friends */}
        <Pressable
          style={({ pressed }) => [
            styles.primaryCard,
            pressed && styles.cardPressed,
          ]}
          onPress={handleInviteFriends}
        >
          <View style={styles.cardIconContainer}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Invite Friends</Text>
            <Text style={styles.cardDescription}>
              Share your invite link and start building your team together
            </Text>
          </View>
          <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
        </Pressable>

        {/* Secondary CTAs */}
        <View style={styles.secondaryCards}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => setShowCreateModal(true)}
          >
            <View style={styles.secondaryIconContainer}>
              <Ionicons name="add-circle-outline" size={22} color={theme.colors.accent} />
            </View>
            <Text style={styles.secondaryCardTitle}>Create a Team</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => setShowJoinModal(true)}
          >
            <View style={styles.secondaryIconContainer}>
              <Ionicons name="enter-outline" size={22} color={theme.colors.accent} />
            </View>
            <Text style={styles.secondaryCardTitle}>Join with Code</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        {/* Skip Link */}
        <Pressable style={styles.skipLink} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
          <Text style={styles.infoText}>
            You can always set up teams later from the Teams tab.
          </Text>
        </View>
      </ScrollView>

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
            autoCapitalize="characters"
            autoCorrect={false}
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
      paddingHorizontal: 20,
      paddingTop: 32,
    },

    // Hero Section
    heroSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: isLight ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.25)',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 16,
    },

    // Primary Card (Invite Friends)
    primaryCard: {
      backgroundColor: '#10b981',
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    cardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    cardIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 4,
    },
    cardDescription: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.85)',
      lineHeight: 18,
    },

    // Secondary Cards
    secondaryCards: {
      gap: 12,
      marginBottom: 24,
    },
    secondaryCard: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryCardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },

    // Skip Link
    skipLink: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    skipText: {
      fontSize: 15,
      color: theme.colors.accent,
      fontWeight: '600',
    },

    // Info Note
    infoNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
      borderRadius: 10,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textMuted,
      lineHeight: 18,
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
  });
}
