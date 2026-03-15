import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTokenExpiry, isExpired } from "@/server/auth/tokens";

describe("auth token lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates future expiry for configured window", () => {
    const now = new Date("2026-03-14T00:00:00.000Z");
    vi.setSystemTime(now);
    const expires = createTokenExpiry(1000 * 60 * 10);
    expect(expires.getTime()).toBe(now.getTime() + 1000 * 60 * 10);
  });

  it("marks past expiry as expired", () => {
    vi.setSystemTime(new Date("2026-03-14T00:30:00.000Z"));
    expect(isExpired(new Date("2026-03-14T00:29:59.000Z"))).toBe(true);
  });

  it("keeps future expiry as valid", () => {
    vi.setSystemTime(new Date("2026-03-14T00:30:00.000Z"));
    expect(isExpired(new Date("2026-03-14T00:31:00.000Z"))).toBe(false);
  });
});
