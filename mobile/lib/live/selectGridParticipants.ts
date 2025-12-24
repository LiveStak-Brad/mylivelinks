/**
 * Grid Selection Engine
 * Local-only logic for determining which 12 participants to display
 * 
 * RULES:
 * - Max 12 visible tiles
 * - Only show participants who are publishing (hasVideo === true)
 * - Preserve existing selection when possible (anti-thrash)
 * - Deterministic random mode using seed
 * - Support pinned participants
 */

import type { ParticipantLite, SelectionInput, SelectionOutput, SortMode } from "./types";

const MAX_GRID_SIZE = 12;

/**
 * Main selection function - determines which participants to show in the grid
 */
export function selectGridParticipants(input: SelectionInput): SelectionOutput {
  const { participants, mode, currentSelection = [], pinned = [], seed } = input;

  // Step 1: Filter to only eligible participants
  const eligible = participants.filter(isEligible);

  // Step 2: Handle pinned participants first
  const pinnedEligible = pinned
    .filter((identity) => eligible.some((p) => p.identity === identity))
    .slice(0, MAX_GRID_SIZE); // Cap pinned at 12

  // If we have 12+ pinned, return only pinned
  if (pinnedEligible.length >= MAX_GRID_SIZE) {
    return {
      selection: pinnedEligible.slice(0, MAX_GRID_SIZE),
      debug: {
        eligibleCount: eligible.length,
        mode,
        reason: "All slots filled by pinned participants",
      },
    };
  }

  // Step 3: Get non-pinned eligible participants
  const nonPinned = eligible.filter(
    (p) => !pinnedEligible.includes(p.identity)
  );

  // Step 4: Preserve current selection for stability (anti-thrash)
  const currentStillEligible = currentSelection.filter((identity) =>
    nonPinned.some((p) => p.identity === identity)
  );

  // Step 5: Find how many new slots we need to fill
  const remainingSlots = MAX_GRID_SIZE - pinnedEligible.length - currentStillEligible.length;

  // Step 6: Get candidates for new slots (not currently selected, not pinned)
  const candidates = nonPinned.filter(
    (p) => !currentStillEligible.includes(p.identity)
  );

  // Step 7: Sort candidates by mode and select top ones
  const sortedCandidates = sortParticipants(candidates, mode, seed);
  const newSelections = sortedCandidates
    .slice(0, Math.max(0, remainingSlots))
    .map((p) => p.identity);

  // Step 8: Combine pinned + preserved current + new selections
  const finalSelection = [
    ...pinnedEligible,
    ...currentStillEligible,
    ...newSelections,
  ].slice(0, MAX_GRID_SIZE);

  return {
    selection: finalSelection,
    debug: {
      eligibleCount: eligible.length,
      mode,
      reason:
        eligible.length <= MAX_GRID_SIZE
          ? "All eligible participants fit"
          : `Selected top ${MAX_GRID_SIZE} from ${eligible.length} eligible`,
    },
  };
}

/**
 * Check if a participant is eligible for display
 */
function isEligible(participant: ParticipantLite): boolean {
  // Must have valid identity
  if (!participant.identity || participant.identity.trim() === "") {
    return false;
  }

  // Must be publishing video (primary requirement)
  if (!participant.hasVideo) {
    return false;
  }

  // Include self if publishing
  // (Product decision: viewers can see themselves)
  return true;
}

/**
 * Sort participants by the specified mode
 */
function sortParticipants(
  participants: ParticipantLite[],
  mode: SortMode,
  seed?: string | number
): ParticipantLite[] {
  const sorted = [...participants];

  switch (mode) {
    case "newest":
      return sorted.sort(sortByNewest);

    case "most_viewed":
      return sorted.sort((a, b) => sortByMetric(a, b, "views"));

    case "most_gifted":
      return sorted.sort((a, b) => sortByMetric(a, b, "gifts"));

    case "most_followed":
      return sorted.sort((a, b) => sortByMetric(a, b, "follows"));

    case "random":
      return deterministicShuffle(sorted, seed);

    default:
      // Fallback to newest
      return sorted.sort(sortByNewest);
  }
}

/**
 * Sort by newest (higher joinedAt = newer = higher priority)
 */
function sortByNewest(a: ParticipantLite, b: ParticipantLite): number {
  // Descending: newer first
  if (b.joinedAt !== a.joinedAt) {
    return b.joinedAt - a.joinedAt;
  }

  // Tie-breaker: alphabetical by identity
  return a.identity.localeCompare(b.identity);
}

/**
 * Sort by metric with proper tie-breaking
 */
function sortByMetric(
  a: ParticipantLite,
  b: ParticipantLite,
  metric: "views" | "gifts" | "follows"
): number {
  const aValue = a.metrics?.[metric] ?? 0;
  const bValue = b.metrics?.[metric] ?? 0;

  // Primary: metric descending (higher is better)
  if (bValue !== aValue) {
    return bValue - aValue;
  }

  // Tie-breaker 1: newer first
  if (b.joinedAt !== a.joinedAt) {
    return b.joinedAt - a.joinedAt;
  }

  // Tie-breaker 2: alphabetical by identity (stable)
  return a.identity.localeCompare(b.identity);
}

/**
 * Deterministic shuffle using seed
 * Same seed + same participants = same order
 */
function deterministicShuffle(
  participants: ParticipantLite[],
  seed?: string | number
): ParticipantLite[] {
  const items = [...participants];
  const seedValue = seed !== undefined ? String(seed) : "default-seed";

  // Create stable random generator using seed
  const rng = createSeededRandom(seedValue);

  // Fisher-Yates shuffle with seeded random
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}

/**
 * Create a seeded pseudo-random number generator
 * Returns a function that produces deterministic values in [0, 1)
 */
function createSeededRandom(seed: string): () => number {
  // Simple hash function for seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Linear congruential generator (LCG)
  let state = Math.abs(hash);

  return function (): number {
    // LCG parameters (Numerical Recipes)
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);

    state = (a * state + c) % m;
    return state / m;
  };
}

/**
 * Helper: Get participants that were removed from selection
 * Useful for cleanup/debugging
 */
export function getRemovedParticipants(
  previousSelection: string[],
  newSelection: string[]
): string[] {
  return previousSelection.filter(
    (identity) => !newSelection.includes(identity)
  );
}

/**
 * Helper: Get participants that were added to selection
 * Useful for debugging
 */
export function getAddedParticipants(
  previousSelection: string[],
  newSelection: string[]
): string[] {
  return newSelection.filter(
    (identity) => !previousSelection.includes(identity)
  );
}

