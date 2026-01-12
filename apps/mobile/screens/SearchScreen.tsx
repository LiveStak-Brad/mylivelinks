import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

type SearchTab = 'top' | 'people' | 'posts' | 'teams' | 'live' | 'media' | 'music' | 'videos' | 'more';

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
  { id: 'media', label: 'Media', icon: 'images' },
  { id: 'music', label: 'Music', icon: 'musical-notes' },
  { id: 'videos', label: 'Videos', icon: 'videocam' },
];

type FilterKey = 'verified' | 'online' | 'live' | 'following';
const FILTER_CHIPS: Array<{
  id: FilterKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'verified', label: 'Verified', icon: 'checkmark-seal' },
  { id: 'online', label: 'Online now', icon: 'flash' },
  { id: 'live', label: 'Live now', icon: 'radio' },
  { id: 'following', label: 'Following', icon: 'person' },
];

const MOCK_SUGGESTED_QUERIES = [
  'Verified creators in LA',
  'Upcoming music lives',
  'Teams for artists',
  'music',
  'gaming',
  'art',
  'fitness',
];

type MockPage = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type MockPerson = {
  id: string;
  name: string;
  handle: string;
  meta?: string;
  badge?: 'LIVE' | 'VERIFIED';
};

type MockPost = {
  id: string;
  authorName: string;
  authorHandle: string;
  snippet: string;
  meta: string;
  hasMedia?: boolean;
};

type MockTeam = {
  id: string;
  name: string;
  description: string;
  membersLabel: string;
};

type MockLive = {
  id: string;
  name: string;
  handle: string;
  title: string;
  meta: string;
};

const MOCK_PAGES: MockPage[] = [
  { id: 'teams', title: 'Teams', description: 'Browse and join teams', icon: 'grid' },
  { id: 'trending', title: 'Trending', description: 'Trending content', icon: 'trending-up' },
  { id: 'wallet', title: 'Wallet', description: 'Coins, diamonds, earnings', icon: 'wallet' },
];

const MOCK_PEOPLE: MockPerson[] = [
  { id: 'p1', name: 'Samantha Lee', handle: '@samanthalee', badge: 'VERIFIED' },
  { id: 'p2', name: 'Jordan Kim', handle: '@jordankim', meta: 'Creator • 24.1K followers' },
  { id: 'p3', name: 'Ava Patel', handle: '@avapatel', badge: 'LIVE', meta: 'Live now' },
];

const MOCK_POSTS: MockPost[] = [
  {
    id: 'post1',
    authorName: 'StreamQueen',
    authorHandle: '@streamqueen',
    snippet: 'Searching should feel intent-first. One bar for people, posts, teams, and live.',
    meta: 'Post',
  },
  {
    id: 'post2',
    authorName: 'Brad',
    authorHandle: '@brad',
    snippet: 'Try queries like “weekly live drops” or “verified in LA”.',
    meta: 'Post • Has media',
    hasMedia: true,
  },
];

const MOCK_TEAMS: MockTeam[] = [
  { id: 't1', name: 'Verified Hosts', description: 'Live creators + collabs', membersLabel: '19 members' },
  { id: 't2', name: 'Artists Collective', description: 'Share work • find commissions', membersLabel: '842 members' },
];

