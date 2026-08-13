import { describe, expect, it } from "vitest";
import {
  accessCodeHashesMatch,
  generateOrganizationAccessCode,
  hashOrganizationAccessCode,
  normalizeOrganizationAccessCode
} from "@/lib/organization-access-code";

describe("organization access codes", () => {
  it("generates practical high-entropy codes without ambiguous characters", () => {
    const codes = Array.from({ length: 20 }, () => generateOrganizationAccessCode());

    expect(new Set(codes)).toHaveLength(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}(?:-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}){2}$/);
      expect(code).not.toMatch(/[01IO]/);
    }
  });

  it("normalizes case, spaces, and separators without substituting characters", () => {
    expect(normalizeOrganizationAccessCode(" abcd-efgh jkmn ")).toBe("ABCDEFGHJKMN");
    expect(normalizeOrganizationAccessCode("O0-I1")).toBe("O0I1");
  });

  it("stores only a keyed one-way hash and invalidates the old code after rotation", () => {
    const oldCode = "2345-6789-ABCD";
    const newCode = "EFGH-JKMN-PQRS";
    const oldHash = hashOrganizationAccessCode(oldCode, "test-secret");
    const newHash = hashOrganizationAccessCode(newCode, "test-secret");

    expect(oldHash).toMatch(/^[a-f0-9]{64}$/);
    expect(oldHash).not.toContain(normalizeOrganizationAccessCode(oldCode));
    expect(accessCodeHashesMatch(hashOrganizationAccessCode(oldCode, "test-secret"), oldHash)).toBe(true);
    expect(accessCodeHashesMatch(hashOrganizationAccessCode(oldCode, "test-secret"), newHash)).toBe(false);
  });
});
