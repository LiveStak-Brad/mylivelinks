'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { X, Eye, Camera, Users } from 'lucide-react';
import { Room, RoomEvent } from 'livekit-client';
import { LIVEKIT_ROOM_NAME, DEBUG_LIVEKIT, TOKEN_ENDPOINT } from '@/lib/livekit-constants';
import { canUserGoLive } from '@/lib/livekit-constants';
import Chat from './Chat';
import GoLiveButton from './GoLiveButton';

/**
 * Solo Host Stream Component
 * 
 * Full-screen host interface (matches mobile SoloHostStreamScreen).
 * Features:
 * - Full-screen camera preview
 * - Overlaid controls (mobile-style)
 * - Semi-transparent chat overlay (bottom 1/3)
 * - Go Live button centered at bottom
 * - Exit button top-left
 * - Live status + viewer count top-center
 */
export default function SoloHostStream() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [canGoLive, setCanGoLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // LiveKit room connection
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const isConnectingRef = useRef(false);

  // Check if user can go live
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('You must be logged in to go live');
          setLoading(false);
          return;
        }

        const canLive = canUserGoLive({ id: user.id, email: user.email });
        
        if (!canLive) {
          setError('Go Live is currently limited to the owner account');
          setLoading(false);
          return;
        }

        setCurrentUserId(user.id);
        setCanGoLive(true);

        // Get username
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCurrentUsername(profile.username);
        }

        // Check if already live
        const { data: liveStream } = await supabase
          .from('live_streams')
          .select('id, live_available')
          .eq('profile_id', user.id)
          .single();
        
        if (liveStream?.live_available) {
          setIsLive(true);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('[SoloHostStream] Error checking auth:', err);
        setError('Failed to load stream settings');
        setLoading(false);
      }
    };

    checkAuth();
  }, [supabase]);

  // Connect to LiveKit room
  useEffect(() => {
    if (!canGoLive || !currentUserId || isConnectingRef.current) return;

    isConnectingRef.current = true;

    const connectToRoom = async () => {
      try {
        if (DEBUG_LIVEKIT) {
          console.log('[SoloHostStream] Connecting to room as host...');
        }

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        // Get LiveKit token with HOST permissions
        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            roomName: LIVEKIT_ROOM_NAME,
            participantName: `host_${currentUsername || currentUserId}`,
            canPublish: true,  // HOST MODE
            canSubscribe: true,
            deviceType: 'web',
            deviceId: `solo_host_${Date.now()}`,
            sessionId: `host_${Date.now()}`,
            role: 'host',
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to get token: ${tokenResponse.status}`);
        }

        const { token, url } = await tokenResponse.json();

        if (!token || !url) {
          throw new Error('Invalid token response');
        }

        if (DEBUG_LIVEKIT) {
          console.log('[SoloHostStream] Token received, connecting...', {
            canPublish: true,
            role: 'host'
          });
        }

        await room.connect(url, token);
        setIsRoomConnected(true);

        if (DEBUG_LIVEKIT) {
          console.log('[SoloHostStream] Connected to room as HOST', {
            canPublish: room.localParticipant.permissions?.canPublish,
            roomState: room.state
          });
        }

        // Room event handlers
        room.on(RoomEvent.Disconnected, () => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloHostStream] Disconnected from room');
          }
          setIsRoomConnected(false);
          isConnectingRef.current = false;
        });

        room.on(RoomEvent.Reconnecting, () => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloHostStream] Reconnecting to room...');
          }
        });

        room.on(RoomEvent.Reconnected, () => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloHostStream] Reconnected to room');
          }
          setIsRoomConnected(true);
        });

        // Track participant count
        room.on(RoomEvent.ParticipantConnected, () => {
          setViewerCount(room.remoteParticipants.size);
        });

        room.on(RoomEvent.ParticipantDisconnected, () => {
          setViewerCount(room.remoteParticipants.size);
        });

        isConnectingRef.current = false;

      } catch (err) {
        console.error('[SoloHostStream] Error connecting to room:', err);
        setError('Failed to connect to streaming server');
        isConnectingRef.current = false;
      }
    };

    connectToRoom();

    // Cleanup: disconnect on unmount
    return () => {
      if (DEBUG_LIVEKIT) {
        console.log('[SoloHostStream] Cleanup: disconnecting room');
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      isConnectingRef.current = false;
      setIsRoomConnected(false);
    };
  }, [canGoLive, currentUserId, currentUsername, supabase]);

  // Update viewer count from database
  useEffect(() => {
    if (!currentUserId || !isLive) return;

    const updateViewerCount = async () => {
      const { data } = await supabase
        .from('live_streams')
        .select('active_viewer_count')
        .eq('profile_id', currentUserId)
        .single();
      
      if (data) {
        setViewerCount(data.active_viewer_count || 0);
      }
    };

    updateViewerCount();
    const interval = setInterval(updateViewerCount, 5000);

    return () => clearInterval(interval);
  }, [currentUserId, isLive, supabase]);

  const handleExit = () => {
    if (isLive || isPublishing) {
      if (confirm('Are you sure you want to exit? This will end your stream.')) {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-gray-400">Loading stream settings...</p>
        </div>
      </div>
    );
  }

  if (error || !canGoLive) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {error || 'Access Denied'}
          </h1>
          <p className="text-gray-400 mb-6">
            {error || 'You do not have permission to access the streaming interface.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Top Bar - Overlaid on video (mobile-style) */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        {/* Exit Button */}
        <button
          onClick={handleExit}
          className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          title="Exit"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {!isRoomConnected && (
            <div className="flex items-center gap-2 bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              Connecting...
            </div>
          )}

          {isLive && isPublishing && (
            <div className="flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-xs font-bold">LIVE</span>
              <div className="flex items-center gap-1 ml-1">
                <Eye className="w-3 h-3 text-white" />
                <span className="text-white text-xs font-semibold">{viewerCount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Placeholder for symmetry */}
        <div className="w-10" />
      </div>

      {/* Main Content - Full-screen Camera Preview */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        {!isPublishing && (
          <div className="text-center text-white px-4">
            <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">Ready to Go Live</h2>
            <p className="text-gray-400 text-sm">Click the button below to start streaming</p>
            {currentUsername && (
              <p className="text-gray-500 text-xs mt-2">Streaming as @{currentUsername}</p>
            )}
          </div>
        )}
        {/* Local video track will be attached here by GoLiveButton */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: isPublishing ? 'block' : 'none' }}
        />
      </div>

      {/* Semi-transparent Chat Overlay (bottom 1/3 of screen) */}
      {isLive && (
        <div className="absolute bottom-20 left-0 right-0 h-1/3 bg-black/40 backdrop-blur-sm overflow-hidden">
          <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Live Chat
              </h3>
              <span className="text-xs text-gray-300">{viewerCount} watching</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls - Centered button */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col items-center p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        {/* Go Live Button (large, centered) */}
        <div className="flex items-center justify-center">
          <GoLiveButton
            sharedRoom={roomRef.current}
            isRoomConnected={isRoomConnected}
            onLiveStatusChange={(live) => setIsLive(live)}
            onPublishingChange={(publishing) => setIsPublishing(publishing)}
            publishAllowed={isRoomConnected}
          />
        </div>
      </div>
    </div>
  );
}
