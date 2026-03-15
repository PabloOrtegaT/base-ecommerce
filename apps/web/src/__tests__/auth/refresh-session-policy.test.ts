import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRecentAuthentication } from "@/server/auth/refresh-session-policy";

describe("refresh session policy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts recently authenticated user", () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));
    const authenticatedAt = new Date("2026-03-15T08:30:00.000Z");
    expect(isRecentAuthentication(authenticatedAt, 4 * 60 * 60 * 1000)).toBe(true);
  });

  it("rejects stale authentication", () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));
    const authenticatedAt = new Date("2026-03-14T00:00:00.000Z");
    expect(isRecentAuthentication(authenticatedAt, 8 * 60 * 60 * 1000)).toBe(false);
  });
});
