'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, RemoteParticipant, LocalTrack, Track, createLocalTracks } from 'livekit-client';
import { createClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type CallStatus = 
  | 'idle'           // No active call
  | 'initiating'     // Creating call record
  | 'ringing'        // Waiting for callee to answer (caller) or incoming call (callee)
  | 'connecting'     // Call accepted, joining RTC room
  | 'connected'      // In active call
  | 'ending'         // Call is ending
  | 'ended'          // Call ended
  | 'declined'       // Call was declined
  | 'missed'         // Call timed out
  | 'failed';        // Technical failure

export type CallType = 'voice' | 'video';

export interface CallParticipant {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface IncomingCall {
  callId: string;
  caller: CallParticipant;
  callType: CallType;
  roomName: string;
  createdAt: Date;
}

export interface ActiveCall {
  callId: string;
  roomName: string;
  callType: CallType;
  otherParticipant: CallParticipant;
  isCaller: boolean;
  startedAt: Date;
  answeredAt?: Date;
}

interface UseCallSessionWebOptions {
  onIncomingCall?: (call: IncomingCall) => void;
  onCallEnded?: (reason: string) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

const RING_TIMEOUT_MS = 60_000; // 60 seconds to answer

export function useCallSessionWeb(options: UseCallSessionWebOptions = {}) {
  const { onIncomingCall, onCallEnded, onError, enabled = true } = options;
  
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus>('idle');
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // RTC state
  const [room, setRoom] = useState<Room | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [remoteParticipant, setRemoteParticipant] = useState<RemoteParticipant | null>(null);
  
  // Refs for cleanup
  const roomRef = useRef<Room | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localTracksRef = useRef<LocalTrack[]>([]);

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, [supabase]);

  // Clean up ring timeout
  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  // Release media devices
  const releaseMediaDevices = useCallback(() => {
    localTracksRef.current.forEach(track => {
      try {
        track.stop();
        track.detach();
      } catch (err) {
        console.warn('[CALL] Error stopping track:', err);
      }
    });
    localTracksRef.current = [];
  }, []);

  // Disconnect from RTC room
  const disconnectRoom = useCallback(async () => {
    if (roomRef.current) {
      try {
        // Unpublish tracks first
        const participant = roomRef.current.localParticipant;
        if (participant) {
          const publications = Array.from(participant.trackPublications.values());
          for (const pub of publications) {
            if (pub.track) {
              try {
                await participant.unpublishTrack(pub.track);
              } catch (err) {
                console.warn('[CALL] Error unpublishing track:', err);
              }
            }
          }
        }
        
        await roomRef.current.disconnect();
      } catch (err) {
        console.warn('[CALL] Error disconnecting room:', err);
      }
      roomRef.current = null;
      setRoom(null);
    }
    releaseMediaDevices();
  }, [releaseMediaDevices]);

  // Get LiveKit token for call room
  const getCallToken = useCallback(async (roomName: string, participantName: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        roomName,
        participantName,
        canPublish: true,
        canSubscribe: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to get token (${response.status})`);
    }

    const { token, url } = await response.json();
    if (!token || !url) {
      throw new Error('Invalid token response');
    }
    
    return { token, url };
  }, [supabase]);

  // Connect to RTC room
  const connectToRoom = useCallback(async (roomName: string, callType: CallType) => {
    try {
      console.log('[CALL] Connecting to room:', roomName);
      
      // Get user profile for participant name
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single();
      
      const participantName = profile?.username || 'User';
      
      // Get token
      const { token, url } = await getCallToken(roomName, participantName);
      
      // Create room
      const { Room: LiveKitRoom } = await import('livekit-client');
      const newRoom = new LiveKitRoom({
        adaptiveStream: true,
        dynacast: true,
      });
      
      // Set up event handlers
      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        if (participant instanceof RemoteParticipant) {
          console.log('[CALL] Remote participant connected:', participant.identity);
          setRemoteParticipant(participant);
        }
      });
      
      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        if (participant instanceof RemoteParticipant) {
          console.log('[CALL] Remote participant disconnected:', participant.identity);
          setRemoteParticipant(null);
        }
      });
      
      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('[CALL] Room disconnected');
      });
      
      // Connect
      await newRoom.connect(url, token);
      console.log('[CALL] Connected to room');
      
      roomRef.current = newRoom;
      setRoom(newRoom);
      
      // Check for existing remote participants
      const existingParticipants = Array.from(newRoom.remoteParticipants.values());
      if (existingParticipants.length > 0) {
        setRemoteParticipant(existingParticipants[0]);
      }
      
      // Create and publish local tracks
      const { createLocalTracks: createTracks } = await import('livekit-client');
      const tracks = await createTracks({
        audio: true,
        video: callType === 'video',
      });
      
      localTracksRef.current = tracks;
      
      // Publish tracks
      for (const track of tracks) {
        await newRoom.localParticipant.publishTrack(track);
        console.log('[CALL] Published track:', track.kind);
      }
      
      return newRoom;
    } catch (err: any) {
      console.error('[CALL] Error connecting to room:', err);
      throw err;
    }
  }, [currentUserId, getCallToken, supabase]);

  // Initiate a call
  const initiateCall = useCallback(async (calleeId: string, callType: CallType = 'video'): Promise<boolean> => {
    if (!currentUserId) {
      const err = new Error('Not authenticated');
      setError(err);
      onError?.(err);
      return false;
    }
    
    if (status !== 'idle') {
      const err = new Error('Already in a call');
      setError(err);
      onError?.(err);
      return false;
    }
    
    try {
      setStatus('initiating');
      setError(null);
      
      // Call the RPC to initiate
      const { data, error: rpcError } = await supabase.rpc('initiate_call', {
        p_callee_id: calleeId,
        p_call_type: callType,
      });
      
      if (rpcError) {
        throw new Error(rpcError.message);
      }
      
      const result = data?.[0];
      if (result?.error) {
        throw new Error(result.error);
      }
      
      const callId = result?.call_id;
      const roomName = result?.room_name;
      
      if (!callId || !roomName) {
        throw new Error('Failed to create call');
      }
      
      console.log('[CALL] Call initiated:', { callId, roomName });
      
      // Get callee info
      const { data: calleeProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', calleeId)
        .single();
      
      setActiveCall({
        callId,
        roomName,
        callType,
        otherParticipant: {
          id: calleeId,
          username: calleeProfile?.username || 'User',
          avatarUrl: calleeProfile?.avatar_url,
        },
        isCaller: true,
        startedAt: new Date(),
      });
      
      setStatus('ringing');
      
      // Set ring timeout
      ringTimeoutRef.current = setTimeout(async () => {
        console.log('[CALL] Ring timeout - marking as missed');
        await supabase.rpc('mark_call_missed', { p_call_id: callId });
        setStatus('missed');
        setActiveCall(null);
        onCallEnded?.('timeout');
      }, RING_TIMEOUT_MS);
      
      return true;
    } catch (err: any) {
      console.error('[CALL] Error initiating call:', err);
      setError(err);
      setStatus('failed');
      onError?.(err);
      return false;
    }
  }, [currentUserId, status, supabase, onError, onCallEnded]);

  // Accept an incoming call
  const acceptCall = useCallback(async (): Promise<boolean> => {
    if (!incomingCall) {
      const err = new Error('No incoming call to accept');
      setError(err);
      onError?.(err);
      return false;
    }
    
    try {
      setStatus('connecting');
      clearRingTimeout();
      
      // Accept via RPC
      const { data, error: rpcError } = await supabase.rpc('accept_call', {
        p_call_id: incomingCall.callId,
      });
      
      if (rpcError) {
        throw new Error(rpcError.message);
      }
      
      const result = data?.[0];
      if (result?.error) {
        throw new Error(result.error);
      }
      
      console.log('[CALL] Call accepted:', incomingCall.callId);
      
      // Set active call
      setActiveCall({
        callId: incomingCall.callId,
        roomName: incomingCall.roomName,
        callType: incomingCall.callType,
        otherParticipant: incomingCall.caller,
        isCaller: false,
        startedAt: incomingCall.createdAt,
        answeredAt: new Date(),
      });
      
      // Connect to RTC room
      await connectToRoom(incomingCall.roomName, incomingCall.callType);
      
      setIncomingCall(null);
      setStatus('connected');
      
      return true;
    } catch (err: any) {
      console.error('[CALL] Error accepting call:', err);
      setError(err);
      setStatus('failed');
      onError?.(err);
      return false;
    }
  }, [incomingCall, supabase, connectToRoom, clearRingTimeout, onError]);

  // Decline an incoming call
  const declineCall = useCallback(async (): Promise<boolean> => {
    if (!incomingCall) {
      return false;
    }
    
    try {
      clearRingTimeout();
      
      await supabase.rpc('decline_call', {
        p_call_id: incomingCall.callId,
      });
      
      console.log('[CALL] Call declined:', incomingCall.callId);
      
      setIncomingCall(null);
      setStatus('idle');
      
      return true;
    } catch (err: any) {
      console.error('[CALL] Error declining call:', err);
      setError(err);
      onError?.(err);
      return false;
    }
  }, [incomingCall, supabase, clearRingTimeout, onError]);

  // End the current call
  const endCall = useCallback(async (reason: string = 'hangup'): Promise<boolean> => {
    const callId = activeCall?.callId || incomingCall?.callId;
    
    if (!callId) {
      return false;
    }
    
    try {
      setStatus('ending');
      clearRingTimeout();
      
      // Disconnect from RTC first
      await disconnectRoom();
      
      // End via RPC
      await supabase.rpc('end_call', {
        p_call_id: callId,
        p_reason: reason,
      });
      
      console.log('[CALL] Call ended:', callId, reason);
      
      setActiveCall(null);
      setIncomingCall(null);
      setStatus('ended');
      setRemoteParticipant(null);
      
      onCallEnded?.(reason);
      
      // Reset to idle after a moment
      setTimeout(() => {
        setStatus('idle');
      }, 1000);
      
      return true;
    } catch (err: any) {
      console.error('[CALL] Error ending call:', err);
      setError(err);
      setStatus('idle');
      onError?.(err);
      return false;
    }
  }, [activeCall, incomingCall, supabase, disconnectRoom, clearRingTimeout, onCallEnded, onError]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (!room) return;
    
    const audioTrack = localTracksRef.current.find(t => t.kind === 'audio');
    if (audioTrack) {
      if (isAudioEnabled) {
        await room.localParticipant.setMicrophoneEnabled(false);
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
      }
      setIsAudioEnabled(!isAudioEnabled);
    }
  }, [room, isAudioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!room) return;
    
    if (isVideoEnabled) {
      await room.localParticipant.setCameraEnabled(false);
    } else {
      await room.localParticipant.setCameraEnabled(true);
    }
    setIsVideoEnabled(!isVideoEnabled);
  }, [room, isVideoEnabled]);

  // Subscribe to call updates via realtime
  useEffect(() => {
    if (!currentUserId || !enabled) return;
    
    console.log('[CALL] Setting up realtime subscription for user:', currentUserId);
    
    const channel = supabase
      .channel(`calls-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${currentUserId}`,
        },
        async (payload: any) => {
          const call = payload.new;
          console.log('[CALL] Realtime event (callee):', payload.eventType, call?.status);
          
          if (payload.eventType === 'INSERT' && call?.status === 'ringing') {
            // Incoming call
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', call.caller_id)
              .single();
            
            const incoming: IncomingCall = {
              callId: call.id,
              caller: {
                id: call.caller_id,
                username: callerProfile?.username || 'Unknown',
                avatarUrl: callerProfile?.avatar_url,
              },
              callType: call.call_type,
              roomName: call.room_name,
              createdAt: new Date(call.created_at),
            };
            
            console.log('[CALL] Incoming call:', incoming);
            setIncomingCall(incoming);
            setStatus('ringing');
            onIncomingCall?.(incoming);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `caller_id=eq.${currentUserId}`,
        },
        async (payload: any) => {
          const call = payload.new;
          console.log('[CALL] Realtime event (caller):', payload.eventType, call?.status);
          
          // Handle call status changes for caller
          if (call?.status === 'accepted' && activeCall?.callId === call.id) {
            // Callee accepted - connect to room
            console.log('[CALL] Call accepted by callee, connecting to room');
            clearRingTimeout();
            setStatus('connecting');
            
            try {
              await connectToRoom(call.room_name, call.call_type);
              setStatus('connected');
              setActiveCall(prev => prev ? { ...prev, answeredAt: new Date() } : null);
            } catch (err: any) {
              console.error('[CALL] Error connecting after accept:', err);
              setError(err);
              setStatus('failed');
              onError?.(err);
            }
          } else if (call?.status === 'declined' && activeCall?.callId === call.id) {
            console.log('[CALL] Call declined by callee');
            clearRingTimeout();
            setStatus('declined');
            setActiveCall(null);
            onCallEnded?.('declined');
            setTimeout(() => setStatus('idle'), 2000);
          } else if (call?.status === 'ended' && activeCall?.callId === call.id) {
            console.log('[CALL] Call ended by other party');
            await disconnectRoom();
            setStatus('ended');
            setActiveCall(null);
            onCallEnded?.('ended');
            setTimeout(() => setStatus('idle'), 1000);
          }
        }
      )
      .subscribe();
    
    channelRef.current = channel;
    
    return () => {
      console.log('[CALL] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUserId, enabled, supabase, activeCall, connectToRoom, disconnectRoom, clearRingTimeout, onIncomingCall, onCallEnded, onError]);

  // Check for existing active call on mount
  useEffect(() => {
    if (!currentUserId || !enabled) return;
    
    const checkActiveCall = async () => {
      const { data } = await supabase.rpc('get_active_call');
      
      if (data && data.length > 0) {
        const call = data[0];
        console.log('[CALL] Found existing active call:', call);
        
        setActiveCall({
          callId: call.call_id,
          roomName: call.room_name,
          callType: call.call_type,
          otherParticipant: {
            id: call.other_user_id,
            username: call.other_username || 'User',
            avatarUrl: call.other_avatar,
          },
          isCaller: call.is_caller,
          startedAt: new Date(call.created_at),
          answeredAt: call.answered_at ? new Date(call.answered_at) : undefined,
        });
        
        if (call.status === 'accepted') {
          setStatus('connecting');
          try {
            await connectToRoom(call.room_name, call.call_type);
            setStatus('connected');
          } catch (err: any) {
            console.error('[CALL] Error reconnecting to call:', err);
            setError(err);
            setStatus('failed');
          }
        } else if (call.status === 'ringing') {
          setStatus('ringing');
        }
      }
    };
    
    checkActiveCall();
  }, [currentUserId, enabled, supabase, connectToRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearRingTimeout();
      disconnectRoom();
    };
  }, [clearRingTimeout, disconnectRoom]);

  return {
    // State
    status,
    activeCall,
    incomingCall,
    error,
    room,
    remoteParticipant,
    isAudioEnabled,
    isVideoEnabled,
    
    // Actions
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    
    // Computed
    isInCall: status === 'connected',
    isRinging: status === 'ringing',
    hasIncomingCall: !!incomingCall,
  };
}
