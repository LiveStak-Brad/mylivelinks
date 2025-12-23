'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, Track, TrackPublication } from 'livekit-client';
import { createClient } from '@/lib/supabase';

interface UseLiveKitOptions {
  roomName: string;
  participantName: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  onTrackSubscribed?: (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => void;
  onTrackUnsubscribed?: (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => void;
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  enabled?: boolean;
}

export function useLiveKit({
  roomName,
  participantName,
  canPublish = false,
  canSubscribe = true,
  onTrackSubscribed,
  onTrackUnsubscribed,
  onParticipantConnected,
  onParticipantDisconnected,
  enabled = true,
}: UseLiveKitOptions) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const roomRef = useRef<Room | null>(null);
  const supabase = createClient();

  // Get LiveKit token
  const getToken = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantName,
          canPublish,
          canSubscribe,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get token');
      }

      const { token, url } = await response.json();
      return { token, url };
    } catch (err: any) {
      console.error('Error getting LiveKit token:', err);
      throw err;
    }
  }, [roomName, participantName, canPublish, canSubscribe, supabase]);

  // Connect to room
  const connect = useCallback(async () => {
    if (!enabled) return;
    if (roomRef.current?.state === 'connected') return;

    try {
      setError(null);
      const { token, url } = await getToken();

      // Import Room dynamically (client-side only)
      const { Room: LiveKitRoom } = await import('livekit-client');
      const newRoom = new LiveKitRoom({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event handlers
      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (onTrackSubscribed) {
          onTrackSubscribed(track, publication, participant);
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (onTrackUnsubscribed) {
          onTrackUnsubscribed(track, publication, participant);
        }
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        if (participant instanceof RemoteParticipant) {
          if (onParticipantConnected) {
            onParticipantConnected(participant);
          }
        }
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        if (participant instanceof RemoteParticipant) {
          if (onParticipantDisconnected) {
            onParticipantDisconnected(participant);
          }
        }
      });

      newRoom.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setRoom(newRoom);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setRoom(null);
      });

      // Connect to room
      await newRoom.connect(url, token);
      roomRef.current = newRoom;
      setRoom(newRoom);
    } catch (err: any) {
      console.error('Error connecting to LiveKit room:', err);
      setError(err);
      setIsConnected(false);
    }
  }, [enabled, getToken, onTrackSubscribed, onTrackUnsubscribed, onParticipantConnected, onParticipantDisconnected]);

  // Disconnect from room
  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auto-connect when enabled
  useEffect(() => {
    if (enabled && !isConnected && !roomRef.current) {
      connect();
    } else if (!enabled && roomRef.current) {
      disconnect();
    }
  }, [enabled, isConnected, connect, disconnect]);

  return {
    room,
    isConnected,
    error,
    connect,
    disconnect,
  };
}


