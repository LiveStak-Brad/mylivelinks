'use client';

import { useEffect, useState, useRef } from 'react';
import { Room, RemoteTrack, RemoteParticipant, Track } from 'livekit-client';
import { createClient } from '@/lib/supabase';
import { Volume2, VolumeX, Gift, Users } from 'lucide-react';
import GiftModal from './GiftModal';

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
  const [viewerCount, setViewerCount] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const supabase = createClient();

  useEffect(() => {
    connectToRoom();
    loadViewerCount(); // Initial load
    
    // Poll viewer count every 10 seconds
    const interval = setInterval(() => {
      loadViewerCount();
    }, 10000);
    
    return () => {
      clearInterval(interval);
      disconnect();
    };
  }, [profileId]);

  // Attach tracks to video/audio elements
  useEffect(() => {
    if (videoTrack && videoRef.current) {
      videoTrack.attach(videoRef.current);
    }
    return () => {
      if (videoTrack && videoRef.current) {
        videoTrack.detach(videoRef.current);
      }
    };
  }, [videoTrack]);

  useEffect(() => {
    if (audioTrack && audioRef.current) {
      audioTrack.attach(audioRef.current);
      // Apply volume settings
      audioRef.current.volume = isMuted ? 0 : volume / 100;
      audioRef.current.muted = isMuted;
    }
    return () => {
      if (audioTrack && audioRef.current) {
        audioTrack.detach(audioRef.current);
      }
    };
  }, [audioTrack, isMuted, volume]);

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
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      audioRef.current.volume = isMuted ? volume / 100 : 0;
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = newVolume / 100;
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
      setRoom(newRoom);
      setIsConnected(true);

      console.log('[PROFILE_LIVE] Connected to room, participants:', newRoom.remoteParticipants.size);

      // Subscribe to remote participant tracks (the streamer)
      subscribeToParticipant(newRoom, profileId);

      // Listen for new participants
      newRoom.on('participantConnected', (participant: RemoteParticipant) => {
        console.log('[PROFILE_LIVE] Participant connected:', participant.identity);
        const participantUserId = extractUserId(participant.identity);
        if (participantUserId === profileId) {
          console.log('[PROFILE_LIVE] Target user connected!');
          subscribeToParticipant(newRoom, profileId);
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
            setAudioTrack(track);
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

  const subscribeToParticipant = (room: Room, userId: string) => {
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
        
        // Subscribe to video track
        const videoPublication = Array.from(participant.trackPublications.values()).find(
          pub => pub.kind === Track.Kind.Video
        );
        if (videoPublication && videoPublication.track) {
          console.log('[PROFILE_LIVE] Found video track, subscribing...');
          setVideoTrack(videoPublication.track as RemoteTrack);
        } else {
          console.log('[PROFILE_LIVE] No video track found');
        }

        // Subscribe to audio track
        const audioPublication = Array.from(participant.trackPublications.values()).find(
          pub => pub.kind === Track.Kind.Audio
        );
        if (audioPublication && audioPublication.track) {
          console.log('[PROFILE_LIVE] Found audio track, subscribing...');
          setAudioTrack(audioPublication.track as RemoteTrack);
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

      {/* Audio Element (hidden) */}
      <audio ref={audioRef} autoPlay />

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
          {/* Top Bar - Live indicator & Viewer count */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Live Badge */}
              <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="font-semibold text-sm">LIVE</span>
              </div>
              
              {/* Viewer Count */}
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm text-white px-3 py-2 rounded-full">
                <Users className="w-4 h-4" />
                <span className="font-medium text-sm">{viewerCount}</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar - Volume & Gift controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
            <div className="flex items-center justify-between">
              {/* Volume Controls */}
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-full px-3 py-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-blue-400 transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  className="w-24 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, white ${volume}%, rgba(255,255,255,0.3) ${volume}%)`,
                  }}
                />
                <span className="text-white text-sm font-medium w-8">{volume}%</span>
              </div>

              {/* Gift Button */}
              <button
                onClick={() => setShowGiftModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
              >
                <Gift className="w-5 h-5" />
                <span className="font-semibold">Send Gift</span>
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

