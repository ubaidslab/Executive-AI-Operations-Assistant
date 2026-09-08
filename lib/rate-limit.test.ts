import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimits } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows requests up to the limit within the window", () => {
    const now = 1_000;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("client-a", 5, 60_000, now)).toBe(true);
    }
  });

  it("blocks once the limit is exceeded in the same window", () => {
    const now = 1_000;
    for (let i = 0; i < 5; i++) checkRateLimit("client-b", 5, 60_000, now);
    expect(checkRateLimit("client-b", 5, 60_000, now + 10)).toBe(false);
  });

  it("resets once the window has elapsed", () => {
    const start = 1_000;
    for (let i = 0; i < 5; i++) checkRateLimit("client-c", 5, 60_000, start);
    expect(checkRateLimit("client-c", 5, 60_000, start + 60_001)).toBe(true);
  });
});
