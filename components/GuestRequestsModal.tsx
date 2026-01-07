'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Users, UserCheck, UserX, Clock, Search, UserPlus, Send } from 'lucide-react';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { createClient } from '@/lib/supabase';

interface GuestRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveStreamId?: number;
  hostId?: string;
}

interface GuestRequest {
  id: number;
  requester_id: string;
  type: 'request' | 'invite';
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  has_camera: boolean;
  has_mic: boolean;
  created_at: string;
  profile?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface Viewer {
  profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export default function GuestRequestsModal({ isOpen, onClose, liveStreamId, hostId }: GuestRequestsModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'invite'>('requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<number | null>(null);

  // Load guest requests
  useEffect(() => {
    if (!isOpen || !liveStreamId) return;

    const loadRequests = async () => {
      setLoading(true);
      try {
        // Fetch pending requests from viewers
        const { data, error } = await supabase
          .from('guest_requests')
          .select(`
            id,
            requester_id,
            type,
            status,
            has_camera,
            has_mic,
            created_at,
            profiles:requester_id (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('live_stream_id', liveStreamId)
          .eq('type', 'request')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[GuestRequests] Error fetching requests:', error);
        } else {
          const mapped = (data || []).map((r: any) => ({
            ...r,
            profile: r.profiles,
          }));
          setRequests(mapped);
        }
      } catch (err) {
        console.error('[GuestRequests] Error:', err);
      }
      setLoading(false);
    };

    loadRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`guest-requests-host-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guest_requests',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        (payload) => {
          console.log('[GuestRequests] Realtime update:', payload);
          loadRequests(); // Reload on any change
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isOpen, liveStreamId, supabase]);

  // Load current viewers for invite tab
  useEffect(() => {
    if (!isOpen || !liveStreamId || activeTab !== 'invite') return;

    const loadViewers = async () => {
      try {
        // Fetch active viewers from active_viewers table
        const { data, error } = await supabase
          .from('active_viewers')
          .select(`
            viewer_id,
            profiles:viewer_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('live_stream_id', liveStreamId)
          .eq('is_active', true);

        if (error) {
          console.error('[GuestRequests] Error fetching viewers:', error);
        } else {
          const mapped = (data || [])
            .filter((v: any) => v.profiles && v.viewer_id !== hostId)
            .map((v: any) => ({
              profile_id: v.viewer_id,
              username: v.profiles.username,
              display_name: v.profiles.display_name,
              avatar_url: v.profiles.avatar_url,
            }));
          setViewers(mapped);
        }
      } catch (err) {
        console.error('[GuestRequests] Error loading viewers:', err);
      }
    };

    loadViewers();
  }, [isOpen, liveStreamId, activeTab, hostId, supabase]);

  const handleAccept = async (requestId: number) => {
    setProcessingRequest(requestId);
    try {
      const { error } = await supabase
        .from('guest_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) {
        console.error('[GuestRequests] Error accepting request:', error);
        alert('Failed to accept request');
      } else {
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (err) {
      console.error('[GuestRequests] Error:', err);
    }
    setProcessingRequest(null);
  };

  const handleDecline = async (requestId: number) => {
    setProcessingRequest(requestId);
    try {
      const { error } = await supabase
        .from('guest_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) {
        console.error('[GuestRequests] Error declining request:', error);
        alert('Failed to decline request');
      } else {
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (err) {
      console.error('[GuestRequests] Error:', err);
    }
    setProcessingRequest(null);
  };

  const handleInviteViewer = async (viewerId: string) => {
    if (!liveStreamId || !hostId) return;
    
    setSendingInvite(viewerId);
    try {
      const { error } = await supabase
        .from('guest_requests')
        .insert({
          live_stream_id: liveStreamId,
          requester_id: viewerId,
          host_id: hostId,
          type: 'invite',
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          alert('Already sent an invite to this viewer');
        } else {
          console.error('[GuestRequests] Error sending invite:', error);
          alert('Failed to send invite');
        }
      } else {
        alert('Invite sent!');
      }
    } catch (err) {
      console.error('[GuestRequests] Error:', err);
    }
    setSendingInvite(null);
  };

  const filteredViewers = viewers.filter(v => 
    v.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.display_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col modal-fullscreen-mobile">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Guests</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {requests.length} pending request{requests.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mobile-touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Requests
            {requests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                {requests.length}
              </span>
            )}
            {activeTab === 'requests' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'invite'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Invite Viewer
            {activeTab === 'invite' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="modal-body p-6 overflow-y-auto flex-1">
          {activeTab === 'requests' ? (
            loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Guest Requests
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                  When viewers request to join your stream as a guest, they&apos;ll appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                  >
                    <Image
                      src={getAvatarUrl(request.profile?.avatar_url)}
                      alt={request.profile?.username || 'User'}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {request.profile?.display_name || request.profile?.username || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(request.created_at)}</span>
                        <span>•</span>
                        <span>{request.has_camera ? '📹' : ''}{request.has_mic ? '🎤' : ''}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecline(request.id)}
                        disabled={processingRequest === request.id}
                        className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                        title="Decline"
                      >
                        <UserX className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleAccept(request.id)}
                        disabled={processingRequest === request.id}
                        className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                        title="Accept"
                      >
                        <UserCheck className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search viewers..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Viewers List */}
              {filteredViewers.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {searchQuery ? 'No viewers found' : 'No active viewers to invite'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredViewers.map((viewer) => (
                    <div
                      key={viewer.profile_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                    >
                      <Image
                        src={getAvatarUrl(viewer.avatar_url)}
                        alt={viewer.username}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {viewer.display_name || viewer.username}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          @{viewer.username}
                        </p>
                      </div>
                      <button
                        onClick={() => handleInviteViewer(viewer.profile_id)}
                        disabled={sendingInvite === viewer.profile_id}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        {sendingInvite === viewer.profile_id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-bottom">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
