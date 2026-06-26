import { describe, expect, it } from "vitest";
import { getPublicPlayerName, getPublicPlayerNames, normalizeFullName } from "@/lib/display-name";

describe("public player names", () => {
  it("shows first name and first initial of the last name", () => {
    expect(getPublicPlayerName({ id: "1", username: "victor", fullName: "Victor Pero" })).toBe("Victor P.");
  });

  it("supports multiple last names while only showing the first last-name initial", () => {
    expect(getPublicPlayerName({ id: "1", username: "linnea", fullName: "Linnea Berg Andersson" })).toBe("Linnea B.");
  });

  it("adds the final last-name letter when names collide on first name and last initial", () => {
    const names = getPublicPlayerNames([
      { id: "1", username: "victor-pero", fullName: "Victor Pero" },
      { id: "2", username: "victor-palm", fullName: "Victor Palm" }
    ]);

    expect(names.get("1")).toBe("Victor Po.");
    expect(names.get("2")).toBe("Victor Pm.");
  });

  it("normalizes extra whitespace", () => {
    expect(normalizeFullName("  Victor   Per   Olofsson  ")).toBe("Victor Per Olofsson");
  });
});

