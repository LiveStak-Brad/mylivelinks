import React from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMenus } from '../state/MenusContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../theme/useTheme';

export default function TopBar() {
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
      edges={['top', 'left', 'right']}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open main menu"
          onPress={menus.openLeft}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="menu" size={22} color={colors.icon} />
        </Pressable>

        <View style={styles.logoWrap} accessibilityLabel="MyLiveLinks logo">
          <Image
            source={require('../assets/Brand/logotopbar.png')}
            style={styles.logoImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View
          style={[styles.searchWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}
          accessibilityLabel="Search MyLiveLinks"
        >
          <Ionicons name="search" size={16} color={colors.mutedText} />
          <TextInput
            editable={false}
            pointerEvents="none"
            value=""
            placeholder="Search MyLiveLinks"
            placeholderTextColor={colors.mutedText}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

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
          <Ionicons name="chevron-down" size={16} color={colors.icon} />
        </Pressable>
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
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
  },
  logoWrap: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 10,
    backgroundColor: 'transparent',
    width: 64,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  searchWrap: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    paddingHorizontal: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
  },
  avatarMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 2,
    height: 40,
    borderRadius: 999,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 13,
  },
});

