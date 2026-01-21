/**
 * useCallSession - In-app voice/video calling hook
 * 
 * Provides state machine for call lifecycle:
 * idle → outgoing_invite → connecting → in_call → ended
 * idle → incoming_invite → connecting → in_call → ended
 * 
 * Uses LiveKit for media and Supabase realtime for signaling.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, LocalVideoTrack, LocalAudioTrack, createLocalTracks, VideoPresets } from 'livekit-client';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

// Token endpoint
const TOKEN_API_URL = 'https://www.mylivelinks.com/api/livekit/token';

// Call states
export type CallState = 
  | 'idle'
  | 'outgoing_invite'
  | 'incoming_invite'
  | 'connecting'
  | 'in_call'
  | 'ended'
  | 'failed';

export type CallType = 'voice' | 'video';

export interface CallSession {
  id: string;
  callerId: string;
  calleeId: string;
  callType: CallType;
  roomName: string;
  createdAt: string;
  answeredAt?: string;
}

export interface CallParticipant {
  id: string;
  username?: string;
  avatarUrl?: string;
}

export interface UseCallSessionReturn {
  // State
  callState: CallState;
  callType: CallType | null;
  currentCall: CallSession | null;
  remoteParticipant: CallParticipant | null;
  error: string | null;
  callDuration: number;
  
  // Media state
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isSpeakerEnabled: boolean;
  localVideoTrack: LocalVideoTrack | null;
  localAudioTrack: LocalAudioTrack | null;
  
  // Actions
  startVoiceCall: (userId: string) => Promise<void>;
  startVideoCall: (userId: string) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  endCall: (callId?: string) => Promise<void>;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleSpeaker: () => void;
}

// Generate a UUID for the call session
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate unique room name for call using the call session ID
// Format: call_<uuid> so token route can look up the call session
function generateCallRoomName(callSessionId: string): string {
  return `call_${callSessionId}`;
}

// Fetch LiveKit token for call
async function fetchCallToken(
  roomName: string,
  identity: string,
  name: string
): Promise<{ token: string; url: string }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(TOKEN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      roomName,
      participantName: name,
      canPublish: true,
      canSubscribe: true,
      role: 'participant',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || `Token request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data?.token || !data?.url) {
    throw new Error('Invalid token response');
  }

  return { token: data.token, url: data.url };
}

export function useCallSession(): UseCallSessionReturn {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // State
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [remoteParticipant, setRemoteParticipant] = useState<CallParticipant | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Media state
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Refs
  const roomRef = useRef<Room | null>(null);
  const mountedRef = useRef(true);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupCall();
    };
  }, []);

  // Subscribe to incoming calls via realtime
  useEffect(() => {
    if (!userId) return;

    console.log('[CallSession] Setting up realtime subscription for callee:', userId);

    const channel = supabase
      .channel(`call-invites-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sessions',
          filter: `callee_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[CallSession] Realtime event received (callee):', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });

          if (!mountedRef.current) {
            console.log('[CallSession] Component unmounted, ignoring event');
            return;
          }
          
          const row = payload.new as any;
          if (!row) {
            console.log('[CallSession] No row data in payload');
            return;
          }

          // Handle incoming call invite
          if (payload.eventType === 'INSERT' && row.status === 'pending') {
            console.log('[CallSession] Incoming call detected:', row.id);
            handleIncomingCall(row);
          }
          
          // Handle call status changes
          if (payload.eventType === 'UPDATE') {
            console.log('[CallSession] Call status update:', row.status);
            handleCallStatusChange(row);
          }
        }
      )
      .subscribe((status) => {
        console.log('[CallSession] Callee subscription status:', status);
      });

    // Also subscribe as caller to get status updates
    const callerChannel = supabase
      .channel(`call-caller-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `caller_id=eq.${userId}`,
        },
        (payload) => {
          if (!mountedRef.current) return;
          const row = payload.new as any;
          if (row) handleCallStatusChange(row);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      callerChannel.unsubscribe();
    };
  }, [userId]);

  // Check for active call on mount (resilience for app re-open)
  useEffect(() => {
    if (!userId) return;

    const checkActiveCall = async () => {
      const { data, error } = await supabase.rpc('get_active_call', { p_user_id: userId });
      
      if (error || !data || data.length === 0) return;

      const call = data[0];
      if (!call) return;

      // Restore call state
      const session: CallSession = {
        id: call.id,
        callerId: call.caller_id,
        calleeId: call.callee_id,
        callType: call.call_type as CallType,
        roomName: call.room_name,
        createdAt: call.created_at,
        answeredAt: call.answered_at,
      };

      setCurrentCall(session);
      setCallType(session.callType);

      if (call.status === 'pending') {
        setCallState(call.is_caller ? 'outgoing_invite' : 'incoming_invite');
        fetchRemoteParticipant(call.is_caller ? call.callee_id : call.caller_id);
      } else if (call.status === 'accepted' || call.status === 'active') {
        setCallState('connecting');
        fetchRemoteParticipant(call.is_caller ? call.callee_id : call.caller_id);
        // Reconnect to room
        connectToRoom(session);
      }
    };

    checkActiveCall();
  }, [userId]);

  // Fetch remote participant profile
  const fetchRemoteParticipant = async (profileId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', profileId)
      .single();

    if (data && mountedRef.current) {
      setRemoteParticipant({
        id: data.id,
        username: data.username,
        avatarUrl: data.avatar_url,
      });
    }
  };

  // Handle incoming call
  const handleIncomingCall = async (row: any) => {
    console.log('[CallSession] handleIncomingCall called:', {
      callId: row.id,
      callerId: row.caller_id,
      calleeId: row.callee_id,
      status: row.status,
      roomName: row.room_name,
      currentCallState: callState,
    });

    // Only handle if we're idle
    if (callState !== 'idle') {
      console.log('[CallSession] Not idle, auto-declining call');
      // Auto-decline if already in a call
      await supabase.rpc('decline_call', { p_call_id: row.id, p_user_id: userId });
      return;
    }

    const session: CallSession = {
      id: row.id,
      callerId: row.caller_id,
      calleeId: row.callee_id,
      callType: row.call_type as CallType,
      roomName: row.room_name,
      createdAt: row.created_at,
    };

    console.log('[CallSession] Setting incoming call state');
    setCurrentCall(session);
    setCallType(session.callType);
    setCallState('incoming_invite');
    fetchRemoteParticipant(row.caller_id);
  };

  // Handle call status changes
  const handleCallStatusChange = (row: any) => {
    if (!currentCall || row.id !== currentCall.id) return;

    switch (row.status) {
      case 'accepted':
        // Callee accepted - both parties should connect
        setCallState('connecting');
        if (callState === 'outgoing_invite') {
          connectToRoom(currentCall);
        }
        break;
      case 'active':
        setCallState('in_call');
        break;
      case 'ended':
      case 'declined':
      case 'missed':
      case 'cancelled':
        cleanupCall();
        setCallState('ended');
        setTimeout(() => {
          if (mountedRef.current) {
            resetState();
          }
        }, 2000);
        break;
    }
  };

  // Connect to LiveKit room
  const connectToRoom = async (session: CallSession) => {
    if (!userId || !session) return;

    try {
      const userName = user?.email?.split('@')[0] || 'User';
      const { token, url } = await fetchCallToken(session.roomName, userId, userName);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      room.on(RoomEvent.Connected, () => {
        console.log('[CallSession] Connected to room');
        if (mountedRef.current) {
          // Mark call as active
          supabase.rpc('activate_call', { p_call_id: session.id, p_user_id: userId });
          setCallState('in_call');
          
          // Start duration timer
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
          }
          setCallDuration(0);
          durationIntervalRef.current = setInterval(() => {
            if (mountedRef.current) {
              setCallDuration(d => d + 1);
            }
          }, 1000);
        }
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        console.log('[CallSession] Disconnected:', reason);
        if (mountedRef.current && callState === 'in_call') {
          cleanupCall();
          setCallState('ended');
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        // Remote participant left - end call
        if (mountedRef.current) {
          endCall(session.id);
        }
      });

      await room.connect(url, token);
      roomRef.current = room;

      // Create and publish tracks
      const isVideo = session.callType === 'video';
      const tracks = await createLocalTracks({
        audio: true,
        video: isVideo ? {
          facingMode: 'user',
          resolution: VideoPresets.h720.resolution,
        } : false,
      });

      let videoTrack: LocalVideoTrack | null = null;
      let audioTrack: LocalAudioTrack | null = null;

      for (const track of tracks) {
        if (track.kind === 'video') {
          videoTrack = track as LocalVideoTrack;
        } else if (track.kind === 'audio') {
          audioTrack = track as LocalAudioTrack;
        }
        await room.localParticipant.publishTrack(track);
      }

      if (mountedRef.current) {
        setLocalVideoTrack(videoTrack);
        setLocalAudioTrack(audioTrack);
        setIsCameraEnabled(isVideo);
        setIsMicEnabled(true);
      }

    } catch (err: any) {
      console.error('[CallSession] Connect error:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to connect');
        setCallState('failed');
        // End the call on failure
        if (session.id) {
          supabase.rpc('end_call', { p_call_id: session.id, p_user_id: userId, p_reason: 'connection_failed' });
        }
      }
    }
  };

  // Cleanup call resources
  const cleanupCall = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // IMPORTANT: Disconnect room FIRST to stop the renderer from processing frames
    // This prevents the "release() called on an object with refcount < 1" crash
    const room = roomRef.current;
    if (room) {
      roomRef.current = null;
      try {
        room.disconnect();
      } catch (e) {
        console.warn('[CallSession] Error disconnecting room:', e);
      }
    }
    
    // Small delay to let WebRTC cleanup complete before stopping tracks
    setTimeout(() => {
      if (localVideoTrack) {
        try {
          localVideoTrack.stop();
        } catch (e) {
          console.warn('[CallSession] Error stopping video track:', e);
        }
      }
      if (localAudioTrack) {
        try {
          localAudioTrack.stop();
        } catch (e) {
          console.warn('[CallSession] Error stopping audio track:', e);
        }
      }
    }, 100);
    
    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
  }, [localVideoTrack, localAudioTrack]);

  // Reset state to idle
  const resetState = () => {
    setCallState('idle');
    setCallType(null);
    setCurrentCall(null);
    setRemoteParticipant(null);
    setError(null);
    setIsMicEnabled(true);
    setIsCameraEnabled(false);
    setIsSpeakerEnabled(true);
    setCallDuration(0);
  };

  // Start voice call
  const startVoiceCall = useCallback(async (targetUserId: string) => {
    if (!userId || callState !== 'idle') return;

    setError(null);
    setCallState('outgoing_invite');
    setCallType('voice');

    try {
      // Pre-generate UUID so we can set room_name in single insert
      const callId = generateUUID();
      const roomName = generateCallRoomName(callId);

      console.log('[CallSession] Starting voice call:', { callId, roomName, targetUserId });

      const { data: insertData, error: insertError } = await supabase
        .from('call_sessions')
        .insert({
          id: callId,
          caller_id: userId,
          callee_id: targetUserId,
          call_type: 'voice',
          room_name: roomName,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[CallSession] Insert error:', insertError);
        throw insertError;
      }

      console.log('[CallSession] Call session created:', insertData);

      const session: CallSession = {
        id: insertData.id,
        callerId: insertData.caller_id,
        calleeId: insertData.callee_id,
        callType: 'voice',
        roomName: insertData.room_name,
        createdAt: insertData.created_at,
      };

      setCurrentCall(session);
      fetchRemoteParticipant(targetUserId);

      // Set timeout for missed call
      setTimeout(async () => {
        if (mountedRef.current && callState === 'outgoing_invite') {
          await supabase.rpc('end_call', { p_call_id: session.id, p_user_id: userId, p_reason: 'missed' });
          cleanupCall();
          setCallState('ended');
        }
      }, 30000); // 30 second timeout

    } catch (err: any) {
      console.error('[CallSession] Start voice call error:', err);
      setError(err.message || 'Failed to start call');
      setCallState('failed');
    }
  }, [userId, callState]);

  // Start video call
  const startVideoCall = useCallback(async (targetUserId: string) => {
    if (!userId || callState !== 'idle') return;

    setError(null);
    setCallState('outgoing_invite');
    setCallType('video');
    setIsCameraEnabled(true);

    try {
      // Create local video track immediately for preview
      console.log('[CallSession] Creating local video preview...');
      const tracks = await createLocalTracks({
        audio: false,
        video: {
          facingMode: 'user',
          resolution: VideoPresets.h720.resolution,
        },
      });

      for (const track of tracks) {
        if (track.kind === 'video' && mountedRef.current) {
          setLocalVideoTrack(track as LocalVideoTrack);
        }
      }

      // Pre-generate UUID so we can set room_name in single insert
      const callId = generateUUID();
      const roomName = generateCallRoomName(callId);

      console.log('[CallSession] Starting video call:', { callId, roomName, targetUserId });

      const { data: insertData, error: insertError } = await supabase
        .from('call_sessions')
        .insert({
          id: callId,
          caller_id: userId,
          callee_id: targetUserId,
          call_type: 'video',
          room_name: roomName,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[CallSession] Insert error:', insertError);
        throw insertError;
      }

      console.log('[CallSession] Call session created:', insertData);

      const session: CallSession = {
        id: insertData.id,
        callerId: insertData.caller_id,
        calleeId: insertData.callee_id,
        callType: 'video',
        roomName: insertData.room_name,
        createdAt: insertData.created_at,
      };

      setCurrentCall(session);
      fetchRemoteParticipant(targetUserId);

      // Set timeout for missed call
      setTimeout(async () => {
        if (mountedRef.current && callState === 'outgoing_invite') {
          await supabase.rpc('end_call', { p_call_id: session.id, p_user_id: userId, p_reason: 'missed' });
          cleanupCall();
          setCallState('ended');
        }
      }, 30000);

    } catch (err: any) {
      console.error('[CallSession] Start video call error:', err);
      setError(err.message || 'Failed to start call');
      setCallState('failed');
    }
  }, [userId, callState]);

  // Accept incoming call
  const acceptCall = useCallback(async (callId: string) => {
    if (!userId || callState !== 'incoming_invite' || !currentCall) return;

    setError(null);
    setCallState('connecting');

    try {
      const { data: success, error: acceptError } = await supabase.rpc('accept_call', {
        p_call_id: callId,
        p_user_id: userId,
      });

      if (acceptError) throw acceptError;
      if (!success) throw new Error('Call no longer available');

      // Connect to room
      await connectToRoom(currentCall);

    } catch (err: any) {
      console.error('[CallSession] Accept call error:', err);
      setError(err.message || 'Failed to accept call');
      setCallState('failed');
    }
  }, [userId, callState, currentCall]);

  // Decline incoming call
  const declineCall = useCallback(async (callId: string) => {
    if (!userId) return;

    try {
      await supabase.rpc('decline_call', {
        p_call_id: callId,
        p_user_id: userId,
      });

      cleanupCall();
      resetState();

    } catch (err: any) {
      console.error('[CallSession] Decline call error:', err);
      resetState();
    }
  }, [userId]);

  // End call
  const endCall = useCallback(async (callId?: string) => {
    if (!userId) return;

    const id = callId || currentCall?.id;
    if (!id) {
      cleanupCall();
      resetState();
      return;
    }

    try {
      await supabase.rpc('end_call', {
        p_call_id: id,
        p_user_id: userId,
        p_reason: 'ended',
      });
    } catch (err: any) {
      console.error('[CallSession] End call error:', err);
    }

    cleanupCall();
    setCallState('ended');
    
    setTimeout(() => {
      if (mountedRef.current) {
        resetState();
      }
    }, 1000);
  }, [userId, currentCall]);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (localAudioTrack) {
      if (isMicEnabled) {
        localAudioTrack.mute();
      } else {
        localAudioTrack.unmute();
      }
      setIsMicEnabled(!isMicEnabled);
    }
  }, [localAudioTrack, isMicEnabled]);

  // Toggle camera
  const toggleCam = useCallback(async () => {
    if (!roomRef.current) return;

    if (isCameraEnabled && localVideoTrack) {
      // Disable camera
      localVideoTrack.stop();
      await roomRef.current.localParticipant.unpublishTrack(localVideoTrack);
      setLocalVideoTrack(null);
      setIsCameraEnabled(false);
    } else if (!isCameraEnabled) {
      // Enable camera
      try {
        const tracks = await createLocalTracks({
          audio: false,
          video: {
            facingMode: 'user',
            resolution: VideoPresets.h720.resolution,
          },
        });

        const videoTrack = tracks.find(t => t.kind === 'video') as LocalVideoTrack;
        if (videoTrack) {
          await roomRef.current.localParticipant.publishTrack(videoTrack);
          setLocalVideoTrack(videoTrack);
          setIsCameraEnabled(true);
        }
      } catch (err) {
        console.error('[CallSession] Toggle camera error:', err);
      }
    }
  }, [isCameraEnabled, localVideoTrack]);

  // Toggle speaker (placeholder - actual implementation depends on native audio routing)
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerEnabled(!isSpeakerEnabled);
    // Note: Actual speaker routing requires native module integration
    // For now this just tracks the UI state
  }, [isSpeakerEnabled]);

  return {
    callState,
    callType,
    currentCall,
    remoteParticipant,
    error,
    callDuration,
    isMicEnabled,
    isCameraEnabled,
    isSpeakerEnabled,
    localVideoTrack,
    localAudioTrack,
    startVoiceCall,
    startVideoCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMic,
    toggleCam,
    toggleSpeaker,
  };
}
