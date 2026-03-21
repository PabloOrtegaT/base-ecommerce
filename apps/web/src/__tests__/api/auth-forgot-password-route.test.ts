import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestPasswordResetMock, enforceRateLimitMock, getClientIpFromRequestMock, trackWarnMock, trackErrorMock } = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
  enforceRateLimitMock: vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 })),
  getClientIpFromRequestMock: vi.fn(() => "127.0.0.1"),
  trackWarnMock: vi.fn(),
  trackErrorMock: vi.fn(),
}));

vi.mock("@/server/auth/service", () => ({
  requestPasswordReset: requestPasswordResetMock,
}));

vi.mock("@/server/security/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getClientIpFromRequest: getClientIpFromRequestMock,
}));

vi.mock("@/server/observability/telemetry", () => ({
  trackWarn: trackWarnMock,
  trackError: trackErrorMock,
}));

import { POST } from "@/app/api/auth/forgot-password/route";

describe("api/auth/forgot-password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestPasswordResetMock.mockResolvedValue({ ok: true });
    enforceRateLimitMock.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it("redirects with invalid_input when payload is invalid", async () => {
    const formData = new FormData();
    const request = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password?error=invalid_input");
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it("submits password reset and redirects to sent state", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    const request = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(requestPasswordResetMock).toHaveBeenCalledWith("user@example.com", "http://localhost:3000");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password?sent=1");
  });

  it("redirects with rate_limited when limiter blocks request", async () => {
    enforceRateLimitMock.mockReturnValueOnce({ allowed: false, retryAfterSeconds: 8 });
    const request = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);

    expect(trackWarnMock).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password?error=rate_limited");
  });

  it("redirects with request_failed when service throws", async () => {
    requestPasswordResetMock.mockRejectedValueOnce(new Error("mailer_down"));
    const formData = new FormData();
    formData.set("email", "user@example.com");
    const request = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(trackErrorMock).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password?error=request_failed");
  });
});
