import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  requestOutcome: "reset-link" as string,
  requestError: null as Error | null,
  consumeOutcome: "success" as string,
  rateLimitedScopes: [] as string[],
  requests: [] as string[],
  consumed: [] as { token: string; password: string }[]
}));

const rateLimit = vi.hoisted(() => ({
  ErrorClass: class RateLimitError extends Error {
    constructor() {
      super("Too many attempts. Please wait a bit and try again.");
    }
  }
}));

vi.mock("@/lib/rate-limit", () => ({
  RateLimitError: rateLimit.ErrorClass,
  getClientRateLimitKey: (scope: string, identifier = "default") => `${scope}:${identifier}`,
  consumeRateLimit: (key: string) => {
    if (state.rateLimitedScopes.some((scope) => key.startsWith(scope))) {
      throw new rateLimit.ErrorClass();
    }
  }
}));

vi.mock("@/lib/password-reset", () => ({
  hashPasswordResetToken: (token: string) => `hashed-${token}`,
  requestPasswordReset: async (email: string) => {
    state.requests.push(email);

    if (state.requestError) {
      throw state.requestError;
    }

    return state.requestOutcome;
  },
  consumePasswordReset: async (token: string, password: string) => {
    state.consumed.push({ token, password });
    return state.consumeOutcome;
  }
}));

const { resetPassword, sendPasswordResetLink } = await import("@/lib/password-reset-actions");

const CONFIRMATION =
  "If that address belongs to a Pong Ladder account, password reset instructions are on their way. Check your inbox and spam folder.";
const INVALID_LINK =
  "That password reset link is invalid, expired, or already used. Request a new link and try again.";

function formData(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => {
  state.requestOutcome = "reset-link";
  state.requestError = null;
  state.consumeOutcome = "success";
  state.rateLimitedScopes = [];
  state.requests = [];
  state.consumed = [];
});

describe("password reset requests", () => {
  it("answers every account state with the same confirmation", async () => {
    const outcomes = ["reset-link", "no-account", "google-sign-in", "verification-required"];
    const answers = [];

    for (const outcome of outcomes) {
      state.requestOutcome = outcome;
      answers.push(await sendPasswordResetLink({}, formData({ email: "player@example.com" })));
    }

    expect(answers).toEqual(outcomes.map(() => ({ success: CONFIRMATION })));
  });

  it("normalizes the address before looking for an account", async () => {
    await sendPasswordResetLink({}, formData({ email: "  Player@Example.COM  " }));

    expect(state.requests).toEqual(["player@example.com"]);
  });

  it("keeps an unexpected failure indistinguishable from a delivered request", async () => {
    state.requestError = new Error("database unavailable");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendPasswordResetLink({}, formData({ email: "player@example.com" }))).resolves.toEqual({
      success: CONFIRMATION
    });

    expect(logged).toHaveBeenCalledOnce();
    logged.mockRestore();
  });

  it("asks for a usable address before starting a reset", async () => {
    await expect(sendPasswordResetLink({}, formData({ email: "not-an-address" }))).resolves.toEqual({
      error: "Enter a valid email address."
    });

    expect(state.requests).toHaveLength(0);
  });

  it("rate-limits requests per client and per address", async () => {
    state.rateLimitedScopes = ["auth:password-reset:request"];
    await expect(sendPasswordResetLink({}, formData({ email: "player@example.com" }))).resolves.toEqual({
      error: "Too many attempts. Please wait a bit and try again."
    });

    state.rateLimitedScopes = ["auth:password-reset:address:player@example.com"];
    await expect(sendPasswordResetLink({}, formData({ email: "player@example.com" }))).resolves.toEqual({
      error: "Too many attempts. Please wait a bit and try again."
    });

    expect(state.requests).toHaveLength(0);
  });
});

describe("password reset completion", () => {
  it("confirms the change and reports the revoked sessions", async () => {
    const result = await resetPassword(
      {},
      formData({ token: "reset-token", password: "long-enough-password", confirmPassword: "long-enough-password" })
    );

    expect(result.success).toContain("Your password has been updated");
    expect(state.consumed).toEqual([{ token: "reset-token", password: "long-enough-password" }]);
  });

  it("applies the password policy before spending the token", async () => {
    await expect(
      resetPassword({}, formData({ token: "reset-token", password: "short", confirmPassword: "short" }))
    ).resolves.toEqual({ error: "Password must be at least 8 characters." });

    await expect(
      resetPassword(
        {},
        formData({ token: "reset-token", password: "long-enough-password", confirmPassword: "different-password" })
      )
    ).resolves.toEqual({ error: "The passwords do not match." });

    expect(state.consumed).toHaveLength(0);
  });

  it("refuses links that are missing, oversized, expired, used, or superseded", async () => {
    await expect(
      resetPassword({}, formData({ password: "long-enough-password", confirmPassword: "long-enough-password" }))
    ).resolves.toEqual({ error: INVALID_LINK });

    await expect(
      resetPassword(
        {},
        formData({
          token: "t".repeat(257),
          password: "long-enough-password",
          confirmPassword: "long-enough-password"
        })
      )
    ).resolves.toEqual({ error: INVALID_LINK });

    expect(state.consumed).toHaveLength(0);

    state.consumeOutcome = "invalid";
    await expect(
      resetPassword(
        {},
        formData({ token: "reset-token", password: "long-enough-password", confirmPassword: "long-enough-password" })
      )
    ).resolves.toEqual({ error: INVALID_LINK });
  });

  it("rate-limits validation attempts per client and per link", async () => {
    state.rateLimitedScopes = ["auth:password-reset:confirm"];
    await expect(
      resetPassword(
        {},
        formData({ token: "reset-token", password: "long-enough-password", confirmPassword: "long-enough-password" })
      )
    ).resolves.toEqual({ error: "Too many attempts. Please wait a bit and try again." });

    state.rateLimitedScopes = ["auth:password-reset:token:hashed-reset-token"];
    await expect(
      resetPassword(
        {},
        formData({ token: "reset-token", password: "long-enough-password", confirmPassword: "long-enough-password" })
      )
    ).resolves.toEqual({ error: "Too many attempts. Please wait a bit and try again." });

    expect(state.consumed).toHaveLength(0);
  });
});
