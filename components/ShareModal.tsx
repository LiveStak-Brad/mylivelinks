'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, MessageCircle, Mail, Facebook, Twitter, Link as LinkIcon, Share2, Instagram } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Support both formats: item object OR direct title/url
  item?: {
    id: string;
    type: 'video' | 'live' | 'photo' | 'profile';
    username: string;
    displayName?: string;
    title?: string;
    caption?: string;
    postId?: string;
    thumbnailUrl?: string;
    avatarUrl?: string;
    mediaUrl?: string;
    teamId?: string;
    teamName?: string;
    teamSlug?: string;
  };
  // Direct props (alternative to item)
  title?: string;
  url?: string;
  thumbnailUrl?: string;
  contentType?: 'video' | 'live' | 'photo' | 'profile';
}

interface Friend {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_live?: boolean;
  is_online?: boolean;
  last_shared_at?: string | null;
}

interface Follower {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_live?: boolean;
  is_online?: boolean;
}

export function ShareModal({ isOpen, onClose, item, title, url, thumbnailUrl, contentType }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Support both item-based and direct props
  const shareUrl = url || (item?.type === 'live' 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/live/${item?.username}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/post/${item?.postId || item?.id}`);

  const shareText = title || item?.title || item?.caption || (item ? `Check out ${item.displayName || item.username}'s ${item.type}!` : 'Check this out!');

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use get_friends_list RPC (mutual follows) - same as messenger
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_friends_list', {
        p_profile_id: user.id,
        p_limit: 200,
        p_offset: 0,
      });

      // Load recent share recipients (messages with share content sent by current user)
      const { data: recentShares } = await supabase
        .from('instant_messages')
        .select('recipient_id, created_at')
        .eq('sender_id', user.id)
        .like('content', '%"type":"share"%')
        .order('created_at', { ascending: false })
        .limit(100);

      const recentMap = new Map<string, string>();
      if (recentShares) {
        for (const share of recentShares) {
          if (share.recipient_id && !recentMap.has(share.recipient_id)) {
            recentMap.set(share.recipient_id, share.created_at);
          }
        }
      }

      // Process friends
      let friendIds = new Set<string>();
      let allUserIds: string[] = [];
      
      if (!rpcError) {
        const friendsRaw = (rpcData as any)?.friends ?? [];
        allUserIds = friendsRaw.map((p: any) => String(p.id));
        friendIds = new Set(allUserIds);
      }

      // Load followers (people who follow you but are NOT mutual friends)
      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            is_live
          )
        `)
        .eq('followee_id', user.id)
        .limit(200);

      const followerIds: string[] = [];
      if (!followersError && followersData) {
        for (const f of followersData) {
          if (f.profiles && !friendIds.has(String((f.profiles as any).id))) {
            followerIds.push(String((f.profiles as any).id));
          }
        }
      }

      // Combine all user IDs and fetch online status
      const allIds = [...allUserIds, ...followerIds];
      const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
      const { data: onlineData } = allIds.length
        ? await supabase.from('room_presence').select('profile_id').in('profile_id', allIds).gt('last_seen_at', cutoff)
        : { data: [] };
      const onlineSet = new Set((onlineData ?? []).map((o: any) => String(o.profile_id)));

      // Now build friends list with online status
      if (!rpcError) {
        const friendsRaw = (rpcData as any)?.friends ?? [];
        const friendsList = (Array.isArray(friendsRaw) ? friendsRaw : []).map((p: any) => ({
          id: String(p.id),
          username: String(p.username ?? ''),
          display_name: p.display_name ?? null,
          avatar_url: p.avatar_url ?? null,
          is_live: Boolean(p.is_live),
          is_online: onlineSet.has(String(p.id)),
          last_shared_at: recentMap.get(String(p.id)) ?? null,
        }));

        // Sort: live first, then online, then by recent shares, then alphabetical
        friendsList.sort((a: Friend, b: Friend) => {
          if (a.is_live && !b.is_live) return -1;
          if (!a.is_live && b.is_live) return 1;
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;
          if (a.last_shared_at && !b.last_shared_at) return -1;
          if (!a.last_shared_at && b.last_shared_at) return 1;
          if (a.last_shared_at && b.last_shared_at) {
            return new Date(b.last_shared_at).getTime() - new Date(a.last_shared_at).getTime();
          }
          const aName = (a.display_name || a.username || '').toLowerCase();
          const bName = (b.display_name || b.username || '').toLowerCase();
          return aName.localeCompare(bName);
        });

        setFriends(friendsList);
      } else {
        console.error('Error loading friends:', rpcError);
        setFriends([]);
      }

      // Build followers list with online status
      if (!followersError && followersData) {
        const followersList: Follower[] = followersData
          .filter((f: any) => f.profiles && !friendIds.has(String(f.profiles.id)))
          .map((f: any) => ({
            id: String(f.profiles.id),
            username: String(f.profiles.username ?? ''),
            display_name: f.profiles.display_name ?? null,
            avatar_url: f.profiles.avatar_url ?? null,
            is_live: Boolean(f.profiles.is_live),
            is_online: onlineSet.has(String(f.profiles.id)),
          }));

        // Sort: live first, then online, then alphabetical
        followersList.sort((a, b) => {
          if (a.is_live && !b.is_live) return -1;
          if (!a.is_live && b.is_live) return 1;
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;
          const aName = (a.display_name || a.username || '').toLowerCase();
          const bName = (b.display_name || b.username || '').toLowerCase();
          return aName.localeCompare(bName);
        });

        setFollowers(followersList);
      } else {
        setFollowers([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled
      }
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSendToInbox = async () => {
    if (selectedIds.size === 0) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let successCount = 0;
      
      // Send DM to each selected person using instant_messages table
      for (const recipientId of selectedIds) {
        // Fallback: thumbnailUrl prop > item.thumbnailUrl > item.mediaUrl (if image) > item.avatarUrl
        const mediaIsImage = item?.mediaUrl && !item.mediaUrl.match(/\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i);
        const shareThumbnail = thumbnailUrl || item?.thumbnailUrl || (mediaIsImage ? item.mediaUrl : null) || item?.avatarUrl || null;
        const messageContent = JSON.stringify({
          type: 'share',
          text: shareText,
          url: shareUrl,
          thumbnail: shareThumbnail,
          contentType: contentType || item?.type || 'video',
          ...(item?.teamId && { teamId: item.teamId, teamName: item.teamName, teamSlug: item.teamSlug }),
        });

        const { error: msgError } = await supabase
          .from('instant_messages')
          .insert({
            sender_id: user.id,
            recipient_id: recipientId,
            content: messageContent,
          });

        if (msgError) {
          console.error('Error sending message:', msgError);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        onClose();
        setSelectedIds(new Set());
      } else {
        alert('Failed to send messages. Please try again.');
      }
    } catch (err) {
      console.error('Error sending messages:', err);
      alert('Failed to send messages. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Share</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Friends - Horizontal Scroll */}
            {friends.length > 0 && (
              <div className="py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="text-xs font-semibold text-gray-500 mb-2 px-4">Friends ({friends.length})</div>
                <div className="flex gap-3 overflow-x-auto px-4 pb-1">
                  {friends.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => toggleSelection(person.id)}
                      className="flex flex-col items-center gap-1 flex-shrink-0"
                    >
                      <div className={`relative w-14 h-14 rounded-full overflow-hidden ${
                        selectedIds.has(person.id) ? 'ring-2 ring-blue-500' : ''
                      }`}>
                        <img
                          src={person.avatar_url || `https://ui-avatars.com/api/?name=${person.username}`}
                          alt={person.username}
                          className="w-full h-full object-cover"
                        />
                        {selectedIds.has(person.id) && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {person.is_live && (
                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 rounded-full">
                            <span className="text-[8px] font-bold text-white">LIVE</span>
                          </div>
                        )}
                        {!person.is_live && person.is_online && (
                          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-purple-500 border-2 border-white dark:border-gray-900" />
                        )}
                      </div>
                      <span className="text-[10px] truncate max-w-[60px]">
                        {person.display_name?.split(' ')[0] || person.username}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Followers - Horizontal Scroll */}
            {followers.length > 0 && (
              <div className="py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="text-xs font-semibold text-gray-500 mb-2 px-4">Followers ({followers.length})</div>
                <div className="flex gap-3 overflow-x-auto px-4 pb-1">
                  {followers.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => toggleSelection(person.id)}
                      className="flex flex-col items-center gap-1 flex-shrink-0"
                    >
                      <div className={`relative w-14 h-14 rounded-full overflow-hidden ${
                        selectedIds.has(person.id) ? 'ring-2 ring-blue-500' : ''
                      }`}>
                        <img
                          src={person.avatar_url || `https://ui-avatars.com/api/?name=${person.username}`}
                          alt={person.username}
                          className="w-full h-full object-cover"
                        />
                        {selectedIds.has(person.id) && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {person.is_live && (
                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 rounded-full">
                            <span className="text-[8px] font-bold text-white">LIVE</span>
                          </div>
                        )}
                        {!person.is_live && person.is_online && (
                          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-purple-500 border-2 border-white dark:border-gray-900" />
                        )}
                      </div>
                      <span className="text-[10px] truncate max-w-[60px]">
                        {person.display_name?.split(' ')[0] || person.username}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {friends.length === 0 && followers.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No friends or followers yet</div>
            )}

            {/* Snapchat Section */}
            <div className="py-3 border-b border-gray-200 dark:border-gray-800">
              <div className="text-xs font-semibold text-gray-500 mb-2 px-4">Snapchat</div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-1">
                {/* Share to Snapchat - opens Snapchat with link sticker */}
                <a
                  href={`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                  <div className="w-14 h-14 rounded-full bg-[#FFFC00] flex items-center justify-center">
                    <span className="text-2xl">👻</span>
                  </div>
                  <span className="text-[10px] truncate max-w-[60px]">Snapchat</span>
                </a>
              </div>
            </div>
          </>
        )}

        {/* Send Button */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={handleSendToInbox}
              disabled={sending}
              className="w-full px-3 py-2.5 bg-blue-500 text-white rounded-full text-sm font-semibold disabled:opacity-50 hover:bg-blue-600 transition"
            >
              {sending ? 'Sending...' : `Send (${selectedIds.size})`}
            </button>
          </div>
        )}

        {/* Share Options - Compact Row Layout */}
        <div className="p-3">
          <div className="grid grid-cols-4 gap-3 mb-3">
            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1.5 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              {copied ? (
                <Check className="w-6 h-6 text-green-500" />
              ) : (
                <Copy className="w-6 h-6" />
              )}
              <span className="text-[10px] font-medium">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Native Share */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-1.5 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <Share2 className="w-6 h-6" />
                <span className="text-[10px] font-medium">Share</span>
              </button>
            )}

            {/* Twitter */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <Twitter className="w-6 h-6" />
              <span className="text-[10px] font-medium">Twitter</span>
            </a>

            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <Facebook className="w-6 h-6" />
              <span className="text-[10px] font-medium">Facebook</span>
            </a>

            {/* Instagram Story */}
            <a
              href={`instagram://story-camera`}
              className="flex flex-col items-center gap-1.5 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <Instagram className="w-6 h-6" />
              <span className="text-[10px] font-medium">Story</span>
            </a>

            {/* Instagram Message */}
            <a
              href={`https://www.instagram.com/direct/inbox/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-[10px] font-medium">Message</span>
            </a>

            {/* Email */}
            <a
              href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`}
              className="flex flex-col items-center gap-1.5 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <Mail className="w-6 h-6" />
              <span className="text-[10px] font-medium">Email</span>
            </a>
          </div>

          {/* URL Display - Compact */}
          <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <LinkIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
              {shareUrl}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
