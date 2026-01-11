import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GRID_GAP = 2;
const ITEM_SIZE = (width - GRID_GAP * 4) / 3;

type TabType = 'all' | 'photos' | 'videos' | 'tagged';

export default function UserPhotosScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const tabs: Array<{ key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'all', label: 'Posts', icon: 'grid-outline' },
    { key: 'photos', label: 'Photos', icon: 'camera-outline' },
    { key: 'videos', label: 'Videos', icon: 'videocam-outline' },
    { key: 'tagged', label: 'Tagged', icon: 'pricetag-outline' },
  ];

  const getEmptyStateConfig = () => {
    switch (activeTab) {
      case 'photos':
        return {
          icon: 'camera-outline' as const,
          title: 'No photos yet',
          description: 'Photos will appear here when uploads are enabled.',
        };
      case 'videos':
        return {
          icon: 'videocam-outline' as const,
          title: 'No videos yet',
          description: 'Videos will appear here when uploads are enabled.',
        };
      case 'tagged':
        return {
          icon: 'pricetag-outline' as const,
          title: 'No tagged posts',
          description: 'Tagged posts will appear here.',
        };
      default:
        return {
          icon: 'grid-outline' as const,
          title: 'Nothing here yet',
          description: 'Uploads coming soon.',
        };
    }
  };

  const emptyState = getEmptyStateConfig();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.key ? '#000' : '#666'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 3-Column Grid */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.gridContainer}>
        {/* Empty State */}
        <View style={styles.emptyState}>
          <Ionicons name={emptyState.icon} size={64} color="#999" />
          <Text style={styles.emptyTitle}>{emptyState.title}</Text>
          <Text style={styles.emptyDescription}>{emptyState.description}</Text>
        </View>

        {/* Grid Placeholders (3 columns) */}
        {Array.from({ length: 12 }).map((_, index) => (
          <View key={index} style={styles.gridItem}>
            <View style={styles.placeholder}>
              <Ionicons
                name={index % 3 === 0 ? 'videocam-outline' : 'camera-outline'}
                size={32}
                color="#ccc"
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabLabelActive: {
    color: '#000',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: GRID_GAP,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: GRID_GAP / 2,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
