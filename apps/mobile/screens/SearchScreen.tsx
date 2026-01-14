import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { supabase } from '../lib/supabase';

// Tabs matching web search (components/search/constants.ts)
type SearchTab = 'top' | 'people' | 'posts' | 'teams' | 'live';

interface TabDefinition {
  id: SearchTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PRIMARY_TABS: TabDefinition[] = [
  { id: 'top', label: 'Top', icon: 'sparkles' },
  { id: 'people', label: 'People', icon: 'people' },
  { id: 'posts', label: 'Posts', icon: 'newspaper' },
  { id: 'teams', label: 'Teams', icon: 'grid' },
  { id: 'live', label: 'Live', icon: 'radio' },
];

type FilterKey = 'verified' | 'online' | 'live' | 'following';
const FILTER_CHIPS: Array<{
  id: FilterKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'verified', label: 'Verified', icon: 'checkmark-circle' },
  { id: 'online', label: 'Online now', icon: 'flash' },
  { id: 'live', label: 'Live now', icon: 'radio' },
  { id: 'following', label: 'Following', icon: 'person' },
];

// Static suggested queries (matching web MOCK_SUGGESTED_QUERIES pattern)
const SUGGESTED_QUERIES = [
  'music',
  'gaming',
  'art',
  'fitness',
  'comedy',
  'live',
];

// Result types matching web lib/search.ts and types/search.ts
interface PersonResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_live: boolean;
  follower_count: number;
  is_mll_pro?: boolean;
}

interface PostResult {
  id: string;
  text_content: string;
  created_at: string;
  media_url: string | null;
  likes_count: number;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TeamResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  approved_member_count: number;
}

interface LiveResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_live: boolean;
}

interface SearchResults {
  people: PersonResult[];
  posts: PostResult[];
  teams: TeamResult[];
  live: LiveResult[];
}

