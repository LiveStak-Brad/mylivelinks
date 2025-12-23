'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, LocalTrack, createLocalTracks, Track } from 'livekit-client';
import { createClient } from '@/lib/supabase';

interface UseLiveKitPublisherOptions {
  roomName: string;
  participantName: string;
  enabled?: boolean;
  videoDeviceId?: string;
  audioDeviceId?: string;
  onPublished?: () => void;
  onUnpublished?: () => void;
  onError?: (error: Error) => void;
}

export function useLiveKitPublisher({
  roomName,
  participantName,
  enabled = false,
  videoDeviceId,
  audioDeviceId,
  onPublished,
  onUnpublished,
  onError,
}: UseLiveKitPublisherOptions) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const roomRef = useRef<Room | null>(null);
  const tracksRef = useRef<LocalTrack[]>([]);
  const supabase = createClient();

  // Get LiveKit token for publisher
  const getToken = useCallback(async () => {
    try {
      console.log('Getting token for:', { roomName, participantName });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth error:', authError);
        throw new Error('User not authenticated: ' + (authError?.message || 'No user'));
      }

      console.log('User authenticated:', { userId: user.id, email: user.email });

      // Get the session token to pass to the API
      // Try getSession first (faster), then getUser if needed
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
          canPublish: true,
          canSubscribe: false,
          userId: user.id, // Pass user ID for server-side verification
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        console.error('Token endpoint error:', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorData,
          responseText: errorText.substring(0, 200),
        });
        throw new Error(errorData.error || `Failed to get token (${response.status} ${response.statusText})`);
      }

      const responseData = await response.json();
      const { token, url } = responseData;
      
      console.log('Token received:', { 
        hasToken: !!token, 
        tokenLength: token?.length,
        url,
        urlLength: url?.length,
        fullResponse: responseData,
      });
      
      if (!token || !url) {
        console.error('Invalid token response:', { token: !!token, url: !!url, responseData });
        throw new Error('Invalid token response: missing token or URL');
      }
      
      // Validate token format (JWT should have 3 parts separated by dots)
      if (!token.includes('.') || token.split('.').length !== 3) {
        console.error('Invalid token format:', { tokenLength: token.length, tokenPrefix: token.substring(0, 50) });
        throw new Error('Invalid token format received from server');
      }
      
      return { token, url };
    } catch (err: any) {
      console.error('Error getting LiveKit token:', err);
      throw err;
    }
  }, [roomName, participantName, supabase]);

  // Start publishing
  const startPublishing = useCallback(async () => {
    // Allow manual start even if enabled is false (for fallback)
    if (roomRef.current?.state === 'connected' || roomRef.current?.state === 'connecting') {
      console.log('Already connected or connecting, skipping...');
      return;
    }

    try {
      setError(null);
      const { token, url } = await getToken();

      // Import Room and createLocalTracks dynamically
      const { Room: LiveKitRoom, createLocalTracks: createTracks } = await import('livekit-client');
      
      const newRoom = new LiveKitRoom({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event handlers
      newRoom.on(RoomEvent.Connected, async () => {
        setIsConnected(true);
        setRoom(newRoom);

        // Create and publish tracks
        try {
          console.log('Creating tracks with options:', {
            hasAudioDevice: !!audioDeviceId,
            hasVideoDevice: !!videoDeviceId,
          });

          const trackOptions: any = {
            audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
            video: videoDeviceId 
              ? { 
                  deviceId: { exact: videoDeviceId },
                  width: 1280,
                  height: 720,
                }
              : {
                  facingMode: 'user',
                  width: 1280,
                  height: 720,
                },
          };

          console.log('Requesting tracks...');
          const tracks = await createTracks(trackOptions);
          console.log('Tracks created:', { count: tracks.length, types: tracks.map(t => t.kind) });

          tracksRef.current = tracks;
          
          // Publish tracks
          console.log('Publishing tracks...');
          await Promise.all(tracks.map(track => {
            console.log('Publishing track:', track.kind);
            return newRoom.localParticipant.publishTrack(track);
          }));
          
          console.log('All tracks published successfully');
          setIsPublishing(true);
          if (onPublished) {
            onPublished();
          }
        } catch (err: any) {
          console.error('Error publishing tracks:', err);
          setError(err);
          if (onError) {
            onError(err);
          }
        }
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setIsPublishing(false);
        setRoom(null);
        if (onUnpublished) {
          onUnpublished();
        }
      });

      // Connect to room
      console.log('Connecting to MyLiveLinks room:', { 
        roomName, 
        url: url?.substring(0, 60) + '...',
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 30) + '...',
        urlStartsWith: url?.substring(0, 6), // Should be "wss://"
      });
      
      try {
        console.log('Attempting LiveKit connection...', {
          url: url?.substring(0, 60) + '...',
          roomName,
          tokenLength: token?.length,
          tokenPrefix: token?.substring(0, 30) + '...',
        });
        
        // Validate URL format before connecting
        if (!url || (!url.startsWith('wss://') && !url.startsWith('ws://'))) {
          throw new Error(`Invalid LiveKit URL format: ${url?.substring(0, 50)}. URL must start with wss:// or ws://`);
        }
        
        await newRoom.connect(url, token);
        console.log('Successfully connected to MyLiveLinks room');
      } catch (connectErr: any) {
        console.error('Room connection error:', {
          message: connectErr.message,
          code: connectErr.code,
          reason: connectErr.reason,
          url: url?.substring(0, 60),
          roomName,
          errorType: connectErr.constructor?.name,
          stack: connectErr.stack?.substring(0, 200),
        });
        
        // Provide more specific error messages
        let errorMessage = 'Failed to connect to room';
        if (connectErr.message) {
          errorMessage += `: ${connectErr.message}`;
        } else if (connectErr.reason) {
          errorMessage += `: ${connectErr.reason}`;
        } else {
          errorMessage += ': Could not establish signal connection';
        }
        
        // Add helpful hints based on error type
        if (connectErr.message?.includes('token') || connectErr.message?.includes('invalid')) {
          errorMessage += ' (The LiveKit token is invalid. Check Vercel environment variables match your LiveKit dashboard)';
        } else if (connectErr.message?.includes('network') || connectErr.message?.includes('timeout')) {
          errorMessage += ' (Check your internet connection)';
        } else if (connectErr.message?.includes('URL')) {
          errorMessage += ' (Check LIVEKIT_URL in Vercel environment variables)';
        }
        
        throw new Error(errorMessage);
      }
      
      roomRef.current = newRoom;
      setRoom(newRoom);
    } catch (err: any) {
      console.error('Error connecting to MyLiveLinks room:', err);
      setError(err);
      setIsConnected(false);
      setIsPublishing(false);
      if (onError) {
        onError(err);
      }
      // Re-throw so caller can handle it
      throw err;
    }
  }, [enabled, getToken, onPublished, onUnpublished, onError, roomName, videoDeviceId, audioDeviceId]);

  // Stop publishing
  const stopPublishing = useCallback(async () => {
    try {
      console.log('Stopping publishing...', {
        hasRoom: !!roomRef.current,
        tracksCount: tracksRef.current.length,
        roomState: roomRef.current?.state,
      });

      // Unpublish tracks from room first
      if (roomRef.current && roomRef.current.state === 'connected') {
        const participant = roomRef.current.localParticipant;
        if (participant) {
          // Unpublish tracks we published (use tracksRef to ensure we unpublish the right ones)
          for (const track of tracksRef.current) {
            try {
              await participant.unpublishTrack(track);
              console.log('Unpublished track:', track.kind);
            } catch (err) {
              console.warn('Error unpublishing track:', err);
            }
          }
        }
      }

      // Stop and detach tracks
      tracksRef.current.forEach(track => {
        try {
          track.stop();
          track.detach();
        } catch (err) {
          console.warn('Error stopping track:', err);
        }
      });
      tracksRef.current = [];

      // Disconnect from room
      if (roomRef.current) {
        try {
          await roomRef.current.disconnect();
          console.log('Disconnected from room');
        } catch (err) {
          console.warn('Error disconnecting from room:', err);
        }
        roomRef.current = null;
        setRoom(null);
        setIsConnected(false);
        setIsPublishing(false);
      }

      console.log('Stop publishing completed');
    } catch (err) {
      console.error('Error in stopPublishing:', err);
      // Reset state even if disconnect fails
      tracksRef.current = [];
      if (roomRef.current) {
        try {
          await roomRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setIsPublishing(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPublishing();
    };
  }, [stopPublishing]);

  // Auto-start when enabled
  useEffect(() => {
    if (enabled && !isConnected && !isPublishing) {
      console.log('Auto-starting publisher (enabled=true)...');
      startPublishing();
    } else if (!enabled && roomRef.current) {
      console.log('Stopping publisher (enabled=false)...');
      stopPublishing();
    }
  }, [enabled, isConnected, isPublishing, startPublishing, stopPublishing]);

  return {
    room,
    isConnected,
    isPublishing,
    error,
    startPublishing,
    stopPublishing,
  };
}

