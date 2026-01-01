'use client';

import { useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import { Input, EmptyState } from '@/components/ui';
import { useMessages } from '@/components/messages';
import SafeRichText from '@/components/SafeRichText';

/**
 * MESSAGES PAGE
 * 
 * Dedicated page for messages (moved from modal).
 * Better for mobile navigation and full-screen experience.
 * 
 * Route: /messages
 */
function MessagesPageContent() {
  const { 
    conversations, 
    activeConversationId,
    setActiveConversationId,
    messages,
    sendMessage,
    sendGift,
    sendImage,
    markConversationRead,
    isLoading 
  } = useMessages();

  const [searchQuery, setSearchQuery] = useState('');

  // Find the active conversation object
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.recipientDisplayName?.toLowerCase().includes(query) ||
      conv.recipientUsername?.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query)
    );
  });

  return (
    <main 
      id="main"
      className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] bg-background"
    >
      <div className="h-full grid grid-cols-1 md:grid-cols-[480px_1fr]">
        
        {/* Conversations List - Left Panel */}
        <div className={`
          ${activeConversation ? 'hidden md:flex' : 'flex'}
          flex-col border-r border-border bg-card overflow-hidden
        `}>
          {/* Header */}
          <header className="p-4 border-b border-border bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">
                Messages
              </h1>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </header>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<MessageCircle className="w-16 h-16" />}
                  title={searchQuery ? "No conversations found" : "No messages yet"}
                  description={
                    searchQuery
                      ? "Try a different search term"
                      : "Start a conversation with someone"
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`
                      flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors border-b border-border
                      ${activeConversationId === conv.id ? 'bg-primary/10' : ''}
                    `}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                        {conv.recipientUsername?.[0]?.toUpperCase() || '?'}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-foreground truncate">
                          {conv.recipientDisplayName || conv.recipientUsername}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {conv.lastMessage || 'No messages'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Thread - Right Panel */}
        <div className={`
          ${activeConversation ? 'flex' : 'hidden md:flex'}
          flex-col bg-background overflow-hidden
        `}>
          {activeConversation ? (
            <div className="flex flex-col h-full">
              {/* Thread Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-2 hover:bg-muted rounded-lg"
                >
                  ←
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                  {activeConversation.recipientUsername?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground">
                    {activeConversation.recipientDisplayName || activeConversation.recipientUsername}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    @{activeConversation.recipientUsername}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === activeConversation.recipientId ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.senderId === activeConversation.recipientId
                            ? 'bg-muted text-foreground'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {msg.type === 'text' && (
                          <p className="whitespace-pre-wrap">
                            <SafeRichText
                              text={msg.content}
                              className="whitespace-pre-wrap"
                              linkClassName={
                                msg.senderId === activeConversation.recipientId
                                  ? 'text-primary underline underline-offset-2'
                                  : 'text-white underline underline-offset-2'
                              }
                            />
                          </p>
                        )}
                        {msg.type === 'gift' && (
                          <p>
                            🎁 {msg.giftName} (+{msg.giftCoins} coins)
                          </p>
                        )}
                        {msg.type === 'image' && msg.imageUrl && (
                          <img src={msg.imageUrl} alt="Sent image" className="rounded-lg max-w-full" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
                    if (input.value.trim()) {
                      sendMessage(activeConversation.recipientId, input.value);
                      input.value = '';
                    }
                  }}
                  className="flex gap-2"
                >
                  <Input
                    name="message"
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                icon={<MessageCircle className="w-16 h-16" />}
                title="Select a conversation"
                description="Choose a conversation from the list to start messaging"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom padding for mobile nav */}
      <div className="h-20 md:hidden" aria-hidden="true" />
    </main>
  );
}

export default function MessagesPage() {
  // Note: MessagesProvider is already in the root layout
  // We just use the context directly
  return <MessagesPageContent />;
}

