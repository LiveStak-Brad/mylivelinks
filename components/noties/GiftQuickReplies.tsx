'use client';

import { useState, useMemo } from 'react';
import { getRandomReplies } from '@/lib/noties/giftQuickReplies';

interface GiftQuickRepliesProps {
  giftId: string;
  senderId: string;
  postId?: string;
  creatorStudioItemId?: string;
  onSendReply: (recipientId: string, message: string, giftId?: string, postId?: string, creatorStudioItemId?: string) => Promise<boolean>;
  onDismiss: (giftId: string) => void;
}

export default function GiftQuickReplies({
  giftId,
  senderId,
  postId,
  creatorStudioItemId,
  onSendReply,
  onDismiss,
}: GiftQuickRepliesProps) {
  const [isSending, setIsSending] = useState(false);
  
  // Generate random replies once per mount
  const replies = useMemo(() => getRandomReplies(3), []);

  const handleReply = async (message: string) => {
    if (isSending) return;
    setIsSending(true);
    
    try {
      await onSendReply(senderId, message, giftId, postId, creatorStudioItemId);
      onDismiss(giftId);
    } catch (err) {
      console.error('[GiftQuickReplies] Failed to send reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleNoThanks = () => {
    onDismiss(giftId);
  };

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {replies.map((reply, idx) => (
        <button
          key={idx}
          onClick={() => handleReply(reply)}
          disabled={isSending}
          className="px-2.5 py-1 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition disabled:opacity-50"
        >
          {reply}
        </button>
      ))}
      <button
        onClick={handleNoThanks}
        disabled={isSending}
        className="px-2.5 py-1 text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground rounded-full transition disabled:opacity-50"
      >
        No thanks
      </button>
    </div>
  );
}
