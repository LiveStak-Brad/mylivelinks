'use client';

import { useState } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { useMessages, Conversation } from './MessagesContext';

interface ConversationListProps {
  onSelectConversation?: (conversation: Conversation) => void;
}

export default function ConversationList({ onSelectConversation }: ConversationListProps) {
  const { conversations, isLoading, activeConversationId, setActiveConversationId } = useMessages();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv => 
    conv.recipientUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.recipientDisplayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleSelect = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    onSelectConversation?.(conv);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Search skeleton */}
        <div className="p-3 border-b border-border">
          <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
        </div>
        {/* Conversation skeletons */}
        <div className="flex-1 overflow-y-auto">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-12 h-12 rounded-full bg-muted/50 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
                <div className="h-3 w-36 bg-muted/30 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages"
            className="w-full pl-9 pr-4 py-2.5 bg-muted/50 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredConversations.length === 0 ? (
          <EmptyState hasSearch={searchQuery.length > 0} />
        ) : (
          filteredConversations.map(conv => (
            <ConversationRow
              key={conv.id}
              conversation={conv}
              isActive={activeConversationId === conv.id}
              timeAgo={formatTimeAgo(conv.lastMessageAt)}
              onClick={() => handleSelect(conv)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Single conversation row
function ConversationRow({
  conversation,
  isActive,
  timeAgo,
  onClick,
}: {
  conversation: Conversation;
  isActive: boolean;
  timeAgo: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition ${
        isActive ? 'bg-primary/10 hover:bg-primary/15' : ''
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {conversation.recipientAvatar ? (
          <img
            src={conversation.recipientAvatar}
            alt={conversation.recipientUsername}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
            {(conversation.recipientDisplayName || conversation.recipientUsername).charAt(0).toUpperCase()}
          </div>
        )}
        {/* Online indicator */}
        {conversation.isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
            {conversation.recipientDisplayName || conversation.recipientUsername}
          </p>
          <span className={`text-xs flex-shrink-0 ${conversation.unreadCount > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            {timeAgo}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {/* Show read status for messages you sent */}
            {conversation.lastMessageSentByMe && (
              <span className={`flex-shrink-0 text-[10px] ${conversation.lastMessageRead ? 'text-blue-400' : 'text-muted-foreground/60'}`}>
                {conversation.lastMessageRead ? '✓✓' : '✓'}
              </span>
            )}
            <p className={`text-xs truncate ${conversation.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {conversation.lastMessage || 'Start a conversation'}
            </p>
          </div>
          {conversation.unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// Empty state
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <MessageCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      {hasSearch ? (
        <>
          <p className="text-sm font-medium text-foreground mb-1">No results found</p>
          <p className="text-xs text-muted-foreground">Try a different search term</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
          <p className="text-xs text-muted-foreground">Start a conversation with someone!</p>
        </>
      )}
    </div>
  );
}

