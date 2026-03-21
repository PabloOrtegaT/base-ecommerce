import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  registerEmailPasswordUserMock,
  enforceRateLimitMock,
  getClientIpFromRequestMock,
  trackWarnMock,
  trackErrorMock,
} = vi.hoisted(() => ({
  registerEmailPasswordUserMock: vi.fn(),
  enforceRateLimitMock: vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 })),
  getClientIpFromRequestMock: vi.fn(() => "127.0.0.1"),
  trackWarnMock: vi.fn(),
  trackErrorMock: vi.fn(),
}));

vi.mock("@/server/auth/service", () => ({
  registerEmailPasswordUser: registerEmailPasswordUserMock,
}));

vi.mock("@/server/security/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getClientIpFromRequest: getClientIpFromRequestMock,
}));

vi.mock("@/server/observability/telemetry", () => ({
  trackWarn: trackWarnMock,
  trackError: trackErrorMock,
}));

import { POST } from "@/app/api/auth/register/route";

describe("api/auth/register route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimitMock.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    registerEmailPasswordUserMock.mockResolvedValue({
      redirectTo: "/login?registered=1",
    });
  });

  it("redirects with invalid_input when payload validation fails", async () => {
    const formData = new FormData();
    formData.set("name", "John");
    formData.set("email", "invalid-email");
    formData.set("password", "123");

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/register?error=invalid_input");
    expect(registerEmailPasswordUserMock).not.toHaveBeenCalled();
  });

  it("registers and redirects to service-provided destination", async () => {
    const formData = new FormData();
    formData.set("name", "John");
    formData.set("email", "john@example.com");
    formData.set("password", "StrongPass123!");

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(registerEmailPasswordUserMock).toHaveBeenCalledWith({
      name: "John",
      email: "john@example.com",
      password: "StrongPass123!",
      origin: "http://localhost:3000",
    });
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?registered=1");
  });

  it("maps service errors into encoded query parameters", async () => {
    registerEmailPasswordUserMock.mockRejectedValue(new Error("email_taken"));
    const formData = new FormData();
    formData.set("name", "John");
    formData.set("email", "john@example.com");
    formData.set("password", "StrongPass123!");

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/register?error=email_taken");
  });

  it("maps unknown service failures to register_failed", async () => {
    registerEmailPasswordUserMock.mockRejectedValue("unexpected");
    const formData = new FormData();
    formData.set("name", "John");
    formData.set("email", "john@example.com");
    formData.set("password", "StrongPass123!");

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(trackErrorMock).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/register?error=register_failed");
  });

  it("redirects with rate_limited when limiter blocks request", async () => {
    enforceRateLimitMock.mockReturnValueOnce({ allowed: false, retryAfterSeconds: 9 });
    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);

    expect(trackWarnMock).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/register?error=rate_limited");
  });
});
