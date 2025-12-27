/**
 * Adaptive grid component for mobile live room
 * 
 * Orientation-aware layout:
 * - Portrait: 3 columns × 4 rows (12 tiles)
 * - Landscape: 4 columns × 3 rows (12 tiles)
 * 
 * Always shows the full grid with empty placeholders when slots aren't filled.
 * 
 * Supports:
 * - Edit mode: Reorder tiles by dragging (UI-only, no streaming changes)
 * - Focus mode: Expand one tile, minimize others (UI-only, local audio muting)
 */

import React, { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { Tile } from './Tile';
import type { Participant, TileItem } from '../../types/live';
import type { Room } from 'livekit-client';
import { useThemeMode } from '../../contexts/ThemeContext';

interface Grid12Props {
  participants: Participant[];
  isEditMode: boolean;
  focusedIdentity: string | null;
  tileSlots: string[];
  room: Room | null;
  onLongPress: (identity: string) => void;
  onDoubleTap: (identity: string) => void;
  onExitEditMode: () => void;
  onExitFocus: () => void;
  onInitializeTileSlots: (identities: string[]) => void;
}

// Landscape: 4 cols × 3 rows | Portrait: 3 cols × 4 rows
const TOTAL_TILES = 12;

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
    // Use tileSlots order (reordered by user), preserving slot count.
    // If a slot identity isn't currently present, keep a placeholder at that slot.
    for (let idx = 0; idx < TOTAL_TILES; idx++) {
      const identity = tileSlots[idx];
      const participant = identity ? participantMap.get(identity) : undefined;
      if (participant) {
        items.push({
          id: participant.identity,
          participant,
          isAutofill: false,
        });
      } else {
        items.push({
          id: `slot-${idx}`,
          participant: null,
          isAutofill: true,
        });
      }
    }

    // Backfill empty slots with any remaining participants not in tileSlots.
    const used = new Set(items.filter(i => i.participant).map(i => i.participant!.identity));
    const remaining = participants.filter(p => !used.has(p.identity));
    let remainingIdx = 0;
    for (let i = 0; i < items.length && remainingIdx < remaining.length; i++) {
      if (!items[i].participant) {
        const p = remaining[remainingIdx++];
        items[i] = {
          id: p.identity,
          participant: p,
          isAutofill: false,
        };
      }
    }
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

  // Fill remaining with empty tiles (natural order path only)
  const remainingSlots = TOTAL_TILES - items.length;
  for (let i = 0; i < remainingSlots; i++) {
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
  room,
  onLongPress,
  onDoubleTap,
  onExitEditMode,
  onExitFocus,
  onInitializeTileSlots,
}) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { theme } = useThemeMode();
  
  // Grid dimensions based on orientation
  const gridCols = isLandscape ? 4 : 3;
  const gridRows = isLandscape ? 3 : 4;
  
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

  // Split into rows based on current orientation
  const rows = useMemo(() => {
    if (focusedIdentity) {
      // Focus mode: different layout (1 large tile)
      return null;
    }
    const result: TileItem[][] = [];
    for (let i = 0; i < gridRows; i++) {
      result.push(displayItems.slice(i * gridCols, (i + 1) * gridCols));
    }
    return result;
  }, [displayItems, focusedIdentity, gridRows, gridCols]);

  // Count active participants for display
  const activeCount = tileItems.filter(item => item.participant !== null).length;
  
  // How many minimized tiles to show at bottom in focus mode
  const maxMinimizedTiles = isLandscape ? 6 : 4;

  // Focus mode layout
  if (focusedIdentity) {
    const focusedItem = tileItems.find(
      item => item.participant?.identity === focusedIdentity
    );
    const otherItems = tileItems.filter(
      item => item.participant?.identity !== focusedIdentity && item.participant
    );

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Top bar - active count + exit button */}
        <View style={styles.focusTopBar}>
          <View style={styles.activeCountBadge}>
            <Text style={styles.activeCountText}>🔴 {activeCount} Live</Text>
          </View>
          <TouchableOpacity style={styles.exitFocusButton} onPress={onExitFocus}>
            <Text style={styles.exitFocusText}>⊞ Grid</Text>
          </TouchableOpacity>
        </View>

        {/* Focused tile (large) */}
        <View style={styles.focusedTileContainer}>
          {focusedItem && (
            <Tile
              item={focusedItem}
              isEditMode={false}
              isFocused={true}
              isMinimized={false}
              room={room}
              onDoubleTap={() => onDoubleTap(focusedItem.participant!.identity)}
            />
          )}
        </View>

        {/* Other tiles (minimized at bottom) - scrollable if many */}
        {otherItems.length > 0 && (
          <View style={[
            styles.minimizedTilesContainer,
            isLandscape && styles.minimizedTilesLandscape
          ]}>
            {otherItems.slice(0, maxMinimizedTiles).map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  styles.minimizedTileWrapper,
                  isLandscape && styles.minimizedTileWrapperLandscape
                ]}
                onPress={() => onDoubleTap(item.participant!.identity)}
                activeOpacity={0.8}
              >
                <Tile
                  item={item}
                  isEditMode={false}
                  isFocused={false}
                  isMinimized={true}
                  room={room}
                  onDoubleTap={() => onDoubleTap(item.participant!.identity)}
                />
              </TouchableOpacity>
            ))}
            {otherItems.length > maxMinimizedTiles && (
              <View style={styles.moreIndicator}>
                <Text style={styles.moreIndicatorText}>
                  +{otherItems.length - maxMinimizedTiles}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  // Normal grid layout
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
                room={room}
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
    backgroundColor: 'transparent',
    padding: 0, // CRITICAL: NO padding - cameras fill 100% of screen
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
  focusTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,  // Stays within grid container bounds
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  activeCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  focusedTileContainer: {
    flex: 1,
    padding: 4,
    marginTop: 44, // Account for top bar
  },
  minimizedTilesContainer: {
    flexDirection: 'row',
    height: 80,
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 4,
  },
  minimizedTilesLandscape: {
    height: 70,
  },
  minimizedTileWrapper: {
    flex: 1,
    maxWidth: 100,
  },
  minimizedTileWrapperLandscape: {
    maxWidth: 90,
  },
  moreIndicator: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginLeft: 4,
  },
  moreIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  exitFocusButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exitFocusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Grid info overlay - KEPT INSIDE GRID BOUNDS (not over side controls)
  gridInfoOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,  // Stays inside grid area, doesn't extend to side columns
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 100,
  },
  gridInfoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
});

