'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Camera, Mic, Video, RefreshCw, Check } from 'lucide-react';

interface HostStreamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Live device switching callbacks
  onSwitchCamera?: (deviceId: string) => Promise<void>;
  onSwitchMicrophone?: (deviceId: string) => Promise<void>;
  // Current active devices (for highlighting)
  activeVideoDeviceId?: string;
  activeAudioDeviceId?: string;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
}

// localStorage keys for device persistence
const STORAGE_KEY_VIDEO = 'hostStream_videoDeviceId';
const STORAGE_KEY_AUDIO = 'hostStream_audioDeviceId';

// Helper to load saved device IDs
export function loadSavedDevices(): { videoDeviceId: string | null; audioDeviceId: string | null } {
  if (typeof window === 'undefined') return { videoDeviceId: null, audioDeviceId: null };
  return {
    videoDeviceId: localStorage.getItem(STORAGE_KEY_VIDEO),
    audioDeviceId: localStorage.getItem(STORAGE_KEY_AUDIO),
  };
}

// Helper to save device IDs
function saveDeviceIds(videoDeviceId: string, audioDeviceId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_VIDEO, videoDeviceId);
  localStorage.setItem(STORAGE_KEY_AUDIO, audioDeviceId);
}

export default function HostStreamSettingsModal({ 
  isOpen, 
  onClose,
  onSwitchCamera,
  onSwitchMicrophone,
  activeVideoDeviceId,
  activeAudioDeviceId,
}: HostStreamSettingsModalProps) {
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [streamQuality, setStreamQuality] = useState<'auto' | '720p' | '1080p'>('auto');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<'video' | 'audio' | null>(null);

  // Load available devices
  useEffect(() => {
    if (!isOpen) return;

    const loadDevices = async () => {
      setLoading(true);
      try {
        // Request permission to access devices
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            // Stop tracks immediately, we just need the permission
            stream.getTracks().forEach(track => track.stop());
          })
          .catch(() => {
            // Permission denied, but we can still try to enumerate
          });

        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const videoInputs = devices
          .filter(d => d.kind === 'videoinput')
          .map(d => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${d.deviceId.slice(0, 4)}`,
          }));

        const audioInputs = devices
          .filter(d => d.kind === 'audioinput')
          .map(d => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 4)}`,
          }));

        setVideoDevices(videoInputs);
        setAudioDevices(audioInputs);

        // Load saved devices or use active/default
        const saved = loadSavedDevices();
        
        let resolvedVideoDevice = '';
        let resolvedAudioDevice = '';
        let needsPersistUpdate = false;
        
        // For video: use active device > saved device > first available
        if (activeVideoDeviceId && videoInputs.some(d => d.deviceId === activeVideoDeviceId)) {
          resolvedVideoDevice = activeVideoDeviceId;
        } else if (saved.videoDeviceId && videoInputs.some(d => d.deviceId === saved.videoDeviceId)) {
          resolvedVideoDevice = saved.videoDeviceId;
        } else if (videoInputs.length > 0) {
          resolvedVideoDevice = videoInputs[0].deviceId;
          needsPersistUpdate = true; // Saved device was invalid, update to new default
          console.log('[HostStreamSettings] Saved camera not found, falling back to:', resolvedVideoDevice);
        }
        setSelectedVideoDevice(resolvedVideoDevice);

        // For audio: use active device > saved device > first available
        if (activeAudioDeviceId && audioInputs.some(d => d.deviceId === activeAudioDeviceId)) {
          resolvedAudioDevice = activeAudioDeviceId;
        } else if (saved.audioDeviceId && audioInputs.some(d => d.deviceId === saved.audioDeviceId)) {
          resolvedAudioDevice = saved.audioDeviceId;
        } else if (audioInputs.length > 0) {
          resolvedAudioDevice = audioInputs[0].deviceId;
          needsPersistUpdate = true; // Saved device was invalid, update to new default
          console.log('[HostStreamSettings] Saved mic not found, falling back to:', resolvedAudioDevice);
        }
        setSelectedAudioDevice(resolvedAudioDevice);
        
        // Persist fallback devices so next load uses valid devices
        if (needsPersistUpdate && resolvedVideoDevice && resolvedAudioDevice) {
          saveDeviceIds(resolvedVideoDevice, resolvedAudioDevice);
        }
      } catch (err) {
        console.error('[HostStreamSettings] Error loading devices:', err);
      }
      setLoading(false);
    };

    loadDevices();
  }, [isOpen, activeVideoDeviceId, activeAudioDeviceId]);

  // Handle camera change - apply LIVE
  const handleCameraChange = useCallback(async (deviceId: string) => {
    if (!deviceId || deviceId === selectedVideoDevice) return;
    
    setSelectedVideoDevice(deviceId);
    
    // If we have a live switching callback, apply immediately
    if (onSwitchCamera) {
      setSwitching('video');
      try {
        await onSwitchCamera(deviceId);
        // Save to localStorage on success
        saveDeviceIds(deviceId, selectedAudioDevice);
        console.log('[HostStreamSettings] Camera switched live to:', deviceId);
      } catch (err) {
        console.error('[HostStreamSettings] Failed to switch camera:', err);
        // Revert selection on failure
        if (activeVideoDeviceId) {
          setSelectedVideoDevice(activeVideoDeviceId);
        }
      } finally {
        setSwitching(null);
      }
    } else {
      // No live switching - just save for next stream
      saveDeviceIds(deviceId, selectedAudioDevice);
    }
  }, [selectedVideoDevice, selectedAudioDevice, onSwitchCamera, activeVideoDeviceId]);

  // Handle microphone change - apply LIVE
  const handleMicrophoneChange = useCallback(async (deviceId: string) => {
    if (!deviceId || deviceId === selectedAudioDevice) return;
    
    setSelectedAudioDevice(deviceId);
    
    // If we have a live switching callback, apply immediately
    if (onSwitchMicrophone) {
      setSwitching('audio');
      try {
        await onSwitchMicrophone(deviceId);
        // Save to localStorage on success
        saveDeviceIds(selectedVideoDevice, deviceId);
        console.log('[HostStreamSettings] Microphone switched live to:', deviceId);
      } catch (err) {
        console.error('[HostStreamSettings] Failed to switch microphone:', err);
        // Revert selection on failure
        if (activeAudioDeviceId) {
          setSelectedAudioDevice(activeAudioDeviceId);
        }
      } finally {
        setSwitching(null);
      }
    } else {
      // No live switching - just save for next stream
      saveDeviceIds(selectedVideoDevice, deviceId);
    }
  }, [selectedVideoDevice, selectedAudioDevice, onSwitchMicrophone, activeAudioDeviceId]);

  const handleFlipCamera = useCallback(() => {
    if (videoDevices.length < 2) return;
    
    const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedVideoDevice);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    handleCameraChange(videoDevices[nextIndex].deviceId);
  }, [videoDevices, selectedVideoDevice, handleCameraChange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col modal-fullscreen-mobile">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-top">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Stream Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mobile-touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body p-6 space-y-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <>
              {/* Camera Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  <Camera className="w-4 h-4 text-purple-500" />
                  Camera
                  {switching === 'video' && (
                    <span className="ml-2 text-xs text-purple-500 animate-pulse">Switching...</span>
                  )}
                </label>
                <div className="space-y-2">
                  {videoDevices.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No cameras found</p>
                  ) : (
                    <>
                      <select
                        value={selectedVideoDevice}
                        onChange={(e) => handleCameraChange(e.target.value)}
                        disabled={switching === 'video'}
                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                      >
                        {videoDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))}
                      </select>
                      
                      {videoDevices.length > 1 && (
                        <button
                          onClick={handleFlipCamera}
                          disabled={switching === 'video'}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${switching === 'video' ? 'animate-spin' : ''}`} />
                          Flip Camera
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Microphone Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  <Mic className="w-4 h-4 text-pink-500" />
                  Microphone
                  {switching === 'audio' && (
                    <span className="ml-2 text-xs text-pink-500 animate-pulse">Switching...</span>
                  )}
                </label>
                {audioDevices.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No microphones found</p>
                ) : (
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => handleMicrophoneChange(e.target.value)}
                    disabled={switching === 'audio'}
                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  >
                    {audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Stream Quality */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  <Video className="w-4 h-4 text-blue-500" />
                  Stream Quality
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'auto', label: 'Auto (Recommended)', description: 'Automatically adjusts based on connection' },
                    { value: '720p', label: '720p HD', description: 'Good balance of quality and bandwidth' },
                    { value: '1080p', label: '1080p Full HD', description: 'Best quality, requires good connection' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStreamQuality(option.value as any)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        streamQuality === option.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                        {streamQuality === option.value && (
                          <Check className="w-5 h-5 text-purple-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 Camera and microphone changes apply immediately while streaming. No need to restart your stream!
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-bottom">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
