/**
 * Grid Selection Engine Types
 * Pure types for the 12-tile selection algorithm
 */

export type SortMode =
  | "random"
  | "newest"
  | "most_viewed"
  | "most_gifted"
  | "most_followed";

/**
 * Lightweight participant representation for grid selection
 */
export interface ParticipantLite {
  /** Stable unique identifier (e.g., user ID or LiveKit identity) */
  identity: string;

  /** Whether this participant is the local viewer */
  isSelf?: boolean;

  /** Whether participant is publishing video */
  hasVideo: boolean;

  /** Whether participant is publishing audio (optional) */
  hasAudio?: boolean;

  /** Timestamp when participant joined (ms since epoch) */
  joinedAt: number;

  /** Optional metrics for ranking */
  metrics?: {
    views?: number;
    gifts?: number;
    follows?: number;
  };
}

/**
 * Input parameters for grid selection
 */
export interface SelectionInput {
  /** All participants available to display */
  participants: ParticipantLite[];

  /** Sort mode for overflow handling */
  mode: SortMode;

  /** Current selection to preserve for stability */
  currentSelection?: string[];

  /** Pinned identities (always show if eligible) */
  pinned?: string[];

  /** Seed for deterministic random mode */
  seed?: string | number;
}

/**
 * Output from grid selection
 */
export interface SelectionOutput {
  /** Ordered list of identities to display (max 12) */
  selection: string[];

  /** Debug information */
  debug?: {
    eligibleCount: number;
    mode: SortMode;
    reason?: string;
  };
}

