/**
 * SearchModal Component - Global Search
 * 
 * Allows searching for:
 * - Users
 * - Live rooms
 * 
 * DESIGN:
 * - Opaque modal (white/light in light mode, near-black/dark in dark mode)
 * - NO translucent content
 * - Vector icons for search and categories
 * - Clearly labeled "Search results coming soon" for non-wired features
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToProfile: (username: string) => void;
  onNavigateToRoom: () => void;
}

export function SearchModal({
  visible,
  onClose,
  onNavigateToProfile,
  onNavigateToRoom,
}: SearchModalProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'all' | 'users' | 'rooms'>('all');
  const [isSearching, setIsSearching] = useState(false);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleSearch = () => {
    // Placeholder: Backend search integration
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Search</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Input */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <Feather name="search" size={20} color={theme.colors.mutedText} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users, rooms..."
              placeholderTextColor={theme.colors.mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={handleClearSearch}>
                <Ionicons name="close-circle" size={20} color={theme.colors.mutedText} />
              </Pressable>
            )}
          </View>

          {/* Category Filter */}
          <View style={styles.categoryFilter}>
            <Pressable
              style={[
                styles.categoryButton,
                searchCategory === 'all' && styles.categoryButtonActive,
              ]}
              onPress={() => setSearchCategory('all')}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  searchCategory === 'all' && styles.categoryButtonTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.categoryButton,
                searchCategory === 'users' && styles.categoryButtonActive,
              ]}
              onPress={() => setSearchCategory('users')}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={searchCategory === 'users' ? '#fff' : theme.colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  searchCategory === 'users' && styles.categoryButtonTextActive,
                ]}
              >
                Users
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.categoryButton,
                searchCategory === 'rooms' && styles.categoryButtonActive,
              ]}
              onPress={() => setSearchCategory('rooms')}
            >
              <Feather
                name="video"
                size={16}
                color={searchCategory === 'rooms' ? '#fff' : theme.colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  searchCategory === 'rooms' && styles.categoryButtonTextActive,
                ]}
              >
                Rooms
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Results Section */}
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : searchQuery.length > 0 ? (
            <View style={styles.placeholderContainer}>
              <Feather name="search" size={48} color={theme.colors.mutedText} />
              <Text style={styles.placeholderTitle}>Search results coming soon</Text>
              <Text style={styles.placeholderSubtitle}>
                We're working on connecting this to our search backend.
              </Text>
              <Text style={styles.placeholderSubtitle}>
                Soon you'll be able to search for users and live rooms!
              </Text>
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Feather name="search" size={48} color={theme.colors.mutedText} />
              <Text style={styles.emptyStateTitle}>Start Searching</Text>
              <Text style={styles.emptyStateSubtitle}>
                Search for users, live rooms, and more
              </Text>

              {/* Quick Links */}
              <View style={styles.quickLinksContainer}>
                <Text style={styles.quickLinksTitle}>Quick Actions</Text>
                
                <Pressable style={styles.quickLinkButton} onPress={onNavigateToRoom}>
                  <Feather name="video" size={20} color="#f44336" />
                  <Text style={styles.quickLinkText}>Browse Live Rooms</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedText} />
                </Pressable>

                <Pressable
                  style={styles.quickLinkButton}
                  onPress={() => {
                    Alert.alert('Coming soon', 'Leaderboards are coming soon.');
                  }}
                >
                  <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
                  <Text style={styles.quickLinkText}>View Leaderboards</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedText} />
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },
    searchSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    categoryFilter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryButtonActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    categoryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    categoryButtonTextActive: {
      color: '#fff',
    },
    resultsContainer: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    placeholderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 80,
    },
    placeholderTitle: {
      marginTop: 24,
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    placeholderSubtitle: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyStateContainer: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 60,
    },
    emptyStateTitle: {
      marginTop: 24,
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    emptyStateSubtitle: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    quickLinksContainer: {
      width: '100%',
      marginTop: 32,
    },
    quickLinksTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 12,
    },
    quickLinkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 8,
    },
    quickLinkText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
  });
}


