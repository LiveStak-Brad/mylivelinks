import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function TeamsInviteScreen() {
  const [query, setQuery] = useState('');

  const placeholderRows = useMemo(() => {
    // UI-only placeholders: these represent the “invite search results” layout.
    return Array.from({ length: 12 }).map((_, idx) => ({
      id: `placeholder-${idx + 1}`,
      invited: idx % 5 === 0,
    }));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={placeholderRows}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Invite to team</Text>
            <Text style={styles.subtitle}>Search people and send team invites.</Text>

            <View style={styles.searchWrap}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or @username"
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                style={styles.searchInput}
              />
              {query.trim().length > 0 ? (
                <Pressable
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={10}
                  style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.clearText}>×</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const disabled = item.invited;
          return (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.avatarPlaceholder} />
                <View style={styles.meta}>
                  <View style={styles.nameLine} />
                  <View style={styles.usernameLine} />
                </View>
              </View>

              <Pressable
                onPress={() => {}}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={disabled ? 'Invited' : 'Invite'}
                style={({ pressed }) => [
                  styles.inviteBtn,
                  disabled ? styles.inviteBtnDisabled : styles.inviteBtnEnabled,
                  pressed && !disabled && styles.pressed,
                ]}
              >
                <Text style={[styles.inviteBtnText, disabled ? styles.inviteBtnTextDisabled : styles.inviteBtnTextEnabled]}>
                  {disabled ? 'Invited' : 'Invite'}
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  header: {
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  searchWrap: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
    minHeight: 22,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearText: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: -1,
  },
  separator: {
    height: 10,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
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
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  nameLine: {
    height: 12,
    width: '62%',
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  usernameLine: {
    height: 10,
    width: '42%',
    borderRadius: 5,
    backgroundColor: '#F3F4F6',
  },
  inviteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtnEnabled: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  inviteBtnDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  inviteBtnTextEnabled: {
    color: '#FFFFFF',
  },
  inviteBtnTextDisabled: {
    color: '#6B7280',
  },
  pressed: {
    opacity: 0.92,
  },
});
