'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Volume2 } from 'lucide-react';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { createClient } from '@/lib/supabase';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, Track, TrackPublication, LocalTrackPublication } from 'livekit-client';

interface GuestVideoOverlayProps {
  liveStreamId?: number;
  hostId?: string;
  currentUserId?: string;
  isHost: boolean;
  room?: Room | null;
  onGuestLeave?: () => void; // Called when guest leaves (to stop publishing)
}

interface ActiveGuest {
  id: number;
  requesterId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  hasCamera: boolean;
  hasMic: boolean;
  videoTrack?: RemoteTrack;
  audioTrack?: RemoteTrack;
  participant?: RemoteParticipant;
}

// Helper to get localStorage key for guest volume persistence
const getVolumeStorageKey = (liveStreamId: number, guestId: string) => 
  `guestVolume_${liveStreamId}_${guestId}`;

// Helper to load all saved volumes for a stream from localStorage
const loadSavedVolumes = (liveStreamId: number): { [key: string]: number } => {
  if (typeof window === 'undefined') return {};
  const volumes: { [key: string]: number } = {};
  const prefix = `guestVolume_${liveStreamId}_`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      const guestId = key.replace(prefix, '');
      const value = parseFloat(localStorage.getItem(key) || '1');
      if (!isNaN(value)) {
        volumes[guestId] = value;
      }
    }
  }
  return volumes;
};

