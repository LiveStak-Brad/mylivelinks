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

    // CRITICAL: Clean up any existing tracks before creating new ones
    // This prevents "publishing a second track with the same source" errors
    if (room.localParticipant) {
      const existingTracks = Array.from(room.localParticipant.trackPublications.values())
        .filter(pub => {
          const source = pub.source;
          return (source === Track.Source.Camera || source === Track.Source.Microphone) && pub.track;
        })
        .map(pub => pub.track!);
      
      if (existingTracks.length > 0) {
        console.log('Cleaning up existing tracks before creating new ones:', existingTracks.length);
        for (const track of existingTracks) {
          try {
            if (track.sid) {
              await room.localParticipant.unpublishTrack(track);
            }
            track.stop();
            track.detach();
          } catch (err) {
            console.warn('Error cleaning up existing track:', err);
          }
        }
        // Clear tracksRef to ensure we start fresh
        tracksRef.current = [];
      }
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
          
          // CRITICAL: Publish tracks sequentially, not in parallel
          // This prevents race conditions and ensures each track is fully published before the next
          for (const track of tracks) {
            const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
            if (DEBUG_LIVEKIT) {
              console.log('[DEBUG] Publishing track:', {
                kind: track.kind,
                attempt: publishAttempts + 1,
                roomState: room.state,
                localParticipantSid: room.localParticipant.sid,
                trackSid: track.sid,
              });
            }
            console.log('Publishing track:', track.kind, `(attempt ${publishAttempts + 1})`);
            await room.localParticipant.publishTrack(track);
            
            // Wait a moment between tracks to ensure proper registration
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
          if (DEBUG_LIVEKIT) {
            const publishedTracks = Array.from(room.localParticipant.trackPublications.values())
              .filter(pub => {
                const source = pub.source;
                return (source === Track.Source.Camera || source === Track.Source.Microphone) && pub.track;
              })
              .map(pub => ({
                kind: pub.track?.kind,
                sid: pub.trackSid,
                source: pub.source,
                isSubscribed: pub.isSubscribed,
                hasTrack: !!pub.track,
              }));
            console.log('[DEBUG] Publishing complete, local tracks:', {
              publishedTracksCount: publishedTracks.length,
              publishedTracks,
              allPublicationsCount: room.localParticipant.trackPublications.size,
            });
          }
          
          // CRITICAL: Verify tracks are actually published before marking as publishing
          const verifiedPublishedTracks = Array.from(room.localParticipant.trackPublications.values())
            .filter(pub => {
              const source = pub.source;
              return (source === Track.Source.Camera || source === Track.Source.Microphone) && pub.track;
            });
          
          if (verifiedPublishedTracks.length === 0) {
            throw new Error('No tracks were published - verification failed');
          }
          
          console.log('Publishing verified:', {
            cameraTracks: verifiedPublishedTracks.filter(p => p.source === Track.Source.Camera).length,
            microphoneTracks: verifiedPublishedTracks.filter(p => p.source === Track.Source.Microphone).length,
          });
          
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
          // CRITICAL: Unpublish using actual published tracks from participant, not stale refs
          // This prevents "no publication was found" errors
          const publishedTracks = Array.from(participant.trackPublications.values())
            .filter(pub => {
              // Only unpublish camera/microphone tracks (not screen share, etc.)
              const source = pub.source;
              return (source === Track.Source.Camera || source === Track.Source.Microphone) && pub.track;
            })
            .map(pub => pub.track!);
          
          // Unpublish all camera/microphone tracks
          for (const track of publishedTracks) {
            try {
              if (!track.sid) {
                console.log('Track has no sid, skipping:', track.kind);
                continue;
              }
              const publication = participant.trackPublications.get(track.sid);
              if (publication) {
                await participant.unpublishTrack(track);
                console.log('Unpublished track:', track.kind);
              } else {
                // Track might already be unpublished, skip silently
                console.log('Track already unpublished:', track.kind);
              }
            } catch (err: any) {
              // Ignore "no publication found" errors - track might already be unpublished
              if (err?.message?.includes('no publication') || err?.message?.includes('not found')) {
                console.log('Track already unpublished (ignoring):', track.kind);
              } else {
                console.warn('Error unpublishing track:', err);
              }
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
  // Use refs and debouncing to prevent rapid toggling
  const enabledRef = useRef(enabled);
  const isPublishingStateRef = useRef(isPublishing);
  const toggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  
  useEffect(() => {
    isPublishingStateRef.current = isPublishing;
  }, [isPublishing]);
  
  useEffect(() => {
    // Clear any pending toggle
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
      toggleTimeoutRef.current = null;
    }

    // Debounce rapid toggles (wait 500ms before acting on changes)
    // Increased from 300ms to 500ms to better handle rapid state changes
    toggleTimeoutRef.current = setTimeout(() => {
      // CRITICAL: Check if we should be publishing but aren't
      // This handles the case where isLive becomes true before room connects
      if (enabledRef.current && isRoomConnected && room && room.state === 'connected' && !isPublishingStateRef.current) {
        console.log('Auto-starting publisher (enabled=true, room connected):', {
          enabled: enabledRef.current,
          isRoomConnected,
          roomState: room.state,
          isPublishing: isPublishingStateRef.current,
        });
        startPublishing().catch((err) => {
          console.error('Failed to start publishing:', err);
          setError(err);
        });
      } 
      // Only stop if disabled AND currently publishing (prevent rapid toggling)
      else if (!enabledRef.current && isPublishingStateRef.current) {
        console.log('Stopping publisher (enabled=false):', {
          enabled: enabledRef.current,
          isPublishing: isPublishingStateRef.current,
        });
        stopPublishing();
      }
      // If enabled but room not connected yet, log for debugging
      else if (enabledRef.current && (!isRoomConnected || !room || room.state !== 'connected')) {
        console.log('Publisher waiting for room connection:', {
          enabled: enabledRef.current,
          isRoomConnected,
          hasRoom: !!room,
          roomState: room?.state,
        });
      }
    }, 500); // 500ms debounce to prevent rapid toggling

    return () => {
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
        toggleTimeoutRef.current = null;
      }
    };
  }, [enabled, isRoomConnected, room, isPublishing, startPublishing, stopPublishing]);

  return {
    isPublishing,
    error,
    startPublishing,
    stopPublishing,
  };
}

