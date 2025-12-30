/**
 * BattleTileGrid - Mobile video tile grid for battle participants
 * Displays 1-6 video tiles per side with dynamic grid layout
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { BattleParticipant, BattleSide } from '../../types/battle';
import { BattleTile } from './BattleTile';

interface BattleTileGridProps {
  participants: BattleParticipant[];
  side: BattleSide;
  sideColor: string;
}

export const BattleTileGrid: React.FC<BattleTileGridProps> = ({ 
  participants, 
  side, 
  sideColor 
}) => {
  // Determine grid layout based on participant count
  const getGridLayout = (count: number) => {
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 1, rows: 2 };
    if (count <= 4) return { cols: 2, rows: 2 };
    return { cols: 2, rows: 3 };
  };

  const layout = getGridLayout(participants.length);

  return (
    <View style={styles.container}>
      {participants.map((participant, index) => {
        const isTeamLeader = participant.is_team_leader || false;
        
        return (
          <View 
            key={participant.id} 
            style={[
              styles.tileWrapper,
              { 
                width: `${100 / layout.cols}%`,
                height: `${100 / layout.rows}%`
              }
            ]}
          >
            <BattleTile
              participant={participant}
              side={side}
              sideColor={sideColor}
              isTeamLeader={isTeamLeader}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#000',
    padding: 4,
  },
  tileWrapper: {
    padding: 2,
  },
});

