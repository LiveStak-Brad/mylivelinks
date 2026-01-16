import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMenus } from '../state/MenusContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../theme/useTheme';

export default function TopBar() {
  const navigation = useNavigation<any>();
  const menus = useMenus();
  const currentUser = useCurrentUser();
  const { colors } = useTheme();

  const label = currentUser.profile?.display_name || currentUser.profile?.username || 'You';
  const initial = String(label || 'U')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const avatarUrl = currentUser.profile?.avatar_url ? String(currentUser.profile.avatar_url) : null;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      edges={['top']}
    >
      <View style={styles.row}>
        {/* Hamburger menu */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open main menu"
          onPress={menus.openLeft}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="menu" size={22} color={colors.icon} />
        </Pressable>

        {/* Replay (popcorn icon) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Replay"
          onPress={() => navigation.navigate('ReplayScreen')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Text style={{ fontSize: 20 }}>🍿</Text>
        </Pressable>

        {/* Search bar */}
        <Pressable
          accessibilityRole="search"
          accessibilityLabel="Search MyLiveLinks"
          onPress={() => navigation.navigate('SearchScreen')}
          style={({ pressed }) => [
            styles.searchBar,
            { backgroundColor: colors.bg, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="search" size={18} color={colors.mutedText} />
          <Text style={[styles.searchPlaceholder, { color: colors.mutedText }]}>
            MyLiveLinks
          </Text>
        </Pressable>

        {/* RIGHT SIDE: Messages, Notifications, Profile avatar */}
        <View style={styles.rightGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Messages"
            onPress={() => navigation.navigate('MessagesScreen')}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.icon} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => navigation.navigate('NotiesScreen')}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.icon} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open profile menu (${label})`}
            onPress={menus.openRight}
            style={({ pressed }) => [styles.avatarMenuButton, pressed && styles.pressed]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.text }]}>
              {currentUser.loading ? (
                <Text style={[styles.avatarText, { color: colors.bg }]}>U</Text>
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.bg }]}>{initial || 'U'}</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={14} color={colors.icon} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    height: 56,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 14,
    fontWeight: '500',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  avatarMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 4,
    paddingRight: 2,
    height: 36,
    borderRadius: 999,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontWeight: '900',
    fontSize: 11,
  },
});
