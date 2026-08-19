import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  signedIn: false,
  userLocale: null as string | null,
  organizations: [{ slug: "polisen", defaultLocale: "sv" }] as Array<{ slug: string; defaultLocale: string }>
}));

vi.mock("@/lib/authz", () => ({
  getSessionUser: async () => (state.signedIn ? { user: { id: "user-1" } } : null)
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: async ({ where }: { where: { slug: string } }) =>
        state.organizations.find((organization) => organization.slug === where.slug) ?? null
    },
    user: {
      findUnique: async () => ({ locale: state.userLocale })
    }
  }
}));

const { middleware } = await import("@/middleware");
const { GET: legacyOrganizationRedirect } = await import("@/app/org/[slug]/[[...rest]]/route");

function request(url: string, init?: { cookies?: Record<string, string>; acceptLanguage?: string }) {
  const headers = new Headers();

  if (init?.acceptLanguage) {
    headers.set("accept-language", init.acceptLanguage);
  }

  if (init?.cookies) {
    headers.set(
      "cookie",
      Object.entries(init.cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ")
    );
  }

  return new NextRequest(new URL(url, "https://pong.example"), { headers });
}

beforeEach(() => {
  state.signedIn = false;
  state.userLocale = null;
  state.organizations = [{ slug: "polisen", defaultLocale: "sv" }];
});

describe("locale-prefixed routing", () => {
  it("sends an unprefixed address to a supported language", async () => {
    const response = await middleware(request("/login"));

    expect(response.headers.get("location")).toBe("https://pong.example/sv/login");
  });

  it("uses a stored preference before the browser language", async () => {
    const response = await middleware(
      request("/login", { cookies: { "pong-ladder-locale": "en" }, acceptLanguage: "sv-SE" })
    );

    expect(response.headers.get("location")).toBe("https://pong.example/en/login");
  });

  it("uses the browser language when nothing has been chosen", async () => {
    const response = await middleware(request("/login", { acceptLanguage: "en-GB,en;q=0.9" }));

    expect(response.headers.get("location")).toBe("https://pong.example/en/login");
  });

  it("keeps the query string when adding the language", async () => {
    const response = await middleware(request("/login?next=%2Forganizations"));

    expect(response.headers.get("location")).toBe("https://pong.example/sv/login?next=%2Forganizations");
  });

  it("never redirects an explicit language back to a saved preference", async () => {
    const response = await middleware(
      request("/en/login", { cookies: { "pong-ladder-locale": "sv" }, acceptLanguage: "sv-SE" })
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("pong-ladder-locale")?.value).toBe("en");
  });

  it("treats an unsupported language segment as an unprefixed address rather than an organization", async () => {
    const response = await middleware(request("/de/org/polisen/ladder"));

    expect(response.headers.get("location")).toBe("https://pong.example/sv/de/org/polisen/ladder");
  });

  it("keeps sending signed-out visitors to login, in the language of the address", async () => {
    const response = await middleware(request("/en/org/polisen/ladder"));

    expect(response.headers.get("location")).toBe(
      "https://pong.example/en/login?next=%2Fen%2Forg%2Fpolisen%2Fladder"
    );
  });

  it("leaves API routes, sign-out, and the verification callback unprefixed", async () => {
    for (const path of ["/api/session", "/logout", "/verify-email/confirm?token=abc"]) {
      const response = await middleware(request(path));

      expect({ path, location: response.headers.get("location") }).toEqual({ path, location: null });
    }
  });
});

describe("legacy organization addresses", () => {
  it("redirects a PL-15 address to the organization default language", async () => {
    const response = await legacyOrganizationRedirect(request("/org/polisen/ladder"), {
      params: { slug: "polisen", rest: ["ladder"] }
    });

    expect(response.headers.get("location")).toBe("https://pong.example/sv/org/polisen/ladder");
  });

  it("prefers the signed-in preference over the organization default", async () => {
    state.signedIn = true;
    state.userLocale = "en";

    const response = await legacyOrganizationRedirect(request("/org/polisen/matches"), {
      params: { slug: "polisen", rest: ["matches"] }
    });

    expect(response.headers.get("location")).toBe("https://pong.example/en/org/polisen/matches");
  });

  it("keeps nested segments and the query string", async () => {
    const response = await legacyOrganizationRedirect(request("/org/polisen/players/player-1?tab=stats"), {
      params: { slug: "polisen", rest: ["players", "player-1"] }
    });

    expect(response.headers.get("location")).toBe(
      "https://pong.example/sv/org/polisen/players/player-1?tab=stats"
    );
  });

  it("redirects the bare organization address without inventing a section", async () => {
    const response = await legacyOrganizationRedirect(request("/org/polisen"), {
      params: { slug: "polisen" }
    });

    expect(response.headers.get("location")).toBe("https://pong.example/sv/org/polisen");
  });

  it("still resolves a language for an organization it cannot read", async () => {
    const response = await legacyOrganizationRedirect(request("/org/unknown/ladder", { acceptLanguage: "en" }), {
      params: { slug: "unknown", rest: ["ladder"] }
    });

    expect(response.headers.get("location")).toBe("https://pong.example/en/org/unknown/ladder");
  });
});
