'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, Camera, Mic, Check, AlertCircle, Clock, UserCheck, UserX } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface RequestGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamerUsername: string;
  liveStreamId?: number;
  hostId?: string;
  currentUserId?: string;
  onRequestSent?: () => void;
}

interface PendingInvite {
  id: number;
  host_id: string;
  status: string;
  created_at: string;
  host_profile?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export default function RequestGuestModal({ 
  isOpen, 
  onClose, 
  streamerUsername,
  liveStreamId,
  hostId,
  currentUserId,
  onRequestSent 
}: RequestGuestModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'sending' | 'sent' | 'pending' | 'accepted' | 'declined' | 'error'>('idle');
  const [hasCamera, setHasCamera] = useState(true);
  const [hasMic, setHasMic] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [processingInvite, setProcessingInvite] = useState<number | null>(null);

  // Check for existing request and pending invites
  useEffect(() => {
    if (!isOpen || !liveStreamId || !currentUserId) return;

    const loadData = async () => {
      try {
        // Check if user already has a pending request
        const { data: existingReq } = await supabase
          .from('guest_requests')
          .select('id, status, created_at')
          .eq('live_stream_id', liveStreamId)
          .eq('requester_id', currentUserId)
          .eq('type', 'request')
          .eq('status', 'pending')
          .maybeSingle();

        if (existingReq) {
          setExistingRequest(existingReq);
          setRequestStatus('pending');
        }

        // Check for pending invites from host
        const { data: invites } = await supabase
          .from('guest_requests')
          .select(`
            id,
            host_id,
            status,
            created_at,
            profiles:host_id (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('live_stream_id', liveStreamId)
          .eq('requester_id', currentUserId)
          .eq('type', 'invite')
          .eq('status', 'pending');

        if (invites && invites.length > 0) {
          const mapped = invites.map((inv: any) => ({
            ...inv,
            host_profile: inv.profiles,
          }));
          setPendingInvites(mapped);
        }
      } catch (err) {
        console.error('[RequestGuest] Error loading data:', err);
      }
    };

    loadData();

    // Subscribe to realtime updates for this user's requests
    const channel = supabase
      .channel(`guest-requests-viewer-${currentUserId}-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guest_requests',
          filter: `requester_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('[RequestGuest] Realtime update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const newRecord = payload.new as any;
            
            // Check if our request was accepted/declined
            if (newRecord.type === 'request') {
              if (newRecord.status === 'accepted') {
                setRequestStatus('accepted');
              } else if (newRecord.status === 'declined') {
                setRequestStatus('declined');
                setExistingRequest(null);
              }
            }
            
            // Reload invites if it's an invite update
            if (newRecord.type === 'invite') {
              loadData();
            }
          }
          
          if (payload.eventType === 'INSERT' && (payload.new as any).type === 'invite') {
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isOpen, liveStreamId, currentUserId, supabase]);

  const handleSendRequest = async () => {
    if (!liveStreamId || !currentUserId || !hostId) {
      alert('Unable to send request. Please try again.');
      return;
    }

    setRequestStatus('sending');
    
    try {
      const { data, error } = await supabase
        .from('guest_requests')
        .insert({
          live_stream_id: liveStreamId,
          requester_id: currentUserId,
          host_id: hostId,
          type: 'request',
          status: 'pending',
          has_camera: hasCamera,
          has_mic: hasMic,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Duplicate - already has a pending request
          setRequestStatus('pending');
        } else {
          console.error('[RequestGuest] Error sending request:', error);
          setRequestStatus('error');
          alert('Failed to send request: ' + error.message);
        }
      } else {
        setExistingRequest(data);
        setRequestStatus('pending');
        if (onRequestSent) {
          onRequestSent();
        }
      }
    } catch (err) {
      console.error('[RequestGuest] Error:', err);
      setRequestStatus('error');
    }
  };

  const handleCancelRequest = async () => {
    if (!existingRequest) return;

    try {
      const { error } = await supabase
        .from('guest_requests')
        .update({ status: 'cancelled' })
        .eq('id', existingRequest.id);

      if (error) {
        console.error('[RequestGuest] Error cancelling request:', error);
      } else {
        setExistingRequest(null);
        setRequestStatus('idle');
      }
    } catch (err) {
      console.error('[RequestGuest] Error:', err);
    }
  };

  const handleAcceptInvite = async (inviteId: number) => {
    setProcessingInvite(inviteId);
    try {
      const { error } = await supabase
        .from('guest_requests')
        .update({ status: 'accepted' })
        .eq('id', inviteId);

      if (error) {
        console.error('[RequestGuest] Error accepting invite:', error);
        alert('Failed to accept invite');
      } else {
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
        setRequestStatus('accepted');
      }
    } catch (err) {
      console.error('[RequestGuest] Error:', err);
    }
    setProcessingInvite(null);
  };

  const handleDeclineInvite = async (inviteId: number) => {
    setProcessingInvite(inviteId);
    try {
      const { error } = await supabase
        .from('guest_requests')
        .update({ status: 'declined' })
        .eq('id', inviteId);

      if (error) {
        console.error('[RequestGuest] Error declining invite:', error);
        alert('Failed to decline invite');
      } else {
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
      }
    } catch (err) {
      console.error('[RequestGuest] Error:', err);
    }
    setProcessingInvite(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col modal-fullscreen-mobile">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Join as Guest</h2>
          </div>
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
          {/* Pending Invites from Host */}
          {pendingInvites.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                You&apos;ve been invited!
              </h3>
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {invite.host_profile?.display_name || invite.host_profile?.username || streamerUsername}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Invited you to join
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeclineInvite(invite.id)}
                        disabled={processingInvite === invite.id}
                        className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        <UserX className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleAcceptInvite(invite.id)}
                        disabled={processingInvite === invite.id}
                        className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        <UserCheck className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requestStatus === 'accepted' ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                You&apos;re In!
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                You can now join the stream as a guest. Your camera and microphone will be enabled.
              </p>
            </div>
          ) : requestStatus === 'declined' ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserX className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Request Declined
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                The host has declined your request to join. You can try again later.
              </p>
              <button
                onClick={() => {
                  setRequestStatus('idle');
                  setExistingRequest(null);
                }}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : requestStatus === 'pending' ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-yellow-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Request Pending
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Waiting for {streamerUsername} to accept your request...
              </p>
              <button
                onClick={handleCancelRequest}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel Request
              </button>
            </div>
          ) : (
            <>
              {/* Explanation */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  Join as a Guest
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  You&apos;re requesting to join <strong>{streamerUsername}</strong>&apos;s live stream. 
                  If accepted, you&apos;ll appear on their stream with your camera and microphone.
                </p>
              </div>

              {/* Permission Toggles */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">Share with Host</h4>
                
                <button
                  onClick={() => setHasCamera(!hasCamera)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    hasCamera
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    hasCamera 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  }`}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Camera</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Share your video</p>
                  </div>
                  {hasCamera && <Check className="w-5 h-5 text-purple-500" />}
                </button>

                <button
                  onClick={() => setHasMic(!hasMic)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    hasMic
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    hasMic 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  }`}>
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Microphone</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Share your audio</p>
                  </div>
                  {hasMic && <Check className="w-5 h-5 text-purple-500" />}
                </button>
              </div>

              {/* Warning if no media selected */}
              {!hasCamera && !hasMic && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Please enable at least camera or microphone to join as a guest.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {requestStatus !== 'accepted' && requestStatus !== 'pending' && (
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-bottom">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            {requestStatus !== 'declined' && (
              <button
                onClick={handleSendRequest}
                disabled={(!hasCamera && !hasMic) || requestStatus === 'sending'}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requestStatus === 'sending' ? 'Sending...' : 'Send Request'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
