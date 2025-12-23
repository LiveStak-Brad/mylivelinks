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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth error:', authError);
        throw new Error('User not authenticated: ' + (authError?.message || 'No user'));
      }

      console.log('User authenticated for viewer:', { userId: user.id, email: user.email });

      // Get the session token to pass to the API
      let session = null;
      let accessToken = null;
      
      try {
        const sessionResult = await supabase.auth.getSession();
        session = sessionResult.data?.session;
        accessToken = session?.access_token;
        
        console.log('Session check (getSession):', {
          hasSession: !!session,
          hasAccessToken: !!accessToken,
          error: sessionResult.error?.message,
        });
      } catch (err) {
        console.warn('getSession failed, trying getUser:', err);
      }

      // Fallback: if no session, try getUser (which might refresh the session)
      if (!session || !accessToken) {
        const userResult = await supabase.auth.getUser();
        if (userResult.data?.user) {
          // Try getSession again after getUser (might refresh)
          const retrySession = await supabase.auth.getSession();
          session = retrySession.data?.session;
          accessToken = session?.access_token;
          
          console.log('Session check (after getUser):', {
            hasSession: !!session,
            hasAccessToken: !!accessToken,
            userId: userResult.data.user.id,
          });
        }
      }

      if (!session || !accessToken) {
        const errorMsg = 'No active session found. Please log in first.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const headers: HeadersInit = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      };

      console.log('Requesting token with headers:', {
        hasAuth: !!headers['Authorization'],
        roomName,
        participantName,
      });

      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          roomName,
          participantName,
          canPublish,
          canSubscribe,
          userId: user.id, // Pass user ID for server-side verification
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Token endpoint error:', { status: response.status, error: errorData });
        throw new Error(errorData.error || `Failed to get token (${response.status})`);
      }

      const { token, url } = await response.json();
      console.log('Token received:', { hasToken: !!token, url });
      
      if (!token || !url) {
        throw new Error('Invalid token response: missing token or URL');
      }
      
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


