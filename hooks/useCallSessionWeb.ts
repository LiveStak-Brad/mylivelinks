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
  
  // Keep a ref to the current call ID for reliable access in callbacks
  const currentCallIdRef = useRef<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs for callbacks to avoid stale closures in useEffect
  const onIncomingCallRef = useRef(onIncomingCall);
  const onCallEndedRef = useRef(onCallEnded);
  const onErrorRef = useRef(onError);
  const activeCallRef = useRef(activeCall);
  
  // Keep refs updated
  useEffect(() => { onIncomingCallRef.current = onIncomingCall; }, [onIncomingCall]);
  useEffect(() => { onCallEndedRef.current = onCallEnded; }, [onCallEnded]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  
  // RTC state
  const [room, setRoom] = useState<Room | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [remoteParticipant, setRemoteParticipant] = useState<RemoteParticipant | null>(null);
  
  // Ref to store remote audio elements for speaker mute
  const remoteAudioElementsRef = useRef<HTMLAudioElement[]>([]);
  
  // State to store remote video track for UI attachment
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<any>(null);
  
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
          console.log('[CALL] Remote participant tracks:', Array.from(participant.trackPublications.values()).map(t => ({ kind: t.kind, subscribed: t.isSubscribed })));
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
      
      // Track subscription events - crucial for audio/video
      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('[CALL] Track subscribed:', track.kind, 'from', participant.identity);
        if (track.kind === 'audio') {
          // Attach audio track to play it
          const audioElement = track.attach();
          audioElement.play().catch(e => console.error('[CALL] Audio play error:', e));
          // Store reference for speaker mute control
          remoteAudioElementsRef.current.push(audioElement);
          console.log('[CALL] Audio track attached and playing');
        } else if (track.kind === 'video') {
          console.log('[CALL] Video track received, storing for UI');
          // Store the track so UI can attach it
          setRemoteVideoTrack(track);
          // Also store on window for immediate access
          (window as any).__livekitRemoteVideoTrack = track;
        }
      });
      
      newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('[CALL] Track unsubscribed:', track.kind, 'from', participant.identity);
        track.detach();
      });
      
      newRoom.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log('[CALL] Track published by remote:', publication.kind, 'from', participant.identity, 'subscribed:', publication.isSubscribed);
      });
      
      // Connect
      await newRoom.connect(url, token);
      console.log('[CALL] Connected to room');
      
      roomRef.current = newRoom;
      setRoom(newRoom);
      
      // Check for existing remote participants and their tracks
      const existingParticipants = Array.from(newRoom.remoteParticipants.values());
      console.log('[CALL] Existing remote participants:', existingParticipants.length);
      if (existingParticipants.length > 0) {
        const remoteP = existingParticipants[0];
        setRemoteParticipant(remoteP);
        console.log('[CALL] Existing remote participant:', remoteP.identity);
        
        // Subscribe to existing tracks
        remoteP.trackPublications.forEach((publication) => {
          console.log('[CALL] Existing track publication:', publication.kind, 'subscribed:', publication.isSubscribed);
          if (publication.track && publication.kind === 'audio') {
            const audioElement = publication.track.attach();
            audioElement.play().catch(e => console.error('[CALL] Audio play error:', e));
            console.log('[CALL] Attached existing audio track');
          }
        });
      }
      
      // Create and publish local tracks - handle video failure gracefully
      const { createLocalTracks: createTracks } = await import('livekit-client');
      let tracks: LocalTrack[] = [];
      
      try {
        // Try to create both audio and video tracks
        tracks = await createTracks({
          audio: true,
          video: callType === 'video',
        });
      } catch (trackErr: any) {
        console.warn('[CALL] Error creating tracks with video, falling back to audio only:', trackErr.message);
        // Fall back to audio only if video fails
        try {
          tracks = await createTracks({
            audio: true,
            video: false,
          });
        } catch (audioErr: any) {
          console.error('[CALL] Error creating audio track:', audioErr);
          throw audioErr;
        }
      }
      
      localTracksRef.current = tracks;
      
      // Publish tracks
      for (const track of tracks) {
        try {
          await newRoom.localParticipant.publishTrack(track);
          console.log('[CALL] Published track:', track.kind);
        } catch (pubErr: any) {
          console.warn('[CALL] Error publishing track:', track.kind, pubErr.message);
        }
      }
      
      return newRoom;
    } catch (err: any) {
      console.error('[CALL] Error connecting to room:', err);
      throw err;
    }
  }, [currentUserId, getCallToken, supabase]);

  // Generate a UUID for the call session
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Initiate a call
  const initiateCall = useCallback(async (calleeId: string, callType: CallType = 'video'): Promise<boolean> => {
    console.log('[CALL] initiateCall called:', { calleeId, callType, currentUserId, status });
    
    if (!currentUserId) {
      console.error('[CALL] Not authenticated - currentUserId is null');
      const err = new Error('Not authenticated');
      setError(err);
      onError?.(err);
      return false;
    }
    
    // Allow new calls from idle or terminal states (missed, ended, failed, declined)
    const terminalStates = ['idle', 'missed', 'ended', 'failed', 'declined'];
    if (!terminalStates.includes(status)) {
      console.error('[CALL] Already in a call - status:', status);
      const err = new Error('Already in a call');
      setError(err);
      onError?.(err);
      return false;
    }
    
    try {
      setStatus('initiating');
      setError(null);
      
      // Request camera/mic permissions BEFORE creating the call session
      // This ensures the caller has granted permissions before the callee sees the incoming call
      if (callType === 'video') {
        console.log('[CALL] Requesting camera permission before initiating video call');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          // Stop the stream - we'll create proper tracks when connecting to room
          stream.getTracks().forEach(track => track.stop());
          console.log('[CALL] Camera permission granted');
        } catch (permErr: any) {
          console.error('[CALL] Camera permission denied:', permErr);
          throw new Error('Camera permission required for video calls');
        }
      } else {
        console.log('[CALL] Requesting microphone permission before initiating voice call');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          console.log('[CALL] Microphone permission granted');
        } catch (permErr: any) {
          console.error('[CALL] Microphone permission denied:', permErr);
          throw new Error('Microphone permission required for calls');
        }
      }
      
      // Pre-generate UUID so we can set room_name in single insert
      const callId = generateUUID();
      const roomName = `call_${callId}`;
      
      console.log('[CALL] Creating call session:', { callId, roomName, calleeId });
      
      // Insert directly into call_sessions table (same as mobile)
      const { data: insertData, error: insertError } = await supabase
        .from('call_sessions')
        .insert({
          id: callId,
          caller_id: currentUserId,
          callee_id: calleeId,
          call_type: callType,
          room_name: roomName,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[CALL] Insert error:', insertError);
        throw new Error(insertError.message);
      }
      
      console.log('[CALL] Call initiated:', { callId, roomName });
      
      // Get callee info
      const { data: calleeProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', calleeId)
        .single();
      
      currentCallIdRef.current = callId;
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
        // Update call_sessions directly instead of using RPC
        await supabase
          .from('call_sessions')
          .update({ status: 'missed', ended_at: new Date().toISOString(), end_reason: 'timeout' })
          .eq('id', callId);
        
        // Send missed call message to the callee
        try {
          await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              otherProfileId: calleeId,
              type: 'text',
              text: `📞 You missed a ${callType} call`,
            }),
          });
          console.log('[CALL] Sent missed call message');
        } catch (msgErr) {
          console.error('[CALL] Error sending missed call message:', msgErr);
        }
        
        setActiveCall(null);
        onCallEnded?.('timeout');
        // Reset to idle after a brief delay so UI can show "missed" state
        setTimeout(() => setStatus('idle'), 2000);
      }, RING_TIMEOUT_MS);
      
      return true;
    } catch (err: any) {
      console.error('[CALL] Error initiating call:', err);
      setError(err);
      onError?.(err);
      // Reset to idle after a brief delay so UI can show error
      setTimeout(() => setStatus('idle'), 2000);
      return false;
    }
  }, [currentUserId, status, supabase, onError, onCallEnded]);

  // Accept an incoming call
  const acceptCall = useCallback(async (): Promise<boolean> => {
    if (!incomingCall || !currentUserId) {
      const err = new Error('No incoming call to accept');
      setError(err);
      onError?.(err);
      return false;
    }
    
    try {
      setStatus('connecting');
      clearRingTimeout();
      
      // Accept by updating call_sessions directly
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({ status: 'accepted', answered_at: new Date().toISOString() })
        .eq('id', incomingCall.callId)
        .eq('callee_id', currentUserId)
        .eq('status', 'pending');
      
      if (updateError) {
        throw new Error(updateError.message);
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
    if (!incomingCall || !currentUserId) {
      return false;
    }
    
    try {
      clearRingTimeout();
      
      // Decline by updating call_sessions directly
      await supabase
        .from('call_sessions')
        .update({ status: 'declined', ended_at: new Date().toISOString(), end_reason: 'declined' })
        .eq('id', incomingCall.callId)
        .eq('callee_id', currentUserId);
      
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
  }, [incomingCall, currentUserId, supabase, clearRingTimeout, onError]);

  // End the current call
  const endCall = useCallback(async (reason: string = 'hangup'): Promise<boolean> => {
    // Use ref first, then fall back to state
    const callId = currentCallIdRef.current || activeCall?.callId || incomingCall?.callId;
    console.log('[CALL] endCall called, ref:', currentCallIdRef.current, 'activeCall:', activeCall?.callId, 'incomingCall:', incomingCall?.callId);
    
    if (!callId) {
      console.error('[CALL] No callId found to end');
      // Force reset state anyway
      currentCallIdRef.current = null;
      setActiveCall(null);
      setIncomingCall(null);
      setStatus('idle');
      return false;
    }
    
    try {
      setStatus('ending');
      clearRingTimeout();
      
      // Disconnect from RTC first
      await disconnectRoom();
      
      // End by updating call_sessions directly
      await supabase
        .from('call_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString(), end_reason: reason })
        .eq('id', callId);
      
      console.log('[CALL] Call ended:', callId, reason);
      
      currentCallIdRef.current = null;
      setActiveCall(null);
      setIncomingCall(null);
      setRemoteParticipant(null);
      
      // Reset audio/video/speaker state for next call
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
      setIsSpeakerEnabled(true);
      remoteAudioElementsRef.current = [];
      
      onCallEnded?.(reason);
      
      // Reset to idle after brief delay
      setTimeout(() => setStatus('idle'), 1000);
      
      return true;
    } catch (err: any) {
      console.error('[CALL] Error ending call:', err);
      setError(err);
      setStatus('idle');
      onError?.(err);
      return false;
    }
  }, [activeCall, incomingCall, supabase, disconnectRoom, clearRingTimeout, onCallEnded, onError]);

  // Toggle audio (mute/unmute) - use roomRef for current value
  const toggleAudio = useCallback(async () => {
    const currentRoom = roomRef.current;
    console.log('[CALL] toggleAudio called, room:', !!currentRoom, 'isAudioEnabled:', isAudioEnabled);
    if (!currentRoom) {
      console.error('[CALL] No room to toggle audio');
      return;
    }
    
    try {
      if (isAudioEnabled) {
        await currentRoom.localParticipant.setMicrophoneEnabled(false);
        console.log('[CALL] Microphone disabled (muted)');
      } else {
        await currentRoom.localParticipant.setMicrophoneEnabled(true);
        console.log('[CALL] Microphone enabled (unmuted)');
      }
      setIsAudioEnabled(!isAudioEnabled);
    } catch (err) {
      console.error('[CALL] Error toggling audio:', err);
    }
  }, [isAudioEnabled]);

  // Toggle video (camera on/off) - use roomRef for current value
  const toggleVideo = useCallback(async () => {
    const currentRoom = roomRef.current;
    console.log('[CALL] toggleVideo called, room:', !!currentRoom, 'isVideoEnabled:', isVideoEnabled);
    if (!currentRoom) {
      console.error('[CALL] No room to toggle video');
      return;
    }
    
    try {
      if (isVideoEnabled) {
        await currentRoom.localParticipant.setCameraEnabled(false);
        console.log('[CALL] Camera disabled');
      } else {
        await currentRoom.localParticipant.setCameraEnabled(true);
        console.log('[CALL] Camera enabled');
      }
      setIsVideoEnabled(!isVideoEnabled);
    } catch (err) {
      console.error('[CALL] Error toggling video:', err);
    }
  }, [isVideoEnabled]);

  // Toggle speaker (mute/unmute incoming audio)
  const toggleSpeaker = useCallback(() => {
    console.log('[CALL] toggleSpeaker called, isSpeakerEnabled:', isSpeakerEnabled, 'audioElements:', remoteAudioElementsRef.current.length);
    
    const newState = !isSpeakerEnabled;
    remoteAudioElementsRef.current.forEach(audioEl => {
      audioEl.muted = !newState; // muted = true means speaker off
      console.log('[CALL] Set audio element muted:', !newState);
    });
    setIsSpeakerEnabled(newState);
  }, [isSpeakerEnabled]);

  // Subscribe to call updates via realtime (using call_sessions table)
  useEffect(() => {
    if (!currentUserId || !enabled) return;
    
    console.log('[CALL] Setting up realtime subscription for user:', currentUserId);
    
    const channel = supabase
      .channel(`call-sessions-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sessions',
          filter: `callee_id=eq.${currentUserId}`,
        },
        async (payload: any) => {
          const call = payload.new;
          console.log('[CALL] Realtime event (callee):', payload.eventType, call?.status);
          
          // call_sessions uses 'pending' status, not 'ringing'
          if (payload.eventType === 'INSERT' && call?.status === 'pending') {
            // Incoming call - clear any activeCall state first
            setActiveCall(null);
            
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
            
            console.log('[CALL] Incoming call - setting incomingCall, clearing activeCall:', incoming);
            currentCallIdRef.current = call.id;
            setIncomingCall(incoming);
            setStatus('ringing');
            onIncomingCallRef.current?.(incoming);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `caller_id=eq.${currentUserId}`,
        },
        async (payload: any) => {
          const call = payload.new;
          console.log('[CALL] Realtime event (caller):', payload.eventType, call?.status, 'activeCallRef:', activeCallRef.current?.callId, 'call.id:', call?.id);
          
          // Handle call status changes for caller
          if (call?.status === 'accepted' && activeCallRef.current?.callId === call.id) {
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
              onErrorRef.current?.(err);
            }
          } else if (call?.status === 'declined' && activeCallRef.current?.callId === call.id) {
            console.log('[CALL] Call declined by callee');
            clearRingTimeout();
            
            // Send "unavailable" message to caller
            try {
              await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  otherProfileId: call.callee_id,
                  type: 'text',
                  text: `📞 User is unavailable right now`,
                }),
              });
              console.log('[CALL] Sent unavailable message');
            } catch (msgErr) {
              console.error('[CALL] Error sending unavailable message:', msgErr);
            }
            
            setStatus('declined');
            setActiveCall(null);
            onCallEndedRef.current?.('declined');
            setTimeout(() => setStatus('idle'), 2000);
          } else if (call?.status === 'ended' && activeCallRef.current?.callId === call.id) {
            console.log('[CALL] Call ended by other party');
            await disconnectRoom();
            setStatus('ended');
            setActiveCall(null);
            onCallEndedRef.current?.('ended');
            setTimeout(() => setStatus('idle'), 1000);
          }
        }
      )
      .subscribe((status) => {
        console.log('[CALL] Subscription status:', status);
      });
    
    channelRef.current = channel;
    
    return () => {
      console.log('[CALL] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // Only re-subscribe when user or enabled changes, not on every state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, enabled]);

  // Check for existing active call on mount (query call_sessions directly)
  // Only restore calls that are recent (within last 2 minutes) to avoid stale state
  useEffect(() => {
    if (!currentUserId || !enabled) return;
    
    const checkActiveCall = async () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      // First, clean up any stale pending calls older than 2 minutes
      await supabase
        .from('call_sessions')
        .update({ status: 'missed', ended_at: new Date().toISOString(), end_reason: 'stale' })
        .or(`caller_id.eq.${currentUserId},callee_id.eq.${currentUserId}`)
        .eq('status', 'pending')
        .lt('created_at', twoMinutesAgo);
      
      console.log('[CALL] Cleaned up stale pending calls');
      
      // Query call_sessions directly instead of using RPC from calls table
      // Only get calls created within the last 2 minutes to avoid stale calls
      const { data, error } = await supabase
        .from('call_sessions')
        .select(`
          id,
          caller_id,
          callee_id,
          call_type,
          status,
          room_name,
          created_at,
          answered_at
        `)
        .or(`caller_id.eq.${currentUserId},callee_id.eq.${currentUserId}`)
        .in('status', ['pending', 'accepted', 'active'])
        .gte('created_at', twoMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data) {
        console.log('[CALL] No recent active calls found');
        return;
      }
      
      console.log('[CALL] Found existing active call:', data);
      console.log('[CALL] currentUserId:', currentUserId, 'caller_id:', data.caller_id, 'callee_id:', data.callee_id);
      
      const isCaller = data.caller_id === currentUserId;
      console.log('[CALL] isCaller:', isCaller);
      const otherUserId = isCaller ? data.callee_id : data.caller_id;
      
      // Get other user's profile
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', otherUserId)
        .single();
      
      if (data.status === 'accepted' || data.status === 'active') {
        // Both parties should connect to the room
        currentCallIdRef.current = data.id;
        setActiveCall({
          callId: data.id,
          roomName: data.room_name,
          callType: data.call_type as CallType,
          otherParticipant: {
            id: otherUserId,
            username: otherProfile?.username || 'User',
            avatarUrl: otherProfile?.avatar_url,
          },
          isCaller,
          startedAt: new Date(data.created_at),
          answeredAt: data.answered_at ? new Date(data.answered_at) : undefined,
        });
        setStatus('connecting');
        try {
          await connectToRoom(data.room_name, data.call_type as CallType);
          setStatus('connected');
        } catch (err: any) {
          console.error('[CALL] Error reconnecting to call:', err);
          setError(err);
          setStatus('failed');
        }
      } else if (data.status === 'pending') {
        if (!isCaller) {
          // We're the callee - this is an INCOMING call, set incomingCall not activeCall
          // Clear any activeCall that might have been set incorrectly
          currentCallIdRef.current = data.id;
          setActiveCall(null);
          console.log('[CALL] Setting as incoming call for callee');
          setIncomingCall({
            callId: data.id,
            caller: {
              id: otherUserId,
              username: otherProfile?.username || 'User',
              avatarUrl: otherProfile?.avatar_url,
            },
            callType: data.call_type as CallType,
            roomName: data.room_name,
            createdAt: new Date(data.created_at),
          });
          setStatus('ringing');
          onIncomingCallRef.current?.({
            callId: data.id,
            caller: {
              id: otherUserId,
              username: otherProfile?.username || 'User',
              avatarUrl: otherProfile?.avatar_url,
            },
            callType: data.call_type as CallType,
            roomName: data.room_name,
            createdAt: new Date(data.created_at),
          });
        } else {
          // We're the caller - this is an outgoing call that's still ringing
          currentCallIdRef.current = data.id;
          setActiveCall({
            callId: data.id,
            roomName: data.room_name,
            callType: data.call_type as CallType,
            otherParticipant: {
              id: otherUserId,
              username: otherProfile?.username || 'User',
              avatarUrl: otherProfile?.avatar_url,
            },
            isCaller,
            startedAt: new Date(data.created_at),
          });
          setStatus('ringing');
        }
      }
    };
    
    checkActiveCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearRingTimeout();
      disconnectRoom();
    };
  }, [clearRingTimeout, disconnectRoom]);

  // Attach remote video to a video element
  const attachRemoteVideo = useCallback((videoElement: HTMLVideoElement | null) => {
    if (!videoElement) return;
    
    // Check if we have a stored remote video track
    const storedTrack = (window as any).__livekitRemoteVideoTrack || remoteVideoTrack;
    if (storedTrack) {
      console.log('[CALL] Attaching stored remote video track to element');
      storedTrack.attach(videoElement);
      return;
    }
    
    // Fallback: try to get from remote participant
    if (!remoteParticipant) return;
    
    const videoPublication = Array.from(remoteParticipant.trackPublications.values())
      .find(pub => pub.kind === 'video' && pub.track);
    
    if (videoPublication?.track) {
      console.log('[CALL] Attaching remote video from publication');
      videoPublication.track.attach(videoElement);
    }
  }, [remoteParticipant, remoteVideoTrack]);
  
  // Attach local video to a video element
  const attachLocalVideo = useCallback((videoElement: HTMLVideoElement | null) => {
    if (!videoElement) return;
    
    const localVideoTrack = localTracksRef.current.find(t => t.kind === 'video');
    if (localVideoTrack) {
      console.log('[CALL] Attaching local video to element');
      localVideoTrack.attach(videoElement);
    }
  }, []);

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
    isSpeakerEnabled,
    
    // Actions
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleSpeaker,
    attachRemoteVideo,
    attachLocalVideo,
    
    // Computed
    isInCall: status === 'connected',
    isRinging: status === 'ringing',
    hasIncomingCall: !!incomingCall,
  };
}
