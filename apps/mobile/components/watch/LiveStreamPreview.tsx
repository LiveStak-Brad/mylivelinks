import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Room, RoomEvent, RemoteTrack, Track } from 'livekit-client';
import { VideoView } from '@livekit/react-native';
import { supabase } from '../../lib/supabase';

interface LiveStreamPreviewProps {
  streamerProfileId: string;
  streamerUsername: string;
  displayName: string;
  streamingMode: 'solo' | 'group';
  roomKey?: string;
  onEnterLive: () => void;
  width: number;
  height: number;
}

export default function LiveStreamPreview({
  streamerProfileId,
  streamerUsername,
  displayName,
  streamingMode,
  roomKey,
  onEnterLive,
  width,
  height,
}: LiveStreamPreviewProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<RemoteTrack | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [previewEnded, setPreviewEnded] = useState(false);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    let mounted = true;

    const connectToRoom = async () => {
      try {
        setIsConnecting(true);

        // Get auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken || !mounted) return;

        // Room name
        const roomName = streamingMode === 'group' ? (roomKey || 'live_central') : `solo_${streamerProfileId}`;
        
        // Get token
        const response = await fetch('https://www.mylivelinks.com/api/livekit/token', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            roomName,
            participantName: `preview_${user.id.slice(0, 8)}`,
            canPublish: false,
            canSubscribe: true,
            userId: user.id,
          }),
        });

        if (!response.ok || !mounted) return;

        const { token, url } = await response.json();
        if (!token || !url || !mounted) return;

        // Connect to room
        const room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video && mounted) {
            setRemoteVideoTrack(track);
            setIsConnecting(false);
          }
        });

        await room.connect(url, token);

        if (!mounted) {
          room.disconnect();
          return;
        }

        // Check existing tracks
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.track && publication.track.kind === Track.Kind.Video && mounted) {
              setRemoteVideoTrack(publication.track as RemoteTrack);
              setIsConnecting(false);
            }
          });
        });

      } catch (err) {
        console.error('[LiveStreamPreview] Error:', err);
        setIsConnecting(false);
      }
    };

    connectToRoom();

    // Show prompt after 5 seconds
    const promptTimer = setTimeout(() => {
      if (mounted) setShowPrompt(true);
    }, 5000);

    // End preview after 15 seconds - disconnect and force user to scroll or join
    const endPreviewTimer = setTimeout(() => {
      if (mounted) {
        console.log('[LiveStreamPreview] Ending preview after 15s');
        setPreviewEnded(true);
        if (roomRef.current) {
          roomRef.current.disconnect();
          roomRef.current = null;
        }
        setRemoteVideoTrack(null);
      }
    }, 15000);

    return () => {
      mounted = false;
      clearTimeout(promptTimer);
      clearTimeout(endPreviewTimer);
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, [streamerProfileId, streamingMode, roomKey]);

  return (
    <Pressable 
      style={[styles.container, { width, height }]}
      onPress={onEnterLive}
    >
      {previewEnded ? (
        /* Preview ended - show message to encourage action */
        <View style={styles.endedContainer}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.endedTitle}>Preview Ended</Text>
          <Text style={styles.endedSubtitle}>Tap to join or scroll to continue</Text>
        </View>
      ) : (
        <>
          {/* Live video */}
          {remoteVideoTrack ? (
            <VideoView
              style={styles.video}
              videoTrack={remoteVideoTrack as any}
              objectFit="cover"
            />
          ) : (
            <View style={styles.loadingContainer}>
              {isConnecting && <ActivityIndicator size="small" color="#fff" />}
            </View>
          )}

          {/* Tap to join prompt after 5 seconds */}
          {showPrompt && !previewEnded && (
            <View style={styles.promptOverlay}>
              <View style={styles.promptContainer}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={styles.promptTitle}>{displayName} is live</Text>
                <View style={styles.promptButton}>
                  <Text style={styles.promptButtonText}>Tap to Join</Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  promptOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  promptContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 24,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  liveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  promptTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  promptButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#EC4899',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  promptButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  endedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  endedTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  endedSubtitle: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
  },
});