export default function GuestVideoOverlay({
  liveStreamId,
  hostId,
  currentUserId,
  isHost,
  room,
  onGuestLeave,
}: GuestVideoOverlayProps) {
  const supabase = useMemo(() => createClient(), []);
  const [activeGuests, setActiveGuests] = useState<ActiveGuest[]>([]);
  const activeGuestsRef = useRef<ActiveGuest[]>([]); // Ref to avoid stale closures in event handlers
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState<string | null>(null); // Track which guest's slider is open
  // Initialize volumes from localStorage for this stream
  const [guestVolumes, setGuestVolumes] = useState<{ [key: string]: number }>(() => 
    liveStreamId ? loadSavedVolumes(liveStreamId) : {}
  );
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [guestsWithVideo, setGuestsWithVideo] = useState<Set<string>>(new Set()); // Track which guests have video attached
  const [isCurrentUserGuest, setIsCurrentUserGuest] = useState(false);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);

  // Track window width for responsive positioning
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileSize = windowWidth < 768;

  // Keep activeGuestsRef in sync with state (avoids stale closures in event handlers)
  useEffect(() => {
    activeGuestsRef.current = activeGuests;
  }, [activeGuests]);

  // Reload saved volumes when liveStreamId changes and apply to existing audio elements
  useEffect(() => {
    if (!liveStreamId) return;
    
    const savedVolumes = loadSavedVolumes(liveStreamId);
    setGuestVolumes(savedVolumes);
    
    // Apply saved volumes to any existing audio elements
    Object.entries(savedVolumes).forEach(([guestId, volume]) => {
      const audioEl = audioRefs.current[guestId];
      if (audioEl) {
        audioEl.volume = volume;
        console.log('[GuestVideoOverlay] Applied saved volume to guest:', guestId, volume);
      }
    });
  }, [liveStreamId]);

  // Load accepted guests from database
  useEffect(() => {
    console.log('[GuestVideoOverlay] Effect running, liveStreamId:', liveStreamId);
    if (!liveStreamId) {
      console.log('[GuestVideoOverlay] No liveStreamId, skipping');
      return;
    }

    const loadAcceptedGuests = async () => {
      try {
        const { data, error } = await supabase
          .from('guest_requests')
          .select(`
            id,
            requester_id,
            has_camera,
            has_mic,
            profiles:requester_id (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('live_stream_id', liveStreamId)
          .eq('status', 'accepted')
          .order('created_at', { ascending: true })
          .limit(2);

        if (error) {
          console.error('[GuestVideoOverlay] Error loading guests:', error);
          return;
        }

        if (data && data.length > 0) {
          const guests: ActiveGuest[] = data.map((g: any) => ({
            id: g.id,
            requesterId: g.requester_id,
            username: g.profiles?.username || 'Guest',
            displayName: g.profiles?.display_name,
            avatarUrl: g.profiles?.avatar_url,
            hasCamera: g.has_camera,
            hasMic: g.has_mic,
          }));
          setActiveGuests(guests);
        } else {
          setActiveGuests([]);
        }
      } catch (err) {
        console.error('[GuestVideoOverlay] Error:', err);
      }
    };

    loadAcceptedGuests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`guest-overlay-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guest_requests',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        (payload) => {
          console.log('[GuestVideoOverlay] Realtime update:', payload);
          loadAcceptedGuests();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [liveStreamId, supabase]);

  // Check if current user is an accepted guest and attach their local video
  useEffect(() => {
    if (!room || !currentUserId || isHost) return;

    // Check if current user is in the accepted guests list
    const isGuest = activeGuests.some(g => g.requesterId === currentUserId);
    setIsCurrentUserGuest(isGuest);

    if (!isGuest) return;

    const attachLocalVideo = () => {
      const localParticipant = room.localParticipant;
      if (!localParticipant || !localVideoRef.current) {
        console.log('[GuestVideoOverlay] Cannot attach local video yet:', { 
          hasParticipant: !!localParticipant, 
          hasVideoRef: !!localVideoRef.current 
        });
        return;
      }

      localParticipant.trackPublications.forEach((pub) => {
        if (pub.track && pub.kind === Track.Kind.Video) {
          console.log('[GuestVideoOverlay] Attaching LOCAL video for self-preview');
          if (localVideoRef.current) {
            pub.track.attach(localVideoRef.current);
            setHasLocalVideo(true);
          }
        }
      });
    };

    // Try to attach immediately
    attachLocalVideo();

    // Also try after a short delay (for timing issues)
    const timeout = setTimeout(attachLocalVideo, 500);
    const timeout2 = setTimeout(attachLocalVideo, 1500);

    // Listen for when local track is published
    const handleLocalTrackPublished = (publication: LocalTrackPublication) => {
      console.log('[GuestVideoOverlay] LocalTrackPublished event:', publication.kind);
      if (publication.kind === Track.Kind.Video && publication.track && localVideoRef.current) {
        publication.track.attach(localVideoRef.current);
        setHasLocalVideo(true);
      }
    };

    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    };
  }, [room, currentUserId, isHost, activeGuests]);

  // Attach video tracks from LiveKit room + handle disconnect events
  // Uses activeGuestsRef to avoid re-registering handlers on every activeGuests change
  useEffect(() => {
    if (!room) {
      return;
    }

    // Function to attach tracks - uses ref to get current guests
    const attachGuestTracks = () => {
      const guests = activeGuestsRef.current;
      if (guests.length === 0) return;

      console.log('[GuestVideoOverlay] All remote participants:', 
        Array.from(room.remoteParticipants.values()).map(p => ({
          identity: p.identity,
          tracks: Array.from(p.trackPublications.values()).map(t => ({ kind: t.kind, subscribed: t.isSubscribed }))
        }))
      );

      guests.forEach((guest) => {
        // Find participant by identity - guests have identity "guest_<userId>"
        const participant = Array.from(room.remoteParticipants.values()).find(
          (p) => p.identity === `guest_${guest.requesterId}`
        );
        
        console.log('[GuestVideoOverlay] Looking for participant:', guest.requesterId, 'Found:', participant?.identity);

        if (participant) {
          participant.trackPublications.forEach((publication) => {
            console.log('[GuestVideoOverlay] Track publication:', publication.kind, 'isSubscribed:', publication.isSubscribed, 'hasTrack:', !!publication.track);
            if (publication.track) {
              const videoEl = videoRefs.current[guest.requesterId];
              const audioEl = audioRefs.current[guest.requesterId];
              if (publication.kind === Track.Kind.Video && videoEl) {
                console.log('[GuestVideoOverlay] Attaching video track to element');
                publication.track.attach(videoEl);
                setGuestsWithVideo(prev => new Set(prev).add(guest.requesterId));
              }
              if (publication.kind === Track.Kind.Audio && audioEl) {
                console.log('[GuestVideoOverlay] 🔊 Attaching AUDIO track to element for guest:', guest.requesterId);
                publication.track.attach(audioEl);
                // Apply saved volume or default to 1.0
                const savedVolume = guestVolumes[guest.requesterId] ?? 1.0;
                audioEl.volume = savedVolume;
                console.log('[GuestVideoOverlay] Applied volume to guest:', guest.requesterId, savedVolume);
              }
            }
          });
        }
      });
    };

    // Initial attach
    attachGuestTracks();

    // Also try attaching when participants join
    const handleParticipantConnected = (participant: RemoteParticipant) => {
      console.log('[GuestVideoOverlay] Participant connected:', participant.identity);
      setTimeout(attachGuestTracks, 500); // Small delay to allow tracks to be published
    };

    // Listen for new tracks - uses ref to get current guests
    const handleTrackSubscribed = (
      track: RemoteTrack,
      publication: TrackPublication,
      participant: RemoteParticipant
    ) => {
      const guests = activeGuestsRef.current;
      const guest = guests.find((g) =>
        participant.identity === `guest_${g.requesterId}`
      );
      
      console.log('[GuestVideoOverlay] Track subscribed:', participant.identity, track.kind, 'Guest match:', !!guest);
      if (guest) {
        const videoEl = videoRefs.current[guest.requesterId];
        const audioEl = audioRefs.current[guest.requesterId];
        if (track.kind === Track.Kind.Video && videoEl) {
          console.log('[GuestVideoOverlay] Attaching subscribed video track');
          track.attach(videoEl);
          setGuestsWithVideo(prev => new Set(prev).add(guest.requesterId));
        }
        if (track.kind === Track.Kind.Audio && audioEl) {
          console.log('[GuestVideoOverlay] 🔊 Attaching subscribed AUDIO track for guest:', guest.requesterId);
          track.attach(audioEl);
          // Apply saved volume or default to 1.0
          const savedVolume = guestVolumes[guest.requesterId] ?? 1.0;
          audioEl.volume = savedVolume;
          console.log('[GuestVideoOverlay] Applied volume to guest:', guest.requesterId, savedVolume);
        }
      }
    };

    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      track.detach();
    };

    // P0 FIX: Handle guest disconnect (tab close, network loss)
    // Uses ref to avoid stale closure - handlers registered once per room
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      const identity = participant.identity;
      console.log('[GuestVideoOverlay] ParticipantDisconnected:', identity);

      // Check if this is a guest participant (identity format: "guest_<userId>")
      if (!identity.startsWith('guest_')) {
        console.log('[GuestVideoOverlay] Not a guest participant, ignoring');
        return;
      }

      // Extract requesterId from identity
      const requesterId = identity.replace('guest_', '');
      
      // Find matching guest in activeGuests - USE REF to get current value
      const guests = activeGuestsRef.current;
      const disconnectedGuest = guests.find(g => g.requesterId === requesterId);
      
      if (!disconnectedGuest) {
        console.log('[GuestVideoOverlay] Guest not in activeGuests list, already cleaned up');
        return;
      }

      console.log('[GuestVideoOverlay] Guest disconnected, cleaning up:', { 
        guestId: disconnectedGuest.id, 
        requesterId, 
        isHost 
      });

      // Perform cleanup based on role
      if (isHost) {
        // HOST: Clean DB + local state (host is sole authority for DB cleanup)
        performHostCleanup(disconnectedGuest.id, requesterId);
      } else {
        // VIEWER/GUEST: Clean local state only (host handles DB)
        performLocalCleanup(requesterId);
      }
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [room, isHost]); // Removed activeGuests - using ref instead to avoid re-registering handlers

  // Re-attach tracks when activeGuests changes (separate from handler registration)
  useEffect(() => {
    if (!room || activeGuests.length === 0) return;

    // Re-attach tracks for any new guests
    activeGuests.forEach((guest) => {
      const participant = Array.from(room.remoteParticipants.values()).find(
        (p) => p.identity === `guest_${guest.requesterId}`
      );
      
      if (participant) {
        participant.trackPublications.forEach((publication) => {
          if (publication.track) {
            const videoEl = videoRefs.current[guest.requesterId];
            const audioEl = audioRefs.current[guest.requesterId];
            if (publication.kind === Track.Kind.Video && videoEl && !videoEl.srcObject) {
              publication.track.attach(videoEl);
              setGuestsWithVideo(prev => new Set(prev).add(guest.requesterId));
            }
            if (publication.kind === Track.Kind.Audio && audioEl && !audioEl.srcObject) {
              publication.track.attach(audioEl);
              const savedVolume = guestVolumes[guest.requesterId] ?? 1.0;
              audioEl.volume = savedVolume;
            }
          }
        });
      }
    });
  }, [room, activeGuests, guestVolumes]);

  // HOST-ONLY: Perform DB cleanup when guest disconnects
  const performHostCleanup = async (guestId: number, requesterId: string) => {
    console.log('[GuestVideoOverlay] performHostCleanup (host-only):', { guestId, requesterId });
    
    try {
      // Step 1: Attempt DELETE (preferred)
      const { error: deleteError } = await supabase
        .from('guest_requests')
        .delete()
        .eq('id', guestId);

      if (deleteError) {
        console.warn('[GuestVideoOverlay] DELETE failed, trying UPDATE fallback:', deleteError);
        
        // Step 2: Fallback to UPDATE status='cancelled'
        const { error: updateError } = await supabase
          .from('guest_requests')
          .update({ status: 'cancelled' })
          .eq('id', guestId);
        
        if (updateError) {
          console.error('[GuestVideoOverlay] UPDATE fallback also failed:', updateError);
        }
      } else {
        console.log('[GuestVideoOverlay] DELETE succeeded for disconnected guest');
      }
    } catch (err) {
      console.error('[GuestVideoOverlay] performHostCleanup error:', err);
    }

    // Step 3: Always update local state immediately
    setActiveGuests(prev => prev.filter(g => g.requesterId !== requesterId));

    // Step 4: Clear refs
    if (videoRefs.current[requesterId]) {
      videoRefs.current[requesterId] = null;
    }
    if (audioRefs.current[requesterId]) {
      audioRefs.current[requesterId] = null;
    }

    // Step 5: Clear from guestsWithVideo set
    setGuestsWithVideo(prev => {
      const next = new Set(prev);
      next.delete(requesterId);
      return next;
    });
  };

  // VIEWER/GUEST: Perform local UI cleanup only (no DB operations)
  const performLocalCleanup = (requesterId: string) => {
    console.log('[GuestVideoOverlay] performLocalCleanup (viewer/guest):', { requesterId });
    
    // Only update local state - no DB operations (host handles DB)
    setActiveGuests(prev => prev.filter(g => g.requesterId !== requesterId));

    // Clear refs
    if (videoRefs.current[requesterId]) {
      videoRefs.current[requesterId] = null;
    }
    if (audioRefs.current[requesterId]) {
      audioRefs.current[requesterId] = null;
    }

    // Clear from guestsWithVideo set
    setGuestsWithVideo(prev => {
      const next = new Set(prev);
      next.delete(requesterId);
      return next;
    });
    
    // Note: Realtime subscription will soon receive DB update from host
  };

  const handleRemoveGuest = async (guestId: number, guestRequesterId: string) => {
    const isLeavingAsGuest = currentUserId === guestRequesterId;
    
    console.log('[GuestVideoOverlay] handleRemoveGuest called:', { guestId, guestRequesterId, isHost, isLeavingAsGuest, currentUserId });
    
    // Only host or the guest themselves can remove
    if (!isHost && !isLeavingAsGuest) {
      console.log('[GuestVideoOverlay] Not authorized to remove guest');
      return;
    }

    try {
      // DELETE the record so they can request again cleanly
      console.log('[GuestVideoOverlay] Attempting to delete guest request:', guestId);
      const { error, count } = await supabase
        .from('guest_requests')
        .delete()
        .eq('id', guestId)
        .select();

      console.log('[GuestVideoOverlay] Delete result:', { error, count });

      if (error) {
        console.error('[GuestVideoOverlay] Error removing guest:', error);
        // Try update as fallback if delete fails due to RLS
        console.log('[GuestVideoOverlay] Trying update to cancelled as fallback...');
        const { error: updateError } = await supabase
          .from('guest_requests')
          .update({ status: 'cancelled' })
          .eq('id', guestId);
        
        if (updateError) {
          console.error('[GuestVideoOverlay] Update fallback also failed:', updateError);
        } else {
          console.log('[GuestVideoOverlay] Update fallback succeeded');
          setActiveGuests((prev) => prev.filter((g) => g.id !== guestId));
        }
      } else {
        console.log('[GuestVideoOverlay] Delete succeeded');
        setActiveGuests((prev) => prev.filter((g) => g.id !== guestId));
        
        // If this guest is leaving, call the callback to stop publishing
        if (isLeavingAsGuest && onGuestLeave) {
          onGuestLeave();
        }
      }
    } catch (err) {
      console.error('[GuestVideoOverlay] Error:', err);
    }
  };

  // Show if there are remote guests OR if current user is a guest (for self-preview)
  const hasRemoteGuests = activeGuests.filter(g => g.requesterId !== currentUserId).length > 0;
  const shouldShow = hasRemoteGuests || isCurrentUserGuest;
  
  if (!shouldShow) return null;

  // Get the current user's guest info for their own box
  const selfGuestInfo = activeGuests.find(g => g.requesterId === currentUserId);
  // Other guests (not self)
  const otherGuests = activeGuests.filter(g => g.requesterId !== currentUserId).slice(0, isCurrentUserGuest ? 1 : 2);

  return (
    <div 
      className="fixed z-40 flex flex-col gap-2 pointer-events-auto right-4"
      style={
        isMobileSize 
          ? { bottom: 'calc(40vh + 5rem)' } // Mobile: above chat and like heart
          : { top: '50%', transform: 'translateY(-50%)' } // Desktop: vertically centered
      }
    >
      {/* Self preview for guest (local video) */}
      {isCurrentUserGuest && selfGuestInfo && (
        <div
          className="relative w-24 h-28 md:w-28 md:h-32 rounded-xl overflow-hidden shadow-2xl border-2 border-green-500/50 bg-black"
        >
          {/* Local Video Element */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted={true} // Mute self to prevent echo
            className="absolute inset-0 w-full h-full object-cover z-10"
            style={{ transform: 'scaleX(-1)' }} // Mirror for self-view
          />

          {/* Fallback if no video yet */}
          {!hasLocalVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-600 to-teal-600 z-0">
              <p className="text-white/70 text-xs">Starting camera...</p>
            </div>
          )}

          {/* You label */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 z-20">
            <p className="text-white text-xs font-medium truncate text-center">
              You (Guest)
            </p>
          </div>

          {/* Leave button */}
          <button
            onClick={() => selfGuestInfo && handleRemoveGuest(selfGuestInfo.id, selfGuestInfo.requesterId)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center transition-colors z-20"
            title="Leave as Guest"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* Other guests (remote video) */}
      {otherGuests.map((guest) => (
        <div
          key={guest.id}
          className="relative w-24 h-28 md:w-28 md:h-32 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black"
        >
          {/* Fallback Avatar (only shown when no video track attached) */}
          {!guestsWithVideo.has(guest.requesterId) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 z-0">
              <Image
                src={getAvatarUrl(guest.avatarUrl)}
                alt={guest.username}
                width={48}
                height={48}
                className="rounded-full"
              />
              <p className="absolute bottom-12 text-white/70 text-xs">Connecting...</p>
            </div>
          )}

          {/* Video Element */}
          <video
            ref={(el) => {
              videoRefs.current[guest.requesterId] = el;
            }}
            autoPlay
            playsInline
            muted={true} // Video element is muted; audio comes from separate audio element
            className={`absolute inset-0 w-full h-full object-cover z-10 ${guestsWithVideo.has(guest.requesterId) ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Audio Element - Separate from video for proper audio track handling */}
          <audio
            ref={(el) => {
              audioRefs.current[guest.requesterId] = el;
            }}
            autoPlay
            playsInline
          />

          {/* Username Label */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 z-20">
            <p className="text-white text-xs font-medium truncate text-center">
              {guest.displayName || guest.username}
            </p>
          </div>

          {/* Volume Control - Only show if this is NOT the guest viewing themselves */}
          {currentUserId !== guest.requesterId && (
            <>
              {/* Speaker icon at top left */}
              <button
                onClick={() => setShowVolumeSlider(showVolumeSlider === guest.requesterId ? null : guest.requesterId)}
                className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center z-20 hover:bg-black/70 transition-colors"
                title="Adjust volume"
              >
                <Volume2 className="w-4 h-4 text-white" />
              </button>

              {/* Vertical slider down the left side - only shows when speaker is pressed */}
              {showVolumeSlider === guest.requesterId && (
                <div className="absolute top-10 left-2 z-20">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={guestVolumes[guest.requesterId] ?? 1.0}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      // Update state to track volume
                      setGuestVolumes(prev => ({ ...prev, [guest.requesterId]: newVolume }));
                      // Apply to audio element immediately
                      const audioEl = audioRefs.current[guest.requesterId];
                      if (audioEl) {
                        audioEl.volume = newVolume;
                      }
                      // Persist to localStorage for this stream + guest
                      if (liveStreamId) {
                        const key = getVolumeStorageKey(liveStreamId, guest.requesterId);
                        localStorage.setItem(key, newVolume.toString());
                        console.log('[GuestVideoOverlay] Saved volume:', key, newVolume);
                      }
                    }}
                    className="w-20 h-1 accent-white cursor-pointer origin-left -rotate-90 translate-y-10"
                    style={{ 
                      WebkitAppearance: 'none',
                      background: 'rgba(255,255,255,0.3)',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Remove Button - Host can remove any guest, Guest can remove themselves */}
          {(isHost || currentUserId === guest.requesterId) && (
            <button
              onClick={() => handleRemoveGuest(guest.id, guest.requesterId)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center transition-colors z-20"
              title={currentUserId === guest.requesterId ? "Leave as Guest" : "Remove Guest"}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}

        </div>
      ))}
    </div>
  );
}
