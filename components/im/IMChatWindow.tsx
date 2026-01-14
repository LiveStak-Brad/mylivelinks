'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minus, Send, MoreHorizontal, Phone, Video, Smile, Gift } from 'lucide-react';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import GiftPickerMini from '@/components/messages/GiftPickerMini';

// Map gift names to emojis
const getGiftEmoji = (name: string) => {
  const emojiMap: { [key: string]: string } = {
    'Poo': '💩', 'Rose': '🌹', 'Heart': '❤️', 'Star': '⭐', 'Diamond': '💎',
    'Super Star': '🌟', 'Crown': '👑', 'Platinum': '💠', 'Legendary': '🏆',
    'Fire': '🔥', 'Rocket': '🚀', 'Rainbow': '🌈', 'Unicorn': '🦄',
    'Party': '🎉', 'Confetti': '🎊', 'Champagne': '🍾', 'Money': '💰',
    'Cash': '💵', 'Gold': '🥇', 'Silver': '🥈', 'Bronze': '🥉',
    'Kiss': '💋', 'Hug': '🤗', 'Love': '💕', 'Sparkle': '✨',
    'Gem': '💎', 'Crystal': '🔮', 'Music': '🎵', 'Microphone': '🎤',
    'Camera': '📸', 'Clap': '👏', 'Thumbs Up': '👍', 'Wave': '👋',
    'Flex': '💪', 'Cool': '😎', 'Hot': '🥵', 'VIP': '🎯',
    'King': '🤴', 'Queen': '👸', 'Angel': '😇', 'Devil': '😈',
  };
  return emojiMap[name] || '🎁';
};

export interface IMMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type?: 'text' | 'gift' | 'image' | 'share';
  giftName?: string;
  giftCoins?: number;
  giftIcon?: string;
  imageUrl?: string;
  shareText?: string;
  shareUrl?: string;
  shareThumbnail?: string;
  shareContentType?: string;
  shareTeamName?: string;
}

export interface IMChatWindowProps {
  chatId: string;
  recipientId: string;
  recipientUsername: string;
  recipientAvatar?: string;
  isOnline?: boolean;
  messages: IMMessage[];
  currentUserId: string;
  initialPosition?: { x: number; y: number };
  isMinimized?: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onSendMessage: (content: string) => void;
  onSendGift: (giftId: number, giftName: string, giftCoins: number, giftIcon?: string) => void;
  onFocus: () => void;
  zIndex: number;
}

/**
 * IMChatWindow - Draggable instant message chat window
 * 
 * Features:
 * - Draggable header (can move around screen)
 * - Minimize/maximize
 * - Real-time message display
 * - Brand logo watermark in background
 * - Compact, modern design
 */
