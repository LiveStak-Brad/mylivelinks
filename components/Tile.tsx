'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import GifterBadge from './GifterBadge';
import GiftModal from './GiftModal';
import MiniProfile from './MiniProfile';
import { useViewerHeartbeat } from '@/hooks/useViewerHeartbeat';
import { RemoteTrack, TrackPublication, RemoteParticipant, Track, RoomEvent, Room } from 'livekit-client';
import { createClient } from '@/lib/supabase';

interface TileProps {
  streamerId: string;
  streamerUsername: string;
  streamerAvatar?: string;
  isLive: boolean; // Derived from track publications only (no preview mode)
  viewerCount: number;
  gifterLevel: number;
  badgeName?: string;
  badgeColor?: string;
  slotIndex: number;
  liveStreamId?: number;
  sharedRoom?: Room | null; // Shared LiveKit room connection
  isRoomConnected?: boolean; // Whether shared room is connected
  isCurrentUserPublishing?: boolean; // NEW: Whether current user is publishing (for echo prevention)
  onClose: () => void;
  onMute: () => void;
  isMuted: boolean;
  volume: number; // 0.0 to 1.0
  onVolumeChange: (volume: number) => void;
  isFullscreen?: boolean;
  onExpand?: () => void;
  onExitFullscreen?: () => void;
  onVolumeSliderToggle?: (isOpen: boolean) => void;
  onReplace?: () => void;
}

