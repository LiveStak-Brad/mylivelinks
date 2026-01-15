/**
 * Gift Quick Replies - Shared reply pool and utilities
 * 
 * Provides randomized thank-you replies for gift notifications.
 * Dismissal is UI-state only (no DB writes).
 */

// Pool of quick reply options
const REPLY_POOL = [
  "Thank you so much! 💖",
  "You're amazing! 🙌",
  "This made my day! ✨",
  "So grateful! 🥰",
  "You're the best! 🎉",
  "Love you for this! 💕",
  "Wow, thank you! 😍",
  "Appreciate you! 🙏",
  "You rock! 🤘",
  "Can't thank you enough! 💫",
  "This is so sweet! 🍬",
  "You're incredible! 🌟",
  "Means so much! ❤️",
  "Best supporter ever! 👑",
  "Thank you, friend! 🤗",
];

/**
 * Get N random unique replies from the pool
 */
export function getRandomReplies(count: number = 3): string[] {
  const shuffled = [...REPLY_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, REPLY_POOL.length));
}

/**
 * Storage key for dismissed gift IDs (session-based, not persisted)
 * This is used only for in-memory tracking within a session
 */
export const DISMISSED_GIFTS_KEY = 'gift_quick_replies_dismissed';

/**
 * Check if quick replies should show for a gift notification
 */
export function shouldShowQuickReplies(params: {
  notificationType: string;
  isReceiver: boolean;
  giftId?: string | number;
  dismissedGiftIds: Set<string>;
  showGiftQuickReplies: boolean;
}): boolean {
  const { notificationType, isReceiver, giftId, dismissedGiftIds, showGiftQuickReplies } = params;
  
  // Must be a gift notification
  if (notificationType !== 'gift') return false;
  
  // Must be the receiver
  if (!isReceiver) return false;
  
  // Must have a gift ID
  if (!giftId) return false;
  
  // Must not be dismissed
  if (dismissedGiftIds.has(String(giftId))) return false;
  
  // User setting must be enabled
  if (!showGiftQuickReplies) return false;
  
  return true;
}
