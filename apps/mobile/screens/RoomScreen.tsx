import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScaledSize } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface Participant {
  id: string;
}

interface GridConfig {
  rows: number;
  cols: number;
}

// ============================================================================
// GRID LAYOUT CALCULATOR
// ============================================================================

function getGridConfig(isLandscape: boolean): GridConfig {
  // Fixed 12-slot grid: 4x3 portrait, 3x4 landscape
  return isLandscape ? { rows: 3, cols: 4 } : { rows: 4, cols: 3 };
}

// ============================================================================
// VIDEO TILE COMPONENT
// ============================================================================

interface VideoTileProps {
  participant: Participant | null;
  width: number;
  height: number;
}

function VideoTile({ participant, width, height }: VideoTileProps) {
  // VideoTile - renders video if participant exists, otherwise empty slot
  return (
    <View style={[styles.tile, { width, height }]}>
      {/* Video placeholder - will be replaced with actual video component */}
      <View style={styles.tilePlaceholder} />
    </View>
  );
}

// ============================================================================
// GRID CONTAINER COMPONENT
// ============================================================================

interface GridContainerProps {
  participants: Participant[];
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
}

function GridContainer({ participants, screenWidth, screenHeight, isLandscape }: GridContainerProps) {
  const { rows, cols } = getGridConfig(isLandscape);
  const tileWidth = screenWidth / cols;
  const tileHeight = screenHeight / rows;

  // Build fixed 12-slot grid - empty slots render as placeholders
  const gridRows: React.ReactNode[] = [];
  let slotIndex = 0;

  for (let row = 0; row < rows; row++) {
    const rowTiles: React.ReactNode[] = [];
    for (let col = 0; col < cols; col++) {
      const participant = participants[slotIndex] || null;
      rowTiles.push(
        <VideoTile
          key={`slot-${slotIndex}`}
          participant={participant}
          width={tileWidth}
          height={tileHeight}
        />
      );
      slotIndex++;
    }
    gridRows.push(
      <View key={`row-${row}`} style={styles.gridRow}>
        {rowTiles}
      </View>
    );
  }

  return <View style={styles.gridContainer}>{gridRows}</View>;
}

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================

export default function RoomScreen() {
  // Track screen dimensions for orientation detection
  const [dimensions, setDimensions] = useState<ScaledSize>(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);

  const isLandscape = dimensions.width > dimensions.height;

  // Participant list - empty array for now, will be populated by actual data
  // This controls the grid size dynamically (1-12 participants)
  const [participants] = useState<Participant[]>([
    // Placeholder participants for testing grid layout
    // Remove or replace with actual participant data
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
  ]);

  return (
    <View style={styles.container}>
      <GridContainer
        participants={participants}
        screenWidth={dimensions.width}
        screenHeight={dimensions.height}
        isLandscape={isLandscape}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gridContainer: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
  },
  emptyGrid: {
    flex: 1,
    backgroundColor: '#000000',
  },
  tile: {
    overflow: 'hidden',
  },
  tilePlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
});