export default function IMChatWindow({
  chatId,
  recipientId,
  recipientUsername,
  recipientAvatar,
  isOnline = false,
  messages,
  currentUserId,
  initialPosition = { x: 100, y: 100 },
  isMinimized = false,
  onClose,
  onMinimize,
  onSendMessage,
  onSendGift,
  onFocus,
  zIndex,
}: IMChatWindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [messageInput, setMessageInput] = useState('');
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [isMobileSize, setIsMobileSize] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect mobile size for responsive layout
  useEffect(() => {
    const checkMobile = () => setIsMobileSize(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when window opens
  useEffect(() => {
    if (!isMinimized) {
      inputRef.current?.focus();
    }
  }, [isMinimized]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
      onFocus();
    }
  }, [onFocus]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleSend = () => {
    const trimmed = messageInput.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      setMessageInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGiftSelect = async (gift: { id: number; name: string; coin_cost: number; icon_url?: string }) => {
    onSendGift(gift.id, gift.name, gift.coin_cost, gift.icon_url);
    setShowGiftPicker(false);
    inputRef.current?.focus();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Minimized state - just show avatar bubble
  if (isMinimized) {
    return (
      <div
        ref={windowRef}
        className="fixed cursor-pointer group"
        style={{ left: position.x, top: position.y, zIndex }}
        onClick={() => {
          onMinimize();
          onFocus();
        }}
      >
        <div className="relative">
          {/* Avatar bubble */}
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg hover:scale-110 transition-transform">
            <img 
              src={getAvatarUrl(recipientAvatar)} 
              alt={recipientUsername} 
              className="w-full h-full object-cover bg-muted"
              onError={(e) => {
                e.currentTarget.src = '/no-profile-pic.png';
              }}
            />
          </div>
          
          {/* Online indicator */}
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          )}
          
          {/* Unread badge */}
          {messages.filter(m => m.senderId !== currentUserId && m.status !== 'read').length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {messages.filter(m => m.senderId !== currentUserId && m.status !== 'read').length}
            </div>
          )}
          
          {/* Close button on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute -top-1 -left-1 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Full chat window
  // On mobile (< 640px), use full width anchored to bottom; on desktop use draggable fixed position
  return (
    <div
      ref={windowRef}
      className="fixed bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col w-[calc(100vw-1rem)] sm:w-80"
      style={{ 
        left: isMobileSize ? '0.5rem' : position.x, 
        top: isMobileSize ? 'auto' : position.y,
        bottom: isMobileSize ? '0.5rem' : 'auto',
        zIndex,
        height: isMobileSize ? '50dvh' : '400px',
        // Use dvh for better iOS Safari support
        maxHeight: 'calc(100dvh - 100px)',
        maxWidth: isMobileSize ? 'calc(100vw - 1rem)' : '320px',
      }}
      onClick={onFocus}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <img 
                src={getAvatarUrl(recipientAvatar)} 
                alt={recipientUsername} 
                className="w-full h-full object-cover bg-muted"
                onError={(e) => {
                  e.currentTarget.src = '/no-profile-pic.png';
                }}
              />
            </div>
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-purple-600" />
            )}
          </div>
          
          {/* Name & Status */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{recipientUsername}</p>
            <p className="text-white/70 text-xs">
              {isOnline ? 'Active now' : 'Offline'}
            </p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          <button className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition">
            <Phone size={14} />
          </button>
          <button className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition">
            <Video size={14} />
          </button>
          <button
            onClick={onMinimize}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 relative custom-scrollbar">
        {/* Background watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Image
            src="/branding/mylivelinkstransparent.png"
            alt=""
            width={120}
            height={120}
            className="opacity-[0.04]"
          />
        </div>
        
        {/* Messages */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-3 overflow-hidden">
              <img 
                src={getAvatarUrl(recipientAvatar)} 
                alt="" 
                className="w-12 h-12 rounded-full object-cover bg-muted"
                onError={(e) => {
                  e.currentTarget.src = '/no-profile-pic.png';
                }}
              />
            </div>
            <p className="text-sm font-medium">{recipientUsername}</p>
            <p className="text-xs mt-1">Start a conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            
            // Gift message rendering
            if (msg.type === 'gift') {
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[80%] px-3 py-2 rounded-2xl bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {msg.giftIcon?.startsWith('http') || msg.giftIcon?.startsWith('/') ? (
                          <img src={msg.giftIcon} alt={msg.giftName || 'Gift'} className="w-8 h-8" />
                        ) : (
                          msg.giftIcon || getGiftEmoji(msg.giftName || '')
                        )}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {isOwn ? 'You' : recipientUsername} sent a gift!
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {msg.giftName} • {msg.giftCoins} 💰
                        </p>
                      </div>
                    </div>
                    <p className={`text-[10px] mt-1 ${isOwn ? 'text-right' : 'text-left'} text-muted-foreground`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            }

            // Image message rendering
            if (msg.type === 'image' && msg.imageUrl) {
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[75%] rounded-2xl overflow-hidden border border-border">
                    <img src={msg.imageUrl} alt="Photo" className="max-h-48 w-auto object-contain" />
                    <p className={`text-[10px] px-2 py-1 ${isOwn ? 'text-right' : 'text-left'} text-muted-foreground`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            }

            // Share message rendering
            if (msg.type === 'share') {
              const isLive = msg.shareContentType === 'live';
              const isPhoto = msg.shareContentType === 'photo';
              const rawThumb = msg.shareThumbnail?.trim();
              const isVideoUrl = rawThumb && /\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i.test(rawThumb);
              const isValidImageUrl = rawThumb && (rawThumb.startsWith('http') || rawThumb.startsWith('/')) && !isVideoUrl;
              const shareThumbnail = isValidImageUrl ? rawThumb : null;
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <a
                    href={msg.shareUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block max-w-[80%] rounded-2xl overflow-hidden border border-border hover:opacity-95 transition"
                  >
                    {/* Thumbnail */}
                    <div className={`relative ${isPhoto ? 'aspect-square' : 'aspect-video'} bg-gray-900 overflow-hidden`}>
                      {shareThumbnail ? (
                        <>
                          <img 
                            src={shareThumbnail} 
                            alt={msg.shareText || 'Shared content'} 
                            className="w-full h-full object-cover"
                          />
                          {!isPhoto && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              {isLive ? (
                                <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                  🔴 LIVE
                                </span>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                                  <span className="text-white text-lg ml-0.5">▶</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                          {isLive ? (
                            <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                              🔴 LIVE
                            </span>
                          ) : isPhoto ? (
                            <span className="text-2xl">📷</span>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
                              <span className="text-white text-lg ml-0.5">▶</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Text preview */}
                    <div className="px-2.5 py-2 bg-muted/30">
                      <p className="text-xs font-medium text-foreground line-clamp-2">{msg.shareText || 'Shared content'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <span>🔗</span>
                        <span className="truncate">{msg.shareUrl?.replace(/^https?:\/\//, '').split('/')[0] || 'mylivelinks.com'}</span>
                      </p>
                      {msg.shareTeamName && (
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500 text-white text-[9px] font-bold rounded">
                          🔒 Team: {msg.shareTeamName}
                        </div>
                      )}
                    </div>
                    {/* Time */}
                    <p className={`text-[10px] px-2 py-1 ${isOwn ? 'text-right' : 'text-left'} text-muted-foreground border-t border-border/30`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </a>
                </div>
              );
            }
            
            // Default text message rendering
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {formatTime(msg.timestamp)}
                    {isOwn && (
                      <span className="ml-1">
                        {msg.status === 'sending' && '○'}
                        {msg.status === 'sent' && '✓'}
                        {msg.status === 'delivered' && '✓✓'}
                        {msg.status === 'read' && '✓✓'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative border-t border-border p-2 bg-card">
        <GiftPickerMini
          isOpen={showGiftPicker}
          onClose={() => setShowGiftPicker(false)}
          onSelectGift={handleGiftSelect}
          recipientUsername={recipientUsername}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGiftPicker(!showGiftPicker)}
            className={`p-2 rounded-full transition ${
              showGiftPicker
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Send a gift"
            type="button"
          >
            <Gift size={18} />
          </button>

          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition" type="button">
            <Smile size={18} />
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-muted/50 border-none rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            maxLength={500}
          />
          
          <button
            onClick={handleSend}
            disabled={!messageInput.trim()}
            className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

