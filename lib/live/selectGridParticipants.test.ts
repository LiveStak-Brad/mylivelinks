/**
 * Unit tests for Grid Selection Engine
 * 
 * Tests cover:
 * - Basic fill (< 12 participants)
 * - Overflow (> 12 participants)
 * - Stability with currentSelection
 * - Deterministic random mode
 * - Tie-breakers
 * - Pinned participants
 */

import { describe, it, expect } from "@jest/globals";
import { selectGridParticipants, getRemovedParticipants, getAddedParticipants } from "./selectGridParticipants";
import type { ParticipantLite } from "./types";

/**
 * Helper to create test participants
 */
function createParticipant(
  identity: string,
  overrides?: Partial<ParticipantLite>
): ParticipantLite {
  return {
    identity,
    hasVideo: true,
    joinedAt: Date.now(),
    ...overrides,
  };
}

describe("selectGridParticipants", () => {
  describe("Basic fill (< 12 participants)", () => {
    it("should return all eligible participants when count <= 12", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { joinedAt: 1000 }),
        createParticipant("user2", { joinedAt: 2000 }),
        createParticipant("user3", { joinedAt: 3000 }),
        createParticipant("user4", { joinedAt: 4000 }),
        createParticipant("user5", { joinedAt: 5000 }),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
      });

      expect(result.selection).toHaveLength(5);
      expect(result.debug?.eligibleCount).toBe(5);
    });

    it("should order by newest when mode is newest", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { joinedAt: 1000 }),
        createParticipant("user2", { joinedAt: 3000 }),
        createParticipant("user3", { joinedAt: 2000 }),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
      });

      expect(result.selection).toEqual(["user2", "user3", "user1"]);
    });

    it("should exclude participants without video", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { hasVideo: true }),
        createParticipant("user2", { hasVideo: false }),
        createParticipant("user3", { hasVideo: true }),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
      });

      expect(result.selection).toHaveLength(2);
      expect(result.selection).toContain("user1");
      expect(result.selection).toContain("user3");
      expect(result.selection).not.toContain("user2");
    });

    it("should include self if publishing video", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { isSelf: false, hasVideo: true }),
        createParticipant("self", { isSelf: true, hasVideo: true }),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
      });

      expect(result.selection).toContain("self");
    });
  });

  describe("Overflow (> 12 participants)", () => {
    it("should return exactly 12 when more than 12 eligible", () => {
      const participants: ParticipantLite[] = Array.from({ length: 20 }, (_, i) =>
        createParticipant(`user${i}`, { joinedAt: 1000 + i * 1000 })
      );

      const result = selectGridParticipants({
        participants,
        mode: "newest",
      });

      expect(result.selection).toHaveLength(12);
      expect(result.debug?.eligibleCount).toBe(20);
    });

    it("should select top 12 by newest", () => {
      const participants: ParticipantLite[] = Array.from({ length: 20 }, (_, i) =>
        createParticipant(`user${i}`, { joinedAt: 1000 + i * 1000 })
      );

      const result = selectGridParticipants({
        participants,
        mode: "newest",
      });

      // Should have the 12 newest (user19 down to user8)
      expect(result.selection).toContain("user19");
      expect(result.selection).toContain("user18");
      expect(result.selection).not.toContain("user0");
      expect(result.selection).not.toContain("user1");
    });

    it("should select top 12 by most_viewed", () => {
      const participants: ParticipantLite[] = Array.from({ length: 20 }, (_, i) =>
        createParticipant(`user${i}`, {
          joinedAt: 1000,
          metrics: { views: i * 10 },
        })
      );

      const result = selectGridParticipants({
        participants,
        mode: "most_viewed",
      });

      expect(result.selection).toHaveLength(12);
      // Should have top viewed: user19 (190 views) down to user8 (80 views)
      expect(result.selection).toContain("user19");
      expect(result.selection).toContain("user18");
      expect(result.selection).not.toContain("user0");
      expect(result.selection).not.toContain("user7");
    });

    it("should select top 12 by most_gifted", () => {
      const participants: ParticipantLite[] = Array.from({ length: 15 }, (_, i) =>
        createParticipant(`user${i}`, {
          joinedAt: 1000,
          metrics: { gifts: 100 - i * 5 }, // Descending gifts
        })
      );

      const result = selectGridParticipants({
        participants,
        mode: "most_gifted",
      });

      expect(result.selection).toHaveLength(12);
      // Top 12: user0 (100) to user11 (45)
      expect(result.selection).toContain("user0");
      expect(result.selection).toContain("user11");
      expect(result.selection).not.toContain("user12");
      expect(result.selection).not.toContain("user14");
    });

    it("should select top 12 by most_followed", () => {
      const participants: ParticipantLite[] = Array.from({ length: 15 }, (_, i) =>
        createParticipant(`user${i}`, {
          joinedAt: 1000,
          metrics: { follows: i * 100 },
        })
      );

      const result = selectGridParticipants({
        participants,
        mode: "most_followed",
      });

      expect(result.selection).toHaveLength(12);
      // Top 12: user14 down to user3
      expect(result.selection).toContain("user14");
      expect(result.selection).toContain("user3");
      expect(result.selection).not.toContain("user2");
      expect(result.selection).not.toContain("user0");
    });
  });

  describe("Stability with currentSelection (anti-thrash)", () => {
    it("should preserve current selection when participants still eligible", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { hasVideo: true }),
        createParticipant("user2", { hasVideo: true }),
        createParticipant("user3", { hasVideo: true }),
      ];

      const currentSelection = ["user1", "user2"];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
        currentSelection,
      });

      expect(result.selection).toContain("user1");
      expect(result.selection).toContain("user2");
      expect(result.selection).toContain("user3");
    });

    it("should remove participants from selection when no longer eligible", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { hasVideo: true }),
        createParticipant("user2", { hasVideo: false }), // No longer publishing
        createParticipant("user3", { hasVideo: true }),
      ];

      const currentSelection = ["user1", "user2"];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
        currentSelection,
      });

      expect(result.selection).toContain("user1");
      expect(result.selection).not.toContain("user2"); // Removed
      expect(result.selection).toContain("user3"); // Added
    });

    it("should replace only when overflow and better candidates exist", () => {
      const participants: ParticipantLite[] = Array.from({ length: 15 }, (_, i) =>
        createParticipant(`user${i}`, {
          joinedAt: 1000 + i * 1000,
          metrics: { views: i * 10 },
        })
      );

      // Current selection has users 0-11
      const currentSelection = Array.from({ length: 12 }, (_, i) => `user${i}`);

      const result = selectGridParticipants({
        participants,
        mode: "most_viewed",
        currentSelection,
      });

      // Should keep current selection stable since they're all eligible
      // Even though user12, user13, user14 have higher views
      // This tests stability - we don't thrash the selection
      expect(result.selection).toHaveLength(12);
      
      // Current selections should be preserved
      currentSelection.forEach(id => {
        expect(result.selection).toContain(id);
      });
    });

    it("should add new participants to fill empty slots", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { joinedAt: 1000 }),
        createParticipant("user2", { joinedAt: 2000 }),
        createParticipant("user3", { joinedAt: 3000 }),
        createParticipant("user4", { joinedAt: 4000 }),
      ];

      const currentSelection = ["user1"]; // Only 1 selected, 11 slots available

      const result = selectGridParticipants({
        participants,
        mode: "newest",
        currentSelection,
      });

      expect(result.selection).toHaveLength(4);
      expect(result.selection).toContain("user1"); // Preserved
      expect(result.selection).toContain("user2"); // Added
      expect(result.selection).toContain("user3"); // Added
      expect(result.selection).toContain("user4"); // Added
    });
  });

  describe("Deterministic random mode", () => {
    it("should produce same order with same seed and participants", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1"),
        createParticipant("user2"),
        createParticipant("user3"),
        createParticipant("user4"),
        createParticipant("user5"),
      ];

      const result1 = selectGridParticipants({
        participants,
        mode: "random",
        seed: "test-seed-123",
      });

      const result2 = selectGridParticipants({
        participants,
        mode: "random",
        seed: "test-seed-123",
      });

      expect(result1.selection).toEqual(result2.selection);
    });

    it("should produce different order with different seeds", () => {
      const participants: ParticipantLite[] = Array.from({ length: 10 }, (_, i) =>
        createParticipant(`user${i}`)
      );

      const result1 = selectGridParticipants({
        participants,
        mode: "random",
        seed: "seed-A",
      });

      const result2 = selectGridParticipants({
        participants,
        mode: "random",
        seed: "seed-B",
      });

      // Should be different (with 10 items, probability of same order is ~0.0003%)
      expect(result1.selection).not.toEqual(result2.selection);
    });

    it("should handle random mode with overflow (>12)", () => {
      const participants: ParticipantLite[] = Array.from({ length: 20 }, (_, i) =>
        createParticipant(`user${i}`)
      );

      const result = selectGridParticipants({
        participants,
        mode: "random",
        seed: "overflow-seed",
      });

      expect(result.selection).toHaveLength(12);
      
      // Same seed should produce same 12
      const result2 = selectGridParticipants({
        participants,
        mode: "random",
        seed: "overflow-seed",
      });

      expect(result.selection).toEqual(result2.selection);
    });

    it("should be stable across multiple calls with currentSelection", () => {
      const participants: ParticipantLite[] = Array.from({ length: 8 }, (_, i) =>
        createParticipant(`user${i}`)
      );

      const result1 = selectGridParticipants({
        participants,
        mode: "random",
        seed: "stable-seed",
      });

      // Call again with previous result as currentSelection
      const result2 = selectGridParticipants({
        participants,
        mode: "random",
        seed: "stable-seed",
        currentSelection: result1.selection,
      });

      // Should preserve current selection since all still eligible
      expect(result2.selection).toEqual(result1.selection);
    });
  });

  describe("Tie-breakers", () => {
    it("should break ties by joinedAt then identity for metrics", () => {
      const participants: ParticipantLite[] = [
        createParticipant("alice", { joinedAt: 2000, metrics: { views: 100 } }),
        createParticipant("bob", { joinedAt: 2000, metrics: { views: 100 } }),
        createParticipant("charlie", { joinedAt: 3000, metrics: { views: 100 } }),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "most_viewed",
      });

      // All have same views (100), so tie-break by joinedAt (newer first)
      // charlie (3000) > alice (2000) vs bob (2000) -> alice vs bob by identity
      expect(result.selection[0]).toBe("charlie");
      expect(result.selection[1]).toBe("alice"); // 'alice' < 'bob' alphabetically
      expect(result.selection[2]).toBe("bob");
    });

    it("should break ties by identity for same joinedAt", () => {
      const participants: ParticipantLite[] = [
        createParticipant("zulu", { joinedAt: 1000 }),
        createParticipant("alpha", { joinedAt: 1000 }),
        createParticipant("beta", { joinedAt: 1000 }),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
      });

      // Same joinedAt, so alphabetical
      expect(result.selection).toEqual(["alpha", "beta", "zulu"]);
    });

    it("should treat missing metrics as 0", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { metrics: { views: 50 } }),
        createParticipant("user2", { metrics: {} }), // No views
        createParticipant("user3"), // No metrics at all
        createParticipant("user4", { metrics: { views: 100 } }),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "most_viewed",
      });

      // user4 (100) > user1 (50) > user2 (0) > user3 (0)
      expect(result.selection[0]).toBe("user4");
      expect(result.selection[1]).toBe("user1");
      // user2 and user3 should be last (both have 0 views)
    });
  });

  describe("Pinned participants", () => {
    it("should show pinned participants first if eligible", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { joinedAt: 1000 }),
        createParticipant("user2", { joinedAt: 2000 }),
        createParticipant("user3", { joinedAt: 3000 }),
        createParticipant("user4", { joinedAt: 4000 }),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
        pinned: ["user1", "user2"],
      });

      // Pinned should be first
      expect(result.selection.slice(0, 2)).toEqual(["user1", "user2"]);
      expect(result.selection).toContain("user3");
      expect(result.selection).toContain("user4");
    });

    it("should skip pinned if not eligible", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { hasVideo: true }),
        createParticipant("user2", { hasVideo: false }), // Not eligible
        createParticipant("user3", { hasVideo: true }),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
        pinned: ["user2"], // Pinned but not eligible
      });

      expect(result.selection).not.toContain("user2");
      expect(result.selection).toContain("user1");
      expect(result.selection).toContain("user3");
    });

    it("should cap at 12 if more than 12 pinned", () => {
      const participants: ParticipantLite[] = Array.from({ length: 20 }, (_, i) =>
        createParticipant(`user${i}`)
      );

      const pinned = Array.from({ length: 15 }, (_, i) => `user${i}`);

      const result = selectGridParticipants({
        participants,
        mode: "newest",
        pinned,
      });

      expect(result.selection).toHaveLength(12);
      // Should be first 12 pinned
      expect(result.selection).toEqual(pinned.slice(0, 12));
    });

    it("should fill remaining slots after pinned with mode sorting", () => {
      const participants: ParticipantLite[] = Array.from({ length: 15 }, (_, i) =>
        createParticipant(`user${i}`, {
          joinedAt: 1000 + i * 1000,
          metrics: { views: i * 10 },
        })
      );

      const result = selectGridParticipants({
        participants,
        mode: "most_viewed",
        pinned: ["user0", "user1"], // 2 pinned, 10 slots remaining
      });

      expect(result.selection).toHaveLength(12);
      expect(result.selection[0]).toBe("user0"); // Pinned
      expect(result.selection[1]).toBe("user1"); // Pinned
      
      // Remaining should be top by views (excluding user0, user1)
      // user14 (140), user13 (130), ... down to user5 (50)
      expect(result.selection).toContain("user14");
      expect(result.selection).toContain("user13");
    });
  });

  describe("Helper functions", () => {
    it("getRemovedParticipants should return removed identities", () => {
      const previous = ["user1", "user2", "user3"];
      const current = ["user1", "user3", "user4"];

      const removed = getRemovedParticipants(previous, current);
      
      expect(removed).toEqual(["user2"]);
    });

    it("getAddedParticipants should return added identities", () => {
      const previous = ["user1", "user2", "user3"];
      const current = ["user1", "user3", "user4"];

      const added = getAddedParticipants(previous, current);
      
      expect(added).toEqual(["user4"]);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty participant list", () => {
      const result = selectGridParticipants({
        participants: [],
        mode: "newest",
      });

      expect(result.selection).toEqual([]);
      expect(result.debug?.eligibleCount).toBe(0);
    });

    it("should handle all participants ineligible", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1", { hasVideo: false }),
        createParticipant("user2", { hasVideo: false }),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
      });

      expect(result.selection).toEqual([]);
      expect(result.debug?.eligibleCount).toBe(0);
    });

    it("should handle exactly 12 participants", () => {
      const participants: ParticipantLite[] = Array.from({ length: 12 }, (_, i) =>
        createParticipant(`user${i}`)
      );

      const result = selectGridParticipants({
        participants,
        mode: "newest",
      });

      expect(result.selection).toHaveLength(12);
    });

    it("should handle invalid/empty identities", () => {
      const participants: ParticipantLite[] = [
        createParticipant("user1"),
        createParticipant(""), // Empty identity
        createParticipant("   "), // Whitespace only
        createParticipant("user2"),
      ];

      const result = selectGridParticipants({
        participants,
        mode: "newest",
      });

      expect(result.selection).toHaveLength(2);
      expect(result.selection).toContain("user1");
      expect(result.selection).toContain("user2");
    });
  });
});

