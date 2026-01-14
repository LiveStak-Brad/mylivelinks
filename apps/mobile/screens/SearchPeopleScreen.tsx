import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type PersonResult = {
  id: string;
  name: string;
  username: string;
};

const MOCK_PEOPLE: PersonResult[] = [
  { id: '1', name: 'Samantha Lee', username: 'samanthalee' },
  { id: '2', name: 'Brad Morris', username: 'bradmorris' },
  { id: '3', name: 'Jordan Kim', username: 'jordankim' },
  { id: '4', name: 'Ava Patel', username: 'avapatel' },
  { id: '5', name: 'Diego Rivera', username: 'diegor' },
  { id: '6', name: 'Nina Chen', username: 'ninachen' },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase() || '•';
}

export default function SearchPeopleScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [followingIds, setFollowingIds] = useState<Record<string, boolean>>({});

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return MOCK_PEOPLE.filter((p) => {
      const name = p.name.toLowerCase();
      const username = p.username.toLowerCase();
      return name.includes(q) || username.includes(q) || `@${username}`.includes(q);
    });
  }, [query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Search People</Text>
        <Text style={styles.subtitle}>Find creators and friends by name or username.</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color="#6B7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or @username"
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.trim().length > 0 ? (
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
      </View>

      {query.trim().length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={44} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Start typing to search</Text>
          <Text style={styles.emptyText}>Try a name like “Samantha” or a username like “@jordankim”.</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={44} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptyText}>Try a different name or username.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const isFollowing = Boolean(followingIds[item.id]);
            return (
              <Pressable
                onPress={() => navigation.navigate('ProfileViewScreen' as never, { profileId: item.id } as never)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name} profile`}
                style={styles.row}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                  </View>
                  <View style={styles.nameBlock}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.username} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() =>
                    setFollowingIds((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                  accessibilityRole="button"
                  accessibilityLabel={isFollowing ? `Unfollow ${item.name}` : `Follow ${item.name}`}
                  style={[styles.followBtn, isFollowing && styles.followingBtn]}
                >
                  <Ionicons
                    name={isFollowing ? 'checkmark-outline' : 'person-add-outline'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.followBtnText}>{isFollowing ? 'Following' : 'Follow'}</Text>
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  clearBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  separator: {
    height: 10,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  username: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
  },
  followingBtn: {
    backgroundColor: '#6B7280',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
