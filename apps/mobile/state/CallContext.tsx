/**
 * CallContext - App-wide call session provider
 * 
 * Wraps useCallSession hook and provides call state to entire app.
 * Also renders call overlays (incoming call, active call).
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useCallSession, UseCallSessionReturn } from '../hooks/useCallSession';
import IncomingCallOverlay from '../components/IncomingCallOverlay';
import ActiveCallOverlay from '../components/ActiveCallOverlay';

const CallContext = createContext<UseCallSessionReturn | null>(null);

export function useCall(): UseCallSessionReturn {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
}

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const callSession = useCallSession();

  const showIncomingOverlay = callSession.callState === 'incoming_invite';
  const showActiveOverlay = ['connecting', 'in_call', 'outgoing_invite'].includes(callSession.callState);

  return (
    <CallContext.Provider value={callSession}>
      {children}
      
      {showIncomingOverlay && (
        <IncomingCallOverlay
          callType={callSession.callType}
          remoteParticipant={callSession.remoteParticipant}
          onAccept={() => {
            if (callSession.currentCall) {
              callSession.acceptCall(callSession.currentCall.id);
            }
          }}
          onDecline={() => {
            if (callSession.currentCall) {
              callSession.declineCall(callSession.currentCall.id);
            }
          }}
        />
      )}
      
      {showActiveOverlay && (
        <ActiveCallOverlay
          callState={callSession.callState}
          callType={callSession.callType}
          remoteParticipant={callSession.remoteParticipant}
          isMicEnabled={callSession.isMicEnabled}
          isCameraEnabled={callSession.isCameraEnabled}
          isSpeakerEnabled={callSession.isSpeakerEnabled}
          localVideoTrack={callSession.localVideoTrack}
          callDuration={callSession.callDuration}
          error={callSession.error}
          onToggleMic={callSession.toggleMic}
          onToggleCam={callSession.toggleCam}
          onToggleSpeaker={callSession.toggleSpeaker}
          onEndCall={() => callSession.endCall()}
        />
      )}
    </CallContext.Provider>
  );
}
