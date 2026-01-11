import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface DatingMatch {
  matched_profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  dating_bio?: string;
  age?: number;
  interests?: string[];
  photos: string[];
  matched_at: string;
  last_active_at?: string;
}

export default function LinkDatingMatchesScreen() {
  // UI-only screen: top controls + list/empty state. Data is expected to be provided later.
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'matches' | 'likes' | 'archived'>('matches');

  // Keep as empty until wired to real data.
  const matches: DatingMatch[] = useMemo(() => [], []);
  const error: string | null = null;

  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => {
      const name = (m.display_name ?? '').toLowerCase();
      const username = (m.username ?? '').toLowerCase();
      return name.includes(q) || username.includes(q) || `@${username}`.includes(q);
    });
  }, [matches, query]);

  const visibleMatches = useMemo(() => {
    // Tabs are UI-only; once data includes states, this can be real filtering.
    if (activeTab === 'matches') return filteredMatches;
    if (activeTab === 'likes') return [];
    return [];
  }, [activeTab, filteredMatches]);

  function formatLastActive(match: DatingMatch) {
    // UI-only placeholder until API provides presence/last active.
    if (match.last_active_at) return 'Active recently';
    return 'Active recently';
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.stickyHeader}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>My Matches</Text>
        </View>

        <View style={styles.tabsRow} accessibilityRole="tablist">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'matches' }}
            onPress={() => setActiveTab('matches')}
            style={({ pressed }) => [styles.tab, activeTab === 'matches' && styles.tabActive, pressed && styles.pressed]}
          >
            <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>Matches</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'likes' }}
            onPress={() => setActiveTab('likes')}
            style={({ pressed }) => [styles.tab, activeTab === 'likes' && styles.tabActive, pressed && styles.pressed]}
          >
            <Text style={[styles.tabText, activeTab === 'likes' && styles.tabTextActive]}>Likes</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'archived' }}
            onPress={() => setActiveTab('archived')}
            style={({ pressed }) => [styles.tab, activeTab === 'archived' && styles.tabActive, pressed && styles.pressed]}
          >
            <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>Archived</Text>
          </Pressable>
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.searchInputWrap} accessibilityLabel="Search matches">
            <Ionicons name="search-outline" size={18} color="#6B7280" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search matches…"
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={styles.searchInput}
            />
            {query.trim().length ? (
              <Pressable
                onPress={() => setQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={10}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            onPress={() => {}}
            style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
          >
            <Ionicons name="options-outline" size={18} color="#111827" />
            <Text style={styles.filterButtonText}>Filters</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={visibleMatches}
        keyExtractor={(item) => item.matched_profile_id}
        contentContainerStyle={[styles.listContent, visibleMatches.length === 0 ? styles.listContentEmpty : null]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open match ${item.display_name ?? item.username}`}
            onPress={() => {}}
            style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]}
          >
            <Image
              source={{ uri: item.avatar_url || (item.photos && item.photos[0]) || '/placeholder-avatar.png' }}
              style={styles.avatar}
            />

            <View style={styles.matchInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {item.display_name || item.username || 'Match'}
                </Text>
                <View style={styles.matchBadge}>
                  <Text style={styles.matchBadgeText}>💕 Match</Text>
                </View>
              </View>
              <Text style={styles.subRow} numberOfLines={1}>
                @{item.username} • {formatLastActive(item)}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Message ${item.display_name ?? item.username}`}
              onPress={() => {}}
              style={({ pressed }) => [styles.messageButton, pressed && styles.pressed]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#111827" />
              <Text style={styles.messageButtonText}>Message</Text>
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState} accessibilityRole="text">
            <View style={styles.emptyIconContainer}>
              <Ionicons name="heart-outline" size={34} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Matches Yet</Text>
            <Text style={styles.emptySubtitle}>Start swiping to find your match!</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start swiping"
              onPress={() => {}}
              style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
            >
              <Text style={styles.primaryCtaText}>Start Swiping</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  pressed: {
    opacity: 0.92,
  },
  stickyHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    gap: 6,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#111827',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },
  clearBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 28,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 14,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#f3f4f6',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryCta: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#db2777',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
  },
  matchInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#fce7f3',
    borderRadius: 12,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#be185d',
  },
  subRow: {
    fontSize: 13,
    color: '#6b7280',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  messageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
});
