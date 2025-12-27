/**
 * HomeDashboardScreen - Mobile Home Page
 * 
 * REWRITE JUSTIFICATION:
 * Full rewrite required to achieve strict parity with web Home page (app/page.tsx).
 * Previous implementation was a placeholder with 4 buttons. Web has 7 complete sections:
 * hero, search, profile carousel, rooms carousel, features grid, CTAs, footer.
 * No shared structure to preserve - complete architectural difference required full replacement.
 * 
 * PARITY SOURCES:
 * - Web reference: app/page.tsx
 * - Data sources: Same as web (Supabase direct queries, /api/rooms endpoint)
 * - Components mirror: components/ProfileCarousel.tsx, components/rooms/RoomsCarousel.tsx
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Input, PageShell, PageHeader } from '../components/ui';
import { useAuthContext } from '../contexts/AuthContext';
import { ProfileCarousel } from '../components/ProfileCarousel';
import { RoomsCarousel } from '../components/RoomsCarousel';
import type { MainTabsParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = { navigation: any };

export function HomeDashboardScreen({ navigation }: Props) {
  const { user } = useAuthContext();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    checkUser();
  }, [user]);

  const checkUser = async () => {
    try {
      if (user) {
        // Check if profile is complete
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        setCurrentUser(profile || { id: user.id, email: user.email });
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, is_live')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (!error && data) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleProfilePress = (username: string) => {
    // Navigate to profile tab within MainTabs
    navigation.navigate('Profile', { username });
  };

  const handleNavigateHome = () => {
    // Already on home - scroll to top if applicable
  };

  const handleNavigateToSettings = () => {
    // TODO: Navigate to settings
  };

  const handleNavigateToWallet = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('Wallet');
    }
  };

  const handleNavigateToRooms = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('Rooms');
      return;
    }
    try {
      navigation.navigate('Rooms');
    } catch {
      // ignore
    }
  };

  const handleNavigateToAnalytics = () => {
    // TODO: Navigate to analytics
  };

  const handleApplyPress = () => {
    Linking.openURL('https://mylivelinks.com/apply');
  };

  if (loading) {
    return (
      <PageShell
        contentStyle={styles.container}
        useNewHeader
        onNavigateHome={handleNavigateHome}
        onNavigateToProfile={handleProfilePress}
        onNavigateToSettings={handleNavigateToSettings}
        onNavigateToWallet={handleNavigateToWallet}
        onNavigateToAnalytics={handleNavigateToAnalytics}
        onNavigateToApply={handleApplyPress}
        onNavigateToRooms={handleNavigateToRooms}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accentSecondary} />
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={handleNavigateHome}
      onNavigateToProfile={handleProfilePress}
      onNavigateToSettings={handleNavigateToSettings}
      onNavigateToWallet={handleNavigateToWallet}
      onNavigateToAnalytics={handleNavigateToAnalytics}
      onNavigateToApply={handleApplyPress}
      onNavigateToRooms={handleNavigateToRooms}
    >
      {/* Page Header: Home icon + Home */}
      <PageHeader icon="home" iconColor="#8b5cf6" title="Home" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={styles.heroCard}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../assets/mylivelinksmeta.png')}
            style={styles.heroBanner}
            resizeMode="contain"
          />
        </View>

        {/* Search Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔍</Text>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Find Creators</Text>
              <Text style={styles.sectionSubtitle}>
                Search for profiles, discover new content, and connect with creators
              </Text>
            </View>
          </View>

          <Input
            placeholder="Search by username or name..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchInput}
          />

          {/* Search Results */}
          {searchQuery && (
            <View style={styles.searchResults}>
              {searching ? (
                <View style={styles.searchLoading}>
                  <ActivityIndicator color={theme.colors.accentSecondary} />
                  <Text style={styles.searchLoadingText}>Searching...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <View style={styles.resultsList}>
                  {searchResults.map((profile) => (
                    <Pressable
                      key={profile.id}
                      style={styles.resultItem}
                      onPress={() => handleProfilePress(profile.username)}
                    >
                      <View style={styles.resultAvatar}>
                        {profile.avatar_url ? (
                          <Image
                            source={{ uri: profile.avatar_url }}
                            style={styles.resultAvatarImage}
                          />
                        ) : (
                          <Text style={styles.resultAvatarText}>
                            {(profile.username || '?').charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.resultInfo}>
                        <View style={styles.resultNameRow}>
                          <Text style={styles.resultName}>
                            {profile.display_name || profile.username}
                          </Text>
                          {profile.is_live && (
                            <View style={styles.liveBadgeSmall}>
                              <Text style={styles.liveBadgeSmallText}>LIVE</Text>
                            </View>
                          )}
                        </View>
                      <Text style={styles.resultUsername}>@{profile.username}</Text>
                        {profile.bio && (
                          <Text style={styles.resultBio} numberOfLines={1}>
                            {profile.bio}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.searchEmpty}>
                  <Text style={styles.searchEmptyText}>
                    No profiles found. Try a different search term.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Recommended Profiles Carousel */}
        <ProfileCarousel
          title={currentUser ? 'Recommended for You' : 'Popular Creators'}
          currentUserId={currentUser?.id || null}
          onProfilePress={handleProfilePress}
        />

        {/* Coming Soon Rooms Carousel */}
        <RoomsCarousel onApplyPress={handleApplyPress} />

        {/* Features Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>📹</Text>
              </View>
              <Text style={styles.featureTitle}>Live Streaming</Text>
              <Text style={styles.featureDescription}>
                Go live instantly with high-quality video streaming. Connect with your audience in
                real-time.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🔗</Text>
              </View>
              <Text style={styles.featureTitle}>Link Hub</Text>
              <Text style={styles.featureDescription}>
                Share all your important links in one beautiful profile. Your personal link tree,
                supercharged!
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>👥</Text>
              </View>
              <Text style={styles.featureTitle}>Community</Text>
              <Text style={styles.featureDescription}>
                Follow creators, chat live, send gifts, and build your community all in one place.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>📈</Text>
              </View>
              <Text style={styles.featureTitle}>Monetization</Text>
              <Text style={styles.featureDescription}>
                Earn from your content through gifts, tips, and viewer support. Turn your passion
                into income.
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ready to Get Started?</Text>
          <View style={styles.quickActions}>
            {currentUser?.username ? (
              <Button
                title="View My Profile"
                onPress={() => {
                  navigation.navigate('Profile', { username: currentUser.username });
                }}
                style={styles.actionButton}
              />
            ) : (
              <Button
                title="Complete Your Profile"
                onPress={() => {
                  // Profile creation is handled in onboarding
                }}
                style={styles.actionButton}
                disabled
              />
            )}
            <Button
              title="Browse Live Streams"
              variant="secondary"
              disabled
              onPress={() => {}}
              style={styles.actionButton}
            />
            <Button
              title="Browse Rooms"
              onPress={() => {
                // Navigate to Rooms tab (already in tab navigator)
                // This button might be redundant since Rooms is a tab
              }}
              style={styles.actionButton}
              disabled
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 MyLiveLinks. All rights reserved.          </Text>
        </View>
      </ScrollView>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: 32,
      paddingHorizontal: 12,
      paddingTop: 0,
    },
    heroCard: {
      backgroundColor: 'transparent',
      borderRadius: 0,
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 0,
      marginHorizontal: -12, // Negative margin to offset scrollContent padding
      marginTop: 0,
      marginBottom: 20,
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
      borderWidth: 0,
      borderColor: 'transparent',
      alignItems: 'center',
      overflow: 'visible',
    },
    heroBanner: {
      width: '100%',
      height: undefined,
      aspectRatio: 1200 / 630,
      borderRadius: 20,
    },
    heroTitle: {
      fontSize: 30,
      fontWeight: '900',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: 10,
    },
    heroSubtitle: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 6,
      paddingHorizontal: 8,
    },
    heroDescription: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    section: {
      paddingHorizontal: 4,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 8,
      paddingHorizontal: 8,
    },
    sectionIcon: {
      fontSize: 24,
    },
    sectionHeaderText: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    searchInput: {
      marginBottom: 12,
    },
    searchResults: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 16,
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.menuShadow,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    searchLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
    },
    searchLoadingText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    resultsList: {
      gap: 6,
    },
    resultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      gap: 12,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    resultAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.accentSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      shadowColor: theme.colors.menuShadow,
      shadowOpacity: 0.14,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    resultAvatarImage: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    resultAvatarText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '900',
    },
    resultInfo: {
      flex: 1,
    },
    resultNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    resultName: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    liveBadgeSmall: {
      backgroundColor: '#FF4444',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    liveBadgeSmallText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '900',
    },
    resultUsername: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginBottom: 2,
    },
    resultBio: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    searchEmpty: {
      padding: 20,
      alignItems: 'center',
    },
    searchEmptyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
    featuresGrid: {
      gap: 12,
    },
    featureCard: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.menuShadow,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    featureIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    featureIconText: {
      fontSize: 24,
    },
    featureTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    featureDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    quickActions: {
      gap: 12,
      marginTop: 16,
    },
    actionButton: {
      width: '100%',
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 24,
      alignItems: 'center',
    },
    footerText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
  });
}
