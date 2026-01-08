'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, LocalTrack, createLocalTracks, Track } from 'livekit-client';
import { DEBUG_LIVEKIT } from '@/lib/livekit-constants';

interface UseLiveKitPublisherOptions {
  room: Room | null; // Shared room connection (must already be connected)
  isRoomConnected: boolean; // Whether the shared room is connected
  enabled?: boolean;
  videoDeviceId?: string;
  audioDeviceId?: string;
  isScreenShare?: boolean; // Whether to use screen share instead of camera
  screenShareStream?: MediaStream | null; // Pre-captured screen share stream
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
  isScreenShare = false,
  screenShareStream = null,
  onPublished,
  onUnpublished,
  onError,
}: UseLiveKitPublisherOptions) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const tracksRef = useRef<LocalTrack[]>([]);
  const isPublishingRef = useRef(false); // Track publishing state to prevent flashing
  const isStartingRef = useRef(false); // Prevent concurrent startPublishing calls (manual + auto)
  const roomRef = useRef<Room | null>(null);

  // Update room ref when room prop changes
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Start publishing (creates tracks and publishes to shared room)
  const startPublishing = useCallback(async (reason: string = 'unknown') => {
    console.log('🎥 [PUBLISH] startPublishing called', {
      reason,
      hasRoom: !!room,
      isRoomConnected,
      roomState: room?.state,
      enabled,
      videoDeviceId,
      audioDeviceId,
    });
    
    if (DEBUG_LIVEKIT) {
      console.log('[PUBLISH] GoLive clicked', {
        reason,
        roomConnected: isRoomConnected,
        roomState: room?.state,
      });
    }
    
    // Must have a connected room
    if (!room || !isRoomConnected || room.state !== 'connected') {
      const err = new Error('Room not connected. Cannot publish.');
      console.error('❌ [PUBLISH] BLOCKED - Room not ready', {
        hasRoom: !!room,
        isRoomConnected,
        roomState: room?.state,
        reason: !room ? 'No room object' : !isRoomConnected ? 'isRoomConnected=false' : 'Room state not connected',
      });
      
      if (DEBUG_LIVEKIT) {
        console.log('[PUBLISH] start requested', {
          reason,
          enabledState: 'room not connected',
          live_available: 'unknown',
          watcherCount: 'unknown',
          blocked: true,
        });
      }
      setError(err);
      if (onError) {
        onError(err);
      }
      return;
    }

    // Already publishing?
    if (isPublishingRef.current) {
      if (DEBUG_LIVEKIT) {
        console.log('[PUBLISH] start requested', {
          reason,
          enabledState: 'already publishing',
          live_available: 'unknown',
          watcherCount: 'unknown',
          blocked: true,
        });
      }
      console.log('Already publishing, skipping...');
      return;
    }

    // Prevent concurrent starts (manual start + enabled auto-start can overlap)
    if (isStartingRef.current) {
      if (DEBUG_LIVEKIT) {
        console.log('[PUBLISH] start requested', {
          reason,
          enabledState: 'start already in progress',
          blocked: true,
        });
      }
      console.log('Start already in progress, skipping...');
      return;
    }

    isStartingRef.current = true;
    
    if (DEBUG_LIVEKIT) {
      console.log('[PUBLISH] start requested', {
        reason,
        enabledState: 'proceeding',
        live_available: 'unknown', // Would need to pass this
        watcherCount: 'unknown', // Would need to pass this
        blocked: false,
      });
    }

    // CRITICAL: Clean up any existing publications before creating new ones
    // IMPORTANT: LocalTrack.sid is often undefined; unpublish by publication.track instead.
    if (room.localParticipant) {
      const existingPublications = Array.from(room.localParticipant.trackPublications.values()).filter((pub) => {
        const source = pub.source;
        return (
          (source === Track.Source.Camera ||
            source === Track.Source.Microphone ||
            source === Track.Source.ScreenShare ||
            source === Track.Source.ScreenShareAudio) &&
          !!pub.track
        );
      });

      if (existingPublications.length > 0) {
        console.log('Cleaning up existing tracks before creating new ones:', existingPublications.length);
        for (const pub of existingPublications) {
          const track = pub.track!;
          try {
            await room.localParticipant.unpublishTrack(track);
          } catch (err) {
            console.warn('Error unpublishing existing track:', err);
          }
          try {
            track.stop();
            track.detach();
          } catch (err) {
            console.warn('Error stopping existing track:', err);
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

      let tracks: LocalTrack[];

      if (isScreenShare && screenShareStream) {
        // Use screen share stream
        console.log('Using screen share stream...');
        const { LocalVideoTrack, LocalAudioTrack } = await import('livekit-client');
        
        const videoTrack = screenShareStream.getVideoTracks()[0];
        const audioTrack = screenShareStream.getAudioTracks()[0];
        
        tracks = [];
        
        if (videoTrack) {
          // Create a LocalVideoTrack from the screen share video track
          const localVideoTrack = new LocalVideoTrack(videoTrack, undefined, false);
          localVideoTrack.source = Track.Source.ScreenShare;
          tracks.push(localVideoTrack);
        }
        
        if (audioTrack) {
          // If screen share has audio, use it
          const localAudioTrack = new LocalAudioTrack(audioTrack, undefined, false);
          localAudioTrack.source = Track.Source.ScreenShareAudio;
          tracks.push(localAudioTrack);
        } else if (audioDeviceId) {
          // Fallback to microphone for audio
          // MOBILE FIX: Use 'ideal' instead of 'exact' for deviceId
          console.log('Screen share has no audio, using microphone...');
          const audioTracks = await createTracks({
            audio: {
              deviceId: { ideal: audioDeviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 1,
            },
            video: false,
          });
          tracks.push(...audioTracks);
        }
        
        console.log('Screen share tracks created:', { count: tracks.length, types: tracks.map(t => t.kind) });
      } else {
        // Use camera
        // MOBILE FIX: Use 'ideal' instead of 'exact' for deviceId to prevent failures
        // when device IDs change (common on mobile devices)
        const trackOptions: any = {
          audio: audioDeviceId ? { 
            deviceId: { ideal: audioDeviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          } : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
          video: videoDeviceId 
            ? { 
                deviceId: { ideal: videoDeviceId },
              }
            : {
                facingMode: 'user' as const,
              },
        };

        console.log('Requesting camera tracks with options:', { 
          hasAudio: !!trackOptions.audio, 
          hasVideo: !!trackOptions.video,
          audioDeviceId,
          videoDeviceId,
        });
        
        try {
          tracks = await createTracks(trackOptions);
          console.log('Camera tracks created:', { count: tracks.length, types: tracks.map(t => t.kind) });
        } catch (trackError: any) {
          console.error('Error creating tracks with device IDs, trying fallback:', trackError);
          // Fallback: try without specific device IDs
          const fallbackOptions = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: {
              facingMode: 'user' as const,
            },
          };
          tracks = await createTracks(fallbackOptions);
          console.log('Fallback tracks created:', { count: tracks.length, types: tracks.map(t => t.kind) });
        }
      }

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
            if (DEBUG_LIVEKIT) {
              console.log('[PUBLISH] Publishing track', {
                kind: track.kind,
                attempt: publishAttempts + 1,
                roomState: room.state,
                localParticipantSid: room.localParticipant.sid,
                trackSid: track.sid,
              });
            }
            console.log('Publishing track:', track.kind, `(attempt ${publishAttempts + 1})`);
            
            // Add quality settings for each track type
            const publishOptions: any = {};
            
            if (track.kind === 'video') {
              publishOptions.videoEncoding = {
                maxBitrate: 2_500_000, // 2.5 Mbps max for HD quality
                maxFramerate: 30,
              };
              publishOptions.simulcast = true; // Enable simulcast for adaptive quality
            } else if (track.kind === 'audio') {
              publishOptions.audioEncoding = {
                maxBitrate: 64_000, // 64 kbps for audio
              };
            }
            
            await room.localParticipant.publishTrack(track, publishOptions);
            
            // Wait a moment between tracks to ensure proper registration
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          if (DEBUG_LIVEKIT) {
            const publishedTracks = Array.from(room.localParticipant.trackPublications.values())
              .filter(pub => {
                const source = pub.source;
                return (
                  (source === Track.Source.Camera ||
                    source === Track.Source.Microphone ||
                    source === Track.Source.ScreenShare ||
                    source === Track.Source.ScreenShareAudio) &&
                  pub.track
                );
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
          const verifiedPublishedTracks = Array.from(room.localParticipant.trackPublications.values()).filter(
            (pub) =>
              !!pub.track &&
              (pub.source === Track.Source.Camera ||
                pub.source === Track.Source.Microphone ||
                pub.source === Track.Source.ScreenShare ||
                pub.source === Track.Source.ScreenShareAudio)
          );
          
          if (verifiedPublishedTracks.length === 0) {
            throw new Error('No tracks were published - verification failed');
          }
          
          const videoCount = verifiedPublishedTracks.filter(p => p.source === Track.Source.Camera).length;
          const audioCount = verifiedPublishedTracks.filter(p => p.source === Track.Source.Microphone).length;
          const screenVideoCount = verifiedPublishedTracks.filter(p => p.source === Track.Source.ScreenShare).length;
          const screenAudioCount = verifiedPublishedTracks.filter(p => p.source === Track.Source.ScreenShareAudio).length;

          if (DEBUG_LIVEKIT) {
            const cameraPublications = Array.from(room.localParticipant.trackPublications.values())
              .filter(pub => pub.source === Track.Source.Camera)
              .map(pub => ({
                publicationSid: pub.trackSid,
                trackSid: pub.track?.sid,
                hasTrack: !!pub.track,
                kind: pub.kind,
                isMuted: pub.isMuted,
              }));
            console.log('[PUBLISH-AUDIT] local_camera_publish_state', {
              localParticipantSid: room.localParticipant.sid,
              localParticipantIdentity: room.localParticipant.identity,
              canPublish: room.localParticipant.permissions?.canPublish,
              cameraPublicationsCount: cameraPublications.length,
              cameraPublications,
              cameraTrackPublished: cameraPublications.some(p => p.hasTrack && !!p.publicationSid),
            });
          }
          
          console.log('Publishing verified:', {
            cameraTracks: videoCount,
            microphoneTracks: audioCount,
            screenShareTracks: screenVideoCount,
            screenShareAudioTracks: screenAudioCount,
          });
          
          if (DEBUG_LIVEKIT) {
            console.log('[PUBLISH] after publish pubs:', {
              video: videoCount,
              audio: audioCount,
              total: verifiedPublishedTracks.length,
            });
          }
          
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
    } finally {
      isStartingRef.current = false;
    }
  }, [room, isRoomConnected, videoDeviceId, audioDeviceId, isScreenShare, screenShareStream, onPublished, onError]);

  // Stop publishing (unpublishes tracks but does NOT disconnect room)
  // CRITICAL: This should ONLY be called from explicit user actions:
  // - User clicks "Stop Live" button
  // - User closes their own box
  // - Component unmounts (navigate away)
  const stopPublishing = useCallback(async () => {
    const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
    
    // Mark that user explicitly stopped (prevents auto-restart)
    userExplicitlyStoppedRef.current = true;
    
    try {
      if (DEBUG_LIVEKIT) {
        console.log('[PUBLISH] Stopping publishing', {
          reason: 'explicit user action',
          hasRoom: !!room,
          tracksCount: tracksRef.current.length,
          roomState: room?.state,
        });
      }
      console.log('Stopping publishing (explicit user action)...', {
        hasRoom: !!room,
        tracksCount: tracksRef.current.length,
        roomState: room?.state,
      });

      // Unpublish tracks from room first (if room is still connected)
      if (room && room.state === 'connected') {
        const participant = room.localParticipant;
        if (participant) {
          const publications = Array.from(participant.trackPublications.values()).filter((pub) => {
            const source = pub.source;
            return (
              (source === Track.Source.Camera ||
                source === Track.Source.Microphone ||
                source === Track.Source.ScreenShare ||
                source === Track.Source.ScreenShareAudio) &&
              !!pub.track
            );
          });

          for (const pub of publications) {
            const track = pub.track!;
            try {
              await participant.unpublishTrack(track);
              console.log('Unpublished track:', { kind: track.kind, source: pub.source, trackSid: pub.trackSid });
            } catch (err: any) {
              if (err?.message?.includes('no publication') || err?.message?.includes('not found')) {
                console.log('Track already unpublished (ignoring):', { kind: track.kind, source: pub.source, trackSid: pub.trackSid });
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

  // Cleanup on unmount - only stop if actually publishing
  // CRITICAL: Empty dependency array so cleanup ONLY runs on actual unmount, not when deps change
  useEffect(() => {
    return () => {
      // Only stop if we're actually publishing (user navigated away while live)
      const currentRoom = roomRef.current;
      if (isPublishingRef.current && currentRoom && currentRoom.state === 'connected') {
        console.log('[PUBLISH] Component unmounting, cleaning up tracks...');
        
        // Unpublish tracks inline without calling stopPublishing callback
        const participant = currentRoom.localParticipant;
        if (participant) {
          const publishedTracks = Array.from(participant.trackPublications.values())
            .filter(pub => pub.track)
            .map(pub => pub.track!);
          
          for (const track of publishedTracks) {
            try {
              participant.unpublishTrack(track).catch(() => {});
              track.stop();
            } catch (err) {
              // Ignore errors during cleanup
            }
          }
        }
        
        // Stop local tracks
        tracksRef.current.forEach(track => {
          try {
            track.stop();
            track.detach();
          } catch (err) {
            // Ignore
          }
        });
        tracksRef.current = [];
        isPublishingRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - ONLY run on actual mount/unmount

  // Auto-start when enabled and room is connected
  // CRITICAL: Only auto-START publishing, NEVER auto-STOP
  // stopPublishing should ONLY be called by explicit user actions (stop button, close box, navigate away)
  const enabledRef = useRef(enabled);
  const isPublishingStateRef = useRef(isPublishing);
  const toggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userExplicitlyStoppedRef = useRef(false); // Track if user explicitly stopped
  
  useEffect(() => {
    enabledRef.current = enabled;
    // Reset explicit stop flag when enabled becomes true (user wants to go live again)
    if (enabled) {
      userExplicitlyStoppedRef.current = false;
    }
  }, [enabled]);
  
  useEffect(() => {
    isPublishingStateRef.current = isPublishing;
  }, [isPublishing]);
  
  useEffect(() => {
    const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
    
    // Clear any pending toggle
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
      toggleTimeoutRef.current = null;
    }

    // Debounce rapid toggles (wait 500ms before acting on changes)
    toggleTimeoutRef.current = setTimeout(() => {
      // CRITICAL: Only auto-START publishing when enabled becomes true
      // NEVER auto-stop - that should only happen from explicit user actions
      if (enabledRef.current && isRoomConnected && room && room.state === 'connected' && !isPublishingStateRef.current && !userExplicitlyStoppedRef.current) {
        if (DEBUG_LIVEKIT) {
          console.log('[PUBLISH] Auto-starting publisher', {
            reason: 'enabled=true, room connected',
            enabled: enabledRef.current,
            isRoomConnected,
            roomState: room.state,
            isPublishing: isPublishingStateRef.current,
            userExplicitlyStopped: userExplicitlyStoppedRef.current,
          });
        }
        console.log('Auto-starting publisher (enabled=true, room connected):', {
          enabled: enabledRef.current,
          isRoomConnected,
          roomState: room.state,
          isPublishing: isPublishingStateRef.current,
          userExplicitlyStopped: userExplicitlyStoppedRef.current,
        });
        startPublishing().catch((err) => {
          console.error('Failed to start publishing:', err);
          setError(err);
        });
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
      // NOTE: We intentionally do NOT auto-stop when enabled becomes false
      // stopPublishing should only be called from explicit user actions
    }, 500); // 500ms debounce to prevent rapid toggling

    return () => {
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
        toggleTimeoutRef.current = null;
      }
    };
  }, [enabled, isRoomConnected, room, isPublishing, startPublishing]);

  return {
    isPublishing,
    error,
    startPublishing,
    stopPublishing,
  };
}

