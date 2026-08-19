import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  savedLocale: "en" as string | null,
  cookieLocale: "sv",
  storedCookie: null as null | { name: string; value: string }
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => ({ value: name === "pong-ladder-locale" ? state.cookieLocale : "session-token" }),
    set: (name: string, value: string) => {
      state.storedCookie = { name, value };
    }
  }),
  headers: () => new Headers()
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signInEmail: async () => ({ user: { id: "user-1" } })
    }
  }
}));

vi.mock("@/lib/authz", () => ({
  getSessionUser: async () => ({ user: { id: "user-1" } }),
  verifyEmailPath: (locale: string) => `/${locale}/verify-email`
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: async () => ({ id: "user-1", email: "player@example.com" }),
      findUnique: async () => ({ emailVerifiedAt: new Date("2026-01-01"), locale: state.savedLocale })
    }
  }
}));

vi.mock("@/lib/password-reset", () => ({ revokePasswordResetTokens: async () => undefined }));

const { login } = await import("@/lib/auth-actions");

function form(nextPath: string) {
  const formData = new FormData();
  formData.set("identifier", "player@example.com");
  formData.set("password", "long-enough-password");
  formData.set("next", nextPath);
  return formData;
}

beforeEach(() => {
  state.savedLocale = "en";
  state.cookieLocale = "sv";
  state.storedCookie = null;
});

describe("language after signing in", () => {
  it("restores the language saved on the account", async () => {
    await expect(login({}, form("/sv/organizations"))).rejects.toThrow("REDIRECT:/en/organizations");

    expect(state.storedCookie).toEqual({ name: "pong-ladder-locale", value: "en" });
  });

  it("keeps an invitation handoff while applying the saved language", async () => {
    await expect(login({}, form("/sv/join/invitation-token"))).rejects.toThrow(
      "REDIRECT:/en/join/invitation-token"
    );
  });

  it("uses the language of the login page when the account has no preference", async () => {
    state.savedLocale = null;

    await expect(login({}, form("/sv/organizations"))).rejects.toThrow("REDIRECT:/sv/organizations");
    expect(state.storedCookie).toBeNull();
  });
});
