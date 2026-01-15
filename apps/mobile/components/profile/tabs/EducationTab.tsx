import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type EducationItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  publishedAt: string;
};

interface EducationTabProps {
  profileId: string;
  colors: any;
  isOwnProfile?: boolean;
}

export default function EducationTab({ profileId, colors, isOwnProfile = false }: EducationTabProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<EducationItem[]>([]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API endpoint: GET /api/profile/:profileId/education
      // Will be implemented by web team
      setContent([]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load education content');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleItemPress = useCallback((item: EducationItem) => {
    navigation.navigate('LongFormPlayerScreen', {
      contentId: item.id,
      contentType: 'education',
      title: item.title,
    });
  }, [navigation]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedText} />
        <Text style={[styles.errorText, { color: colors.mutedText }]}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={fetchContent}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (content.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <View style={[styles.emptyIcon, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
          <Ionicons name="school-outline" size={32} color="#3B82F6" />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Education Content Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          {isOwnProfile ? 'Upload your first tutorial or course' : 'Tutorials and courses will appear here'}
        </Text>
        {isOwnProfile && (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'education' })}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Education</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={content}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => handleItemPress(item)}
          style={({ pressed }) => [
            styles.itemCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.itemThumb, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
            <Ionicons name="school" size={24} color="#3B82F6" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.itemMeta, { color: colors.mutedText }]}>
              {item.duration} • {item.category}
            </Text>
          </View>
          <Ionicons name="play-circle-outline" size={28} color={colors.mutedText} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EC4899',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  listContent: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 12,
    fontWeight: '500',
  },

  pressed: { opacity: 0.85 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
