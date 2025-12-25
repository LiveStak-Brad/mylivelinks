'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minus, Send, MoreHorizontal, Phone, Video, Smile } from 'lucide-react';
import Image from 'next/image';

export interface IMMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
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
  onFocus,
  zIndex,
}: IMChatWindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [messageInput, setMessageInput] = useState('');
  const windowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
            {recipientAvatar ? (
              <img src={recipientAvatar} alt={recipientUsername} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                {recipientUsername.charAt(0).toUpperCase()}
              </div>
            )}
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
  return (
    <div
      ref={windowRef}
      className="fixed w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ 
        left: position.x, 
        top: position.y, 
        zIndex,
        height: '400px',
        maxHeight: 'calc(100vh - 100px)',
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
              {recipientAvatar ? (
                <img src={recipientAvatar} alt={recipientUsername} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {recipientUsername.charAt(0).toUpperCase()}
                </div>
              )}
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
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              {recipientAvatar ? (
                <img src={recipientAvatar} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-bold">{recipientUsername.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <p className="text-sm font-medium">{recipientUsername}</p>
            <p className="text-xs mt-1">Start a conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
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
      <div className="border-t border-border p-2 bg-card">
        <div className="flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition">
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

