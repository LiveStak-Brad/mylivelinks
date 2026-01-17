/**
 * CallContext - App-wide call session provider
 * 
 * Wraps useCallSession hook and provides call state to entire app.
 * Also renders call overlays (incoming call, active call).
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useCallSession, UseCallSessionReturn } from '../hooks/useCallSession';
import IncomingCallOverlay from '../components/IncomingCallOverlay';

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

  // Debug logging
  if (callSession.callState !== 'idle') {
    console.log('[CallProvider] Call state:', {
      callState: callSession.callState,
      showIncomingOverlay,
      currentCall: callSession.currentCall?.id,
      remoteParticipant: callSession.remoteParticipant?.username,
    });
  }

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
    </CallContext.Provider>
  );
}
