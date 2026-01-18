/**
 * LiveKit helpers for mobile
 * 
 * Provides token fetching and room connection utilities.
 */

import { Room, RoomEvent, LocalVideoTrack, LocalAudioTrack, createLocalTracks, VideoPresets } from 'livekit-client';
import { supabase } from './supabase';
import { attachFiltersToLocalVideoTrack, setFilterParams as setNativeFilterParams } from './videoFilters';
import { loadHostCameraFilters } from './hostCameraFilters';

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

// API endpoint for token - uses the web API with Bearer auth
const TOKEN_API_URL = 'https://www.mylivelinks.com/api/livekit/token';

/**
 * Fetch a LiveKit token from the API
 */
export async function fetchMobileToken(
  roomName: string,
  identity: string,
  name?: string,
  isHost?: boolean
): Promise<TokenResponse> {
  // Get current session for Bearer token
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const accessToken = sessionData.session.access_token;

  const response = await fetch(TOKEN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      roomName,
      participantName: name || 'User',
      canPublish: isHost === true,
      canSubscribe: true,
      role: isHost ? 'publisher' : 'viewer',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || `Token request failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data?.token || !data?.url) {
    throw new Error('Invalid token response from server');
  }

  return {
    token: data.token,
    url: data.url,
    identity: data.identity || identity,
    roomName: data.roomName || roomName,
  };
}

/**
 * Connect to a LiveKit room and optionally publish local tracks
 */
export async function connectAndPublish(
  url: string,
  token: string,
  publish: boolean = true,
  profileId?: string
): Promise<{
  room: Room;
  videoTrack: LocalVideoTrack | null;
  audioTrack: LocalAudioTrack | null;
}> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    publishDefaults: {
      simulcast: false,
      videoEncoding: {
        maxBitrate: 1_200_000,
        maxFramerate: 30,
      },
    },
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
          attachFiltersToLocalVideoTrack(videoTrack);
          if (profileId) {
            const saved = await loadHostCameraFilters(profileId);
            setNativeFilterParams({
              brightness: saved.brightness,
              contrast: saved.contrast,
              saturation: saved.saturation,
              softSkinLevel: saved.softSkinLevel,
            });
          }
        } else if (track.kind === 'audio') {
          audioTrack = track as LocalAudioTrack;
        }
        
        // Publish the track
        await room.localParticipant.publishTrack(track);
      }
    } catch (err) {
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
  } catch (err) {
    // Silently fail
  }
}

/**
 * Generate a room name for solo streaming
 */
export function generateSoloRoomName(userId: string): string {
  return `solo_${userId}`;
}

/**
 * Create a live_streams record when going live.
 * This makes the stream visible on LiveTV for web viewers.
 * Matches the web GoLiveButton.tsx implementation exactly.
 * 
 * @param userId - The user's profile ID
 * @param streamingMode - 'solo' for solo streams, 'group' for group room publishing
 */
export async function startLiveStreamRecord(
  userId: string,
  streamingMode: 'solo' | 'group' = 'solo'
): Promise<{ liveStreamId: number | null; error: string | null }> {
  try {
    // First, end any existing live streams for this user (same as web)
    await supabase
      .from('live_streams')
      .update({
        live_available: false,
        ended_at: new Date().toISOString(),
      })
      .eq('profile_id', userId)
      .eq('live_available', true);

    // INSERT a new live_stream record (matches web GoLiveButton.tsx exactly)
    const { data, error } = await supabase
      .from('live_streams')
      .insert({
        profile_id: userId,
        live_available: true,
        streaming_mode: streamingMode,
        started_at: new Date().toISOString(),
        ended_at: null,
      })
      .select()
      .single();

    if (error) {
      return { liveStreamId: null, error: error.message };
    }

    return { liveStreamId: data?.id || null, error: null };
  } catch (err: any) {
    return { liveStreamId: null, error: err?.message || 'Failed to start stream' };
  }
}

/**
 * End a live_streams record when stopping the stream.
 */
export async function endLiveStreamRecord(userId: string): Promise<void> {
  try {
    // End any active live streams for this user
    const { error: streamError } = await supabase
      .from('live_streams')
      .update({
        live_available: false,
        ended_at: new Date().toISOString(),
      })
      .eq('profile_id', userId)
      .eq('live_available', true);

    if (streamError) {
      // Silently fail
    }

    // Update profile is_live status
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_live: false })
      .eq('id', userId);

    if (profileError) {
      // Silently fail
    }
  } catch (err) {
    // Silently fail
  }
}