function SectionHeader({
  title,
  rightActionLabel,
  onRightActionPress,
}: {
  title: string;
  rightActionLabel?: string;
  onRightActionPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rightActionLabel ? (
        <TouchableOpacity
          onPress={onRightActionPress}
          accessibilityRole="button"
          accessibilityLabel={rightActionLabel}
          style={styles.sectionActionBtn}
        >
          <Text style={styles.sectionActionText}>{rightActionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PillChip({
  label,
  icon,
  onPress,
  rightIcon,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.chip, !onPress && styles.chipDisabled]}
    >
      {icon ? <Ionicons name={icon} size={14} color="#6B7280" /> : null}
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
      {rightIcon ? <Ionicons name={rightIcon} size={14} color="#9CA3AF" /> : null}
    </TouchableOpacity>
  );
}

function ResultCard({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.resultCard}
      activeOpacity={0.92}
    >
      {children}
    </TouchableOpacity>
  );
}

function Avatar({
  text,
  variant = 'rounded',
  ring,
}: {
  text: string;
  variant?: 'rounded' | 'square';
  ring?: 'live' | 'none';
}) {
  const first = text.trim().slice(0, 2).toUpperCase() || '•';
  return (
    <View
      style={[
        styles.avatar,
        variant === 'square' && styles.avatarSquare,
        ring === 'live' && styles.avatarRingLive,
      ]}
    >
      <Text style={styles.avatarText}>{first}</Text>
    </View>
  );
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('top');
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    verified: false,
    online: false,
    live: false,
    following: false,
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResults>({ people: [], posts: [], teams: [], live: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const suggestedQueries = useMemo(() => SUGGESTED_QUERIES, []);

  // Direct Supabase queries matching web lib/search.ts fetchSearchResults()
  const performSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setResults({ people: [], posts: [], teams: [], live: [] });
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const likePattern = `%${trimmed.toLowerCase()}%`;

      // Parallel queries matching web lib/search.ts
      const [peopleRes, postsRes, teamsRes, liveRes] = await Promise.all([
        // People: profiles table (same as web)
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_live, follower_count, is_mll_pro')
          .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
          .order('follower_count', { ascending: false })
          .limit(10),
        // Posts: posts table with author join (same as web)
        supabase
          .from('posts')
          .select(`
            id,
            text_content,
            created_at,
            media_url,
            likes_count,
            author:profiles!posts_author_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .ilike('text_content', likePattern)
          .order('created_at', { ascending: false })
          .limit(10),
        // Teams: teams table (same as web)
        supabase
          .from('teams')
          .select('id, name, slug, description, icon_url, approved_member_count')
          .or(`name.ilike.${likePattern},description.ilike.${likePattern}`)
          .order('approved_member_count', { ascending: false })
          .limit(10),
        // Live: profiles where is_live=true (same as web)
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_live')
          .eq('is_live', true)
          .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
          .order('username')
          .limit(10),
      ]);

      setResults({
        people: (peopleRes.data as PersonResult[]) || [],
        posts: (postsRes.data as PostResult[]) || [],
        teams: (teamsRes.data as TeamResult[]) || [],
        live: (liveRes.data as LiveResult[]) || [],
      });
    } catch (err) {
      console.error('[SearchScreen] Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults({ people: [], posts: [], teams: [], live: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => [trimmed, ...prev.filter((x) => x !== trimmed)].slice(0, 10));
    performSearch(trimmed);
  }, [searchQuery, performSearch]);

  const handleSuggestionPress = useCallback((term: string) => {
    setSearchQuery(term);
    setRecentSearches((prev) => [term, ...prev.filter((x) => x !== term)].slice(0, 10));
    performSearch(term);
  }, [performSearch]);

  // Filter people based on active filters
  const filteredPeople = useMemo(() => {
    let filtered = results.people;
    if (filters.verified) {
      filtered = filtered.filter((p) => p.is_mll_pro);
    }
    if (filters.live) {
      filtered = filtered.filter((p) => p.is_live);
    }
    return filtered;
  }, [results.people, filters.verified, filters.live]);

  // Format follower count
  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search anything..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSubmit}
            />
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSubmit} accessibilityRole="button">
            <Ionicons name="search" size={20} color="#FFF" />
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.searchHint}>
          <Ionicons name="phone-portrait" size={14} color="#9CA3AF" /> Tap to search instantly
        </Text>

        <View style={styles.tabsContainer}>
          <View style={styles.tabRow}>
            {PRIMARY_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabPill, activeTab === tab.id && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={activeTab === tab.id ? '#FFF' : '#6B7280'}
                />
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filters (UI only) */}
        <View style={styles.filtersContainer}>
          {FILTER_CHIPS.map((chip) => {
            const selected = Boolean(filters[chip.id]);
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => setFilters((prev) => ({ ...prev, [chip.id]: !prev[chip.id] }))}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
              >
                <Ionicons name={chip.icon} size={14} color={selected ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]} numberOfLines={1}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent searches */}
        <View style={styles.section}>
          <SectionHeader
            title="Recent searches"
            rightActionLabel={recentSearches.length > 0 ? 'Clear' : undefined}
            onRightActionPress={() => setRecentSearches([])}
          />
          {recentSearches.length === 0 ? (
            <View style={styles.mutedBox}>
              <Ionicons name="time" size={18} color="#9CA3AF" />
              <Text style={styles.mutedBoxText}>No recent searches yet</Text>
            </View>
          ) : (
            <View style={styles.chipsWrap}>
              {recentSearches.map((term) => (
                <PillChip
                  key={term}
                  label={term}
                  icon="time"
                  rightIcon="close"
                  onPress={() => handleSuggestionPress(term)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Suggested (static queries) */}
        <View style={styles.section}>
          <SectionHeader title="Suggested" />
          <View style={styles.chipsWrap}>
            {suggestedQueries.map((term) => (
              <PillChip key={term} label={term} icon="sparkles" onPress={() => handleSuggestionPress(term)} />
            ))}
          </View>
        </View>

        {/* Results section */}
        <View style={styles.section}>
          <SectionHeader title={hasSearched ? 'Results' : 'Search'} />

          {/* Loading state */}
          {loading && (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.emptyDescription}>Searching...</Text>
            </View>
          )}

          {/* Error state */}
          {error && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.emptyTitle}>Search failed</Text>
              <Text style={styles.emptyDescription}>{error}</Text>
            </View>
          )}

          {/* Initial empty state */}
          {!hasSearched && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#8B5CF6" />
              <Text style={styles.emptyTitle}>Search anything</Text>
              <Text style={styles.emptyDescription}>
                People, posts, teams, live streams — one bar. Try "music" or "gaming".
              </Text>
            </View>
          )}

          {/* No results state - only when all categories are empty */}
          {hasSearched && !loading && !error && 
           filteredPeople.length === 0 && 
           results.posts.length === 0 && 
           results.teams.length === 0 && 
           results.live.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyDescription}>
                Try a different search term or adjust your filters.
              </Text>
            </View>
          )}

          {/* People results - direct Supabase query on profiles table */}
          {(activeTab === 'top' || activeTab === 'people') && filteredPeople.length > 0 && (
            <View style={styles.resultsGroup}>
              <View style={styles.resultsGroupHeader}>
                <Text style={styles.resultsGroupTitle}>People</Text>
                <Text style={styles.resultsGroupMeta}>{filteredPeople.length} found</Text>
              </View>
              {filteredPeople.map((person) => (
                <ResultCard
                  key={person.id}
                  accessibilityLabel={`Result: ${person.display_name || person.username}`}
                  onPress={() => {}}
                >
                  <View style={styles.resultRow}>
                    <Avatar text={person.display_name || person.username} ring={person.is_live ? 'live' : 'none'} />
                    <View style={styles.resultTextCol}>
                      <View style={styles.resultTitleRow}>
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {person.display_name || person.username}
                        </Text>
                        {person.is_mll_pro && (
                          <Ionicons name="checkmark-circle" size={14} color="#8B5CF6" />
                        )}
                        {person.is_live && (
                          <View style={styles.livePill}>
                            <View style={styles.liveDot} />
                            <Text style={styles.livePillText}>LIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.resultSubtitle} numberOfLines={1}>
                        @{person.username} • {formatCount(person.follower_count)} followers
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </ResultCard>
              ))}
            </View>
          )}

          {/* Posts results - direct Supabase query on posts table */}
          {(activeTab === 'top' || activeTab === 'posts') && results.posts.length > 0 && (
            <View style={styles.resultsGroup}>
              <View style={styles.resultsGroupHeader}>
                <Text style={styles.resultsGroupTitle}>Posts</Text>
                <Text style={styles.resultsGroupMeta}>{results.posts.length} found</Text>
              </View>
              {results.posts.map((post) => (
                <ResultCard key={post.id} accessibilityLabel={`Result: post by ${post.author?.display_name || post.author?.username || 'Unknown'}`} onPress={() => {}}>
                  <View style={styles.postCard}>
                    <View style={styles.postHeader}>
                      <Avatar text={post.author?.display_name || post.author?.username || '?'} />
                      <View style={styles.postHeaderText}>
                        <Text style={styles.postAuthor} numberOfLines={1}>
                          {post.author?.display_name || post.author?.username || 'Unknown'}
                        </Text>
                        <Text style={styles.postHandle} numberOfLines={1}>
                          @{post.author?.username || 'unknown'}
                        </Text>
                      </View>
                      {post.media_url ? (
                        <View style={styles.postMetaPill}>
                          <Ionicons name="images" size={14} color="#6B7280" />
                          <Text style={styles.postMetaPillText}>Media</Text>
                        </View>
                      ) : (
                        <View style={styles.postMetaPill}>
                          <Ionicons name="heart" size={14} color="#6B7280" />
                          <Text style={styles.postMetaPillText}>{post.likes_count}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postSnippet} numberOfLines={2}>
                      {post.text_content}
                    </Text>
                  </View>
                </ResultCard>
              ))}
            </View>
          )}

          {/* Teams results - direct Supabase query on teams table */}
          {(activeTab === 'top' || activeTab === 'teams') && results.teams.length > 0 && (
            <View style={styles.resultsGroup}>
              <View style={styles.resultsGroupHeader}>
                <Text style={styles.resultsGroupTitle}>Teams</Text>
                <Text style={styles.resultsGroupMeta}>{results.teams.length} found</Text>
              </View>
              {results.teams.map((team) => (
                <ResultCard key={team.id} accessibilityLabel={`Result: team ${team.name}`} onPress={() => {}}>
                  <View style={styles.resultRow}>
                    <Avatar text={team.name} variant="square" />
                    <View style={styles.resultTextCol}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {team.name}
                      </Text>
                      <Text style={styles.resultSubtitle} numberOfLines={1}>
                        {team.description || 'Community'} • {formatCount(team.approved_member_count)} members
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </ResultCard>
              ))}
            </View>
          )}

          {/* Live results - direct Supabase query on profiles where is_live=true */}
          {(activeTab === 'top' || activeTab === 'live') && results.live.length > 0 && (
            <View style={styles.resultsGroup}>
              <View style={styles.resultsGroupHeader}>
                <Text style={styles.resultsGroupTitle}>Live now</Text>
                <Text style={styles.resultsGroupMeta}>{results.live.length} streaming</Text>
              </View>
              {results.live.map((live) => (
                <ResultCard key={live.id} accessibilityLabel={`Result: live by ${live.display_name || live.username}`} onPress={() => {}}>
                  <View style={styles.resultRow}>
                    <Avatar text={live.display_name || live.username} ring="live" />
                    <View style={styles.resultTextCol}>
                      <View style={styles.resultTitleRow}>
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {live.display_name || live.username}
                        </Text>
                        <View style={styles.livePill}>
                          <View style={styles.liveDot} />
                          <Text style={styles.livePillText}>LIVE</Text>
                        </View>
                      </View>
                      <Text style={styles.resultSubtitle} numberOfLines={1}>
                        @{live.username}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </ResultCard>
              ))}
            </View>
          )}

          {/* Live tab with no live users */}
          {activeTab === 'live' && hasSearched && results.live.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="radio" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No one live right now</Text>
              <Text style={styles.emptyDescription}>
                Check back later or search for people.
              </Text>
            </View>
          )}
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
    padding: 16,
    paddingBottom: 28,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
    paddingLeft: 4,
  },
  tabsContainer: {
    gap: 8,
    marginBottom: 14,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  tabPillActive: {
    backgroundColor: '#8B5CF6',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#FFF',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  filterChipSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  chipDisabled: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    maxWidth: 230,
  },
  mutedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  mutedBoxText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  resultsGroup: {
    gap: 10,
    marginBottom: 14,
  },
  resultsGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  resultsGroupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  resultsGroupMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultTextCol: {
    flex: 1,
    minWidth: 0,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  resultSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  rightMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSquare: {
    borderRadius: 14,
  },
  avatarRingLive: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6B7280',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },
  livePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#991B1B',
    letterSpacing: 0.8,
  },
  postCard: {
    gap: 10,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  postHandle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  postMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  postMetaPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  postSnippet: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
    fontWeight: '600',
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.20)',
  },
  pageTextCol: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  pageSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
});
