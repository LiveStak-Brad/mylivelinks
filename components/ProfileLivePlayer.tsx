'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Room, RemoteTrack, RemoteParticipant, Track } from 'livekit-client';
import { createClient } from '@/lib/supabase';
import { Volume2, VolumeX, Gift, Users } from 'lucide-react';
import GiftModal from './GiftModal';
import { LIVE_LAUNCH_ENABLED, isLiveOwnerUser } from '@/lib/livekit-constants';

interface ProfileLivePlayerProps {
  profileId: string;
  username: string;
  liveStreamId?: number;
  className?: string;
}

/**
 * Profile Live Video Player
 * Shows user's live stream directly on their profile when they're broadcasting
 */
export default function ProfileLivePlayer({
  profileId,
  username,
  liveStreamId,
  className = '',
}: ProfileLivePlayerProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [videoTrack, setVideoTrack] = useState<RemoteTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<RemoteTrack | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const supabase = createClient();
  const router = useRouter();
  const wasHiddenRef = useRef(false);
  const roomRef = useRef<Room | null>(null);
  const isOwnProfileRef = useRef(false);
  const [canOpenLive, setCanOpenLive] = useState(false);

  // BANDWIDTH SAVING: Disconnect when user leaves the tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      console.log('[PROFILE_LIVE] Visibility changed:', { isHidden });
      
      if (isHidden) {
        wasHiddenRef.current = true;
        // Disconnect to save bandwidth
        if (roomRef.current) {
          console.log('[PROFILE_LIVE] Page hidden - disconnecting to save bandwidth');
          roomRef.current.disconnect();
          roomRef.current = null;
          setRoom(null);
          setIsConnected(false);
          setVideoTrack(null);
          setAudioTrack(null);
        }
      } else if (wasHiddenRef.current) {
        // User returned - redirect to refresh the page state
        console.log('[PROFILE_LIVE] User returned - reloading for fresh connection');
        wasHiddenRef.current = false;
        window.location.reload();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const allowed = LIVE_LAUNCH_ENABLED || isLiveOwnerUser({ id: user?.id, email: user?.email });
      setCanOpenLive(allowed);
      if (allowed) {
        connectToRoom();
      }
    })();
    loadViewerCount(); // Initial load
    
    // Poll viewer count every 10 seconds
    const interval = setInterval(() => {
      loadViewerCount();
    }, 10000);
    
    // Subscribe to real-time updates for stream status
    const channel = supabase
      .channel(`profile_live_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload: any) => {
          console.log('[PROFILE_LIVE] Stream status changed:', payload);
          
          // If stream ended (live_available = false), disconnect
          if (payload.new && payload.new.live_available === false) {
            console.log('[PROFILE_LIVE] Stream ended, disconnecting...');
            disconnect();
            // Notify parent to hide player
            window.location.reload();
          }
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      disconnect();
    };
  }, [profileId]);

  // Attach tracks to video/audio elements
  useEffect(() => {
    if (videoTrack && videoRef.current) {
      videoTrack.detach();
      videoTrack.attach(videoRef.current);

      const el = videoRef.current;
      const DEBUG = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
      if (DEBUG) {
        const mst: any = (videoTrack as any)?.mediaStreamTrack;
        console.log('[PROFILE_LIVE][VIDEO-AUDIT] attach', {
          profileId,
          trackSid: (videoTrack as any)?.sid,
          element: {
            paused: el?.paused,
            readyState: el?.readyState,
            videoWidth: el?.videoWidth,
            videoHeight: el?.videoHeight,
            currentTime: el?.currentTime,
          },
          mediaStreamTrack: mst
            ? {
                readyState: mst.readyState,
                enabled: mst.enabled,
                muted: mst.muted,
                settings: typeof mst.getSettings === 'function' ? mst.getSettings() : null,
              }
            : null,
        });
      }

      el.play().catch((err) => {
        if (DEBUG) {
          console.log('[PROFILE_LIVE][VIDEO-AUDIT] play() rejected', { profileId, err: String(err) });
        }
      });
    }
    return () => {
      if (videoTrack && videoRef.current) {
        videoTrack.detach(videoRef.current);
      }
    };
  }, [videoTrack]);

  useEffect(() => {
    if (audioTrack && audioRef.current) {
      console.log('[PROFILE_LIVE] Attaching audio track', {
        trackKind: audioTrack.kind,
        audioElement: !!audioRef.current,
      });
      
      // Detach first to avoid conflicts
      audioTrack.detach();
      
      // Attach to audio element
      const element = audioTrack.attach(audioRef.current);
      
      const shouldMuteForEcho = isOwnProfileRef.current;

      // CRITICAL: Ensure audio is enabled and playing
      if (audioRef.current) {
        audioRef.current.muted = shouldMuteForEcho || isMuted;
        audioRef.current.volume = shouldMuteForEcho || isMuted ? 0 : volume / 100;
        if (!shouldMuteForEcho) {
          audioRef.current.play().catch(err => {
            console.warn('[PROFILE_LIVE] Audio autoplay blocked:', err);
          });
        }
      }
      
      console.log('[PROFILE_LIVE] Audio attached successfully', {
        volume: audioRef.current?.volume,
        muted: audioRef.current?.muted,
        paused: audioRef.current?.paused,
      });
    }
    return () => {
      if (audioTrack && audioRef.current) {
        console.log('[PROFILE_LIVE] Detaching audio track');
        audioTrack.detach(audioRef.current);
      }
    };
  }, [audioTrack]);
  
  // Apply volume settings whenever they change
  useEffect(() => {
    if (audioRef.current && audioTrack) {
      const shouldMuteForEcho = isOwnProfileRef.current;
      audioRef.current.volume = shouldMuteForEcho || isMuted ? 0 : volume / 100;
      audioRef.current.muted = shouldMuteForEcho || isMuted;
      console.log('[PROFILE_LIVE] Volume updated:', {
        volume: audioRef.current.volume,
        muted: audioRef.current.muted,
        hasAudioTrack: !!audioTrack,
      });
    }
  }, [isMuted, volume, audioTrack]);

  const loadViewerCount = async () => {
    if (!liveStreamId) return;
    
    try {
      const { count } = await supabase
        .from('active_viewers')
        .select('*', { count: 'exact', head: true })
        .eq('live_stream_id', liveStreamId)
        .eq('is_active', true)
        .eq('is_unmuted', true)
        .eq('is_visible', true)
        .eq('is_subscribed', true)
        .gt('last_active_at', new Date(Date.now() - 60000).toISOString());
      
      setViewerCount(count || 0);
    } catch (error) {
      console.error('[PROFILE_LIVE] Error loading viewer count:', error);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
      audioRef.current.volume = newMuted ? 0 : volume / 100;
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
      // Unmute if changing volume from 0
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const connectToRoom = async () => {
    try {
      console.log('[PROFILE_LIVE] Connecting for user:', profileId);
      
      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('[PROFILE_LIVE] User not authenticated');
        return;
      }
      
      const isOwnProfile = user.id === profileId;
      isOwnProfileRef.current = isOwnProfile;
      console.log('[PROFILE_LIVE] Is own profile:', isOwnProfile);

      // Get LiveKit token as viewer
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: 'live_central',
          participantName: user.email || `viewer_${user.id.substring(0, 8)}`,
          canPublish: false, // Viewer only
          canSubscribe: true,
          deviceType: 'web',
          deviceId: `profile_viewer_${Date.now()}`,
          sessionId: `session_${Date.now()}`,
        }),
      });

      const { token, url } = await response.json();

      if (!token || !url) {
        console.error('[PROFILE_LIVE] No token received');
        return;
      }

      // Connect to LiveKit room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      await newRoom.connect(url, token);
      roomRef.current = newRoom;
      setRoom(newRoom);
      setIsConnected(true);

      console.log('[PROFILE_LIVE] Connected to room', {
        remoteParticipants: newRoom.remoteParticipants.size,
        localParticipant: newRoom.localParticipant.identity,
        isOwnProfile,
      });
      
      void subscribeToParticipant(newRoom, profileId);

      // Listen for new participants (when not own profile)
      newRoom.on('participantConnected', (participant: RemoteParticipant) => {
        console.log('[PROFILE_LIVE] Participant connected:', participant.identity);
        const participantUserId = extractUserId(participant.identity);
        if (participantUserId === profileId) {
          console.log('[PROFILE_LIVE] Target user connected!');
          void subscribeToParticipant(newRoom, profileId);
        }
      });

      // Handle track subscribed
      newRoom.on('trackSubscribed', (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        console.log('[PROFILE_LIVE] Track subscribed:', track.kind, 'from', participant.identity);
        const participantUserId = extractUserId(participant.identity);
        if (participantUserId === profileId) {
          console.log('[PROFILE_LIVE] Track is from target user!');
          if (track.kind === Track.Kind.Video) {
            console.log('[PROFILE_LIVE] Setting video track');
            setVideoTrack(track);
          } else if (track.kind === Track.Kind.Audio) {
            console.log('[PROFILE_LIVE] Setting audio track');
            if (!isOwnProfileRef.current) {
              setAudioTrack(track);
            }
          }
        }
      });

      // Handle track unsubscribed
      newRoom.on('trackUnsubscribed', (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        const participantUserId = extractUserId(participant.identity);
        if (participantUserId === profileId) {
          if (track.kind === Track.Kind.Video) {
            setVideoTrack(null);
          } else if (track.kind === Track.Kind.Audio) {
            setAudioTrack(null);
          }
        }
      });

    } catch (error) {
      console.error('[PROFILE_LIVE] Connection error:', error);
    }
  };

  const subscribeToParticipant = async (room: Room, userId: string) => {
    const participants = Array.from(room.remoteParticipants.values());
    
    console.log('[PROFILE_LIVE] Looking for user:', userId);
    console.log('[PROFILE_LIVE] Available participants:', participants.map(p => ({
      identity: p.identity,
      extractedId: extractUserId(p.identity),
      hasVideo: Array.from(p.trackPublications.values()).some(pub => pub.kind === Track.Kind.Video),
      hasAudio: Array.from(p.trackPublications.values()).some(pub => pub.kind === Track.Kind.Audio)
    })));
    
    for (const participant of participants) {
      const participantUserId = extractUserId(participant.identity);
      
      console.log('[PROFILE_LIVE] Checking participant:', participantUserId, 'vs', userId);
      
      if (participantUserId === userId) {
        console.log('[PROFILE_LIVE] Found matching participant!');

        const publications = Array.from(participant.trackPublications.values());
        for (const pub of publications) {
          const source = (pub as any)?.source as Track.Source | undefined;
          const isPreferred =
            source === Track.Source.ScreenShare ||
            source === Track.Source.ScreenShareAudio ||
            source === Track.Source.Camera ||
            source === Track.Source.Microphone;

          if (!isPreferred) continue;
          if (pub.isSubscribed) continue;
          try {
            await (pub as any).setSubscribed(true);
            console.log('[PROFILE_LIVE] setSubscribed(true)', {
              kind: pub.kind,
              source,
              trackSid: pub.trackSid,
            });
          } catch (err: any) {
            console.warn('[PROFILE_LIVE] setSubscribed(true) failed', {
              kind: pub.kind,
              source,
              trackSid: pub.trackSid,
              err: err?.message || String(err),
            });
          }
        }
        
        const videoPubs = publications.filter((p) => p.kind === Track.Kind.Video);
        const screenVideoPub = videoPubs.find((p: any) => p?.source === Track.Source.ScreenShare && !!p.track);
        const cameraVideoPub = videoPubs.find((p: any) => p?.source === Track.Source.Camera && !!p.track);
        const anyVideoPub = videoPubs.find((p) => !!p.track);
        const chosenVideoPub: any = screenVideoPub || cameraVideoPub || anyVideoPub;

        if (chosenVideoPub?.track) {
          console.log('[PROFILE_LIVE] Found video track, attaching...', {
            source: chosenVideoPub.source,
            trackSid: chosenVideoPub.trackSid,
          });
          setVideoTrack(chosenVideoPub.track as RemoteTrack);
        } else {
          console.log('[PROFILE_LIVE] No video track found');
        }

        // Subscribe to audio track
        const audioPubs = publications.filter((p) => p.kind === Track.Kind.Audio);
        const screenAudioPub = audioPubs.find((p: any) => p?.source === Track.Source.ScreenShareAudio && !!p.track);
        const micPub = audioPubs.find((p: any) => p?.source === Track.Source.Microphone && !!p.track);
        const anyAudioPub = audioPubs.find((p) => !!p.track);
        const chosenAudioPub: any = screenAudioPub || micPub || anyAudioPub;
        if (chosenAudioPub?.track) {
          console.log('[PROFILE_LIVE] Found audio track, attaching...', {
            source: chosenAudioPub.source,
            trackSid: chosenAudioPub.trackSid,
          });
          if (!isOwnProfileRef.current) {
            setAudioTrack(chosenAudioPub.track as RemoteTrack);
          }
        } else {
          console.log('[PROFILE_LIVE] No audio track found');
        }
        break;
      }
    }
  };

  const extractUserId = (identity: string): string => {
    // Identity format: u_<userId>:web:<deviceId>:<sessionId>
    if (identity.startsWith('u_')) {
      const parts = identity.split(':');
      if (parts.length >= 1) {
        return parts[0].substring(2); // Remove "u_" prefix
      }
    }
    return identity;
  };

  const disconnect = () => {
    if (room) {
      room.disconnect();
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setVideoTrack(null);
      setAudioTrack(null);
    }
  };

  return (
    <div className={`relative w-full bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
      />

      {/* Audio Element - MUST be visible for autoplay */}
      <audio 
        ref={audioRef} 
        autoPlay 
        playsInline
        muted={false}
        style={{ position: 'absolute', bottom: 0, left: 0, width: '1px', height: '1px', opacity: 0 }}
      />

      {/* Loading indicator */}
      {isConnected && !videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white text-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Connecting to live stream...</p>
          </div>
        </div>
      )}

      {/* Overlay Controls - Only show when video is playing */}
      {videoTrack && (
        <>
          {/* Top Bar - LIVE on left, Viewers on right */}
          <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/50 to-transparent z-10 flex items-center justify-between">
            {/* LIVE Badge - Smaller */}
            <div className="flex items-center gap-1.5 bg-red-500 text-white px-2.5 py-1 rounded-full shadow-lg">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="font-bold text-xs">LIVE</span>
            </div>
            
            {/* Viewer Count - Right side */}
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full">
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold text-xs">{viewerCount}</span>
            </div>
          </div>

          {/* Bottom Bar - Compact controls */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent z-10">
            <div className="flex items-center justify-between gap-2">
              {/* Volume Control - Expandable */}
              <div 
                className="relative flex items-center"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex items-center justify-center w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-black/80 transition-all z-10"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                
                {/* Expandable Horizontal Volume Slider - seamlessly connected */}
                {showVolumeSlider && (
                  <div 
                    className="absolute left-6 bottom-0 bg-black/80 backdrop-blur-sm rounded-r-full pl-4 pr-3 py-2 shadow-xl transition-all flex items-center gap-2"
                  >
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                      className="w-20 h-1 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-white/30 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                    />
                    <span className="text-white text-xs font-medium min-w-[2rem] text-center">{volume}%</span>
                  </div>
                )}
              </div>

              {/* Gift Button - Smaller */}
              <button
                onClick={() => setShowGiftModal(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg text-xs font-semibold"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Gift</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Gift Modal */}
      {showGiftModal && (
        <GiftModal
          recipientId={profileId}
          recipientUsername={username}
          liveStreamId={liveStreamId}
          onGiftSent={() => {
            console.log('Gift sent!');
            loadViewerCount(); // Refresh viewer count after gift
          }}
          onClose={() => setShowGiftModal(false)}
        />
      )}
    </div>
  );
}

