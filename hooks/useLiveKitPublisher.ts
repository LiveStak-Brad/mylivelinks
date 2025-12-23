'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, LocalTrack, createLocalTracks, Track } from 'livekit-client';

interface UseLiveKitPublisherOptions {
  room: Room | null; // Shared room connection (must already be connected)
  isRoomConnected: boolean; // Whether the shared room is connected
  enabled?: boolean;
  videoDeviceId?: string;
  audioDeviceId?: string;
  onPublished?: () => void;
  onUnpublished?: () => void;
  onError?: (error: Error) => void;
}

export function useLiveKitPublisher({
  room,
  isRoomConnected,
  enabled = false,
  videoDeviceId,
  audioDeviceId,
  onPublished,
  onUnpublished,
  onError,
}: UseLiveKitPublisherOptions) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const tracksRef = useRef<LocalTrack[]>([]);
  const isPublishingRef = useRef(false); // Track publishing state to prevent flashing
  const roomRef = useRef<Room | null>(null);

  // Update room ref when room prop changes
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Start publishing (creates tracks and publishes to shared room)
  const startPublishing = useCallback(async () => {
    // Must have a connected room
    if (!room || !isRoomConnected || room.state !== 'connected') {
      const err = new Error('Room not connected. Cannot publish.');
      setError(err);
      if (onError) {
        onError(err);
      }
      return;
    }

    // Already publishing?
    if (isPublishingRef.current) {
      console.log('Already publishing, skipping...');
      return;
    }

    try {
      setError(null);
      
      // Import createLocalTracks dynamically
      const { createLocalTracks: createTracks } = await import('livekit-client');

      // Wait a moment to ensure room is fully ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify room is still connected
      if (room.state !== 'connected') {
        throw new Error('Room disconnected before publishing could start');
      }

      // Create tracks
      console.log('Creating tracks with options:', {
        hasAudioDevice: !!audioDeviceId,
        hasVideoDevice: !!videoDeviceId,
        roomState: room.state,
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
      
      // Verify room is still connected before publishing
      if (room.state !== 'connected') {
        console.error('Room disconnected after creating tracks');
        // Clean up tracks
        tracks.forEach(track => {
          track.stop();
          track.detach();
        });
        tracksRef.current = [];
        throw new Error('Room disconnected before publishing');
      }
      
      // Publish tracks with retry logic
      console.log('Publishing tracks to shared room...', { roomState: room.state });
      let publishAttempts = 0;
      const maxPublishAttempts = 3;
      
      while (publishAttempts < maxPublishAttempts) {
        try {
          // Wait a bit longer if this is a retry
          if (publishAttempts > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * publishAttempts));
          }
          
          // Verify connection again
          if (room.state !== 'connected') {
            throw new Error('Room not connected');
          }
          
          await Promise.all(tracks.map(track => {
            console.log('Publishing track:', track.kind, `(attempt ${publishAttempts + 1})`);
            return room.localParticipant.publishTrack(track);
          }));
          
          console.log('All tracks published successfully');
          // Only update state if it actually changed
          if (!isPublishingRef.current) {
            isPublishingRef.current = true;
            setIsPublishing(true);
          }
          if (onPublished) {
            onPublished();
          }
          break; // Success, exit retry loop
        } catch (publishErr: any) {
          publishAttempts++;
          console.warn(`Publish attempt ${publishAttempts} failed:`, publishErr.message);
          
          if (publishAttempts >= maxPublishAttempts) {
            // All retries failed
            console.error('All publish attempts failed');
            // Clean up tracks
            tracks.forEach(track => {
              track.stop();
              track.detach();
            });
            tracksRef.current = [];
            setError(publishErr);
            if (onError) {
              onError(publishErr);
            }
          }
          // Otherwise, continue to next retry
        }
      }
    } catch (err: any) {
      console.error('Error publishing tracks:', err);
      setError(err);
      if (onError) {
        onError(err);
      }
    }
  }, [room, isRoomConnected, videoDeviceId, audioDeviceId, onPublished, onError]);

  // Stop publishing (unpublishes tracks but does NOT disconnect room)
  const stopPublishing = useCallback(async () => {
    try {
      console.log('Stopping publishing...', {
        hasRoom: !!room,
        tracksCount: tracksRef.current.length,
        roomState: room?.state,
      });

      // Unpublish tracks from room first (if room is still connected)
      if (room && room.state === 'connected') {
        const participant = room.localParticipant;
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

      // Update state (but do NOT disconnect room - it's shared)
      if (isPublishingRef.current) {
        isPublishingRef.current = false;
        setIsPublishing(false);
      }

      if (onUnpublished) {
        onUnpublished();
      }

      console.log('Stop publishing completed');
    } catch (err) {
      console.error('Error in stopPublishing:', err);
      // Reset state even if unpublish fails
      tracksRef.current = [];
      if (isPublishingRef.current) {
        isPublishingRef.current = false;
        setIsPublishing(false);
      }
    }
  }, [room, onUnpublished]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPublishing();
    };
  }, [stopPublishing]);

  // Auto-start when enabled and room is connected
  useEffect(() => {
    if (enabled && isRoomConnected && room && room.state === 'connected' && !isPublishing) {
      console.log('Auto-starting publisher (enabled=true, room connected)...');
      startPublishing();
    } else if (!enabled && isPublishing) {
      console.log('Stopping publisher (enabled=false)...');
      stopPublishing();
    }
  }, [enabled, isRoomConnected, room, isPublishing, startPublishing, stopPublishing]);

  return {
    isPublishing,
    error,
    startPublishing,
    stopPublishing,
  };
}

