'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Search, Gift, Send } from 'lucide-react';
import GiftPickerMini from '@/components/messages/GiftPickerMini';
import { Input, EmptyState } from '@/components/ui';
import { useMessages } from '@/components/messages';
import SafeRichText from '@/components/SafeRichText';
import ReportModal from '@/components/ReportModal';
import { usePresence } from '@/contexts/PresenceContext';
import { PresenceDot } from '@/components/presence/PresenceDot';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import FriendsList from '@/components/messages/FriendsList';

/**
 * MESSAGES PAGE (Client)
 *
 * This file is a client component so it can use `useSearchParams` and interactive hooks.
 * The route wrapper (`app/messages/page.tsx`) is a server component that wraps this in <Suspense />
 * to satisfy Next.js app-router build requirements.
 */
function MessagesPageContent() {
  const searchParams = useSearchParams();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    openConversationWith,
    sendMessage,
    sendGift,
    sendImage,
    markConversationRead,
    isLoading,
  } = useMessages();
  const { refresh: refreshPresence } = usePresence();

  const [searchQuery, setSearchQuery] = useState('');

  const [reportTarget, setReportTarget] = useState<{
    reportedUserId?: string;
    reportedUsername?: string;
    contextDetails: string;
  } | null>(null);

  // Find the active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const openReportDmMessage = (msg: any) => {
    if (!activeConversation) return;
    setReportTarget({
      reportedUserId: msg.senderId,
      reportedUsername: activeConversation.recipientUsername,
      contextDetails: JSON.stringify({
        content_kind: 'dm_message',
        message_id: String(msg.id),
        dm_conversation_id: activeConversation.id,
        recipient_id: activeConversation.recipientId,
        recipient_username: activeConversation.recipientUsername,
        sender_id: msg.senderId,
        created_at: msg.timestamp?.toISOString?.() ?? null,
        snippet: String(msg.content || '').slice(0, 160) || null,
        surface: 'messages_page',
      }),
    });
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.recipientDisplayName?.toLowerCase().includes(query) ||
      conv.recipientUsername?.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query)
    );
  });

  // Prevent body scroll on mobile when messages page is active
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      };
    }
  }, []);

  useEffect(() => {
    const target = searchParams?.get('with');
    if (!target) return;
    void openConversationWith(target);
  }, [openConversationWith, searchParams]);

  // Refresh presence on mount
  useEffect(() => {
    refreshPresence();
  }, [refreshPresence]);

  return (
    <main
      id="main"
      className="h-[calc(100dvh-4rem-4rem)] md:h-[calc(100dvh-5rem)] bg-background overflow-hidden fixed top-16 bottom-16 inset-x-0 md:relative md:inset-auto md:top-auto md:bottom-auto"
    >
      <div className="h-full grid grid-cols-1 md:grid-cols-[480px_1fr]">
        {/* Conversations List - Left Panel */}
        <div
          className={`
          ${activeConversation ? 'hidden md:flex' : 'flex'}
          flex-col border-r border-border bg-card overflow-hidden
        `}
        >
          {/* Header */}
          <header className="p-4 border-b border-border bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Messages</h1>
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

          {/* Friends List - Horizontal Scroll */}
          <div className="border-b border-border">
            <FriendsList onSelectFriend={() => {}} layout="horizontal" />
          </div>

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
                  title={searchQuery ? 'No conversations found' : 'No messages yet'}
                  description={searchQuery ? 'Try a different search term' : 'Start a conversation with someone'}
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
                      <img
                        src={getAvatarUrl(conv.recipientAvatar)}
                        alt={conv.recipientUsername}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <PresenceDot profileId={conv.recipientId} isLive={conv.recipientIsLive} size="md" />
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
                      <p
                        className={`text-sm truncate ${
                          conv.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'
                        }`}
                      >
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
        <div
          className={`
          ${activeConversation ? 'flex' : 'hidden md:flex'}
          flex-col bg-background overflow-hidden h-full
        `}
        >
          {activeConversation ? (
            <div className="flex flex-col h-full min-h-0">
              {/* Thread Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
                <button onClick={() => setActiveConversationId(null)} className="md:hidden p-2 hover:bg-muted rounded-lg">
                  ←
                </button>
                <div className="relative flex-shrink-0">
                  <img
                    src={getAvatarUrl(activeConversation.recipientAvatar)}
                    alt={activeConversation.recipientUsername}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <PresenceDot profileId={activeConversation.recipientId} isLive={activeConversation.recipientIsLive} size="sm" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground">
                    {activeConversation.recipientDisplayName || activeConversation.recipientUsername}
                  </h2>
                  <p className="text-xs text-muted-foreground">@{activeConversation.recipientUsername}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
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
                          msg.senderId === activeConversation.recipientId ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {msg.senderId === activeConversation.recipientId && (
                          <div className="flex justify-end -mt-1 mb-1">
                            <button
                              type="button"
                              onClick={() => openReportDmMessage(msg)}
                              className="text-[11px] underline underline-offset-2 opacity-80 hover:opacity-100"
                              aria-label="Report message"
                              title="Report message"
                            >
                              Report
                            </button>
                          </div>
                        )}
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
                        {msg.type === 'gift' && <p>🎁 {msg.giftName} (+{msg.giftCoins} coins)</p>}
                        {msg.type === 'image' && msg.imageUrl && (
                          <img src={msg.imageUrl} alt="Sent image" className="rounded-lg max-w-full" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <MessageInputWithGift
                recipientId={activeConversation.recipientId}
                recipientUsername={activeConversation.recipientUsername}
                onSendMessage={sendMessage}
                onSendGift={sendGift}
              />
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
    </main>
  );
}

// Message input with gift button
function MessageInputWithGift({
  recipientId,
  recipientUsername,
  onSendMessage,
  onSendGift,
}: {
  recipientId: string;
  recipientUsername: string;
  onSendMessage: (recipientId: string, content: string) => Promise<boolean>;
  onSendGift: (
    recipientId: string,
    giftTypeId: number,
    giftName: string,
    coinCost: number,
    iconUrl?: string
  ) => Promise<boolean>;
}) {
  const [message, setMessage] = useState('');
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    setIsSending(true);
    await onSendMessage(recipientId, message);
    setMessage('');
    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleGiftSelect = async (gift: { id: number; name: string; coin_cost: number; icon_url?: string }) => {
    setIsSending(true);
    await onSendGift(recipientId, gift.id, gift.name, gift.coin_cost, gift.icon_url);
    setShowGiftPicker(false);
    setIsSending(false);
  };

  return (
    <div className="relative p-4 border-t border-border">
      <GiftPickerMini
        isOpen={showGiftPicker}
        onClose={() => setShowGiftPicker(false)}
        onSelectGift={handleGiftSelect}
        recipientUsername={recipientUsername}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowGiftPicker(!showGiftPicker)}
          className={`p-2.5 rounded-full transition ${
            showGiftPicker ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="Send a gift"
        >
          <Gift className="w-5 h-5" />
        </button>
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1"
          disabled={isSending}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="p-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:opacity-90 transition disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function MessagesClient() {
  // Note: MessagesProvider is already in the root layout; we just use the context directly
  return <MessagesPageContent />;
}

