import { describe, expect, it } from "vitest";
import { getSeasonLabel, getSeasonName, getSeasonNumber, getSeasonWindowForNumber } from "@/lib/fixed-seasons";

describe("fixed seasons", () => {
  it("uses three four-month seasons per calendar year", () => {
    expect(getSeasonNumber(new Date(Date.UTC(2026, 0, 1)))).toBe(1);
    expect(getSeasonNumber(new Date(Date.UTC(2026, 3, 30)))).toBe(1);
    expect(getSeasonNumber(new Date(Date.UTC(2026, 4, 1)))).toBe(2);
    expect(getSeasonNumber(new Date(Date.UTC(2026, 7, 31)))).toBe(2);
    expect(getSeasonNumber(new Date(Date.UTC(2026, 8, 1)))).toBe(3);
    expect(getSeasonNumber(new Date(Date.UTC(2026, 11, 31)))).toBe(3);
  });

  it("builds four-month season windows", () => {
    expect(getSeasonWindowForNumber(2026, 1)).toMatchObject({
      startsAt: new Date(Date.UTC(2026, 0, 1)),
      endsAt: new Date(Date.UTC(2026, 4, 1))
    });
    expect(getSeasonWindowForNumber(2026, 3)).toMatchObject({
      startsAt: new Date(Date.UTC(2026, 8, 1)),
      endsAt: new Date(Date.UTC(2027, 0, 1))
    });
  });

  it("labels seasons by app year and season number", () => {
    expect(getSeasonLabel(2026, 1)).toBe("1.1");
    expect(getSeasonLabel(2026, 3)).toBe("1.3");
    expect(getSeasonLabel(2027, 1)).toBe("2.1");
    expect(getSeasonName(2027, 3)).toBe("Season 2.3");
  });
});
