'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveKitPublisher } from '@/hooks/useLiveKitPublisher';
import { createClient } from '@/lib/supabase';
import { LocalVideoTrack, LocalAudioTrack, Room } from 'livekit-client';

interface GoLiveButtonProps {
  sharedRoom?: Room | null; // Shared LiveKit room connection
  isRoomConnected?: boolean; // Whether shared room is connected
  onLiveStatusChange?: (isLive: boolean) => void;
  onPublishingChange?: (isPublishing: boolean) => void; // NEW: Report publishing state
  onGoLive?: (liveStreamId: number, profileId: string) => void;
  publishAllowed?: boolean;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
}

// Source types for video input
type VideoSourceType = 'camera' | 'screen';

// Check if screen sharing is supported
function isScreenShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 
         'mediaDevices' in navigator && 
         'getDisplayMedia' in navigator.mediaDevices;
}

export default function GoLiveButton({ sharedRoom, isRoomConnected = false, onLiveStatusChange, onPublishingChange, onGoLive, publishAllowed = true }: GoLiveButtonProps) {
  const [isLive, setIsLive] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [devices, setDevices] = useState<{ video: DeviceInfo[]; audio: DeviceInfo[] }>({ video: [], audio: [] });
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [previewVideoRef, setPreviewVideoRef] = useState<HTMLVideoElement | null>(null);
  
  // Screen share state
  const [videoSourceType, setVideoSourceType] = useState<VideoSourceType>('camera');
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareSupported] = useState(() => isScreenShareSupported());
  const isLiveRef = useRef(false); // Track current state to prevent unnecessary updates
  const lastLiveStateRef = useRef<boolean | null>(null); // Track last state to prevent rapid changes
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce state updates
  const stopPublishingRef = useRef<((reason?: string) => Promise<void>) | null>(null); // Store stopPublishing function for realtime handler
  const isPublishingRef = useRef(false); // Store isPublishing state for realtime handler
  const supabase = createClient();

  const sendStreamCleanupBeacon = (reason: string) => {
    try {
      if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
      const payload = JSON.stringify({ action: 'end_stream', reason });
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/stream-cleanup', blob);
    } catch {
      // ignore
    }
  };

  // Get current user's live stream (only on mount, not when callbacks change)
  useEffect(() => {
    let channel: any = null;
    
    const loadLiveStream = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('live_streams')
        .select('id, live_available')
        .eq('profile_id', user.id)
        .single();

      if (data) {
        const d = data as any;
        const liveState = d.live_available || false;
        // Set initial state without debounce (first load)
        lastLiveStateRef.current = liveState;
        isLiveRef.current = liveState;
        setIsLive(liveState);
        setLiveStreamId(d.id);
        onLiveStatusChange?.(liveState);
      }

      // Subscribe to changes for this user's live stream only
      // Only update state when live_available actually changes to prevent flashing
      channel = supabase
        .channel(`user-live-stream-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'live_streams',
            filter: `profile_id=eq.${user.id}`,
          },
          (payload: any) => {
            const newData = payload.new as any;
            const oldData = payload.old as any;
            // Only update if live_available actually changed
            if (oldData?.live_available !== newData?.live_available) {
              const newLiveState = newData.live_available || false;
              
              // CRITICAL: If live_available becomes false (user stopped via database update),
              // we need to stop publishing explicitly
              if (!newLiveState && isLiveRef.current && isPublishingRef.current && stopPublishingRef.current) {
                console.log('Database updated: live_available=false, stopping publishing...');
                // Stop publishing when database says user is no longer live
                stopPublishingRef.current('live_available=false from DB').catch((err) => {
                  console.error('Error stopping publishing after database update:', err);
                });
              }
              
              // Debounce rapid updates - clear any pending timeout
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
              }
              
              // Only update if state actually changed (prevent unnecessary re-renders)
              if (lastLiveStateRef.current !== newLiveState) {
                // Debounce the update slightly to prevent rapid flashing
                updateTimeoutRef.current = setTimeout(() => {
                  // Double-check state hasn't changed again during debounce
                  if (lastLiveStateRef.current !== newLiveState) {
                    lastLiveStateRef.current = newLiveState;
                    isLiveRef.current = newLiveState;
                    setIsLive(newLiveState);
                    setLiveStreamId(newData.id || null);
                    onLiveStatusChange?.(newLiveState);
                  }
                }, 100); // 100ms debounce
              }
            }
          }
        )
        .subscribe();
    };

    loadLiveStream();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [supabase]); // Removed onLiveStatusChange from deps to prevent loops

  // Get current user's profile for participant name
  const [participantName, setParticipantName] = useState('Streamer');
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', user.id)
          .single()
          .then(({ data }: { data: any }) => {
            if (data) {
              setParticipantName(data.display_name || data.username);
            }
          });
      }
    });
  }, [supabase]);

  // Load available devices
  useEffect(() => {
    if (showDeviceModal) {
      loadDevices();
    } else {
      // Stop preview when modal closes
      stopPreview();
    }
  }, [showDeviceModal]);

  // Update preview when device selection changes
  useEffect(() => {
    if (showDeviceModal && selectedVideoDevice && selectedAudioDevice && previewStream) {
      startPreview(undefined, selectedVideoDevice, selectedAudioDevice);
    }
  }, [selectedVideoDevice, selectedAudioDevice]);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  // BANDWIDTH SAVING: Stop publishing if user leaves the page while streaming
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = async () => {
      // Use ref to check current publishing state (avoids stale closure)
      if (document.hidden && isPublishingRef.current && stopPublishingRef.current) {
        console.log('[GO_LIVE] Page hidden while publishing - stopping stream');
        try {
          // Stop publishing immediately
          await stopPublishingRef.current('visibility_hidden');

          // Best-effort: also update DB while page is still alive (more reliable than beacon)
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('live_streams')
                .update({ live_available: false, ended_at: new Date().toISOString() })
                .eq('profile_id', user.id);

              await supabase
                .from('user_grid_slots')
                .delete()
                .eq('streamer_id', user.id);
            }
          } catch (dbErr) {
            console.warn('[GO_LIVE] Failed DB cleanup on visibility change (will rely on beacon/webhook):', dbErr);
          }

          sendStreamCleanupBeacon('visibility_hidden');
        } catch (err) {
          console.error('[GO_LIVE] Error stopping stream on visibility change:', err);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePageHide = () => {
      if (isPublishingRef.current) {
        sendStreamCleanupBeacon('pagehide');
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (isPublishingRef.current) {
        sendStreamCleanupBeacon('component_unmount');
      }
    };
  }, []);

  const loadDevices = async () => {
    try {
      // Request permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Get device list
      const videoDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = videoDevices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({ deviceId: device.deviceId, label: device.label || `Camera ${device.deviceId.slice(0, 8)}` }));
      
      const audioInputs = videoDevices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({ deviceId: device.deviceId, label: device.label || `Microphone ${device.deviceId.slice(0, 8)}` }));

      setDevices({ video: videoInputs, audio: audioInputs });
      
      // Set defaults (first device)
      if (videoInputs.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
      if (audioInputs.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }

      // Start preview with default devices
      startPreview(stream, videoInputs[0]?.deviceId, audioInputs[0]?.deviceId);
    } catch (err: any) {
      console.error('Error loading devices:', err);
      setPermissionError(err.message || 'Failed to access camera/microphone');
    }
  };

  const startPreview = async (existingStream?: MediaStream, videoId?: string, audioId?: string) => {
    try {
      // Stop existing preview
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: videoId || selectedVideoDevice 
          ? { deviceId: { exact: videoId || selectedVideoDevice } }
          : true,
        audio: audioId || selectedAudioDevice
          ? { deviceId: { exact: audioId || selectedAudioDevice } }
          : true,
      };

      const stream = existingStream || await navigator.mediaDevices.getUserMedia(constraints);
      setPreviewStream(stream);

      // Attach to video element
      if (previewVideoRef) {
        previewVideoRef.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Error starting preview:', err);
      setPermissionError(err.message || 'Failed to start camera preview');
    }
  };

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
    if (previewVideoRef) {
      previewVideoRef.srcObject = null;
    }
  };

  // Handle starting screen share
  const handleStartScreenShare = async () => {
    try {
      setPermissionError(null);
      
      // Request screen share
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          displaySurface: 'monitor',
        } as MediaTrackConstraints,
        audio: true, // Request system audio (may not be supported on all platforms)
      };

      const screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      
      // Stop current preview
      stopPreview();
      
      // Set up screen share preview
      setPreviewStream(screenStream);
      setVideoSourceType('screen');
      setIsScreenSharing(true);
      setShowScreenShareModal(false);
      
      // Use a special device ID to indicate screen share
      setSelectedVideoDevice('screen-share');
      
      // Attach to preview element
      if (previewVideoRef) {
        previewVideoRef.srcObject = screenStream;
      }
      
      // Listen for when user stops screen share via browser UI
      screenStream.getVideoTracks()[0].onended = () => {
        console.log('Screen share ended by user');
        setIsScreenSharing(false);
        setVideoSourceType('camera');
        setPreviewStream(null);
        // Re-load camera devices
        if (devices.video.length > 0) {
          setSelectedVideoDevice(devices.video[0].deviceId);
          startPreview(undefined, devices.video[0].deviceId, selectedAudioDevice);
        }
      };
      
    } catch (err: any) {
      console.error('Error starting screen share:', err);
      if (err.name === 'NotAllowedError') {
        setPermissionError('Screen share was cancelled or denied. Please try again and select a screen to share.');
      } else {
        setPermissionError(err.message || 'Failed to start screen share');
      }
      setShowScreenShareModal(false);
    }
  };

  // Handle switching back from screen share to camera
  const handleSwitchToCamera = async () => {
    stopPreview();
    setIsScreenSharing(false);
    setVideoSourceType('camera');
    
    if (devices.video.length > 0) {
      setSelectedVideoDevice(devices.video[0].deviceId);
      await startPreview(undefined, devices.video[0].deviceId, selectedAudioDevice);
    }
  };

  // Publisher enable logic: Go Live publishes immediately when room connected + devices ready
  // NOT tied to viewer counts, presence, is_published, or tile placement
  const shouldEnablePublisher = useMemo(() => {
    const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
    
    const hasRequiredDevices = !!(selectedVideoDevice && selectedAudioDevice && liveStreamId);
    const enabled = !!(publishAllowed && isLive && hasRequiredDevices && isRoomConnected && sharedRoom);
    
    if (DEBUG_LIVEKIT) {
      console.log('[PUBLISH] Go Live enable check', {
        enabled,
        publishAllowed,
        isLive,
        hasRequiredDevices,
        isRoomConnected,
        hasSharedRoom: !!sharedRoom,
        isScreenSharing,
        selectedVideoDevice,
        selectedAudioDevice,
        liveStreamId,
        reason: enabled ? 'publishing immediately (Go Live clicked)' : 'waiting for requirements',
      });
    }
    return enabled;
  }, [publishAllowed, isLive, selectedVideoDevice, selectedAudioDevice, liveStreamId, isRoomConnected, sharedRoom]);
  const [isPublishingState, setIsPublishingState] = useState(false);
  
  const { isPublishing, error, startPublishing, stopPublishing } = useLiveKitPublisher({
    room: sharedRoom || null,
    isRoomConnected,
    enabled: shouldEnablePublisher,
    videoDeviceId: videoSourceType === 'camera' ? selectedVideoDevice : undefined,
    audioDeviceId: selectedAudioDevice,
    isScreenShare: videoSourceType === 'screen',
    screenShareStream: videoSourceType === 'screen' ? previewStream : null,
    onPublished: () => {
      const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
      if (DEBUG_LIVEKIT) {
        console.log('[PUBLISH] publishing started successfully');
      }
      console.log('Started publishing to LiveKit');
      setIsPublishingState(true);
      isPublishingRef.current = true; // Update ref for realtime handler
      onPublishingChange?.(true); // Report publishing state
      setShowDeviceModal(false);
      setLoading(false);
      stopPreview();
    },
    onUnpublished: () => {
      const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
      if (DEBUG_LIVEKIT) {
        console.log('[PUBLISH] publishing stopped');
      }
      console.log('Stopped publishing to LiveKit');
      setIsPublishingState(false);
      isPublishingRef.current = false; // Update ref for realtime handler
      onPublishingChange?.(false); // Report publishing state
    },
    onError: (err) => {
      console.error('Publishing error:', err);
      handleConnectionError(err.message || 'Failed to start streaming. Check console for details.');
    },
  });

  // Store stopPublishing function in ref so realtime handler can access it
  // CRITICAL: This must be AFTER useLiveKitPublisher hook call
  // Store stopPublishing without extra params (hook signature expects none)
  useEffect(() => {
    stopPublishingRef.current = () => stopPublishing();
  }, [stopPublishing]);

  const handleGoLive = async () => {
    if (isLive) {
      // Stop live
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        console.log('Stopping live stream...', { liveStreamId, isPublishing });

        // Update database first (this will trigger realtime updates)
        const { error: updateError } = await (supabase.from('live_streams') as any)
          .update({ live_available: false, ended_at: new Date().toISOString() })
          .eq('profile_id', user.id);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }

        // CRITICAL: Remove user from all grid slots in database
        // This ensures they disappear from other viewers' grids immediately
        console.log('Removing from grid slots...');
        const { error: gridError } = await supabase
          .from('user_grid_slots')
          .delete()
          .eq('streamer_id', user.id);
        
        if (gridError) {
          console.error('Error removing from grid slots:', gridError);
          // Don't throw - continue with stopping the stream
        } else {
          console.log('Removed from all grid slots');
        }

        console.log('Database updated, stopping LiveKit publishing...');

        // Stop LiveKit publishing (await it)
        try {
          await stopPublishing();
          console.log('LiveKit publishing stopped');
        } catch (err) {
          console.error('Error stopping publishing:', err);
          // Continue even if stopPublishing fails - database is already updated
        }

        // Update local state (bypass debounce for manual stop)
        lastLiveStateRef.current = false;
        isLiveRef.current = false;
        setIsLive(false);
        setIsPublishingState(false);
        setLiveStreamId(null);
        setSelectedVideoDevice('');
        setSelectedAudioDevice('');
        setVideoSourceType('camera');
        setIsScreenSharing(false);
        onLiveStatusChange?.(false);

        console.log('Stop live completed successfully');
      } catch (err: any) {
        console.error('Error stopping live:', err);
        alert('Failed to stop live: ' + err.message);
        // Still try to reset state (bypass debounce for error recovery)
        lastLiveStateRef.current = false;
        isLiveRef.current = false;
        setIsLive(false);
        setLiveStreamId(null);
        setVideoSourceType('camera');
        setIsScreenSharing(false);
      } finally {
        setLoading(false);
      }
    } else {
      // Show device selection modal
      setShowDeviceModal(true);
      setPermissionError(null);
    }
  };

  // Handle connection errors - reset state and close modal
  const handleConnectionError = async (errorMessage: string) => {
    console.error('Connection error:', errorMessage);
    setPermissionError(errorMessage);
    setLoading(false);
    
    // Reset database state
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && liveStreamId) {
        await (supabase.from('live_streams') as any)
          .update({ live_available: false, ended_at: new Date().toISOString() })
          .eq('profile_id', user.id);
      }
    } catch (err) {
      console.error('Error resetting database state:', err);
    }
    
    // Reset local state (bypass debounce for error recovery)
    lastLiveStateRef.current = false;
    isLiveRef.current = false;
    setIsLive(false);
    setLiveStreamId(null);
    setSelectedVideoDevice('');
    setSelectedAudioDevice('');
    setVideoSourceType('camera');
    setIsScreenSharing(false);
    onLiveStatusChange?.(false);
    
    // Close modal after a short delay so user can see the error
    setTimeout(() => {
      setShowDeviceModal(false);
      stopPreview();
    }, 3000);
  };

  const handleStartLive = async () => {
    if (!selectedVideoDevice || !selectedAudioDevice) {
      alert('Please select both a camera and microphone');
      return;
    }

    console.log('🎬 [GO LIVE] Starting live stream...', {
      hasRoom: !!sharedRoom,
      isRoomConnected,
      roomState: sharedRoom?.state,
      selectedVideoDevice: selectedVideoDevice.substring(0, 20) + '...',
      selectedAudioDevice: selectedAudioDevice.substring(0, 20) + '...',
    });

    setLoading(true);
    setPermissionError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Ensure profile exists before creating live stream
      // This prevents foreign key constraint violations
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', user.id)
        .single();

      if (profileCheckError || !existingProfile) {
        // Profile doesn't exist - try to create it
        console.warn('Profile not found, attempting to create:', profileCheckError);
        
        // Get user email for username fallback
        const email = user.email || `user_${user.id.slice(0, 8)}`;
        const defaultUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
        
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: defaultUsername,
            display_name: defaultUsername,
            coin_balance: 0,
            earnings_balance: 0,
            gifter_level: 0,
          });

        if (createProfileError) {
          console.error('Failed to create profile:', createProfileError);
          throw new Error(`Profile not found and could not be created: ${createProfileError.message}. Please contact support.`);
        }
        
        console.log('Profile created successfully');
      }

      // Upsert live_stream record (profile should exist now)
      const { data, error } = await supabase
        .from('live_streams')
        .upsert({
          profile_id: user.id,
          live_available: true,
          started_at: new Date().toISOString(),
        }, {
          onConflict: 'profile_id',
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting live_stream:', error);
        throw new Error(`Failed to start live stream: ${error.message}`);
      }

      setLiveStreamId(data.id);
      
      // CRITICAL: Update participant metadata in LiveKit room when going live
      // This ensures webhook can identify the streamer and permissions are correct
      if (sharedRoom && isRoomConnected && sharedRoom.state === 'connected') {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('id', user.id)
            .single();
          
          const metadata = {
            profile_id: user.id,
            username: profile?.username || 'Anonymous',
            display_name: profile?.display_name || profile?.username || 'Anonymous',
            avatar_url: profile?.avatar_url || null,
            live_stream_id: data.id,
          };
          
          await sharedRoom.localParticipant.setMetadata(JSON.stringify(metadata));
          console.log('Updated participant metadata with live_stream_id:', data.id);
        } catch (metadataError: any) {
          console.warn('Failed to update participant metadata (non-critical):', metadataError);
          // Don't fail the whole flow if metadata update fails
        }
      }
      
      // Update state immediately (bypass debounce for manual start)
      lastLiveStateRef.current = true;
      isLiveRef.current = true;
      setIsLive(true);
      onLiveStatusChange?.(true);

      // Notify parent to add user to slot 1 (top-left) in their grid
      if (onGoLive && data.id) {
        onGoLive(data.id, user.id);
      }

      // CRITICAL: Ensure room is connected before trying to publish
      // The hook will automatically start publishing when enabled becomes true AND room is connected
      // If room isn't connected yet, it will start when the room connects
      if (!isRoomConnected || !sharedRoom) {
        console.log('Room not connected yet, publisher will start when room connects');
      } else if (sharedRoom.state === 'connected') {
        console.log('Room is connected, publisher should start automatically');
      }
      console.log('Starting MyLiveLinks connection...', {
        enabled: shouldEnablePublisher,
        liveStreamId: data.id,
        selectedVideoDevice,
        selectedAudioDevice,
      });

      // Try manual start after a short delay (hook might not trigger fast enough)
      // CRITICAL: Still respect publishAllowed so layout commits before publishing.
      setTimeout(async () => {
        if (!publishAllowed) {
          console.log('[PUBLISH] Manual start blocked: publishAllowed=false (waiting for layout)');
          return;
        }
        try {
          console.log('Attempting manual start...');
          await startPublishing();
          // If we get here, check if publishing started
          setTimeout(() => {
            if (!isPublishing && loading) {
              console.warn('Publishing did not start after manual attempt');
              handleConnectionError('Connection attempt completed but publishing did not start. Please check your LiveKit configuration.');
            }
          }, 2000);
        } catch (err: any) {
          console.error('Manual start failed:', err);
          handleConnectionError(err.message || 'Failed to connect to MyLiveLinks. Check console for details.');
        }
      }, 500);

      // Fallback: if still not publishing after 8 seconds, show error
      setTimeout(() => {
        if (loading && !isPublishing && !error) {
          handleConnectionError('Connection is taking longer than expected. Please check your browser console for errors or try again.');
        }
      }, 8000);
    } catch (err: any) {
      console.error('Error starting live:', err);
      handleConnectionError(err.message || 'Failed to go live');
    }
  };

  return (
    <>
      <button
        onClick={handleGoLive}
        disabled={loading}
        className={`px-1 py-0.5 md:px-1.5 md:py-1 lg:px-2.5 lg:py-1.5 xl:px-4 xl:py-2 rounded md:rounded-md lg:rounded-lg transition font-semibold whitespace-nowrap text-[7px] md:text-[9px] lg:text-xs xl:text-sm shadow-sm md:shadow-md ${
          isLive
            ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700'
            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <><span className="hidden lg:inline">Loading...</span><span className="lg:hidden">⏳</span></>
        ) : isLive && (isPublishing || isPublishingState) && isScreenSharing ? (
          // Show screen share indicator when live with screen share
          <><span className="hidden lg:inline">🖥️ SCREEN LIVE</span><span className="lg:hidden">🖥️</span></>
        ) : isLive && (isPublishing || isPublishingState) ? (
          // Only show "LIVE" when both isLive AND isPublishing are true
          <><span className="hidden lg:inline">🔴 LIVE</span><span className="lg:hidden">🔴</span></>
        ) : isLive ? (
          // Show "Stop Live" when isLive is true but not publishing yet
          <><span className="hidden lg:inline">⏸️ Stop Live</span><span className="lg:hidden">⏸️</span></>
        ) : (
          <><span className="hidden lg:inline">▶️ Go Live</span><span className="lg:hidden">▶️</span></>
        )}
        {error && <span className="ml-1 lg:ml-2 text-[6px] lg:text-xs">⚠️</span>}
      </button>

      {/* Device Selection Modal */}
      {showDeviceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeviceModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Select Camera & Microphone</h2>
            
            {permissionError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {permissionError}
              </div>
            )}

            <div className="space-y-4">
              {/* Preview */}
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '200px' }}>
                <video
                  ref={(el) => {
                    setPreviewVideoRef(el);
                    if (el && previewStream) {
                      el.srcObject = previewStream;
                      el.play().catch(err => console.error('Error playing preview:', err));
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!previewStream && (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Camera preview will appear here
                  </div>
                )}
                
                {/* Screen Share Badge & Controls */}
                {isScreenSharing && previewStream && (
                  <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                    <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 animate-pulse">
                      <span>🖥️</span>
                      <span>Sharing Screen</span>
                    </div>
                    <button
                      onClick={handleSwitchToCamera}
                      className="bg-black/60 hover:bg-black/80 text-white px-3 py-1 rounded-lg text-sm transition flex items-center gap-1"
                    >
                      <span>📷</span>
                      <span className="hidden sm:inline">Switch to Camera</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Video Source Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Video Source</label>
                <div className="space-y-2">
                  {/* Camera options */}
                  {devices.video.map((device, index) => {
                    const isFrontCamera = device.label.toLowerCase().includes('front') || 
                                          device.label.toLowerCase().includes('user') ||
                                          device.label.toLowerCase().includes('facetime') ||
                                          (index === 0 && devices.video.length > 1);
                    const isBackCamera = device.label.toLowerCase().includes('back') || 
                                         device.label.toLowerCase().includes('environment') ||
                                         device.label.toLowerCase().includes('rear') ||
                                         (index === 1 && devices.video.length > 1);
                    
                    let displayLabel = device.label;
                    if (isFrontCamera && !device.label.toLowerCase().includes('front')) {
                      displayLabel = `📷 Front Camera${device.label ? ` (${device.label})` : ''}`;
                    } else if (isBackCamera && !device.label.toLowerCase().includes('back')) {
                      displayLabel = `📸 Back Camera${device.label ? ` (${device.label})` : ''}`;
                    } else {
                      displayLabel = `📹 ${device.label}`;
                    }
                    
                    return (
                      <button
                        key={device.deviceId}
                        onClick={() => {
                          setVideoSourceType('camera');
                          setSelectedVideoDevice(device.deviceId);
                          setIsScreenSharing(false);
                          startPreview(undefined, device.deviceId, selectedAudioDevice);
                        }}
                        className={`w-full px-4 py-3 text-left rounded-lg border-2 transition ${
                          videoSourceType === 'camera' && selectedVideoDevice === device.deviceId
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        <span className="font-medium">{displayLabel}</span>
                      </button>
                    );
                  })}
                  
                  {/* Screen Share / Game Screen option */}
                  <button
                    onClick={() => {
                      if (!screenShareSupported) {
                        setPermissionError("Screen sharing isn't supported on this browser/device yet. Use the mobile app or desktop Chrome/Firefox/Edge.");
                        return;
                      }
                      setShowScreenShareModal(true);
                    }}
                    className={`w-full px-4 py-3 text-left rounded-lg border-2 transition ${
                      videoSourceType === 'screen'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : screenShareSupported
                          ? 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">🎮 Game Screen</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Screen Share)</span>
                      </div>
                      {!screenShareSupported && (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded">
                          Not Supported
                        </span>
                      )}
                      {videoSourceType === 'screen' && isScreenSharing && (
                        <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Microphone Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Microphone</label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => {
                    setSelectedAudioDevice(e.target.value);
                    startPreview(undefined, selectedVideoDevice, e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {devices.audio.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeviceModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStartLive}
                disabled={(videoSourceType === 'camera' ? !selectedVideoDevice : !isScreenSharing) || !selectedAudioDevice || loading}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  videoSourceType === 'screen' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                }`}
              >
                {loading ? 'Starting...' : videoSourceType === 'screen' ? '🖥️ Go Live with Screen' : 'Start Live'}
              </button>
              {error && (
                <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">
                  Error: {error.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screen Share Confirmation Modal */}
      {showScreenShareModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => setShowScreenShareModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 m-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎮</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Share Your Screen</h2>
              <p className="text-gray-600 dark:text-gray-400">Stream your game or app to viewers</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-xl">📺</span>
                <div>
                  <p className="font-medium text-sm">Screen & Audio Sharing</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Your screen and system audio will be shared (if supported)</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-xl">🎮</span>
                <div>
                  <p className="font-medium text-sm">Best for Mobile Games</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Perfect for streaming gameplay from your device</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-medium text-sm">Privacy Notice</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Notifications and personal info may be visible to viewers</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowScreenShareModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleStartScreenShare}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition font-medium flex items-center justify-center gap-2"
              >
                <span>🖥️</span>
                Start Screen Share
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

