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
    type: 'video' | 'live' | 'photo';
    username: string;
    displayName?: string;
    title?: string;
    caption?: string;
    postId?: string;
    thumbnailUrl?: string;
    avatarUrl?: string;
    mediaUrl?: string;
  };
  // Direct props (alternative to item)
  title?: string;
  url?: string;
  thumbnailUrl?: string;
}

interface Friend {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function ShareModal({ isOpen, onClose, item, title, url, thumbnailUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  // Support both item-based and direct props
  const shareUrl = url || (item?.type === 'live' 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/live/${item?.username}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/post/${item?.postId || item?.id}`);

  const shareText = title || item?.title || item?.caption || (item ? `Check out ${item.displayName || item.username}'s ${item.type}!` : 'Check this out!');

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use get_friends_list RPC (mutual follows) - same as messenger
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_friends_list', {
        p_profile_id: user.id,
        p_limit: 50,
        p_offset: 0,
      });

      if (rpcError) {
        console.error('Error loading friends:', rpcError);
        // Fallback to follows if RPC doesn't exist
        const { data, error } = await supabase
          .from('follows')
          .select(`
            followee_id,
            profiles!follows_followee_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('follower_id', user.id)
          .limit(20);

        if (!error && data) {
          const friendsList = data.map((f: any) => ({
            id: f.profiles.id,
            username: f.profiles.username,
            display_name: f.profiles.display_name,
            avatar_url: f.profiles.avatar_url,
          }));
          setFriends(friendsList);
        }
        return;
      }

      // Map RPC response
      const friendsRaw = (rpcData as any)?.friends ?? [];
      const friendsList = (Array.isArray(friendsRaw) ? friendsRaw : []).map((p: any) => ({
        id: String(p.id),
        username: String(p.username ?? ''),
        display_name: p.display_name ?? null,
        avatar_url: p.avatar_url ?? null,
      }));

      setFriends(friendsList);
    } catch (err) {
      console.error('Error loading friends:', err);
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

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleSendToInbox = async () => {
    if (selectedFriends.size === 0) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let successCount = 0;
      
      // Send DM to each selected friend using instant_messages table (same as messenger)
      for (const friendId of selectedFriends) {
        // Build share message with thumbnail info if available (fallback to avatar, NOT mediaUrl which might be video)
        const shareThumbnail = thumbnailUrl || item?.thumbnailUrl || item?.avatarUrl || null;
        // Always send as JSON share format for proper rendering
        const messageContent = JSON.stringify({
          type: 'share',
          text: shareText,
          url: shareUrl,
          thumbnail: shareThumbnail,
          contentType: item?.type || 'video',
        });

        const { error: msgError } = await supabase
          .from('instant_messages')
          .insert({
            sender_id: user.id,
            recipient_id: friendId,
            content: messageContent,
          });

        if (msgError) {
          console.error('Error sending message:', msgError);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        // Success - close modal
        onClose();
        setSelectedFriends(new Set());
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

        {/* Send to Friends - Compact */}
        {friends.length > 0 && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500 mb-2">Send to</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {friends.slice(0, 8).map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => toggleFriend(friend.id)}
                  className="flex flex-col items-center gap-1 min-w-[56px]"
                >
                  <div className={`relative w-12 h-12 rounded-full overflow-hidden ${
                    selectedFriends.has(friend.id) ? 'ring-2 ring-blue-500' : ''
                  }`}>
                    <img
                      src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.username}`}
                      alt={friend.username}
                      className="w-full h-full object-cover"
                    />
                    {selectedFriends.has(friend.id) && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] truncate max-w-[56px]">
                    {friend.display_name?.split(' ')[0] || friend.username}
                  </span>
                </button>
              ))}
            </div>
            {selectedFriends.size > 0 && (
              <button
                onClick={handleSendToInbox}
                disabled={sending}
                className="w-full mt-2 px-3 py-1.5 bg-blue-500 text-white rounded-full text-sm font-semibold disabled:opacity-50 hover:bg-blue-600 transition"
              >
                {sending ? 'Sending...' : `Send (${selectedFriends.size})`}
              </button>
            )}
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
