/**
 * BattleScoreBar - Mobile version
 * Top bar showing scores, timer, and side colors for React Native
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BattleTeam } from '../../types/battle';

interface BattleScoreBarProps {
  teamA: BattleTeam;
  teamB: BattleTeam;
  remainingSeconds: number;
}

export const BattleScoreBar: React.FC<BattleScoreBarProps> = ({ 
  teamA, 
  teamB, 
  remainingSeconds 
}) => {
  const [timeDisplay, setTimeDisplay] = useState('0:00');

  useEffect(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    setTimeDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }, [remainingSeconds]);

  const totalScore = teamA.score + teamB.score;
  const teamAPercentage = totalScore > 0 ? (teamA.score / totalScore) * 100 : 50;
  const teamBPercentage = totalScore > 0 ? (teamB.score / totalScore) * 100 : 50;

  return (
    <View style={styles.container}>
      {/* Score Display */}
      <View style={styles.scoreRow}>
        {/* Team A Score */}
        <View style={styles.teamScore}>
          <View style={[styles.teamIndicator, { backgroundColor: teamA.color }]} />
          <Text style={styles.scoreText}>
            {teamA.score.toLocaleString()}
          </Text>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>TIME</Text>
          <Text style={styles.timerText}>{timeDisplay}</Text>
        </View>

        {/* Team B Score */}
        <View style={styles.teamScore}>
          <Text style={styles.scoreText}>
            {teamB.score.toLocaleString()}
          </Text>
          <View style={[styles.teamIndicator, { backgroundColor: teamB.color }]} />
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBarA,
            { backgroundColor: teamA.color, width: `${teamAPercentage}%` }
          ]} 
        />
        <View 
          style={[
            styles.progressBarB,
            { backgroundColor: teamB.color, width: `${teamBPercentage}%` }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scoreText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '600',
  },
  timerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressBarContainer: {
    height: 6,
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressBarA: {
    height: '100%',
  },
  progressBarB: {
    height: '100%',
  },
});

