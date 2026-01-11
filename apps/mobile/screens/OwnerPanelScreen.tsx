import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type SectionTile = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  enabled: boolean;
  route?: string;
};

const OWNER_SECTIONS: SectionTile[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Platform overview & KPIs',
    icon: 'stats-chart',
    enabled: false,
  },
  {
    id: 'analytics',
    title: 'Analytics',
    subtitle: 'Deep dive into metrics',
    icon: 'analytics',
    enabled: false,
  },
  {
    id: 'live-ops',
    title: 'Live Ops',
    subtitle: 'Monitor active streams',
    icon: 'radio',
    enabled: false,
  },
  {
    id: 'revenue',
    title: 'Revenue',
    subtitle: 'Monetization & earnings',
    icon: 'cash',
    enabled: false,
  },
  {
    id: 'users',
    title: 'Users',
    subtitle: 'User management & profiles',
    icon: 'people',
    enabled: false,
  },
  {
    id: 'reports',
    title: 'Reports',
    subtitle: 'Moderation & user reports',
    icon: 'alert-circle',
    enabled: false,
  },
  {
    id: 'support',
    title: 'Support Inbox',
    subtitle: 'Linkler & support tickets',
    icon: 'chatbubbles',
    enabled: false,
  },
  {
    id: 'referrals',
    title: 'Referrals',
    subtitle: 'Referral program analytics',
    icon: 'share-social',
    enabled: false,
  },
  {
    id: 'feature-flags',
    title: 'Feature Flags',
    subtitle: 'Toggle platform features',
    icon: 'toggle',
    enabled: false,
  },
  {
    id: 'roles',
    title: 'Roles & Permissions',
    subtitle: 'RBAC management',
    icon: 'shield-checkmark',
    enabled: false,
  },
  {
    id: 'rooms',
    title: 'Rooms',
    subtitle: 'Room templates & config',
    icon: 'grid',
    enabled: false,
  },
  {
    id: 'templates',
    title: 'Templates',
    subtitle: 'Stream templates',
    icon: 'copy',
    enabled: false,
  },
  {
    id: 'mll-pro-applications',
    title: 'MLL Pro Applications',
    subtitle: 'Review creator applications',
    icon: 'document-text',
    enabled: false,
  },
  {
    id: 'waitlist-mobile',
    title: 'Mobile Waitlist',
    subtitle: 'Mobile app waitlist',
    icon: 'phone-portrait',
    enabled: false,
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Platform configuration',
    icon: 'settings',
    enabled: false,
  },
];

export default function OwnerPanelScreen() {
  const handleTilePress = (tile: SectionTile) => {
    if (!tile.enabled) {
      return;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Owner Panel</Text>
          <Text style={styles.headerSubtitle}>Mission Control</Text>
        </View>

        {/* Section Tiles Grid */}
        <View style={styles.grid}>
          {OWNER_SECTIONS.map((tile) => (
            <TouchableOpacity
              key={tile.id}
              style={[styles.tile, !tile.enabled && styles.tileDisabled]}
              onPress={() => handleTilePress(tile)}
              activeOpacity={tile.enabled ? 0.7 : 1}
              disabled={!tile.enabled}
            >
              <View style={styles.tileIconContainer}>
                <Ionicons
                  name={tile.icon}
                  size={28}
                  color={tile.enabled ? '#ec4899' : '#9ca3af'}
                />
              </View>
              <View style={styles.tileContent}>
                <Text style={[styles.tileTitle, !tile.enabled && styles.tileTextDisabled]}>
                  {tile.title}
                </Text>
                <Text style={[styles.tileSubtitle, !tile.enabled && styles.tileTextDisabled]}>
                  {tile.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  grid: {
    gap: 12,
  },
  tile: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tileDisabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.7,
  },
  tileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tileContent: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  tileSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  tileTextDisabled: {
    color: '#9ca3af',
  },
});

