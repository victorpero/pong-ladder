import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ validToken: true }));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => ({ value: name === "pong-ladder-locale" ? "en" : "session-token" })
  }),
  headers: () => new Headers()
}));
vi.mock("@/lib/email-verification", () => ({
  consumeEmailVerification: vi.fn().mockImplementation(() => Promise.resolve(state.validToken))
}));

const { GET } = await import("@/app/verify-email/confirm/route");

describe("email verification confirmation redirect", () => {
  const originalAppBaseUrl = process.env.APP_BASE_URL;

  beforeEach(() => {
    process.env.APP_BASE_URL = "https://pongladder.com";
    state.validToken = true;
  });

  afterEach(() => {
    if (originalAppBaseUrl === undefined) {
      delete process.env.APP_BASE_URL;
    } else {
      process.env.APP_BASE_URL = originalAppBaseUrl;
    }
  });

  it("redirects to the public application origin behind a reverse proxy", async () => {
    const response = await GET(
      new Request("http://0.0.0.0:3000/verify-email/confirm?token=valid-token&next=%2Forganizations")
    );

    expect(response.headers.get("location")).toBe(
      "https://pongladder.com/sv/verify-email?status=verified&next=%2Fsv%2Forganizations"
    );
  });

  it("uses the public application origin for invalid-token redirects too", async () => {
    state.validToken = false;

    const response = await GET(
      new Request("http://0.0.0.0:3000/verify-email/confirm?token=invalid-token")
    );

    expect(response.headers.get("location")).toBe(
      "https://pongladder.com/sv/verify-email?status=invalid&next=%2Fsv%2Forganizations"
    );
  });
});
