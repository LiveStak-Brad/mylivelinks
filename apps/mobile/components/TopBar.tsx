import React from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMenus } from '../state/MenusContext';

export default function TopBar() {
  const menus = useMenus();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open main menu"
          onPress={menus.openLeft}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="menu" size={22} color="#0F172A" />
        </Pressable>

        <View style={styles.logoWrap} accessibilityLabel="MyLiveLinks logo">
          <Image
            source={require('../assets/Brand/logotopbar.png')}
            style={styles.logoImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.searchWrap} accessibilityLabel="Search MyLiveLinks">
          <Ionicons name="search" size={16} color="#64748B" />
          <TextInput
            editable={false}
            pointerEvents="none"
            value=""
            placeholder="Search MyLiveLinks"
            placeholderTextColor="#64748B"
            style={styles.searchInput}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile menu"
          onPress={menus.openRight}
          style={({ pressed }) => [styles.avatarMenuButton, pressed && styles.pressed]}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>U</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#0F172A" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
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
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
});

