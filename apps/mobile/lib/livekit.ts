/**
 * LiveKit helpers for mobile
 * 
 * Provides token fetching and room connection utilities.
 */

import { Room, RoomEvent, LocalVideoTrack, LocalAudioTrack, createLocalTracks, VideoPresets } from 'livekit-client';
import { supabase } from './supabase';

export interface TokenResponse {
  token: string;
  url: string;
  identity: string;
  roomName: string;
}

export interface TokenRequest {
  roomName: string;
  identity: string;
  name?: string;
  isHost?: boolean;
}

/**
 * Fetch a LiveKit token from the mobile Edge Function
 */
export async function fetchMobileToken(
  roomName: string,
  identity: string,
  name?: string,
  isHost?: boolean
): Promise<TokenResponse> {
  const { data, error } = await supabase.functions.invoke<TokenResponse>('livekit-token-mobile', {
    body: {
      roomName,
      identity,
      name,
      isHost,
    } satisfies TokenRequest,
  });

  if (error) {
    console.error('[livekit] Token fetch error:', error);
    throw new Error(error.message || 'Failed to fetch LiveKit token');
  }

  if (!data?.token || !data?.url) {
    throw new Error('Invalid token response from server');
  }

  return data;
}

/**
 * Connect to a LiveKit room and optionally publish local tracks
 */
export async function connectAndPublish(
  url: string,
  token: string,
  publish: boolean = true
): Promise<{
  room: Room;
  videoTrack: LocalVideoTrack | null;
  audioTrack: LocalAudioTrack | null;
}> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  // Set up event listeners for debugging
  room.on(RoomEvent.Connected, () => {
    console.log('[livekit] Connected to room:', room.name);
  });

  room.on(RoomEvent.Disconnected, (reason) => {
    console.log('[livekit] Disconnected from room:', reason);
  });

  room.on(RoomEvent.MediaDevicesError, (error) => {
    console.error('[livekit] Media device error:', error);
  });

  // Connect to the room
  await room.connect(url, token);

  let videoTrack: LocalVideoTrack | null = null;
  let audioTrack: LocalAudioTrack | null = null;

  if (publish) {
    try {
      // Create local tracks
      const tracks = await createLocalTracks({
        audio: true,
        video: {
          facingMode: 'user', // Front camera by default
          resolution: VideoPresets.h720.resolution,
        },
      });

      for (const track of tracks) {
        if (track.kind === 'video') {
          videoTrack = track as LocalVideoTrack;
        } else if (track.kind === 'audio') {
          audioTrack = track as LocalAudioTrack;
        }
        
        // Publish the track
        await room.localParticipant.publishTrack(track);
      }

      console.log('[livekit] Published local tracks:', {
        video: !!videoTrack,
        audio: !!audioTrack,
      });
    } catch (err) {
      console.error('[livekit] Failed to create/publish tracks:', err);
      // Don't throw - connection is still valid, just no publishing
    }
  }

  return { room, videoTrack, audioTrack };
}

/**
 * Disconnect from room and stop all local tracks
 */
export async function disconnectAndCleanup(
  room: Room | null,
  videoTrack: LocalVideoTrack | null,
  audioTrack: LocalAudioTrack | null
): Promise<void> {
  try {
    // Stop local tracks
    if (videoTrack) {
      videoTrack.stop();
    }
    if (audioTrack) {
      audioTrack.stop();
    }

    // Disconnect from room
    if (room) {
      await room.disconnect();
    }

    console.log('[livekit] Cleanup complete');
  } catch (err) {
    console.error('[livekit] Cleanup error:', err);
  }
}

/**
 * Generate a room name for solo streaming
 */
export function generateSoloRoomName(userId: string): string {
  return `solo_${userId}`;
}
