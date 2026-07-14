import { describe, it, expect } from "vitest";
import { computeEffectiveVibe, computeMatchScore } from "./vibeLogic";

describe("computeEffectiveVibe", () => {
  it("returns null when there's no vibe data", () => {
    expect(computeEffectiveVibe(null, undefined)).toBeNull();
  });

  it("uses AI vibe data when there's no personal note", () => {
    const result = computeEffectiveVibe(
      { noise_level: "quiet", wifi: "yes", good_for_studying: "yes" },
      undefined
    );
    expect(result).toEqual({ noise_level: "quiet", wifi: "yes", good_for_studying: "yes" });
  });

  it("prefers personal note over AI vibe data when both exist", () => {
    const result = computeEffectiveVibe(
      { noise_level: "quiet", wifi: "yes", good_for_studying: "yes" },
      { noise_level: "loud" }
    );
    expect(result?.noise_level).toBe("loud");
    // fields not overridden by the note should still fall back to AI data
    expect(result?.wifi).toBe("yes");
  });
});

describe("computeMatchScore", () => {
  it("returns null when preferences are not set", () => {
    const effective = { noise_level: "quiet", wifi: "yes", good_for_studying: "yes" };
    expect(computeMatchScore(effective, null)).toBeNull();
  });

  it("returns null when there's no effective vibe data", () => {
    const preferences = { preferred_noise: "quiet", preferred_wifi: "any", preferred_studying: "any" };
    expect(computeMatchScore(null, preferences)).toBeNull();
  });

  it("returns null when all preferences are 'any' (nothing to check)", () => {
    const effective = { noise_level: "quiet", wifi: "yes", good_for_studying: "yes" };
    const preferences = { preferred_noise: "any", preferred_wifi: "any", preferred_studying: "any" };
    expect(computeMatchScore(effective, preferences)).toBeNull();
  });

  it("computes a partial match correctly", () => {
    const effective = { noise_level: "quiet", wifi: "no", good_for_studying: "yes" };
    const preferences = { preferred_noise: "quiet", preferred_wifi: "yes", preferred_studying: "yes" };
    const result = computeMatchScore(effective, preferences);
    expect(result).toEqual({ matched: 2, total: 3, percent: 67 });
  });

  it("computes a full match correctly", () => {
    const effective = { noise_level: "quiet", wifi: "yes", good_for_studying: "yes" };
    const preferences = { preferred_noise: "quiet", preferred_wifi: "yes", preferred_studying: "yes" };
    const result = computeMatchScore(effective, preferences);
    expect(result).toEqual({ matched: 3, total: 3, percent: 100 });
  });

  it("only checks attributes with an actual preference set", () => {
    const effective = { noise_level: "loud", wifi: "yes", good_for_studying: "no" };
    const preferences = { preferred_noise: "any", preferred_wifi: "yes", preferred_studying: "any" };
    const result = computeMatchScore(effective, preferences);
    // only wifi has a real preference, and it matches -> 1/1, not diluted by the other two
    expect(result).toEqual({ matched: 1, total: 1, percent: 100 });
  });
});