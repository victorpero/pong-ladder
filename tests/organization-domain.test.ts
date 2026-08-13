import { describe, expect, it } from "vitest";
import { emailMatchesDomains, normalizeEmailDomain, normalizeEmailDomains } from "@/lib/organization-domain";

describe("organization email domains", () => {
  it("normalizes case, a trailing root dot, and internationalized domains", () => {
    expect(normalizeEmailDomain(" Example.COM. ")).toBe("example.com");
    expect(normalizeEmailDomain("räksmörgås.se")).toBe("xn--rksmrgs-5wao1o.se");
  });

  it("requires an exact normalized domain match", () => {
    expect(emailMatchesDomains("player@polisen.se", ["polisen.se"])).toBe(true);
    expect(emailMatchesDomains("player@POLISEN.SE", ["polisen.se"])).toBe(true);
    expect(emailMatchesDomains("player@team.polisen.se", ["polisen.se"])).toBe(false);
    expect(emailMatchesDomains("player@evilpolisen.se", ["polisen.se"])).toBe(false);
    expect(emailMatchesDomains("player@polisen.se.attacker.example", ["polisen.se"])).toBe(false);
  });

  it("rejects malformed values and deduplicates normalized configuration", () => {
    expect(normalizeEmailDomain("localhost")).toBeNull();
    expect(normalizeEmailDomain("-bad.example")).toBeNull();
    expect(normalizeEmailDomains(["Example.com", "example.com.", "sub.example.com"])).toEqual([
      "example.com",
      "sub.example.com"
    ]);
  });
});
