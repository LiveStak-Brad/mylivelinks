import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';
import { LiveTVRailSkeleton } from './LiveTVRailSkeleton';

type Props<T> = {
  title: string;
  data: T[];
  loading?: boolean;
  itemWidth: number;
  renderItem: ({ item }: { item: T }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  emptyState?: React.ReactNode;
  contentContainerStyle?: object;
};

export function LiveTVHorizontalRail<T>({
  title,
  data,
  loading = false,
  itemWidth,
  renderItem,
  keyExtractor,
  emptyState,
  contentContainerStyle,
}: Props<T>) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {loading ? (
        <LiveTVRailSkeleton itemWidth={itemWidth} />
      ) : data.length === 0 ? (
        <View style={styles.emptyWrap}>{emptyState}</View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.railContent, contentContainerStyle]}
          windowSize={5}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
          getItemLayout={(_, index) => ({
            length: itemWidth,
            offset: itemWidth * index,
            index,
          })}
        />
      )}
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    section: {
      paddingTop: 6,
      paddingBottom: 4,
    },
    headerRow: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    railContent: {
      paddingHorizontal: 16,
      paddingRight: 24,
      gap: 12,
    },
    emptyWrap: {
      paddingHorizontal: 16,
    },
  });
}
