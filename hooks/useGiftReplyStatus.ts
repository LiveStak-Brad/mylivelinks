/**
 * useGiftReplyStatus Hook
 * 
 * A non-UI hook that detects gift reply/dismiss/eligibility status.
 * Designed for reuse across post/watch gift contexts without UI coupling.
 * 
 * SCOPE: Hook only - No UI, No wiring
 * 
 * Safe to consume in:
 * - Feed components (FeedScreen, PostCard)
 * - Watch/Live room components (LiveRoomScreen, ViewerOverlay)
 * - Gift notification handlers
 * - Any component that receives gift events
 */

import { useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Gift {
  id: string | number;
  sender_id: string;
  recipient_id: string;
  gift_type_id: number;
  coin_amount: number;
  sent_at: string;
  // Optional fields that may exist on extended gift records
  live_stream_id?: number | null;
  post_id?: string | null;
  comment_id?: string | null;
  // Reply tracking fields (future DB extension)
  replied_at?: string | null;
  dismissed_at?: string | null;
  reply_message?: string | null;
}

export interface GiftReplyStatus {
  /** Gift has been replied to (thank you message sent) */
  isReplied: boolean;
  /** Gift has been explicitly dismissed by recipient */
  isDismissed: boolean;
  /** Gift is eligible for quick-reply prompt (not replied, not dismissed, within time window) */
  isEligibleForReply: boolean;
  /** Time remaining in seconds before reply eligibility expires (null if not eligible) */
  replyWindowSecondsRemaining: number | null;
}

export interface UseGiftReplyStatusOptions {
  /** Time window in seconds during which a gift is eligible for reply (default: 86400 = 24h) */
  replyWindowSeconds?: number;
  /** Current user's profile ID (recipient perspective) */
  currentUserId?: string | null;
}

export interface UseGiftReplyStatusReturn {
  /** Get reply status for a single gift */
  getStatus: (gift: Gift) => GiftReplyStatus;
  /** Get reply status for multiple gifts */
  getStatuses: (gifts: Gift[]) => Map<string | number, GiftReplyStatus>;
  /** Filter gifts to only those eligible for reply */
  filterEligible: (gifts: Gift[]) => Gift[];
  /** Check if any gifts in array are eligible for reply */
  hasEligibleGifts: (gifts: Gift[]) => boolean;
  /** Count of eligible gifts in array */
  countEligible: (gifts: Gift[]) => number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default reply window: 24 hours */
const DEFAULT_REPLY_WINDOW_SECONDS = 86400;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGiftReplyStatus(
  options: UseGiftReplyStatusOptions = {}
): UseGiftReplyStatusReturn {
  const {
    replyWindowSeconds = DEFAULT_REPLY_WINDOW_SECONDS,
    currentUserId = null,
  } = options;

  /**
   * Calculate reply status for a single gift
   */
  const getStatus = useCallback(
    (gift: Gift): GiftReplyStatus => {
      const now = Date.now();
      const sentAt = new Date(gift.sent_at).getTime();
      const windowEnd = sentAt + replyWindowSeconds * 1000;
      const isWithinWindow = now < windowEnd;

      // Check replied status
      const isReplied = Boolean(gift.replied_at);

      // Check dismissed status
      const isDismissed = Boolean(gift.dismissed_at);

      // Eligibility requires:
      // 1. Not already replied
      // 2. Not dismissed
      // 3. Within time window
      // 4. Current user is the recipient (if currentUserId provided)
      const isRecipient = currentUserId ? gift.recipient_id === currentUserId : true;
      const isEligibleForReply =
        !isReplied && !isDismissed && isWithinWindow && isRecipient;

      // Calculate remaining time
      const replyWindowSecondsRemaining = isEligibleForReply
        ? Math.max(0, Math.floor((windowEnd - now) / 1000))
        : null;

      return {
        isReplied,
        isDismissed,
        isEligibleForReply,
        replyWindowSecondsRemaining,
      };
    },
    [replyWindowSeconds, currentUserId]
  );

  /**
   * Get statuses for multiple gifts as a Map
   */
  const getStatuses = useCallback(
    (gifts: Gift[]): Map<string | number, GiftReplyStatus> => {
      const statusMap = new Map<string | number, GiftReplyStatus>();
      for (const gift of gifts) {
        statusMap.set(gift.id, getStatus(gift));
      }
      return statusMap;
    },
    [getStatus]
  );

  /**
   * Filter to only gifts eligible for reply
   */
  const filterEligible = useCallback(
    (gifts: Gift[]): Gift[] => {
      return gifts.filter((gift) => getStatus(gift).isEligibleForReply);
    },
    [getStatus]
  );

  /**
   * Check if any gifts are eligible
   */
  const hasEligibleGifts = useCallback(
    (gifts: Gift[]): boolean => {
      return gifts.some((gift) => getStatus(gift).isEligibleForReply);
    },
    [getStatus]
  );

  /**
   * Count eligible gifts
   */
  const countEligible = useCallback(
    (gifts: Gift[]): number => {
      return gifts.filter((gift) => getStatus(gift).isEligibleForReply).length;
    },
    [getStatus]
  );

  return useMemo(
    () => ({
      getStatus,
      getStatuses,
      filterEligible,
      hasEligibleGifts,
      countEligible,
    }),
    [getStatus, getStatuses, filterEligible, hasEligibleGifts, countEligible]
  );
}

// ============================================================================
// Standalone utility (for non-React contexts)
// ============================================================================

/**
 * Pure function version for use outside React components
 */
export function getGiftReplyStatus(
  gift: Gift,
  options: { replyWindowSeconds?: number; currentUserId?: string | null } = {}
): GiftReplyStatus {
  const { replyWindowSeconds = DEFAULT_REPLY_WINDOW_SECONDS, currentUserId = null } = options;

  const now = Date.now();
  const sentAt = new Date(gift.sent_at).getTime();
  const windowEnd = sentAt + replyWindowSeconds * 1000;
  const isWithinWindow = now < windowEnd;

  const isReplied = Boolean(gift.replied_at);
  const isDismissed = Boolean(gift.dismissed_at);
  const isRecipient = currentUserId ? gift.recipient_id === currentUserId : true;
  const isEligibleForReply = !isReplied && !isDismissed && isWithinWindow && isRecipient;

  const replyWindowSecondsRemaining = isEligibleForReply
    ? Math.max(0, Math.floor((windowEnd - now) / 1000))
    : null;

  return {
    isReplied,
    isDismissed,
    isEligibleForReply,
    replyWindowSecondsRemaining,
  };
}
