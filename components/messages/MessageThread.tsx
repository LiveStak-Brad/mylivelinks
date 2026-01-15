'use client';

import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send, Gift, Smile, ArrowLeft, Loader2, ExternalLink, ImagePlus, Share2 } from 'lucide-react';
import { useMessages, Message, Conversation } from './MessagesContext';
import GiftPickerMini from './GiftPickerMini';
import { useIM } from '@/components/im';
import SafeRichText from '@/components/SafeRichText';
import SafeOutboundLink from '@/components/SafeOutboundLink';
import LiveAvatar from '@/components/LiveAvatar';
import ReportModal from '@/components/ReportModal';
import { usePresence } from '@/contexts/PresenceContext';
import { PresenceDot } from '@/components/presence/PresenceDot';

interface MessageThreadProps {
  conversation: Conversation;
  onBack?: () => void;
  showBackButton?: boolean;
}

// Map gift names to emojis
const getGiftEmoji = (name: string) => {
  const emojiMap: { [key: string]: string } = {
    'Poo': '💩',
    'Rose': '🌹',
    'Heart': '❤️',
    'Star': '⭐',
    'Diamond': '💎',
    'Super Star': '🌟',
    'Crown': '👑',
    'Platinum': '💠',
    'Legendary': '🏆',
    'Fire': '🔥',
    'Rocket': '🚀',
    'Rainbow': '🌈',
    'Unicorn': '🦄',
    'Party': '🎉',
    'Confetti': '🎊',
    'Champagne': '🍾',
    'Money': '💰',
    'Cash': '💵',
    'Gold': '🥇',
    'Silver': '🥈',
    'Bronze': '🥉',
    'Kiss': '💋',
    'Hug': '🤗',
    'Love': '💕',
    'Sparkle': '✨',
    'Gem': '💎',
    'Crystal': '🔮',
    'Music': '🎵',
    'Microphone': '🎤',
    'Camera': '📸',
    'Clap': '👏',
    'Thumbs Up': '👍',
    'Wave': '👋',
    'Flex': '💪',
    'Cool': '😎',
    'Hot': '🥵',
    'VIP': '🎯',
    'King': '🤴',
    'Queen': '👸',
    'Angel': '😇',
    'Devil': '😈',
  };
  return emojiMap[name] || '🎁';
};

const EMOJIS = [
  '😀', '😄', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤩',
  '👍', '🙏', '👏', '🔥', '💯', '🎉', '✨', '💜', '❤️', '🥳',
  '😅', '😭', '😡', '🤔', '😴', '🙌', '✅', '❌', '⭐', '🌈',
];

