'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Volume2 } from 'lucide-react';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { createClient } from '@/lib/supabase';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, Track, TrackPublication } from 'livekit-client';

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
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const [showVolumeSlider, setShowVolumeSlider] = useState<string | null>(null); // Track which guest's slider is open
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Track window width for responsive positioning
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileSize = windowWidth < 768;

  // Load accepted guests from database
  useEffect(() => {
    if (!liveStreamId) return;

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

  // Attach video tracks from LiveKit room
  useEffect(() => {
    if (!room || activeGuests.length === 0) return;

    const attachGuestTracks = () => {
      activeGuests.forEach((guest) => {
        // Find participant by identity matching guest's user ID
        const participant = Array.from(room.remoteParticipants.values()).find(
          (p) => p.identity.includes(guest.requesterId)
        );

        if (participant) {
          participant.trackPublications.forEach((publication) => {
            if (publication.track) {
              const videoEl = videoRefs.current[guest.requesterId];
              if (publication.kind === Track.Kind.Video && videoEl) {
                publication.track.attach(videoEl);
              }
            }
          });
        }
      });
    };

    // Initial attach
    attachGuestTracks();

    // Listen for new tracks
    const handleTrackSubscribed = (
      track: RemoteTrack,
      publication: TrackPublication,
      participant: RemoteParticipant
    ) => {
      const guest = activeGuests.find((g) =>
        participant.identity.includes(g.requesterId)
      );
      if (guest) {
        const videoEl = videoRefs.current[guest.requesterId];
        if (track.kind === Track.Kind.Video && videoEl) {
          track.attach(videoEl);
        }
      }
    };

    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      track.detach();
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [room, activeGuests]);

  const handleRemoveGuest = async (guestId: number, guestRequesterId: string) => {
    const isLeavingAsGuest = currentUserId === guestRequesterId;
    
    // Only host or the guest themselves can remove
    if (!isHost && !isLeavingAsGuest) return;

    try {
      // DELETE the record so they can request again cleanly
      const { error } = await supabase
        .from('guest_requests')
        .delete()
        .eq('id', guestId);

      if (error) {
        console.error('[GuestVideoOverlay] Error removing guest:', error);
      } else {
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

  if (activeGuests.length === 0) return null;

  return (
    <div 
      className="fixed z-40 flex flex-col gap-2 pointer-events-auto right-4"
      style={
        isMobileSize 
          ? { bottom: 'calc(40vh + 5rem)' } // Mobile: above chat and like heart
          : { top: '50%', transform: 'translateY(-50%)' } // Desktop: vertically centered
      }
    >
      {activeGuests.slice(0, 2).map((guest, index) => (
        <div
          key={guest.id}
          className="relative w-28 h-40 md:w-32 md:h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black"
          style={{
            // Slight offset for visual interest
            transform: index === 1 ? 'translateX(-8px)' : undefined,
          }}
        >
          {/* Fallback Avatar (shown behind video when no video track) */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 z-0">
            <Image
              src={getAvatarUrl(guest.avatarUrl)}
              alt={guest.username}
              width={48}
              height={48}
              className="rounded-full"
            />
          </div>

          {/* Video Element (in front of avatar) */}
          <video
            ref={(el) => {
              videoRefs.current[guest.requesterId] = el;
            }}
            autoPlay
            playsInline
            muted={false}
            className="absolute inset-0 w-full h-full object-cover z-10"
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
                    defaultValue="0.7"
                    onChange={(e) => {
                      const videoEl = videoRefs.current[guest.requesterId];
                      if (videoEl) {
                        videoEl.volume = parseFloat(e.target.value);
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