const MOCK_LIVE: MockLive[] = [
  { id: 'l1', name: 'Nova', handle: '@nova', title: 'Ranked grind', meta: '1.5K watching' },
  { id: 'l2', name: 'Kai', handle: '@kai', title: 'Acoustic set', meta: '321 watching' },
];

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
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'verified in LA',
    'weekly live drops',
    'teams for artists',
  ]);

  const suggestedQueries = useMemo(() => MOCK_SUGGESTED_QUERIES, []);

  const handleSubmit = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => [trimmed, ...prev.filter((x) => x !== trimmed)].slice(0, 10));
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
            {PRIMARY_TABS.slice(0, 4).map((tab) => (
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

          <View style={styles.tabRow}>
            {PRIMARY_TABS.slice(4).map((tab) => (
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
            <TouchableOpacity
              style={[styles.tabPill, activeTab === 'more' && styles.tabPillActive]}
              onPress={() => setActiveTab('more')}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={14}
                color={activeTab === 'more' ? '#FFF' : '#6B7280'}
              />
              <Text style={[styles.tabLabel, activeTab === 'more' && styles.tabLabelActive]}>
                More
              </Text>
            </TouchableOpacity>
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

        {/* Recent searches (web has Recents via GlobalSearchTrigger) */}
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
                  onPress={() => setSearchQuery(term)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Suggested (web has mock suggested queries) */}
        <View style={styles.section}>
          <SectionHeader title="Suggested" />
          <View style={styles.chipsWrap}>
            {suggestedQueries.map((term) => (
              <PillChip key={term} label={term} icon="sparkles" onPress={() => setSearchQuery(term)} />
            ))}
          </View>
        </View>

        {/* Mocked results area (UI only; matches web card/list intent) */}
        <View style={styles.section}>
          <SectionHeader title={searchQuery.trim() ? 'Results' : 'Top results'} />

          {!searchQuery.trim() ? (
            <View style={styles.emptyState}>
              <Ionicons name="sparkles" size={48} color="#8B5CF6" />
              <Text style={styles.emptyTitle}>Search anything</Text>
              <Text style={styles.emptyDescription}>
                People, posts, teams, live, Link — one bar. Try "weekly live drops" or "verified in LA".
              </Text>
            </View>
          ) : null}

          {(activeTab === 'top' || activeTab === 'people') && (
            <View style={styles.resultsGroup}>
              <View style={styles.resultsGroupHeader}>
                <Text style={styles.resultsGroupTitle}>People</Text>
                <Text style={styles.resultsGroupMeta}>Preview</Text>
              </View>
              {MOCK_PEOPLE.map((person) => (
                <ResultCard
                  key={person.id}
                  accessibilityLabel={`Result: ${person.name}`}
                  onPress={() => {}}
                >
                  <View style={styles.resultRow}>
                    <Avatar text={person.name} ring={person.badge === 'LIVE' ? 'live' : 'none'} />
                    <View style={styles.resultTextCol}>
                      <View style={styles.resultTitleRow}>
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {person.name}
                        </Text>
                        {person.badge === 'VERIFIED' ? (
                          <Ionicons name="checkmark-seal" size={14} color="#8B5CF6" />
                        ) : null}
                        {person.badge === 'LIVE' ? (
                          <View style={styles.livePill}>
                            <View style={styles.liveDot} />
                            <Text style={styles.livePillText}>LIVE</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.resultSubtitle} numberOfLines={1}>
                        {person.handle}
                        {person.meta ? ` • ${person.meta}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </ResultCard>
              ))}
            </View>
          )}

          {(activeTab === 'top' || activeTab === 'posts' || activeTab === 'media') && (
            <View style={styles.resultsGroup}>
              <View style={styles.resultsGroupHeader}>
                <Text style={styles.resultsGroupTitle}>Posts</Text>
                <Text style={styles.resultsGroupMeta}>Preview</Text>
              </View>
              {MOCK_POSTS.map((post) => (
                <ResultCard key={post.id} accessibilityLabel={`Result: post by ${post.authorName}`} onPress={() => {}}>
                  <View style={styles.postCard}>
                    <View style={styles.postHeader}>
                      <Avatar text={post.authorName} />
                      <View style={styles.postHeaderText}>
                        <Text style={styles.postAuthor} numberOfLines={1}>
                          {post.authorName}
                        </Text>
                        <Text style={styles.postHandle} numberOfLines={1}>
                          {post.authorHandle}
                        </Text>
                      </View>
                      {post.hasMedia ? (
                        <View style={styles.postMetaPill}>
                          <Ionicons name="images" size={14} color="#6B7280" />
                          <Text style={styles.postMetaPillText}>Media</Text>
                        </View>
                      ) : (
                        <View style={styles.postMetaPill}>
                          <Text style={styles.postMetaPillText}>{post.meta}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postSnippet} numberOfLines={2}>
                      {post.snippet}
                    </Text>
                  </View>
                </ResultCard>
              ))}
            </View>
          )}

          {(activeTab === 'top' || activeTab === 'teams') && (
            <View style={styles.resultsGroup}>
              <View style={styles.resultsGroupHeader}>
                <Text style={styles.resultsGroupTitle}>Teams</Text>
                <Text style={styles.resultsGroupMeta}>Preview</Text>
              </View>
              {MOCK_TEAMS.map((team) => (
                <ResultCard key={team.id} accessibilityLabel={`Result: team ${team.name}`} onPress={() => {}}>
                  <View style={styles.resultRow}>
                    <Avatar text={team.name} variant="square" />
                    <View style={styles.resultTextCol}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {team.name}
                      </Text>
                      <Text style={styles.resultSubtitle} numberOfLines={1}>
                        {team.description} • {team.membersLabel}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </ResultCard>
              ))}
            </View>
          )}

          {(activeTab === 'top' || activeTab === 'live') && (
            <View style={styles.resultsGroup}>
              <View style={styles.resultsGroupHeader}>
                <Text style={styles.resultsGroupTitle}>Live now</Text>
                <Text style={styles.resultsGroupMeta}>Preview</Text>
              </View>
              {MOCK_LIVE.map((live) => (
                <ResultCard key={live.id} accessibilityLabel={`Result: live by ${live.name}`} onPress={() => {}}>
                  <View style={styles.resultRow}>
                    <Avatar text={live.name} ring="live" />
                    <View style={styles.resultTextCol}>
                      <View style={styles.resultTitleRow}>
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {live.name}
                        </Text>
                        <View style={styles.livePill}>
                          <View style={styles.liveDot} />
                          <Text style={styles.livePillText}>LIVE</Text>
                        </View>
                      </View>
                      <Text style={styles.resultSubtitle} numberOfLines={1}>
                        {live.handle} • {live.title}
                      </Text>
                    </View>
                    <Text style={styles.rightMeta} numberOfLines={1}>
                      {live.meta}
                    </Text>
                  </View>
                </ResultCard>
              ))}
            </View>
          )}

          {activeTab === 'top' && (
            <View style={styles.resultsGroup}>
              <View style={styles.resultsGroupHeader}>
                <Text style={styles.resultsGroupTitle}>Pages</Text>
                <Text style={styles.resultsGroupMeta}>Quick access</Text>
              </View>
              {MOCK_PAGES.map((page) => (
                <ResultCard key={page.id} accessibilityLabel={`Page: ${page.title}`} onPress={() => {}}>
                  <View style={styles.pageRow}>
                    <View style={styles.pageIconWrap}>
                      <Ionicons name={page.icon} size={18} color="#8B5CF6" />
                    </View>
                    <View style={styles.pageTextCol}>
                      <Text style={styles.pageTitle} numberOfLines={1}>
                        {page.title}
                      </Text>
                      <Text style={styles.pageSubtitle} numberOfLines={1}>
                        {page.description}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />
                  </View>
                </ResultCard>
              ))}
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
