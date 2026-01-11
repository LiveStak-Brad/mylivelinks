import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type TabId = 'info' | 'feed' | 'photos' | 'videos' | 'music' | 'events' | 'reels' | 'products';

interface Tab {
  id: TabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: Tab[] = [
  { id: 'info', label: 'Info', icon: 'information-circle-outline' },
  { id: 'feed', label: 'Feed', icon: 'grid-outline' },
  { id: 'photos', label: 'Photos', icon: 'image-outline' },
  { id: 'videos', label: 'Videos', icon: 'videocam-outline' },
  { id: 'reels', label: 'Reels', icon: 'film-outline' },
  { id: 'music', label: 'Music', icon: 'musical-notes-outline' },
  { id: 'events', label: 'Events', icon: 'calendar-outline' },
  { id: 'products', label: 'Products', icon: 'cart-outline' },
];

export default function PublicProfileScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleMessage = () => {
    console.log('Message pressed');
  };

  const handleShare = () => {
    console.log('Share pressed');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>About</Text>
              <Text style={styles.cardText}>Profile information and links will appear here.</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Links</Text>
              <Text style={styles.cardText}>User links will be displayed here.</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Stats</Text>
              <Text style={styles.cardText}>Profile statistics and achievements.</Text>
            </View>
          </View>
        );
      case 'feed':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Ionicons name="grid-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No posts yet</Text>
            </View>
          </View>
        );
      case 'photos':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Ionicons name="image-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No photos yet</Text>
            </View>
          </View>
        );
      case 'videos':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No videos yet</Text>
            </View>
          </View>
        );
      case 'reels':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Ionicons name="film-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No reels yet</Text>
            </View>
          </View>
        );
      case 'music':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No music tracks yet</Text>
            </View>
          </View>
        );
      case 'events':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No upcoming events</Text>
            </View>
          </View>
        );
      case 'products':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No products available</Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>U</Text>
            </View>
          </View>

          {/* Name & Username */}
          <Text style={styles.displayName}>User Display Name</Text>
          <View style={styles.usernameRow}>
            <Text style={styles.username}>@username</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Creator</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.locationText}>Location</Text>
          </View>

          {/* Bio */}
          <Text style={styles.bio}>
            This is a sample bio that describes the user's profile. It can contain multiple lines of text.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
            >
              <Ionicons
                name={isFollowing ? 'checkmark-outline' : 'person-add-outline'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.buttonText}>{isFollowing ? 'Following' : 'Follow'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleMessage}>
              <Ionicons name="chatbubble-outline" size={18} color="#374151" />
              <Text style={styles.secondaryButtonText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.iconButton]} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Counts Row */}
          <View style={styles.countsRow}>
            <TouchableOpacity style={styles.countItem}>
              <Text style={styles.countNumber}>1.2K</Text>
              <Text style={styles.countLabel}>Followers</Text>
            </TouchableOpacity>

            <View style={styles.countDivider} />

            <TouchableOpacity style={styles.countItem}>
              <Text style={styles.countNumber}>345</Text>
              <Text style={styles.countLabel}>Following</Text>
            </TouchableOpacity>

            <View style={styles.countDivider} />

            <TouchableOpacity style={styles.countItem}>
              <Text style={styles.countNumber}>89</Text>
              <Text style={styles.countLabel}>Friends</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs Row */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, isActive && styles.activeTab]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={20}
                    color={isActive ? '#8B5CF6' : '#6B7280'}
                  />
                  <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  username: {
    fontSize: 16,
    color: '#6B7280',
  },
  badge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  bio: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
  },
  followingButton: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  iconButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  countItem: {
    flex: 1,
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 2,
  },
  countLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  countDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#8B5CF6',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabLabel: {
    color: '#8B5CF6',
  },
  tabContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
});
