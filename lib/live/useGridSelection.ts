/**
 * Optional React hook wrapper for grid selection
 * 
 * Provides a convenient React interface to the pure selection engine
 */

import { useState, useMemo, useEffect } from "react";
import { selectGridParticipants } from "./selectGridParticipants";
import type { ParticipantLite, SortMode } from "./types";

export interface UseGridSelectionOptions {
  /** All available participants */
  participants: ParticipantLite[];

  /** Sort mode */
  mode: SortMode;

  /** Pinned participant identities */
  pinned?: string[];

  /** Seed for random mode (should be stable per session) */
  seed?: string | number;

  /** Enable debug logging */
  debug?: boolean;
}

export interface UseGridSelectionReturn {
  /** Current selection of participant identities to display */
  selection: string[];

  /** Number of eligible participants */
  eligibleCount: number;

  /** Current sort mode */
  mode: SortMode;

  /** Whether there are more participants than can be displayed */
  hasOverflow: boolean;
}

/**
 * Hook for managing grid participant selection
 * 
 * @example
 * ```tsx
 * const { selection, hasOverflow } = useGridSelection({
 *   participants: livekitParticipants.map(p => ({
 *     identity: p.identity,
 *     hasVideo: p.isCameraEnabled,
 *     joinedAt: p.joinedAt,
 *   })),
 *   mode: 'newest',
 *   seed: sessionId,
 * });
 * ```
 */
export function useGridSelection(
  options: UseGridSelectionOptions
): UseGridSelectionReturn {
  const { participants, mode, pinned = [], seed, debug = false } = options;

  // Track current selection for stability
  const [currentSelection, setCurrentSelection] = useState<string[]>([]);

  // Compute new selection
  const result = useMemo(() => {
    const output = selectGridParticipants({
      participants,
      mode,
      currentSelection,
      pinned,
      seed,
    });

    if (debug && output.debug) {
      console.log("[Grid Selection]", output.debug);
    }

    return output;
  }, [participants, mode, currentSelection, pinned, seed, debug]);

  // Update current selection when result changes
  useEffect(() => {
    setCurrentSelection(result.selection);
  }, [result.selection]);

  return {
    selection: result.selection,
    eligibleCount: result.debug?.eligibleCount ?? 0,
    mode,
    hasOverflow: (result.debug?.eligibleCount ?? 0) > 12,
  };
}

/**
 * Simple hook that just returns the selection without state management
 * Use this if you're managing selection state externally
 */
export function useGridSelectionPure(
  options: UseGridSelectionOptions & { currentSelection?: string[] }
): UseGridSelectionReturn {
  const { participants, mode, pinned = [], seed, currentSelection = [] } = options;

  const result = useMemo(() => {
    return selectGridParticipants({
      participants,
      mode,
      currentSelection,
      pinned,
      seed,
    });
  }, [participants, mode, currentSelection, pinned, seed]);

  return {
    selection: result.selection,
    eligibleCount: result.debug?.eligibleCount ?? 0,
    mode,
    hasOverflow: (result.debug?.eligibleCount ?? 0) > 12,
  };
}

