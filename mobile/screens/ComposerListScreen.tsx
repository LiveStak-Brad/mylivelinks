/**
 * ComposerListScreen - Mobile
 * Displays list of draft projects/clips
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import type { ComposerDraft } from '../types/composer';
import { getAvatarSource } from '../lib/defaultAvatar';

export function ComposerListScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // TODO: Replace with actual API call to fetch drafts
  const [drafts, setDrafts] = useState<ComposerDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateNew = () => {
    navigation.navigate('ComposerEditor', { draftId: null });
  };

  const handleOpenDraft = (draft: ComposerDraft) => {
    navigation.navigate('ComposerEditor', { draftId: draft.id });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="film-outline" size={64} color={theme.colors.mutedText} />
      <Text style={styles.emptyTitle}>No drafts yet</Text>
      <Text style={styles.emptyText}>
        Create your first video project to get started
      </Text>
      <Pressable style={styles.createButton} onPress={handleCreateNew}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create New Project</Text>
      </Pressable>
    </View>
  );

  const renderDraftItem = ({ item }: { item: ComposerDraft }) => (
    <Pressable
      style={({ pressed }) => [
        styles.draftCard,
        pressed && styles.draftCardPressed,
      ]}
      onPress={() => handleOpenDraft(item)}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumbnail}
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="film-outline" size={32} color={theme.colors.mutedText} />
          </View>
        )}
        {item.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(item.duration)}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.draftInfo}>
        <Text style={styles.draftTitle} numberOfLines={2}>
          {item.title || 'Untitled Project'}
        </Text>
        <Text style={styles.draftCaption} numberOfLines={2}>
          {item.caption || 'No caption'}
        </Text>

        {/* Producer */}
        <View style={styles.producerRow}>
          <Image
            source={getAvatarSource(item.producer.avatarUrl)}
            style={styles.producerAvatar}
          />
          <Text style={styles.producerName} numberOfLines={1}>
            {item.producer.displayName || item.producer.username}
          </Text>
        </View>

        {/* Actors count */}
        {item.actors.length > 0 && (
          <View style={styles.actorsRow}>
            <Ionicons name="people-outline" size={14} color={theme.colors.mutedText} />
            <Text style={styles.actorsText}>
              {item.actors.length} {item.actors.length === 1 ? 'actor' : 'actors'}
            </Text>
          </View>
        )}

        <Text style={styles.draftDate}>
          Updated {formatDate(item.updatedAt)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedText} />
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading drafts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Composer</Text>
        <Pressable style={styles.addButton} onPress={handleCreateNew}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={drafts}
        renderItem={renderDraftItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.mutedText,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.cardSurface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#8b5cf6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      padding: 16,
      gap: 12,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 16,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.mutedText,
      textAlign: 'center',
      lineHeight: 20,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      marginTop: 16,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    draftCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    draftCardPressed: {
      backgroundColor: theme.colors.highlight,
    },
    thumbnailContainer: {
      position: 'relative',
    },
    thumbnail: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: theme.colors.cardAlt,
    },
    thumbnailPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: theme.colors.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    durationBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    durationText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#fff',
    },
    draftInfo: {
      flex: 1,
      gap: 4,
    },
    draftTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    draftCaption: {
      fontSize: 13,
      color: theme.colors.mutedText,
      lineHeight: 18,
    },
    producerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    producerAvatar: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#8b5cf6',
    },
    producerName: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    actorsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actorsText: {
      fontSize: 11,
      color: theme.colors.mutedText,
    },
    draftDate: {
      fontSize: 11,
      color: theme.colors.mutedText,
      marginTop: 2,
    },
  });
}



