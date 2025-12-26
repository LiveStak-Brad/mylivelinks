'use client';

import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send, Gift, Smile, ArrowLeft, MoreVertical, Loader2, ExternalLink, ImagePlus } from 'lucide-react';
import { useMessages, Message, Conversation } from './MessagesContext';
import GiftPickerMini from './GiftPickerMini';
import { useIM } from '@/components/im';

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
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col h-full pwa-messages-container">
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
        <div className="relative flex-shrink-0">
          {conversation.recipientAvatar ? (
            <img
              src={conversation.recipientAvatar}
              alt={conversation.recipientUsername}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {(conversation.recipientDisplayName || conversation.recipientUsername).charAt(0).toUpperCase()}
            </div>
          )}
          {conversation.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
          )}
        </div>

        {/* Name & Status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {conversation.recipientDisplayName || conversation.recipientUsername}
          </p>
          <p className="text-xs text-muted-foreground">
            {conversation.isOnline ? 'Active now' : 'Offline'}
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
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages - scrollable with iOS momentum scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pwa-messages-scroll">
        {groupedMessages.length === 0 ? (
          <EmptyThreadState username={conversation.recipientUsername} />
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

      {/* Input Area - iOS keyboard and safe area aware */}
      <div className="relative border-t border-border p-3 bg-card flex-shrink-0 pwa-input-area">
        {/* Gift Picker */}
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

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-muted/50 border-none rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
    </div>
  );
}

// Message bubble component
function MessageBubble({
  message,
  isOwn,
  time,
  senderUsername,
}: {
  message: Message;
  isOwn: boolean;
  time: string;
  senderUsername: string;
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
            <a href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="Photo" className="block max-h-[260px] w-auto object-contain" />
            </a>
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
          </div>
        </div>
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
        <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
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
        </p>
      </div>
    </div>
  );
}

// Empty state for new conversations
function EmptyThreadState({ username }: { username: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold mb-4">
        {username.charAt(0).toUpperCase()}
      </div>
      <p className="font-semibold text-foreground mb-1">{username}</p>
      <p className="text-sm text-muted-foreground">Start a conversation!</p>
      <p className="text-xs text-muted-foreground mt-1">Send a message or gift 🎁</p>
    </div>
  );
}

