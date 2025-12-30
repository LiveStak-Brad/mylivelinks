/**
 * Solo Host Stream Screen
 * 
 * Full-screen camera preview for the streamer/host
 * Features:
 * - Full screen video (host's camera)
 * - Semi-transparent chat overlay (1/3 of screen, bottom)
 * - Go Live / Stop Live button
 * - Viewer count
 * - Minimal UI (streamer-focused)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiveRoomParticipants } from '../hooks/useLiveRoomParticipants';
import { supabase } from '../lib/supabase';
import { useThemeMode } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type SoloHostStreamScreenProps = {
  onExit?: () => void;
};

export function SoloHostStreamScreen({ onExit }: SoloHostStreamScreenProps) {
  useKeepAwake();
  
  const insets = useSafeAreaInsets();
  const { theme } = useThemeMode();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState(CameraType.front);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const cameraRef = useRef<Camera>(null);
  
  // LiveKit streaming
  const {
    goLive,
    stopLive,
    isLive,
    isPublishing,
    isConnected,
    room,
  } = useLiveRoomParticipants({ enabled: true });

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCurrentUser({ id: user.id, username: profile.username });
        }
      }
    };
    loadUser();
  }, []);

  // Mock viewer count (replace with real-time subscription)
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setViewerCount(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const handleToggleGoLive = useCallback(async () => {
    if (!currentUser?.id) {
      Alert.alert('Login required', 'Please log in to go live.');
      return;
    }

    try {
      if (isLive) {
        await stopLive();
        setViewerCount(0);
      } else {
        await goLive();
      }
    } catch (err: any) {
      Alert.alert('Live error', err?.message || 'Failed to toggle live');
    }
  }, [currentUser?.id, goLive, isLive, stopLive]);

  const handleFlipCamera = () => {
    setCameraType(current =>
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const handleExit = useCallback(async () => {
    if (isLive) {
      Alert.alert(
        'End Stream?',
        'Are you sure you want to stop streaming?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Stream',
            style: 'destructive',
            onPress: async () => {
              await stopLive();
              onExit?.();
            },
          },
        ]
      );
    } else {
      onExit?.();
    }
  }, [isLive, onExit, stopLive]);

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.text }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.text, marginBottom: 16 }}>
          Camera permission not granted
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.accent }]}
          onPress={handleExit}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen camera preview */}
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
      >
        {/* Top Bar - Status */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          {/* Back/Exit Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleExit}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Live Status Badge */}
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
              <View style={styles.viewerBadge}>
                <Ionicons name="eye" size={14} color="#fff" />
                <Text style={styles.viewerText}>{viewerCount}</Text>
              </View>
            </View>
          )}

          {/* Connection Status */}
          {!isConnected && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Connecting...</Text>
            </View>
          )}

          <View style={{ flex: 1 }} />

          {/* Flip Camera Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleFlipCamera}
          >
            <Ionicons name="camera-reverse" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Semi-transparent Chat Overlay (1/3 of screen, bottom) */}
        <View style={[styles.chatOverlay, { paddingBottom: insets.bottom + 80 }]}>
          <View style={styles.chatContent}>
            <Text style={styles.chatTitle}>Live Chat</Text>
            {/* Chat messages will go here */}
            <View style={styles.chatPlaceholder}>
              <Text style={styles.chatPlaceholderText}>
                Chat will appear here when viewers join
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          {/* Go Live / Stop Live Button */}
          <TouchableOpacity
            style={[
              styles.goLiveButton,
              isLive && isPublishing && styles.goLiveButtonActive,
            ]}
            onPress={handleToggleGoLive}
          >
            <Ionicons
              name="videocam"
              size={32}
              color={isLive && isPublishing ? '#ef4444' : '#fff'}
            />
            <Text style={styles.goLiveButtonText}>
              {isLive && isPublishing ? 'LIVE' : 'Go Live'}
            </Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  viewerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT / 3,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent
  },
  chatContent: {
    flex: 1,
    padding: 16,
  },
  chatTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  chatPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatPlaceholderText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
  },
  goLiveButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  goLiveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