export default function MessageThread({ conversation, onBack, showBackButton = false }: MessageThreadProps) {
  const { messages, sendMessage, sendGift, sendImage, currentUserId } = useMessages();
  const { openChat } = useIM();
  const { isOnline } = usePresence();
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    reportedUserId?: string;
    reportedUsername?: string;
    contextDetails: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  
  const recipientIsOnline = isOnline(conversation.recipientId);

  const openReportDmMessage = (message: Message) => {
    setReportTarget({
      reportedUserId: message.senderId,
      reportedUsername: conversation.recipientUsername,
      contextDetails: JSON.stringify({
        content_kind: 'dm_message',
        message_id: String(message.id),
        dm_conversation_id: conversation.id,
        recipient_id: conversation.recipientId,
        recipient_username: conversation.recipientUsername,
        sender_id: message.senderId,
        created_at: message.timestamp?.toISOString?.() ?? null,
        snippet: String(message.content || '').slice(0, 160) || null,
        surface: showBackButton ? 'messages_modal_thread' : 'messages_thread',
      }),
    });
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversation.id]);

  // iOS PWA keyboard handling - scroll input into view when focused
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      // Small delay to let iOS keyboard animation start
      setTimeout(() => {
        // Scroll the input into view on iOS PWA
        input.scrollIntoView({ behavior: 'smooth', block: 'end' });
        // Also ensure messages scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    };

    input.addEventListener('focus', handleFocus);
    return () => input.removeEventListener('focus', handleFocus);
  }, []);

  const handleSend = async () => {
    if (!messageInput.trim() || isSending) return;

    setIsSending(true);
    await sendMessage(conversation.recipientId, messageInput);
    setMessageInput('');
    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGiftSelect = async (gift: { id: number; name: string; coin_cost: number; icon_url?: string }) => {
    setIsSending(true);
    await sendGift(conversation.recipientId, gift.id, gift.name, gift.coin_cost, gift.icon_url);
    setIsSending(false);
  };

  const handlePickEmoji = (emoji: string) => {
    setMessageInput((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handlePickPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsSending(true);
    await sendImage(conversation.recipientId, file);
    setIsSending(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!showEmojiPicker) return;
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (!inputAreaRef.current) return;
      if (!inputAreaRef.current.contains(t)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showEmojiPicker]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const msgDate = new Date(date);
    
    if (msgDate.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return msgDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  
  messages.forEach(msg => {
    const msgDate = formatDate(msg.timestamp);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="flex flex-col h-full pwa-messages-container pb-16 md:pb-0">
      {/* Header - iOS notch aware */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0 pwa-header">
        {showBackButton && (
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        
        {/* Avatar */}
        <div className="relative">
          <LiveAvatar
            avatarUrl={conversation.recipientAvatar}
            username={conversation.recipientUsername}
            displayName={conversation.recipientDisplayName || conversation.recipientUsername}
            isLive={conversation.recipientIsLive}
            size="md"
            showLiveBadge={false}
            clickable={true}
          />
          <PresenceDot profileId={conversation.recipientId} isLive={conversation.recipientIsLive} size="md" />
        </div>

        {/* Name & Status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {conversation.recipientDisplayName || conversation.recipientUsername}
          </p>
          <p className="text-xs text-muted-foreground">
            {recipientIsOnline ? 'Active now' : 'Offline'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              openChat(
                conversation.recipientId,
                conversation.recipientDisplayName || conversation.recipientUsername,
                conversation.recipientAvatar
              )
            }
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition"
            title="Pop out"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages - scrollable with iOS momentum scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pwa-messages-scroll">
        {groupedMessages.length === 0 ? (
          <EmptyThreadState 
            username={conversation.recipientUsername} 
            avatarUrl={conversation.recipientAvatar}
            displayName={conversation.recipientDisplayName}
          />
        ) : (
          groupedMessages.map((group, groupIdx) => (
            <div key={groupIdx}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 text-xs text-muted-foreground bg-muted/50 rounded-full">
                  {group.date}
                </span>
              </div>

              {/* Messages in group */}
              <div className="space-y-2">
                {group.messages.map((msg, msgIdx) => {
                  const isOwn = msg.senderId === currentUserId;
                  // Check if this is the last sent message that was read (to show "Seen")
                  const isLastReadMessage = isOwn && 
                    msg.status === 'read' && 
                    groupIdx === groupedMessages.length - 1 && 
                    msgIdx === group.messages.length - 1;
                  
                  return (
                    <div key={msg.id}>
                      <MessageBubble
                        message={msg}
                        isOwn={isOwn}
                        time={formatTime(msg.timestamp)}
                        senderUsername={conversation.recipientUsername}
                        onReport={!isOwn ? () => openReportDmMessage(msg) : undefined}
                      />
                      {isLastReadMessage && (
                        <p className="text-[10px] text-right text-blue-400 mt-1 mr-1 font-medium">
                          Seen
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - iOS keyboard and safe area aware, with bottom nav clearance */}
      <div className="relative border-t border-border p-3 bg-card flex-shrink-0 pwa-input-area">
        {/* Gift Picker - positioned above input */}
        <GiftPickerMini
          isOpen={showGiftPicker}
          onClose={() => setShowGiftPicker(false)}
          onSelectGift={handleGiftSelect}
          recipientUsername={conversation.recipientUsername}
        />

        <div ref={inputAreaRef} className="flex items-center gap-2">
          {/* Gift Button */}
          <button
            onClick={() => setShowGiftPicker(!showGiftPicker)}
            className={`p-2.5 rounded-full transition ${
              showGiftPicker 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Send a gift"
          >
            <Gift className="w-5 h-5" />
          </button>

          <button
            onClick={handlePickPhoto}
            className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition"
            title="Send a photo"
            disabled={isSending}
          >
            <ImagePlus className="w-5 h-5" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Emoji Button */}
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition"
            title="Add emoji"
            disabled={isSending}
          >
            <Smile className="w-5 h-5" />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-[64px] left-3 z-50 w-[260px] rounded-xl border border-border bg-card shadow-xl p-2">
              <div className="grid grid-cols-10 gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => handlePickEmoji(e)}
                    className="h-8 w-8 rounded-lg hover:bg-muted transition flex items-center justify-center"
                  >
                    <span className="text-lg leading-none">{e}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text Input - text-base (16px) prevents iOS zoom on focus */}
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-muted/50 border-none rounded-full px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            maxLength={1000}
            disabled={isSending}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!messageInput.trim() || isSending}
            className="p-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {reportTarget && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportTarget(null)}
          reportType="chat"
          reportedUserId={reportTarget.reportedUserId}
          reportedUsername={reportTarget.reportedUsername}
          contextDetails={reportTarget.contextDetails}
        />
      )}
    </div>
  );
}

// Message bubble component
function MessageBubble({
  message,
  isOwn,
  time,
  senderUsername,
  onReport,
}: {
  message: Message;
  isOwn: boolean;
  time: string;
  senderUsername: string;
  onReport?: () => void;
}) {
  // Gift message bubble
  if (message.type === 'gift') {
    const giftIcon = typeof message.giftIcon === 'string' ? message.giftIcon : '';
    const isIconUrl = giftIcon.startsWith('http://') || giftIcon.startsWith('https://') || giftIcon.startsWith('/');

    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {giftIcon && isIconUrl ? (
                <img src={giftIcon} alt={message.giftName || 'Gift'} className="w-10 h-10" />
              ) : (
                giftIcon || getGiftEmoji(message.giftName || 'Gift')
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isOwn ? 'You' : senderUsername} sent a gift!
              </p>
              <p className="text-xs text-muted-foreground">
                {message.giftName} • {message.giftCoins} 💰 
                <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                  (+{message.giftCoins || 0} 💎)
                </span>
              </p>
            </div>
          </div>
          <p className={`text-[10px] mt-2 ${isOwn ? 'text-right' : 'text-left'} text-muted-foreground`}>
            {time}
            {isOwn && (
              <span className="ml-1">
                {message.status === 'sending' && <span className="opacity-60">○</span>}
                {message.status === 'sent' && <span className="opacity-80">✓</span>}
                {message.status === 'delivered' && <span className="opacity-80">✓✓</span>}
                {message.status === 'read' && <span className="text-blue-400 font-medium">✓✓</span>}
                {message.status === 'failed' && <span className="text-red-500">⚠️</span>}
              </span>
            )}
            {!isOwn && onReport && (
              <button
                type="button"
                onClick={onReport}
                className="ml-2 underline underline-offset-2 hover:opacity-80"
                title="Report message"
                aria-label="Report message"
              >
                Report
              </button>
            )}
          </p>
          {message.status === 'failed' && typeof (message as any)?.error === 'string' && (message as any).error.length > 0 && (
            <p className={`text-[11px] mt-1 ${isOwn ? 'text-right' : 'text-left'} text-red-600 dark:text-red-400`}>
              {(message as any).error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (message.type === 'image') {
    const url = typeof message.imageUrl === 'string' ? message.imageUrl : '';
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[75%] overflow-hidden rounded-2xl border border-border ${
            isOwn ? 'bg-card' : 'bg-card'
          }`}
        >
          {url ? (
            <SafeOutboundLink href={url}>
              <img src={url} alt="Photo" className="block max-h-[260px] w-auto object-contain" />
            </SafeOutboundLink>
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">Photo</div>
          )}
          <div className={`px-3 py-1.5 text-[10px] ${isOwn ? 'text-right' : 'text-left'} text-muted-foreground`}>
            {time}
            {isOwn && (
              <span className="ml-1">
                {message.status === 'sending' && <span className="opacity-60">○</span>}
                {message.status === 'sent' && <span className="opacity-80">✓</span>}
                {message.status === 'delivered' && <span className="opacity-80">✓✓</span>}
                {message.status === 'read' && <span className="text-blue-400 font-medium">✓✓</span>}
                {message.status === 'failed' && <span className="text-red-500">⚠️</span>}
              </span>
            )}
            {!isOwn && onReport && (
              <button
                type="button"
                onClick={onReport}
                className="ml-2 underline underline-offset-2 hover:opacity-80"
                title="Report message"
                aria-label="Report message"
              >
                Report
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Share message bubble with preview card
  if (message.type === 'share') {
    const shareUrl = message.shareUrl || '';
    // Only use thumbnail if it's a valid image URL (not a video file)
    const rawThumb = message.shareThumbnail?.trim();
    const isVideoUrl = rawThumb && /\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i.test(rawThumb);
    const isValidImageUrl = rawThumb && (rawThumb.startsWith('http') || rawThumb.startsWith('/')) && !isVideoUrl;
    const shareThumbnail = isValidImageUrl ? rawThumb : null;
    const shareText = message.shareText || 'Shared content';
    const contentType = message.shareContentType || 'video';
    const isLive = contentType === 'live';
    const isPhoto = contentType === 'photo';

    const handleShare = () => {
      if (navigator.share) {
        navigator.share({
          title: shareText,
          text: shareText,
          url: shareUrl,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(shareUrl);
      }
    };

    const handleRepost = () => {
      // Creator Studio is coming soon - show alert instead of navigating
      alert('Repost to Creator Studio is coming soon!');
    };

    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-start gap-2`}>
        {/* Share button on left */}
        <button
          type="button"
          onClick={handleShare}
          className="w-9 h-9 rounded-full bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition flex-shrink-0"
          title="Share"
        >
          <Share2 className="w-4 h-4 text-primary" />
        </button>

        {/* Shared content card */}
        <div
          className={`w-[220px] overflow-hidden rounded-2xl border border-border shadow-sm ${
            isOwn ? 'bg-card' : 'bg-card'
          }`}
        >
          {/* Clickable preview card */}
          <a href={shareUrl} className="block hover:opacity-95 transition">
            {/* Thumbnail - horizontal for photos, vertical for videos/live */}
            <div className={`relative ${isPhoto ? 'aspect-square' : 'aspect-video'} bg-gray-900 overflow-hidden`}>
              {shareThumbnail ? (
                <>
                  <img 
                    src={shareThumbnail} 
                    alt={shareText} 
                    className="w-full h-full object-cover"
                  />
                  {/* Play/Live badge overlay */}
                  {!isPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isLive ? (
                        <span className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                          🔴 LIVE
                        </span>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-lg">
                          <span className="text-white text-2xl ml-1">▶</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  {isLive ? (
                    <span className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      🔴 LIVE
                    </span>
                  ) : isPhoto ? (
                    <span className="text-4xl">📷</span>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-black/30 flex items-center justify-center">
                      <span className="text-white text-2xl ml-1">▶</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Text preview */}
            <div className="px-3 py-2.5 bg-muted/30">
              <p className="text-sm font-medium text-foreground line-clamp-2">{shareText}</p>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <span className="inline-block w-3 h-3">🔗</span>
                <span className="truncate">{shareUrl.replace(/^https?:\/\//, '').split('/')[0]}</span>
              </p>
              {message.shareTeamName && (
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 bg-purple-500 text-white text-[10px] font-bold rounded">
                  🔒 Team: {message.shareTeamName}
                </div>
              )}
            </div>
          </a>
          {/* Time and status */}
          <div className={`px-3 py-1.5 text-[10px] ${isOwn ? 'text-right' : 'text-left'} text-muted-foreground border-t border-border/30`}>
            {time}
            {isOwn && (
              <span className="ml-1">
                {message.status === 'sending' && <span className="opacity-60">○</span>}
                {message.status === 'sent' && <span className="opacity-80">✓</span>}
                {message.status === 'delivered' && <span className="opacity-80">✓✓</span>}
                {message.status === 'read' && <span className="text-blue-400 font-medium">✓✓</span>}
                {message.status === 'failed' && <span className="text-red-500">⚠️</span>}
              </span>
            )}
            {!isOwn && onReport && (
              <button
                type="button"
                onClick={onReport}
                className="ml-2 underline underline-offset-2 hover:opacity-80"
                title="Report message"
                aria-label="Report message"
              >
                Report
              </button>
            )}
          </div>
        </div>

        {/* Repost button on right */}
        <button
          type="button"
          onClick={handleRepost}
          className="w-9 h-9 rounded-full bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition flex-shrink-0"
          title="Repost"
        >
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </div>
    );
  }

  // Regular text message bubble
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] px-4 py-2 rounded-2xl ${
          isOwn
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        }`}
      >
        <p className="text-sm break-words whitespace-pre-wrap">
          <SafeRichText
            text={message.content}
            className="whitespace-pre-wrap"
            linkClassName={isOwn ? 'text-white underline underline-offset-2' : 'text-primary underline underline-offset-2'}
          />
        </p>
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
          {time}
          {isOwn && (
            <span className="ml-1">
              {message.status === 'sending' && <span className="opacity-60">○</span>}
              {message.status === 'sent' && <span className="opacity-80">✓</span>}
              {message.status === 'delivered' && <span className="opacity-80">✓✓</span>}
              {message.status === 'read' && <span className="text-blue-300 font-medium">✓✓</span>}
              {message.status === 'failed' && <span className="text-red-300">⚠️</span>}
            </span>
          )}
          {!isOwn && onReport && (
            <button
              type="button"
              onClick={onReport}
              className="ml-2 underline underline-offset-2 hover:opacity-80"
              title="Report message"
              aria-label="Report message"
            >
              Report
            </button>
          )}
        </p>
      </div>
    </div>
  );
}

// Empty state for new conversations
function EmptyThreadState({ username, avatarUrl, displayName }: { username: string; avatarUrl?: string | null; displayName?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={displayName || username} 
          className="w-20 h-20 rounded-full object-cover mb-4"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold mb-4">
          {username.charAt(0).toUpperCase()}
        </div>
      )}
      <p className="font-semibold text-foreground mb-1">{displayName || username}</p>
      <p className="text-sm text-muted-foreground">Start a conversation!</p>
      <p className="text-xs text-muted-foreground mt-1">Send a message or gift 🎁</p>
    </div>
  );
}

