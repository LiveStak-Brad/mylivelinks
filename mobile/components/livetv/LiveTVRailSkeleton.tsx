import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

type Props = {
  itemWidth: number;
  itemHeight?: number;
  count?: number;
};

export function LiveTVRailSkeleton({ itemWidth, itemHeight = 210, count = 6 }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const data = useMemo(() => Array.from({ length: count }).map((_, i) => `skeleton-${i}`), [count]);

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      keyExtractor={(id) => id}
      contentContainerStyle={styles.content}
      renderItem={() => (
        <View style={[styles.card, { width: itemWidth, height: itemHeight }]} />
      )}
      windowSize={3}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      removeClippedSubviews
      getItemLayout={(_, index) => ({
        length: itemWidth,
        offset: itemWidth * index,
        index,
      })}
    />
  );
}

function createStyles(theme: ThemeDefinition) {
  const base = theme.mode === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.07)';

  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingRight: 24,
      gap: 12,
    },
    card: {
      borderRadius: 16,
      backgroundColor: base,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });
}
