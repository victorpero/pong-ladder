import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ activePath: "/sv/org/polisen/ladder" }));

vi.mock("next/headers", () => ({
  headers: () => new Headers({ "x-pong-ladder-path": state.activePath })
}));

vi.mock("@/lib/app-url", () => ({ getAppBaseUrl: () => "https://pong.example" }));

const { generateMetadata } = await import("@/app/[locale]/layout");

beforeEach(() => {
  state.activePath = "/sv/org/polisen/ladder";
});

describe("localized page metadata", () => {
  it("describes the page in the language it is served in", () => {
    expect(generateMetadata({ params: { locale: "sv" } }).title).toBe("Pong Ladder");
    expect(generateMetadata({ params: { locale: "sv" } }).description).toContain("bordtennis");
    expect(generateMetadata({ params: { locale: "en" } }).description).toContain("table tennis");
  });

  it("points a page at itself and at every language version", () => {
    const metadata = generateMetadata({ params: { locale: "sv" } });

    expect(metadata.alternates?.canonical).toBe("https://pong.example/sv/org/polisen/ladder");
    expect(metadata.alternates?.languages).toEqual({
      sv: "https://pong.example/sv/org/polisen/ladder",
      en: "https://pong.example/en/org/polisen/ladder"
    });
  });

  it("keeps the alternates reciprocal from the English version of the same page", () => {
    state.activePath = "/en/org/polisen/ladder";
    const metadata = generateMetadata({ params: { locale: "en" } });

    expect(metadata.alternates?.canonical).toBe("https://pong.example/en/org/polisen/ladder");
    expect(metadata.alternates?.languages).toEqual({
      sv: "https://pong.example/sv/org/polisen/ladder",
      en: "https://pong.example/en/org/polisen/ladder"
    });
  });

  it("returns nothing for an unsupported language instead of guessing", () => {
    expect(generateMetadata({ params: { locale: "de" } })).toEqual({});
  });
});
