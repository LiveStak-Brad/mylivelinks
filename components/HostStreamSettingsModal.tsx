'use client';

import { useState, useEffect } from 'react';
import { X, Camera, Mic, Monitor, RefreshCw, Check, Video, Volume2 } from 'lucide-react';

interface HostStreamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export default function HostStreamSettingsModal({ isOpen, onClose }: HostStreamSettingsModalProps) {
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [streamQuality, setStreamQuality] = useState<'auto' | '720p' | '1080p'>('auto');
  const [loading, setLoading] = useState(true);

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

        // Set default selections
        if (videoInputs.length > 0 && !selectedVideoDevice) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
        if (audioInputs.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('[HostStreamSettings] Error loading devices:', err);
      }
      setLoading(false);
    };

    loadDevices();
  }, [isOpen]);

  const handleSave = () => {
    // Save to localStorage for now - can be extended to persist to backend
    localStorage.setItem('streamSettings', JSON.stringify({
      videoDeviceId: selectedVideoDevice,
      audioDeviceId: selectedAudioDevice,
      quality: streamQuality,
    }));
    
    console.log('[HostStreamSettings] Settings saved:', {
      videoDeviceId: selectedVideoDevice,
      audioDeviceId: selectedAudioDevice,
      quality: streamQuality,
    });
    
    onClose();
  };

  const handleFlipCamera = () => {
    if (videoDevices.length < 2) return;
    
    const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedVideoDevice);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    setSelectedVideoDevice(videoDevices[nextIndex].deviceId);
  };

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
                </label>
                <div className="space-y-2">
                  {videoDevices.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No cameras found</p>
                  ) : (
                    <>
                      <select
                        value={selectedVideoDevice}
                        onChange={(e) => setSelectedVideoDevice(e.target.value)}
                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
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
                </label>
                {audioDevices.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No microphones found</p>
                ) : (
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-bottom">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
