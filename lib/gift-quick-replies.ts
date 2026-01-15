/**
 * Quick Reply Pool for Gift Responses
 * 
 * A centralized, reusable system providing casual, human-sounding
 * quick replies for gift acknowledgments.
 */

const GIFT_REPLY_POOL: readonly string[] = [
  // Gratitude - Simple
  "Thank you so much!",
  "Thanks! You're amazing",
  "Appreciate you!",
  "You're the best!",
  "Thanks a ton!",
  "So grateful!",
  "Thank you!!",
  "Means a lot!",
  "You rock!",
  "Thanks friend!",
  
  // Gratitude - Warm
  "You just made my day",
  "This is so sweet",
  "You're too kind",
  "Love the support!",
  "Feeling the love",
  "You're incredible",
  "So thoughtful!",
  "This made me smile",
  "You're a gem",
  "Heart is full",
  
  // Excitement
  "Wow thank you!",
  "No way! Thanks!",
  "This is awesome!",
  "You're legendary",
  "Can't believe it!",
  "So hyped rn",
  "Let's gooo!",
  "Big love!",
  "Yesss thank you!",
  "This is wild!",
  
  // Casual/Chill
  "Much appreciated",
  "You didn't have to!",
  "Too generous",
  "Real one right here",
  "Respect!",
  "Cheers!",
  "Good looking out",
  "Solid!",
  "Nice one!",
  "Legend status",
  
  // Emoji-light
  "Thanks! 🙏",
  "You're amazing ✨",
  "Love it! 💯",
  "So kind! 💙",
  "Wow! 🔥",
  
  // Acknowledgment
  "I see you!",
  "Noticed and appreciated",
  "You showed up!",
  "Coming in clutch",
  "MVP move right there",
  "That's love",
  "Big supporter energy",
  "You always come through",
  "Consistent greatness",
  "True supporter vibes",
] as const;

/**
 * Returns an array of randomized, non-repeating gift replies.
 * 
 * @param count - Number of replies to return (default: 3, max: pool size)
 * @returns Array of unique reply strings
 * 
 * @example
 * const replies = getRandomGiftReplies(3);
 * // => ["Thanks! You're amazing", "You rock!", "This is awesome!"]
 */
export function getRandomGiftReplies(count: number = 3): string[] {
  const poolSize = GIFT_REPLY_POOL.length;
  const safeCount = Math.min(Math.max(1, count), poolSize);
  
  // Fisher-Yates shuffle on indices to avoid mutating the pool
  const indices = Array.from({ length: poolSize }, (_, i) => i);
  
  for (let i = poolSize - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  // Take first `safeCount` shuffled indices
  return indices.slice(0, safeCount).map(i => GIFT_REPLY_POOL[i]);
}

/**
 * Returns the total number of replies in the pool.
 * Useful for validation or UI display.
 */
export function getReplyPoolSize(): number {
  return GIFT_REPLY_POOL.length;
}

/**
 * Exports the full reply pool (read-only).
 * Use sparingly - prefer getRandomGiftReplies for most cases.
 */
export const REPLY_POOL = GIFT_REPLY_POOL;
