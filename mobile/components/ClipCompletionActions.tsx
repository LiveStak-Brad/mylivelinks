/**
 * ClipCompletionActions Component
 * Action buttons for clip completion/result screens
 * To be integrated wherever clips are completed
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

interface ClipCompletionActionsProps {
  clipId?: string;
  clipData?: {
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
  };
  onPostToFeed?: () => void | Promise<void>;
  onSave?: () => void | Promise<void>;
  onPostAndSave?: () => void | Promise<void>;
  onSendToComposer?: () => void | Promise<void>;
}

export function ClipCompletionActions({
  clipId,
  clipData,
  onPostToFeed,
  onSave,
  onPostAndSave,
  onSendToComposer,
}: ClipCompletionActionsProps) {
  const navigation = useNavigation<any>();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isPosting, setIsPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePostToFeed = async () => {
    if (onPostToFeed) {
      setIsPosting(true);
      try {
        await onPostToFeed();
      } finally {
        setIsPosting(false);
      }
    } else {
      // Default behavior: placeholder
      Alert.alert('Post to Feed', 'Post functionality coming soon');
    }
  };

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave();
      } finally {
        setIsSaving(false);
      }
    } else {
      // Default behavior: placeholder
      Alert.alert('Save', 'Save functionality coming soon');
    }
  };

  const handlePostAndSave = async () => {
    if (onPostAndSave) {
      setIsPosting(true);
      setIsSaving(true);
      try {
        await onPostAndSave();
      } finally {
        setIsPosting(false);
        setIsSaving(false);
      }
    } else {
      // Default behavior: placeholder
      Alert.alert('Post + Save', 'Post and save functionality coming soon');
    }
  };

  const handleSendToComposer = async () => {
    if (onSendToComposer) {
      try {
        await onSendToComposer();
      } catch (error) {
        Alert.alert('Error', 'Failed to send to composer');
      }
    } else {
      // Default behavior: navigate to composer
      try {
        navigation.navigate('ComposerEditor', {
          draftId: clipId || null,
          clipData: clipData || null,
        });
      } catch (error) {
        Alert.alert('Send to Composer', 'Opening composer...');
      }
    }
  };

  const isLoading = isPosting || isSaving;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What would you like to do?</Text>

      <View style={styles.actionsGrid}>
        {/* Post to Feed */}
        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
            isLoading && styles.actionCardDisabled,
          ]}
          onPress={handlePostToFeed}
          disabled={isLoading}
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
            {isPosting ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <Ionicons name="paper-plane" size={24} color="#8b5cf6" />
            )}
          </View>
          <Text style={styles.actionLabel}>Post to Feed</Text>
        </Pressable>

        {/* Save */}
        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
            isLoading && styles.actionCardDisabled,
          ]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#ec4899" />
            ) : (
              <Ionicons name="save" size={24} color="#ec4899" />
            )}
          </View>
          <Text style={styles.actionLabel}>Save</Text>
        </Pressable>

        {/* Post + Save */}
        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
            isLoading && styles.actionCardDisabled,
          ]}
          onPress={handlePostAndSave}
          disabled={isLoading}
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
            {isPosting && isSaving ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Ionicons name="checkmark-done" size={24} color="#6366f1" />
            )}
          </View>
          <Text style={styles.actionLabel}>Post + Save</Text>
        </Pressable>

        {/* Send to Composer */}
        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
            isLoading && styles.actionCardDisabled,
          ]}
          onPress={handleSendToComposer}
          disabled={isLoading}
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <Ionicons name="film" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.actionLabel}>Send to Composer</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      padding: 16,
      gap: 16,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    actionCard: {
      flex: 1,
      minWidth: '45%',
      alignItems: 'center',
      gap: 8,
      padding: 16,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
    },
    actionCardPressed: {
      backgroundColor: theme.colors.highlight,
    },
    actionCardDisabled: {
      opacity: 0.5,
    },
    actionIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
    },
  });
}

