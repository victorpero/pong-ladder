import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  signedIn: true,
  storedCookie: null as null | { name: string; value: string; options: Record<string, unknown> },
  updatedUsers: [] as Array<{ id: string; locale: string }>
}));

const cookieStore = vi.hoisted(() => ({
  get: () => undefined,
  set: (name: string, value: string, options: Record<string, unknown>) => {
    state.storedCookie = { name, value, options };
  }
}));

vi.mock("next/headers", () => ({
  cookies: () => cookieStore,
  headers: () => new Headers()
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }
}));

vi.mock("@/lib/authz", () => ({
  getSessionUser: async () => (state.signedIn ? { user: { id: "user-1" } } : null)
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: async ({ where, data }: { where: { id: string }; data: { locale: string } }) => {
        state.updatedUsers.push({ id: where.id, locale: data.locale });
        return { id: where.id, locale: data.locale };
      }
    }
  }
}));

const { changeLanguage } = await import("@/lib/locale-actions");

function form(locale: string, target: string) {
  const formData = new FormData();
  formData.set("locale", locale);
  formData.set("target", target);
  return formData;
}

beforeEach(() => {
  state.signedIn = true;
  state.storedCookie = null;
  state.updatedUsers = [];
});

describe("language preference", () => {
  it("keeps a signed-in choice on the account and continues to the same page", async () => {
    await expect(changeLanguage(form("en", "/sv/org/polisen/matches?challengeId=abc"))).rejects.toThrow(
      "REDIRECT:/en/org/polisen/matches?challengeId=abc"
    );

    expect(state.updatedUsers).toEqual([{ id: "user-1", locale: "en" }]);
    expect(state.storedCookie).toMatchObject({ name: "pong-ladder-locale", value: "en" });
  });

  it("keeps a guest choice in a cookie without touching any account", async () => {
    state.signedIn = false;

    await expect(changeLanguage(form("en", "/sv/login"))).rejects.toThrow("REDIRECT:/en/login");

    expect(state.updatedUsers).toEqual([]);
    expect(state.storedCookie).toMatchObject({ name: "pong-ladder-locale", value: "en", options: { path: "/" } });
  });

  it("refuses an unsupported language instead of storing it", async () => {
    await expect(changeLanguage(form("de", "/sv/org/polisen/ladder"))).rejects.toThrow(
      "REDIRECT:/sv/org/polisen/ladder"
    );

    expect(state.updatedUsers).toEqual([{ id: "user-1", locale: "sv" }]);
  });

  it("refuses to follow an address that leaves the application", async () => {
    await expect(changeLanguage(form("en", "//example.com/steal"))).rejects.toThrow("REDIRECT:/en/organizations");
  });
});
