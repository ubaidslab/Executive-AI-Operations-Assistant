import { describe, expect, it } from "vitest";
import { computeRescheduledEnd, resolveDateKeyword } from "./date-utils";

describe("resolveDateKeyword", () => {
  const today = "2026-03-14";

  it('resolves "today"', () => {
    expect(resolveDateKeyword("today", today)).toBe("2026-03-14");
  });

  it('resolves "tomorrow"', () => {
    expect(resolveDateKeyword("tomorrow", today)).toBe("2026-03-15");
  });

  it('resolves "yesterday"', () => {
    expect(resolveDateKeyword("yesterday", today)).toBe("2026-03-13");
  });

  it("carries a month/year boundary correctly", () => {
    expect(resolveDateKeyword("tomorrow", "2026-02-28")).toBe("2026-03-01");
  });

  it("passes through an explicit valid date", () => {
    expect(resolveDateKeyword("2026-12-25", today)).toBe("2026-12-25");
  });

  it("is case-insensitive on keywords", () => {
    expect(resolveDateKeyword("Today", today)).toBe("2026-03-14");
  });

  it("throws on an unresolvable value", () => {
    expect(() => resolveDateKeyword("next friday", today)).toThrow();
  });

  it("throws on a malformed date string", () => {
    expect(() => resolveDateKeyword("03/14/2026", today)).toThrow();
  });
});

describe("computeRescheduledEnd", () => {
  it("preserves a 30-minute duration when moved", () => {
    const end = computeRescheduledEnd(
      "2026-03-14T10:00:00.000Z",
      "2026-03-14T10:30:00.000Z",
      "2026-03-15T09:00:00.000Z"
    );
    expect(end).toBe("2026-03-15T09:30:00.000Z");
  });

  it("preserves a multi-hour duration across a day boundary", () => {
    const end = computeRescheduledEnd(
      "2026-03-14T22:00:00.000Z",
      "2026-03-15T01:00:00.000Z",
      "2026-03-20T23:00:00.000Z"
    );
    expect(end).toBe("2026-03-21T02:00:00.000Z");
  });
});
