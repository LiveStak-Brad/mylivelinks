import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface MutualProfile {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  tags?: string[];
}

const PLACEHOLDER_MUTUALS: MutualProfile[] = [
  {
    id: '1',
    displayName: 'Sarah Johnson',
    username: 'sarahj',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    tags: ['Music', 'Travel', 'Photography'],
  },
  {
    id: '2',
    displayName: 'Mike Chen',
    username: 'mikechen',
    avatarUrl: 'https://i.pravatar.cc/150?img=2',
    tags: ['Gaming', 'Tech', 'Fitness'],
  },
  {
    id: '3',
    displayName: 'Emma Davis',
    username: 'emmad',
    avatarUrl: 'https://i.pravatar.cc/150?img=3',
    tags: ['Art', 'Design', 'Coffee'],
  },
];

export default function LinkMutualsScreen() {
  const [mutuals] = useState<MutualProfile[]>(PLACEHOLDER_MUTUALS);
  const [showEmpty] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Mutuals</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {showEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="link-outline" size={48} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Mutuals Yet</Text>
            <Text style={styles.emptyDescription}>
              Start swiping to build your network!
            </Text>
            <TouchableOpacity style={styles.startSwipingButton}>
              <Text style={styles.startSwipingButtonText}>Start Swiping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mutualsList}>
            {mutuals.map((mutual) => (
              <View key={mutual.id} style={styles.mutualCard}>
                <Image
                  source={{ uri: mutual.avatarUrl || 'https://i.pravatar.cc/150' }}
                  style={styles.avatar}
                />
                
                <View style={styles.mutualInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.displayName} numberOfLines={1}>
                      {mutual.displayName}
                    </Text>
                    <View style={styles.mutualBadge}>
                      <Text style={styles.mutualBadgeText}>Mutual</Text>
                    </View>
                  </View>
                  
                  {mutual.username && (
                    <Text style={styles.username}>@{mutual.username}</Text>
                  )}
                  
                  {mutual.tags && mutual.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {mutual.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.actionsContainer}>
                  <TouchableOpacity style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.messageButton}>
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#F3F4F6',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  startSwipingButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startSwipingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mutualsList: {
    gap: 12,
  },
  mutualCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
  },
  mutualInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  mutualBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
  },
  mutualBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  username: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
  },
  actionsContainer: {
    justifyContent: 'center',
    gap: 8,
    marginLeft: 12,
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});