export default function Tile({
  streamerId,
  streamerUsername,
  streamerAvatar,
  isLive,
  viewerCount,
  gifterLevel,
  badgeName,
  badgeColor,
  slotIndex,
  liveStreamId,
  sharedRoom,
  isRoomConnected = false,
  isCurrentUserPublishing = false, // NEW: Whether current user is publishing
  onClose,
  onMute,
  isMuted,
  volume,
  onVolumeChange,
  isFullscreen = false,
  onExpand,
  onExitFullscreen,
  onVolumeSliderToggle,
  onReplace,
}: TileProps) {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoTrack, setVideoTrack] = useState<RemoteTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<RemoteTrack | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const supabase = createClient();

  // Track subscription state to prevent re-subscriptions
  const subscriptionRef = useRef<{ streamerId: string | null; subscribed: boolean }>({ streamerId: null, subscribed: false });
  // Track if we have tracks (for retry timer to check current state)
  const hasTracksRef = useRef<{ video: boolean; audio: boolean }>({ video: false, audio: false });

  // Use shared room connection instead of creating our own
  // Subscribe to tracks from the streamer when room is connected
  // CRITICAL: Only depend on streamerId and liveStreamId to prevent re-subscription loops
  // CRITICAL: Don't return early if live_available=true but is_published=false - wait for tracks
  const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
  
  useEffect(() => {
    if (DEBUG_LIVEKIT) {
      console.log('[SUB] subscribe attempt', {
        slotIndex,
        streamerId,
        isCurrentUser,
        hasSharedRoom: !!sharedRoom,
        isRoomConnected,
        alreadySubscribed: subscriptionRef.current.subscribed && subscriptionRef.current.streamerId === streamerId,
      });
    }
    
    // NO PREVIEW MODE: Current user subscribes to their own remote tracks like everyone else
    // This allows streamers to see themselves broadcasting
    
    // Must have room, connection, and streamerId
    if (!sharedRoom || !isRoomConnected || !streamerId) {
      if (DEBUG_LIVEKIT) {
        console.log('[DEBUG] Tile subscription blocked (missing requirements):', {
          slotIndex,
          streamerId,
          hasSharedRoom: !!sharedRoom,
          isRoomConnected,
          hasStreamerId: !!streamerId,
        });
      }
      return;
    }
    
    // If streamer is live_available but not yet published, still try to subscribe (tracks may appear soon)
    // Heartbeat is already running, which will trigger publishing

    // Skip if already subscribed to this streamer (identity check only)
    if (subscriptionRef.current.subscribed && subscriptionRef.current.streamerId === streamerId) {
      if (DEBUG_LIVEKIT) {
        console.log('[DEBUG] Tile already subscribed, skipping:', { slotIndex, streamerId });
      }
      return;
    }

    // Mark as subscribed
    subscriptionRef.current.subscribed = true;
    subscriptionRef.current.streamerId = streamerId;
    
    if (DEBUG_LIVEKIT) {
      console.log('[DEBUG] Starting tile subscription:', { slotIndex, streamerId, liveStreamId });
    }

    const handleTrackSubscribed = (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
      // Only subscribe to tracks from this specific streamer
      if (participant.identity === streamerId) {
        const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
        if (DEBUG_LIVEKIT) {
          console.log('[SUB] trackSubscribed', {
            slotIndex,
            participantIdentity: participant.identity,
            trackKind: track.kind,
            trackSid: track.sid,
          });
        }
        if (track.kind === Track.Kind.Video) {
          // Only update if we don't already have this track (prevent flicker)
          if (!hasTracksRef.current.video) {
            hasTracksRef.current.video = true;
            setVideoTrack(track);
            if (videoRef.current) {
              track.attach(videoRef.current);
              if (DEBUG_LIVEKIT) {
                console.log('[DEBUG] Video track attached to DOM:', { slotIndex, streamerId, trackSid: track.sid });
              }
            }
          }
        } else if (track.kind === Track.Kind.Audio) {
          // Only update if we don't already have this track (prevent flicker)
          if (!hasTracksRef.current.audio) {
            hasTracksRef.current.audio = true;
            setAudioTrack(track);
            if (audioRef.current) {
              track.attach(audioRef.current);
              if (DEBUG_LIVEKIT) {
                console.log('[DEBUG] Audio track attached to DOM:', { slotIndex, streamerId, trackSid: track.sid });
              }
            }
          }
        }
      }
    };

    const handleTrackUnsubscribed = (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
      // CRITICAL: Only clear tracks if participant is ACTUALLY LEAVING the room
      // LiveKit fires unsubscription events for many reasons (adaptive streaming, network, etc.)
      // We must be very defensive and only clear when participant is gone
      const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
      if (DEBUG_LIVEKIT) {
        console.log('[SUB] Track unsubscribed', {
          slotIndex,
          participantIdentity: participant.identity,
          trackKind: track.kind,
          trackSid: track.sid,
          participantStillInRoom: sharedRoom.remoteParticipants.has(participant.identity),
        });
      }
      if (participant.identity === streamerId) {
        // Check if participant is still in room
        const participantStillInRoom = sharedRoom.remoteParticipants.has(participant.identity);
        
        if (DEBUG_LIVEKIT) {
          console.log('[DEBUG] Tile track unsubscribed:', {
            slotIndex,
            streamerId,
            trackKind: track.kind,
            trackSid: track.sid,
            participantStillInRoom,
            trackPublicationsCount: participant.trackPublications.size,
            publicationIsMuted: publication.isMuted,
            publicationIsSubscribed: publication.isSubscribed,
          });
        }
        
        // ONLY clear tracks if participant has LEFT the room entirely
        // Do NOT clear on temporary unsubscriptions, adaptive streaming changes, or mute events
        // LiveKit will automatically resubscribe when tracks are available again
        if (!participantStillInRoom) {
          if (DEBUG_LIVEKIT) {
            console.log('[DEBUG] Participant left room, clearing tracks:', { slotIndex, streamerId });
          }
          if (track.kind === Track.Kind.Video) {
            track.detach();
            hasTracksRef.current.video = false;
            setVideoTrack(null);
          } else if (track.kind === Track.Kind.Audio) {
            track.detach();
            hasTracksRef.current.audio = false;
            setAudioTrack(null);
          }
        } else {
          // Participant still in room - this is a temporary unsubscription
          // Do NOT clear tracks - LiveKit will resubscribe automatically
          // Clearing here causes the flicker/black screen issue
          if (DEBUG_LIVEKIT) {
            console.log('[DEBUG] Ignoring temporary unsubscription (participant still in room):', {
              slotIndex,
              streamerId,
              trackKind: track.kind,
            });
          }
        }
      }
    };

    // Subscribe to existing tracks
    const checkForTracks = () => {
      let foundParticipant = false;
      let trackCount = 0;
      
      // CRITICAL: Check if this is the current user's own tile
      // If so, use local participant's published tracks instead of remote
      if (sharedRoom.localParticipant && sharedRoom.localParticipant.identity === streamerId) {
        foundParticipant = true;
        const localParticipant = sharedRoom.localParticipant;
        trackCount = localParticipant.trackPublications.size;
        
        if (DEBUG_LIVEKIT) {
          console.log('[SUB] Found LOCAL participant (self) for tile:', {
            slotIndex,
            streamerId,
            participantIdentity: localParticipant.identity,
            trackPublicationsCount: localParticipant.trackPublications.size,
            publications: Array.from(localParticipant.trackPublications.values()).map(p => ({
              kind: p.track?.kind,
              source: p.source,
              sid: p.trackSid,
              hasTrack: !!p.track,
            })),
          });
        }
        
        // Handle local tracks - attach them to this tile so user can see themselves
        localParticipant.trackPublications.forEach((publication) => {
          const isCameraOrMic = publication.source === Track.Source.Camera || publication.source === Track.Source.Microphone;
          
          if (isCameraOrMic && publication.track) {
            const track = publication.track;
            if (DEBUG_LIVEKIT) {
              console.log('[SUB] Attaching LOCAL track to tile:', {
                slotIndex,
                kind: track.kind,
                source: publication.source,
              });
            }
            
            // Attach local tracks to this tile's video/audio elements
            if (track.kind === Track.Kind.Video) {
              if (!hasTracksRef.current.video) {
                hasTracksRef.current.video = true;
                setVideoTrack(track as any); // Cast to RemoteTrack type for state
                if (videoRef.current) {
                  track.attach(videoRef.current);
                }
              }
            } else if (track.kind === Track.Kind.Audio) {
              if (!hasTracksRef.current.audio) {
                hasTracksRef.current.audio = true;
                setAudioTrack(track as any); // Cast to RemoteTrack type for state
                if (audioRef.current) {
                  track.attach(audioRef.current);
                }
              }
            }
          }
        });
        
        return; // Done processing local participant
      }
      
      // Not the current user - check remote participants
      sharedRoom.remoteParticipants.forEach((participant) => {
        if (participant.identity === streamerId) {
          foundParticipant = true;
          trackCount = participant.trackPublications.size;
          
          if (DEBUG_LIVEKIT) {
            console.log('[DEBUG] Found remote participant for tile:', {
              slotIndex,
              streamerId,
              participantIdentity: participant.identity,
              trackPublicationsCount: participant.trackPublications.size,
              publications: Array.from(participant.trackPublications.values()).map(p => ({
                kind: p.track?.kind,
                source: p.source,
                sid: p.trackSid,
                isSubscribed: p.isSubscribed,
                hasTrack: !!p.track,
              })),
            });
          }
          
          // CRITICAL: Explicitly subscribe to ALL camera/microphone publications
          // In LiveKit, publications exist but must be explicitly subscribed to
          participant.trackPublications.forEach((publication) => {
            // Only subscribe to camera and microphone tracks
            const isCameraOrMic = publication.source === Track.Source.Camera || publication.source === Track.Source.Microphone;
            
            if (isCameraOrMic) {
              // CRITICAL: Only subscribe if publication has a trackSid (track is actually ready)
              // Subscribing to publications without tracks causes rapid subscribe/unsubscribe cycles
              if (!publication.trackSid) {
                if (DEBUG_LIVEKIT) {
                  console.log('[DEBUG] Skipping subscription (no trackSid yet):', {
                    slotIndex,
                    streamerId,
                    source: publication.source,
                  });
                }
                return;
              }
              
              // If not already subscribed, subscribe now
              if (!publication.isSubscribed) {
                if (DEBUG_LIVEKIT) {
                  console.log('[DEBUG] Subscribing to publication:', {
                    slotIndex,
                    streamerId,
                    source: publication.source,
                    sid: publication.trackSid,
                  });
                }
                try {
                  publication.setSubscribed(true);
                } catch (err) {
                  if (DEBUG_LIVEKIT) {
                    console.warn('[DEBUG] Failed to subscribe to publication:', err);
                  }
                }
              }
              
              // If track is already available, handle it immediately
              if (publication.track) {
                handleTrackSubscribed(publication.track as RemoteTrack, publication, participant);
              }
            }
          });
        }
      });
      
      if (!foundParticipant) {
        const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
        if (DEBUG_LIVEKIT) {
          console.log('[SUB] subscribe attempt', {
            slotIndex,
            participantIdentityFound: false,
            streamerId,
            liveStreamId,
            remoteParticipantsCount: sharedRoom.remoteParticipants.size,
            remoteParticipantIdentities: Array.from(sharedRoom.remoteParticipants.values()).map(p => p.identity),
          });
        }
      } else {
        // Log when participant IS found (even if no tracks yet)
        if (DEBUG_LIVEKIT) {
          console.log('[SUB] subscribe attempt', {
            slotIndex,
            participantIdentityFound: true,
            streamerId,
            trackCount,
            publicationsSubscribed: Array.from(sharedRoom.remoteParticipants.get(streamerId)?.trackPublications.values() || []).filter(p => p.isSubscribed).length,
          });
        }
      }
    };
    
    // Check immediately
    checkForTracks();
    
    // If tracks not found yet, retry briefly to catch late publications
    let retryAttempts = 0;
    const maxRetryAttempts = 20; // Increased to handle slower publishing
    const retryInterval = 500; // 500ms between retries = ~10 seconds total
    
    const retryTimer = setInterval(() => {
      // Stop retrying if conditions changed
      if (!sharedRoom || !isRoomConnected || !streamerId) {
        clearInterval(retryTimer);
        return;
      }
      
      // Stop if we already have BOTH video AND audio tracks
      // Keep checking if we only have one (waiting for the other)
      if (hasTracksRef.current.video && hasTracksRef.current.audio) {
        clearInterval(retryTimer);
        return;
      }
      
      retryAttempts++;
      if (retryAttempts >= maxRetryAttempts) {
        if (DEBUG_LIVEKIT) {
          console.log('[DEBUG] Retry timer stopped (max attempts reached):', {
            slotIndex,
            streamerId,
            hasVideo: hasTracksRef.current.video,
            hasAudio: hasTracksRef.current.audio,
          });
        }
        clearInterval(retryTimer);
        return;
      }
      
      // Check for tracks again (will subscribe to any new publications)
      checkForTracks();
    }, retryInterval);

    // Listen for new tracks being subscribed
    sharedRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    sharedRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    
    // CRITICAL: Also listen for when participants connect and when they publish tracks
    // This ensures we subscribe to tracks even if they're published after the Tile mounts
    const handleParticipantConnected = (participant: RemoteParticipant) => {
      if (participant.identity === streamerId) {
        if (DEBUG_LIVEKIT) {
          console.log('[DEBUG] Target participant connected, checking for publications:', {
            slotIndex,
            streamerId,
            trackPublicationsCount: participant.trackPublications.size,
          });
        }
        // Immediately check and subscribe to any existing publications
        checkForTracks();
        
        // Also listen for when this participant publishes new tracks
        // Note: LiveKit may not have a direct 'trackPublished' event, so we'll use a polling approach
        // Check publications periodically to catch new ones
        let lastPublicationCount = participant.trackPublications.size;
        const checkPublicationsInterval = setInterval(() => {
          const currentCount = participant.trackPublications.size;
          if (currentCount > lastPublicationCount) {
            // New publications detected - subscribe to them
            if (DEBUG_LIVEKIT) {
              console.log('[DEBUG] New publications detected, re-checking:', {
                slotIndex,
                streamerId,
                oldCount: lastPublicationCount,
                newCount: currentCount,
              });
            }
            checkForTracks();
            lastPublicationCount = currentCount;
          }
        }, 1000); // Check every second for new publications
        
        // Store cleanup function
        return () => {
          clearInterval(checkPublicationsInterval);
        };
      }
      return null;
    };
    
    // Track cleanup functions for participant listeners
    const participantCleanups: Array<() => void> = [];
    
    // Check if participant is already connected
    sharedRoom.remoteParticipants.forEach((participant) => {
      const cleanup = handleParticipantConnected(participant);
      if (cleanup) {
        participantCleanups.push(cleanup);
      }
    });
    
    // Listen for new participants connecting
    const roomParticipantConnectedHandler = (participant: RemoteParticipant) => {
      const cleanup = handleParticipantConnected(participant);
      if (cleanup) {
        participantCleanups.push(cleanup);
      }
    };
    sharedRoom.on(RoomEvent.ParticipantConnected, roomParticipantConnectedHandler);

    return () => {
      clearInterval(retryTimer);
      sharedRoom.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      sharedRoom.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      sharedRoom.off(RoomEvent.ParticipantConnected, roomParticipantConnectedHandler);
      // Clean up participant-level listeners
      participantCleanups.forEach(cleanup => cleanup());
      participantCleanups.length = 0;
      // Only mark as unsubscribed if this is the same streamer
      if (subscriptionRef.current.streamerId === streamerId) {
        subscriptionRef.current.subscribed = false;
        subscriptionRef.current.streamerId = null;
      }
    };
    // CRITICAL: Depend ONLY on primitive values to prevent reruns on object reference changes
    // Use roomState/roomName instead of sharedRoom object to detect when room actually changes
    // The subscriptionRef guard prevents re-subscription when streamerId hasn't changed
    // CRITICAL: Subscription must work even if streamer is live_available but not yet is_published
    // CRITICAL: Include isCurrentUser in deps so we skip subscription when it's the current user
  }, [isRoomConnected, streamerId, isCurrentUser, sharedRoom]);

  // Check if this is the current user's tile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      setIsCurrentUser(user?.id === streamerId);
    });
  }, [streamerId, supabase]);

  // NO PREVIEW MODE: Current user sees their own tracks through the room

  // Attach video track when it becomes available - use ref to prevent re-attachment
  const attachedVideoTrackRef = useRef<RemoteTrack | null>(null);
  useEffect(() => {
    if (videoTrack && videoRef.current) {
      // Only attach if it's a different track
      if (attachedVideoTrackRef.current !== videoTrack) {
        // Detach previous track if exists
        if (attachedVideoTrackRef.current && videoRef.current) {
          attachedVideoTrackRef.current.detach();
        }
        videoTrack.attach(videoRef.current);
        attachedVideoTrackRef.current = videoTrack;
        hasTracksRef.current.video = true; // Sync ref for retry timer
      }
    } else if (!videoTrack && attachedVideoTrackRef.current && videoRef.current) {
      // Clean up if track is removed
      attachedVideoTrackRef.current.detach();
      attachedVideoTrackRef.current = null;
      hasTracksRef.current.video = false; // Sync ref for retry timer
    }
    
    return () => {
      if (attachedVideoTrackRef.current && videoRef.current) {
        attachedVideoTrackRef.current.detach();
        attachedVideoTrackRef.current = null;
      }
    };
  }, [videoTrack]);

  // Attach audio track and apply volume/mute - use ref to prevent re-attachment
  // CRITICAL: Prevent echo - mute own audio playback when publishing to avoid feedback loop
  const attachedAudioTrackRef = useRef<RemoteTrack | null>(null);
  useEffect(() => {
    if (audioTrack && audioRef.current) {
      // Only attach if it's a different track
      if (attachedAudioTrackRef.current !== audioTrack) {
        // Detach previous track if exists
        if (attachedAudioTrackRef.current && audioRef.current) {
          attachedAudioTrackRef.current.detach();
        }
        audioTrack.attach(audioRef.current);
        attachedAudioTrackRef.current = audioTrack;
      }
      
      // CRITICAL: Echo prevention - ONLY mute current user's OWN tile audio when publishing
      // Use reliable publishing state flag instead of checking localParticipant (pub.isSubscribed is unreliable)
      // This prevents feedback loop: when you publish audio, don't play it back to yourself
      const shouldMuteForEcho = isCurrentUser && isCurrentUserPublishing;
      
      if (DEBUG_LIVEKIT && isCurrentUser) {
        console.log('[DEBUG] Echo prevention check:', {
          slotIndex,
          isCurrentUser,
          isCurrentUserPublishing,
          shouldMuteForEcho,
          isMuted,
        });
      }
      
      // Apply mute: either user muted OR echo prevention (ONLY for current user's own tile)
      // Other tiles are never affected by echo prevention
      const finalMute = isMuted || shouldMuteForEcho;
      audioRef.current.volume = finalMute ? 0 : volume;
    } else if (!audioTrack && attachedAudioTrackRef.current && audioRef.current) {
      // Clean up if track is removed
      attachedAudioTrackRef.current.detach();
      attachedAudioTrackRef.current = null;
    }
    
    return () => {
      if (attachedAudioTrackRef.current && audioRef.current) {
        attachedAudioTrackRef.current.detach();
        attachedAudioTrackRef.current = null;
      }
    };
  }, [audioTrack, isMuted, volume, isCurrentUser, isCurrentUserPublishing]);

  // Manage viewer heartbeat when tile is active and not muted
  // Heartbeat is analytics-only; do not gate publishing/subscribing
  const shouldSendHeartbeat = !!(
    liveStreamId !== undefined && 
    !isMuted
  );
  
  // CRITICAL: Track actual subscription state for heartbeat (not hardcoded true)
  // This ensures heartbeat accurately reflects whether we're subscribed to tracks
  const [isActuallySubscribed, setIsActuallySubscribed] = useState(false);
  
  useEffect(() => {
    // Update subscription state based on whether we have tracks
    setIsActuallySubscribed(!!(videoTrack || audioTrack));
  }, [videoTrack, audioTrack]);
  
  // CRITICAL: Only enable heartbeat if we have a valid liveStreamId
  // Passing 0 causes issues - heartbeat should only run for valid streams
  useViewerHeartbeat({
    liveStreamId: liveStreamId || 0, // Keep 0 fallback for type safety, but enabled check prevents actual use
    isActive: isActive && !isMuted,
    isUnmuted: !isMuted,
    isVisible: isVisible,
    isSubscribed: isActuallySubscribed, // Use actual subscription state, not hardcoded
    enabled: shouldSendHeartbeat && !!liveStreamId, // CRITICAL: Only enable if we have valid liveStreamId
  });

  // Track visibility for heartbeat
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.5 }
    );

    const element = document.querySelector(`[data-tile-id="${slotIndex}"]`);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [slotIndex]);

  // Apply volume to audio element when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Determine tile state from track presence (no preview mode)
  const tileState = videoTrack ? 'live' : 'offline';

  return (
    <div
      data-tile-id={slotIndex}
      className={`
        relative ${isFullscreen ? 'w-full h-full' : 'aspect-[3/2]'} rounded-lg overflow-hidden group
        border-2 transition-all duration-200
        ${
          tileState === 'live'
            ? 'border-red-500 shadow-lg shadow-red-500/20'
            : 'border-gray-300 dark:border-gray-700'
        }
        ${isMuted ? 'opacity-60' : ''}
      `}
    >
      {/* Video/Stream Area */}
      <div className="w-full h-full flex items-center justify-center bg-gray-900 relative overflow-hidden">
        {/* LiveKit Video Element - Show whenever we have a video track */}
        {videoTrack && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover ${isMuted ? 'grayscale' : ''}`}
            autoPlay
            playsInline
            muted={isMuted}
          />
        )}
        
        {/* Fallback: Avatar or placeholder when no video track */}
        {!videoTrack && (
          <div className="absolute inset-0 w-full h-full">
            {streamerAvatar ? (
              <img
                src={streamerAvatar}
                alt={streamerUsername}
                className={`w-full h-full object-cover ${isMuted ? 'grayscale' : ''}`}
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <span className="text-gray-500 text-4xl font-bold">{streamerUsername.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        )}

        {/* Audio element for LiveKit audio track */}
        {isLive && (
          <audio
            ref={audioRef}
            autoPlay
            playsInline
            className="hidden"
          />
        )}

        {/* No preview overlays - preview mode is invisible to users */}
        {/* No "Connecting..." UI - streamer should never see this */}
      </div>

      {/* State Indicator - Show LIVE badge when video track exists */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-30">
        {tileState === 'live' && (
          <div className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-xl border border-red-400">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-sm" />
            LIVE
          </div>
        )}
      </div>

      {/* Stats Overlay - Show viewer count */}
      {viewerCount > 0 && (
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs z-20">
          👁️ {viewerCount}
        </div>
      )}

      {/* Muted Indicator */}
      {isMuted && (
        <div className="absolute top-12 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs z-20">
          🔇 Muted
        </div>
      )}

      {/* Bottom Right Overlay - Username and Badge */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <button
            onClick={() => setShowMiniProfile(true)}
            className="text-white font-medium text-sm truncate hover:text-blue-300 transition cursor-pointer"
          >
            {streamerUsername}
          </button>
          <GifterBadge
            level={gifterLevel}
            badgeName={badgeName}
            badgeColor={badgeColor}
            size="sm"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-10 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex gap-1">
          {onExpand && !isFullscreen && (
            <button
              onClick={onExpand}
              className="p-1.5 bg-black/50 text-white rounded hover:bg-blue-500/80 transition"
              title="Expand to Fullscreen"
            >
              ⛶
            </button>
          )}
          {isFullscreen && onExitFullscreen && (
            <button
              onClick={onExitFullscreen}
              className="p-1.5 bg-black/50 text-white rounded hover:bg-red-500/80 transition"
              title="Exit Fullscreen"
            >
              ✕
            </button>
          )}
          <button
            onClick={onMute}
            className={`p-1.5 rounded hover:bg-black/70 transition ${
              isMuted
                ? 'bg-red-500/80 text-white'
                : 'bg-black/50 text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={() => {
              const newState = !showVolumeSlider;
              setShowVolumeSlider(newState);
              onVolumeSliderToggle?.(newState);
            }}
            className="p-1.5 bg-black/50 text-white rounded hover:bg-black/70 transition"
            title="Volume Control"
          >
            🔊
          </button>
          {!isFullscreen && (
            <>
              {onReplace && (
                <button
                  onClick={onReplace}
                  className="p-1.5 bg-black/50 text-white rounded hover:bg-blue-500/80 transition"
                  title="Replace Streamer"
                >
                  🔄
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 bg-black/50 text-white rounded hover:bg-red-500/80 transition"
                title="Close"
              >
                ✕
              </button>
            </>
          )}
        </div>
        
        {/* Volume Slider - Shows when volume button is clicked */}
        {showVolumeSlider && (
          <div 
            className="bg-black/90 backdrop-blur-sm rounded-lg p-3 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2 min-w-[120px]">
              <span className="text-white text-xs">🔇</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  onVolumeChange(newVolume);
                  if (newVolume === 0 && !isMuted) {
                    onMute(); // Auto-mute at 0
                  } else if (newVolume > 0 && isMuted) {
                    onMute(); // Auto-unmute above 0
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onDragStart={(e) => e.preventDefault()}
                className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, #4b5563 ${(isMuted ? 0 : volume) * 100}%, #4b5563 100%)`
                }}
              />
              <span className="text-white text-xs w-8 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gift Button */}
      <button
        onClick={() => setShowGiftModal(true)}
        className="absolute bottom-2 left-2 px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
      >
        💎 Gift
      </button>

      {/* Gift Modal */}
      {showGiftModal && (
        <GiftModal
          recipientId={streamerId}
          recipientUsername={streamerUsername}
          slotIndex={slotIndex}
          liveStreamId={liveStreamId}
          onGiftSent={() => {
            setShowGiftModal(false);
          }}
          onClose={() => setShowGiftModal(false)}
        />
      )}

      {/* Mini Profile Modal */}
      {showMiniProfile && (
        <MiniProfile
          profileId={streamerId}
          username={streamerUsername}
          avatarUrl={streamerAvatar}
          gifterLevel={gifterLevel}
          badgeName={badgeName}
          badgeColor={badgeColor}
          isLive={isLive}
          onClose={() => setShowMiniProfile(false)}
          onLeaveChannel={() => {
            onClose();
            setShowMiniProfile(false);
          }}
          onDisconnect={() => {
            onClose();
            setShowMiniProfile(false);
          }}
        />
      )}
    </div>
  );
}

