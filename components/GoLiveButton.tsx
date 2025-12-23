'use client';

import { useState, useEffect, useRef } from 'react';
import { useLiveKitPublisher } from '@/hooks/useLiveKitPublisher';
import { createClient } from '@/lib/supabase';
import { LocalVideoTrack, LocalAudioTrack } from 'livekit-client';

interface GoLiveButtonProps {
  onLiveStatusChange?: (isLive: boolean) => void;
  onGoLive?: (liveStreamId: number, profileId: string) => void;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export default function GoLiveButton({ onLiveStatusChange, onGoLive }: GoLiveButtonProps) {
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
  const isLiveRef = useRef(false); // Track current state to prevent unnecessary updates
  const supabase = createClient();

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
        isLiveRef.current = liveState;
        setIsLive(liveState);
        setLiveStreamId(d.id);
        onLiveStatusChange?.(liveState);
      }

      // Subscribe to changes for this user's live stream only
      // Only update state when live_available actually changes to prevent flashing
      channel = supabase
        .channel(`user-live-stream-${user.id}-${Date.now()}`)
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
              // Only update if state actually changed (prevent unnecessary re-renders)
              if (isLiveRef.current !== newLiveState) {
                isLiveRef.current = newLiveState;
                setIsLive(newLiveState);
                setLiveStreamId(newData.id || null);
                onLiveStatusChange?.(newLiveState);
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
    };
  }, [supabase]); // Removed onLiveStatusChange from deps to prevent loops

  // Room name for publishing
  const roomName = liveStreamId ? `live_stream_${liveStreamId}` : 'live_central';

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

  // LiveKit publisher hook - only enable when we have everything ready
  const shouldEnablePublisher = !!(isLive && selectedVideoDevice && selectedAudioDevice && liveStreamId);
  
  const { isPublishing, error, startPublishing, stopPublishing } = useLiveKitPublisher({
    roomName,
    participantName,
    enabled: shouldEnablePublisher,
    videoDeviceId: selectedVideoDevice,
    audioDeviceId: selectedAudioDevice,
    onPublished: () => {
      console.log('Started publishing to LiveKit');
      setShowDeviceModal(false);
      setLoading(false);
      stopPreview();
    },
    onUnpublished: () => {
      console.log('Stopped publishing to LiveKit');
    },
    onError: (err) => {
      console.error('Publishing error:', err);
      setLoading(false);
      setPermissionError(err.message || 'Failed to start streaming. Check console for details.');
      // Keep modal open so user can see the error
    },
  });

  const handleGoLive = async () => {
    if (isLive) {
      // Stop live
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Stop LiveKit publishing (await it)
        try {
          await stopPublishing();
        } catch (err) {
          console.error('Error stopping publishing:', err);
          // Continue even if stopPublishing fails
        }

        // Update database
        const { error } = await (supabase.from('live_streams') as any)
          .update({ live_available: false, ended_at: new Date().toISOString() })
          .eq('profile_id', user.id);

        if (error) throw error;

        isLiveRef.current = false;
        setIsLive(false);
        setLiveStreamId(null);
        onLiveStatusChange?.(false);
      } catch (err: any) {
        console.error('Error stopping live:', err);
        alert('Failed to stop live: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Show device selection modal
      setShowDeviceModal(true);
      setPermissionError(null);
    }
  };

  const handleStartLive = async () => {
    if (!selectedVideoDevice || !selectedAudioDevice) {
      alert('Please select both a camera and microphone');
      return;
    }

    setLoading(true);
    setPermissionError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upsert live_stream record first
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

      if (error) throw error;

      setLiveStreamId(data.id);
      isLiveRef.current = true;
      setIsLive(true);
      onLiveStatusChange?.(true);

      // Notify parent to add user to slot 1 (top-left) in their grid
      if (onGoLive && data.id) {
        onGoLive(data.id, user.id);
      }

      // Don't close modal yet - wait for publishing to start
      // The hook will automatically start publishing when enabled becomes true
      // But also try manual start immediately as a fallback
      console.log('Starting MyLiveLinks connection...', {
        enabled: shouldEnablePublisher,
        liveStreamId: data.id,
        selectedVideoDevice,
        selectedAudioDevice,
      });

      // Try manual start immediately (hook might not trigger fast enough)
      setTimeout(async () => {
        try {
          console.log('Attempting manual start...');
          await startPublishing();
          // If we get here, check if publishing started
          setTimeout(() => {
            if (!isPublishing && loading) {
              console.warn('Publishing did not start after manual attempt');
              setPermissionError('Connection attempt completed but publishing did not start. Please check your LiveKit configuration.');
              setLoading(false);
            }
          }, 2000);
        } catch (err: any) {
          console.error('Manual start failed:', err);
          setPermissionError(err.message || 'Failed to connect to MyLiveLinks. Check console for details.');
          setLoading(false);
        }
      }, 500);

      // Fallback: if still not publishing after 8 seconds, show error
      setTimeout(() => {
        if (loading && !isPublishing && !error) {
          setPermissionError('Connection is taking longer than expected. Please check your browser console for errors or try again.');
          setLoading(false);
        }
      }, 8000);
    } catch (err: any) {
      console.error('Error starting live:', err);
      setPermissionError(err.message || 'Failed to go live');
      setLoading(false);
      isLiveRef.current = false;
      setIsLive(false);
    }
  };

  return (
    <>
      <button
        onClick={handleGoLive}
        disabled={loading}
        className={`px-4 py-2 rounded-lg transition font-semibold ${
          isLive
            ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700'
            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          'Loading...'
        ) : isLive ? (
          <>
            {isPublishing ? '🔴 LIVE' : '⏸️ Stop Live'}
          </>
        ) : (
          '▶️ Go Live'
        )}
        {error && <span className="ml-2 text-xs">⚠️</span>}
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
              {/* Camera Preview */}
              <div className="w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '200px' }}>
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
              </div>

              {/* Camera Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Camera</label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => {
                    setSelectedVideoDevice(e.target.value);
                    startPreview(undefined, e.target.value, selectedAudioDevice);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {devices.video.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
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
                disabled={!selectedVideoDevice || !selectedAudioDevice || loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isPublishing ? 'Connecting to MyLiveLinks...' : 'Starting...') : 'Start Live'}
              </button>
              {error && (
                <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">
                  Error: {error.message}
                </div>
              )}
              {loading && !isPublishing && (
                <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-sm">
                  Connecting to MyLiveLinks... This may take a few seconds.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

