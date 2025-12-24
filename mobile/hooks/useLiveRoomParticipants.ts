/**
 * PLACEHOLDER HOOK for streaming integration
 * This will be replaced with actual LiveKit logic later
 * Provides interface for streaming team to plug in
 */

import { useState, useEffect } from 'react';
import type { Participant } from '../types/live';

interface UseLiveRoomParticipantsReturn {
  participants: Participant[];
  myIdentity: string | null;
  isConnected: boolean;
  goLive: () => Promise<void>;
  stopLive: () => Promise<void>;
  tileCount: number;
}

/**
 * Placeholder hook - returns mock data for UI scaffolding
 * Streaming team will replace this with real LiveKit integration
 */
export function useLiveRoomParticipants(): UseLiveRoomParticipantsReturn {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myIdentity, setMyIdentity] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Mock data for UI development
  useEffect(() => {
    // Simulate some participants for testing
    const mockParticipants: Participant[] = [
      {
        identity: 'user1',
        username: 'Streamer1',
        isSpeaking: false,
        isCameraEnabled: true,
        isMicEnabled: true,
        isLocal: false,
        viewerCount: 42,
      },
      {
        identity: 'user2',
        username: 'Streamer2',
        isSpeaking: true,
        isCameraEnabled: true,
        isMicEnabled: true,
        isLocal: false,
        viewerCount: 18,
      },
    ];

    // Uncomment to test with mock data:
    // setParticipants(mockParticipants);
    // setIsConnected(true);
  }, []);

  const goLive = async () => {
    // TODO: Implement actual LiveKit connection
    console.log('[PLACEHOLDER] goLive called - will be implemented by streaming team');
    setIsConnected(true);
    setMyIdentity('local-user-' + Date.now());
  };

  const stopLive = async () => {
    // TODO: Implement actual LiveKit disconnection
    console.log('[PLACEHOLDER] stopLive called - will be implemented by streaming team');
    setIsConnected(false);
    setMyIdentity(null);
    setParticipants([]);
  };

  return {
    participants,
    myIdentity,
    isConnected,
    goLive,
    stopLive,
    tileCount: participants.length,
  };
}

