/**
 * 12-tile grid component (4 columns × 3 rows)
 * Landscape-first layout, stable mounting (never unmounts when overlays open)
 * 
 * Supports:
 * - Edit mode: Reorder tiles by dragging (UI-only, no streaming changes)
 * - Focus mode: Expand one tile, minimize others (UI-only, local audio muting)
 */

import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Tile } from './Tile';
import type { Participant, TileItem } from '../../types/live';

interface Grid12Props {
  participants: Participant[];
  isEditMode: boolean;
  focusedIdentity: string | null;
  tileSlots: string[];
  onLongPress: (identity: string) => void;
  onDoubleTap: (identity: string) => void;
  onExitEditMode: () => void;
  onExitFocus: () => void;
  onInitializeTileSlots: (identities: string[]) => void;
}

const GRID_COLS = 4;
const GRID_ROWS = 3;
const TOTAL_TILES = GRID_COLS * GRID_ROWS;

/**
 * Creates 12 tile items from participants, respecting tileSlots order
 * If tileSlots is empty, uses natural order
 * Fills remaining slots with autofill placeholders
 */
function createTileItems(
  participants: Participant[],
  tileSlots: string[]
): TileItem[] {
  const items: TileItem[] = [];
  const participantMap = new Map(participants.map(p => [p.identity, p]));

  if (tileSlots.length > 0) {
    // Use tileSlots order (reordered by user)
    tileSlots.forEach((identity, idx) => {
      if (idx < TOTAL_TILES) {
        const participant = participantMap.get(identity);
        if (participant) {
          items.push({
            id: participant.identity,
            participant,
            isAutofill: false,
          });
        }
      }
    });
  } else {
    // Natural order (no reordering yet)
    participants.forEach((p, idx) => {
      if (idx < TOTAL_TILES) {
        items.push({
          id: p.identity,
          participant: p,
          isAutofill: false,
        });
      }
    });
  }

  // Fill remaining with empty tiles
  const remaining = TOTAL_TILES - items.length;
  for (let i = 0; i < remaining; i++) {
    items.push({
      id: `empty-${i}`,
      participant: null,
      isAutofill: true,
    });
  }

  return items;
}

export const Grid12: React.FC<Grid12Props> = ({ 
  participants,
  isEditMode,
  focusedIdentity,
  tileSlots,
  onLongPress,
  onDoubleTap,
  onExitEditMode,
  onExitFocus,
  onInitializeTileSlots,
}) => {
  // Initialize tileSlots when participants change (only if empty)
  useEffect(() => {
    if (tileSlots.length === 0 && participants.length > 0) {
      const identities = participants.map(p => p.identity);
      onInitializeTileSlots(identities);
    }
  }, [participants, tileSlots.length, onInitializeTileSlots]);

  const tileItems = useMemo(
    () => createTileItems(participants, tileSlots),
    [participants, tileSlots]
  );

  // Focus mode: Show only focused tile (or all if no focus)
  const displayItems = useMemo(() => {
    if (focusedIdentity) {
      // In focus mode, show focused tile large and others minimized
      return tileItems;
    }
    return tileItems;
  }, [tileItems, focusedIdentity]);

  // Split into 3 rows of 4 (only in normal mode)
  const rows = useMemo(() => {
    if (focusedIdentity) {
      // Focus mode: different layout (1 large tile)
      return null;
    }
    const result: TileItem[][] = [];
    for (let i = 0; i < GRID_ROWS; i++) {
      result.push(displayItems.slice(i * GRID_COLS, (i + 1) * GRID_COLS));
    }
    return result;
  }, [displayItems, focusedIdentity]);

  // Focus mode layout
  if (focusedIdentity) {
    const focusedItem = tileItems.find(
      item => item.participant?.identity === focusedIdentity
    );
    const otherItems = tileItems.filter(
      item => item.participant?.identity !== focusedIdentity && item.participant
    );

    return (
      <View style={styles.container}>
        {/* Exit focus button */}
        <TouchableOpacity style={styles.exitFocusButton} onPress={onExitFocus}>
          <Text style={styles.exitFocusText}>✕</Text>
        </TouchableOpacity>

        {/* Focused tile (large) */}
        <View style={styles.focusedTileContainer}>
          {focusedItem && (
            <Tile
              item={focusedItem}
              isEditMode={false}
              isFocused={true}
              isMinimized={false}
              onDoubleTap={() => onDoubleTap(focusedItem.participant!.identity)}
            />
          )}
        </View>

        {/* Other tiles (minimized at bottom) */}
        <View style={styles.minimizedTilesContainer}>
          {otherItems.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.minimizedTileWrapper}>
              <Tile
                item={item}
                isEditMode={false}
                isFocused={false}
                isMinimized={true}
                onDoubleTap={() => onDoubleTap(item.participant!.identity)}
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Normal grid layout
  return (
    <View style={styles.container}>
      {/* Exit edit mode button */}
      {isEditMode && (
        <TouchableOpacity style={styles.exitEditButton} onPress={onExitEditMode}>
          <Text style={styles.exitEditText}>Done</Text>
        </TouchableOpacity>
      )}

      {rows && rows.map((row, rowIdx) => (
        <View key={`row-${rowIdx}`} style={styles.row}>
          {row.map((item) => (
            <View key={item.id} style={styles.tileWrapper}>
              <Tile
                item={item}
                isEditMode={isEditMode}
                isFocused={false}
                isMinimized={false}
                onLongPress={
                  item.participant
                    ? () => onLongPress(item.participant!.identity)
                    : undefined
                }
                onDoubleTap={
                  item.participant
                    ? () => onDoubleTap(item.participant!.identity)
                    : undefined
                }
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 8,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  tileWrapper: {
    flex: 1,
  },
  exitEditButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#4a9eff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1000,
  },
  exitEditText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  focusedTileContainer: {
    flex: 1,
    padding: 8,
  },
  minimizedTilesContainer: {
    flexDirection: 'row',
    height: 100,
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
  },
  minimizedTileWrapper: {
    flex: 1,
  },
  exitFocusButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  exitFocusText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

