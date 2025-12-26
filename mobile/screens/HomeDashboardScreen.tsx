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

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Input, PageShell } from '../components/ui';
import { useAuthContext } from '../contexts/AuthContext';
import { ProfileCarousel } from '../components/ProfileCarousel';
import { RoomsCarousel } from '../components/RoomsCarousel';
import type { MainTabsParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';

type Props = { navigation: any };

export function HomeDashboardScreen({ navigation }: Props) {
  const { user } = useAuthContext();
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
    // Navigate to profile via parent stack navigator
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('ProfileRoute', { username });
    }
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

  const handleNavigateToAnalytics = () => {
    // TODO: Navigate to analytics
  };

  const handleApplyPress = () => {
    Linking.openURL('https://mylivelinks.com/apply');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('Gate');
    }
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
        onLogout={handleLogout}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E9BFF" />
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
      onLogout={handleLogout}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Welcome to MyLiveLinks</Text>
          <Text style={styles.heroSubtitle}>
            Your all-in-one platform for live streaming and link sharing
          </Text>
          <Text style={styles.heroDescription}>
            Stream live, share your links, and build your community ✨
          </Text>
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
                  <ActivityIndicator color="#5E9BFF" />
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
                        <Text style={styles.resultAvatarText}>
                          {(profile.username || '?').charAt(0).toUpperCase()}
                        </Text>
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
                  const parent = navigation.getParent();
                  if (parent) {
                    parent.navigate('ProfileRoute', { username: currentUser.username });
                  }
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  heroDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 24,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9aa0a6',
    lineHeight: 18,
  },
  searchInput: {
    marginBottom: 12,
  },
  searchResults: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  searchLoadingText: {
    color: '#9aa0a6',
    fontSize: 14,
  },
  resultsList: {
    gap: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5E9BFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#fff',
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
    color: '#9aa0a6',
    fontSize: 13,
    marginBottom: 2,
  },
  resultBio: {
    color: '#c9c9c9',
    fontSize: 12,
  },
  searchEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  searchEmptyText: {
    color: '#9aa0a6',
    fontSize: 14,
    textAlign: 'center',
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
});
